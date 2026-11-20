import * as THREE from 'three';
import { World, ghostMaterial } from '../engine/world.js';
import { Sky } from '../engine/sky.js';
import { paintMaterial, waterMaterial, glowPoints, GroundMaps, G } from '../engine/paint.js';
import { Builder, terrain, ribbon, patch, gridGeo, mountainRing, blobTree, cypress, house, figure, tint, mix, jitter, xf } from '../engine/build.js';
import { rng, fbm, vnoise, smooth, clamp, lerp, damp } from '../engine/gl.js';
import { loadFigure } from '../engine/models.js';

// Leonardo's dream of Tuscany: every edge dissolved in haze. No lines, only
// smoke: sfumato.
// height of the terrace the workshop stands on: the hilltop exactly where she sits
const TERRACE = 3 + (fbm(2, 9, 3) - 0.5) * 9 + 26;

const SKY = /* glsl */ `
vec3 skyColor(vec3 dIn){
  vec3 d = normalize(vec3(dIn.x, abs(dIn.y) + 0.002, dIn.z));
  float h = d.y;
  vec3 hor = vec3(0.86, 0.84, 0.62), mid = vec3(0.56, 0.70, 0.66), zen = vec3(0.25, 0.42, 0.50);
  vec3 col = mix(hor, mid, smoothstep(0.0, 0.3, h));
  col = mix(col, zen, smoothstep(0.25, 0.95, h));
  vec3 q = d / (d.y + 0.4);
  float c1 = texture(uNoise3, vec3(q.x * 0.12 + uTime * 0.002, q.z * 0.12, 0.2)).r;
  float c2 = texture(uNoise3, vec3(q.x * 0.34, q.z * 0.34 + uTime * 0.003, 0.6)).g;
  float cl = smoothstep(0.42, 0.75, c1 * 0.65 + c2 * 0.35) * smoothstep(0.03, 0.3, h);
  col = mix(col, vec3(0.93, 0.90, 0.74), cl * 0.5);
  vec3 sk = uPaper * (0.99 - cl * 0.08);
  float m = paintedIn(d, c2);
  return mix(sk, col, m);
}
`;

// her face, twice: once before the last stroke, once after
function faceTexture(smile) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.translate(256, 256);
  g.scale(1.3, 1.3);
  g.translate(-256, -256);
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
  // sfumato: shadows with no edges
  soft(400, 270, 150, 240, '70,52,30', 0.42);
  soft(256, 130, 200, 60, '70,52,30', 0.25);
  soft(256, 440, 170, 60, '60,44,26', 0.35);
  for (const ex of [162, 346]) soft(ex, 208, 60, 34, '74,52,30', 0.42);
  for (const [ex, sh] of [[162, 5], [346, 8]]) {
    g.save();
    g.translate(ex, 214);
    g.beginPath();
    g.moveTo(-33, 3);
    g.quadraticCurveTo(-2, -15, 33, 1);
    g.quadraticCurveTo(2, 14, -33, 3);
    g.closePath();
    g.fillStyle = '#d9cfb6';
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = '#4a3418';
    g.beginPath();
    g.arc(-4 + sh, 0, 13.5, 0, 7);
    g.fill();
    g.fillStyle = '#16100a';
    g.beginPath();
    g.arc(-4 + sh, 0, 6.5, 0, 7);
    g.fill();
    g.restore();
    g.fillStyle = 'rgba(255,250,236,0.9)';
    g.beginPath();
    g.arc(-9 + sh, -4, 3, 0, 7);
    g.fill();
    // heavy upper lid
    g.strokeStyle = 'rgba(58,38,20,0.85)';
    g.lineWidth = 5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-36, 4);
    g.quadraticCurveTo(-2, -18, 36, 2);
    g.stroke();
    g.strokeStyle = 'rgba(96,70,44,0.5)';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(-38, -10);
    g.quadraticCurveTo(-2, -32, 38, -12);
    g.stroke();
    g.restore();
  }
  // long nose, told only by its shadow
  g.strokeStyle = 'rgba(84,60,36,0.42)';
  g.lineWidth = 9;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(278, 210);
  g.quadraticCurveTo(290, 270, 282, 306);
  g.stroke();
  soft(262, 314, 34, 13, '74,50,30', 0.45);
  soft(238, 286, 15, 22, '255,244,214', 0.26);
  // the mouth
  const lift = smile ? 9 : 1;
  g.fillStyle = '#9c5446';
  g.beginPath();
  g.moveTo(204, 362 - lift);
  g.quadraticCurveTo(232, 352, 254, 358);
  g.quadraticCurveTo(276, 352, 304, 362 - lift);
  g.quadraticCurveTo(254, 384, 204, 362 - lift);
  g.fill();
  g.strokeStyle = 'rgba(64,30,22,0.85)';
  g.lineWidth = 3.2;
  g.beginPath();
  g.moveTo(198 - (smile ? 6 : 0), 362 - lift * 1.5);
  g.quadraticCurveTo(254, 372, 310 + (smile ? 6 : 0), 362 - lift * 1.5);
  g.stroke();
  // the corners are lost in shadow: that is the whole trick
  soft(196, 360 - lift, 22, 16, '66,44,26', smile ? 0.6 : 0.45);
  soft(312, 360 - lift, 24, 16, '66,44,26', smile ? 0.62 : 0.5);
  if (smile) {
    soft(176, 330, 34, 22, '255,236,200', 0.2);
    soft(334, 330, 30, 22, '255,230,196', 0.14);
  }
  soft(254, 404, 44, 13, '70,50,30', 0.34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function buildLisa(strokes) {
  const mat = paintMaterial({ stroke: strokes.soft, scale: 2.6, contrast: 0.22, hueVar: 0.12, objSpace: 1, rim: 0.04, band: 0.36, warp: 0, big: 0, impasto: 0.02 });
  const skinMat = paintMaterial({ stroke: strokes.soft, scale: 2, contrast: 0.05, hueVar: 0.03, objSpace: 1, rim: 0.03, band: 0.46, warp: 0, big: 0, impasto: 0 });
  const part = (geo, col, m, mt = mat) => {
    const g = tint(geo, col);
    if (m) g.applyMatrix4(m);
    const mesh = new THREE.Mesh(g, mt);
    mesh.frustumCulled = false;
    return mesh;
  };
  const g = new THREE.Group();
  const skin = 0xe6c79a,
    dress = 0x2c3222,
    sleeve = 0x6a4a1e,
    hair = 0x24160e;
  // chair, lap, torso
  g.add(part(new THREE.BoxGeometry(0.62, 0.06, 0.5), 0x4a3220, xf(0, 0.45, -0.05)));
  g.add(part(new THREE.BoxGeometry(0.72, 0.05, 0.1), 0x5a3c24, xf(0, 0.72, 0.27)));
  g.add(part(new THREE.SphereGeometry(0.27, 18, 14), dress, xf(0, 0.5, 0.06, 0, 1.05, 0.5, 0.95)));
  g.add(part(new THREE.CylinderGeometry(0.165, 0.22, 0.5, 16), (x, y) => mix(dress, 0x3c4028, clamp(y * 2 + 0.5)), xf(0, 0.78, 0, 0, 1.15, 1, 0.8)));
  g.add(part(new THREE.SphereGeometry(0.2, 18, 14), dress, xf(0, 0.99, -0.01, 0, 1.22, 0.6, 0.78)));
  g.add(part(new THREE.SphereGeometry(0.15, 16, 12), skin, xf(0, 1.02, 0.07, 0, 1.1, 0.55, 0.55), skinMat)); // the open neckline
  g.add(part(new THREE.SphereGeometry(0.2, 16, 12), 0x1c2016, xf(-0.13, 0.97, -0.04, 0, 0.9, 0.5, 0.8, 0, 0.5))); // shawl over one shoulder
  // sleeves, hands folded right over left
  for (const sx of [-1, 1]) {
    g.add(part(new THREE.CylinderGeometry(0.085, 0.075, 0.36, 10), sleeve, xf(sx * 0.28, 0.83, 0.03, 0, 1, 1, 1, 0.25, sx * 0.14)));
    g.add(part(new THREE.CylinderGeometry(0.07, 0.055, 0.34, 10), (x, y) => mix(sleeve, 0x9a7430, clamp(y * 3 + 0.5)), xf(sx * 0.17, 0.75, 0.2, 0, 1, 1, 1, 1.25, sx * 0.75)));
  }
  g.add(part(new THREE.SphereGeometry(0.055, 12, 10), skin, xf(0.04, 0.77, 0.3, 0.3, 1.5, 0.6, 1.0), skinMat));
  g.add(part(new THREE.SphereGeometry(0.055, 12, 10), skin, xf(-0.03, 0.805, 0.31, -0.2, 1.6, 0.6, 1.0), skinMat));
  g.add(part(new THREE.CylinderGeometry(0.052, 0.066, 0.13, 14), skin, xf(0, 1.11, 0), skinMat));

  const head = new THREE.Group();
  head.position.set(0, 1.27, 0.01);
  head.scale.setScalar(1.14);
  g.add(head);
  const HS = [0.9, 1.17, 0.98];
  head.add(part(new THREE.SphereGeometry(0.105, 32, 24), skin, xf(0, 0, 0, 0, ...HS), skinMat));
  const mk = (smile) => {
    const fgeo = new THREE.SphereGeometry(0.1062, 32, 24, Math.PI / 2 - 0.9, 1.8, Math.PI / 2 - 0.8, 1.6);
    fgeo.applyMatrix4(xf(0, 0, 0, 0, 1, 1, 1, 0.22));
    fgeo.applyMatrix4(xf(0, 0, 0, 0, ...HS));
    const m = new THREE.Mesh(fgeo, new THREE.MeshBasicMaterial({ map: faceTexture(smile), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.renderOrder = 3;
    head.add(m);
    return m;
  };
  const plain = mk(false),
    smiling = mk(true);
  // dark hair parted in the middle, falling to the shoulders, under a thin veil
  head.add(part(new THREE.SphereGeometry(0.113, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, xf(0, 0.012, -0.012, 0, 0.95, 1.12, 1.03, -0.42)));
  for (const sx of [-1, 1]) head.add(part(new THREE.SphereGeometry(0.06, 12, 10), hair, xf(sx * 0.088, -0.1, -0.02, 0, 0.7, 2.3, 1.0, 0, sx * 0.08)));
  head.add(part(new THREE.SphereGeometry(0.1, 14, 10), 0x1c140e, xf(0, -0.08, -0.07, 0, 1.1, 1.6, 0.7)));
  return { group: g, head, plain, smiling };
}

// ================================================================ Leonardo's notebooks
// Everything buildNotebooks() puts in the valley is his own: machines from the
// codices built full size, and the settings of his other paintings.
const LEO = {
  vit: [36, 128], // the Vitruvian Man, laid out as a piazza
  horse: [-60, 94], // the clay colossus for Ludovico Sforza
  screw: [-112, 8], // the aerial screw
  garden: [-140, 60], // the Annunciation
  supper: [-52, -136], // the Last Supper
  tank: [70, 100], // the armoured car
  bow: [108, 146], // the giant crossbow
  grotto: [-28, -190], // the Virgin of the Rocks
  deskW: [-26, 5], // drawing tables on the hilltop
  deskE: [26, 4],
};
// the river between the bridge and the mill: s runs downstream, d inland from mid-stream on the west bank
const RIV = { ux: 42 / Math.hypot(42, 86), uz: 86 / Math.hypot(42, 86) };
const canalP = (s, d) => [62 + RIV.ux * s - RIV.uz * d, -120 + RIV.uz * s + RIV.ux * d];
const LEO_WAYS = [
  [[-33, 5], [-58, 8], [-86, 6], [-105.3, 8]], // hilltop desks -> aerial screw
  [[-116.5, 14.2], [-124, 36], [-129.6, 58]], // -> the Annunciation garden
  [[-10, 74], [-28, 84], [-42, 91], [-49.5, 94]], // -> the horse
  [[18, 104], [26, 110], [35.5, 115.4]], // -> the piazza
  [[18, 104], [40, 101], [63.5, 100]], // -> the armoured car
  [[75, 104], [88, 122], [99.3, 133.2]], // -> the crossbow
  [[-56, -102], [-54, -114], [-52, -127.4]], // -> the refectory
  [[-35, -99], [-24, -130], [-26, -160], [-28, -174.5]], // -> the grotto, stopping short of its pool
  [[34, -108], canalP(10, 30), canalP(34, 30), canalP(62, 30), [74, -41], [86, -31]], // towpath to the mill
];
const LEO_KEEP = [
  [36, 130, 21], [-60, 94, 13], [-112, 8, 10], [-140, 60, 21], [-52, -136, 21], [70, 100, 14], [108, 146, 26], [-28, -190, 16], [-26, 5, 10], [26, 4, 10],
  ...[12, 22, 32, 42, 52, 62, 70].map((s) => [...canalP(s, 22), 9]),
];
// true where one of the new things stands, so nothing else is planted there
function leoKeep(x, z) {
  for (const k of LEO_KEEP) if ((x - k[0]) ** 2 + (z - k[1]) ** 2 < k[2] * k[2]) return true;
  for (const w of LEO_WAYS)
    for (let i = 0; i < w.length - 1; i++) {
      const ax = w[i][0],
        az = w[i][1],
        bx = w[i + 1][0],
        bz = w[i + 1][1];
      const t = clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2));
      if (Math.hypot(x - ax - t * (bx - ax), z - az - t * (bz - az)) < 4) return true;
    }
  return false;
}

const _pd = new THREE.Vector3(),
  _px = new THREE.Vector3(),
  _pz = new THREE.Vector3(),
  _UP = new THREE.Vector3(0, 1, 0),
  _qc = new THREE.Color();
// a frame whose Y runs from a to b, with X kept level
function spanM(a, b) {
  _pd.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _pd.length() || 1e-4;
  _pd.divideScalar(len);
  _px.crossVectors(_pd, _UP);
  if (_px.lengthSq() < 1e-8) _px.set(1, 0, 0);
  else _px.normalize();
  _pz.crossVectors(_px, _pd);
  const m = new THREE.Matrix4().makeBasis(_px, _pd, _pz);
  m.setPosition((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return [m, len];
}
// a round pole from a to b (r at a, r2 at b)
function rod(B, a, b, r, col, seg = 5, r2 = r, data, M, capped = false) {
  const [m, len] = spanM(a, b);
  return B.add(new THREE.CylinderGeometry(r2, r, len, seg, 1, !capped), col, M ? M.clone().multiply(m) : m, data);
}
// a squared timber from a to b: w across (level), t through
function beam(B, a, b, w, t, col, data, M) {
  const [m, len] = spanM(a, b);
  return B.add(new THREE.BoxGeometry(w, len, t), col, M ? M.clone().multiply(m) : m, data);
}
// loose triangles, each with its own flat colour
class Quads {
  constructor() {
    this.v = [];
    this.c = [];
  }
  tri(a, b, c, col) {
    const k = col.isColor ? col : _qc.set(col);
    this.v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (let i = 0; i < 3; i++) this.c.push(k.r, k.g, k.b);
  }
  // counter-clockwise seen from the lit side
  quad(a, b, c, d, col, both = false) {
    this.tri(a, b, c, col);
    this.tri(a, c, d, col);
    if (both) {
      this.tri(a, c, b, col);
      this.tri(a, d, c, col);
    }
  }
  geometry(data = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.v, 3));
    g.computeVertexNormals();
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    const n = this.v.length / 3;
    const dat = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      dat[i * 4] = data.emissive ?? 0;
      dat[i * 4 + 1] = data.sway ?? 0;
      dat[i * 4 + 3] = 1;
    }
    g.setAttribute('aData', new THREE.BufferAttribute(dat, 4));
    this.v = [];
    this.c = [];
    return g;
  }
}
// a lumpy ball: rocks, olive crowns, clay
function lump(B, x, y, z, sx, sy, sz, seed, col, detail = 1, amp = 0.5, data, M, ry = seed) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const p = geo.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const px = p.getX(k),
      py = p.getY(k),
      pz = p.getZ(k);
    const m = 1 + (vnoise(px * 1.7 + seed, pz * 1.7 + py * 1.3 + seed * 0.37) - 0.5) * amp;
    p.setXYZ(k, px * m, py * m, pz * m);
  }
  geo.computeVertexNormals();
  const m = xf(x, y, z, ry, sx, sy, sz);
  return B.add(geo, col, M ? M.clone().multiply(m) : m, data);
}
// a leaning stack of rock, as in the backgrounds of his paintings
function spire(B, x, y, z, h, r, seed, lo, hi, topR = 0.3) {
  const geo = new THREE.CylinderGeometry(r * topR, r, h, 7, 4);
  const p = geo.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const t = p.getY(k) / h + 0.5;
    const a = Math.atan2(p.getZ(k), p.getX(k));
    const m = 1 + (vnoise(a * 1.9 + seed, t * 3.1 + seed) - 0.5) * 0.8;
    p.setX(k, p.getX(k) * m + Math.sin(t * 2.6 + seed) * r * 0.22 * t);
    p.setZ(k, p.getZ(k) * m + Math.cos(t * 2.1 + seed * 1.7) * r * 0.18 * t);
  }
  geo.computeVertexNormals();
  return B.add(geo, (px, py, pz) => mix(lo, hi, clamp(py / h + 0.5) * 0.75 + vnoise(px * 0.6 + seed, pz * 0.6 + py * 0.4) * 0.25), xf(x, y + h / 2, z));
}
// a cypress in few triangles
function flame(B, x, y, z, h, r, seed) {
  const rings = 6,
    seg = 7;
  const v = [],
    idx = [];
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;
    const prof = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85) * (1 - t * 0.25) + 0.02;
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * 6.283 + t * 2.4 + seed;
      const rr = r * prof * (1 + (vnoise(s * 1.7 + seed, k * 0.9) - 0.5) * 0.6);
      v.push(x + Math.cos(a) * rr + Math.sin(t * 3 + seed) * r * 0.2 * t, y + t * h, z + Math.sin(a) * rr);
    }
  }
  for (let k = 0; k < rings; k++)
    for (let s = 0; s < seg; s++) {
      const a = k * seg + s,
        b = k * seg + ((s + 1) % seg),
        c = a + seg,
        d = b + seg;
      idx.push(a, c, b, b, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  B.parts.push(
    tint(
      g,
      (px, py, pz) => {
        const n = vnoise(px * 0.9 + pz * 0.7, py * 0.35);
        return mix(0x1a2a1a, n > 0.72 ? 0x5a5a2a : 0x3a5a34, n);
      },
      { sway: (px, py) => Math.pow(clamp((py - y) / h), 2) * 0.3 }
    )
  );
}
// the side of a cone or drum, one flat colour per stave (y1 above y0)
function shell(B, r0, y0, r1, y1, n, colFn, M) {
  const g = gridGeo(1, n, (u, v) => [Math.cos(v * 6.2832) * lerp(r0, r1, u), lerp(y0, y1, u), Math.sin(v * 6.2832) * lerp(r0, r1, u)], (u, v, i, j) => colFn(j));
  if (M) g.applyMatrix4(M);
  B.parts.push(g);
}
// a flat ring of boards, facing up
function disc(B, r0, r1, y, n, colFn, M) {
  const g = gridGeo(1, n, (u, v) => [Math.cos(-v * 6.2832) * lerp(r0, r1, u), y, Math.sin(-v * 6.2832) * lerp(r0, r1, u)], (u, v, i, j) => colFn(j));
  if (M) g.applyMatrix4(M);
  B.parts.push(g);
}
// a robed figure that can stand, sit or kneel and gesture. Faces +z; hands are [right, left], measured from each shoulder.
function person(B, M, o = {}) {
  const robe = o.robe ?? 0x6a4a3a,
    mantle = o.mantle,
    skin = o.skin ?? 0xdcb48e,
    hair = o.hair ?? 0x3a2a1c;
  const pose = o.pose ?? 'stand';
  const hip = pose === 'sit' ? 0.5 : pose === 'kneel' ? 0.42 : 0.88;
  if (pose === 'sit') {
    B.box(0.5, 0.2, 0.56, mantle ?? robe, 0, hip - 0.14, 0.22, 0, undefined, M);
    B.box(0.46, hip - 0.1, 0.2, mantle ?? robe, 0, 0, 0.42, 0, undefined, M);
  } else if (pose === 'kneel') {
    B.cyl(0.24, 0.52, hip, mantle ?? robe, 0, 0, -0.14, 7, undefined, M);
    B.box(0.44, 0.22, 0.52, robe, 0, 0.02, 0.14, 0, undefined, M);
  } else B.cyl(0.2, 0.4, hip + 0.06, robe, 0, 0, 0, 7, undefined, M);
  // everything above the hips leans and turns together
  const U = M.clone().multiply(xf(0, hip, 0, o.turn ?? 0, 1, 1, 1, o.lean ?? 0, o.tilt ?? 0));
  B.cyl(0.19, 0.24, 0.6, robe, 0, -0.06, 0, 7, undefined, U);
  B.ball(0.21, mantle ?? robe, 0, 0.54, 0, 1.08, 0.5, 0.8, 1, undefined, U);
  if (mantle) B.ball(0.24, mantle, -0.1, 0.36, -0.06, 0.9, 1.1, 0.75, 1, undefined, U);
  B.cyl(0.06, 0.07, 0.14, skin, 0, 0.6, 0, 5, undefined, U);
  const HM = U.clone().multiply(xf(0, 0.84, 0.01, o.look ?? 0, 1, 1, 1, o.nod ?? 0, o.cock ?? 0));
  B.ball(0.18, skin, 0, 0, 0, 1, 1.1, 1, 1, undefined, HM);
  if (o.hair !== null) B.ball(0.19, hair, 0, 0.045, -0.04, 1.02, 1, 1, 1, undefined, HM);
  if (o.longHair) B.ball(0.17, hair, 0, -0.14, -0.1, 1.15, 1.5, 0.6, 1, undefined, HM);
  if (o.beard) B.ball(0.11, o.beard === true ? hair : o.beard, 0, -0.15, 0.1, 1, 1.2, 0.7, 0, undefined, HM);
  if (o.veil) B.ball(0.215, o.veil, 0, 0.03, -0.045, 1.06, 1.06, 1.06, 1, undefined, HM);
  const hands = o.hands ?? [[-0.08, -0.5, 0.12], [0.08, -0.5, 0.12]];
  [-1, 1].forEach((sx, i) => {
    const sh = [sx * 0.25, 0.5, 0],
      h = hands[i];
    const hp = [sh[0] + h[0], sh[1] + h[1], sh[2] + h[2]];
    const el = [(sh[0] + hp[0]) / 2 + sx * 0.06, (sh[1] + hp[1]) / 2 - 0.1, (sh[2] + hp[2]) / 2 - 0.04];
    rod(B, sh, el, 0.075, o.sleeve ?? robe, 5, 0.065, undefined, U);
    rod(B, el, hp, 0.065, o.sleeve ?? robe, 5, 0.05, undefined, U);
    B.ball(0.06, skin, hp[0], hp[1], hp[2], 1, 1, 1, 0, undefined, U);
  });
  return U;
}
// two feathered wings on a figure's back (U is the frame person() returns)
function wings(B, U, s = 1) {
  for (const sx of [-1, 1])
    B.add(new THREE.IcosahedronGeometry(1, 1), (x, y) => mix(0xdccdaa, 0x6a4c32, clamp(y * 0.6 + 0.45)), U.clone().multiply(xf(sx * 0.2, 0.72 * s + 0.1, -0.42 * s, sx * 0.35, 0.09 * s, 0.82 * s, 0.3 * s, -0.5, 0)));
}

export class MonaWorld extends World {
  constructor(ctx) {
    super(ctx);
    this.id = 'mona';
    this.index = 4;
    this.kicker = 'V · Florence, about 1503';
    this.title = 'Mona Lisa';
    this.sub = 'Leonardo da Vinci';
    this.aspect = 53 / 77;
    this.extent = 280;
    this.boundary = 270;
    this.center = { x: 0, z: -80 };
    this.ceiling = 120;
    this.waterY = 0.6;
    this.env = {
      sunDir: new THREE.Vector3(-0.5, 0.55, 0.6),
      sunColor: 0xa89a66,
      skyColor: 0x8a9a86,
      groundColor: 0x4a4a34,
      fogColor: 0xa8b08a,
      fog: [0.0052, 2, 0.012, 0.9],
      paper: 0xeee6cf,
      ink: 0x40382c,
      rim: 0xffe9a0,
      lamp: 1.0,
      sway: 0.16,
    };
    this.style = { kuwahara: 2.4, bloom: 0.45, threshold: 1.0, soft: 0.24, grain: 0.07, crackle: 0.12, saturation: 0.94, contrast: 1.07, vignette: 0.95, tint: [1.03, 1.0, 0.86], lift: [0.01, 0.012, 0.0], outline: 0.0, sketchLine: 0.45, ink: 0x2a2218 };
    this.spawn = { pos: [0, 31], yaw: Math.PI };
    this.view = { pos: [0.1, 27.3, -0.5], target: [-0.02, 27.14, -3.3], fov: 34 };
    this._viewRel = { pos: [0.08, 1.07, 1.95], target: [0, 1.02, 0], fov: 27 };
    this.music = 'mona';
    this.smile = 1;
    this.pullBack = 4.5;
    this.pullUp = 0.6;
    // the generated figure faces +X; turn her to the room, a little to her right as in the portrait
    this.modelYaw = -Math.PI / 2 - 0.25;
    this.build();
  }

  riverPath() {
    return [[20, -330], [44, -230], [62, -120], [104, -34], [190, 30], [300, 60]];
  }
  heightAt(x, z) {
    const r0 = Math.hypot(x, z);
    let h = 3 + (fbm(x * 0.012 + 2, z * 0.012 + 9, 3) - 0.5) * 9;
    h += 26 * (1 - smooth(36, 84, r0)); // the hill the workshop stands on
    // the workshop and its loggia stand on a levelled terrace, so the tiled floor is the floor
    const pad = Math.max(Math.abs(x) - 12.5, Math.abs(z - 7.2) - 19, 0);
    if (pad < 12) h = lerp(TERRACE, h, smooth(0, 12, pad));
    h = Math.max(h, 3 + 21 * (1 - smooth(24, 58, Math.hypot(x + 130, z + 150)))); // the hill town
    const cr = Math.hypot(x - 122, z + 44);
    h = Math.max(h, 62 * (1 - smooth(9, 40, cr)) + 3); // the launching crag
    // river and the lake it runs from
    const p = this.riverPath();
    let dmin = 1e9;
    for (let i = 0; i < p.length - 1; i++) {
      const ax = p[i][0],
        az = p[i][1],
        bx = p[i + 1][0],
        bz = p[i + 1][1];
      const t = clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2));
      dmin = Math.min(dmin, Math.hypot(x - ax - t * (bx - ax), z - az - t * (bz - az)));
    }
    const lake = Math.hypot((x + 70) / 1.5, z + 250);
    const wet = Math.min(smooth(7, 22, dmin), smooth(48, 70, lake));
    h = lerp(-2.6, h, wet);
    h += smooth(240, 420, r0) * 40;
    return h;
  }

  build() {
    const { strokes, noise3 } = this.ctx;
    const R = rng(1503);
    const S = this.scene;
    const H = (x, z) => this.heightAt(x, z);
    const maps = (this.maps = new GroundMaps(this.extent, H));
    this.sky = new Sky({ body: SKY, noise3 });
    S.add(this.sky.mesh);
    const soft = (o = {}) => paintMaterial({ stroke: strokes.soft, scale: 0.14, contrast: 0.17, hueVar: 0.14, warp: 0.4, impasto: 0.03, rim: 0.06, band: 0.34, big: 0.35, ...o });

    // ---------------- land: umber and olive, cooling to blue-green with distance
    const groundCol = (x, z, y) => {
      const n = vnoise(x * 0.025, z * 0.025);
      const c = mix(0x5a5a2c, 0x8a7a3c, n);
      c.lerp(new THREE.Color(0x3f5a3a), smooth(0.5, 0.85, vnoise(x * 0.01 + 7, z * 0.01)) * 0.7);
      if (y < 1.6) c.lerp(new THREE.Color(0x7a6a4a), 0.6);
      c.lerp(new THREE.Color(0x4a6a6a), smooth(160, 380, Math.hypot(x, z)) * 0.7);
      if (y > 30 && Math.hypot(x - 122, z + 44) < 60) c.lerp(new THREE.Color(0x6a6658), 0.8);
      return c;
    };
    S.add(new THREE.Mesh(terrain(H, 520, 250, groundCol, 0.7, 2.2, 0, -80), soft({ stroke: strokes.dab, scale: 0.12, contrast: 0.3, hueVar: 0.25, big: 0.7 })));

    const wg = new THREE.PlaneGeometry(1600, 1600, 40, 40);
    wg.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(wg, waterMaterial({ stroke: strokes.soft, deep: 0x2f4a44, shallow: 0x5f8a7a, reflect: 0xb8c49a, glint: 0xfff0c0, scale: 0.05, glintAmt: 0.8, flow: 0.004 }));
    water.position.set(0, this.waterY, -80);
    S.add(water);

    // ---------------- roads that wind the way his do
    const roadA = [[-12, -10], [-30, -34], [-12, -66], [-36, -98], [-72, -104], [-98, -128], [-118, -144]];
    const roadB = [[-12, -66], [20, -98], [44, -116], [80, -122], [104, -108], [116, -72], [120, -56]];
    const roadC = [[0, 24], [2, 46], [-10, 74], [18, 104]];
    const RB = new Builder();
    const dust = (x, y, z) => mix(0xb09a6a, 0xd0b888, vnoise(x * 0.3, z * 0.3));
    for (const r of [roadA, roadC]) RB.parts.push(ribbon(r, 4.4, H, dust, { lift: 0.14, across: 4 }));
    RB.parts.push(ribbon(roadB.slice(0, 3), 4.2, H, dust, { lift: 0.14, across: 4 }));
    RB.parts.push(ribbon(roadB.slice(3), 4.2, H, dust, { lift: 0.14, across: 4 }));
    S.add(RB.mesh(soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.36 })));
    const roadSamples = [];
    for (const r of [roadA, roadB, roadC]) {
      const c = new THREE.CatmullRomCurve3(r.map((p) => new THREE.Vector3(p[0], 0, p[1])));
      for (const p of c.getSpacedPoints(60)) roadSamples.push([p.x, p.z]);
    }
    const nearRoad = (x, z, d = 5) => roadSamples.some((s) => (s[0] - x) ** 2 + (s[1] - z) ** 2 < d * d);

    const B = new Builder();
    const proxy = { heightAt: H, colliders: this.colliders, maps, glows: this.glows };
    const STONE = 0xb8aa88;
    const stoneC = (x, y, z) => mix(0xa89a78, 0xcdbf9c, vnoise(x * 0.9 + z, y * 0.9));

    // ---------------- the loggia where she sits
    const LY = H(0, 0);
    {
      for (let i = -5; i <= 5; i++) for (let j = -4; j <= 5; j++) B.box(1.5, 0.3, 1.5, (i + j) & 1 ? 0x9a8a68 : 0xc6b892, i * 1.5, LY - 0.26, j * 1.5 - 0.6);
      // parapet behind her, with the two column bases the portrait just shows
      B.box(16.5, 0.95, 0.5, stoneC, 0, LY, -7.6);
      B.box(17, 0.16, 0.8, STONE, 0, LY + 0.95, -7.6);
      this.colliders.push({ x: 0, z: -7.6, hw: 8.3, hd: 0.4, ry: 0, top: LY + 1.2 });
      for (const sx of [-1, 1]) {
        B.cyl(0.36, 0.42, 4.6, stoneC, sx * 2.25, LY + 1.1, -7.6, 14);
        B.cyl(0.52, 0.56, 0.3, STONE, sx * 2.25, LY + 1.1, -7.6, 14);
        B.box(1.1, 0.3, 1.1, STONE, sx * 2.25, LY + 5.7, -7.6);
        for (const ox of [5.2, 8.1]) B.cyl(0.3, 0.36, 4.6, stoneC, sx * ox, LY + 1.1, -7.6, 12);
        this.colliders.push({ x: sx * 2.25, z: -7.6, r: 0.5, top: LY + 6 });
      }
      B.box(17.4, 0.7, 1.2, stoneC, 0, LY + 6.0, -7.6);
      // pergola over the working end
      for (const [px, pz] of [[-7.6, 6.6], [7.6, 6.6], [-7.6, -0.5], [7.6, -0.5]]) B.cyl(0.24, 0.28, 5.9, stoneC, px, LY, pz, 10);
      for (let x = -8; x <= 8; x += 1.6) B.box(0.22, 0.26, 15.2, 0x5a4026, x, LY + 6.4, -0.5);
      // the bottega: a long stone room that opens onto the loggia
      const WZ0 = -0.6,
        WZ1 = 22,
        WH = 6.6;
      for (let i = -5; i <= 5; i++) for (let j = 6; j <= 15; j++) B.box(1.5, 0.3, 1.5, (i + j) & 1 ? 0x8a7a5a : 0xb8a880, i * 1.5, LY - 0.26, j * 1.5 - 0.6);
      const plaster = (x, y) => mix(0xcdbf9c, 0xa8966e, clamp(0.45 - y * 0.08));
      for (const sx of [-1, 1]) {
        B.box(0.6, WH, WZ1 - WZ0, plaster, sx * 8.6, LY, (WZ0 + WZ1) / 2);
        this.colliders.push({ x: sx * 8.6, z: (WZ0 + WZ1) / 2, hw: 0.4, hd: (WZ1 - WZ0) / 2, ry: 0, top: LY + WH + 4 });
        // tall windows down each side
        for (const wz of [4, 10, 16]) {
          B.box(0.1, 3.0, 1.6, 0xffe6a8, sx * 8.26, LY + 1.6, wz, 0, { emissive: 0.8 });
          B.box(0.14, 3.0, 0.08, 0x5a4026, sx * 8.2, LY + 1.6, wz);
          B.box(0.14, 0.08, 1.6, 0x5a4026, sx * 8.2, LY + 3.1, wz);
          maps.lamp(sx * 5.6, wz, 4.5, 0xffe0a0, 0.6);
        }
        // the doorway at the south end
        B.box(6.6, WH, 0.6, plaster, sx * 5.5, LY, WZ1);
        this.colliders.push({ x: sx * 5.5, z: WZ1, hw: 3.3, hd: 0.4, ry: 0, top: LY + WH + 4 });
      }
      B.box(4.6, WH - 4.2, 0.6, plaster, 0, LY + 4.2, WZ1);
      B.box(5.0, 0.4, 0.9, 0x5a4026, 0, LY + 4.0, WZ1);
      // roof: beams you see from inside, tiles from outside
      for (let z = WZ0 + 1; z < WZ1; z += 2.4) B.box(17.4, 0.4, 0.34, 0x4a3420, 0, LY + WH - 0.4, z);
      B.box(17.6, 0.25, WZ1 - WZ0 + 0.6, 0x3a2a1c, 0, LY + WH, (WZ0 + WZ1) / 2);
      B.gable(19.4, WZ1 - WZ0 + 1.6, 3.6, 0xa8582e, 0, LY + WH + 0.25, (WZ0 + WZ1) / 2, 0);
      this.rooms.push({ minx: -8.1, maxx: 8.1, minz: WZ0 + 0.2, maxz: WZ1 - 0.5, ceil: LY + WH - 0.7 });
      this.colliders.push({ x: 0, z: (WZ0 + WZ1) / 2, hw: 9.2, hd: (WZ1 - WZ0) / 2 + 0.6, ry: 0, top: LY + WH + 4.5, bottom: LY + WH + 0.3 });
      // more of his distractions: shelves, a great wing hung from the beams, the aerial screw
      for (const [tx, tz] of [[-6.2, 11], [6.2, 12], [-6.2, 17.5], [6.2, 18]]) {
        B.box(2.6, 0.12, 1.2, 0x7a5a36, tx, LY + 0.85, tz);
        for (const [ox, oz] of [[-1.1, -0.45], [1.1, -0.45], [-1.1, 0.45], [1.1, 0.45]]) B.box(0.12, 0.85, 0.12, 0x5a4026, tx + ox, LY, tz + oz);
        this.colliders.push({ x: tx, z: tz, hw: 1.35, hd: 0.65, ry: 0, top: LY + 1.1 });
        for (let k = 0; k < 3; k++) B.box(0.5, 0.02, 0.36, 0xe8dcc0, tx - 0.8 + k * 0.7, LY + 0.97, tz + (R() - 0.5) * 0.4, R());
        B.ball(0.16, [0x2f5fd0, 0xb0362e, 0xd9a83a, 0x3a8a5a][(R() * 4) | 0], tx + 0.9, LY + 1.1, tz, 1, 1, 1, 1);
      }
      for (const sx of [-1, 1]) for (const sy of [1.6, 2.5, 3.4]) {
        B.box(0.4, 0.06, 3.2, 0x5a4026, sx * 8.05, LY + sy, 7);
        for (let k = 0; k < 5; k++) B.box(0.26, 0.34 + R() * 0.2, 0.2, [0x7a2f2a, 0x2f4a6a, 0x5a5a2a, 0x8a6a3a][(R() * 4) | 0], sx * 8.0, LY + sy + 0.06, 5.8 + k * 0.6);
      }
      for (const sx of [-1, 1]) {
        for (let k = 0; k < 6; k++) B.box(4.2 - k * 0.3, 0.05, 0.06, 0x5a4026, sx * (2.3 - k * 0.1), LY + 5.0, 12.4 + k * 0.5, sx * 0.12);
        B.box(4.0, 0.02, 3.0, 0xe6dcc0, sx * 2.2, LY + 4.97, 13.6, sx * 0.12);
      }
      B.box(0.4, 0.3, 3.4, 0x7a5a36, 0, LY + 4.9, 13.6);
      for (const cx of [-1.4, 1.4]) B.cyl(0.015, 0.015, 1.3, 0x3a2a1c, cx, LY + 5.0, 13.6, 3);
      B.cyl(0.06, 0.06, 2.4, 0x5a4026, -6.6, LY, 3.2, 6);
      for (let k = 0; k < 14; k++) B.box(1.5 - k * 0.09, 0.03, 0.5, 0xe6dcc0, -6.6, LY + 1.0 + k * 0.1, 3.2, k * 0.5);
      // easel with the panel, and the stool he never sits on
      for (const [ox, rz] of [[-0.42, 0.13], [0.42, -0.13]]) B.cyl(0.04, 0.04, 2.3, 0x6a4a2a, 2.7 + ox, LY, -1.0, 5, undefined, undefined, 0, rz);
      B.cyl(0.04, 0.04, 2.3, 0x6a4a2a, 3.0, LY, -0.4, 5, undefined, undefined, 0.3, 0);
      B.box(0.06, 1.25, 0.86, 0x2c2a1c, 2.68, LY + 0.85, -1.0, -0.5);
      B.box(0.05, 1.1, 0.72, (x, y) => mix(0x3a3a24, 0xb8a878, clamp(0.5 - Math.abs(y) * 1.4)), 2.63, LY + 0.92, -1.02, -0.5, { emissive: 0.12 });
      B.cyl(0.26, 0.3, 0.55, 0x5a4026, 3.6, LY, 0.3, 8);
      // workbenches covered in his distractions
      for (const [tx, tz] of [[-5.4, 3.6], [5.2, 4.2], [-5.6, -2.2]]) {
        B.box(3.0, 0.12, 1.3, 0x7a5a36, tx, LY + 0.85, tz);
        for (const [ox, oz] of [[-1.3, -0.5], [1.3, -0.5], [-1.3, 0.5], [1.3, 0.5]]) B.box(0.12, 0.85, 0.12, 0x5a4026, tx + ox, LY, tz + oz);
        this.colliders.push({ x: tx, z: tz, hw: 1.55, hd: 0.7, ry: 0, top: LY + 1.1 });
        for (let k = 0; k < 4; k++) B.box(0.5, 0.02, 0.36, 0xe8dcc0, tx - 1 + k * 0.62, LY + 0.97, tz + (R() - 0.5) * 0.5, R());
      }
      // gears, a model wing, a mirror
      B.cyl(0.7, 0.7, 0.12, 0x8a6a3a, -5.4, LY + 0.98, 3.6, 12);
      for (let k = 0; k < 12; k++) B.box(0.16, 0.12, 0.2, 0x8a6a3a, -5.4 + Math.cos((k / 12) * 6.283) * 0.76, LY + 0.98, 3.6 + Math.sin((k / 12) * 6.283) * 0.76, -(k / 12) * 6.283);
      B.cyl(0.36, 0.36, 0.12, 0xa07a40, -4.5, LY + 1.0, 3.9, 10);
      B.cyl(0.5, 0.5, 0.05, 0xc9d6d0, 5.6, LY + 1.5, 4.2, 20, { emissive: 0.5 }, undefined, 1.3, 0);
      B.box(0.08, 0.6, 0.08, 0x5a4026, 5.6, LY + 0.97, 4.2);
      this.mirror = [5.6, LY + 1.5, 4.2];
    }

    // ---------------- the bridge with its row of arches
    {
      const bx0 = 40,
        bx1 = 86,
        bz = -120,
        deck = 6.4;
      B.box(bx1 - bx0, 0.7, 4.6, stoneC, (bx0 + bx1) / 2, deck - 0.7, bz);
      for (const sz of [-1, 1]) B.box(bx1 - bx0, 0.7, 0.4, stoneC, (bx0 + bx1) / 2, deck, bz + sz * 2.3);
      const n = 5,
        span = (bx1 - bx0) / n;
      for (let i = 0; i <= n; i++) B.box(1.5, deck + 2, 5.2, stoneC, bx0 + i * span, -2.6, bz);
      for (let i = 0; i < n; i++)
        for (let k = 0; k <= 10; k++) {
          const a = (k / 10) * Math.PI;
          const r = span / 2 - 0.5;
          B.box(1.2, 0.9, 4.8, stoneC, bx0 + (i + 0.5) * span + Math.cos(a) * r, 0.4 + Math.sin(a) * (deck - 2.2), bz, 0, undefined, xf(0, 0, 0, 0, 1, 1, 1, 0, 0));
        }
      this.platforms = [{ minx: bx0 - 2, maxx: bx1 + 2, minz: bz - 2.2, maxz: bz + 2.2, y: deck }];
      for (const sz of [-1, 1]) this.colliders.push({ x: (bx0 + bx1) / 2, z: bz + sz * 2.35, hw: (bx1 - bx0) / 2, hd: 0.22, ry: 0, top: deck + 0.9, bottom: deck - 1.2 });
    }

    // ---------------- the hill town of towers
    const TX = -130,
      TZ = -150;
    const TUSC = [0xc9a878, 0xb89868, 0xd9b888, 0xa88858, 0xcdb08a];
    for (let i = 0; i < 22; i++) {
      const a = R() * 6.283,
        d = 5 + R() * 20;
      const x = TX + Math.cos(a) * d,
        z = TZ + Math.sin(a) * d;
      const tower = i < 7;
      house(B, proxy, {
        R, x, z, ry: R() * 6.283, w: tower ? 3.6 + R() : 6 + R() * 3, d: tower ? 3.6 + R() : 5.5 + R() * 2, h: tower ? 16 + R() * 14 : 5 + R() * 3,
        roofType: tower ? 'flat' : 'gable', roofH: 2, over: 0.3, wall: jitter(TUSC[(R() * TUSC.length) | 0], R, 0.05), roof: 0xa8582e, trim: 0x6a5238, lit: 0.35, winW: 0.7, winH: 1.2, chimney: false, mullion: false,
      });
    }
    for (let k = 0; k < 44; k++) {
      const a = (k / 44) * 6.283;
      const x = TX + Math.cos(a) * 28,
        z = TZ + Math.sin(a) * 28;
      if (nearRoad(x, z, 4)) continue;
      B.box(4.2, 3.6, 0.8, stoneC, x, H(x, z) - 0.6, z, -a + Math.PI / 2);
      this.colliders.push({ x, z, r: 1.6, top: H(x, z) + 3 });
    }
    // water mill on the river, wheel turning
    {
      const mx = 96,
        mz = -34;
      house(B, proxy, { R, x: mx - 9, z: mz - 4, w: 8, d: 7, h: 6, wall: 0xc9a878, roof: 0xa8582e, trim: 0x6a5238, lit: 0.5, roofH: 3 });
      const wheel = new Builder();
      wheel.add(new THREE.TorusGeometry(3.4, 0.22, 6, 24), 0x5a4026, null);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * 6.283;
        wheel.box(0.14, 3.4, 0.14, 0x6a4a2a, 0, 0, 0, 0, undefined, xf(0, 0, 0, 0, 1, 1, 1, 0, a));
        wheel.box(1.0, 0.1, 1.3, 0x7a5a36, 0, 3.3, 0, 0, undefined, xf(0, 0, 0, 0, 1, 1, 1, 0, a));
      }
      this.wheel = wheel.mesh(soft({ objSpace: 1, scale: 0.6 }));
      this.wheel.position.set(mx - 3.6, 2.6, mz - 4);
      this.wheel.rotation.y = Math.PI / 2;
      S.add(this.wheel);
    }
    // the flying machine waits on the crag
    const CX = 122,
      CZ = -44,
      CY = H(CX, CZ);
    {
      B.box(9, 0.3, 4, 0x7a5a36, CX, CY + 0.1, CZ);
      for (const [ox, oz] of [[-4, -1.6], [4, -1.6], [-4, 1.6], [4, 1.6]]) B.box(0.25, 1.2, 0.25, 0x5a4026, CX + ox, CY - 0.9, CZ + oz);
      const fm = new Builder();
      fm.box(0.5, 0.4, 3.4, 0x7a5a36, 0, 0, 0);
      for (const sx of [-1, 1])
        for (let k = 0; k < 5; k++) {
          const M = xf(sx * 0.3, 0.3, -0.9 + k * 0.5, 0, 1, 1, 1, 0, -sx * (0.25 + k * 0.02));
          fm.box(5.4 - k * 0.5, 0.06, 0.07, 0x5a4026, sx * (2.7 - k * 0.25), 0, 0, 0, undefined, M);
          fm.box(5.0 - k * 0.5, 0.02, 0.5, 0xe6dcc0, sx * (2.7 - k * 0.25), -0.02, 0.25, 0, { sway: 0.05 }, M);
        }
      fm.box(1.6, 0.03, 1.6, 0xe6dcc0, 0, 0.25, -2.2, Math.PI / 4);
      this.machine = fm.mesh(soft({ objSpace: 1, scale: 0.7 }));
      this.machine.position.set(CX, CY + 1.9, CZ);
      this.machine.rotation.y = -0.6;
      S.add(this.machine);
      this.crag = [CX, CY, CZ];
    }
    S.add(B.mesh(soft({ scale: 0.3, emissive: 1.5, big: 0.25, hueVar: 0.05, contrast: 0.14 })));

    // two more of them already out over the valley
    this.flyers = [0, 1].map((i) => {
      const fm = new Builder();
      fm.box(0.4, 0.3, 2.6, 0x7a5a36, 0, 0, 0);
      for (const sx of [-1, 1]) fm.add(new THREE.BoxGeometry(4.6, 0.04, 1.7), 0xe6dcc0, xf(sx * 2.4, 0.5, 0, 0, 1, 1, 1, 0, sx * 0.22));
      const m = fm.mesh(soft({ objSpace: 1, scale: 0.7 }));
      S.add(m);
      return { m, r: 90 + i * 70, y: 52 + i * 16, sp: 0.09 - i * 0.03, ph: i * 2.4, cx: 20 - i * 60, cz: -130 };
    });

    // ---------------- cypress avenues, olives, vineyards, the far rocks
    const T = new Builder();
    for (const [i, s] of roadSamples.entries()) {
      if (i % 3 || Math.hypot(s[0], s[1]) < 14) continue;
      const side = i % 6 ? 1 : -1;
      const x = s[0] + side * (4 + R()),
        z = s[1] + side * (2 + R());
      const y = H(x, z);
      if (y < 1.4 || nearRoad(x, z, 2.6) || Math.hypot(x - TX, z - TZ) < 30) continue;
      const hh = 8 + R() * 6;
      cypress(T, x, y - 0.4, z, hh, 1.1 + R() * 0.5, R, { dark: 0x1a2a1a, mid: 0x3a5a34, warm: 0x5a5a2a, sway: 0.3 });
      this.colliders.push({ x, z, r: 0.7, top: y + hh * 0.6 });
      maps.blob(x, z, 3, 0.35);
    }
    const VOID = new Builder();
    let n = 0,
      guard = 0;
    while (n < 150 && guard++ < 4000) {
      const x = (R() - 0.5) * 560,
        z = -80 + (R() - 0.5) * 560;
      const y = H(x, z);
      if (y < 1.6 || nearRoad(x, z, 5) || Math.hypot(x, z) < 20 || Math.hypot(x - TX, z - TZ) < 30 || y > 40) continue;
      const r = 2.4 + R() * 2.4;
      // where the notebooks now stand the same numbers are drawn, but nothing is planted
      const taken = leoKeep(x, z);
      blobTree(taken ? VOID : T, x, y, z, r * 1.6, r, R, { lo: 0x34482a, hi: 0x8a9a52, trunk: 0x3a2c1c, blobs: 3 });
      VOID.parts.length = 0;
      n++;
      if (taken) continue;
      if (Math.hypot(x, z + 80) < 180) this.colliders.push({ x, z, r: 0.5, top: y + 3 });
      maps.blob(x, z, r * 1.4, 0.35);
    }
    // vineyards in rows on the near slopes
    for (const [vx, vz, ry] of [[-52, -30, 0.3], [46, -36, -0.4], [-30, 44, 1.2], [58, 40, 0.8], [-90, -60, 0.1]])
      for (let r = 0; r < 9; r++)
        for (let k = 0; k < 12; k++) {
          const lx = (k - 6) * 2.4,
            lz = (r - 4) * 3;
          const x = vx + lx * Math.cos(ry) + lz * Math.sin(ry),
            z = vz - lx * Math.sin(ry) + lz * Math.cos(ry);
          const y = H(x, z);
          if (y < 1.6 || nearRoad(x, z, 3)) continue;
          T.ball(1.0, mix(0x4a6a2a, 0x9aa83a, R()), x, y + 0.6, z, 1.25, 0.75, 0.7, 0, { sway: 0.08 });
        }
    S.add(T.mesh(soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.5, hueVar: 0.4, rim: 0.2 })));

    // the fantastical rocks of his backgrounds
    const RK = new Builder();
    for (let i = 0; i < 46; i++) {
      const a = R() * 6.283,
        d = 190 + R() * 280;
      const x = Math.cos(a) * d,
        z = -80 + Math.sin(a) * d;
      const hh = 40 + R() * 110,
        rr = 8 + R() * 16;
      const geo = new THREE.CylinderGeometry(rr * 0.12, rr, hh, 6, 5);
      const p = geo.attributes.position;
      const sd = R() * 90;
      for (let k = 0; k < p.count; k++) {
        const t = p.getY(k) / hh + 0.5;
        p.setX(k, p.getX(k) * (1 + (vnoise(p.getY(k) * 0.08 + sd, k * 0.7) - 0.5) * 0.9) + Math.sin(t * 3 + sd) * rr * 0.25 * t);
        p.setZ(k, p.getZ(k) * (1 + (vnoise(p.getY(k) * 0.08 + sd + 9, k * 0.3) - 0.5) * 0.9));
      }
      geo.computeVertexNormals();
      RK.add(geo, (px, py) => mix(0x4a5a52, 0x8aa09a, clamp(py / hh + 0.5)), xf(x, H(x, z) + hh / 2 - 4, z));
    }
    S.add(RK.mesh(soft({ scale: 0.03, contrast: 0.5, rim: 0, big: 0.4, wallStretch: 0.5 })));
    const far = mountainRing({
      radius: 560,
      base: -6,
      profile: (a) => 60 + Math.abs(Math.sin(a * 9)) * 70 + Math.abs(Math.sin(a * 23 + 1)) * 40 + fbm(a * 5, 3, 3) * 60,
      colorFn: (x, y) => mix(0x4a6266, 0x9ab4b0, clamp(y / 200)),
      seg: 260,
      depth: 120,
    });
    const fmesh = new THREE.Mesh(far, soft({ scale: 0.012, side: THREE.DoubleSide, rim: 0, wallStretch: 2 }));
    fmesh.position.z = -80;
    fmesh.frustumCulled = false;
    S.add(fmesh);

    // ---------------- his notebooks and his other paintings, out in the valley
    this.buildNotebooks({ S, H, maps, soft, strokes, nearRoad });

    // ---------------- Lisa
    const lisa = buildLisa(strokes);
    this.ready = loadFigure('mona', strokes, { height: 1.36 }).then((m) => {
      if (!m) return;
      m.position.set(0, LY + 0.02, -3.3);
      m.rotation.y = this.modelYaw ?? 0;
      S.add(m);
      lisa.group.visible = false;
      this.lisaModel = m;
    });
    lisa.group.position.set(0, LY + 0.02, -3.3);
    this.view = { pos: [this._viewRel.pos[0], LY + this._viewRel.pos[1], -3.3 + this._viewRel.pos[2]], target: [0, LY + this._viewRel.target[1], -3.3], fov: this._viewRel.fov };
    lisa.group.rotation.y = -0.34;
    S.add(lisa.group);
    lisa.head.rotation.y = 0.3;
    this.lisa = lisa;
    this.colliders.push({ x: 0, z: -3.3, r: 0.55, top: LY + 1.6 });

    // travellers on the road, birds of haze
    const P = new Builder();
    for (const [x, z, ry] of [[-16, -40, 2], [-40, -98, 1], [60, -120, 1.6], [-122, -138, -1], [TX, TZ, 0.5], [TX + 6, TZ - 4, 2.5], [100, -30, 3]]) figure(P, x, this.groundAt(x, z, 99), z, ry, { coat: [0x5a2a2a, 0x2a3a4a, 0x4a4a2a, 0x6a4a2a][(R() * 4) | 0], dress: R() < 0.6, scale: 0.98 });
    S.add(P.mesh(soft({ scale: 0.8, rim: 0.2 })));
    for (let i = 0; i < 120; i++) this.glows.push({ p: [(R() - 0.5) * 300, 2 + R() * 30, -80 + (R() - 0.5) * 300], c: 0xfff0c8, size: 0.2 + R() * 0.25, drift: 3 });
    S.add(glowPoints(this.glows, 0.55));
    maps.finish();

    // ---------------- story
    const leo = new Builder();
    figure(leo, 0, 0, 0, 0, { coat: 0xffffff, legs: 0xffffff, skin: 0xffffff, dress: true, arms: 0.3, scale: 1.05 });
    leo.ball(0.16, 0xffffff, 0, 1.52, 0.12, 0.9, 1.5, 0.6, 1); // the beard
    const page = new Builder();
    page.box(1.0, 1.3, 0.03, 0xe8dcba, 0, -0.65, 0, 0, { emissive: 0.35 });
    for (let i = 0; i < 8; i++) page.box(0.7 - (i % 3) * 0.1, 0.035, 0.035, 0x5a3a20, 0.05, 0.45 - i * 0.13, 0.02);
    page.add(new THREE.TorusGeometry(0.16, 0.02, 5, 14), 0x5a3a20, xf(-0.22, -0.42, 0.03));
    const pm = page.mesh(paintMaterial({ stroke: strokes.soft, scale: 2, contrast: 0.15, objSpace: 1, emissive: 1.5, side: THREE.DoubleSide }));
    pm.material.uniforms.uRestore = { value: 1 };
    pm.scale.setScalar(1.7);

    this.setupStory({
      wisps: [
        { pos: [0, LY + 1.6, 7], color: 0x6fae8a, name: 'Verdigris', fact: 'Leonardo began the portrait in Florence around 1503, and kept working on it for years.' },
        { pos: [-12, H(-12, -66) + 1.6, -66], color: 0xb8863a, name: 'Raw umber', fact: 'Sfumato: his way of blending tones so softly that the edges disappear, like smoke.' },
        { pos: [63, 8.2, -120], color: 0x5fb0b0, name: 'River green', fact: 'He wrote his notes from right to left, readable only in a mirror.' },
        { pos: [TX, H(TX, TZ) + 1.7, TZ], color: 0xe0b060, name: 'Tower ochre', fact: 'He carried the painting to France in 1516. King Francis I later bought it.' },
        { pos: [96 - 3.6, 8.5, -38], color: 0xdfe8d8, name: 'Mist white', fact: 'She became the most famous painting in the world only after she was stolen from the Louvre in August 1911.' },
      ],
      memento: {
        pos: [CX, CY + 4.5, CZ],
        color: 0xfff0c0,
        model: pm,
        name: 'the page in mirror writing',
        text: 'His notes on how light and shadow fall on a face, written backwards in his own hand.',
      },
      echo: {
        pos: [3.9, LY + 0.02, -1.6],
        ry: -1.0,
        color: 0xffe9b0,
        model: leo.mesh(ghostMaterial(0xffe2a0, 1.0)),
        name: 'Leonardo',
        greet: ['Ah! Tell me, have you ever watched smoke leave a candle? No edges. None at all.', 'I have been at her smile for years. I wrote down how the light should fall, and then I lost the page. Typical.'],
        thanks: ['My own hand, backwards as always. Hold it to the mirror. There.', 'Light, then shadow, and nothing between them.'],
      },
      exit: { pos: [5.5, LY, 27], ry: -0.5 },
    });
    this.finalFact = 'Stolen in 1911 and missing for more than two years, she came home in January 1914. 120,000 people came to see her in two days.';
    this.finalLine = 'The last stroke: the smile.';
    this.hints = {
      start: 'Leonardo’s workshop. The door is open. Walk in: she is sitting at the far end, where the light is.',
      memento: 'His flying machine waits on the tall crag across the river. The page is up there with it.',
      echo: 'Bring the page back to Leonardo in the loggia.',
    };
  }

  // Leonardo's footprint on the valley: the machines of the codices at full size,
  // the settings of his other paintings, and the farmed Tuscany he mapped.
  buildNotebooks({ S, H, maps, soft, strokes, nearRoad }) {
    const Q = rng(1519);
    const C = this.colliders;
    const PL = this.platforms;
    const LB = new Builder(); // stone, timber, bronze, clay
    const LT = new Builder(); // leaves, hay, flowers
    const LG = new Builder(); // paths and fields laid on the ground
    const LP = new Builder(); // people
    const SQ = new Quads(); // flat-coloured stone and cloth
    const GQ = new Quads(); // field strips
    const WQ = new Quads(); // canal water
    const span = (x, z, hw, hd = hw) => {
      let lo = 1e9,
        hi = -1e9;
      for (let i = -3; i <= 3; i++)
        for (let j = -3; j <= 3; j++) {
          const h = H(x + (i / 3) * hw, z + (j / 3) * hd);
          lo = Math.min(lo, h);
          hi = Math.max(hi, h);
        }
      return { lo, hi };
    };
    const toW = (M, x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);
    const MARBLE = 0xddd5c2,
      TIMBER = 0x7a5a36,
      DARK = 0x5a4026,
      LINEN = 0xe6dcc0,
      TERRA = 0xa8582e;
    const stoneC = (x, y, z) => mix(0xa89a78, 0xcdbf9c, vnoise(x * 0.9 + z, y * 0.9));
    const woodC = (x, y, z) => mix(0x5e4428, 0x8e6c40, vnoise(x * 1.3 + z * 0.7, y * 1.1));
    const bronzeC = (x, y, z) => mix(0x8a6a38, 0x4f7a66, smooth(0.4, 0.85, vnoise(x * 2.1 + 3, y * 2.1 + z * 1.7)) * 0.65);
    const clayC = (x, y, z) => mix(0xa08462, 0xc2a680, vnoise(x * 0.8 + z * 0.6, y * 0.8));
    const rockC = (x, y, z) => mix(0x4c483a, 0x9a8c66, clamp(y * 0.5 + 0.5) * 0.7 + vnoise(x * 2 + 1, z * 2) * 0.3);
    const leafC = (lo, hi) => (x, y, z) => mix(lo, hi, clamp(y * 0.5 + 0.5) * 0.7 + vnoise(x * 3 + z, y * 3) * 0.3);

    // ---- paths out to each of them, dusty like his roads
    const dust = (x, y, z) => mix(0xb09a6a, 0xd0b888, vnoise(x * 0.3, z * 0.3));
    // each a little higher than the last, and all above the roads, so that where they meet nothing is coplanar
    LEO_WAYS.forEach((w, i) => LG.parts.push(ribbon(w, 3, H, dust, { lift: 0.16 + i * 0.012, across: 3 })));

    // ---- plants
    const cyp = (x, z, h = 9, r = 1.2) => {
      const y = H(x, z);
      flame(LT, x, y - 0.3, z, h, r, Q() * 6);
      C.push({ x, z, r: 0.6, top: y + h * 0.6 });
      maps.blob(x, z, 2.6, 0.3);
    };

    // ================= the Vitruvian Man: the drawing laid out as a piazza, the man himself in bronze
    {
      const [vx, vz] = LEO.vit;
      const g = span(vx, vz + 2, 15);
      const y0 = g.hi + 0.5,
        base = g.lo - 1;
      LB.box(29.6, y0 - 0.27 - base, 29.6, 0x9c8e6e, vx, base, vz + 2);
      LB.box(27, y0 - 0.02 - base, 27, stoneC, vx, base, vz + 2);
      for (let i = 0; i < 9; i++)
        for (let j = 0; j < 9; j++) {
          const xa = vx - 13.5 + i * 3,
            za = vz - 11.5 + j * 3;
          SQ.quad([xa, y0, za], [xa, y0, za + 3], [xa + 3, y0, za + 3], [xa + 3, y0, za], mix((i + j) & 1 ? 0xbcae8a : 0xd0c3a2, 0xa4966f, Q() * 0.5));
        }
      // the circle about the navel and the square about the groin, inlaid dark; the figure in red stone, head to the south
      const INK = 0x574b3b,
        SANG = 0x94684a,
        flat = y0 + 0.03;
      const ring = new THREE.RingGeometry(11.86, 12.46, 72);
      ring.rotateX(-Math.PI / 2);
      LB.add(ring, INK, xf(vx, y0 + 0.04, vz + 2.16));
      for (const s of [-1, 1]) {
        LB.box(20.6, 0.05, 0.6, INK, vx, y0, vz + s * 10);
        LB.box(0.6, 0.05, 20.6, INK, vx + s * 10, y0, vz);
      }
      LB.cyl(1.3, 1.3, 0.045, SANG, vx, y0, vz + 8.65, 14);
      LB.box(3.3, 0.045, 6.6, SANG, vx, y0, vz + 3);
      LB.box(4.6, 0.045, 1.1, SANG, vx, y0, vz + 6.2);
      LB.box(0.9, 0.045, 1.2, SANG, vx, y0, vz + 7.1);
      for (const s of [-1, 1]) {
        LB.box(1.25, 0.045, 10, SANG, vx + s * 0.85, y0, vz - 5);
        beam(LB, [vx + s * 1.2, flat, vz - 0.2], [vx + s * 4.9, flat, vz - 8.9], 1.2, 0.045, SANG);
        LB.box(7.9, 0.045, 0.95, SANG, vx + s * 6.05, y0, vz + 6.3);
        beam(LB, [vx + s * 2.1, flat, vz + 6.3], [vx + s * 9.3, flat, vz + 9.8], 0.95, 0.045, SANG);
      }
      // the bronze, six metres tall, in both poses at once inside his circle and square
      const sz0 = vz + 2.16;
      LB.cyl(2.5, 2.8, 0.5, stoneC, vx, y0, sz0, 14);
      LB.cyl(2.1, 2.2, 0.7, MARBLE, vx, y0 + 0.5, sz0, 14);
      const yb = y0 + 1.2;
      const VM = xf(vx, yb, sz0);
      LB.add(new THREE.TorusGeometry(3.65, 0.1, 6, 44), bronzeC, xf(vx, yb + 3.65, sz0));
      for (const s of [-1, 1]) LB.box(0.17, 6, 0.17, bronzeC, s * 3, 0, 0, 0, undefined, VM);
      LB.box(6.17, 0.17, 0.17, bronzeC, 0, 5.92, 0, 0, undefined, VM);
      LB.box(6.17, 0.14, 0.17, bronzeC, 0, 0, 0, 0, undefined, VM);
      const FM = VM.clone().multiply(xf(0, 0, 0, 0, 1, 1, 0.62));
      LB.cyl(0.6, 0.42, 1.9, bronzeC, 0, 3, 0, 8, undefined, FM);
      LB.ball(0.5, bronzeC, 0, 3.05, 0, 1, 0.8, 1, 1, undefined, FM);
      LB.ball(0.66, bronzeC, 0, 4.55, 0, 1, 0.75, 1, 1, undefined, FM);
      LB.cyl(0.17, 0.2, 0.45, bronzeC, 0, 4.9, 0, 6, undefined, VM);
      LB.ball(0.4, bronzeC, 0, 5.62, 0, 0.9, 1.12, 0.95, 2, undefined, VM);
      LB.ball(0.43, bronzeC, 0, 5.7, 0.07, 0.95, 1, 0.95, 1, undefined, VM);
      for (const s of [-1, 1]) {
        rod(LB, [s * 0.66, 4.82, 0], [s * 2.9, 4.86, 0], 0.17, bronzeC, 6, 0.1, undefined, VM);
        rod(LB, [s * 0.66, 4.82, 0], [s * 2.72, 5.93, 0], 0.17, bronzeC, 6, 0.1, undefined, VM);
        LB.ball(0.14, bronzeC, s * 2.98, 4.86, 0, 1, 1, 1, 0, undefined, VM);
        LB.ball(0.14, bronzeC, s * 2.8, 5.98, 0, 1, 1, 1, 0, undefined, VM);
        rod(LB, [s * 0.3, 3.1, 0], [s * 0.3, 0.14, 0], 0.27, bronzeC, 6, 0.13, undefined, VM);
        rod(LB, [s * 0.36, 3.1, 0], [s * 1.7, 0.55, 0], 0.27, bronzeC, 6, 0.13, undefined, VM);
        LB.box(0.22, 0.14, 0.55, bronzeC, s * 0.3, 0, -0.08, 0, undefined, VM);
        LB.box(0.22, 0.14, 0.5, bronzeC, s * 1.78, 0.4, -0.08, 0, undefined, VM);
      }
      C.push({ x: vx, z: sz0, r: 2.7, top: yb + 7.4 });
      PL.push({ minx: vx - 13.5, maxx: vx + 13.5, minz: vz - 11.5, maxz: vz + 15.5, y: y0 });
      maps.blob(vx, sz0, 6, 0.35);
      for (const sx of [-1, 1]) {
        for (const oz of [-15.5, 19.5]) cyp(vx + sx * 17.5, vz + oz, 10 + Q() * 3, 1.3);
        LB.box(3.2, 0.5, 0.9, stoneC, vx + sx * 9, y0, vz - 10.9);
        C.push({ x: vx + sx * 9, z: vz - 10.9, hw: 1.7, hd: 0.5, ry: 0, top: y0 + 0.6 });
      }
    }

    // ================= the aerial screw: a linen helix on a round stage, turning
    {
      const [ax, az] = LEO.screw;
      const g = span(ax, az, 7);
      const y0 = g.hi + 0.55,
        base = g.lo - 1;
      LB.cyl(6.6, 7, y0 - 0.03 - base, stoneC, ax, base, az, 20);
      disc(LB, 0.3, 6.45, y0, 28, (j) => mix(j & 1 ? 0x7c5c38 : 0x8e6c44, 0x5a4026, Q() * 0.35), xf(ax, 0, az));
      LB.add(new THREE.TorusGeometry(6.5, 0.14, 5, 28), DARK, xf(ax, y0 + 0.05, az, 0, 1, 1, 1, Math.PI / 2));
      for (let k = 0; k < 3; k++) LB.box(0.5, y0 - 0.16 - k * 0.17 - base, 2.6, stoneC, ax + 7 + k * 0.45, base, az);
      const AS = new Builder();
      AS.cyl(0.16, 0.22, 9.2, woodC, 0, 0, 0, 7);
      AS.add(new THREE.TorusGeometry(2.4, 0.07, 5, 22), DARK, xf(0, 1.0, 0, 0, 1, 1, 1, Math.PI / 2));
      for (let k = 0; k < 2; k++) AS.box(5.6, 0.12, 0.12, TIMBER, 0, 0.94, 0, (k * Math.PI) / 2);
      const turns = 2.2,
        rows = 66;
      const hel = (u, v) => {
        const a = u * turns * 6.2832,
          r = lerp(0.2, lerp(4.9, 1.5, Math.pow(u, 1.15)), v);
        return [Math.cos(a) * r, 2.7 + u * 5.9 - v * (1 - u * 0.6), Math.sin(a) * r];
      };
      AS.parts.push(gridGeo(rows, 2, hel, (u, v, i) => mix(LINEN, 0xc8bc9c, i % 6 === 0 ? 0.7 : Q() * 0.3), { sway: 0.04 }));
      for (let i = 0; i < rows; i += 2) rod(AS, hel(i / rows, 1), hel((i + 2) / rows, 1), 0.05, DARK, 4);
      for (let i = 0; i <= rows; i += 6) rod(AS, hel(i / rows, 0), hel(i / rows, 1), 0.04, TIMBER, 4);
      for (let k = 0; k < 4; k++) rod(AS, [0, 9.1, 0], hel(k / 4 / turns, 1), 0.02, 0x3a2a1c, 3);
      this.airscrew = AS.mesh(soft({ objSpace: 1, scale: 0.7, side: THREE.DoubleSide }));
      this.airscrew.position.set(ax, y0, az);
      S.add(this.airscrew);
      C.push({ x: ax, z: az, r: 0.5, top: y0 + 9.3 });
      PL.push({ minx: ax - 4.6, maxx: ax + 4.6, minz: az - 4.6, maxz: az + 4.6, y: y0 });
      maps.blob(ax, az, 8, 0.4);
      person(LP, xf(ax + 5.2, y0, az + 2.4, -1.2), { robe: 0x6a4a2a, hands: [[-0.1, 0.5, 0.2], [0.08, -0.5, 0.1]], nod: -0.4 });
    }

    // ================= the armoured car: a turtle of planks on wheels, cannon all round
    {
      const [tx, tz] = LEO.tank;
      const g = span(tx, tz, 4.5);
      const y0 = (g.lo + g.hi) / 2;
      const M = xf(tx, y0, tz, 0.4);
      const plank = (j) => mix(j & 1 ? 0x7a5a36 : 0x8c6a42, 0x5a4026, Q() * 0.4);
      LB.cyl(3.9, 3.9, 0.12, 0x2c241a, 0, 0.38, 0, 20, undefined, M);
      shell(LB, 3.9, 0.45, 4.8, 1.75, 26, plank, M);
      LB.cyl(4.7, 4.7, 0.34, 0x2c241a, 0, 1.73, 0, 20, undefined, M);
      shell(LB, 4.8, 2.05, 1, 4.75, 26, plank, M);
      LB.cyl(4.86, 4.86, 0.13, 0x4a4438, 0, 1.98, 0, 26, undefined, M);
      LB.cyl(2.95, 2.95, 0.1, 0x4a4438, 0, 3.38, 0, 20, undefined, M);
      LB.cyl(0.95, 1.05, 0.85, woodC, 0, 4.7, 0, 10, undefined, M);
      LB.cyl(0.04, 1.2, 0.7, 0x6a5030, 0, 5.55, 0, 10, undefined, M);
      for (let k = 0; k < 4; k++) LB.box(0.34, 0.2, 0.1, 0x1c1610, Math.cos(k * 1.5708) * 1.0, 5.1, Math.sin(k * 1.5708) * 1.0, -k * 1.5708 + 1.5708, undefined, M);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * 6.2832,
          cs = Math.cos(a),
          sn = Math.sin(a);
        rod(LB, [cs * 4.2, 1.9, sn * 4.2], [cs * 5.9, 1.9, sn * 5.9], 0.15, 0x4a4030, 6, 0.12, undefined, M, true);
        rod(LB, [cs * 5.75, 1.9, sn * 5.75], [cs * 5.98, 1.9, sn * 5.98], 0.19, 0x3a3226, 6, 0.19, undefined, M, true);
      }
      for (const [wx, wz] of [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]]) LB.cyl(0.9, 0.9, 0.36, woodC, wx + 0.18, 0.9, wz, 10, undefined, M, 0, Math.PI / 2);
      C.push({ x: tx, z: tz, r: 5, top: y0 + 6 });
      maps.blob(tx, tz, 7.5, 0.45);
      // shot stacked beside it
      for (const [ox, oz] of [[5.9, -4.6], [-5.5, 5.6]]) {
        const bx = tx + ox,
          bz = tz + oz,
          by = H(bx, bz);
        for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) LB.ball(0.3, 0x6a6458, bx + dx, by + 0.28, bz + dz, 1, 1, 1, 1);
        LB.ball(0.3, 0x7a7466, bx, by + 0.72, bz, 1, 1, 1, 1);
      }
    }

    // ================= the giant crossbow on its six canted wheels
    {
      const [bx, bz] = LEO.bow;
      const g = span(bx, bz, 9);
      const y0 = g.lo * 0.4 + g.hi * 0.6,
        ry = Math.PI + 0.6;
      const M = xf(bx, y0, bz, ry);
      for (const wz of [-7, 0, 7]) {
        LB.box(6.9, 0.4, 0.4, woodC, 0, 1.4, wz, 0, undefined, M);
        for (const sx of [-1, 1]) {
          const W = M.clone().multiply(xf(sx * 3.45, 1.6, wz, 0, 1, 1, 1, 0, sx * 0.2));
          LB.add(new THREE.TorusGeometry(1.6, 0.15, 5, 16), DARK, W.clone().multiply(xf(0, 0, 0, Math.PI / 2)));
          for (let k = 0; k < 3; k++) LB.box(0.16, 3.1, 0.16, TIMBER, 0, -1.55, 0, 0, undefined, W.clone().multiply(xf(0, 0, 0, 0, 1, 1, 1, (k * Math.PI) / 3, 0)));
          LB.cyl(0.3, 0.3, 0.7, DARK, 0.35, 0, 0, 8, undefined, W, 0, Math.PI / 2);
        }
      }
      for (const sx of [-1, 1]) LB.box(0.5, 0.6, 22, woodC, sx * 1.1, 1.8, 0, 0, undefined, M);
      for (let z = -10; z <= 10; z += 2.5) LB.box(2.7, 0.3, 0.4, DARK, 0, 1.9, z, 0, undefined, M);
      LB.box(0.8, 0.3, 21.4, TIMBER, 0, 2.4, 0, 0, undefined, M);
      // the bow: laminated staves bound together, drawn back
      const bp = (t) => [12.5 * t, 3.05, -9.6 + 5.2 * Math.pow(Math.abs(t), 1.8)];
      for (const sx of [-1, 1])
        for (let k = 0; k < 8; k++) {
          const t0 = (k / 8) * sx,
            t1 = ((k + 1) / 8) * sx;
          beam(LB, bp(t0), bp(t1), lerp(1.0, 0.36, k / 7), lerp(0.9, 0.4, k / 7), k & 1 ? 0x8a6a40 : 0x76562f, undefined, M);
          const p = bp(t1);
          if (k < 7) LB.box(lerp(1.1, 0.5, k / 7), lerp(1.0, 0.5, k / 7), 0.22, 0x3a2c1c, p[0], p[1] - lerp(0.5, 0.25, k / 7), p[2], sx * -0.5, undefined, M);
        }
      LB.box(2.6, 1.2, 1.5, woodC, 0, 2.3, -9.5, 0, undefined, M);
      for (const sx of [-1, 1]) rod(LB, bp(sx), [0, 3.0, 5.6], 0.06, 0xd8cfae, 4, 0.06, undefined, M);
      rod(LB, [0, 2.85, 5.4], [0, 2.85, -10.6], 0.12, 0x6a4a2a, 5, 0.1, undefined, M, true);
      rod(LB, [0, 2.85, -10.6], [0, 2.85, -11.7], 0.26, 0x4a4438, 6, 0.01, undefined, M, true);
      LB.box(1.5, 0.9, 1.3, woodC, 0, 2.6, 5.7, 0, undefined, M);
      beam(LB, [0.5, 3.4, 5.9], [0.9, 4.5, 6.8], 0.14, 0.14, DARK, undefined, M);
      // the worm screw and handwheel that draw it
      rod(LB, [0, 3.0, 6.3], [0, 3.0, 10.9], 0.2, 0x5a5044, 6, 0.2, undefined, M, true);
      for (let z = 6.6; z < 10.4; z += 0.45) LB.add(new THREE.TorusGeometry(0.24, 0.05, 4, 8), 0x4a4034, M.clone().multiply(xf(0, 3.0, z, 0, 1, 1, 1, 0.3, 0)));
      LB.box(1.6, 1.3, 0.5, woodC, 0, 2.4, 10.3, 0, undefined, M);
      LB.add(new THREE.TorusGeometry(1.1, 0.08, 5, 18), DARK, M.clone().multiply(xf(0, 3.0, 11, 0)));
      for (let k = 0; k < 2; k++) LB.box(2.2, 0.1, 0.1, TIMBER, 0, 2.95, 11, 0, undefined, M.clone().multiply(xf(0, 3, 11, 0, 1, 1, 1, 0, k * 1.5708)).multiply(xf(0, -3, -11)));
      const op = toW(M, 1.05, 2.4, 7.6);
      person(LP, xf(op.x, op.y, op.z, ry + Math.PI + 0.4), { robe: 0x7a3a2a, hands: [[-0.2, -0.2, 0.4], [0.1, -0.25, 0.4]] });
      const cb = toW(M, 0, 0, -6.6);
      C.push({ x: bx, z: bz, hw: 1.7, hd: 11.6, ry, top: y0 + 3.3 });
      C.push({ x: cb.x, z: cb.z, hw: 12.6, hd: 3, ry, top: y0 + 4, bottom: y0 + 2.3 });
      maps.blob(bx, bz, 9, 0.4);
    }

    // ================= the pyramid parachute, and someone trusting it
    {
      const PB = new Builder(),
        pq = new Quads();
      const hw = 3.6,
        top = [0, 6.2, 0];
      const cn = [[-hw, 0, -hw], [hw, 0, -hw], [hw, 0, hw], [-hw, 0, hw]];
      for (let k = 0; k < 4; k++) {
        const a = cn[k],
          b = cn[(k + 1) % 4];
        const m = [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2];
        pq.tri(a, top, m, k & 1 ? 0xe6dcc0 : 0xdcd0b0);
        pq.tri(m, top, b, k & 1 ? 0xd6caa8 : 0xeae1c8);
        rod(PB, a, top, 0.06, DARK, 4);
        rod(PB, a, b, 0.06, DARK, 4);
        rod(PB, a, [a[0] < 0 ? -0.28 : 0.28, -5.0, 0], 0.025, 0x3a2a1c, 3);
      }
      PB.parts.push(pq.geometry({ sway: 0.03 }));
      person(PB, xf(0, -7, 0), { robe: 0x7a3a2a, hands: [[-0.03, 0.62, 0.02], [0.03, 0.62, 0.02]], nod: -0.3 });
      this.chute = PB.mesh(soft({ objSpace: 1, scale: 0.7, side: THREE.DoubleSide }));
      S.add(this.chute);
    }

    // ================= the Sforza horse: the clay colossus, still in its scaffold
    {
      const [hx, hz] = LEO.horse;
      const g = span(hx, hz, 6.5, 3.5);
      const y0 = g.lo - 0.4;
      const M = xf(hx, y0, hz);
      LB.box(12, 0.9, 5.4, stoneC, 0, 0, 0, 0, undefined, M);
      LB.box(10.8, 1.95, 4.4, stoneC, 0, 0.9, 0, 0, undefined, M);
      LB.box(11.3, 0.3, 4.9, 0xc9bc9a, 0, 2.8, 0, 0, undefined, M);
      const HM = xf(hx, y0 + 3.1, hz);
      lump(LB, 0, 4.25, 0, 2.5, 1.25, 1.05, 3.1, clayC, 2, 0.12, undefined, HM, 0);
      lump(LB, 1.75, 4.35, 0, 1.25, 1.45, 1.08, 5.2, clayC, 1, 0.12, undefined, HM, 0);
      lump(LB, -1.95, 4.45, 0, 1.45, 1.45, 1.12, 7.7, clayC, 1, 0.12, undefined, HM, 0);
      rod(LB, [2.2, 4.8, 0], [3.75, 7.05, 0], 0.98, clayC, 8, 0.52, undefined, HM);
      beam(LB, [2.15, 5.7, 0], [3.7, 7.6, 0], 0.2, 0.5, 0x8a7052, undefined, HM);
      rod(LB, [3.5, 7.2, 0], [4.75, 6.05, 0], 0.52, clayC, 7, 0.3, undefined, HM, true);
      LB.ball(0.33, clayC, 4.82, 5.98, 0, 1, 1, 0.9, 1, undefined, HM);
      LB.ball(0.55, clayC, 3.6, 7.1, 0, 1, 1, 0.8, 1, undefined, HM);
      for (const s of [-1, 1]) LB.cyl(0.01, 0.13, 0.42, clayC, 3.45, 7.5, s * 0.24, 4, undefined, HM);
      const leg = (pts, z) => {
        const rr = [0.46, 0.27, 0.17, 0.2];
        for (let i = 0; i < pts.length - 1; i++) rod(LB, [pts[i][0], pts[i][1], z], [pts[i + 1][0], pts[i + 1][1], z], rr[i], clayC, 6, rr[i + 1], undefined, HM, true);
        for (let i = 1; i < pts.length - 1; i++) LB.ball(rr[i] * 1.12, clayC, pts[i][0], pts[i][1], z, 1, 1, 1, 0, undefined, HM);
        const e = pts[pts.length - 1];
        LB.cyl(0.2, 0.27, 0.28, 0x7a6248, e[0], e[1] - 0.26, z, 6, undefined, HM);
      };
      leg([[-2.2, 3.9], [-2.75, 2.15], [-2.45, 0.42], [-2.42, 0.26]], -0.6);
      leg([[-2.2, 3.9], [-3.3, 2.25], [-3.55, 0.6], [-3.5, 0.3]], 0.6);
      leg([[1.9, 3.7], [2.0, 1.95], [2.0, 0.42], [2.03, 0.26]], -0.55);
      leg([[1.9, 3.7], [3.05, 2.8], [2.8, 1.5], [2.92, 1.25]], 0.55);
      rod(LB, [-3.2, 5.15, 0], [-4.15, 3.7, 0], 0.3, 0x8a7052, 5, 0.2, undefined, HM);
      rod(LB, [-4.15, 3.7, 0], [-4.3, 2.3, 0], 0.2, 0x8a7052, 5, 0.06, undefined, HM);
      // poles, ledgers, braces, planks, ladders and a hoist
      const pole = (a, b, r = 0.09) => rod(LB, a, b, r, woodC, 4, r, undefined, M);
      const xs = [-6.6, -3.3, 0, 3.3, 6.6];
      for (const sz of [-1, 1]) {
        for (const x of xs) pole([x, 0.2, sz * 3.5], [x, 13, sz * 3.5], 0.1);
        for (const y of [4.2, 7.4, 10.6]) pole([-7.1, y, sz * 3.5], [7.1, y, sz * 3.5]);
        for (let i = 0; i < 4; i++) pole([xs[i], i & 1 ? 4.2 : 7.4, sz * 3.5], [xs[i + 1], i & 1 ? 7.4 : 4.2, sz * 3.5], 0.06);
      }
      for (const x of xs) pole([x, 12.2, -3.9], [x, 12.2, 3.9]);
      for (const x of [-6.6, 6.6]) for (const y of [4.2, 7.4, 10.6]) pole([x, y, -3.5], [x, y, 3.5]);
      LB.box(13.6, 0.08, 1.1, 0x8e6c44, 0, 7.45, 2.9, 0, undefined, M);
      LB.box(13.6, 0.08, 1.1, 0x86643e, 0, 4.25, -2.9, 0, undefined, M);
      LB.box(6.9, 0.08, 1.1, 0x8e6c44, 3.3, 10.65, -2.9, 0, undefined, M);
      const ladder = (x0, ya, x1, yb, z) => {
        for (const s of [-0.3, 0.3]) pole([x0, ya, z + s], [x1, yb, z + s], 0.05);
        for (let k = 1; k < 9; k++) pole([lerp(x0, x1, k / 9), lerp(ya, yb, k / 9), z - 0.3], [lerp(x0, x1, k / 9), lerp(ya, yb, k / 9), z + 0.3], 0.035);
      };
      ladder(8.8, 0.4, 7.0, 4.3, -2.9);
      ladder(-9.4, 0.4, -7.0, 7.5, 2.9);
      beam(LB, [-3.3, 12.2, 0], [1.6, 14.8, 0], 0.22, 0.22, DARK, undefined, M);
      pole([-3.3, 12.2, 0], [-3.3, 14.4, 0], 0.08);
      pole([-3.3, 14.4, 0], [1.6, 14.8, 0], 0.03);
      pole([1.6, 14.8, 0], [1.6, 12.4, 0], 0.025);
      LB.cyl(0.32, 0.26, 0.45, 0x6a5030, 1.6, 12.0, 0, 7, undefined, M);
      person(LP, M.clone().multiply(xf(2.4, 7.53, 2.9, Math.PI)), { robe: 0x5a5a3a, hands: [[-0.1, 0.35, 0.4], [0.1, -0.1, 0.4]], nod: -0.2 });
      person(LP, M.clone().multiply(xf(9.8, 0.4, 2.2, -1.9)), { robe: 0x4a3a5a, mantle: 0x7a3a2a, hands: [[-0.2, 0.3, 0.35], [0.08, -0.5, 0.1]], nod: -0.45 });
      for (const [ox, oz, s] of [[8.6, -4.6, 0.8], [9.6, -3.9, 0.55], [-8.4, 4.4, 0.7]]) lump(LB, hx + ox, H(hx + ox, hz + oz) + s * 0.3, hz + oz, s * 1.2, s * 0.7, s, ox, clayC, 1, 0.4);
      C.push({ x: hx, z: hz, hw: 6.1, hd: 2.8, ry: 0, top: y0 + 3.3 });
      C.push({ x: hx, z: hz, hw: 4.7, hd: 1.3, ry: 0, top: y0 + 11.2, bottom: y0 + 3.3 });
      maps.blob(hx, hz, 10, 0.45);
    }

    // ================= the Last Supper: the refectory with one wall away, the table as he set it
    {
      const [sx0, sz0] = LEO.supper;
      const g = span(sx0, sz0 + 1, 18, 8);
      const yf = g.hi + 0.6,
        base = g.lo - 1;
      const M = xf(sx0, yf, sz0);
      LB.box(34, yf - 0.02 - base, 12, stoneC, sx0, base, sz0);
      LB.box(34, yf - 0.2 - base, 1, stoneC, sx0, base, sz0 + 6.5);
      LB.box(34, yf - 0.4 - base, 1, stoneC, sx0, base, sz0 + 7.5);
      for (let i = 0; i < 16; i++)
        for (let j = 0; j < 5; j++) {
          const xa = sx0 - 16 + i * 2,
            za = sz0 - 5 + j * 2.2;
          SQ.quad([xa, yf, za], [xa, yf, za + 2.2], [xa + 2, yf, za + 2.2], [xa + 2, yf, za], mix((i + j) & 1 ? 0xb4a684 : 0xc8ba98, 0x9a8c6c, Q() * 0.4));
        }
      const WH = 7.5;
      const plaster = (x, y, z) => mix(0xc6b794, 0xb09f7a, vnoise(x * 0.4 + z * 0.3, y * 0.4));
      // the back wall and its three windows onto the country beyond
      const bw = (x0, x1, ya, yb) => LB.box(x1 - x0, yb - ya, 0.6, plaster, (x0 + x1) / 2, ya, -5.3, 0, undefined, M);
      bw(-16.6, -4.6, 0, WH);
      bw(4.6, 16.6, 0, WH);
      bw(-2.6, -1.4, 0, WH);
      bw(1.4, 2.6, 0, WH);
      for (const s of [-1, 1]) {
        bw(s * 3.6 - 1, s * 3.6 + 1, 0, 1.3);
        bw(s * 3.6 - 1, s * 3.6 + 1, 4.3, WH);
      }
      bw(-1.4, 1.4, 0, 1.0);
      bw(-1.4, 1.4, 4.8, WH);
      LB.add(new THREE.TorusGeometry(1.55, 0.13, 5, 12, Math.PI), 0x9a8c6c, M.clone().multiply(xf(0, 4.9, -4.96)));
      for (const [wx, ww, wa, wb] of [[-3.6, 2, 1.3, 4.3], [0, 2.8, 1.0, 4.8], [3.6, 2, 1.3, 4.3]]) {
        LB.box(ww + 0.3, 0.14, 0.76, 0x9a8c6c, wx, wa - 0.04, -5.3, 0, undefined, M);
        LB.box(ww + 0.3, 0.14, 0.76, 0x9a8c6c, wx, wb - 0.1, -5.3, 0, undefined, M);
      }
      // side walls hung with dark tapestries
      for (const s of [-1, 1]) {
        LB.box(0.6, WH, 11.2, plaster, s * 16.3, 0, 0, 0, undefined, M);
        for (let k = 0; k < 4; k++) {
          LB.box(0.08, 3.5, 1.8, [0x5c4a3a, 0x48584a, 0x6a3c32, 0x3c4a5a][(k + (s > 0 ? 1 : 0)) % 4], s * 15.96, 2, -3.75 + k * 2.5, 0, undefined, M);
          LB.box(0.1, 0.1, 2, DARK, s * 15.95, 5.5, -3.75 + k * 2.5, 0, undefined, M);
        }
        LB.box(0.8, 6.7, 0.8, stoneC, s * 10.8, 0, 5.2, 0, undefined, M);
        C.push({ x: sx0 + s * 16.3, z: sz0, hw: 0.4, hd: 5.7, ry: 0, top: yf + 11 });
        C.push({ x: sx0 + s * 10.8, z: sz0 + 5.2, r: 0.55, top: yf + 7 });
      }
      LB.box(33.2, 0.8, 0.7, 0x4a3420, 0, 6.7, 5.25, 0, undefined, M);
      // coffered ceiling under a tiled roof
      LB.box(33.8, 0.3, 11.8, 0x3a2a1c, 0, WH, 0, 0, undefined, M);
      for (const z of [-4, -2, 0, 2, 4]) LB.box(32, 0.3, 0.26, 0x4a3420, 0, WH - 0.3, z, 0, undefined, M);
      for (let x = -14; x <= 14; x += 3.5) LB.box(0.26, 0.3, 10.4, 0x4a3420, x, WH - 0.3, 0, 0, undefined, M);
      LB.gable(12.8, 35, 2.9, TERRA, 0, WH + 0.3, 0, Math.PI / 2, undefined, M);
      // the table: white cloth with its pressed folds, pewter, bread, glasses
      const TZ0 = -1.6,
        PEWTER = 0x9a9684;
      LB.box(17.4, 0.07, 1.5, 0xe9e2d0, 0, 0.95, TZ0, 0, undefined, M);
      LB.box(17.4, 0.6, 0.05, 0xe2dac6, 0, 0.37, TZ0 + 0.76, 0, undefined, M);
      for (const s of [-1, 1]) {
        LB.box(0.05, 0.6, 1.5, 0xe2dac6, s * 8.7, 0.37, TZ0, 0, undefined, M);
        LB.box(0.14, 0.076, 1.52, 0x5a6a8a, s * 8.1, 0.95, TZ0, 0, undefined, M);
        LB.box(0.14, 0.6, 0.06, 0x5a6a8a, s * 8.1, 0.37, TZ0 + 0.765, 0, undefined, M);
      }
      for (let x = -7.25; x < 8; x += 1.45) LB.box(0.035, 0.6, 0.062, 0xc9c1ab, x, 0.37, TZ0 + 0.765, 0, undefined, M);
      for (const x of [-7.4, -2.5, 2.5, 7.4]) LB.box(0.16, 0.95, 1.2, DARK, x, 0, TZ0, 0, undefined, M);
      LB.box(17, 0.45, 0.5, DARK, 0, 0, -2.85, 0, undefined, M);
      for (let i = -6; i <= 6; i++) {
        const x = i * 1.3;
        LB.cyl(0.17, 0.15, 0.025, PEWTER, x + 0.05, 1.02, TZ0 + 0.2, 8, undefined, M);
        LB.cyl(0.04, 0.035, 0.11, 0xa8c0b8, x + 0.4, 1.02, TZ0 + 0.05, 5, undefined, M);
        LB.ball(0.075, 0xc9a465, x - 0.35 + Q() * 0.2, 1.07, TZ0 + 0.3 + Q() * 0.25, 1.2, 0.8, 1, 0, undefined, M);
      }
      for (const x of [-3.9, 0, 3.9]) {
        LB.cyl(0.32, 0.28, 0.04, PEWTER, x, 1.02, TZ0 + 0.45, 10, undefined, M);
        for (let k = 0; k < 3; k++) LB.ball(0.08, x === 0 ? 0xb8905a : 0xc9783a, x + Math.cos(k * 2.1) * 0.13, 1.1, TZ0 + 0.45 + Math.sin(k * 2.1) * 0.13, 1, 1, 1, 0, undefined, M);
      }
      // thirteen at table, in his groups of three either side of the still centre
      const seat = (i, o) => person(LP, M.clone().multiply(xf(i * 1.3, 0, o.pose === 'stand' ? -2.6 : -2.72, 0, 1.2, 1.2, 1.2)), { pose: 'sit', ...o });
      seat(-6, { pose: 'stand', robe: 0x3f6a6a, mantle: 0x5a6a3a, hair: 0x4a3422, beard: true, tilt: -0.1, lean: 0.32, turn: 0.25, hands: [[-0.05, -0.32, 0.55], [0.05, -0.32, 0.55]] });
      seat(-5, { robe: 0x9a5a48, hair: 0x6a4a2a, tilt: -0.15, hands: [[0.15, -0.1, 0.32], [0.55, 0.05, 0.3]] });
      seat(-4, { robe: 0x7a7a3a, mantle: 0xb08a3a, hair: 0xa8a094, beard: true, hands: [[-0.1, 0.08, 0.38], [0.1, 0.08, 0.38]] });
      seat(-3, { robe: 0x33414f, mantle: 0x46564a, hair: 0x2a2018, beard: true, lean: -0.14, tilt: 0.08, turn: 0.5, hands: [[-0.05, -0.14, 0.52], [0.2, -0.13, 0.45]] });
      seat(-2, { robe: 0x3a557e, mantle: 0xb08a3a, hair: 0xb8b0a0, beard: true, tilt: -0.3, lean: 0.2, hands: [[0.3, -0.05, 0.25], [0.5, 0, 0.35]] });
      seat(-1, { robe: 0x3f6a6a, mantle: 0xa04a3a, hair: 0x8a5a30, longHair: true, tilt: 0.32, nod: 0.25, hands: [[0.05, -0.14, 0.45], [-0.05, -0.14, 0.45]] });
      person(LP, M.clone().multiply(xf(0, 0, -2.72, 0, 1.25, 1.25, 1.25)), { pose: 'sit', robe: 0x9a3a2e, mantle: 0x34507a, hair: 0x5a3a22, longHair: true, beard: true, hands: [[-0.32, -0.16, 0.62], [0.32, -0.16, 0.62]], nod: 0.18, cock: 0.12 });
      seat(1, { robe: 0x6a7a4a, mantle: 0xa8843a, hair: 0x5a4028, beard: true, tilt: 0.15, hands: [[-0.05, -0.13, 0.42], [0, 0.4, 0.2]] });
      seat(2, { robe: 0x5a7a5a, hair: 0x6a4a2a, lean: -0.08, hands: [[-0.6, -0.08, 0.25], [0.6, -0.08, 0.25]] });
      seat(3, { pose: 'stand', robe: 0xb8603a, mantle: 0x3a557e, hair: 0x7a5a34, tilt: 0.2, lean: 0.25, hands: [[0.14, -0.2, 0.2], [-0.14, -0.2, 0.2]] });
      seat(4, { robe: 0x3a6a8a, hair: 0x5a4028, turn: 0.5, hands: [[-0.6, 0, 0.25], [-0.4, -0.05, 0.4]] });
      seat(5, { robe: 0x8a6a3a, mantle: 0x7a4a3a, hair: 0x8a8274, beard: true, turn: 0.4, hands: [[-0.3, -0.1, 0.35], [0.1, -0.02, 0.35]] });
      seat(6, { robe: 0xd8d0c0, mantle: 0x9a8aa0, hair: 0xa8a094, beard: true, turn: -0.5, hands: [[-0.2, -0.12, 0.5], [0.15, -0.12, 0.5]] });
      LB.ball(0.08, 0x6a5a3a, -3 * 1.3 - 0.3, 1.1, TZ0 - 0.25, 1, 1.2, 1, 0, undefined, M);
      C.push({ x: sx0, z: sz0 - 5.3, hw: 16.8, hd: 0.45, ry: 0, top: yf + 11 });
      C.push({ x: sx0, z: sz0 - 1.6, hw: 8.8, hd: 0.8, ry: 0, top: yf + 1.1 });
      C.push({ x: sx0, z: sz0 - 2.8, hw: 8.6, hd: 0.45, ry: 0, top: yf + 2.1 });
      C.push({ x: sx0, z: sz0, hw: 17.4, hd: 6.4, ry: 0, top: yf + 11, bottom: yf + 7.3 });
      PL.push({ minx: sx0 - 17, maxx: sx0 + 17, minz: sz0 - 6, maxz: sz0 + 6, y: yf });
      PL.push({ minx: sx0 - 17, maxx: sx0 + 17, minz: sz0 + 6, maxz: sz0 + 7, y: yf - 0.2 });
      PL.push({ minx: sx0 - 17, maxx: sx0 + 17, minz: sz0 + 7, maxz: sz0 + 8, y: yf - 0.4 });
      maps.lamp(sx0, sz0 - 1, 15, 0xffe2a8, 0.5);
      maps.blob(sx0, sz0, 16, 0.3);
    }

    // ================= the Annunciation: a walled garden, the angel kneeling to the Virgin at her lectern
    {
      const [gx, gz] = LEO.garden;
      const g = span(gx, gz, 9.5, 13.5);
      const y0 = g.hi + 0.15,
        base = g.lo - 1;
      // the garden's +z looks east to the hill, so from there the angel is on the left and the Virgin on the right
      const M = xf(gx, y0, gz, Math.PI / 2);
      LB.box(18.8, y0 - 0.04 - base, 26.8, stoneC, gx, base, gz);
      for (let i = 0; i < 9; i++)
        for (let j = 0; j < 13; j++) {
          const xa = gx - 9 + i * 2,
            za = gz - 13 + j * 2;
          GQ.quad([xa, y0, za], [xa, y0, za + 2], [xa + 2, y0, za + 2], [xa + 2, y0, za], mix(0x4f6a34, 0x7a8a44, Q()));
        }
      const wall = (x, z, w, d, h = 0.95) => {
        LB.box(w, h, d, stoneC, x, 0, z, 0, undefined, M);
        LB.box(w + 0.16, 0.1, d + 0.16, 0xc9bc9a, x, h, z, 0, undefined, M);
      };
      wall(-7.25, -9, 11.5, 0.45);
      wall(5, -9, 7, 0.45);
      wall(-13, 0, 0.45, 18.45);
      // the corner of the house behind her, with its quoins and dark doorway
      LB.box(4.5, 7.2, 12.5, (x, y) => mix(0xb8a888, 0x9a8a6c, clamp(0.3 - y * 0.1)), 10.75, 0, -2.75, 0, undefined, M);
      LB.hip(5.7, 13.7, 1.6, TERRA, 10.75, 7.2, -2.75, 0, undefined, M);
      for (let k = 0; k < 12; k++) LB.box(k & 1 ? 0.95 : 0.55, 0.52, k & 1 ? 0.55 : 0.95, 0xd4c8aa, 8.45 + (k & 1 ? 0.42 : 0.22), k * 0.6, 3.55 - (k & 1 ? 0.22 : 0.42), 0, undefined, M);
      LB.box(0.12, 3.3, 1.7, 0x2a241c, 8.47, 0, -2, 0, undefined, M);
      for (const s of [-1, 1]) LB.box(0.2, 3.5, 0.26, 0xd4c8aa, 8.44, 0, -2 + s * 0.98, 0, undefined, M);
      LB.box(0.22, 0.3, 2.3, 0xd4c8aa, 8.44, 3.3, -2, 0, undefined, M);
      LB.box(1.3, 1.9, 0.1, 0x3a342a, 10.75, 3.3, 3.52, 0, undefined, M);
      LB.box(1.6, 0.16, 0.2, 0xd4c8aa, 10.75, 3.14, 3.55, 0, undefined, M);
      // the Virgin, seated, right hand on the book
      LB.box(0.9, 0.5, 0.9, stoneC, 5.75, 0, 0.35, 0.35, undefined, M);
      person(LP, M.clone().multiply(xf(5.6, 0, 0.4, -Math.PI / 2 + 0.35, 1.25, 1.25, 1.25)), { pose: 'sit', robe: 0x8a3028, mantle: 0x2f4a78, hair: 0x9a7a44, longHair: true, hands: [[0.45, -0.15, 0.8], [0.12, 0, 0.3]], nod: 0.12 });
      // the marble lectern with its lion feet and scrolls
      const LM = M.clone().multiply(xf(4.55, 0, 1, 0.35));
      LB.box(1.25, 0.14, 0.85, MARBLE, 0, 0, 0, 0, undefined, LM);
      for (const [px, pz] of [[-0.5, -0.32], [0.5, -0.32], [-0.5, 0.32], [0.5, 0.32]]) LB.ball(0.13, MARBLE, px, 0.2, pz, 1, 1, 1, 0, undefined, LM);
      LB.ball(0.5, (x, y) => mix(0xc9c0aa, 0xe8e1d1, clamp(y + 0.5)), 0, 0.6, 0, 1.05, 0.7, 0.72, 1, undefined, LM);
      LB.box(1.35, 0.1, 0.9, MARBLE, 0, 0.9, 0, 0, undefined, LM);
      for (const s of [-1, 1]) LB.cyl(0.11, 0.11, 0.9, MARBLE, s * 0.66, 1.0, -0.45, 6, undefined, LM, Math.PI / 2, 0);
      const BK = LM.clone().multiply(xf(0.12, 1.05, 0, 0, 1, 1, 1, 0, -0.22));
      LB.box(0.62, 0.05, 0.46, 0x6a4a30, 0, 0, 0, 0, undefined, BK);
      LB.box(0.5, 0.04, 0.38, 0xeee6d2, 0, 0.05, 0, 0, undefined, BK);
      LB.box(0.02, 0.5, 0.5, 0xf2eee4, -0.69, 0.5, 0.1, 0, undefined, LM);
      // the angel, kneeling in the flowers, lily in hand
      const AU = person(LP, M.clone().multiply(xf(-5, 0, 0.9, Math.PI / 2 - 0.3, 1.25, 1.25, 1.25)), { pose: 'kneel', robe: 0xe6dfd0, mantle: 0x9a3a2e, sleeve: 0xe6dfd0, hair: 0xb08a44, longHair: true, hands: [[0.1, 0.02, 0.55], [0, -0.22, 0.32]], lean: 0.12 });
      wings(LP, AU);
      rod(LP, [0.25, 0.14, 0.32], [0.3, 1.05, 0.38], 0.016, 0x5a7a3a, 3, 0.012, undefined, AU);
      for (const [fx, fy, fz] of [[0.3, 1.02, 0.38], [0.22, 0.9, 0.42], [0.37, 0.86, 0.34]]) LP.cyl(0.075, 0.015, 0.15, 0xf4f0e4, fx, fy, fz, 5, undefined, AU);
      // flowers in the grass, lilies along the wall, dark trees beyond it
      const FL = [0xf2eee0, 0xe8c84a, 0xb8443a, 0x6a7ab8, 0xd88ab0];
      for (let k = 0; k < 70; k++) {
        const lx = -12.3 + Q() * 20,
          lz = -8.3 + Q() * 16.8;
        if (Math.hypot(lx + 5, lz - 0.9) < 1.3 || Math.hypot(lx - 5.2, lz - 0.7) < 1.8) continue;
        const w = toW(M, lx, 0.1, lz);
        LT.ball(0.1 + Q() * 0.07, FL[(Q() * FL.length) | 0], w.x, w.y, w.z, 1, 0.7, 1, 0, { sway: 0.05 });
      }
      for (let k = 0; k < 9; k++) {
        const lx = -12 + k * 2.4 + (k > 4 ? 1.6 : 0);
        if (Math.abs(lx) < 1.6) continue;
        const a = toW(M, lx, 0, -8.4),
          hh = 1 + Q() * 0.5;
        rod(LT, [a.x, a.y, a.z], [a.x, a.y + hh, a.z], 0.02, 0x5a7a3a, 3, 0.015, { sway: 0.05 });
        for (let f = 0; f < 3; f++) LT.cyl(0.08, 0.015, 0.16, 0xf4f0e4, a.x + (Q() - 0.5) * 0.2, a.y + hh - 0.05 - f * 0.16, a.z + (Q() - 0.5) * 0.2, 5, { sway: 0.06 });
        LT.ball(0.3, 0x4a6a34, a.x, a.y + 0.2, a.z, 1, 0.6, 1, 0, { sway: 0.05 });
      }
      for (let k = 0; k < 8; k++) {
        const w = toW(M, -12 + k * 3.4, 0, -12.2 + (Q() - 0.5) * 1.6);
        if (k % 3 === 1) {
          const y = H(w.x, w.z),
            s = 1.2 + Q() * 0.5;
          LT.cyl(0.12, 0.2, 3.2 * s, 0x3a2c1c, w.x, y - 0.2, w.z, 5);
          lump(LT, w.x, y + 3.4 * s, w.z, 1.9 * s, 1.5 * s, 1.9 * s, k * 3.1, leafC(0x243824, 0x4a6238), 1, 0.5, { sway: 0.2 });
          C.push({ x: w.x, z: w.z, r: 0.5, top: y + 3 });
        } else cyp(w.x, w.z, 8 + Q() * 5, 1.1 + Q() * 0.3);
      }
      PL.push({ minx: gx - 9.4, maxx: gx + 9.4, minz: gz - 13.4, maxz: gz + 13.4, y: y0 });
      C.push({ x: gx - 2.75, z: gz - 10.75, hw: 6.3, hd: 2.3, ry: 0, top: y0 + 9 });
      C.push({ x: gx - 9, z: gz + 7.25, hw: 0.3, hd: 5.75, ry: 0, top: y0 + 1.1 });
      C.push({ x: gx - 9, z: gz - 5, hw: 0.3, hd: 3.5, ry: 0, top: y0 + 1.1 });
      C.push({ x: gx, z: gz + 13, hw: 9.3, hd: 0.3, ry: 0, top: y0 + 1.1 });
      const lw = toW(M, 4.55, 0, 1),
        vw = toW(M, 5.7, 0, 0.4),
        aw = toW(M, -5, 0, 0.9);
      C.push({ x: lw.x, z: lw.z, r: 0.8, top: y0 + 1.3 }, { x: vw.x, z: vw.z, r: 0.6, top: y0 + 1.9 }, { x: aw.x, z: aw.z, r: 0.7, top: y0 + 1.9 });
      maps.blob(gx - 2.75, gz - 10.75, 9, 0.4);
    }

    // ================= the Virgin of the Rocks: a cave of leaning stone on the lake shore
    {
      const [cx, cz] = LEO.grotto;
      const rock = (lx, lz, h, r, sd, topR) => {
        const x = cx + lx,
          z = cz + lz,
          y = Math.max(H(x, z), -1) - 1.5;
        spire(LB, x, y, z, h + 1.5, r, sd, 0x4a4636, 0x9a8a62, topR);
        C.push({ x, z, r: r * 0.7, top: y + h * 0.75 });
      };
      rock(-8.5, 1, 13, 4.2, 1.3, 0.45);
      rock(-6.8, -4.2, 16, 4.6, 2.9, 0.4);
      rock(-11, -3.5, 10, 4, 4.4, 0.35);
      rock(-11.5, 5, 7, 3.2, 6.1, 0.3);
      rock(8.2, 0.5, 12.5, 4, 7.7, 0.45);
      rock(7.2, -4.6, 15, 4.4, 9.2, 0.4);
      rock(11.2, -2, 9, 3.8, 10.5, 0.35);
      rock(10.8, 5.5, 6, 3, 12.3, 0.3);
      rock(-1.6, -8.6, 9.5, 2.5, 14.1, 0.5);
      rock(3, -7.2, 8.2, 2.1, 15.8, 0.5);
      // out in the water, the blue stacks seen through the arches
      for (const [lx, lz, h, r, sd] of [[-3, -24, 13, 2.6, 17], [5, -31, 17, 3.2, 19], [-10, -34, 11, 2.6, 21], [13, -22, 9, 2.4, 23]]) spire(LB, cx + lx, -2.6, cz + lz, h + 3.2, r, sd, 0x4a5a52, 0x8aa09a, 0.25);
      // the roof: slabs wedged across the pillars
      lump(LB, cx, 12.8, cz - 2.5, 9.8, 2.3, 6.2, 5.5, rockC, 2, 0.45, undefined, undefined, 0.15);
      lump(LB, cx - 3.8, 10.2, cz - 7.8, 5, 1.6, 3.6, 8.1, rockC, 1, 0.5, undefined, undefined, -0.5);
      lump(LB, cx + 5, 9.4, cz - 6.6, 4.6, 1.5, 3.4, 11.7, rockC, 1, 0.5, undefined, undefined, 0.6);
      lump(LB, cx - 6, 14.6, cz + 2.4, 4, 2.2, 3.6, 13.3, rockC, 1, 0.5);
      lump(LB, cx + 6.4, 13.9, cz + 2, 3.8, 2, 3.4, 16.9, rockC, 1, 0.5);
      // the ledge they sit on
      const yl = H(cx, cz + 2.6) + 0.35;
      LB.cyl(3.4, 4, 1.1, (x, y, z) => mix(0x5a543e, 0x8a7e5a, vnoise(x + 3, z)), cx, yl - 1.1, cz + 2.6, 9);
      PL.push({ minx: cx - 2.5, maxx: cx + 2.5, minz: cz + 0.2, maxz: cz + 5, y: yl });
      const VU = person(LP, xf(cx, yl, cz + 2, 0, 1.15, 1.15, 1.15), { pose: 'kneel', robe: 0x2a4470, mantle: 0x2a4470, hair: 0x7a5a34, longHair: true, hands: [[-0.45, -0.3, 0.3], [0.25, -0.12, 0.55]], nod: 0.3, cock: 0.15 });
      LP.ball(0.16, 0xc49a3a, 0.04, 0.12, 0.2, 1.5, 0.5, 0.6, 0, undefined, VU);
      person(LP, xf(cx - 1.3, yl, cz + 3, 0.9, 0.55, 0.55, 0.55), { pose: 'kneel', robe: 0xdcb48e, hair: 0x8a6a3a, hands: [[0.18, -0.1, 0.38], [-0.18, -0.1, 0.38]], lean: 0.2 });
      person(LP, xf(cx + 1.05, yl, cz + 3.7, -1.2, 0.5, 0.5, 0.5), { pose: 'sit', robe: 0xdcb48e, hair: 0xa8823a, hands: [[0.1, 0.15, 0.35], [0.05, -0.4, 0.2]] });
      const GU = person(LP, xf(cx + 2, yl, cz + 2.5, -0.5, 1.1, 1.1, 1.1), { pose: 'kneel', robe: 0x4a6a4a, mantle: 0x9a3a2e, hair: 0xa8823a, longHair: true, hands: [[-0.5, -0.05, 0.45], [0, -0.3, 0.3]] });
      wings(LP, GU, 0.85);
      C.push({ x: cx + 0.3, z: cz + 2.4, r: 1.6, top: yl + 1.8 });
      // the dark pool before them, stones round its edge
      const px = cx + 0.3,
        pz = cz + 9;
      const pool = new THREE.Mesh(patch(px, pz, 3.5, H, 0xffffff, { lift: 0.1, rings: 3, seg: 16, wobble: 0.2 }), waterMaterial({ stroke: strokes.soft, deep: 0x0e1612, shallow: 0x24382e, reflect: 0x6a7a5a, glint: 0xd8e0b8, scale: 0.12, glintAmt: 0.5, flow: 0.002 }));
      pool.frustumCulled = false;
      S.add(pool);
      for (let k = 0; k < 15; k++) {
        const a = (k / 15) * 6.283 + Q() * 0.2,
          x = px + Math.cos(a) * (3.6 + Q() * 0.4),
          z = pz + Math.sin(a) * (3.6 + Q() * 0.4);
        lump(LB, x, H(x, z) + 0.1, z, 0.5 + Q() * 0.4, 0.32, 0.45 + Q() * 0.3, k * 2.3, rockC, 0, 0.5);
      }
      // iris, fern and palm, as he painted them leaf by leaf
      const iris = (x, z, s = 1) => {
        const y = H(x, z);
        for (let b = 0; b < 5; b++) LT.cyl(0.005, 0.055 * s, (0.6 + Q() * 0.5) * s, mix(0x3f5a2a, 0x6a8a3a, Q()), x + (Q() - 0.5) * 0.2, y, z + (Q() - 0.5) * 0.2, 3, { sway: 0.08 }, undefined, (Q() - 0.5) * 0.7, (Q() - 0.5) * 0.7);
        if (Q() < 0.6) LT.ball(0.09 * s, Q() < 0.5 ? 0x6a5aa8 : 0xe8e4d4, x, y + 0.8 * s, z, 1, 1.2, 1, 0, { sway: 0.1 });
      };
      for (let k = 0; k < 16; k++) {
        const a = Q() * 6.283,
          rr = 4.3 + Q() * 1.6;
        iris(px + Math.cos(a) * rr, pz + Math.sin(a) * rr, 0.9 + Q() * 0.6);
      }
      for (const [lx, lz, s] of [[-4.6, 3.2, 1.6], [4.8, 3.8, 1.4], [-3.4, 0.4, 1.2], [3.8, 0.2, 1.3], [-6.5, 6.5, 2.2], [6.8, 7.4, 1.8]]) {
        iris(cx + lx, cz + lz, s);
        LT.ball(0.6, 0x3f5a30, cx + lx + 0.5, H(cx + lx + 0.5, cz + lz) + 0.15, cz + lz + 0.3, 1.2, 0.35, 1.2, 0, { sway: 0.06 });
      }
      maps.blob(cx, cz - 2, 14, 0.55);
      for (let k = 0; k < 8; k++) this.glows.push({ p: [cx + (Q() - 0.5) * 10, 4 + Q() * 5, cz + (Q() - 0.5) * 9], c: 0xcfe8d8, size: 0.25, drift: 1.5 });
    }

    // ================= on the hilltop: drawing tables, mirrors, anatomy, a wing on test, solids for Pacioli
    {
      const desk = (x, z, ry, w = 2.6, d = 1.2) => {
        const y = H(x, z) + 0.02,
          M = xf(x, y, z, ry);
        LB.box(w, 0.1, d, woodC, 0, 0.82, 0, 0, undefined, M);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) LB.box(0.1, 0.82, 0.1, DARK, sx * (w / 2 - 0.12), 0, sz * (d / 2 - 0.12), 0, undefined, M);
        C.push({ x, z, hw: w / 2 + 0.05, hd: d / 2 + 0.05, ry, top: y + 1.05 });
        maps.blob(x, z, 1.8, 0.3);
        return M;
      };
      const sheet = (M, x, z, ry, w = 0.5, d = 0.36) => LB.box(w, 0.012, d, 0xe8dcc0, x, 0.925, z, ry, undefined, M);
      const flags = (x0, z0, nx, nz) => {
        const P = (x, z) => [x, H(x, z) + 0.07, z];
        for (let i = 0; i < nx; i++)
          for (let j = 0; j < nz; j++) {
            const xa = x0 + i * 2,
              za = z0 + j * 2;
            if (Q() < 0.1) continue;
            SQ.quad(P(xa + 0.06, za + 0.06), P(xa + 0.06, za + 1.94), P(xa + 1.94, za + 1.94), P(xa + 1.94, za + 0.06), mix(0xb4a684, 0xcabc98, Q()));
          }
      };
      const stool = (x, z) => {
        LB.cyl(0.22, 0.26, 0.5, DARK, x, H(x, z), z, 7);
        C.push({ x, z, r: 0.3, top: H(x, z) + 0.6 });
      };
      // ---- west: the studies
      flags(-31, -3, 5, 8);
      const MA = desk(-25.2, -0.6, 0.25);
      sheet(MA, -0.2, 0.1, 0.2);
      sheet(MA, 0.45, -0.2, -0.3);
      sheet(MA, -0.1, -0.3, 1.2, 0.4, 0.3);
      LB.cyl(0.05, 0.06, 0.08, 0x2a2420, 0.95, 0.92, 0.3, 6, undefined, MA);
      rod(LB, [0.95, 0.98, 0.3], [1.15, 1.3, 0.2], 0.012, 0xf0ece0, 3, 0.03, undefined, MA);
      LB.box(0.07, 0.55, 0.07, DARK, -0.95, 0.92, -0.2, 0, undefined, MA);
      LB.cyl(0.42, 0.42, 0.04, 0xc9d6d0, -0.95, 1.5, -0.2, 16, { emissive: 0.5 }, MA, 1.25, 0);
      LB.add(new THREE.TorusGeometry(0.44, 0.035, 4, 16), DARK, MA.clone().multiply(xf(-0.95, 1.5, -0.2, 0, 1, 1, 1, 1.25 - Math.PI / 2, 0)));
      stool(-24.9, 0.9);
      // a bird, taken apart to see how it flies
      LB.ball(0.09, 0x6a5a48, 0.1, 1.0, 0.35, 1.9, 1, 1, 0, undefined, MA);
      for (const s of [-1, 1]) {
        const a = toW(MA, 0.1, 1.02, 0.35),
          b = toW(MA, 0.2, 1.08, 0.35 + s * 0.42),
          c = toW(MA, -0.05, 1.04, 0.35 + s * 0.4);
        SQ.tri([a.x, a.y, a.z], [b.x, b.y, b.z], [c.x, c.y, c.z], 0x8a7a66);
        SQ.tri([a.x, a.y, a.z], [c.x, c.y, c.z], [b.x, b.y, b.z], 0x8a7a66);
      }
      // anatomy: a skull, the bones and muscle of an arm, a flayed figure
      const MBn = desk(-28.6, 5.6, -0.35);
      sheet(MBn, 0.1, 0.2, 0.4);
      sheet(MBn, 0.2, -0.25, -0.1);
      LB.ball(0.14, 0xe2d8bc, -0.7, 1.06, 0.1, 0.9, 1, 1.1, 1, undefined, MBn);
      LB.box(0.16, 0.07, 0.14, 0xd8ccae, -0.7, 0.925, 0.2, 0, undefined, MBn);
      for (const s of [-1, 1]) LB.ball(0.036, 0x2a2420, -0.7 + s * 0.055, 1.075, 0.235, 1, 1, 1, 0, undefined, MBn);
      LB.box(0.3, 0.08, 0.3, DARK, 0.85, 0.92, 0, 0, undefined, MBn);
      for (const s of [-1, 1]) rod(LB, [0.85 + s * 0.03, 1.0, 0], [0.86 + s * 0.02, 1.45, 0], 0.024, 0xe2d8bc, 4, 0.02, undefined, MBn);
      LB.ball(0.07, 0xa8584a, 0.85, 1.17, 0.03, 1, 2.3, 1, 0, undefined, MBn);
      for (let f = -2; f <= 2; f++) rod(LB, [0.86, 1.45, 0], [0.86 + f * 0.045, 1.62, 0], 0.012, 0xe2d8bc, 3, 0.01, undefined, MBn);
      stool(-27.4, 6.6);
      {
        const x = -30.6,
          z = 2.6,
          y = H(x, z);
        LB.box(0.75, 0.95, 0.75, stoneC, x, y, z, 0.5);
        LB.box(0.9, 0.08, 0.9, MARBLE, x, y + 0.95, z, 0.5);
        figure(LP, x, y + 1.03, z, 1.4, { coat: 0xa8604a, legs: 0x9a5444, skin: 0xb87058, hair: 0xa8604a, scale: 0.6, arms: 0.55 });
        C.push({ x, z, r: 0.6, top: y + 2.2 });
      }
      // the wing on its test frame: push the lever and the linen beats
      {
        const x = -23.4,
          z = 10.4,
          RM = xf(x, H(x, z), z, -0.5);
        LB.box(1.8, 0.25, 1.1, DARK, 0, 0, 0, 0, undefined, RM);
        rod(LB, [0, 0.2, 0], [0, 2.5, 0], 0.09, woodC, 5, 0.08, undefined, RM);
        beam(LB, [-1.7, 1.15, 0], [0.25, 2.6, 0], 0.12, 0.14, TIMBER, undefined, RM);
        rod(LB, [-1.7, 1.15, 0], [-1.7, 0.25, 0], 0.02, 0x3a2a1c, 3, 0.02, undefined, RM);
        const spar = [[0.25, 2.6, 0], [1.3, 2.95, 0.05], [2.3, 3.05, 0.2], [3.2, 2.95, 0.45], [3.9, 2.75, 0.8]];
        const tips = spar.map((p, i) => [p[0] + 0.15 * i, p[1] - 0.25 - i * 0.05, p[2] + 1.7 - i * 0.22]);
        for (let i = 0; i < spar.length; i++) {
          if (i < spar.length - 1) rod(LB, spar[i], spar[i + 1], 0.045, DARK, 4, 0.035, undefined, RM);
          rod(LB, spar[i], tips[i], 0.025, TIMBER, 3, 0.015, undefined, RM);
          if (i < spar.length - 1) {
            const q = [spar[i], tips[i], tips[i + 1], spar[i + 1]].map((p) => toW(RM, p[0], p[1], p[2])).map((v) => [v.x, v.y, v.z]);
            SQ.quad(q[0], q[1], q[2], q[3], i & 1 ? 0xe6dcc0 : 0xd8ccac, true);
          }
        }
        C.push({ x, z, r: 0.8, top: H(x, z) + 2.6 });
        maps.blob(x, z, 2.5, 0.3);
      }
      // an easel with a red-chalk study
      {
        const x = -22.4,
          z = 3.2,
          EM = xf(x, H(x, z), z, -1.1);
        for (const [ox, rz] of [[-0.4, 0.13], [0.4, -0.13]]) LB.cyl(0.035, 0.035, 2.1, 0x6a4a2a, ox, 0, 0, 5, undefined, EM, 0, rz);
        LB.cyl(0.035, 0.035, 2.1, 0x6a4a2a, 0, 0, -0.55, 5, undefined, EM, 0.28, 0);
        LB.box(1.0, 1.25, 0.04, 0xe8dcc0, 0, 0.8, 0.05, 0, undefined, EM);
        for (let k = 0; k < 5; k++) LB.box(0.5 - k * 0.06, 0.025, 0.02, 0x9a5a40, -0.1 + k * 0.05, 1.75 - k * 0.17, 0.08, 0, undefined, EM);
        LB.add(new THREE.TorusGeometry(0.2, 0.014, 4, 14), 0x9a5a40, EM.clone().multiply(xf(0.12, 1.2, 0.08)));
        C.push({ x, z, r: 0.6, top: H(x, z) + 2 });
      }
      // ---- east: geometry and mechanics
      flags(21, -4, 5, 8);
      const wire = (geo, x, z, r) => {
        const y = H(x, z);
        LB.box(0.7, 1.0, 0.7, stoneC, x, y, z, 0.3);
        LB.box(0.84, 0.08, 0.84, MARBLE, x, y + 1.0, z, 0.3);
        const e = new THREE.EdgesGeometry(geo, 1).attributes.position;
        const seen = new Set();
        for (let i = 0; i < e.count; i += 2) {
          const a = [x + e.getX(i) * r, y + 1.1 + r + e.getY(i) * r, z + e.getZ(i) * r],
            b = [x + e.getX(i + 1) * r, y + 1.1 + r + e.getY(i + 1) * r, z + e.getZ(i + 1) * r];
          rod(LB, a, b, 0.028, 0x8e6c40, 4);
          for (const p of [a, b]) {
            const key = p.map((v) => v.toFixed(2)).join();
            if (seen.has(key)) continue;
            seen.add(key);
            LB.ball(0.055, DARK, p[0], p[1], p[2], 1, 1, 1, 0);
          }
        }
        C.push({ x, z, r: 0.55, top: y + 1.2 + r * 2 });
        maps.blob(x, z, 1.4, 0.3);
      };
      wire(new THREE.IcosahedronGeometry(1, 0), 23.4, -1.6, 0.62);
      wire(new THREE.DodecahedronGeometry(1, 0), 27.6, 1.0, 0.62);
      wire(new THREE.OctahedronGeometry(1, 0), 23.8, 4.4, 0.6);
      // three mirrors set to catch a face from every side
      const MC = desk(28.2, 6.6, 0.5);
      for (const [mx, mz, mr] of [[-0.7, -0.15, 0.6], [0, -0.38, 0], [0.7, -0.15, -0.6]]) {
        LB.box(0.62, 0.9, 0.05, DARK, mx, 0.92, mz, mr, undefined, MC);
        LB.box(0.52, 0.8, 0.02, 0xc9d6d0, mx + Math.sin(mr) * 0.035, 0.97, mz + Math.cos(mr) * 0.035, mr, { emissive: 0.45 }, MC);
      }
      LB.ball(0.12, 0xb8c4c0, 0, 1.04, 0.25, 1, 1, 1, 1, { emissive: 0.25 }, MC);
      stool(27.4, 8.2);
      // models: gears in mesh, the spring-driven cart
      const MD = desk(24.4, 9.4, -0.2);
      for (const [gx0, gr, gn] of [[-0.75, 0.36, 12], [-0.14, 0.22, 8]]) {
        LB.cyl(gr, gr, 0.07, 0x8a6a3a, gx0, 0.925, 0, 12, undefined, MD);
        for (let k = 0; k < gn; k++) LB.box(0.09, 0.07, 0.1, 0x8a6a3a, gx0 + Math.cos((k / gn) * 6.283) * (gr + 0.03), 0.925, Math.sin((k / gn) * 6.283) * (gr + 0.03), -(k / gn) * 6.283, undefined, MD);
        LB.cyl(0.03, 0.03, 0.2, DARK, gx0, 0.925, 0, 5, undefined, MD);
      }
      LB.box(0.6, 0.06, 0.42, woodC, 0.65, 1.06, 0.05, 0, undefined, MD);
      for (const [wx, wz] of [[0.42, -0.22], [0.42, 0.32], [0.95, 0.05]]) LB.cyl(0.13, 0.13, 0.05, DARK, wx, 1.06, wz - 0.025, 9, undefined, MD, Math.PI / 2, 0);
      for (const sz of [-1, 1]) LB.add(new THREE.TorusGeometry(0.12, 0.018, 4, 10), 0x4a4438, MD.clone().multiply(xf(0.62, 1.13, 0.05 + sz * 0.1, 0, 1, 1, 1, Math.PI / 2, 0)));
      sheet(MD, 0.2, -0.36, 0.1, 0.5, 0.3);
      stool(25.4, 10.9);
    }

    // ================= water works below the bridge: Archimedes' screw lifts the river into a canal, a lock
    // with his mitre gates lets it down again, and a bridge of nothing but leaning logs crosses the tail race
    {
      const th = Math.atan2(-RIV.uz, RIV.ux);
      const M = xf(62, 0, -120, th); // local x = downstream, z = inland
      const yL = 3.25,
        yU = 4.35,
        zc = 24;
      const W3 = (s, y, d) => {
        const p = canalP(s, d);
        return [p[0], y, p[1]];
      };
      const reach = (s0, s1, yw, top, hw = 1.5) => {
        const sm = (s0 + s1) / 2,
          len = s1 - s0;
        LB.box(len, yw - 0.04 - 2, hw * 2, 0x4a4a3a, sm, 2, zc, 0, undefined, M);
        for (const s of [-1, 1]) LB.box(len, top - 2.2, 0.55, stoneC, sm, 2.2, zc + s * (hw + 0.275), 0, undefined, M);
        WQ.quad(W3(s0, yw, zc - hw), W3(s0, yw, zc + hw), W3(s1, yw, zc + hw), W3(s1, yw, zc - hw), 0xffffff);
      };
      reach(10.5, 16, yU, yU + 0.35, 2.8);
      LB.box(0.55, yU + 0.35 - 2.2, 6.7, stoneC, 10.225, 2.2, zc, 0, undefined, M);
      for (const s of [-1, 1]) LB.box(0.55, yU + 0.35 - 2.2, 1.85, stoneC, 16.275, 2.2, zc + s * 2.425, 0, undefined, M);
      reach(16, 34, yU, yU + 0.35);
      reach(34, 43, yL, yU + 0.6);
      for (const s of [-1, 1]) LB.box(9.5, 0.14, 0.8, 0xc9bc9a, 38.5, yU + 0.6, zc + s * 1.775, 0, undefined, M);
      reach(43, 63, yL, yL + 0.3);
      // mitre gates: two leaves meeting in a point against the higher water, each swung by its balance beam
      const gate = (sg) => {
        for (const s of [-1, 1]) {
          const hx = sg,
            hz = zc + s * 1.5,
            dx = -1,
            dz = -s * 1.5,
            len = Math.hypot(dx, dz);
          // leaf, heel post and beam all stand clear above the coping of the chamber walls
          LB.box(len + 0.1, yU + 0.78 - (yL - 0.5), 0.2, woodC, hx + dx / 2, yL - 0.5, hz + dz / 2, Math.atan2(-dz, dx), undefined, M);
          beam(LB, [hx + dx, yU + 0.93, hz + dz], [hx - (dx / len) * 3.6, yU + 0.93, hz - (dz / len) * 3.6], 0.28, 0.28, DARK, undefined, M);
          LB.cyl(0.14, 0.14, yU + 1.1 - 2.4, DARK, hx, 2.4, hz, 6, undefined, M);
        }
      };
      gate(34.3);
      gate(43);
      // the tail race turns back to the river and spills down the bank
      {
        const a = [63, 24],
          b = [68.5, 18.5];
        const dx = b[0] - a[0],
          dz = b[1] - a[1],
          len = Math.hypot(dx, dz),
          ry = Math.atan2(-dz, dx),
          nx = -dz / len,
          nz = dx / len;
        const mx = (a[0] + b[0]) / 2,
          mz = (a[1] + b[1]) / 2;
        LB.box(len, yL - 0.04 - 1.4, 3, 0x4a4a3a, mx, 1.4, mz, ry, undefined, M);
        for (const s of [-1, 1]) LB.box(len + 0.6, yL + 0.3 - 1.4, 0.55, stoneC, mx + s * nx * 1.775, 1.4, mz + s * nz * 1.775, ry, undefined, M);
        WQ.quad(W3(a[0] - nx * 1.5, yL, a[1] - nz * 1.5), W3(a[0] + nx * 1.5, yL, a[1] + nz * 1.5), W3(b[0] + nx * 1.5, yL, b[1] + nz * 1.5), W3(b[0] - nx * 1.5, yL, b[1] - nz * 1.5), 0xffffff);
        for (const s of [-1, 1]) LB.cyl(0.62, 0.62, yL + 0.45 - 2.2, stoneC, 63, 2.2, zc + s * 1.9, 8, undefined, M);
        beam(LB, [68.3, yL - 0.26, 18.7], [71.9, 0.3, 15.1], 3.6, 0.4, stoneC, undefined, M);
        WQ.quad(W3(68.5 - nx * 1.3, yL, 18.5 - nz * 1.3), W3(68.5 + nx * 1.3, yL, 18.5 + nz * 1.3), W3(71.7 + nx * 1.3, 0.66, 15.3 + nz * 1.3), W3(71.7 - nx * 1.3, 0.66, 15.3 - nz * 1.3), 0xffffff);
      }
      const cA = canalP(26.5, zc),
        cB = canalP(13.25, zc);
      C.push({ x: cA[0], z: cA[1], hw: 16.8, hd: 2.15, ry: th, top: yU + 0.6 });
      C.push({ x: cB[0], z: cB[1], hw: 3.1, hd: 3.5, ry: th, top: yU + 0.4 });
      for (const s of [14, 24, 34, 44, 54]) maps.blob(...canalP(s, zc), 5, 0.25);

      // Archimedes' screw, turned by hand
      const foot = toW(M, 13.2, 0.1, 11.2),
        head = toW(M, 13.2, yU + 0.95, 20.9);
      const axis = head.clone().sub(foot),
        L = axis.length();
      const SB = new Builder();
      SB.cyl(0.13, 0.13, L + 0.8, woodC, 0, -0.2, 0, 6);
      SB.parts.push(
        gridGeo(
          88,
          1,
          (u, v) => [Math.cos(u * 11 * 6.2832) * lerp(0.13, 0.6, v), 0.3 + u * (L - 0.6), Math.sin(u * 11 * 6.2832) * lerp(0.13, 0.6, v)],
          (u, v, i) => mix(0x8e6c40, 0x5e4428, (i % 8) / 8)
        )
      );
      for (const y of [0.3, L * 0.5, L - 0.3]) SB.add(new THREE.TorusGeometry(0.6, 0.035, 4, 12), DARK, xf(0, y, 0, 0, 1, 1, 1, Math.PI / 2));
      for (let k = 0; k < 4; k++) SB.box(0.05, L - 0.6, 0.05, DARK, Math.cos(k * 1.5708) * 0.6, 0.3, Math.sin(k * 1.5708) * 0.6);
      SB.box(0.9, 0.08, 0.08, DARK, 0.4, L + 0.5, 0);
      SB.box(0.08, 0.5, 0.08, DARK, 0.85, L + 0.5, 0);
      this.waterScrew = SB.mesh(soft({ objSpace: 1, scale: 0.8, side: THREE.DoubleSide }));
      const sg = new THREE.Group();
      sg.position.copy(foot);
      sg.quaternion.setFromUnitVectors(_UP, axis.normalize());
      sg.add(this.waterScrew);
      S.add(sg);
      const post = (a, b, r = 0.08) => rod(LB, a, b, r, woodC, 4, r, undefined, M);
      post([12.4, 2.5, 20.9], [12.85, yU + 0.75, 20.9]);
      post([14.0, 2.5, 20.9], [13.55, yU + 0.75, 20.9]);
      post([12.7, yU + 0.3, 20.9], [13.7, yU + 0.3, 20.9]);
      post([12.3, 0.7, 16], [12.95, 2.45, 16]);
      post([14.1, 0.7, 16], [13.45, 2.45, 16]);
      post([12.8, 2.05, 16], [13.6, 2.05, 16]);
      post([12.5, -1.6, 11.6], [12.5, 1.2, 11.6], 0.1);
      post([13.9, -1.6, 11.6], [13.9, 1.2, 11.6], 0.1);
      beam(LB, [13.2, yU + 0.72, 20.7], [13.2, yU + 0.45, 21.7], 0.5, 0.08, TIMBER, undefined, M);
      person(LP, M.clone().multiply(xf(14.3, yU + 0.35, 21, -Math.PI / 2)), { robe: 0x5a4a2a, hands: [[-0.1, 0.3, 0.45], [0.1, 0.2, 0.45]] });

      // the self-supporting bridge
      // both feet on level ground either side of the tail race
      const s0 = 52,
        d0 = 20.4,
        d1 = 28,
        yg = 2.95,
        n = 6;
      const node = (k) => [d0 + ((d1 - d0) * k) / n, yg + 1.9 * Math.sin((Math.PI * k) / n)];
      const logC = (x, y, z) => mix(0x6a4e2e, 0x94744a, vnoise(y * 1.5, x * 4 + z * 4));
      for (let k = 0; k <= n - 2; k++) {
        const a = node(k),
          b = node(k + 2),
          off = k & 1 ? 0.8 : 1.15;
        const ad = a[0] - (b[0] - a[0]) * 0.12,
          ay = a[1] - (b[1] - a[1]) * 0.12,
          bd = b[0] + (b[0] - a[0]) * 0.12,
          by = b[1] + (b[1] - a[1]) * 0.12;
        for (const s of [-1, 1]) rod(LB, [s0 + s * off, ay + 0.14, ad], [s0 + s * off, by + 0.14, bd], 0.15, logC, 6, 0.14, undefined, M, true);
      }
      for (let k = 0; k <= n; k++) {
        const p = node(k),
          y = p[1] + (k % 2 ? 0.42 : -0.12);
        rod(LB, [s0 - 1.7, y, p[0]], [s0 + 1.7, y, p[0]], 0.15, logC, 6, 0.15, undefined, M, true);
      }
      for (let k = 0; k < n; k++) {
        const a = node(k),
          b = node(k + 1),
          p = canalP(s0, (a[0] + b[0]) / 2);
        beam(LB, [s0, a[1] + 0.27, a[0]], [s0, b[1] + 0.27, b[0]], 1.5, 0.06, 0x86683e, undefined, M);
        PL.push({ minx: p[0] - 1.3, maxx: p[0] + 1.3, minz: p[1] - 1.3, maxz: p[1] + 1.3, y: (a[1] + b[1]) / 2 + 0.3 });
      }
    }

    // ================= the paddle boat, cranked up and down the reach below the bridge
    {
      const BT = new Builder();
      const hull = new THREE.IcosahedronGeometry(1, 1);
      const hp = hull.attributes.position;
      for (let k = 0; k < hp.count; k++) if (hp.getY(k) > 0.12) hp.setY(k, 0.12);
      hull.computeVertexNormals();
      BT.add(hull, (x, y) => mix(0x5a4026, 0x8e6c40, clamp(y + 0.9)), xf(0, 0, 0, 0, 3.9, 0.9, 1.2));
      const rim = (k) => [Math.cos((k / 14) * 6.2832) * 3.86, 0.2, Math.sin((k / 14) * 6.2832) * 1.18];
      for (let k = 0; k < 14; k++) rod(BT, rim(k), rim(k + 1), 0.055, DARK, 4);
      BT.box(0.35, 0.3, 1.7, TIMBER, -1.3, 0.1, 0);
      BT.box(0.5, 0.75, 0.5, woodC, 0.3, 0.1, 0);
      BT.cyl(0.5, 0.5, 0.1, 0x8a6a3a, 0.3, 0.9, -0.05, 12, undefined, undefined, Math.PI / 2, 0);
      BT.box(0.75, 0.75, 0.06, DARK, -4.05, -0.5, 0);
      rod(BT, [3.7, 0.1, 0], [4.25, 0.85, 0], 0.07, DARK, 4, 0.05);
      person(BT, xf(-1.25, 0.12, 0, Math.PI / 2), { pose: 'sit', robe: 0x3a557e, hair: 0x4a3422, hands: [[-0.05, -0.1, 0.5], [0.05, -0.1, 0.5]] });
      const WB = new Builder();
      WB.cyl(0.07, 0.07, 3.9, DARK, 0, 0, -1.95, 6, undefined, undefined, Math.PI / 2, 0);
      for (const side of [-1, 1]) {
        const wz = side * 1.62;
        for (const o of [-0.22, 0.22]) WB.add(new THREE.TorusGeometry(0.95, 0.04, 4, 14), DARK, xf(0, 0, wz + o));
        for (let k = 0; k < 8; k++) {
          const RZ = xf(0, 0, 0, 0, 1, 1, 1, 0, (k * Math.PI) / 4);
          if (k < 4) WB.box(0.07, 1.9, 0.07, TIMBER, 0, -0.95, wz, 0, undefined, RZ);
          WB.box(0.05, 0.36, 0.5, woodC, 0, 0.75, wz, 0, undefined, RZ);
        }
      }
      const mat = soft({ objSpace: 1, scale: 0.8 });
      this.boat = new THREE.Group();
      this.boat.add(BT.mesh(mat));
      this.boatWheels = WB.mesh(mat);
      this.boatWheels.position.set(0.3, 0.45, 0);
      this.boat.add(this.boatWheels);
      S.add(this.boat);
    }

    // ---- into the scene: one mesh per kind of surface
    LB.parts.push(SQ.geometry());
    LG.parts.push(GQ.geometry());
    const meshes = [
      LB.mesh(soft({ scale: 0.3, emissive: 1.5, big: 0.25, hueVar: 0.05, contrast: 0.14 })),
      LT.mesh(soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.5, hueVar: 0.4, rim: 0.2 })),
      LG.mesh(soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.36 })),
      LP.mesh(soft({ scale: 0.8, rim: 0.2 })),
    ];
    for (const m of meshes) S.add(m);
    const cw = new THREE.Mesh(WQ.geometry(), waterMaterial({ stroke: strokes.soft, deep: 0x2f4a44, shallow: 0x5f8a7a, reflect: 0xb8c49a, glint: 0xfff0c0, scale: 0.09, glintAmt: 0.6, flow: 0.01 }));
    cw.material.side = THREE.DoubleSide;
    cw.frustumCulled = false;
    S.add(cw);
    // triangle count of everything added here, for checking against the budget
    this.leoTris = [...meshes, cw, this.airscrew, this.chute, this.waterScrew, ...this.boat.children].reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);
  }

  // the notebooks in motion
  tickNotebooks(time) {
    this.airscrew.rotation.y = time * 0.4;
    this.waterScrew.rotation.y = time * 1.6;
    const pa = time * 0.03;
    this.chute.position.set(-72 + Math.cos(pa) * 62, 50 + Math.sin(pa * 2 + 1) * 9, 52 + Math.sin(pa) * 40);
    this.chute.rotation.set(Math.cos(time * 0.53) * 0.07, pa * 0.6, Math.sin(time * 0.7) * 0.09);
    const ba = time * 0.05,
      vs = -22 * Math.sin(ba),
      vd = 3.2 * Math.cos(ba);
    const bp = canalP(48 + 22 * Math.cos(ba), 3.2 * Math.sin(ba));
    this.boat.position.set(bp[0], this.waterY + 0.38 + Math.sin(time * 1.3) * 0.04, bp[1]);
    this.boat.rotation.set(Math.sin(time * 0.9) * 0.03, Math.atan2(-(RIV.uz * vs + RIV.ux * vd), RIV.ux * vs - RIV.uz * vd), 0);
    this.boatWheels.rotation.z = -time * 1.2;
  }

  onEnter() {
    if (!this.done) this.smile = 0;
  }

  tick(dt, time) {
    this.wheel.rotation.x = time * 0.5;
    this.tickNotebooks(time);
    for (const f of this.flyers) {
      const a = time * f.sp + f.ph;
      f.m.position.set(f.cx + Math.cos(a) * f.r, f.y + Math.sin(a * 2.3) * 5, f.cz + Math.sin(a) * f.r);
      f.m.rotation.set(0, -a, Math.sin(a * 2.3) * 0.2 - 0.25);
    }
    if (this.stage === 'finale' || this.done) this.smile = damp(this.smile, 1, 0.4, dt);
    const vis = this.restore > 0.5 || this.waves.some((w) => w.max > 0 && Math.hypot(w.pos.x, w.pos.z + 3.3) < w.r);
    this.lisa.plain.visible = this.lisa.smiling.visible = vis && !this.lisaModel;
    this.lisa.plain.material.opacity = 1 - this.smile;
    this.lisa.smiling.material.opacity = this.smile;
  }
}
