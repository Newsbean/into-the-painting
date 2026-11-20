import * as THREE from 'three';
import { World, ghostMaterial } from '../engine/world.js';
import { Sky } from '../engine/sky.js';
import { paintMaterial, waterMaterial, glowPoints, GroundMaps, G } from '../engine/paint.js';
import { Builder, terrain, ribbon, patch, mountainRing, blobTree, pine, house, lampPost, figure, tint, mix, jitter, xf } from '../engine/build.js';
import { rng, fbm, vnoise, smooth, clamp, lerp, damp } from '../engine/gl.js';

// Kristiania at sunset. Everything is drawn in long swaying ribbons, and the
// sky rolls in bands of red and orange until the feeling has somewhere to go.
const SKY = /* glsl */ `
uniform float uCalm;
uniform vec3 uBigSun;
// the order of the ribbons is the order in the picture: blood, flame, straw,
// with one pale and one slate-blue ribbon cutting through
vec3 bandCol(float id){
  float k = mod(id, 9.0);
  if (k < 0.5) return vec3(0.84, 0.20, 0.09);
  if (k < 1.5) return vec3(0.96, 0.47, 0.11);
  if (k < 2.5) return vec3(0.99, 0.79, 0.29);
  if (k < 3.5) return vec3(0.93, 0.38, 0.10);
  if (k < 4.5) return vec3(0.70, 0.11, 0.08);
  if (k < 5.5) return vec3(0.98, 0.68, 0.22);
  if (k < 6.5) return vec3(0.97, 0.56, 0.14);
  if (k < 7.5) return vec3(0.99, 0.85, 0.40);
  return vec3(0.50, 0.58, 0.64);
}
vec3 skyColor(vec3 dIn){
  vec3 d = normalize(vec3(dIn.x, abs(dIn.y) + 0.002, dIn.z));
  float el = asin(clamp(d.y, -1.0, 1.0));
  float az = atan(d.x, -d.z);
  float t = uTime * mix(0.24, 0.07, uCalm);
  // the whole sky undulates in long slow waves
  float wob = sin(az * 2.0 + t * 0.9) * 0.17 + sin(az * 5.0 - t * 1.4 + el * 3.0) * 0.06 + sin(az * 11.0 + t * 2.0) * 0.018;
  float n1 = texture(uNoise3, vec3(d.x * 0.33 + t * 0.02, el * 0.25, d.z * 0.33)).r;
  float y = el + wob * (0.5 + 0.5 * smoothstep(0.0, 0.5, el)) + (n1 - 0.5) * 0.07;
  // every stroke drags its colour into the ribbons beside it, so nothing has an edge
  float streak = texture(uNoise3, vec3(d.x * 0.9 - t * 0.05, y * 9.0, d.z * 0.9)).g;
  float bristle = texture(uNoise3, vec3(d.x * 2.3 + t * 0.03, y * 27.0, d.z * 2.3)).r;
  float band = y * 9.5 + 3.0 + (streak - 0.5) * 1.9 + (bristle - 0.5) * 0.9;
  float id = floor(band), f = fract(band);
  vec3 c = mix(bandCol(id), bandCol(id + 1.0), smoothstep(0.08, 0.92, f));
  c *= 0.88 + 0.22 * bristle;
  // cold blue closes over the top, the horizon burns
  c = mix(c, mix(vec3(0.18, 0.26, 0.50), vec3(0.44, 0.55, 0.68), streak), smoothstep(0.8, 1.3, el) * 0.8);
  c = mix(c, vec3(0.99, 0.70, 0.24), exp(-el * 12.0) * 0.45);
  // his great Sun: a white core, rings of yellow, rays thrown across the whole sky
  float sa = acos(clamp(dot(d, uBigSun), -1.0, 1.0));
  vec3 SU = normalize(cross(vec3(0.0, 1.0, 0.0), uBigSun));
  vec3 SV = cross(uBigSun, SU);
  float sang = atan(dot(d, SV), dot(d, SU));
  float srings = 0.5 + 0.5 * cos(sa * 64.0 - uTime * 0.7);
  float srays = smoothstep(0.3, 0.7, 0.5 + 0.5 * cos(sang * 26.0 + sin(sa * 18.0) * 0.7));
  vec3 sunC = mix(vec3(0.99, 0.78, 0.26), vec3(1.0, 0.97, 0.80), srings * 0.65);
  sunC = mix(sunC, vec3(0.97, 0.50, 0.22), (1.0 - srays) * 0.4);
  float sm = clamp(exp(-sa * 3.6) * (0.5 + 0.5 * srays) * 1.35, 0.0, 1.0) * (1.0 - smoothstep(0.25, 0.85, sa));
  c = mix(c, sunC, sm);
  c = mix(c, vec3(1.0, 0.98, 0.86) * 1.3, 1.0 - smoothstep(0.05, 0.065, sa));
  vec3 sk = uPaper * (0.99 - (1.0 - smoothstep(0.0, 0.07, f) * smoothstep(1.0, 0.93, f)) * 0.22 - streak * 0.07 - sm * srays * 0.12);
  float m = paintedIn(d, streak);
  return mix(sk, c, m);
}
`;

// ------------------------------------------------------------------
// The figure on the road: a pale head between two hands, a body like a
// flame. Drawn the way the picture draws it, simply and without menace.
// ------------------------------------------------------------------
// Catmull-Rom through evenly spaced keys: keeps hand-authored profiles smooth
function keyed(keys, t) {
  const n = keys.length - 1;
  const x = Math.min(Math.max(t, 0), 1) * n;
  const i = Math.min(Math.floor(x), n - 1);
  const f = x - i;
  const p0 = keys[Math.max(i - 1, 0)],
    p1 = keys[i],
    p2 = keys[i + 1],
    p3 = keys[Math.min(i + 2, n)];
  return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}

// a tube lofted along a centre line with an elliptical section that changes as it goes
function loft(rows, seg, centre, radii, col) {
  const v = [],
    idx = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const c = centre(t);
    const [rx, rz] = radii(t);
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2;
      v.push(c[0] + Math.cos(a) * rx, c[1], c[2] + Math.sin(a) * rz);
    }
  }
  for (let i = 0; i < rows; i++)
    for (let k = 0; k < seg; k++) {
      const p0 = i * seg + k,
        p1 = i * seg + ((k + 1) % seg),
        p2 = p0 + seg,
        p3 = p1 + seg;
      idx.push(p0, p2, p1, p1, p2, p3);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return tint(g, col);
}

// the face, painted the way the picture paints it: two ringed eyes, two dots, one long O
function screamFace() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const soft = (x, y, rx, ry, col, a) => {
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    grd.addColorStop(0, `rgba(${col},${a})`);
    grd.addColorStop(1, `rgba(${col},0)`);
    g.save();
    g.translate(x, y);
    g.scale(rx, ry);
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, 1, 0, 7);
    g.fill();
    g.restore();
  };
  // hollow cheeks and temples: green-grey shadow, as in the tempera
  soft(118, 330, 70, 130, '98,118,92', 0.5);
  soft(394, 330, 70, 130, '112,104,78', 0.5);
  soft(256, 96, 170, 60, '150,128,74', 0.3);
  soft(256, 474, 120, 60, '90,100,84', 0.45);
  // brow ridge
  g.strokeStyle = 'rgba(92,78,50,0.55)';
  g.lineCap = 'round';
  g.lineWidth = 7;
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.moveTo(256 + sx * 128, 214);
    g.quadraticCurveTo(256 + sx * 92, 188, 256 + sx * 54, 208);
    g.stroke();
  }
  // eyes: pale rings with a small dark centre
  for (const sx of [-1, 1]) {
    const ex = 256 + sx * 92;
    soft(ex, 246, 44, 40, '86,84,62', 0.5);
    g.fillStyle = '#efe6c0';
    g.strokeStyle = '#3c3524';
    g.lineWidth = 7;
    g.beginPath();
    g.ellipse(ex, 244, 27, 25, 0, 0, 7);
    g.fill();
    g.stroke();
    g.fillStyle = '#2b2519';
    g.beginPath();
    g.arc(ex + sx * 1.5, 247, 7.5, 0, 7);
    g.fill();
  }
  // nose: a faint ridge and two nostrils
  g.strokeStyle = 'rgba(100,88,58,0.5)';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(256, 248);
  g.quadraticCurveTo(250, 282, 256, 304);
  g.stroke();
  g.fillStyle = '#3c3524';
  for (const nx of [242, 270]) {
    g.beginPath();
    g.ellipse(nx, 310, 5.5, 4.5, 0, 0, 7);
    g.fill();
  }
  // the mouth: a long open oval
  g.fillStyle = '#2a221b';
  g.strokeStyle = '#5c4a30';
  g.lineWidth = 7;
  g.beginPath();
  g.ellipse(256, 392, 30, 56, 0, 0, 7);
  g.fill();
  g.stroke();
  soft(256, 404, 15, 30, '132,62,48', 0.55);
  // the jaw line drawn in the same blue as the fjord
  g.strokeStyle = 'rgba(52,70,110,0.5)';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(150, 330);
  g.quadraticCurveTo(190, 470, 256, 490);
  g.quadraticCurveTo(322, 470, 362, 330);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

// ------------------------------------------------------------------
// The figure on the road, sculpted rather than assembled: a pale head
// like an upturned pear held between two long hands, a body that sways
// like a flame. Simple and sad, never monstrous.
// ------------------------------------------------------------------
function buildScreamer(strokes) {
  const body = paintMaterial({ stroke: strokes.oil, scale: 0.9, contrast: 0.26, hueVar: 0.16, objSpace: 1, rim: 0.2, band: 0.36, warp: 0, big: 0, wallStretch: 1, wallVert: 1 });
  const skin = paintMaterial({ stroke: strokes.soft, scale: 2.2, contrast: 0.12, hueVar: 0.1, objSpace: 1, rim: 0.1, band: 0.42, warp: 0, big: 0 });
  // the sun sets behind him, so the picture lights him from the front, as Munch did
  for (const m of [body, skin]) {
    m.uniforms.uSunDir = { value: new THREE.Vector3(0.6, 0.45, 0.66).normalize() };
    m.uniforms.uSunColor = { value: new THREE.Color(0xd8b070) };
  }
  const g = new THREE.Group();
  g.scale.setScalar(1.12);
  const mesh = (geo, mt) => {
    const m = new THREE.Mesh(geo, mt);
    m.frustumCulled = false;
    g.add(m);
    return m;
  };
  const PALE = 0xdccb92;
  // long strokes falling the length of the smock: blue-black, a little slate, a thread of umber
  const cloth = (x, y, z) => mix(0x141829, 0x2a3350, clamp(vnoise(x * 22 + z * 16, y * 0.9))).lerp(new THREE.Color(0x3a3320), vnoise(x * 9 + 4, y * 1.2 + z * 7) * 0.14);

  // --- the body: one long S from the hem to the collar
  const NECK = 1.34;
  const sway = (t) => 0.105 * Math.sin(t * Math.PI * 1.3 + 0.25) - 0.075 * t;
  const centre = (t) => [sway(t), t * NECK, 0.035 * Math.sin(t * Math.PI)];
  const RX = [0.215, 0.185, 0.165, 0.15, 0.148, 0.16, 0.185, 0.198, 0.15, 0.062];
  const RZ = [0.16, 0.145, 0.13, 0.118, 0.112, 0.118, 0.13, 0.128, 0.1, 0.06];
  mesh(loft(44, 22, centre, (t) => [keyed(RX, t), keyed(RZ, t)], cloth), body);
  const HX = sway(1),
    HY = NECK + 0.2;

  // --- the head: turned on a lathe from a hand-drawn profile (chin up to crown)
  const PROFILE = [
    [0.0, -0.215], [0.038, -0.208], [0.064, -0.176], [0.078, -0.128], [0.088, -0.072], [0.102, -0.012],
    [0.124, 0.05], [0.14, 0.108], [0.142, 0.158], [0.126, 0.202], [0.092, 0.232], [0.048, 0.25], [0.0, 0.256],
  ];
  const headGeo = (scale, phi0, phiLen, seg) => {
    const pts = PROFILE.map((q) => new THREE.Vector2(Math.max(q[0] * scale, 0.0001), q[1] * scale));
    const curve = new THREE.SplineCurve(pts);
    const geo = new THREE.LatheGeometry(curve.getPoints(40), seg, phi0, phiLen);
    geo.scale(1, 1, 0.9);
    geo.computeVertexNormals();
    return geo;
  };
  const head = mesh(tint(headGeo(1, 0, Math.PI * 2, 40), (x, y, z) => mix(PALE, 0xb9b07a, clamp(0.55 - z * 4 + (vnoise(x * 20, y * 20) - 0.5) * 0.3))), skin);
  head.position.set(HX, HY, 0.012);
  const face = new THREE.Mesh(headGeo(1.012, -0.95, 1.9, 28), new THREE.MeshBasicMaterial({ map: screamFace(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  face.position.copy(head.position);
  face.renderOrder = 3;
  face.frustumCulled = false;
  g.add(face);
  // neck
  mesh(loft(6, 12, (t) => [HX, NECK - 0.03 + t * 0.09, 0.012], (t) => [0.05 - t * 0.008, 0.048 - t * 0.008], () => new THREE.Color(0xc9b984)), skin);

  // --- arms: out at the elbow, up to the cheeks
  for (const sx of [-1, 1]) {
    const sh = [sway(0.9) + sx * 0.175, NECK - 0.13, 0.0];
    const el = [sway(0.72) + sx * 0.3, NECK - 0.3, 0.07];
    const wr = [HX + sx * 0.142, HY - 0.105, 0.075];
    const arm = (t) => {
      // quadratic Bezier through the elbow
      const u = 1 - t;
      const cx = 2 * el[0] - 0.5 * (sh[0] + wr[0]),
        cy = 2 * el[1] - 0.5 * (sh[1] + wr[1]),
        cz = 2 * el[2] - 0.5 * (sh[2] + wr[2]);
      return [u * u * sh[0] + 2 * u * t * cx + t * t * wr[0], u * u * sh[1] + 2 * u * t * cy + t * t * wr[1], u * u * sh[2] + 2 * u * t * cz + t * t * wr[2]];
    };
    // the loft helper stacks sections in y, so build the sleeve as short stacked rings along the curve
    const N = 16;
    const v = [],
      idx = [];
    const seg = 10;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const c = arm(t),
        c2 = arm(Math.min(1, t + 0.02)),
        c1 = arm(Math.max(0, t - 0.02));
      const dir = new THREE.Vector3(c2[0] - c1[0], c2[1] - c1[1], c2[2] - c1[2]).normalize();
      const side = new THREE.Vector3(0, 0, 1).cross(dir).normalize();
      const up = dir.clone().cross(side).normalize();
      const r = 0.068 - 0.026 * t + 0.012 * Math.sin(t * Math.PI);
      for (let k = 0; k < seg; k++) {
        const a = (k / seg) * Math.PI * 2;
        v.push(c[0] + (side.x * Math.cos(a) + up.x * Math.sin(a)) * r, c[1] + (side.y * Math.cos(a) + up.y * Math.sin(a)) * r, c[2] + (side.z * Math.cos(a) + up.z * Math.sin(a)) * r);
      }
    }
    for (let i = 0; i < N; i++)
      for (let k = 0; k < seg; k++) {
        const p0 = i * seg + k,
          p1 = i * seg + ((k + 1) % seg),
          p2 = p0 + seg,
          p3 = p1 + seg;
        idx.push(p0, p2, p1, p1, p2, p3);
      }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    sg.setIndex(idx);
    sg.computeVertexNormals();
    mesh(tint(sg, cloth), body);

    // the hand: a long palm flat on the cheek, four fingers to the temple, thumb along the jaw
    const hand = new THREE.Group();
    hand.position.set(HX + sx * 0.128, HY - 0.035, 0.07);
    hand.rotation.set(0.12, sx * 0.55, -sx * 0.1);
    const part = (geo, m4) => {
      const gg = tint(geo, PALE);
      gg.applyMatrix4(m4);
      const mm = new THREE.Mesh(gg, skin);
      mm.frustumCulled = false;
      hand.add(mm);
    };
    part(new THREE.SphereGeometry(0.05, 14, 10), xf(0, -0.02, 0, 0, 0.72, 1.25, 0.34));
    for (let f = 0; f < 4; f++) {
      const fx = (f - 1.5) * 0.019 * -sx;
      part(new THREE.CapsuleGeometry(0.0105, 0.07 - Math.abs(f - 1.5) * 0.008, 4, 8), xf(fx, 0.078 + (1.5 - Math.abs(f - 1.5)) * 0.006, 0.002, 0, 1, 1, 0.8, 0, (f - 1.5) * 0.07 * -sx));
    }
    part(new THREE.CapsuleGeometry(0.012, 0.05, 4, 8), xf(-sx * 0.034, -0.045, 0.016, 0, 1, 1, 0.8, 0.2, -sx * 0.9));
    g.add(hand);
  }
  return g;
}

export class ScreamWorld extends World {
  constructor(ctx) {
    super(ctx);
    this.id = 'scream';
    this.index = 3;
    this.kicker = 'IV · Kristiania, Norway, 1893';
    this.title = 'The Scream';
    this.sub = 'Edvard Munch';
    this.aspect = 73.5 / 91;
    this.extent = 260;
    this.boundary = 250;
    this.center = { x: -40, z: -40 };
    this.ceiling = 110;
    this.waterY = 0;
    this.env = {
      sunDir: new THREE.Vector3(-0.72, 0.3, -0.5),
      sunColor: 0xa8663a,
      skyColor: 0x70749a,
      groundColor: 0x2a2c4c,
      fogColor: 0x3a3f72,
      fog: [0.0018, 0, 0.01, 0.62],
      paper: 0xeee4cf,
      ink: 0x3a3440,
      rim: 0xffb060,
      lamp: 1.3,
      wobble: 0.26,
      sway: 0.4,
    };
    this.style = { kuwahara: 2.3, bloom: 0.32, threshold: 1.08, grain: 0.09, saturation: 1.16, contrast: 1.1, vignette: 0.8, warp: 1.0, outline: 0.34, ink: 0x161430 };
    this.spawn = { pos: [36, 10.5], yaw: -1.84 };
    this.view = { pos: [2.6, 1.72, 3.1], target: [-4.4, 1.25, -5.2], fov: 62 };
    this.music = 'scream';
    this.build();
  }

  // the road follows this line; everything else is laid out from it
  roadPts() {
    return [[150, 44], [100, 30], [50, 14], [0, 0], [-48, -22], [-96, -44], [-138, -62], [-170, -70]];
  }
  roadY(x) {
    return lerp(6, 34, smooth(-150, -20, x)) + smooth(40, 150, x) * 8;
  }
  heightAt(x, z) {
    // distance north of the road line decides how far down the hill we are
    const zr = this._roadZ(x);
    const dn = zr - z; // + = towards the fjord
    const ry = this.roadY(x);
    let h;
    if (dn > 0) h = ry - smooth(3.5, 60, dn) * (ry + 5) - smooth(60, 120, dn) * 3;
    else h = ry + smooth(4, 90, -dn) * 34;
    h += (fbm(x * 0.02, z * 0.02, 3) - 0.5) * 7 * smooth(5, 26, Math.abs(dn));
    // the old town sits on flat ground by the water
    const town = 1 - smooth(34, 62, Math.hypot(x + 172, z + 74));
    h = lerp(h, 3.2, town);
    // one island out in the fjord
    h = Math.max(h, 9 * Math.exp(-((x + 40) ** 2 + (z + 190) ** 2) / (2 * 30 * 30)) - 2.5);
    return h;
  }
  _roadZ(x) {
    const p = this.roadPts();
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i],
        b = p[i + 1];
      if (x <= a[0] && x >= b[0]) return lerp(a[1], b[1], (a[0] - x) / (a[0] - b[0]));
    }
    return x > 150 ? 44 + (x - 150) * 0.3 : -70;
  }

  build() {
    const { strokes, noise3 } = this.ctx;
    const R = rng(1893);
    const S = this.scene;
    const H = (x, z) => this.heightAt(x, z);
    const maps = (this.maps = new GroundMaps(this.extent, H));
    this.sky = new Sky({ body: SKY, noise3, uniforms: { uCalm: { value: 0 }, uBigSun: { value: new THREE.Vector3(0.876, 0.122, -0.466).normalize() } } });
    S.add(this.sky.mesh);
    const wavy = (o = {}) => paintMaterial({ stroke: strokes.wavy, scale: 0.1, contrast: 0.6, hueVar: 0.55, warp: 0.9, impasto: 0.1, rim: 0.12, band: 0.3, accent: 0xe07a3a, accentAmt: 0.18, big: 0.9, ...o });

    // ---------------- land
    const groundCol = (x, z, y) => {
      const n = vnoise(x * 0.03, z * 0.03);
      const c = mix(0x1a2c52, 0x2c4a5a, n);
      c.lerp(new THREE.Color(0x3a5a44), smooth(0.5, 0.85, vnoise(x * 0.012 + 4, z * 0.012)) * 0.55);
      c.lerp(new THREE.Color(0x5a3a2a), smooth(0.7, 0.95, vnoise(x * 0.02 + 11, z * 0.02 + 3)) * 0.4);
      if (y < 2.2) c.lerp(new THREE.Color(0x6a5a4a), smooth(2.2, 0.2, y));
      return c;
    };
    S.add(new THREE.Mesh(terrain(H, 480, 240, groundCol, 0.7, 2.2, -40, -40), wavy({ scale: 0.06, angle: 0.5 })));

    // ---------------- fjord: dark water carrying the sky in orange ribbons
    const wg = new THREE.PlaneGeometry(2400, 2400, 120, 120);
    wg.rotateX(-Math.PI / 2);
    const fjord = new THREE.Mesh(wg, waterMaterial({ stroke: strokes.wavy, deep: 0x121c44, shallow: 0x3a5a94, reflect: 0xd9b46a, glint: 0xffb050, scale: 0.035, glintAmt: 1.8, flow: 0.012, swell: 0.25 }));
    fjord.frustumCulled = false;
    S.add(fjord);

    // ---------------- the road and its railing
    const pts = this.roadPts();
    const RB = new Builder();
    RB.parts.push(ribbon(pts, 6.4, H, (x, y, z) => mix(0x6a4428, 0xa8743a, vnoise(x * 0.2, z * 0.2)).lerp(new THREE.Color(0x4a4468), vnoise(x * 0.07 + 3, z * 0.07) * 0.45), { lift: 0.16, across: 4 }));
    RB.parts.push(patch(-172, -74, 30, H, (x, y, z) => mix(0x7a6a5a, 0xa08a6a, vnoise(x * 0.3, z * 0.3)), { lift: 0.14, wobble: 0.08 }));
    S.add(RB.mesh(wavy({ scale: 0.12, warp: 0.25, angle: 1.2, contrast: 0.5 })));

    const B = new Builder();
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.5);
    const cs = curve.getSpacedPoints(160);
    this.rail = [];
    for (let i = 0; i < cs.length - 1; i++) {
      const a = cs[i],
        b = cs[i + 1];
      if (a.x < -150) break;
      const tx = b.x - a.x,
        tz = b.z - a.z,
        L = Math.hypot(tx, tz);
      // fjord side is to the right when walking west
      const nx = -tz / L,
        nz = tx / L;
      const px = (a.x + b.x) / 2 + nx * 3.0,
        pz = (a.z + b.z) / 2 + nz * 3.0;
      const y = H(px - nx * 0.8, pz - nz * 0.8);
      const ry = Math.atan2(tx, tz);
      for (const hh of [0.42, 0.78, 1.14]) B.box(0.09, 0.07, L + 0.05, 0x5a3320, px, y + hh, pz, ry);
      if (i % 2 === 0) B.box(0.14, 1.3, 0.14, 0x3a2418, px, y, pz, ry);
      this.colliders.push({ x: px, z: pz, hw: 0.2, hd: L / 2, ry, top: y + 1.25 });
    }

    // ---------------- Kristiania by the water
    const proxy = { heightAt: H, colliders: this.colliders, maps, glows: this.glows };
    const NORDIC = [0x8a2f2a, 0xc9a24a, 0xdcd4c0, 0x6a3a2a, 0x9a4a34, 0x4a6a7a, 0xb86a3a];
    const TX = -172,
      TZ = -74;
    const placed = [];
    for (let i = 0; i < 34; i++) {
      const a = R() * 6.283,
        d = 16 + R() * 44;
      const x = TX + Math.cos(a) * d,
        z = TZ + Math.sin(a) * d * 0.8;
      if (H(x, z) < 1.6 || placed.some((p) => Math.hypot(p[0] - x, p[1] - z) < 10) || Math.abs(z - this._roadZ(x)) < 6) continue;
      placed.push([x, z]);
      house(B, proxy, { R, x, z, ry: R() * 6.283, w: 6 + R() * 4, d: 5.5 + R() * 2.5, h: 4 + (R() < 0.4 ? 3 : 0) + R(), wall: jitter(NORDIC[(R() * NORDIC.length) | 0], R, 0.08), roof: [0x2a2a34, 0x3a2a2a, 0x4a3a34][(R() * 3) | 0], trim: 0xe8e0d0, lit: 0.8, roofH: 3.2 });
    }
    // the church whose tower shows in the painting
    {
      const cx = TX + 8,
        cz = TZ + 6,
        y = H(cx, cz);
      house(B, proxy, { R, x: cx, z: cz, y, w: 9, d: 20, h: 8, roofH: 6, wall: 0xcfc6b4, roof: 0x2a2a34, lit: 1, winH: 2.6, chimney: false, ridgeAlongX: false, trim: 0x3a3440 });
      B.box(5, 17, 5, 0xc9c0ae, cx, y, cz - 12);
      B.hip(6, 6, 15, 0x23232c, cx, y + 17, cz - 12, 0, undefined, undefined, 0);
      this.colliders.push({ x: cx, z: cz - 12, hw: 2.8, hd: 2.8, ry: 0, top: y + 32 });
      this.glows.push({ p: [cx, y + 12, cz - 14.6], c: 0xffc070, size: 3 });
    }
    // harbour: a pier, lamps, two boats out on the water as in the picture
    for (let z = -112; z >= -150; z -= 1.3) B.box(4, 0.2, 1.15, mix(0x6a4a34, 0x8a6a48, R()), TX + 14, 1.0, z);
    for (let z = -114; z >= -150; z -= 6) for (const sx of [-1, 1]) B.cyl(0.16, 0.18, 4, 0x2a1c14, TX + 14 + sx * 1.9, -2.6, z, 6);
    this.platforms = [{ minx: TX + 11.8, maxx: TX + 16.2, minz: -150.8, maxz: -111, y: 1.2 }];
    for (const [x, z, s, ry] of [[-74, -150, 1, 0.4], [-34, -128, 0.8, -0.3], [-120, -176, 1.1, 1.2], [20, -170, 0.9, 0.2], [-150, -210, 1.2, -0.8]]) {
      const M = xf(x, 0, z, ry, s, s, s);
      B.box(9, 1.3, 2.6, 0x3a2a22, 0, -0.3, 0, 0, undefined, M);
      B.cyl(0.1, 0.14, 9.5, 0x2a1c14, 0.4, 0.8, 0, 5, undefined, M);
      B.box(0.08, 6.6, 4.4, 0xd9c8a8, 0.2, 2.4, 0, 0, { sway: 0.06 }, M);
      this.colliders.push({ x, z, hw: 4.6 * s, hd: 1.4 * s, ry, top: 1.2 });
    }
    // lighthouse on the island
    {
      const y = H(-40, -190);
      B.cyl(1.4, 2.2, 11, (x, yy) => (Math.floor((yy + 5.5) / 2.75) % 2 ? new THREE.Color(0xd9d0c0) : new THREE.Color(0x9a3a2a)), -40, y, -190, 10);
      B.cyl(1.0, 1.0, 1.6, 0xffc060, -40, y + 11, -190, 8, { emissive: 1 });
      B.cyl(0.1, 1.5, 1.4, 0x2a2a34, -40, y + 12.6, -190, 8);
      this.glows.push({ p: [-40, y + 11.8, -190], c: 0xffc060, size: 7 });
      this.colliders.push({ x: -40, z: -190, r: 2.3, top: y + 13 });
      maps.lamp(-40, -190, 22, 0xffc060, 0.7);
    }
    // gas lamps down the road, a bench at the viewpoint, a cart
    for (const [x, z] of [[-150, -66], [-180, -84], [-160, -90], [-190, -62], [TX + 14, -116], [TX + 14, -148]]) lampPost(B, this, x, z, { col: 0xffa850, glow: 2.4, radius: 9 });
    {
      const x = 62,
        z = 34,
        y = H(x, z);
      B.box(3, 0.16, 0.9, 0x5a3a26, x, y + 0.5, z, 0.4);
      B.box(3, 0.9, 0.12, 0x5a3a26, x + 0.15, y + 0.5, z + 0.4, 0.4);
    }
    S.add(B.mesh(wavy({ stroke: strokes.oil, scale: 0.3, warp: 0.15, contrast: 0.45, hueVar: 0.4, emissive: 2.0, big: 0.5, wallStretch: 0.6 })));

    // ---------------- trees: birches by the road, dark spruce up the hill
    const T = new Builder();
    for (let i = 6; i < cs.length - 6; i += 5) {
      const a = cs[i],
        b = cs[i + 1];
      const L = Math.hypot(b.x - a.x, b.z - a.z);
      const x = a.x + ((b.z - a.z) / L) * (6 + R() * 6),
        z = a.z - ((b.x - a.x) / L) * (6 + R() * 6);
      if (R() < 0.35 || Math.hypot(x, z) < 12) continue;
      blobTree(T, x, H(x, z), z, 7 + R() * 3, 2.2 + R(), R, { trunk: 0xe6e0d4, lo: 0x7a4a1a, hi: 0xe8a030, blobs: 3, trunkH: 0.62, sway: 0.4 });
      this.colliders.push({ x, z, r: 0.35, top: H(x, z) + 4 });
      maps.blob(x, z, 3.5, 0.35);
    }
    let n = 0,
      guard = 0;
    while (n < 150 && guard++ < 3000) {
      const x = -260 + R() * 480,
        z = -40 + R() * 240;
      const dn = this._roadZ(x) - z;
      if (dn > -9 || Math.hypot(x - TX, z - TZ) < 60) continue;
      const y = H(x, z),
        hh = 9 + R() * 9;
      pine(T, x, y, z, hh, 3 + R() * 1.8, R, { lo: 0x12282c, hi: 0x2a4a3a, trunk: 0x2a1c18, tiers: 4 });
      if (-dn < 60) this.colliders.push({ x, z, r: 0.5, top: y + hh * 0.5 });
      n++;
    }
    S.add(T.mesh(wavy({ scale: 0.18, warp: 0.4, rim: 0.3, wallStretch: 0.5, angle: 1.57 })));

    // ---------------- people: the two friends who walked on, townsfolk
    const P = new Builder();
    const fr = cs[78];
    for (const [ox, oz] of [[-0.6, 0.3], [0.5, -0.3]]) figure(P, fr.x + ox, H(fr.x + ox, fr.z + oz), fr.z + oz, -1.95, { coat: 0x17171f, legs: 0x15151c, skin: 0xcdb090, hat: 'top', scale: 1.08 });
    for (const [x, z, ry] of [[-160, -72, 1], [-176, -80, -2], [-186, -68, 0.5], [TX + 14, -130, 3.1], [-150, -84, 2.2]]) figure(P, x, H(x, z), z, ry, { coat: [0x2a2a34, 0x4a2a2a, 0x2f3f4a][(R() * 3) | 0], dress: R() < 0.5, hat: R() < 0.5 ? 'top' : undefined });
    S.add(P.mesh(wavy({ stroke: strokes.oil, scale: 0.8, warp: 0.1, rim: 0.25 })));

    // ---------------- far shore
    const far = mountainRing({ radius: 520, base: -6, profile: (a) => 26 + fbm(a * 3.2, 1.7, 3) * 80 + Math.sin(a * 4) * 12, colorFn: (x, y) => mix(0x1a2248, 0x34406e, clamp(y / 90)), seg: 200, depth: 110 });
    const fm = new THREE.Mesh(far, wavy({ scale: 0.012, side: THREE.DoubleSide, rim: 0, wallStretch: 2.4, accentAmt: 0.1 }));
    fm.frustumCulled = false;
    S.add(fm);

    // ================= Munch's other pictures, set down in his own country =================
    const MB = new Builder();
    const MT = new Builder();
    const proxyM = { heightAt: H, colliders: this.colliders, maps, glows: this.glows };
    const shoreZ = (x) => {
      // walk north from the road until the ground meets the water
      const zr = this._roadZ(x);
      for (let d = 18; d < 120; d += 1.5) if (H(x, zr - d) < 0.7) return zr - d;
      return zr - 72;
    };
    const person = (x, z, ry, o) => figure(MB, x, H(x, z), z, ry, o);

    // --- the rounded shore stones of Åsgårdstrand, all along the water
    const STONE = [0xc9b49a, 0x9a8a9a, 0xb8a08a, 0x7f8aa0, 0xd9c0a0, 0x8a7a8a];
    for (let x = -126; x < 150; x += 2.2) {
      for (let k = 0; k < 2; k++) {
        if (R() < 0.35) continue;
        const z = shoreZ(x) + 1 + (R() - 0.5) * 9;
        const r = 0.6 + R() * 1.7;
        MB.ball(r, STONE[(R() * STONE.length) | 0], x + (R() - 0.5) * 2, H(x, z) - r * 0.3, z, 1.35, 0.6, 1, 1);
      }
    }

    // --- Melancholy: a man on the stones with his head in his hand
    {
      const x = 4,
        z = shoreZ(4) + 4,
        y = H(x, z);
      MB.ball(1.1, 0x9a8a9a, x, y, z, 1.3, 0.7, 1, 1);
      const M = xf(x, y + 0.72, z, -0.8);
      MB.cyl(0.2, 0.26, 0.62, 0x1c1c26, 0, 0, 0, 8, undefined, M, 0.5, 0);
      MB.cyl(0.09, 0.1, 0.5, 0x1c1c26, -0.12, 0.05, 0.3, 6, undefined, M, 1.45, 0);
      MB.cyl(0.09, 0.1, 0.5, 0x1c1c26, 0.12, 0.05, 0.3, 6, undefined, M, 1.45, 0);
      MB.cyl(0.08, 0.09, 0.55, 0x1c1c26, -0.12, -0.5, 0.56, 6, undefined, M);
      MB.cyl(0.08, 0.09, 0.55, 0x1c1c26, 0.12, -0.5, 0.56, 6, undefined, M);
      MB.ball(0.19, 0xd9b090, 0.06, 0.78, 0.36, 1, 1.08, 1, 1, undefined, M);
      MB.ball(0.2, 0x2a1c14, 0.06, 0.84, 0.33, 1, 0.8, 1, 1, undefined, M);
      MB.cyl(0.06, 0.07, 0.5, 0x1c1c26, 0.2, 0.3, 0.3, 6, undefined, M, 0.5, 0.35);
      this.colliders.push({ x, z, r: 1.3, top: y + 1 });
    }

    // --- The Girls on the Bridge: three dresses at the railing, the great round tree, the white house
    {
      const px = TX + 14;
      for (let z = -112; z >= -150; z -= 2.4) MB.box(0.14, 1.1, 0.14, 0xe8e2d4, px - 2, 1.2, z);
      for (const hh of [0.55, 1.05]) MB.box(0.1, 0.08, 38, 0xe8e2d4, px - 2, 1.2 + hh, -131);
      this.colliders.push({ x: px - 2.1, z: -131, hw: 0.15, hd: 19, ry: 0, top: 2.4 });
      const girls = [[0xf4f0e6, 0xf4f0e6], [0xc8382c, 0xe9c96a], [0x3f7a4a, 0xf4f0e6]];
      girls.forEach(([dress, hat], i) => figure(MB, px - 1.5, 1.4, -124 - i * 1.15, -Math.PI / 2 + (i - 1) * 0.15, { coat: dress, dress: true, hat: 'straw', hatCol: hat, hair: 0xb8863a, scale: 0.92, lean: 0.18, arms: 0.5 }));
      blobTree(MT, -146, H(-146, -104), -104, 12, 7.5, R, { lo: 0x12301f, hi: 0x2f6a44, trunk: 0x2a1c18, blobs: 6, trunkH: 0.35 });
      this.colliders.push({ x: -146, z: -104, r: 1.2, top: H(-146, -104) + 6 });
      house(MB, proxyM, { R, x: -134, z: -98, ry: Math.PI + 0.3, w: 12, d: 8, h: 6.6, wall: 0xf2efe6, roof: 0x7a2f2a, trim: 0x6f7a8a, lit: 0.9, roofH: 4.2 });
      for (let i = 0; i < 16; i++) MB.box(0.12, 1.1, 0.12, 0xf2efe6, -143 + i * 1.2, H(-143 + i * 1.2, -108), -108);
      MB.box(18.4, 0.1, 0.1, 0xf2efe6, -134, H(-134, -108) + 0.8, -108);
    }

    // --- The Dance of Life: couples turning on the shore meadow under the column of light
    {
      const cx = -92,
        cz = -80;
      S.add(new THREE.Mesh(patch(cx, cz, 17, H, (x, y, z) => mix(0x3f7a44, 0x6fa04a, vnoise(x * 0.2, z * 0.2)), { lift: 0.12, wobble: 0.15, sx: 1.4 }), wavy({ scale: 0.14, warp: 0.4 })));
      const couples = [[0, 0, 0xc8382c], [-6, 2, 0xf4d9e0], [6, -2, 0xe9c96a], [-3, -5, 0x8fb0d8], [9, 4, 0xf2efe6]];
      couples.forEach(([ox, oz, dress], i) => {
        const a = R() * 6.283;
        const x = cx + ox,
          z = cz + oz;
        person(x + Math.sin(a) * 0.36, z + Math.cos(a) * 0.36, a + Math.PI, { coat: dress, dress: true, hair: i === 0 ? 0xb8402c : 0x4a2c1a, arms: 0.9, lean: 0.06 });
        person(x - Math.sin(a) * 0.36, z - Math.cos(a) * 0.36, a, { coat: 0x15151c, legs: 0x15151c, arms: 0.9, lean: 0.06 });
      });
      // the two who stand apart: white for the beginning, black for the end
      person(cx - 14, cz + 1, 1.3, { coat: 0xf6f2e8, dress: true, hair: 0xd9a84a, arms: 0.2 });
      person(cx + 15, cz - 1, -1.3, { coat: 0x121218, dress: true, hair: 0x2a1c14, arms: 0.1 });
    }

    // --- The Yellow Log: a felled trunk in the forest, bright as butter
    {
      const lx = 70,
        lz = 64;
      const y = H(lx, lz);
      const sl = Math.atan2(H(lx, lz + 6) - H(lx, lz - 6), 12);
      MB.add(new THREE.CylinderGeometry(0.8, 1.0, 22, 12), (x, yy) => mix(0xf2c230, 0xffe27a, clamp(vnoise(yy * 0.6, x * 3))), xf(lx, y + 1.0, lz, 0.15, 1, 1, 1, Math.PI / 2 - sl, 0));
      MB.add(new THREE.CylinderGeometry(0.98, 0.98, 0.12, 12), 0xf0903a, xf(lx - Math.sin(0.15) * 11, H(lx, lz - 11) + 1.0, lz - 11, 0.15, 1, 1, 1, Math.PI / 2 - sl, 0));
      for (let i = 0; i < 7; i++) {
        const ox = 5 + (i % 4) * 1.5,
          oz = -4 + Math.floor(i / 4) * 0.2;
        MB.add(new THREE.CylinderGeometry(0.5, 0.55, 9, 8), [0xe8c84a, 0xd9a83a, 0xc98a3a][i % 3], xf(lx + ox, H(lx + ox, lz + oz) + 0.5 + Math.floor(i / 4) * 0.95, lz + oz, 0.1, 1, 1, 1, Math.PI / 2 - sl, 0));
      }
      for (let i = 0; i < 9; i++) {
        const a = R() * 6.283,
          d = 6 + R() * 12;
        MB.cyl(0.5, 0.6, 0.5 + R() * 0.4, 0xd9a84a, lx + Math.cos(a) * d, H(lx + Math.cos(a) * d, lz + Math.sin(a) * d), lz + Math.sin(a) * d, 8);
      }
      this.colliders.push({ x: lx, z: lz, hw: 1.1, hd: 11, ry: 0.15, top: y + 2.2 });
    }

    // --- his own little house, ochre with white trim, an easel in the garden, four girls by the wall
    {
      const hx = 106,
        hz = 48;
      house(MB, proxyM, { R, x: hx, z: hz, ry: Math.PI, w: 8.5, d: 6.5, h: 4.2, wall: 0xd9a83a, roof: 0x8a3a2a, trim: 0xf2efe6, lit: 1, roofH: 3.2 });
      for (let i = 0; i < 14; i++) MB.box(0.1, 1.0, 0.1, 0xf2efe6, hx - 7.8 + i * 1.2, H(hx - 7.8 + i * 1.2, hz - 7.5), hz - 7.5);
      MB.box(16, 0.09, 0.09, 0xf2efe6, hx, H(hx, hz - 7.5) + 0.75, hz - 7.5);
      const ey = H(hx - 5, hz - 5);
      for (const [ox, rz] of [[-0.4, 0.13], [0.4, -0.13]]) MB.cyl(0.035, 0.035, 2.0, 0x5a3a22, hx - 5 + ox, ey, hz - 5, 5, undefined, undefined, 0, rz);
      MB.box(1.1, 0.9, 0.05, 0xc8382c, hx - 5, ey + 1.0, hz - 5.02, 0, { emissive: 0.2 });
      [0xf4f0e6, 0x8a5a3a, 0xc8382c, 0x3a4a6a].forEach((c, i) => person(hx + 1 + i * 0.8, hz - 4.2, Math.PI, { coat: c, dress: true, hair: 0xb8863a, hat: i % 2 ? 'straw' : undefined, scale: 0.62 + i * 0.07 }));
    }

    // --- worked land on the bare hillside: strips of plough, pasture and stubble, ricks, fences, farms
    const FIELD = [0x5a4478, 0x6f9a4a, 0xc9a43a, 0x3f6a5a, 0x7a4a3a, 0xa8b04a, 0x4a4a7a];
    const fields = [];
    const FM = new Builder();
    for (let i = 0; i < 26; i++) {
      const x = -120 + R() * 280;
      const south = 26 + R() * 60;
      const z = this._roadZ(x) + south;
      if (fields.some((f) => Math.hypot(f[0] - x, f[1] - z) < 26) || Math.hypot(x - 70, z - 64) < 24 || Math.hypot(x - 106, z - 48) < 18) continue;
      const col = FIELD[(R() * FIELD.length) | 0];
      const rad = 11 + R() * 7;
      fields.push([x, z, rad, col]);
      FM.parts.push(patch(x, z, rad, H, (px, py, pz) => mix(col, 0x000000, 0.12 * Math.abs(Math.sin(px * 0.9 + pz * 0.4))).lerp(new THREE.Color(col), 0.5), { lift: 0.14, wobble: 0.2, sx: 1.5, sz: 0.8, ry: R() * 0.6 }));
    }
    S.add(FM.mesh(wavy({ scale: 0.12, warp: 0.5, contrast: 0.5 })));
    const horse = (x, z, ry, col) => {
      const M = xf(x, H(x, z), z, ry);
      MB.box(0.62, 0.75, 1.9, col, 0, 0.95, 0, 0, undefined, M);
      for (const [ox, oz] of [[-0.22, -0.75], [0.22, -0.75], [-0.22, 0.75], [0.22, 0.75]]) MB.box(0.16, 1.0, 0.18, col, ox, 0, oz, 0, undefined, M);
      MB.box(0.34, 0.95, 0.4, col, 0, 1.45, 1.05, 0, undefined, M.clone().multiply(xf(0, 0, 0, 0, 1, 1, 1, 0.5, 0)));
      MB.box(0.3, 0.36, 0.72, col, 0, 2.05, 1.62, 0, undefined, M);
      MB.box(0.1, 0.8, 0.1, 0x2a1c14, 0, 1.0, -1.02, 0, undefined, M);
    };
    fields.forEach(([x, z, rad, col], i) => {
      if (col === 0xc9a43a || col === 0xa8b04a) {
        // stubble: hayricks in rows
        for (let k = 0; k < 6; k++) {
          const hx = x + (k % 3 - 1) * 5.5 + (R() - 0.5),
            hz = z + (Math.floor(k / 3) - 0.5) * 6;
          MB.cyl(0.15, 1.5, 2.6, (px, py) => mix(0xb8862a, 0xf2d060, clamp(py / 2.6 + 0.5)), hx, H(hx, hz), hz, 8);
          maps.blob(hx, hz, 2.4, 0.3);
        }
      } else if (col === 0x5a4478 || col === 0x7a4a3a) {
        // spring ploughing: a white horse and a brown one, a man behind
        const a = R() * 6.283;
        horse(x - 0.5, z, a, 0xe8e2d4);
        horse(x + 0.5, z, a, 0x6a3a22);
        person(x - Math.sin(a) * 3.2, z - Math.cos(a) * 3.2, a, { coat: 0x3a4a6a, hat: 'straw', lean: 0.2, arms: 0.6 });
      }
      if (i % 3 === 0) {
        const fx = x + rad * 1.2,
          fz = z + 4;
        if (H(fx, fz) > 4 && !fields.some((f) => f !== fields[i] && Math.hypot(f[0] - fx, f[1] - fz) < f[2] + 4))
          house(MB, proxyM, { R, x: fx, z: fz, ry: Math.PI + (R() - 0.5), w: 7, d: 5.5, h: 3.8, wall: [0x8a2f2a, 0xdcd4c0, 0xc9a24a][(R() * 3) | 0], roof: 0x2a2a34, trim: 0xf2efe6, lit: 0.9, roofH: 2.8 });
      }
      // post-and-rail along the downhill edge
      for (let k = -3; k <= 3; k++) MB.box(0.12, 0.9, 0.12, 0x3a2418, x + k * 2.6, H(x + k * 2.6, z - rad * 0.8), z - rad * 0.8);
    });

    // --- a steamer on the fjord, and more sails
    {
      const M = xf(46, 0, -150, 0.5);
      MB.box(18, 2.2, 4.4, 0x1c1c26, 0, -0.5, 0, 0, undefined, M);
      MB.box(9, 1.6, 3.2, 0xe8e2d4, -1, 1.7, 0, 0, undefined, M);
      MB.cyl(0.6, 0.7, 3.6, 0xb8382c, 1, 3.3, 0, 10, undefined, M);
      MB.cyl(0.64, 0.64, 0.6, 0x15151c, 1, 6.6, 0, 10, undefined, M);
      for (let k = 0; k < 7; k++) MB.ball(1.0 + k * 0.42, mix(0x4a4a5a, 0x9a94a0, k / 7), 1 - k * 2.6, 8 + k * 1.5, k * 0.6, 1, 0.8, 1, 1, { sway: 0.4 }, M);
      this.colliders.push({ x: 46, z: -150, hw: 9.5, hd: 2.6, ry: 0.5, top: 4 });
    }
    S.add(MB.mesh(wavy({ stroke: strokes.oil, scale: 0.4, warp: 0.12, contrast: 0.4, hueVar: 0.35, emissive: 2.0, big: 0.4, wallStretch: 0.6 })));
    S.add(MT.mesh(wavy({ scale: 0.18, warp: 0.4, rim: 0.3, wallStretch: 0.5, angle: 1.57 })));

    // --- the column of light that the Sun lays across the water
    {
      const pg = new THREE.PlaneGeometry(1, 1, 1, 48);
      pg.rotateX(-Math.PI / 2);
      this.pillar = new THREE.Mesh(
        pg,
        new THREE.ShaderMaterial({
          uniforms: { uTime: G.uTime, uNoise: G.uNoise, uAmt: { value: 0 } },
          vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uAmt; uniform sampler2D uNoise;
            void main(){
              float n = texture2D(uNoise, vec2(vUv.x * 0.02 + uTime * 0.002, vUv.y * 0.35 - uTime * 0.004)).r;
              float w = 0.22 + 0.28 * vUv.y;
              float a = (1.0 - smoothstep(w * 0.4, w, abs(vUv.x - 0.5 + (n - 0.5) * 0.12))) * (0.45 + 0.75 * n);
              a *= smoothstep(0.0, 0.06, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
              gl_FragColor = vec4(vec3(1.0, 0.78, 0.34) * a * uAmt, 1.0);
            }`,
          blending: THREE.AdditiveBlending,
          transparent: true,
          depthWrite: false,
        })
      );
      const dir = new THREE.Vector3(0.876, 0, -0.466).normalize();
      const len = 760;
      this.pillar.scale.set(60, 1, len);
      this.pillar.rotation.y = Math.atan2(dir.x, dir.z);
      this.pillar.position.set(-20 + dir.x * len * 0.5, 0.45, -78 + dir.z * len * 0.5);
      this.pillar.renderOrder = 7;
      S.add(this.pillar);
    }

    // leaves on the wind, lights of the town
    for (let i = 0; i < 140; i++) {
      const p = cs[(R() * cs.length) | 0];
      this.glows.push({ p: [p.x + (R() - 0.5) * 40, H(p.x, p.z) + 1 + R() * 9, p.z + (R() - 0.5) * 40], c: [0xff8a3a, 0xffc060, 0xe04a2a][(R() * 3) | 0], size: 0.22 + R() * 0.2, drift: 2.6 });
    }
    S.add(glowPoints(this.glows, 1.0));
    maps.finish();

    // ---------------- story
    const E = cs[60]; // where he stopped
    const e2 = cs[61];
    const tl = Math.hypot(e2.x - E.x, e2.z - E.z);
    const nx = -(e2.z - E.z) / tl,
      nz = (e2.x - E.x) / tl;
    const ex = E.x + nx * 1.6,
      ez = E.z + nz * 1.6,
      ey = H(ex, ez);
    this.echoSpot = [ex, ey, ez];
    const page = new Builder();
    page.box(0.9, 1.2, 0.03, 0xf4ecd8, 0, -0.6, 0, 0, { emissive: 0.4 });
    for (let i = 0; i < 7; i++) page.box(0.6 - (i % 3) * 0.08, 0.035, 0.035, 0x3a3440, -0.05, 0.4 - i * 0.13, 0.02);
    const pm = page.mesh(paintMaterial({ stroke: strokes.soft, scale: 2, contrast: 0.15, objSpace: 1, emissive: 1.5, side: THREE.DoubleSide }));
    pm.material.uniforms.uRestore = { value: 1 };
    pm.scale.setScalar(1.7);
    // paint the view from just in front of him, looking past him down the road
    this.view = { pos: [ex + 0.643 * 1.8, ey + 1.6, ez + 0.766 * 1.8], target: [ex - 0.643 * 8, ey + 2.3, ez - 0.766 * 8], fov: 60 };

    this.setupStory({
      wisps: [
        { pos: [22, H(22, 6.5) + 1.6, 6.5], color: 0xe8421e, name: 'Vermilion', fact: 'The picture grew out of a walk at sunset with two friends, on a road above the fjord at Kristiania, today’s Oslo.' },
        { pos: [62, H(62, 34) + 2, 34], color: 0xf2a23a, name: 'Flame orange', fact: 'He lost his mother and his older sister to illness when he was young. He painted feelings rather than things.' },
        { pos: [TX, H(TX, TZ) + 1.7, TZ], color: 0xf2d27a, name: 'Lamplight straw', fact: 'He made four versions: two paintings and two drawings, and lithographs from 1895.' },
        { pos: [TX + 14, 2.9, -146], color: 0x3f62c8, name: 'Fjord blue', fact: 'Two versions were stolen, one in 1994 and one in 2004. Both came home.' },
        { pos: [-40, H(-40, -190) + 15, -190], color: 0x9a7ad8, name: 'Dusk violet', fact: 'In Nice, in the winter of 1892, he wrote the walk down as a poem in his diary.', high: true },
      ],
      memento: {
        pos: [-70, 40, -110],
        color: 0xfff0c8,
        model: pm,
        name: 'the page of his diary',
        text: 'The poem from Nice: “I felt a great, infinite scream pass through nature.”',
      },
      echo: {
        pos: [ex, ey, ez],
        ry: 0.86,
        color: 0xffc890,
        model: buildScreamer(strokes),
        name: 'Munch',
        greet: ['My friends walked on. I stood here, trembling. The sky had turned red as blood.', 'I wrote it down once, in Nice. The wind has the page now.'],
        thanks: ['Yes. These are the words.', 'I do not have to run from it. I can paint it.'],
      },
      exit: { pos: [E.x - nx * 1.2 + 7, H(E.x - nx * 1.2 + 7, E.z - nz * 1.2 + 2.5), E.z - nz * 1.2 + 2.5], ry: 1.2 },
    });
    this.finalFact = 'One version set an auction record in 2012. The image lives on as an emoji: 😱. Whatever you carry, you do not have to carry it alone.';
    this.finalLine = 'The last stroke: the sky, exactly as he felt it. And the feeling becomes something shared.';
    this.hints = {
      start: 'The road above the fjord. Follow the railing. Someone has stopped up ahead.',
      high: 'One colour is burning at the top of the lighthouse, out on the island. Hold Space to ride the wind.',
      memento: 'A page is turning over and over, high above the fjord.',
      echo: 'Carry the poem back to Munch, where he stopped on the road.',
    };
  }

  tick(dt, time, player, game) {
    // the world sways while the feeling is trapped, and settles once it is painted
    const calm = this.final;
    this.pillar.material.uniforms.uAmt.value = 0.55 * this.skyRestore;
    this.sky.uniforms.uCalm.value = calm;
    if (game && game.world === this) {
      G.uWobble.value = lerp(0.26, 0.03, calm) * (0.7 + 0.3 * Math.sin(time * 0.5));
      game.pipeline.mFinal.uniforms.uWarpAmt.value = lerp(1.0, 0.1, calm) * (0.6 + 0.4 * Math.sin(time * 0.37));
    }
  }
}
