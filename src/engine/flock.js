// Birds on the wing, for any world: one small geometry per kind, drawn many times, each
// beating its wings in its own time and keeping to its own round.
//
//   const birds = birdFlocks(scene, R, [
//     { kind: 'crane', birds: skein(11, { cx, cy, cz, rx, rz, w, ph }) },     a V of them on one great round
//     { kind: 'gull', birds: wheel(R, 8, cx, cy, cz, radius) },               each on its own circle about a spot
//   ]);
//   each frame: birds.tick(dt, time)
//
// kinds: crane (long neck and legs, black wing tips), gull (white, grey tips), pigeon (grey, small)
import * as THREE from 'three';
import { G, COMMON_GLSL } from './paint.js';

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

const KINDS = {
  //        body, tips, half-length, girth, half-span, chord, size, beat, glide
  crane: { W: 0xf6f1e2, D: 0x1d1d22, L: 0.7, r: 0.13, S: 1.3, ch: 0.46, size: 1.8, beat: 0.55, glide: 0.15 },
  gull: { W: 0xf3ecd8, D: 0x8a949c, L: 0.42, r: 0.1, S: 0.78, ch: 0.26, size: 1.5, beat: 1, glide: 0.85 },
  pigeon: { W: 0x8a94a4, D: 0x4a5260, L: 0.3, r: 0.1, S: 0.5, ch: 0.24, size: 1.25, beat: 1.6, glide: 0.25 },
};

// a bird seen from far off: a long body and two wings in two joints, flying towards +z
function birdGeo(kind) {
  const { W, D, L, r, S, ch } = KINDS[kind];
  const crane = kind === 'crane';
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

// a skein: one leader and the rest strung out behind it on either side, all on the same round
// o: { cx, cy, cz, rx, rz, w (turns in radians a second, signed), ph }
export const skein = (n, o) => Array.from({ length: n }, (_, j) => ({ ...o, back: Math.ceil(j / 2) * 2.3, lat: (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 1.7, bob: 0.6 }));
// n birds that each keep their own circle about the same spot
export const wheel = (R, n, cx, cy, cz, rad, speed = 0.22) => Array.from({ length: n }, () => ({ cx: cx + (R() - 0.5) * 10, cy: cy + (R() - 0.5) * 8, cz: cz + (R() - 0.5) * 10, rx: rad * (0.6 + R() * 0.7), rz: rad * (0.6 + R() * 0.7), w: (R() < 0.5 ? 1 : -1) * (speed + R() * 0.16), ph: R() * 6.283, back: 0, lat: 0, bob: 1.6 }));

let MAT = null;
export function birdFlocks(scene, R, groups) {
  MAT ??= new THREE.ShaderMaterial({ vertexShader: BIRD_VERT, fragmentShader: BIRD_FRAG, uniforms: { ...G }, side: THREE.DoubleSide });
  const flocks = groups.map(({ kind, birds }) => {
    const K = KINDS[kind];
    const im = new THREE.InstancedMesh(birdGeo(kind), MAT, birds.length);
    const c = new THREE.Color();
    birds.forEach((b, i) => im.setColorAt(i, c.setRGB(R(), K.beat, K.glide)));
    im.instanceColor.needsUpdate = true;
    im.frustumCulled = false;
    scene.add(im);
    return { im, list: birds, size: K.size };
  });
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
          e.set(0, Math.atan2(-b.rx * sn * b.w, b.rz * cs * b.w), -Math.sign(b.w) * 0.22, 'YXZ');
          im.setMatrixAt(i, m4.compose(p.set(b.cx + (b.rx + b.lat) * cs, b.cy + Math.sin(time * 0.4 + b.ph * 3 + i) * b.bob - Math.abs(b.lat) * 0.12, b.cz + (b.rz + b.lat) * sn), q.setFromEuler(e), sc.setScalar(size)));
        });
        im.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
