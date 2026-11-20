import * as THREE from 'three';
import { World, ghostMaterial } from '../engine/world.js';
import { Sky } from '../engine/sky.js';
import { paintMaterial, waterMaterial, glowPoints, GroundMaps } from '../engine/paint.js';
import { Builder, terrain, ribbon, patch, gridGeo, mountainRing, cypress, blobTree, house, lampPost, figure, mix, jitter, xf } from '../engine/build.js';
import { rng, fbm, vnoise, smooth, clamp, lerp } from '../engine/gl.js';

// ------------------------------------------------------------------
// The sky is the painting: a wind field with vortices around every star,
// drawn as thousands of dashes by integrating noise along the wind.
// ------------------------------------------------------------------
const SKY = /* glsl */ `
#define NV 14
uniform vec4 uVort[NV];   // xyz centre, w gaussian sharpness
uniform vec4 uVortP[NV];  // spin, inward pull, brightness, kind (0 swirl, 1 star, 2 moon, 3 morning star)
uniform vec3 uMoon;

vec3 foldD(vec3 d, out float fr){ fr = step(d.z, 0.0); return mix(vec3(-d.x, d.y, -d.z), d, fr); }

float waveAt(vec3 d){
  float az = atan(d.x, -d.z);
  return (sin(az * 6.0 + d.y * 5.0) * 0.42 + sin(az * 14.0 - d.y * 9.0 + 1.3) * 0.22) * smoothstep(0.04, 0.3, d.y);
}
vec3 bend(vec3 f, vec3 d, vec4 v, vec4 q){
  float fall = exp(-(1.0 - dot(d, v.xyz)) * v.w);
  vec3 tg = cross(v.xyz, d);
  tg *= inversesqrt(max(dot(tg, tg), 1e-6));
  vec3 inw = v.xyz - d * dot(v.xyz, d);
  inw *= inversesqrt(max(dot(inw, inw), 1e-6));
  return mix(f, tg * q.x + inw * q.y, min(fall * 1.9, 1.0));
}
// only the two nearest vortices matter to any one dash
vec3 flowSel(vec3 dr, vec4 v0, vec4 q0, vec4 v1, vec4 q1, float wav){
  float fr = step(dr.z, 0.0);
  vec3 d = mix(vec3(-dr.x, dr.y, -dr.z), dr, fr);
  vec3 e = vec3(-d.z, 0.0, d.x);
  e *= inversesqrt(max(dot(e, e), 1e-6));
  vec3 f = e + cross(e, d) * wav;
  f = bend(f, d, v1, q1);
  f = bend(f, d, v0, q0);
  f -= d * dot(f, d);
  f *= inversesqrt(max(dot(f, f), 1e-6));
  return mix(vec3(-f.x, f.y, -f.z), f, fr);
}

vec3 skyPal(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(vec3(0.025, 0.05, 0.21), vec3(0.05, 0.15, 0.48), smoothstep(0.0, 0.2, t));
  c = mix(c, vec3(0.10, 0.31, 0.74), smoothstep(0.18, 0.4, t));
  c = mix(c, vec3(0.27, 0.54, 0.88), smoothstep(0.38, 0.58, t));
  c = mix(c, vec3(0.66, 0.84, 0.93), smoothstep(0.56, 0.76, t));
  c = mix(c, vec3(0.98, 0.95, 0.74), smoothstep(0.8, 1.0, t));
  return c;
}

float kern(float s){
  float hann = 0.5 + 0.5 * cos(3.14159 * s);
  float rip = 0.5 + 0.5 * cos(6.28318 * (s * 1.15 - uTime * 0.2));
  return hann * (0.25 + rip);
}

vec3 skyColor(vec3 dIn){
  vec3 d = normalize(vec3(dIn.x, abs(dIn.y) + 0.004, dIn.z));
  float fr; vec3 df = foldD(d, fr);

  // ---- where the light is, and which vortices rule this spot
  float T = 0.31 - 0.15 * smoothstep(0.05, 0.95, d.y);
  T += 0.44 * exp(-d.y * 6.5);
  T += (texture(uNoise3, d * 0.16).b - 0.5) * 0.2;
  float az = atan(df.x, -df.z);
  float bandEl = 0.40 + 0.11 * sin(az * 2.4 + 0.6);
  float band = exp(-pow((asin(clamp(df.y, -1.0, 1.0)) - bandEl) / 0.085, 2.0)) * smoothstep(-1.5, -0.5, az) * (1.0 - smoothstep(0.0, 0.5, az));
  T += band * 0.3;

  int i0 = 0, i1 = 0;
  float a0 = 0.0, a1 = 0.0;
  float halo = 0.0, ringMod = 0.0, pencil = 0.0;
  vec3 haloCol = vec3(0.98, 0.84, 0.28);
  for (int i = 0; i < NV; i++){
    vec4 v = uVort[i]; vec4 q = uVortP[i];
    float x = (1.0 - dot(df, v.xyz)) * v.w;
    float fall = exp(-x);
    if (fall > a0){ a1 = a0; i1 = i0; a0 = fall; i0 = i; }
    else if (fall > a1){ a1 = fall; i1 = i; }
    if (fall < 0.002) continue;
    if (q.w < 0.5){
      vec3 U = normalize(cross(vec3(0.0, 1.0, 0.0), v.xyz));
      vec3 Vv = cross(v.xyz, U);
      float ang = atan(dot(df, Vv), dot(df, U));
      float arms = 0.5 + 0.5 * cos(ang * 2.0 * q.x - sqrt(x) * 6.5 + 1.0 + uTime * 0.25 * q.x);
      T += q.z * fall * (0.2 + 0.8 * arms);
      pencil += fall * arms * 0.5;
    } else {
      float g = q.z;
      if (q.w > 2.5) g *= uFinal;
      if (q.w > 1.5 && q.w < 2.5) g *= fr;
      float pulse = 1.0 + 0.1 * sin(uTime * 1.2 + float(i) * 2.1);
      float h = g * exp(-x * 1.45 * pulse);
      float rings = 0.5 + 0.5 * cos(sqrt(x) * 9.5 - uTime * 0.8 + float(i));
      T += g * fall * 0.28 * (0.5 + 0.5 * rings);
      pencil += fall * rings * 0.6 * step(q.w, 2.5);
      if (h > halo){
        halo = h; ringMod = rings;
        haloCol = q.w > 2.5 ? vec3(1.0, 0.98, 0.9) : (q.w > 1.5 ? vec3(0.99, 0.76, 0.2) : mix(vec3(0.99, 0.87, 0.3), vec3(0.98, 0.72, 0.2), fract(float(i) * 0.37)));
      }
    }
  }

  // ---- dashes: integrate noise along the wind
  const int N = 8;
  const float H = 0.0055;
  const float FREQ = 1.9;
  vec4 v0 = uVort[i0], q0 = uVortP[i0], v1 = uVort[i1], q1 = uVortP[i1];
  float wav = waveAt(df);
  vec3 f0 = flowSel(d, v0, q0, v1, q1, wav);
  float w = kern(0.0);
  vec4 acc = texture(uNoise3, d * FREQ) * w;
  float ws = w;
  vec3 p = d, f = f0;
  for (int i = 1; i <= N; i++){
    p = normalize(p + f * H);
    f = flowSel(p, v0, q0, v1, q1, wav);
    w = kern(float(i) / float(N));
    acc += texture(uNoise3, p * FREQ) * w; ws += w;
  }
  p = d; f = f0;
  for (int i = 1; i <= N; i++){
    p = normalize(p - f * H);
    f = flowSel(p, v0, q0, v1, q1, wav);
    w = kern(-float(i) / float(N));
    acc += texture(uNoise3, p * FREQ) * w; ws += w;
  }
  vec4 L = clamp((acc / ws - 0.5) * 3.1 + 0.5, 0.0, 1.0);
  // a loaded brush leaves flat dabs, not gradients
  float lv = L.r * 3.0;
  float dab = (floor(lv) + smoothstep(0.3, 0.7, fract(lv))) / 3.0;

  // ---- paint
  float idx = T + (dab - 0.5) * 0.5;
  vec3 col = skyPal(idx);
  col = mix(col, vec3(0.34, 0.66, 0.6), smoothstep(0.62, 0.9, L.g) * 0.34 * smoothstep(0.3, 0.62, idx));
  col *= 1.0 - 0.42 * smoothstep(0.62, 0.8, L.b) * (1.0 - sat(halo * 1.4));
  float hIdx = halo * (0.78 + 0.3 * ringMod) + (dab - 0.5) * 0.4;
  vec3 hc = mix(vec3(0.40, 0.72, 0.60), haloCol, smoothstep(0.2, 0.42, hIdx));
  hc = mix(hc, vec3(0.99, 0.6, 0.14), smoothstep(0.45, 0.6, hIdx) * (1.0 - smoothstep(0.6, 0.75, hIdx)) * 0.5);
  hc = mix(hc, vec3(1.0, 0.97, 0.76), smoothstep(0.74, 1.0, hIdx));
  col = mix(col, hc, smoothstep(0.15, 0.4, hIdx));
  col += hc * smoothstep(0.7, 1.05, halo) * 0.5;

  // crescent
  vec3 MU = normalize(cross(vec3(0.0, 1.0, 0.0), uMoon));
  vec3 MV = cross(uMoon, MU);
  vec2 mp = vec2(dot(df, MU), dot(df, MV));
  float disc = 1.0 - smoothstep(0.044, 0.05, length(mp));
  float bite = 1.0 - smoothstep(0.036, 0.043, length(mp - vec2(-0.021, 0.012)));
  float cres = disc * (1.0 - bite) * fr * step(0.0, dot(df, uMoon));
  col = mix(col, vec3(1.0, 0.7, 0.14) * (1.15 + 0.4 * dab), cres);

  // ---- before the colour comes back: pencil on paper
  float hatch = smoothstep(0.45, 0.8, L.a);
  vec3 sk = uPaper * (1.0 - hatch * (0.2 + 0.25 * sat(T)) - sat(pencil) * 0.16 * (0.5 + L.b));
  sk = mix(sk, uInk, cres * 0.35);
  float m = paintedIn(d, L.r);
  col = mix(sk, col, m);
  if (dIn.y < 0.0) col *= 0.75;
  return col;
}
`;

const D2R = Math.PI / 180;
const dirOf = (az, el) => new THREE.Vector3(Math.sin(az * D2R) * Math.cos(el * D2R), Math.sin(el * D2R), -Math.cos(az * D2R) * Math.cos(el * D2R));

// az, el, radius (deg), spin, inward, brightness, kind
const FEATURES = [
  [0, 19, 8.6, -1, 0.28, 0.5, 0],
  [11.5, 13.5, 5.2, 1, 0.22, 0.42, 0],
  [25, 29, 6.4, 1, 0, 1, 2],
  [-12.5, 12, 3.5, 1, 0, 1.1, 3],
  [-27, 31, 3.1, 1, 0, 0.95, 1],
  [-19.5, 24.5, 2.7, -1, 0, 0.85, 1],
  [-13, 32.5, 3.2, 1, 0, 1, 1],
  [-8, 24.5, 2.6, -1, 0, 0.8, 1],
  [-3, 33, 2.9, 1, 0, 0.9, 1],
  [7, 31.5, 2.8, -1, 0, 0.85, 1],
  [15.5, 26, 2.6, 1, 0, 0.8, 1],
  [-31, 17, 2.5, 1, 0, 0.8, 1],
  [20, 16.5, 2.5, -1, 0, 0.8, 1],
  [38, 20, 3.0, 1, 0, 0.9, 1],
];

// ------------------------------------------------------------------
// The rest of Vincent. The land around the village is laid out with his
// other canvases: Arles, Saint-Rémy and Auvers within walking distance.
// Local helpers first; all of them are cheap in triangles.
// ------------------------------------------------------------------
const WL = -5; // water level of the canal and of the Rhône
const BRIDGE_X = 26.5;
const WARM = [0xffd56b, 0xffb84d, 0xffe6a3, 0xffc861];

// the canal runs east-west north of the village and widens into the river
function channel(x) {
  const t = smooth(40, 64, x);
  const e = smooth(-64, -46, x) * (1 - smooth(108, 124, x));
  return { e, zc: -123 - 11 * t, hw: (4.5 + 13.5 * t) * e, bk: 4 + 3 * t };
}
function riverAt(x, z) {
  if (x < -64 || x > 124 || z < -178 || z > -90) return null;
  const c = channel(x);
  if (c.e <= 0) return null;
  const d = Math.abs(z - c.zc);
  c.carve = (1 - smooth(c.hw, c.hw + c.bk, d)) * smooth(0, 0.25, c.e);
  c.lev = (1 - smooth(c.hw + c.bk, c.hw + c.bk + 16, d)) * c.e;
  return c;
}

// footpaths of my own, kept apart from the cobbled roads
const TRACKS = [
  { pts: [[-2, 83], [10, 89], [24, 99], [50, 104], [76, 102], [90, 90], [104, 82]], w: 2.6 }, // through the sunflowers to the orchard
  { pts: [[26, -110], [26.5, -116]], w: 3.4 }, // down to the drawbridge
  { pts: [[26.5, -131], [29, -142], [42, -156], [62, -162], [86, -162], [102, -158]], w: 2.8 }, // the far bank of the Rhône
  { pts: [[92, -34], [100, -33], [108, -30], [128, -29], [150, -27]], w: 2.4 }, // into the vineyard
  { pts: [[-56, -34], [-57, -50], [-63, -62], [-71, -79], [-71.9, -81.8]], w: 2.4 }, // past the haystacks to the sower's field
  // Wheatfield with Crows: three red tracks forking into the corn
  { pts: [[-103, -18], [-118, -21], [-127, -17], [-138, -22]], w: 2.6, red: 1 },
  { pts: [[-103, -18], [-112, -29], [-116, -40], [-126, -49]], w: 2.4, red: 1 },
  { pts: [[-103, -18], [-112, -8], [-122, -3], [-130, 6]], w: 2.4, red: 1 },
];
// ground reserved for a landmark: the scattered trees stay out of it  [x0, x1, z0, z1]
const KEEP = [
  [16, 30.5, -49, -34.5], // café terrace
  [23, 82, 83, 126], // sunflowers
  [86, 126, 63, 101], // almond orchard
  [105, 152, -53, -7], // red vineyard
  [-110, -66, -113, -79], // the sower's field
  [-82, -58, -80, -54], // haystacks
  [18, 36, -138, -106], // drawbridge
];

const _cc = new Map();
const C = (h) => {
  if (h.isColor) return h;
  let c = _cc.get(h);
  if (!c) _cc.set(h, (c = new THREE.Color(h)));
  return c;
};

// loose triangles with a colour, glow and sway per corner: leaves, petals, rails.
// a corner is [x, y, z, sway, colour]
class Raw {
  constructor() {
    this.p = [];
    this.c = [];
    this.d = [];
  }
  tri(a, b, c, col, em = 0) {
    for (const v of [a, b, c]) {
      const k = C(v[4] ?? col);
      this.p.push(v[0], v[1], v[2]);
      this.c.push(k.r, k.g, k.b);
      this.d.push(em, v[3] ?? 0, 0, 1);
    }
  }
  quad(a, b, c, d, col, em = 0) {
    this.tri(a, b, c, col, em);
    this.tri(a, c, d, col, em);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aData', new THREE.Float32BufferAttribute(this.d, 4));
    g.computeVertexNormals();
    return g;
  }
  mesh(material) {
    const m = new THREE.Mesh(this.geometry(), material);
    m.frustumCulled = false;
    return m;
  }
}

// a sheet of flat-coloured quads laid over the ground (plough furrows, strips, planks)
function drape(H, cx, cz, ry, len, wid, colFn, { lift = 0.22, step = 2.4, cols = 2 } = {}) {
  const rows = Math.max(1, Math.round(len / step)),
    c = Math.cos(ry),
    s = Math.sin(ry);
  return gridGeo(
    rows,
    cols,
    (u, v) => {
      const lx = (v - 0.5) * wid,
        lz = (u - 0.5) * len;
      const x = cx + lx * c + lz * s,
        z = cz - lx * s + lz * c;
      return [x, H(x, z) + lift, z];
    },
    (u, v, i, j) => C(colFn(i, j))
  );
}

const PETAL = [0xf7c81e, 0xffd93a, 0xeaa016, 0xf2b61a, 0xffe45a];
function flowerHead(F, cx, cy, cz, yaw, tilt, r, sw, R, em = 0.3) {
  const ct = Math.cos(tilt),
    nx = Math.sin(yaw) * ct,
    ny = Math.sin(tilt),
    nz = Math.cos(yaw) * ct;
  const ux = Math.cos(yaw),
    uz = -Math.sin(yaw);
  const vx = ny * uz,
    vy = nz * ux - nx * uz,
    vz = -ny * ux;
  const at = (a, rad, f) => [cx + (ux * Math.cos(a) + vx * Math.sin(a)) * rad + nx * f, cy + vy * Math.sin(a) * rad + ny * f, cz + (uz * Math.cos(a) + vz * Math.sin(a)) * rad + nz * f, sw];
  const ph = R() * 6.283,
    c1 = PETAL[(R() * 5) | 0],
    c2 = PETAL[(R() * 5) | 0];
  const N = 12,
    ctr = [cx, cy, cz, sw];
  let prev = at(ph, r, 0.04);
  for (let i = 1; i <= N; i++) {
    const cur = at(ph + (i / N) * 6.283, r * (i % 2 ? 0.74 : 1), 0.04);
    F.tri(ctr, prev, cur, i % 2 ? c1 : c2, em);
    prev = cur;
  }
  const b = [cx + nx * 0.08, cy + ny * 0.08, cz + nz * 0.08, sw];
  prev = at(ph, r * 0.44, 0.06);
  for (let i = 1; i <= 6; i++) {
    const cur = at(ph + (i / 6) * 6.283, r * 0.44, 0.06);
    F.tri(b, prev, cur, i % 2 ? 0x5a3414 : 0x80501c);
    prev = cur;
  }
}
function sunflower(F, x, y, z, h, yaw, r, R, em) {
  const tx = x + (R() - 0.5) * 0.3,
    tz = z + (R() - 0.5) * 0.3,
    ty = y + h,
    sw = 0.08 + h * 0.05,
    w = 0.05;
  F.quad([x - w, y, z, 0], [x + w, y, z, 0], [tx + w * 0.7, ty, tz, sw], [tx - w * 0.7, ty, tz, sw], 0x3f7a2e);
  F.quad([x, y, z - w, 0], [x, y, z + w, 0], [tx, ty, tz + w * 0.7, sw], [tx, ty, tz - w * 0.7, sw], 0x2f6428);
  for (let i = 0; i < 2; i++) {
    const a = yaw + 1.57 + i * 3.14 + (R() - 0.5),
      t = 0.3 + R() * 0.35,
      l = 0.45 + R() * 0.3;
    const bx = lerp(x, tx, t),
      by = y + h * t,
      bz = lerp(z, tz, t),
      dx = Math.cos(a),
      dz = Math.sin(a),
      s = sw * t;
    F.tri([bx, by, bz, s], [bx + dx * l - dz * 0.17, by + 0.12, bz + dz * l + dx * 0.17, s], [bx + dx * l * 0.9 + dz * 0.17, by - 0.14, bz + dz * l * 0.9 - dx * 0.17, s], i ? 0x347a36 : 0x2a6a40);
  }
  flowerHead(F, tx, ty, tz, yaw, 0.08 + R() * 0.38, r, sw, R, em);
}
// cut flowers in a jar
function bouquet(F, B, x, y, z, R, { n = 6, r = 0.13, s = 1, vase = 0xd9b030 } = {}) {
  B.cyl(0.07 * s, 0.09 * s, 0.24 * s, vase, x, y, z, 6);
  for (let i = 0; i < n; i++) {
    const a = R() * 6.283,
      d = (0.07 + R() * 0.17) * s,
      hy = y + (0.4 + R() * 0.32) * s;
    const hx = x + Math.cos(a) * d,
      hz = z + Math.sin(a) * d;
    F.tri([x - 0.014 * s, y + 0.22 * s, z], [x + 0.014 * s, y + 0.22 * s, z], [hx, hy, hz], 0x3f7a2e);
    flowerHead(F, hx, hy, hz, Math.atan2(Math.cos(a), Math.sin(a)), 0.45 + R() * 0.6, r * s * (0.8 + R() * 0.45), 0, R, 0.25);
  }
}
const VINE = [0xc2281a, 0xe0541e, 0xf0a020, 0x8a1a2a, 0xd93a22, 0xf2c530];
function vine(F, x, y, z, R) {
  const h = 0.9 + R() * 0.5,
    r = 0.55 + R() * 0.3,
    n = 5,
    ph = R() * 6.283;
  const top = [x + (R() - 0.5) * 0.3, y + h, z + (R() - 0.5) * 0.3, 0.06];
  const ring = [];
  for (let i = 0; i < n; i++) {
    const a = ph + (i / n) * 6.283,
      rr = r * (0.65 + R() * 0.6);
    ring.push([x + Math.cos(a) * rr, y + 0.02 + R() * 0.1, z + Math.sin(a) * rr, 0.02, VINE[(R() * 6) | 0]]);
  }
  for (let i = 0; i < n; i++) F.tri(ring[i], ring[(i + 1) % n], top, VINE[(R() * 4) | 0]);
  F.tri([x - 0.05, y, z], [x + 0.05, y, z], [x, y + h * 0.7, z], 0x2a1c24);
}
// a slim cypress in a quarter of the triangles of the big ones
function flame(F, x, y, z, h, r, R, dark = 0x0b1c1a, mid = 0x1c4a38) {
  const rings = 7,
    seg = 7,
    tw = R() * 6,
    pts = [];
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;
    const prof = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85) * (1 - t * 0.25) + 0.02;
    const row = [];
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * 6.283 + t * 2.4 + tw;
      const rr = r * prof * (1 + (vnoise(s * 1.7 + tw, k * 0.9) - 0.5) * 0.6);
      row.push([x + Math.cos(a) * rr + Math.sin(t * 3 + tw) * r * 0.25 * t, y + t * h, z + Math.sin(a) * rr, t * t * 0.5, vnoise(s * 2.1 + tw, k * 1.3) > 0.5 ? mid : dark]);
    }
    pts.push(row);
  }
  for (let k = 0; k < rings; k++) for (let s = 0; s < seg; s++) F.quad(pts[k][s], pts[k + 1][s], pts[k + 1][(s + 1) % seg], pts[k][(s + 1) % seg], dark);
}
function hedge(F, H, x0, z0, x1, z1, h, w, R, lo = 0x123628, hi = 0x2f6f48) {
  const len = Math.hypot(x1 - x0, z1 - z0),
    n = Math.max(2, Math.round(len / 2.6));
  const nx = (-(z1 - z0) / len) * w * 0.5,
    nz = ((x1 - x0) / len) * w * 0.5;
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      x = lerp(x0, x1, t),
      z = lerp(z0, z1, t),
      y = H(x, z) - 0.2;
    const hh = h * (0.8 + R() * 0.45) * (i === 0 || i === n ? 0.35 : 1);
    const cur = [
      [x - nx, y, z - nz, 0, lo],
      [x - nx * 0.7, y + hh, z - nz * 0.7, 0.05, hi],
      [x + nx * 0.7, y + hh, z + nz * 0.7, 0.05, hi],
      [x + nx, y, z + nz, 0, lo],
    ];
    if (prev) for (let k = 0; k < 3; k++) F.quad(prev[k], cur[k], cur[k + 1], prev[k + 1], lo);
    prev = cur;
  }
}
// posts and two rails along a line of [x, z] points
function fence(F, H, pts, R, col = 0x9a8d6c) {
  let prev = null;
  for (let s = 0; s < pts.length - 1; s++) {
    const [ax, az] = pts[s],
      [bx, bz] = pts[s + 1];
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 2.7));
    for (let i = s ? 1 : 0; i <= n; i++) {
      const x = lerp(ax, bx, i / n),
        z = lerp(az, bz, i / n),
        y = H(x, z) - 0.1;
      const lx = (R() - 0.5) * 0.14,
        lz = (R() - 0.5) * 0.14,
        h = 1.2 + R() * 0.15;
      F.quad([x - 0.06, y, z], [x + 0.06, y, z], [x + 0.06 + lx, y + h, z + lz], [x - 0.06 + lx, y + h, z + lz], col);
      F.quad([x, y, z - 0.06], [x, y, z + 0.06], [x + lx, y + h, z + 0.06 + lz], [x + lx, y + h, z - 0.06 + lz], col);
      if (prev) for (const ry of [0.55, 0.98]) F.quad([prev[0], prev[1] + ry, prev[2]], [x, y + ry, z], [x, y + ry + 0.1, z], [prev[0], prev[1] + ry + 0.1, prev[2]], col);
      prev = [x, y, z];
    }
  }
}
function haystack(B, x, y, z, r, h, R) {
  const c1 = jitter(0xd9a838, R, 0.08);
  B.cyl(r * 0.95, r, h * 0.55, (px, py) => mix(0xa87a26, c1, clamp(py / (h * 0.55) + 0.5)), x, y - 0.2, z, 9);
  B.cyl(r * 0.12, r * 1.08, h * 0.6, (px, py) => mix(c1, 0xf4d970, clamp(py / (h * 0.6) + 0.5)), x, y - 0.2 + h * 0.55, z, 9);
}
// rx, rz that point a cylinder along a unit vector
const aim = (dx, dy, dz) => [Math.atan2(dz, dy), -Math.asin(clamp(dx, -1, 1))];
const BLOSSOM = [0xfbf5ee, 0xf7e3e6, 0xf3c8d6, 0xffffff];
function almond(T, F, x, y, z, R) {
  const bark = 0x34262e,
    th = 1.2 + R() * 0.5,
    ty = y + th - 0.1;
  T.cyl(0.12, 0.2, th + 0.2, bark, x, y - 0.2, z, 5);
  const n = 4 + ((R() * 2) | 0),
    a0 = R() * 6.283;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * 6.283 + (R() - 0.5) * 0.6,
      t = 0.55 + R() * 0.5,
      len = 1.7 + R() * 0.9;
    const dx = Math.sin(t) * Math.cos(a),
      dy = Math.cos(t),
      dz = Math.sin(t) * Math.sin(a);
    const [rx, rz] = aim(dx, dy, dz);
    T.cyl(0.035, 0.09, len, bark, x, ty, z, 4, undefined, undefined, rx, rz);
    for (const f of [0.5, 0.78, 1.02]) {
      const br = (0.34 + R() * 0.26) * (f > 1 ? 0.85 : 1),
        col = BLOSSOM[(R() * 4) | 0];
      T.ball(br, (px, py) => mix(0xf0b4ca, col, clamp((py / br) * 0.6 + 0.6)), x + dx * len * f + (R() - 0.5) * 0.3, ty + dy * len * f + (R() - 0.3) * 0.3, z + dz * len * f + (R() - 0.5) * 0.3, 1, 0.72, 1, 1, { emissive: 0.26, sway: 0.18 });
    }
  }
  // a few petals let go
  for (let i = 0; i < 8; i++) {
    const a = R() * 6.283,
      d = 0.4 + R() * 2.6;
    const px = x + Math.cos(a) * d,
      pz = z + Math.sin(a) * d,
      py = y + (i < 4 ? 0.22 : 0.6 + R() * 2.2);
    F.tri([px, py, pz, 0.1], [px + 0.15, py + 0.02, pz + 0.05, 0.1], [px + 0.04, py + 0.04, pz + 0.16, 0.1], BLOSSOM[i & 3], 0.2);
  }
}
// a small figure that can stoop, sit, stride and reach, at a third of the cost of the village folk
function person(B, x, y, z, ry, o = {}) {
  const s = o.scale ?? 1,
    bend = o.bend ?? 0,
    reach = o.reach ?? 0.1,
    d = o.data;
  const M = xf(x, y, z, ry, s, s, s);
  const coat = o.coat ?? 0x2f4f9a,
    legs = o.legs ?? 0x1c2440,
    skin = o.skin ?? 0xe0b090,
    hatCol = o.hatCol ?? 0xe2c46a;
  let hip = 0.86;
  if (o.sit) {
    hip = 0.5;
    for (const sx of [-0.11, 0.11]) {
      B.box(0.13, 0.12, 0.42, legs, sx, 0.42, 0.2, 0, d, M);
      B.cyl(0.07, 0.08, 0.46, legs, sx, 0, 0.4, 4, d, M);
    }
  } else if (o.dress) B.cyl(0.17, 0.4, hip + 0.06, o.skirt ?? coat, 0, 0, 0, 6, d, M);
  else for (const sx of [-1, 1]) B.cyl(0.1, 0.085, hip + 0.04, legs, sx * 0.11, hip + 0.04, 0, 5, d, M, Math.PI + sx * (o.stride ?? 0), 0);
  const T = M.clone().multiply(xf(0, hip, 0, 0, 1, 1, 1, bend, 0));
  B.cyl(0.19, 0.24, 0.62, coat, 0, 0, 0, 6, d, T);
  B.ball(0.185, skin, 0, 0.86, 0.02, 1, 1.08, 1, 1, d, T);
  const ax = o.arms ?? [Math.PI - reach - bend, Math.PI - reach - bend],
    az = o.armZ ?? [-0.1, 0.1];
  B.cyl(0.055, 0.07, 0.6, o.sleeve ?? coat, -0.26, 0.56, 0, 4, d, T, ax[0], az[0]);
  B.cyl(0.055, 0.07, 0.6, o.sleeve ?? coat, 0.26, 0.56, 0, 4, d, T, ax[1], az[1]);
  if (o.hat === 'straw') {
    B.cyl(0.34, 0.36, 0.03, hatCol, 0, 1.0, 0.02, 8, d, T);
    B.cyl(0.14, 0.17, 0.13, hatCol, 0, 1.02, 0.02, 6, d, T);
  } else if (o.hat === 'cap') B.ball(0.2, hatCol, 0, 0.93, -0.02, 1, 0.8, 1.05, 0, d, T);
  else B.ball(0.195, o.hair ?? 0x2a1c14, 0, 0.92, -0.03, 1, 0.9, 1.02, 0, d, T);
}
// the rush-seated chair of the Bedroom and of Vincent's Chair
function chair(B, x, y, z, ry, o = {}) {
  const s = o.s ?? 1,
    M = xf(x, y, z, ry, s, s, s),
    wood = o.wood ?? 0xe2a62a,
    d = o.data;
  B.box(0.46, 0.06, 0.44, o.seat ?? 0xb9b25a, 0, 0.44, 0, 0, d, M);
  if (o.simple) {
    B.box(0.42, 0.44, 0.04, wood, 0, 0, 0.19, 0, d, M);
    B.box(0.42, 0.95, 0.04, wood, 0, 0, -0.2, 0, d, M);
    return;
  }
  for (const lx of [-0.2, 0.2]) {
    B.box(0.05, 0.44, 0.05, wood, lx, 0, 0.19, 0, d, M);
    B.box(0.05, 0.98, 0.05, wood, lx, 0, -0.2, 0, d, M);
  }
  for (const ly of [0.6, 0.8]) B.box(0.38, 0.08, 0.03, wood, 0, ly, -0.2, 0, d, M);
  B.box(0.38, 0.03, 0.03, wood, 0, 0.2, 0.19, 0, d, M);
}
// a two-wheeled cart, shafts forward along +z, with or without the horse
function cart(B, x, y, z, ry, o = {}) {
  const M = xf(x, y, z, ry);
  const body = o.body ?? 0xe0b83a,
    wheel = o.wheel ?? 0x9a5a2a;
  B.box(1.25, 0.45, 2.1, body, 0, 0.74, -0.9, 0, undefined, M);
  B.box(1.36, 0.07, 2.2, mix(body, 0x000000, 0.35), 0, 0.68, -0.9, 0, undefined, M);
  for (const sx of [-1, 1]) {
    B.cyl(0.66, 0.66, 0.08, wheel, sx * 0.74 + 0.04, 0.66, -0.9, 10, undefined, M, 0, Math.PI / 2);
    B.box(0.06, 0.07, 2.4, wheel, sx * 0.45, 0.84, 1.3, 0, undefined, M);
  }
  if (!o.horse) return;
  const hc = o.horseCol ?? 0xd8d2c4;
  B.ball(0.5, hc, 0, 1.2, 1.75, 0.7, 0.78, 1.7, 1, undefined, M);
  for (const sx of [-0.2, 0.2]) for (const lz of [1.15, 2.35]) B.cyl(0.075, 0.055, 0.98, hc, sx, 0, lz, 4, undefined, M);
  B.add(new THREE.BoxGeometry(0.26, 0.85, 0.36), hc, M.clone().multiply(xf(0, 1.72, 2.62, 0, 1, 1, 1, 0.75)));
  B.box(0.22, 0.26, 0.58, hc, 0, 1.86, 2.9, 0, undefined, M);
  B.cyl(0.03, 0.08, 0.7, mix(hc, 0x000000, 0.4), 0, 1.4, 0.92, 4, undefined, M, -2.7, 0);
}
// an open boat drawn up by its bow, in two-sided triangles so the inside shows
function boat(F, x, y, z, ry, c1 = 0x1f4f6a, c2 = 0xd0683a) {
  const c = Math.cos(ry),
    s = Math.sin(ry),
    n = 7,
    L = 5.2;
  const Pt = (lx, ly, lz, col) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c, 0, col];
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      lz = (t - 0.5) * L;
    const w = Math.pow(Math.sin(Math.PI * (t * 0.92 + 0.04)), 0.7) * 0.85,
      top = 0.44 + (2 * t - 1) ** 2 * 0.3;
    const cur = [Pt(-w, top, lz, c2), Pt(-w * 0.6, 0.06, lz, c1), Pt(w * 0.6, 0.06, lz, c1), Pt(w, top, lz, c2)];
    if (prev) {
      F.quad(prev[0], cur[0], cur[1], prev[1], c1);
      F.quad(prev[1], cur[1], cur[2], prev[2], 0x6a5a48);
      F.quad(prev[2], cur[2], cur[3], prev[3], c1);
    }
    prev = cur;
  }
  for (const lz of [-0.9, 0.7]) F.quad(Pt(-0.72, 0.34, lz), Pt(0.72, 0.34, lz), Pt(0.72, 0.34, lz + 0.3), Pt(-0.72, 0.34, lz + 0.3), 0xb89a6a);
  F.quad(Pt(-0.05, 0.1, 0.45), Pt(0.05, 0.1, 0.45), Pt(0.03, 3.6, 0.45), Pt(-0.03, 3.6, 0.45), 0x6a4a2a);
  F.quad(Pt(0, 0.1, 0.4), Pt(0, 0.1, 0.5), Pt(0, 3.6, 0.48), Pt(0, 3.6, 0.42), 0x6a4a2a);
}
// a plain farmhouse: far cheaper than the village houses, but the windows are lit
const FARM_WALL = [0xe8dcc0, 0xd9c9a0, 0xc9b8d8, 0xe0b890, 0xb8c4e0, 0xf0e6c8];
const FARM_ROOF = [0xc2512e, 0xb23a2c, 0x3a4a8a, 0x8a7a3a, 0xd0703a];
function farm(B, W, x, z, ry, R, o = {}) {
  const w = o.w ?? 7 + R() * 3.5,
    d = o.d ?? 5 + R() * 1.5,
    h = o.h ?? 3.2 + R() * 1.0,
    rh = o.roofH ?? 2 + R() * 1.0;
  const y = W.heightAt(x, z) - 0.6,
    H0 = h + 0.6;
  const M = xf(x, y, z, ry);
  const wall = o.wall ?? jitter(FARM_WALL[(R() * FARM_WALL.length) | 0], R, 0.08),
    roof = o.roof ?? jitter(FARM_ROOF[(R() * FARM_ROOF.length) | 0], R, 0.1),
    shut = o.shutters ?? [0x2f8a55, 0x2a4a9a, 0x8a2f2f][(R() * 3) | 0];
  B.box(w, H0, d, (px, py) => mix(wall, 0x10142a, clamp(0.3 - (py + H0 / 2) * 0.2, 0, 0.3)), 0, 0, 0, 0, undefined, M);
  B.gable(d + 0.9, w + 0.7, rh, roof, 0, H0, 0, Math.PI / 2, undefined, M);
  B.box(0.6, rh * 0.7 + 0.7, 0.6, mix(wall, 0x000000, 0.4), w * 0.3, H0 + rh * 0.25, 0, 0, undefined, M);
  B.box(1.0, 1.95, 0.1, shut, w * 0.06, 0.6, d / 2 + 0.02, 0, undefined, M);
  const cs = Math.cos(ry),
    sn = Math.sin(ry),
    wy = 0.6 + h * 0.36;
  const win = (lx, lz, side) => {
    const on = R() < (o.lit ?? 0.7),
      col = on ? WARM[(R() * 4) | 0] : 0x18203a,
      data = on ? { emissive: 1 } : undefined;
    if (side) {
      B.box(0.1, 1.05, 0.9, col, lx, wy, lz, 0, data, M);
      for (const k of [-1, 1]) B.box(0.08, 1.15, 0.3, shut, lx, wy - 0.05, lz + k * 0.62, 0, undefined, M);
    } else {
      B.box(0.9, 1.05, 0.1, col, lx, wy, lz, 0, data, M);
      for (const k of [-1, 1]) B.box(0.3, 1.15, 0.08, shut, lx + k * 0.62, wy - 0.05, lz, 0, undefined, M);
    }
    if (!on) return;
    const at = (o2) => {
      const ax = lx + (side ? Math.sign(lx) * o2 : 0),
        az = lz + (side ? 0 : Math.sign(lz) * o2);
      return [x + ax * cs + az * sn, z - ax * sn + az * cs];
    };
    const [gx, gz] = at(1.7),
      [px, pz] = at(0.25);
    W.maps.lamp(gx, gz, 4.5, col, 0.55);
    W.glows.push({ p: [px, y + wy + 0.55, pz], c: col, size: 1.5 });
  };
  win(-w * 0.32, d / 2 + 0.03, 0);
  win(w * 0.34, d / 2 + 0.03, 0);
  win(-w * 0.25, -d / 2 - 0.03, 0);
  win(w * 0.25, -d / 2 - 0.03, 0);
  win(-w / 2 - 0.03, 0, 1);
  win(w / 2 + 0.03, 0, 1);
  W.colliders.push({ x, z, hw: w / 2 + 0.2, hd: d / 2 + 0.2, ry, top: y + H0 + rh });
  W.maps.blob(x, z, Math.max(w, d) * 0.95, 0.4);
  return { w, d, top: y + H0 + rh };
}

export class StarryWorld extends World {
  constructor(ctx) {
    super(ctx);
    this.id = 'starry';
    this.index = 0;
    this.kicker = 'I · Saint-Rémy-de-Provence, June 1889';
    this.title = 'The Starry Night';
    this.sub = 'Vincent van Gogh';
    this.aspect = 92 / 73;
    this.extent = 220;
    this.boundary = 205;
    this.ceiling = 95;
    this.env = {
      sunDir: dirOf(25, 34),
      sunColor: 0x66739e,
      skyColor: 0x7482bd,
      groundColor: 0x3d4272,
      fogColor: 0x2c4f9a,
      fog: [0.0021, 4, 0.03, 0.8],
      paper: 0xeee7d3,
      ink: 0x3d3f4f,
      rim: 0xffe27a,
      lamp: 1.1,
      sway: 0.3,
    };
    this.style = { kuwahara: 1.5, bloom: 0.55, threshold: 1.0, outline: 0.22, ink: 0x1a1d33, grain: 0.085, saturation: 1.16, contrast: 1.07, vignette: 0.6 };
    this.spawn = { pos: [-5, 90], yaw: Math.PI };
    this.view = { pos: [-6, 20, 121], target: [-6, 37.6, 21], fov: 50 };
    this.music = 'starry';
    this.build();
  }

  heightAt(x, z) {
    const hill = 17 * Math.exp(-((x + 24) ** 2 + (z - 72) ** 2) / (2 * 22 * 22));
    const roll = (fbm(x * 0.011 + 3.1, z * 0.011 + 7.7, 3) - 0.5) * 17;
    const flatV = smooth(60, 104, Math.hypot(x - 8, z + 30));
    const flatA = smooth(26, 48, Math.hypot(x - 80, z - 46));
    const far = smooth(150, 310, Math.hypot(x, z)) * 28;
    let h = roll * flatV * flatA + far + hill * flatA + (1 - flatA) * 1.2;
    // the canal and the Rhône: a low levee, the bed cut into it, and a rise where the drawbridge lands
    const rv = riverAt(x, z);
    if (rv) {
      const bump = Math.exp(-((x - BRIDGE_X) ** 2) / 40);
      h = lerp(h, Math.max(h, WL + 0.8 + 1.3 * bump), rv.lev);
      h = lerp(h, WL - 1, rv.carve);
    }
    return h;
  }

  build() {
    const { strokes, noise3 } = this.ctx;
    const R = rng(1889);
    const S = this.scene;
    const maps = (this.maps = new GroundMaps(this.extent, (x, z) => this.heightAt(x, z)));
    const H = (x, z) => this.heightAt(x, z);

    // ---------------- sky
    const vort = [],
      vortP = [];
    for (const f of FEATURES) {
      const d = dirOf(f[0], f[1]);
      const r = f[2] * D2R * (f[6] === 1 ? 0.88 : 1);
      vort.push(new THREE.Vector4(d.x, d.y, d.z, 2 / (r * r)));
      vortP.push(new THREE.Vector4(f[3], f[4], f[5], f[6]));
    }
    this.sky = new Sky({ body: SKY, noise3, uniforms: { uVort: { value: vort }, uVortP: { value: vortP }, uMoon: { value: dirOf(25, 29) } } });
    S.add(this.sky.mesh);

    // ---------------- roads
    const roads = [
      { pts: [[-4, 96], [-5, 72], [-2, 46], [1, 22], [6, -4], [10, -30]], w: 5.2 },
      { pts: [[10, -30], [-8, -32], [-42, -35], [-70, -30], [-104, -18]], w: 4.6 },
      { pts: [[10, -30], [30, -31], [62, -28], [92, -34]], w: 4.6 },
      { pts: [[10, -44], [13, -64], [21, -86], [26, -112]], w: 4.2 },
      { pts: [[6, -4], [-10, -3], [-32, -9], [-50, -6]], w: 3.6 },
      { pts: [[6, -6], [24, -6], [48, 4], [62, 26], [76, 40]], w: 3.8 },
    ];
    const samples = [];
    for (const r of roads) {
      const c = new THREE.CatmullRomCurve3(r.pts.map((p) => new THREE.Vector3(p[0], 0, p[1])));
      for (const p of c.getSpacedPoints(Math.ceil(c.getLength() / 2))) samples.push([p.x, p.z, r.w]);
    }
    const nearRoad = (x, z, pad = 0) => samples.some((s) => (x - s[0]) ** 2 + (z - s[1]) ** 2 < (s[2] / 2 + pad) ** 2);
    // my footpaths, and the ground the new landmarks need. Trees that the old scatter puts there
    // are still rolled (so nothing else moves) but drawn into VOID.
    const tsamples = [];
    for (const t of TRACKS) {
      const c = new THREE.CatmullRomCurve3(t.pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'catmullrom', 0.5);
      for (const p of c.getSpacedPoints(Math.ceil(c.getLength() / 2))) tsamples.push([p.x, p.z, t.w]);
    }
    const nearTrack = (x, z, pad = 0) => tsamples.some((s) => (x - s[0]) ** 2 + (z - s[1]) ** 2 < (s[2] / 2 + pad) ** 2);
    const inKeep = (x, z, pad = 0) => KEEP.some((k) => x > k[0] - pad && x < k[1] + pad && z > k[2] - pad && z < k[3] + pad);
    const cleared = (x, z, pad = 0) => inKeep(x, z, pad) || (riverAt(x, z)?.carve ?? 0) > 0.02 || nearTrack(x, z, 2 + pad);
    const VOID = new Builder();

    // ---------------- ground: a patchwork of night fields
    const FIELD = [0x1f5a4a, 0x235f72, 0x2a6a3e, 0x8a8438, 0x1c4a66, 0x3a7044, 0x6f7a34, 0x1e5560];
    const groundCol = (x, z, y) => {
      const wx = x + (vnoise(x * 0.02, z * 0.02) - 0.5) * 34,
        wz = z + (vnoise(x * 0.02 + 9, z * 0.02 + 4) - 0.5) * 34;
      const cx = Math.floor(wx / 46),
        cz = Math.floor(wz / 38);
      const hsh = vnoise(cx * 7.31 + 0.5, cz * 5.17 + 0.5);
      const c = new THREE.Color(FIELD[Math.floor(hsh * FIELD.length) % FIELD.length]);
      // hedges between fields
      const ex = Math.abs(((wx / 46) % 1 + 1) % 1 - 0.5),
        ez = Math.abs(((wz / 38) % 1 + 1) % 1 - 0.5);
      const edge = Math.max(ex, ez);
      if (edge > 0.465) c.lerp(new THREE.Color(0x122c40), 0.75);
      const dv = Math.hypot(x - 8, z + 30);
      c.lerp(new THREE.Color(0x245848), 1 - smooth(46, 70, dv)); // village green
      const far = smooth(170, 300, Math.hypot(x, z));
      c.lerp(new THREE.Color(0x1c3f86), far * 0.6);
      const rv = riverAt(x, z);
      if (rv) c.lerp(new THREE.Color(0x3a6a52), rv.lev * 0.45).lerp(new THREE.Color(0x14285a), rv.carve);
      return c;
    };
    const groundMat = paintMaterial({ stroke: strokes.oil, scale: 0.052, contrast: 0.55, hueVar: 0.75, warp: 0.85, accent: 0xb9c95a, accentAmt: 0.3, impasto: 0.1, rim: 0.05, band: 0.3 });
    const ground = new THREE.Mesh(terrain(H, 430, 250, groundCol), groundMat);
    ground.frustumCulled = false;
    S.add(ground);

    // cobbles: lilac, rose and blue like a lamplit terrace
    const cob = (x, y, z) => mix(0x6c5fa6, 0xa57cb6, vnoise(x * 0.35, z * 0.35)).lerp(new THREE.Color(0x4a5cae), vnoise(x * 0.11 + 7, z * 0.11) * 0.5);
    const roadB = new Builder();
    for (const r of roads) roadB.parts.push(ribbon(r.pts, r.w, H, cob, { lift: 0.13, across: 4 }));
    roadB.parts.push(patch(10, -32, 15, H, cob, { lift: 0.15, wobble: 0.06 }));
    roadB.parts.push(patch(78, 44, 13, H, (x, y, z) => mix(0x9a8a6a, 0xc7b58a, vnoise(x * 0.3, z * 0.3)), { lift: 0.14, wobble: 0.1 }));
    S.add(roadB.mesh(paintMaterial({ stroke: strokes.dab, scale: 0.2, contrast: 0.62, hueVar: 0.9, warp: 0.1, accent: 0xf0b6c8, accentAmt: 0.35, impasto: 0.14, rim: 0.05, band: 0.3 })));

    // ---------------- the village
    const B = new Builder(); // walls + props
    const RB = new Builder(); // roofs get longer strokes
    const WALLS = [0x3d5a9c, 0x5a6fa8, 0x2f4a86, 0x6a5aa0, 0xd0b060, 0x4a7a8a, 0xb86a4a, 0x7f8fb8, 0x3a6a6a, 0xc9a24a, 0x56609a];
    const ROOFS = [0x27408c, 0x1f5f7a, 0xb23a2c, 0x35307a, 0xc2512e, 0x1c3a6e, 0x2c6a66, 0x8a2f3a];
    const SHUT = [0x2c7a5a, 0x1f3f7a, 0x8a2f2f, 0x2a2a44];
    const placed = [];
    const free = (x, z, r) => !placed.some((p) => (x - p[0]) ** 2 + (z - p[1]) ** 2 < (r + p[2]) ** 2);
    const addHouse = (x, z, ry, o = {}) => {
      const w = o.w ?? 6 + R() * 4,
        d = o.d ?? 5.5 + R() * 2.5,
        h = o.h ?? (R() < 0.35 ? 7.2 : 4.4) + R() * 0.8;
      const rad = Math.max(w, d) * 0.55;
      if (!free(x, z, rad) && !o.force) return false;
      placed.push([x, z, rad]);
      // roofs go into their own builder so they can take different brushwork
      const proxy = { heightAt: H, colliders: this.colliders, maps };
      const walls = new Builder();
      house(walls, proxy, {
        R, x, z, ry, w, d, h,
        wall: jitter(WALLS[(R() * WALLS.length) | 0], R, 0.1),
        roof: jitter(ROOFS[(R() * ROOFS.length) | 0], R, 0.1),
        shutters: SHUT[(R() * SHUT.length) | 0],
        flowerBox: true,
        lit: 0.82,
        ...o,
      });
      B.parts.push(...walls.parts);
      return true;
    };
    const row = (ax, az, bx, bz, off, sides = [-1, 1]) => {
      const len = Math.hypot(bx - ax, bz - az);
      const tx = (bx - ax) / len,
        tz = (bz - az) / len;
      for (const side of sides) {
        let t = 2 + R() * 3;
        while (t < len - 3) {
          const w = 6 + R() * 4.5,
            d = 5.5 + R() * 2.5;
          const px = ax + tx * (t + w / 2),
            pz = az + tz * (t + w / 2);
          const nx = -tz * side,
            nz = tx * side;
          const x = px + nx * (off + d / 2),
            z = pz + nz * (off + d / 2);
          addHouse(x, z, Math.atan2(-nx, -nz), { w, d });
          t += w + 0.6 + R() * 2.2;
        }
      }
    };
    row(1, 24, 6, -4, 3.6);
    row(6, -6, 9, -17, 3.6);
    row(-44, -35, -6, -32, 3.3);
    row(27, -31, 64, -28, 3.3);
    row(12, -64, 22, -90, 3.2);
    row(-34, -9, -10, -3, 2.9);
    row(24, -6, 48, 4, 2.9);
    // a looser outer ring of farmhouses
    for (let i = 0; i < 26; i++) {
      const a = R() * 6.283,
        d = 48 + R() * 34;
      const x = 8 + Math.cos(a) * d,
        z = -30 + Math.sin(a) * d * 0.9;
      if (nearRoad(x, z, 6)) continue;
      addHouse(x, z, R() * 6.283, { lit: 0.6 });
    }

    // church: the steeple that pierces the horizon
    {
      const cx = 10,
        cz = -53,
        y = H(cx, cz);
      const proxy = { heightAt: H, colliders: this.colliders, maps };
      house(B, proxy, { R, x: cx, z: cz - 4, y, w: 9, d: 17, h: 8.5, roofH: 5.5, wall: 0xbfc4dc, roof: 0x27408c, lit: 1, door: true, winH: 2.4, winW: 1, chimney: false, ridgeAlongX: false, trim: 0x2a3050 });
      B.box(4.6, 19, 4.6, (px, py) => mix(0xc6cbe2, 0x8f9ac8, clamp(py / 19 + 0.5)), cx, y - 0.4, cz + 6.6);
      B.hip(5.4, 5.4, 17, 0x1f2f6a, cx, y + 18.6, cz + 6.6, 0, undefined, undefined, 0);
      for (const [ox, oz] of [[0, 2.35], [0, -2.35], [2.35, 0], [-2.35, 0]]) B.box(ox ? 0.12 : 1.3, 2.6, oz ? 0.12 : 1.3, 0xffd56b, cx + ox, y + 13.5, cz + 6.6 + oz, 0, { emissive: 1 });
      this.glows.push({ p: [cx, y + 36.2, cz + 6.6], c: 0xfff3c4, size: 3.2 });
      this.glows.push({ p: [cx, y + 15, cz + 9.2], c: 0xffd56b, size: 4 });
      this.colliders.push({ x: cx, z: cz + 6.6, hw: 2.6, hd: 2.6, ry: 0, top: y + 36 });
      placed.push([cx, cz, 12]);
      maps.lamp(cx, cz + 12, 12, 0xffd08a, 0.8);
    }

    // the asylum of Saint-Paul: long monastery wing, cloister wall, a garden
    const AX = 80,
      AZ = 46;
    {
      const proxy = { heightAt: H, colliders: this.colliders, maps };
      const y = H(AX, AZ);
      house(B, proxy, { R, x: AX + 4, z: AZ - 17, y, w: 34, d: 8, h: 8.4, roofH: 3.2, wall: 0xd9c9a0, roof: 0xb5532e, shutters: 0x5f8f9a, lit: 0.5, chimneyChance: 1, winH: 1.6 });
      house(B, proxy, { R, x: AX + 22, z: AZ - 2, y, w: 8, d: 22, h: 7.6, roofH: 3, wall: 0xcfc09a, roof: 0xa84a2c, shutters: 0x5f8f9a, lit: 0.45, winH: 1.6 });
      // low garden wall
      for (const [wx, wz, ww, wd] of [[AX - 14, AZ, 0.7, 30], [AX + 2, AZ + 15, 32, 0.7]]) {
        B.box(ww, 1.5, wd, 0xb8ab8a, wx, H(wx, wz) - 0.3, wz);
        this.colliders.push({ x: wx, z: wz, hw: ww / 2, hd: wd / 2, ry: 0, top: H(wx, wz) + 1.2 });
      }
      placed.push([AX + 4, AZ - 10, 26], [AX, AZ, 18]);
    }

    // lamps along the streets
    const lampAt = [[3, 30], [-1, 12], [8, -12], [2, -26], [19, -26], [10, -40], [-14, -30], [-34, -37], [-58, -29], [36, -34], [56, -26], [78, -33], [16, -70], [-22, -3], [-44, -9], [32, -2], [52, 12], [66, 32], [-6, 58], [-8, 80]];
    for (const [x, z] of lampAt) lampPost(B, this, x + (nearRoad(x, z) ? 3.1 : 0), z, { glow: 2.6, radius: 10 });
    // string of lights across the square
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = lerp(-3, 23, t),
        z = -22 + Math.sin(t * Math.PI) * -3;
      this.glows.push({ p: [x, 6.4 - Math.sin(t * Math.PI) * 1.6, z], c: [0xff8f5a, 0xffd56b, 0x8fd0ff, 0xff7ab0][i % 4], size: 0.9 });
    }
    maps.lamp(10, -24, 14, 0xffc47a, 0.5);

    // a fountain to anchor the square
    {
      const y = H(10, -32);
      B.cyl(3.1, 3.3, 0.7, 0x8a94c0, 10, y, -32, 14);
      B.cyl(2.7, 2.7, 0.12, 0x5fb0d8, 10, y + 0.62, -32, 14, { emissive: 0.35 });
      B.cyl(0.35, 0.5, 2.2, 0x9aa4cc, 10, y, -32, 8);
      B.cyl(1.1, 0.4, 0.3, 0x9aa4cc, 10, y + 2.1, -32, 10);
      this.colliders.push({ x: 10, z: -32, r: 3.3, top: y + 2.5 });
    }

    // ---------------- trees
    const T = new Builder();
    const HX = -24,
      HZ = 72;
    cypress(T, HX, H(HX, HZ) - 1, HZ, 41, 6.4, R, { flames: 3, sway: 0.9, dark: 0x07140f, mid: 0x143524, warm: 0x5a4418 });
    this.colliders.push({ x: HX, z: HZ, r: 3.2, top: H(HX, HZ) + 30 });
    this.cypressTop = [HX + 0.5, H(HX, HZ) + 42.5, HZ];
    maps.blob(HX, HZ, 12, 0.5);
    let n = 0;
    while (n < 26) {
      const a = R() * 6.283,
        d = 20 + R() * 150;
      const x = 8 + Math.cos(a) * d,
        z = -30 + Math.sin(a) * d;
      if (nearRoad(x, z, 3) || !free(x, z, 2.5) || (x > -22 && x < 42 && z > 18)) continue;
      const h = 8 + R() * 9;
      const gone = cleared(x, z, 1);
      cypress(gone ? VOID : T, x, H(x, z) - 0.5, z, h, 1.1 + R() * 0.7, R, { flames: 1 });
      placed.push([x, z, 1.4, gone]);
      n++;
      if (gone) continue;
      this.colliders.push({ x, z, r: 0.9, top: H(x, z) + h * 0.7 });
      maps.blob(x, z, 3, 0.4);
    }
    // olives: twisting blue-green crowns
    n = 0;
    while (n < 150) {
      let x, z;
      if (n < 60) {
        x = 22 + R() * 46;
        z = 12 + R() * 62; // the grove under the hill
      } else {
        const a = R() * 6.283,
          d = 62 + R() * 150;
        x = 8 + Math.cos(a) * d;
        z = -30 + Math.sin(a) * d;
      }
      if (nearRoad(x, z, 3) || !free(x, z, 2.6) || Math.hypot(x - HX, z - HZ) < 12) continue;
      const far = Math.hypot(x, z) > 120;
      const r = (2.2 + R() * 1.8) * (far ? 1.7 : 1);
      const gone = cleared(x, z, r * 0.6);
      blobTree(gone ? VOID : T, x, H(x, z), z, r * 1.5, r, R, { lo: [0x163a5c, 0x1b4a4a, 0x1f3f70][(R() * 3) | 0], hi: [0x3f86a8, 0x4a9a86, 0x4f78c0][(R() * 3) | 0], blobs: far ? 2 : 4 });
      placed.push([x, z, r * 0.8, gone]);
      n++;
      if (gone) continue;
      if (!far) this.colliders.push({ x, z, r: 0.5, top: H(x, z) + 3 });
      maps.blob(x, z, r * 1.5, 0.42);
    }
    VOID.parts.length = 0;
    // free of houses and of the trees that were actually planted
    const open = (x, z, r) => !placed.some((p) => !p[3] && (x - p[0]) ** 2 + (z - p[1]) ** 2 < (r + p[2]) ** 2);
    S.add(T.mesh(paintMaterial({ stroke: strokes.wavy, scale: 0.16, contrast: 0.7, hueVar: 0.8, warp: 0.5, accent: 0xb9d06a, accentAmt: 0.3, impasto: 0.16, rim: 0.3, band: 0.26, wallStretch: 0.5, angle: 1.57 })));

    // ---------------- small things: irises, wheat stooks, people
    const P = new Builder();
    for (let i = 0; i < 330; i++) {
      const x = AX - 11 + R() * 24,
        z = AZ - 9 + R() * 22;
      if (Math.hypot(x - 78, z - 44) < 5.5) continue;
      const y = H(x, z);
      const s = 0.7 + R() * 0.6;
      for (let k = 0; k < 3; k++) P.cyl(0.0, 0.06 * s, 0.9 * s, 0x2a7a52, x + (R() - 0.5) * 0.3, y, z + (R() - 0.5) * 0.3, 4, { sway: 0.1 }, undefined, (R() - 0.5) * 0.5, (R() - 0.5) * 0.5);
      P.ball(0.16 * s, [0x5a4fd8, 0x6f5cf0, 0x4338b0, 0x8a78ff][(R() * 4) | 0], x, y + 0.95 * s, z, 1, 1.25, 1, 0, { sway: 0.14 });
      if (R() < 0.3) P.ball(0.07 * s, 0xf2c530, x, y + 0.98 * s, z + 0.08, 1, 1, 1, 0, { sway: 0.14 });
    }
    // wheat field west of the village, stooks standing in rows
    this.wheat = [-92, -22];
    S.add(
      new THREE.Mesh(
        patch(-92, -22, 36, H, (x, y, z) => mix(0xc9a437, 0xe8cc5a, vnoise(x * 0.2, z * 0.2)), { lift: 0.12, wobble: 0.2, sx: 1.25, sz: 0.85, rings: 9 }),
        paintMaterial({ stroke: strokes.oil, scale: 0.06, contrast: 0.6, hueVar: 0.5, warp: 1.1, accent: 0xf6e9a0, accentAmt: 0.35, impasto: 0.16, rim: 0.05, band: 0.3 })
      )
    );
    for (let i = 0; i < 46; i++) {
      const x = -92 + (R() - 0.5) * 78,
        z = -22 + (R() - 0.5) * 50;
      if (Math.hypot((x + 92) / 1.25, (z + 22) / 0.85) > 33 || nearRoad(x, z, 3)) continue;
      const y = H(x, z);
      if (nearTrack(x, z, 1.6)) continue; // no stook on the red tracks (nothing random is drawn after this point of the loop)
      P.cyl(0.12, 0.85, 1.9, (px, py) => mix(0xb88a2a, 0xf0d060, clamp(py / 1.9 + 0.5)), x, y, z, 7, { sway: 0.06 });
      maps.blob(x, z, 1.6, 0.3);
    }
    // a few villagers out late
    const folk = [[6, -20, 0.4], [14, -27, 3.6], [-12, -31, 1.5], [33, -29, -1.4], [4, 8, 2.9], [16, -37, 0.2], [0, -34, 1.2]];
    for (const [x, z, ry] of folk)
      figure(P, x, H(x, z), z, ry, { coat: jitter([0x35406a, 0x6a3f5a, 0x2f5a5a, 0x7a5a2a][(R() * 4) | 0], R, 0.1), dress: R() < 0.5, hat: R() < 0.5 ? 'straw' : undefined, scale: 0.95 + R() * 0.12 });
    // Vincent's easel in the garden
    {
      const ex = 76.4,
        ez = 41.2,
        y = H(ex, ez);
      for (const [ox, oz, rz, rx] of [[-0.35, 0, 0.12, 0], [0.35, 0, -0.12, 0], [0, -0.5, 0, -0.3]]) P.cyl(0.03, 0.03, 1.9, 0x6a4a2a, ex + ox, y, ez + oz, 5, undefined, undefined, rx, rz);
      P.box(1.1, 0.9, 0.05, 0x27408c, ex, y + 0.95, ez + 0.02, 0, { emissive: 0.25 });
      P.box(1.2, 1.0, 0.04, 0xe8dcc0, ex, y + 0.9, ez - 0.02);
    }
    // everything else he painted
    this.vincent({ S, H, maps, strokes, B, P, open, nearRoad, nearTrack, inKeep });
    S.add(P.mesh(paintMaterial({ stroke: strokes.dab, scale: 0.6, contrast: 0.35, hueVar: 0.5, warp: 0.1, rim: 0.3, band: 0.25 })));

    S.add(B.mesh(paintMaterial({ stroke: strokes.dab, scale: 0.26, contrast: 0.42, hueVar: 0.6, warp: 0.12, accent: 0xb0c4ff, accentAmt: 0.16, impasto: 0.1, rim: 0.2, band: 0.2, emissive: 1.85, big: 0.5 })));

    // ---------------- the Alpilles
    const prof = (a) => {
      const right = Math.exp(-((a - 0.75) ** 2) / 0.35);
      return 34 + right * 52 + Math.sin(a * 5.0 + 1.0) * 9 + Math.sin(a * 11.0) * 5 + fbm(a * 3.1, 2.2, 3) * 22;
    };
    const mcol = (x, y, z) => mix(0x16307a, 0x3f73c8, clamp((y + 5) / 95)).lerp(new THREE.Color(0x0c1a52), vnoise(x * 0.02, y * 0.08) * 0.4);
    const mg = mountainRing({ radius: 330, base: -14, profile: prof, colorFn: mcol, depth: 90 });
    const mm = new THREE.Mesh(mg, paintMaterial({ stroke: strokes.wavy, scale: 0.006, contrast: 0.85, hueVar: 0.5, warp: 0.2, accent: 0x8fc0f0, accentAmt: 0.35, rim: 0, band: 0.4, side: THREE.DoubleSide, wallStretch: 2.6, bigScale: 0.4, big: 0.9 }));
    mm.frustumCulled = false;
    S.add(mm);

    // ---------------- glow: lamps, fireflies, far villages
    for (let i = 0; i < 130; i++) {
      const a = R() * 6.283,
        d = 12 + R() * 120;
      const x = -5 + Math.cos(a) * d,
        z = 15 + Math.sin(a) * d;
      this.glows.push({ p: [x, H(x, z) + 0.6 + R() * 3, z], c: 0xe8f08a, size: 0.34 + R() * 0.3, drift: 1.6 });
    }
    for (let i = 0; i < 90; i++) {
      const a = R() * 6.283,
        d = 190 + R() * 110;
      const x = Math.cos(a) * d,
        z = Math.sin(a) * d;
      this.glows.push({ p: [x, H(x, z) + 2, z], c: R() < 0.8 ? 0xffc46a : 0xff9a5a, size: 2.6 + R() * 2.4 });
    }
    S.add(glowPoints(this.glows, 1.15));
    maps.finish();

    // ---------------- story
    const vincent = new Builder();
    figure(vincent, 0, 0, 0, 0, { coat: 0xffffff, legs: 0xffffff, skin: 0xffffff, hat: 'straw', hatCol: 0xffffff, arms: 0.3 });
    const vy = H(77.4, 42.4);
    const parcel = new Builder();
    parcel.box(0.9, 0.5, 0.65, 0xc9a26a, 0, -0.25, 0);
    parcel.box(0.95, 0.06, 0.1, 0xb0362e, 0, 0.02, 0);
    parcel.box(0.7, 0.03, 0.5, 0xf6efdc, 0.1, 0.3, 0.05, 0.3);
    for (let i = 0; i < 3; i++) parcel.cyl(0.07, 0.07, 0.42, [0x2f62d8, 0xf2c530, 0xf6f2e0][i], -0.3 + i * 0.3, 0.42, -0.1, 8, { emissive: 0.6 }, undefined, 1.57, 0.2 * i);
    const pm = parcel.mesh(paintMaterial({ stroke: strokes.dab, scale: 2, contrast: 0.2, objSpace: 1, rim: 0.4, emissive: 1.6 }));
    pm.material.uniforms.uRestore = { value: 1 };
    pm.scale.setScalar(1.7);

    this.setupStory({
      wisps: [
        { pos: [-10, H(-10, 76) + 1.6, 76], color: 0x3f7bff, name: 'Cobalt blue', fact: 'The cypress in the painting is drawn far bigger and closer than it really stood.' },
        { pos: [10, H(10, -22) + 1.6, -22], color: 0xffc933, name: 'Chrome yellow', fact: 'The village is imagined. Vincent borrowed it from a sketch he made on a hillside.' },
        { pos: [74, H(74, 50) + 1.6, 50], color: 0x8a6cff, name: 'Iris violet', fact: 'In May 1889 Vincent admitted himself to the asylum of Saint-Paul, a former monastery, to rest and to work.' },
        { pos: [-92, H(-92, -22) + 1.6, -22], color: 0xf0b030, name: 'Wheat ochre', fact: 'He painted The Starry Night around mid-June 1889, in his ground-floor studio.' },
        { pos: this.cypressTop, color: 0xbfe6ff, name: 'Star white', fact: 'From his east-facing window he watched the sky before sunrise, night after night.', high: true },
      ],
      memento: {
        pos: [16, 58, -20],
        color: 0xfff0b8,
        model: pm,
        name: "Theo's letter and a parcel of paints",
        text: 'Theo, an art dealer in Paris, sent his brother paint, canvas and letters all his life.',
      },
      echo: {
        pos: [77.4, vy, 42.4],
        ry: -2.2,
        color: 0xffe2a0,
        model: vincent.mesh(ghostMaterial(0xffd98a, 1.0)),
        name: 'Vincent',
        greet: ['Ah, a visitor, at this hour. Look how the sky moves tonight.', 'My brother Theo sends paint from Paris. His parcel has blown up among the stars.'],
        thanks: ["Theo's letter. And the tubes, good, good.", 'This morning I saw the countryside from my window, with nothing but the morning star, which looked very big.'],
      },
      exit: { pos: [70, H(70, 36), 36], ry: 0.9 },
    });
    this.finalFact = 'The “morning star” was the planet Venus. The painting has hung at MoMA in New York since 1941.';
    this.finalLine = 'The last stroke: the morning star.';
    this.hints = {
      start: 'Something is glowing near the great cypress. Walk into it.',
      high: 'One colour is caught at the very top of the cypress. Hold Space to ride the wind.',
      memento: "Theo's parcel is drifting high above the church. Fly up to it.",
      echo: 'Carry it to Vincent in the asylum garden.',
    };
  }

  // ------------------------------------------------------------------
  // Everything else he painted, set down around the village.
  // ------------------------------------------------------------------
  vincent({ S, H, maps, strokes, B, P, open, nearRoad, nearTrack, inKeep }) {
    const R = rng(1853);
    const F = new Raw(); // petals, leaves, rails
    const TR = new Raw(); // hedges and windbreak cypresses
    const T2 = new Builder(); // the orchard
    const GP = new Builder(); // fields and tracks draped over the ground
    const glow = (x, y, z, c, size, drift = 0) => this.glows.push({ p: [x, y, z], c, size, drift });
    const solid = (x, z, r, top) => this.colliders.push({ x, z, r, top });
    const gasLamp = (x, z, h = 4.4, col = 0xffc23a, size = 3.4, radius = 10, strength = 0.9) => {
      const y = H(x, z);
      B.cyl(0.07, 0.12, h, 0x14161f, x, y - 0.2, z, 5);
      B.box(0.4, 0.5, 0.4, col, x, y + h - 0.2, z, 0, { emissive: 1 });
      B.hip(0.62, 0.62, 0.24, 0x14161f, x, y + h + 0.3, z, 0, undefined, undefined, 0);
      glow(x, y + h + 0.05, z, col, size);
      maps.lamp(x, z, radius, col, strength);
      solid(x, z, 0.2, y + h);
    };
    const tree = (x, z, h, r) => {
      const y = H(x, z);
      flame(TR, x, y - 0.4, z, h, r, R);
      solid(x, z, 0.8, y + h * 0.7);
      maps.blob(x, z, 3, 0.4);
    };
    const stack = (x, z, r, h) => {
      const y = H(x, z);
      haystack(P, x, y, z, r, h, R);
      solid(x, z, r * 0.95, y + h);
      maps.blob(x, z, r * 2.2, 0.45);
    };

    // ---- footpaths: ochre earth, and the three red tracks of the wheatfield with their grass verges
    for (const t of TRACKS) {
      if (t.red) {
        GP.parts.push(ribbon(t.pts, t.w + 1.6, H, (x, y, z) => mix(0x2f6a2a, 0x5a9a3a, vnoise(x * 0.5, z * 0.5)), { lift: 0.17, across: 2, step: 2 }));
        GP.parts.push(ribbon(t.pts, t.w, H, (x, y, z) => mix(0x7a2f1c, 0xb85a2a, vnoise(x * 0.45, z * 0.45)), { lift: 0.23, across: 2, step: 2 }));
      } else GP.parts.push(ribbon(t.pts, t.w, H, (x, y, z) => mix(0xa8843f, 0xdcc070, vnoise(x * 0.4, z * 0.4)), { lift: 0.2, across: 2, step: 2 }));
    }

    // ---- Café Terrace at Night, on the north-east corner of the square
    {
      const cx = 23.2,
        fz = -42.2,
        w = 12.6,
        d = 6,
        bz = fz - d / 2,
        y = H(cx, fz);
      B.box(w, 3.5, d, (px, py) => mix(0xd09a22, 0x7a5a26, clamp(0.4 - py / 3.5)), cx, y - 0.3, bz);
      B.box(w, 4.2, d, (px, py) => mix(0x6a78b4, 0x8f9ad0, clamp(py / 4.2 + 0.5)), cx, y + 3.2, bz);
      B.hip(d + 1, w + 1, 2.3, 0x27408c, cx, y + 7.4, bz, Math.PI / 2, undefined, undefined, 0.6);
      B.box(0.7, 1.6, 0.7, 0x4a5590, cx + 3.5, y + 8.2, bz);
      // the wall that glows under the awning, two doorways and the long window
      B.box(w - 0.2, 3.0, 0.14, (px, py) => mix(0xf7cf2e, 0xf0941a, clamp(0.5 - py / 3.0) * 0.8), cx, y + 0.1, fz + 0.05, 0, { emissive: 0.5 });
      for (const dx of [-3.7, 3.7]) {
        B.box(1.9, 2.8, 0.14, 0x25488a, cx + dx, y + 0.1, fz + 0.1);
        B.box(1.45, 2.5, 0.14, 0xffa238, cx + dx, y + 0.1, fz + 0.14, 0, { emissive: 1 });
      }
      B.box(3.3, 1.8, 0.14, 0x25488a, cx, y + 0.95, fz + 0.1);
      B.box(2.95, 1.5, 0.14, 0xffd56b, cx, y + 1.1, fz + 0.14, 0, { emissive: 1 });
      for (const dx of [-0.75, 0.75]) B.box(0.08, 1.5, 0.14, 0x25488a, cx + dx, y + 1.1, fz + 0.17);
      // upstairs: green shutters, half the rooms awake
      for (let i = 0; i < 4; i++) {
        const wx = cx - 4.5 + i * 3,
          on = i === 1 || i === 2;
        B.box(1.0, 1.5, 0.12, on ? 0xffd56b : 0x1c2548, wx, y + 4.5, fz + 0.03, 0, on ? { emissive: 1 } : undefined);
        for (const k of [-1, 1]) B.box(0.36, 1.6, 0.1, 0x2f8a55, wx + k * 0.72, y + 4.45, fz + 0.05);
        const back = i === 0 || i === 3;
        B.box(1.0, 1.4, 0.12, back ? 0xffc861 : 0x1c2548, wx, y + 4.5, bz - d / 2 - 0.03, 0, back ? { emissive: 1 } : undefined);
      }
      for (const sx of [-1, 1])
        for (const dz of [-1.4, 1.4]) {
          const on = sx * dz > 0;
          B.box(0.12, 1.4, 0.95, on ? 0xffc861 : 0x1c2548, cx + sx * (w / 2 + 0.03), y + 4.5, bz + dz, 0, on ? { emissive: 1 } : undefined);
        }
      // the awning, lit from below, and its valance
      B.add(new THREE.BoxGeometry(w - 1, 0.12, 4.9), (px, py, pz) => mix(0xf7cf34, 0xe8981c, clamp(pz / 4.9 + 0.5)), xf(cx, y + 3.12, fz + 2.42, 0, 1, 1, 1, 0.1), { emissive: 0.5 });
      B.box(w - 1, 0.34, 0.07, 0xf7cc30, cx, y + 2.54, fz + 4.86, 0, { emissive: 0.45 });
      for (const sx of [-1, 1]) B.cyl(0.04, 0.05, 2.9, 0x1c2440, cx + sx * (w / 2 - 0.7), y, fz + 4.8, 5);
      // the big gas lantern
      const lx = cx - 1.6,
        lz = fz + 4.3;
      B.cyl(0.02, 0.02, 0.45, 0x14161f, lx, y + 2.5, lz, 4);
      B.box(0.48, 0.52, 0.48, 0xffe38a, lx, y + 1.98, lz, 0.6, { emissive: 1 });
      B.hip(0.72, 0.72, 0.22, 0x14161f, lx, y + 2.5, lz, 0.6, undefined, undefined, 0);
      glow(lx, y + 2.25, lz, 0xffd24a, 7);
      glow(lx, y + 2.25, lz, 0xfff2c0, 2.4);
      maps.lamp(lx, lz, 18, 0xffc23a, 1.5);
      maps.lamp(cx, fz + 2.6, 10, 0xffe07a, 1.2);
      // orange boards underfoot
      GP.parts.push(drape(H, cx, fz + 3.45, 0, 6.9, w + 0.4, (i, j) => [0xe8922a, 0xf2a83a, 0xd97a2a, 0xf0b84a][(i + ((j * 5) % 3 === 0 ? 1 : 0)) % 4], { lift: 0.19, step: 0.86, cols: 6 }));
      // round white tables, rush chairs, sunflowers in jars
      const seats = [];
      let nt = 0;
      for (const tz of [1.4, 3.5, 5.6])
        for (let i = 0; i < 5; i++) {
          const tx = cx - 4.9 + i * 2.45 + (R() - 0.5) * 0.3,
            zz = fz + tz + (R() - 0.5) * 0.3;
          if ((tz < 2 && Math.abs(Math.abs(tx - cx) - 3.7) < 1.1) || R() < 0.12) continue;
          P.cyl(0.5, 0.5, 0.05, 0xf4efe2, tx, y + 0.72, zz, 10);
          P.cyl(0.035, 0.05, 0.72, 0x23284a, tx, y, zz, 4);
          solid(tx, zz, 0.55, y + 0.8);
          // one chair east and one west of every table, so no two sets can touch
          const a = (R() - 0.5) * 0.3;
          for (let k = 0; k < 2; k++) {
            const ca = (k ? -1 : 1) * 1.5708 + a + (R() - 0.5) * 0.4,
              sx = tx + Math.sin(ca) * 0.8,
              sz = zz + Math.cos(ca) * 0.8;
            chair(P, sx, y, sz, ca + Math.PI, { simple: 1, wood: k ? 0xd9a030 : 0xc8862a, seat: 0xe8c860 });
            seats.push([sx, sz, ca + Math.PI]);
          }
          if (nt++ % 3 === 0) bouquet(F, P, tx, y + 0.77, zz, R, { n: 5 });
        }
      bouquet(F, P, cx - 2.3, y, fz + 0.5, R, { n: 8, r: 0.2, s: 2.2, vase: 0x3a8a6a });
      bouquet(F, P, cx + 2.3, y, fz + 0.5, R, { n: 8, r: 0.2, s: 2.2 });
      // the waiter in white, a few late drinkers, a couple walking home
      person(P, cx + 1.2, y, fz + 2.5, 0.4, { coat: 0xf6f2e8, legs: 0x1c2040, sleeve: 0xf6f2e8 });
      for (const [k, coat, hat] of [[1, 0x35406a, 'straw'], [4, 0x7a3f5a, undefined], [9, 0x2f5a5a, 'cap'], [14, 0x5a4a8a, undefined]]) {
        const st = seats[k];
        if (st) person(P, st[0], y, st[1], st[2], { sit: 1, coat, hat, hatCol: hat === 'cap' ? 0x1c1c26 : 0xe2c46a });
      }
      person(P, 27.4, H(27.4, -34.3), -34.3, 1.3, { coat: 0x23284a, hat: 'straw' });
      person(P, 28.2, H(28.2, -34.7), -34.7, 1.4, { dress: 1, coat: 0x8a3a5a, skirt: 0x5a2a4a, hat: 'cap', hatCol: 0x2a1c14 });
      this.colliders.push({ x: cx, z: bz, hw: w / 2 + 0.2, hd: d / 2 + 0.2, ry: 0, top: y + 10 });
      maps.blob(cx, bz, 9, 0.35);
    }

    // ---- The Yellow House on the corner, with the Bedroom open to the square
    {
      const x0 = 20.5,
        x1 = 28.7,
        z0 = -26,
        z1 = -19.6,
        xm = 25.9; // the bedroom's far wall
      const cxh = (x0 + x1) / 2,
        cz = (z0 + z1) / 2,
        w = x1 - x0,
        d = z1 - z0,
        mx = (x0 + xm) / 2,
        y = H(cxh, cz);
      const YEL = (px, py) => mix(0xf4c62e, 0xd9a022, clamp(0.5 - py / 3.5) * 0.6);
      B.box(w, 3.6, d, YEL, cxh, y + 3.05, cz); // upper storey
      B.box(x1 - xm, 3.4, d, YEL, (xm + x1) / 2, y - 0.3, cz); // the solid east half
      for (const zz of [z0 + 0.14, z1 - 0.14]) B.box(xm - x0, 3.4, 0.28, YEL, mx, y - 0.3, zz);
      for (const zz of [z0 + 0.25, z1 - 0.25]) B.box(0.32, 3.4, 0.5, YEL, x0 + 0.16, y - 0.3, zz);
      B.box(0.32, 0.5, d, YEL, x0 + 0.16, y + 2.6, cz);
      B.gable(d + 1.1, w + 0.7, 2.7, 0xc8562c, cxh, y + 6.65, cz, Math.PI / 2);
      B.box(0.7, 2.2, 0.7, 0xb0782a, cxh + 2.2, y + 7.4, cz + 0.6);
      // green shutters and the green door
      const SH = 0x2f8a55;
      const win = (wx, wy, wz, alongX, out, on) => {
        const col = on ? 0xffd56b : 0x1c2a4a,
          data = on ? { emissive: 1 } : undefined;
        if (alongX) {
          B.box(1.0, 1.4, 0.12, col, wx, wy, wz + out * 0.03, 0, data);
          for (const k of [-1, 1]) B.box(0.34, 1.5, 0.1, SH, wx + k * 0.7, wy - 0.05, wz + out * 0.05);
        } else {
          B.box(0.12, 1.4, 1.0, col, wx + out * 0.03, wy, wz, 0, data);
          for (const k of [-1, 1]) B.box(0.1, 1.5, 0.34, SH, wx + out * 0.05, wy - 0.05, wz + k * 0.7);
        }
      };
      [x0 + 1.5, cxh, x1 - 1.5].forEach((wx, i) => {
        win(wx, y + 4.1, z1, true, 1, i !== 1);
        win(wx, y + 4.1, z0, true, -1, i === 1);
      });
      for (const dz of [-1.5, 1.5]) {
        win(x0, y + 4.1, cz + dz, false, -1, dz > 0);
        win(x1, y + 4.1, cz + dz, false, 1, dz < 0);
      }
      win(x1 - 1.4, y + 1.0, z0, true, -1, true);
      win(x1, y + 1.0, cz, false, 1, false);
      B.box(1.0, 2.15, 0.12, SH, x1 - 1.45, y, z1 + 0.03);
      // inside: pale lilac-blue walls, a floor of worn boards
      const BL = 0xa8c6ea,
        lit = { emissive: 0.4 },
        IN = { emissive: 0.22 };
      for (const zz of [z0 + 0.31, z1 - 0.31]) B.box(xm - x0 - 0.3, 3.0, 0.06, BL, mx + 0.15, y + 0.05, zz, 0, lit);
      B.box(0.06, 3.0, d - 0.6, BL, xm - 0.03, y + 0.05, cz, 0, lit);
      B.box(xm - x0 - 0.4, 0.1, d - 0.56, 0xdfe6f0, mx + 0.2, y + 2.98, cz, 0, { emissive: 0.25 });
      // the boards stand a step above the cobbles of the square, which run in under the house
      B.box(xm - x0, 0.52, d - 0.56, (px, py, pz) => mix(0x9a5a3a, 0x7a7046, vnoise(px * 0.7 + 3, pz * 0.7)), mx, y - 0.3, cz);
      const fy = y + 0.22,
        WOOD = 0xe8a22c;
      (this.platforms ??= []).push({ minx: x0, maxx: xm, minz: z0 + 0.28, maxz: z1 - 0.28, y: fy });
      // the bed against the right-hand wall, red blanket, two pillows
      const bx = xm - 1.4,
        bz2 = z1 - 1.0;
      P.box(2.3, 0.34, 1.26, WOOD, bx, fy + 0.22, bz2, 0, IN);
      P.box(0.1, 1.0, 1.36, WOOD, bx - 1.15, fy, bz2, 0, IN);
      P.box(0.1, 1.3, 1.36, WOOD, bx + 1.15, fy, bz2, 0, IN);
      P.box(1.65, 0.18, 1.3, 0xc9281e, bx - 0.25, fy + 0.54, bz2, 0, IN);
      P.box(0.5, 0.14, 1.2, 0xeef0c8, bx + 0.82, fy + 0.56, bz2, 0, IN);
      for (const dz of [-0.3, 0.3]) P.box(0.42, 0.16, 0.5, 0xf4f2d0, bx + 0.86, fy + 0.68, bz2 + dz, 0, IN);
      // two rush chairs, the little table with jug and basin
      chair(P, x0 + 1.5, fy, z0 + 1.35, 2.2, { data: IN });
      chair(P, bx + 0.25, fy, bz2 - 1.3, -0.4, { data: IN });
      const tx = xm - 0.75,
        tz = z0 + 0.78;
      P.box(0.75, 0.05, 0.55, WOOD, tx, fy + 0.76, tz, 0, IN);
      P.box(0.66, 0.16, 0.46, 0xc8862a, tx, fy + 0.6, tz, 0, IN);
      for (const [ox, oz] of [[-0.32, -0.22], [0.32, -0.22], [-0.32, 0.22], [0.32, 0.22]]) P.box(0.05, 0.62, 0.05, WOOD, tx + ox, fy, tz + oz, 0, IN);
      P.cyl(0.06, 0.1, 0.28, 0x4a6ad8, tx - 0.15, fy + 0.81, tz, 6, IN);
      P.cyl(0.17, 0.1, 0.09, 0xdfe6f0, tx + 0.16, fy + 0.81, tz + 0.05, 6, IN);
      // the window at the far end, pictures over the bed, mirror, towel, two blue doors
      P.box(0.08, 1.6, 1.15, 0x3f8a4a, xm - 0.1, fy + 1.05, cz - 0.5, 0, IN);
      P.box(0.1, 1.38, 0.93, 0xcfe08a, xm - 0.12, fy + 1.16, cz - 0.5, 0, { emissive: 0.7 });
      P.box(0.12, 1.38, 0.06, 0x3f8a4a, xm - 0.13, fy + 1.16, cz - 0.5, 0, IN);
      for (const [dx, col] of [[-0.75, 0x6a8ad0], [-0.1, 0x8ab06a]]) {
        P.box(0.52, 0.64, 0.04, 0xe8b23a, bx + dx, fy + 1.7, z1 - 0.36, 0, IN);
        P.box(0.4, 0.52, 0.05, col, bx + dx, fy + 1.76, z1 - 0.37, 0, IN);
      }
      for (const dz of [-0.3, 0.3]) {
        P.box(0.04, 0.5, 0.42, 0xe8b23a, xm - 0.08, fy + 1.85, bz2 + dz, 0, IN);
        P.box(0.05, 0.4, 0.32, dz < 0 ? 0xd9a86a : 0x7a9a8a, xm - 0.09, fy + 1.9, bz2 + dz, 0, IN);
      }
      P.box(0.4, 0.52, 0.04, 0x1c1c26, xm - 1.6, fy + 1.55, z0 + 0.36, 0, IN);
      P.box(0.3, 0.42, 0.05, 0xbfe0d8, xm - 1.6, fy + 1.6, z0 + 0.37, 0, IN);
      P.box(0.3, 0.75, 0.04, 0xf2f0e0, x0 + 2.4, fy + 1.0, z0 + 0.36, 0, IN);
      for (const zz of [z0 + 0.36, z1 - 0.36]) P.box(0.95, 2.15, 0.05, 0x7fa0dc, x0 + 1.0, fy, zz, 0, IN);
      glow(x0 + 2.6, y + 2.55, cz, 0xfff0c0, 1.6);
      maps.lamp(x0 + 2.4, cz, 6.5, 0xffe6a8, 1.0);
      maps.lamp(x0 - 1.5, cz, 6, 0xffe6a8, 0.6);
      maps.blob(cxh + 1.6, cz, 6, 0.3);
      // walls you can walk between, a storey you can walk under
      const top = y + 9.4;
      this.colliders.push({ x: (xm + x1) / 2, z: cz, hw: (x1 - xm) / 2 + 0.1, hd: d / 2 + 0.1, ry: 0, top });
      for (const zz of [z0 + 0.14, z1 - 0.14]) this.colliders.push({ x: mx, z: zz, hw: (xm - x0) / 2, hd: 0.2, ry: 0, top });
      this.colliders.push({ x: cxh, z: cz, hw: w / 2, hd: d / 2, ry: 0, top, bottom: y + 3.0 });
      this.colliders.push({ x: bx, z: bz2, hw: 1.2, hd: 0.7, ry: 0, top: y + 1.1 });
    }

    // ---- Vincent's Chair beside the easel: pipe and tobacco on the rush seat
    {
      const x = 75.0,
        z = 42.3,
        y = H(x, z) + 0.15; // on top of the garden's gravel
      chair(P, x, y, z, 2.2, { s: 1.12 });
      const M = xf(x, y + 0.57, z, 2.2);
      P.cyl(0.04, 0.032, 0.07, 0x5a3418, 0.06, 0, 0.02, 5, undefined, M);
      P.box(0.028, 0.022, 0.22, 0x3a2414, 0.06, 0.02, 0.14, 0, undefined, M);
      P.ball(0.075, 0xf2eedc, -0.1, 0.03, -0.02, 1.2, 0.4, 0.9, 0, undefined, M);
      P.box(0.5, 0.2, 0.34, 0x8a5a2a, x - 0.75, y, z + 0.55, 0.4); // his box of colours
    }

    // ---- Sunflowers: a whole field of them beside the road in
    {
      const X0 = 25,
        X1 = 80,
        Z0 = 85,
        Z1 = 124;
      GP.parts.push(drape(H, (X0 + X1) / 2, (Z0 + Z1) / 2, 0, Z1 - Z0 + 4, X1 - X0 + 5, (i, j) => mix(0x2a5a30, 0x4a6a2a, vnoise(i * 0.9 + 4, j * 0.7)), { lift: 0.16, step: 3.6, cols: 12 }));
      for (let z = Z0; z <= Z1; z += 2.5) {
        const off = (R() - 0.5) * 5;
        for (let x = X0 + off + R(); x <= X1 + off * 0.5; x += 1.1 + R() * 0.5) {
          const pz = z + (R() - 0.5) * 0.7;
          if (nearTrack(x, pz, 1.2) || !open(x, pz, 0.5)) continue;
          sunflower(F, x, H(x, pz) + 0.1, pz, 1.5 + R() * 0.75, -1.9 + (R() - 0.5) * 1.3, 0.3 + R() * 0.12, R, 0.3);
        }
      }
    }

    // ---- Almond Blossom: the orchard under the asylum wall
    {
      GP.parts.push(patch(105, 82, 21, H, (x, y, z) => mix(0x2f8f8a, 0x4fb0a8, vnoise(x * 0.15, z * 0.15)), { lift: 0.15, wobble: 0.15, sx: 1.05, sz: 0.85, rings: 5, seg: 26 }));
      for (let i = 0; i < 5; i++)
        for (let j = 0; j < 4; j++) {
          const x = 90 + i * 7.8 + (R() - 0.5) * 2.4,
            z = 68.5 + j * 8.2 + (R() - 0.5) * 2.4;
          if (nearTrack(x, z, 2.2) || !open(x, z, 2)) continue;
          const y = H(x, z);
          almond(T2, F, x, y, z, R);
          solid(x, z, 0.4, y + 2.2);
          maps.blob(x, z, 4, 0.32);
        }
    }

    // ---- The Red Vineyard: rows of red and yellow vines, the pickers bent double
    {
      const X0 = 107,
        X1 = 150,
        ZC = -29.5,
        rows = 32,
        len = rows * 1.4;
      GP.parts.push(drape(H, (X0 + X1) / 2, ZC, 0, len, X1 - X0 + 3, (i, j) => mix(i % 2 ? 0xdba436 : 0x5f4590, i % 2 ? 0xc27a2a : 0x7a3a6a, vnoise(i * 1.7, j * 2.3)), { lift: 0.18, step: 1.4, cols: 12 }));
      for (let i = 0; i < rows; i += 2) {
        const z = ZC - len / 2 + (i + 0.5) * 1.4;
        for (let x = X0 + R(); x < X1; x += 1.3 + R() * 0.4) {
          const pz = z + (R() - 0.5) * 0.4;
          if (!nearTrack(x, pz, 0.9)) vine(F, x, H(x, pz) + 0.15, pz, R);
        }
      }
      const DRESS = [0x2f4fa8, 0x23408a, 0x3a5ac0, 0x1f3a7a, 0x5a6ad0];
      [[114, -41.5, 0.4], [121.5, -36, 2.2], [126, -21.5, 1.0], [133.5, -18.5, -0.6], [138, -38.5, 3.0], [119, -15.5, 1.7], [144, -24, -2], [129, -44, 0.2]].forEach(([x, z, ry], k) => {
        const up = k === 3 || k === 6, // two have straightened their backs
          y = H(x, z) + 0.12;
        person(P, x, y, z, ry, { dress: 1, coat: k % 3 === 1 ? 0xe8e4d8 : DRESS[k % 5], skirt: DRESS[(k + 2) % 5], bend: up ? 0.1 : 0.95 + R() * 0.3, reach: up ? 0.1 : 0.45, hat: k % 2 ? 'cap' : 'straw', hatCol: k % 2 ? 0xf2efe6 : 0xe2c46a });
        if (k % 2) return;
        P.cyl(0.3, 0.22, 0.32, 0xb8862a, x + 0.75, y, z + 0.45, 7);
        P.ball(0.25, 0x4a2a6a, x + 0.75, y + 0.33, z + 0.45, 1, 0.5, 1, 0);
      });
      const cy = H(117, -29.4);
      cart(P, 117, cy + 0.1, -29.4, 1.5, { body: 0x3a6ad0, wheel: 0x7a3a2a, horse: 1, horseCol: 0x6a4a3a });
      this.colliders.push({ x: 117.9, z: -29.4, hw: 0.8, hd: 2.7, ry: 1.5, top: cy + 2.2 });
    }

    // ---- Wheatfield with Crows: the forked tracks are laid above; here are the birds overhead (see tick)
    {
      const [wx, wz] = this.wheat;
      const NC = 38,
        nv = NC * 24;
      const cg = new THREE.BufferGeometry();
      const pos = new THREE.BufferAttribute(new Float32Array(nv * 3), 3);
      pos.setUsage(THREE.DynamicDrawUsage);
      const nrm = new Float32Array(nv * 3),
        col = new Float32Array(nv * 3),
        dat = new Float32Array(nv * 4);
      for (let i = 0; i < nv; i++) {
        nrm[i * 3 + 1] = 1;
        col.set([0.035, 0.04, 0.075], i * 3);
        dat[i * 4 + 3] = 1;
      }
      cg.setAttribute('position', pos);
      cg.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      cg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      cg.setAttribute('aData', new THREE.BufferAttribute(dat, 4));
      this.crowMesh = new THREE.Mesh(cg, paintMaterial({ stroke: strokes.dab, scale: 1.2, contrast: 0.2, hueVar: 0.2, rim: 0.04, band: 0.3, side: THREE.DoubleSide }));
      this.crowMesh.frustumCulled = false;
      this.crows = Array.from({ length: NC }, () => ({ r: 6 + R() * 26, a: R() * 6.283, w: (0.2 + R() * 0.22) * (R() < 0.75 ? 1 : -1), y: 5.5 + R() * 11, ph: R() * 6.283, s: 0.8 + R() * 0.5, e: 0.7 + R() * 0.5 }));
      this.crowHome = [wx - 6, H(wx, wz), wz];
      this.flyCrows(0);
      S.add(this.crowMesh);
    }

    // ---- Haystacks in Provence, and The Sower striding over the ploughland beyond them
    {
      stack(-75, -70, 2.6, 4.6);
      stack(-78.5, -63.5, 2.2, 3.8);
      stack(-73.5, -60.5, 1.7, 2.8);
      const LM = xf(-71.8, H(-71.8, -70), -70, Math.PI / 2, 1, 1, 1, -0.3);
      for (const sx of [-0.25, 0.25]) P.box(0.06, 3.7, 0.06, 0x8a6a3a, sx, 0, 0, 0, undefined, LM);
      for (let i = 0; i < 7; i++) P.box(0.5, 0.05, 0.05, 0x8a6a3a, 0, 0.4 + i * 0.5, 0, 0, undefined, LM);
      fence(F, H, [[-70.5, -57], [-69, -64], [-70.2, -72], [-73.5, -77.5]], R);
      // violet and ochre furrows running east-west
      const cx = -88,
        cz = -96;
      GP.parts.push(drape(H, cx, cz, 0.1, 31, 41, (i, j) => mix(i % 2 ? 0x5a4a9a : 0xb8823a, i % 2 ? 0x3f4f9a : 0xd9a24a, vnoise(i * 1.3, j * 1.9)), { lift: 0.18, step: 1.1, cols: 14 }));
      const sx = -85,
        sz = -95,
        sy = H(sx, sz) + 0.12;
      person(P, sx, sy, sz, -1.45, { coat: 0x34479a, legs: 0x2a2f6a, hat: 'straw', hatCol: 0xd9b84a, stride: 0.5, bend: 0.12, arms: [Math.PI - 0.25, Math.PI - 1.3], armZ: [-0.1, 0.5], scale: 1.12 });
      P.ball(0.2, 0xe8e2d0, -0.25, 0.98, 0.14, 1, 1.2, 0.8, 0, undefined, xf(sx, sy, sz, -1.45, 1.12, 1.12, 1.12));
      solid(sx, sz, 0.4, sy + 2);
      for (let i = 0; i < 6; i++) glow(sx - 0.9 - R() * 1.2, sy + 0.5 + R() * 0.8, sz - 0.5 + (R() - 0.5), 0xffe08a, 0.28, 0.5);
    }

    // ---- the canal with the Langlois drawbridge, widening into Starry Night Over the Rhône
    {
      // where the water meets the bank, walking out from mid-stream (side 1 = south)
      const shore = (x, side) => {
        const c = channel(x);
        let z = c.zc + side * c.hw;
        for (let i = 0; i < 60 && H(x, z) < WL + 0.12; i++) z += side * 0.2;
        return z;
      };
      const wp = [];
      for (let x = -64; x < 123.9; x += 4) {
        const a = channel(x),
          b = channel(x + 4);
        const a0 = a.zc - a.hw - a.bk,
          a1 = a.zc + a.hw + a.bk,
          b0 = b.zc - b.hw - b.bk,
          b1 = b.zc + b.hw + b.bk;
        wp.push(x, WL, a0, x, WL, a1, x + 4, WL, b1, x, WL, a0, x + 4, WL, b1, x + 4, WL, b0);
      }
      const wg = new THREE.BufferGeometry();
      wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
      const water = new THREE.Mesh(wg, waterMaterial({ stroke: strokes.oil, deep: 0x0a1a4a, shallow: 0x1f4aa0, reflect: 0x3a6ac0, glint: 0xffe9a0, scale: 0.1, glintAmt: 1.3, flow: 0.008 }));
      water.frustumCulled = false;
      S.add(water);

      // -- the drawbridge: stone abutments, two timber leaves, the frames with their balance beams and chains
      const BX = BRIDGE_X,
        DY = WL + 2.1,
        zS = -114.4,
        zN = -131.6;
      const stone = (px, py) => mix(0xd9b85a, 0xa88a4a, clamp(0.5 - py / 3.5)),
        TIM = (px, py, pz) => mix(0xb88a3a, 0x7a5a2a, vnoise(px * 3 + pz, py * 2 + pz));
      for (const [za, zb] of [[-118.8, zS], [zN, -127.2]]) {
        const zm = (za + zb) / 2;
        B.box(5.6, 3.5, zb - za, stone, BX, DY - 3.5, zm);
        for (const sx of [-1, 1]) {
          B.box(0.4, 0.8, zb - za, 0xe0c46a, BX + sx * 2.6, DY, zm);
          this.colliders.push({ x: BX + sx * 2.6, z: zm, hw: 0.25, hd: (zb - za) / 2, ry: 0, top: DY + 0.8, bottom: DY - 0.3 });
        }
      }
      for (const zm of [-121, -125.1]) B.box(4.8, 0.24, 4.15, (px, py, pz) => mix(0x8a6a48, 0xb0905a, vnoise(px * 2.2, pz * 0.4 + zm)), BX, DY - 0.24, zm);
      for (const [fz, sg] of [[-118.9, 1], [-127.1, -1]]) {
        for (const sx of [-1, 1]) {
          const px = BX + sx * 2.45;
          B.box(0.3, 4.6, 0.3, TIM, px, DY, fz);
          B.add(new THREE.BoxGeometry(0.16, 3.6, 0.16), TIM, xf(px, DY + 1.5, fz + sg * 1.0, 0, 1, 1, 1, -sg * 0.588));
          B.add(new THREE.BoxGeometry(0.22, 0.24, 8.2), TIM, xf(px, DY + 4.95, fz + sg * 0.9, 0, 1, 1, 1, sg * 0.13));
          B.box(0.5, 0.5, 1.0, 0x5a4a3a, px, DY + 4.05, fz + sg * 4.6);
          B.cyl(0.03, 0.03, 5.4, 0x23232c, BX + sx * 2.3, DY + 0.05, fz - sg * 3.17, 3);
        }
        B.box(5.5, 0.28, 0.3, TIM, BX, DY + 4.6, fz);
        B.box(5.1, 0.14, 0.14, TIM, BX, DY + 5.38, fz - sg * 3.17);
      }
      (this.platforms ??= []).push({ minx: BX - 2.4, maxx: BX + 2.4, minz: zN, maxz: zS, y: DY });
      // the little yellow cart crossing, driver up
      cart(P, BX + 1.3, DY, -120.2, Math.PI, { horse: 1 });
      person(P, BX + 1.3, DY + 0.76, -119.9, Math.PI, { sit: 1, coat: 0x2f4fa8, hat: 'straw' });
      this.colliders.push({ x: BX + 1.3, z: -121.2, hw: 0.75, hd: 2.6, ry: 0, top: DY + 2.3, bottom: DY - 0.3 });
      // washerwomen at the water's edge below it
      [18.2, 20.0, 21.9].forEach((x, k) => {
        const z = shore(x, 1) + 0.25;
        person(P, x, H(x, z), z, Math.PI + (R() - 0.5) * 0.5, { dress: 1, coat: [0x2f4fa8, 0xc85a6a, 0x3a7a6a][k], skirt: [0x23408a, 0x8a3a4a, 0x2a5a5a][k], bend: 0.95, reach: 0.5, hat: 'cap', hatCol: 0xf4f0e6 });
        P.box(0.5, 0.06, 0.34, 0xf2f0e6, x + 0.1, H(x, z - 0.7) + 0.02, z - 0.7, R() * 3);
      });
      tree(31.8, -133.6, 9.5, 1.3);
      tree(33.7, -135.4, 7.5, 1.1);

      // -- the Rhône: gas lamps along the town bank, each dragging a long yellow reflection over the water
      for (let x = 50; x <= 114; x += 8) {
        const c = channel(x),
          z = c.zc + c.hw + c.bk + 1.8;
        gasLamp(x, z, 4.8, 0xffc23a, 3.6, 11, 0.9);
        const z0 = shore(x, 1);
        for (let k = 0; k < 18; k++) {
          const zz = z0 - 1.4 - k * 1.7 - R() * 0.5,
            ww = (1.7 - k * 0.06) * (0.6 + R() * 0.6),
            ox = (R() - 0.5) * 0.8,
            yy = WL + 0.04;
          if (zz < c.zc - c.hw + 2) break;
          F.quad([x + ox - ww, yy, zz - 0.6], [x + ox - ww, yy, zz + 0.6], [x + ox + ww, yy, zz + 0.6], [x + ox + ww, yy, zz - 0.6], k % 3 === 2 ? 0xff9a2a : 0xffd03a, 0.9 - k * 0.03);
          if (k % 2 === 0) maps.lamp(x, zz, 3.6 - k * 0.1, 0xffc23a, 0.85 - k * 0.035);
        }
        // the town behind the lamps
        const hx = x + 3 + (R() - 0.5) * 3,
          hz = z + 8.5 + R() * 3;
        if (open(hx, hz, 5.5) && !nearRoad(hx, hz, 6))
          farm(B, this, hx, hz, Math.PI + (R() - 0.5) * 0.3, R, { wall: jitter([0x3d5a9c, 0x5a6fa8, 0x6a5aa0, 0x4a7a8a][(x / 8) & 3], R, 0.1), roof: [0x27408c, 0xb23a2c, 0x35307a][(x / 8) % 3 | 0], lit: 0.85, h: 3.6 + R() * 2.4 });
      }
      // two boats moored afloat just off the near bank, a post to tie them to, and the couple who walk there
      const b1 = shore(78, -1);
      boat(F, 76.4, WL - 0.02, b1 + 2.6, 1.0);
      boat(F, 81.4, WL - 0.02, b1 + 2.9, 1.25, 0x234a3a, 0xe0b040);
      P.cyl(0.07, 0.09, 1.0, 0x5a4030, 79, H(79, b1 - 1.2) - 0.1, b1 - 1.2, 5);
      const c9 = channel(90),
        cz = c9.zc - c9.hw - c9.bk - 0.7; // the flat top of the bank
      person(P, 90, H(90, cz), cz, 2.6, { coat: 0x2a3f8a, hat: 'straw' });
      person(P, 90.75, H(90.75, cz + 0.15), cz + 0.15, 2.7, { dress: 1, coat: 0x3a6a8a, skirt: 0x2f4a7a, hat: 'cap', hatCol: 0xd9c890 });
    }

    // ---- the patchwork out to the hills: strips of colour, hedges, fences, haystacks, windbreaks and lit farms.
    // One plot per cell of a staggered 36 x 33 m grid. Every plot is squared to the grid and stays inside
    // 24 x 22 m, so no two can touch, and its centre keeps 14 m or more off roads, tracks and landmarks.
    {
      const STRIP = [0x6a58c8, 0xd9b63a, 0x3f8f4a, 0x2f8f8a, 0xa8502a, 0x8fb84a, 0x7a4a9a, 0xc9a437, 0x4a9a6a, 0x5a78d0];
      const SEQ = ['farm', 'strips', 'hay', 'strips', 'farm', 'strips', 'wind', 'strips'];
      const busy = (x, z) => {
        const rv = riverAt(x, z);
        return (
          inKeep(x, z, 15) ||
          nearTrack(x, z, 14) ||
          nearRoad(x, z, 14) ||
          Math.hypot(x - 8, z + 30) < 100 || // the village and its ring of farms
          Math.hypot(x - 80, z - 46) < 46 || // the asylum
          (x > -62 && x < 56 && z > 4 && z < 138) || // the hill, the road in, the painting's foreground
          (x > 30 && x < 136 && z > -118 && z < -78) || // the town on the Rhône
          ((x + 92) / 1.25) ** 2 + ((z + 22) / 0.85) ** 2 < 50 ** 2 || // the wheatfield
          (rv && Math.abs(z - rv.zc) < rv.hw + rv.bk + 15)
        );
      };
      // a fence or hedge is only set where no planted tree or house stands in its line
      const clearLine = (a, b) => {
        const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5);
        for (let i = 0; i <= n; i++) if (!open(lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n), 1)) return false;
        return true;
      };
      let row = 0,
        kind = 0;
      for (let gz = -186; gz <= 190; gz += 33, row++)
        for (let gx = -190 + (row % 2) * 18; gx <= 190; gx += 36) {
          const x = gx + (R() - 0.5) * 8,
            z = gz + (R() - 0.5) * 6;
          if (Math.hypot(x, z) > 186 || busy(x, z)) continue;
          const turn = R() < 0.5, // rows run east-west instead of north-south
            ry = (turn ? Math.PI / 2 : 0) + (R() - 0.5) * 0.12,
            c = Math.cos(ry),
            s = Math.sin(ry);
          const LX = turn ? 11 : 12, // half the plot along its own x and z
            LZ = turn ? 12 : 11;
          const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
          // nothing tall between the painting's viewpoint and the village
          const low = z < 121 && z > -70 && Math.abs(x + 6) < 0.6 * (121 - z) + 14;
          const k = low ? 'strips' : SEQ[kind++ % SEQ.length];
          if (k === 'farm' && open(x, z, 8)) {
            // a farm facing its yard: fence on three sides with a gap for the gate, hay in the yard, a cypress behind
            const f = farm(B, this, x, z, ry, R);
            const fw = Math.min(LX - 0.5, f.w / 2 + 3 + R() * 2),
              fd = LZ - 0.5;
            const yard = [at(-fw, f.d / 2 + 0.3), at(-fw, fd), at(fw * 0.3, fd), at(fw * 0.3 + 2.6, fd), at(fw, fd), at(fw, f.d / 2 + 0.3)];
            if (clearLine(yard[0], yard[1]) && clearLine(yard[1], yard[2])) fence(F, H, [yard[0], yard[1], yard[2]], R);
            if (clearLine(yard[3], yard[4]) && clearLine(yard[4], yard[5])) fence(F, H, [yard[3], yard[4], yard[5]], R);
            const [tx, tz] = at(-f.w / 2 + 1, -f.d / 2 - 2.4);
            if (open(tx, tz, 1.4)) tree(tx, tz, 7 + R() * 4, 1.2);
            const [hx, hz] = at(fw - 3.2, f.d / 2 + 3 + R() * 1.5);
            if (R() < 0.6 && open(hx, hz, 2.4)) stack(hx, hz, 1.5 + R() * 0.6, 2.6 + R() * 1.2);
          } else if (k === 'hay') {
            // haystacks on the stubble, a fence along it, sometimes the blue cart of the Harvest
            GP.parts.push(drape(H, x, z, ry, 2 * LZ - 4, 2 * LX - 2, () => mix(0xc9a437, 0xe8cc5a, R()), { lift: 0.24, step: 2.7, cols: 4 }));
            const n = 2 + ((R() * 2) | 0);
            for (let i = 0; i < n; i++) {
              const [hx, hz] = at((i - (n - 1) / 2) * 6.5 + (R() - 0.5) * 1.6, 1 + R() * 3.5);
              if (open(hx, hz, 2.6)) stack(hx, hz, 1.6 + R() * 0.9, 2.6 + R() * 1.6);
            }
            const fa = at(-(LX - 1), LZ - 1.5),
              fb = at(LX - 1, LZ - 1.5);
            if (clearLine(fa, fb)) fence(F, H, [fa, fb], R);
            const [cx2, cz2] = at(LX - 4, -(LZ - 4.2));
            if (R() < 0.5 && open(cx2, cz2, 3)) {
              cart(P, cx2, H(cx2, cz2) + 0.24, cz2, ry + 1, { body: 0x3a6ad0, wheel: 0xb0402a });
              solid(cx2, cz2, 1.2, H(cx2, cz2) + 1.6);
            }
          } else if (k === 'wind') {
            // a windbreak of cypresses running into a hedge, a strip of crop on either side of it
            const n = 4 + ((R() * 2) | 0);
            let last = 0;
            for (let i = 0; i < n; i++) {
              last = -LX + 1.6 + i * 3.4;
              const [tx, tz] = at(last, (R() - 0.5) * 0.6);
              if (open(tx, tz, 1.4)) tree(tx, tz, 7.5 + R() * 5, 1.1 + R() * 0.3);
            }
            const ha = at(last + 2.4, 0),
              hb = at(LX - 0.5, 0);
            if (clearLine(ha, hb)) hedge(TR, H, ...ha, ...hb, 1.3, 1.5, R);
            const c0 = (R() * STRIP.length) | 0;
            for (const sg of [-1, 1]) {
              const col = STRIP[(c0 + (sg > 0 ? 3 : 0)) % STRIP.length],
                col2 = jitter(col, R, 0.2);
              GP.parts.push(drape(H, ...at(0, sg * 3.7), ry + Math.PI / 2, 2 * LX - 1, 5.4, (a, b) => mix(col, col2, vnoise(a * 0.9 + sg * 5, b * 3.1 + x)), { lift: 0.24, step: 2.6, cols: 2 }));
            }
          } else {
            // strips of crop side by side: lavender, corn, clover, poppies in the green; a hedge down one side
            const n = 3 + ((R() * 2) | 0),
              wid = (2 * LX - 2.6) / n,
              len = 2 * LZ - 2.4,
              c0 = (R() * STRIP.length) | 0;
            for (let i = 0; i < n; i++) {
              const col = STRIP[(c0 + i * 3) % STRIP.length],
                col2 = jitter(col, R, 0.2),
                lx = (i - (n - 1) / 2) * wid + 0.6;
              GP.parts.push(drape(H, ...at(lx, 0), ry, len, wid - 0.4, (a, b) => mix(col, col2, vnoise(a * 0.9 + i * 7, b * 3.1 + x)), { lift: 0.24, step: 2.6, cols: 2 }));
              if (col === 0xd9b63a || col === 0xc9a437)
                for (let q = 0; q < 3; q++) {
                  const [qx, qz] = at(lx + (R() - 0.5) * wid * 0.4, (q - 1) * len * 0.3 + (R() - 0.5) * 2);
                  if (open(qx, qz, 1.2)) P.cyl(0.12, 0.8, 1.8, (px, py) => mix(0xb88a2a, 0xf0d060, clamp(py / 1.8 + 0.5)), qx, H(qx, qz) + 0.2, qz, 6, { sway: 0.06 });
                }
              else if (col === 0x3f8f4a || col === 0x8fb84a)
                for (let q = 0; q < 14; q++) {
                  const [qx, qz] = at(lx + (R() - 0.5) * (wid - 1.2), (R() - 0.5) * (len - 1.2)),
                    gy = H(qx, qz) + 0.22, // just under the surface of the strip
                    qy = gy + 0.4 + R() * 0.2;
                  F.tri([qx - 0.16, qy, qz, 0.08], [qx + 0.16, qy + 0.05, qz + 0.05, 0.08], [qx, qy + 0.03, qz + 0.2, 0.08], q % 3 ? 0xe0301e : 0xf0502a, 0.25);
                  F.tri([qx - 0.03, gy, qz, 0], [qx + 0.03, gy, qz, 0], [qx, qy, qz + 0.06, 0.08], 0x2f6a34);
                }
            }
            const e = (n * wid) / 2 - 0.1,
              ha = at(-e, -len / 2),
              hb = at(-e, len / 2);
            if (clearLine(ha, hb)) hedge(TR, H, ...ha, ...hb, 1.2 + R() * 0.5, 1.4, R);
          }
        }
    }

    if (TR.p.length) T2.parts.push(TR.geometry());
    S.add(T2.mesh(paintMaterial({ stroke: strokes.wavy, scale: 0.16, contrast: 0.7, hueVar: 0.8, warp: 0.5, accent: 0xb9d06a, accentAmt: 0.3, impasto: 0.16, rim: 0.3, band: 0.26, wallStretch: 0.5, angle: 1.57, side: THREE.DoubleSide, emissive: 1.4 })));
    S.add(GP.mesh(paintMaterial({ stroke: strokes.oil, scale: 0.07, contrast: 0.6, hueVar: 0.55, warp: 0.9, accent: 0xf6e9a0, accentAmt: 0.25, impasto: 0.14, rim: 0.05, band: 0.3, side: THREE.DoubleSide })));
    S.add(F.mesh(paintMaterial({ stroke: strokes.dab, scale: 0.6, contrast: 0.32, hueVar: 0.45, warp: 0.1, rim: 0.12, band: 0.3, side: THREE.DoubleSide, emissive: 1.5 })));
  }

  // the crows: one mesh, every bird rewritten each frame as it wheels and beats over the corn
  flyCrows(t) {
    const attr = this.crowMesh.geometry.attributes.position,
      a = attr.array;
    const [cx, cy, cz] = this.crowHome;
    let o = 0;
    const put = (x, y, z) => {
      a[o++] = x;
      a[o++] = y;
      a[o++] = z;
    };
    for (const c of this.crows) {
      const ang = c.a + t * c.w,
        rad = c.r + Math.sin(t * 0.21 + c.ph) * 4,
        dir = Math.sign(c.w);
      const x = cx + Math.cos(ang) * rad * 1.3,
        z = cz + Math.sin(ang) * rad * 0.85,
        y = cy + c.y + Math.sin(t * 0.5 + c.ph * 2) * 1.4;
      // heading along the ellipse, wings out to either side
      let fx = -Math.sin(ang) * 1.3 * dir,
        fz = Math.cos(ang) * 0.85 * dir;
      const fl = Math.hypot(fx, fz);
      fx /= fl;
      fz /= fl;
      const s = c.s,
        rx = fz * s,
        rz = -fx * s;
      fx *= s;
      fz *= s;
      // a few beats, then a glide
      const beat = 0.25 + 0.75 * smooth(-0.2, 0.5, Math.sin(t * 0.6 + c.ph * 3));
      const wa = Math.sin(t * 7.5 * c.e + c.ph) * 0.75 * beat + 0.12;
      const my = Math.sin(wa) * 0.62 * s,
        ty = my + Math.sin(wa * 1.4 - 0.4) * 0.5 * s;
      put(x + fx * 0.5, y, z + fz * 0.5);
      put(x - rx * 0.12, y, z - rz * 0.12);
      put(x + rx * 0.12, y, z + rz * 0.12);
      put(x - fx * 0.55, y, z - fz * 0.55);
      put(x + rx * 0.12, y, z + rz * 0.12);
      put(x - rx * 0.12, y, z - rz * 0.12);
      for (const g of [-1, 1]) {
        const ax = x + rx * 0.1 * g,
          az = z + rz * 0.1 * g,
          mx = x + rx * 0.62 * g,
          mz = z + rz * 0.62 * g;
        const tx = x + rx * 1.15 * g - fx * 0.12,
          tz = z + rz * 1.15 * g - fz * 0.12;
        put(ax + fx * 0.22, y, az + fz * 0.22);
        put(ax - fx * 0.18, y, az - fz * 0.18);
        put(mx - fx * 0.22, y + my, mz - fz * 0.22);
        put(ax + fx * 0.22, y, az + fz * 0.22);
        put(mx - fx * 0.22, y + my, mz - fz * 0.22);
        put(mx + fx * 0.2, y + my, mz + fz * 0.2);
        put(mx + fx * 0.2, y + my, mz + fz * 0.2);
        put(mx - fx * 0.22, y + my, mz - fz * 0.22);
        put(tx, y + ty, tz);
      }
    }
    attr.needsUpdate = true;
  }

  tick(dt, time) {
    this.flyCrows(time);
  }
}
