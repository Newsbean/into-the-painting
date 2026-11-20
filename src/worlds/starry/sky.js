import * as THREE from 'three';
import { Sky } from '../../engine/sky.js';

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
export const dirOf = (az, el) => new THREE.Vector3(Math.sin(az * D2R) * Math.cos(el * D2R), Math.sin(el * D2R), -Math.cos(az * D2R) * Math.cos(el * D2R));

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

// ---------------- sky
export function sky(world, { S, noise3 }) {
  const vort = [],
    vortP = [];
  for (const f of FEATURES) {
    const d = dirOf(f[0], f[1]);
    const r = f[2] * D2R * (f[6] === 1 ? 0.88 : 1);
    vort.push(new THREE.Vector4(d.x, d.y, d.z, 2 / (r * r)));
    vortP.push(new THREE.Vector4(f[3], f[4], f[5], f[6]));
  }
  world.sky = new Sky({ body: SKY, noise3, uniforms: { uVort: { value: vort }, uVortP: { value: vortP }, uMoon: { value: dirOf(25, 29) } } });
  S.add(world.sky.mesh);
}
