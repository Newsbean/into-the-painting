// What moves over the water: skeins of cranes crossing the bay, gulls wheeling over the
// fishing grounds, and coasters under sail working along the shore.
import * as THREE from 'three';
import { G, COMMON_GLSL } from '../../../engine/paint.js';
import { Builder, xf } from '../../../engine/build.js';
import { rng } from '../../../engine/gl.js';
import { rod } from '../helpers.js';
import { person } from '../figures.js';

// ---------------------------------------------------------------- birds
const BIRD_VERT = /* glsl */ `
attribute vec3 color;
attribute float aWing;   // 0 on the body, rising to 1 at a wing tip
uniform float uTime;
varying vec3 vColor;
varying vec3 vWorld;
void main(){
  vColor = color;
  vec3 p = position;
  // every bird beats to its own time: instanceColor is (phase, how fast, how much it glides)
  float beat = sin(uTime * (4.0 + instanceColor.g * 5.0) + instanceColor.r * 6.283);
  float glide = smoothstep(-0.2, 0.6, sin(uTime * 0.31 + instanceColor.r * 20.0)) * instanceColor.b;
  float on = step(0.001, aWing);
  float th = (beat * 0.7 * (1.0 - glide) + 0.12) * (0.55 + 0.75 * aWing) * on;
  // the wings hinge along the body
  p.y += abs(p.x) * sin(th);
  p.x *= cos(th);
  vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;
const BIRD_FRAG = /* glsl */ `
${COMMON_GLSL}
varying vec3 vColor;
varying vec3 vWorld;
void main(){
  float rim;
  float restore = restoreAt(vWorld, 0.0, rim);
  vec3 col = vColor * luma(mix(uGroundColor, uSkyColor, 0.7) + uSunColor * 0.6);
  vec3 sketch = mix(uInk, uPaper, 0.2 + 0.7 * luma(vColor));
  float fog = fogAmount(vWorld);
  col = mix(col, uFogColor, fog);
  sketch = mix(sketch, uPaper * 0.97, fog * 0.85);
  gl_FragColor = vec4(mix(sketch, col, restore), 1.0);
}
`;

// a bird seen from far off: a long body and two wings in two joints, flying towards +z
function birdGeo(crane) {
  const pos = [],
    col = [],
    wing = [];
  const c = new THREE.Color();
  const tri = (pts, hex, w = [0, 0, 0]) =>
    pts.forEach((v, k) => {
      pos.push(v[0], v[1], v[2]);
      c.set(Array.isArray(hex) ? hex[k] : hex);
      col.push(c.r, c.g, c.b);
      wing.push(w[k]);
    });
  const W = crane ? 0xf6f1e2 : 0xf3ecd8,
    D = crane ? 0x1d1d22 : 0x8a949c;
  const L = crane ? 0.7 : 0.42,
    r = crane ? 0.13 : 0.1,
    S = crane ? 1.3 : 0.78,
    ch = crane ? 0.46 : 0.26;
  // the body: a long diamond
  const nose = [0, 0, L],
    tail = [0, 0, -L];
  const ring = [[r, 0, 0], [0, r, 0], [-r, 0, 0], [0, -r, 0]];
  for (let i = 0; i < 4; i++) {
    tri([nose, ring[i], ring[(i + 1) % 4]], W);
    tri([tail, ring[(i + 1) % 4], ring[i]], crane ? [D, W, W] : W);
  }
  if (crane) {
    // the long neck held straight out, the red crown, and the legs trailing behind
    tri([[0.04, 0, L * 0.7], [-0.04, 0, L * 0.7], [0, 0.03, L + 0.8]], [W, W, D]);
    tri([[0, 0.05, L * 0.7], [0, -0.04, L * 0.7], [0, 0.03, L + 0.8]], [W, W, D]);
    tri([[0.035, 0.06, L + 0.7], [-0.035, 0.06, L + 0.7], [0, 0.07, L + 0.84]], 0xc8432c);
    tri([[0.03, -0.02, -L * 0.6], [-0.03, -0.02, -L * 0.6], [0, -0.05, -L - 0.9]], D);
  }
  for (const sx of [-1, 1]) {
    const x0 = sx * 0.05,
      x1 = sx * S * 0.5,
      x2 = sx * S;
    const a = [x0, 0.02, ch * 0.5],
      b = [x0, 0.02, -ch * 0.5],
      d = [x1, 0.02, ch * 0.45],
      e = [x1, 0.02, -ch * 0.52],
      t = [x2, 0.02, -ch * 0.15];
    tri([a, d, b], W, [0, 0.5, 0]);
    tri([b, d, e], [W, W, crane ? D : W], [0, 0.5, 0.5]);
    tri([d, t, e], [W, D, D], [0.5, 1, 0.5]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aWing', new THREE.Float32BufferAttribute(wing, 1));
  return g;
}

export function addBirds(world, { S }) {
  const R = rng(905);
  const mat = new THREE.ShaderMaterial({ vertexShader: BIRD_VERT, fragmentShader: BIRD_FRAG, uniforms: { ...G }, side: THREE.DoubleSide });
  const flock = (crane, list) => {
    const im = new THREE.InstancedMesh(birdGeo(crane), mat, list.length);
    const c = new THREE.Color();
    list.forEach((b, i) => im.setColorAt(i, c.setRGB(R(), crane ? 0.55 : 1, crane ? 0.15 : 0.85)));
    im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
    S.add(im);
    return { im, list, size: crane ? 1.8 : 1.5 };
  };
  // a skein: one leader and the rest strung out behind it on either side
  const skein = (n, o) => Array.from({ length: n }, (_, j) => ({ ...o, back: Math.ceil(j / 2) * 2.3, lat: (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 1.7, bob: 0.6 }));
  // gulls each keep their own circle about the same spot
  const wheel = (n, cx, cy, cz, rad) => Array.from({ length: n }, () => ({ cx: cx + (R() - 0.5) * 10, cy: cy + (R() - 0.5) * 8, cz: cz + (R() - 0.5) * 10, rx: rad * (0.6 + R() * 0.7), rz: rad * (0.6 + R() * 0.7), w: (R() < 0.5 ? 1 : -1) * (0.22 + R() * 0.16), ph: R() * 6.283, back: 0, lat: 0, bob: 1.6 }));
  const flocks = [
    flock(true, [...skein(11, { cx: -40, cy: 62, cz: 140, rx: 215, rz: 150, w: 0.055, ph: 0.4 }), ...skein(7, { cx: 60, cy: 84, cz: 60, rx: 260, rz: 210, w: -0.04, ph: 2.6 })]),
    flock(false, [...wheel(8, 10, 15, 172, 22), ...wheel(7, -64, 13, 142, 18), ...wheel(8, -330, 17, 192, 28), ...wheel(6, 150, 14, 150, 20), ...wheel(6, 20, 20, 40, 30)]),
  ];
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    p = new THREE.Vector3(),
    sc = new THREE.Vector3();
  return {
    tick(dt, time) {
      for (const { im, list, size } of flocks) {
        list.forEach((b, i) => {
          const th = time * b.w + b.ph - (Math.sign(b.w) * b.back) / ((b.rx + b.rz) / 2);
          const cs = Math.cos(th),
            sn = Math.sin(th);
          const vx = -b.rx * sn * b.w,
            vz = b.rz * cs * b.w;
          e.set(0, Math.atan2(vx, vz), -Math.sign(b.w) * 0.22, 'YXZ');
          im.setMatrixAt(i, m4.compose(p.set(b.cx + (b.rx + b.lat) * cs, b.cy + Math.sin(time * 0.4 + b.ph * 3 + i) * b.bob - Math.abs(b.lat) * 0.12, b.cz + (b.rz + b.lat) * sn), q.setFromEuler(e), sc.setScalar(size)));
        });
        im.instanceMatrix.needsUpdate = true;
      }
    },
  };
}

// ---------------------------------------------------------------- boats under sail
// a small coaster running before the wind, drawn lying along +x
function coaster(B, striped) {
  const L = 11,
    wood = 0xd9c690,
    dark = 0x8a6a48,
    timber = 0x4a3526;
  B.box(L * 0.72, 1.1, 2.6, wood, 0, -0.2, 0);
  B.box(L * 0.72, 0.16, 2.8, dark, 0, 0.9, 0);
  for (const sgn of [-1, 1]) B.add(new THREE.CylinderGeometry(0.03, 1.4, L * 0.34, 4, 1), wood, xf(sgn * L * 0.5, 0.85, 0, 0, 0.62, 1, 1, 0, -sgn * (Math.PI / 2 - 0.32)));
  B.box(2.4, 1.0, 2.2, 0xb89668, -L * 0.24, 1.0, 0);
  B.gable(2.2, 2.9, 0.45, 0x4a5a72, -L * 0.24, 2.0, 0, Math.PI / 2);
  rod(B, [0.6, 0.9, 0], [0.6, 9.2, 0], 0.13, 0.08, timber, 5);
  rod(B, [0.6, 8.6, -3.1], [0.6, 8.6, 3.1], 0.07, 0.07, timber, 4);
  // the sail: one tall sheet bellied by the wind, in panels
  const sail = new THREE.BoxGeometry(0.06, 6.6, 5.8, 1, 6, 8);
  const P = sail.attributes.position;
  for (let i = 0; i < P.count; i++) P.setX(i, P.getX(i) + 0.75 * Math.cos((P.getZ(i) / 5.8) * Math.PI) * Math.sin((P.getY(i) / 6.6 + 0.5) * Math.PI));
  sail.computeVertexNormals();
  B.add(sail, (x, y, z) => new THREE.Color(striped && Math.abs(Math.abs(z) - 1.5) < 0.42 ? 0x2f548a : Math.abs(((z + 2.9) % 1.45) - 0.72) > 0.68 ? 0xcfc7ae : 0xf3ecd8), xf(0.72, 5.15, 0), { sway: 0.5 });
  person(B, -1.2, 1.05, 0.5, 1.2, { pose: 'sit', coat: 0x2f548a, hat: 'cone' });
  person(B, 3.1, 1.05, -0.4, -1.5, { pose: 'sit', coat: 0x7f9aa8, hat: 'cone' });
}

export function addSailBoats(world, { S, flat }) {
  const mat = flat({ scale: 0.25 });
  const geo = [false, true].map((striped) => {
    const B = new Builder();
    coaster(B, striped);
    return B.geometry();
  });
  // each beats up and down its own stretch of water: [centre x, z, reach in x, in z, turns per second, where it starts]
  const runs = [
    [185, 165, 40, 13, 0.021, 0.0],
    [-190, 164, 45, 13, -0.019, 2.0],
    [60, -330, 150, 40, 0.008, 1.0],
    [-322, 128, 58, 28, 0.017, 4.0],
    [262, 40, 28, 70, -0.014, 3.0],
    [-250, -160, 70, 50, 0.012, 5.2],
  ];
  const boats = runs.map((r, i) => ({ r, kind: i % 2 }));
  const ims = geo.map((g, k) => {
    const im = new THREE.InstancedMesh(g, mat, boats.filter((b) => b.kind === k).length);
    im.frustumCulled = false;
    S.add(im);
    return im;
  });
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    e = new THREE.Euler(),
    p = new THREE.Vector3(),
    one = new THREE.Vector3(1, 1, 1);
  return {
    tick(dt, time) {
      const n = [0, 0];
      for (const b of boats) {
        const [cx, cz, rx, rz, w, ph] = b.r;
        const th = time * w + ph,
          vx = -rx * Math.sin(th) * w,
          vz = rz * Math.cos(th) * w;
        e.set(Math.sin(time * 0.7 + ph) * 0.05, Math.atan2(-vz, vx), Math.cos(time * 0.6 + ph) * 0.04, 'YXZ');
        ims[b.kind].setMatrixAt(n[b.kind]++, m4.compose(p.set(cx + rx * Math.cos(th), Math.sin(time * 0.8 + ph) * 0.35 - 0.1, cz + rz * Math.sin(th)), q.setFromEuler(e), one));
      }
      for (const im of ims) im.instanceMatrix.needsUpdate = true;
    },
  };
}
