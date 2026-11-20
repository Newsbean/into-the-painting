import * as THREE from 'three';
import { noise2D, glowTexture } from './gl.js';

// ------------------------------------------------------------------
// Uniforms shared by every material in the game. A world swaps the
// values in when it becomes active; materials only hold references.
// ------------------------------------------------------------------
export const G = {
  uTime: { value: 0 },
  uNoise: { value: null },
  uWaves: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, -9999, 0, 0)) },
  uWaveFresh: { value: [0, 0, 0, 0, 0, 0, 0, 0] },
  uRestore: { value: 0 },
  uSkyRestore: { value: 0 },
  uPaper: { value: new THREE.Color(0.93, 0.9, 0.83) },
  uInk: { value: new THREE.Color(0.22, 0.22, 0.25) },
  uRimColor: { value: new THREE.Color(1, 0.85, 0.3) },
  uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.4).normalize() },
  uSunColor: { value: new THREE.Color(0.6, 0.6, 0.7) },
  uSkyColor: { value: new THREE.Color(0.4, 0.5, 0.8) },
  uGroundColor: { value: new THREE.Color(0.2, 0.2, 0.3) },
  uFogColor: { value: new THREE.Color(0.2, 0.3, 0.6) },
  uFog: { value: new THREE.Vector4(0.004, 0, 0.02, 0.9) },
  uLightMap: { value: null },
  uShadeMap: { value: null },
  uHeightMap: { value: null },
  uMapXf: { value: new THREE.Vector4(1 / 400, 1 / 400, 0.5, 0.5) },
  uLamp: { value: 1 },
  uLantern: { value: new THREE.Vector4(0, 0, 0, 10) },
  uLanternColor: { value: new THREE.Color(1, 0.75, 0.4) },
  uWobble: { value: 0 },
  uSway: { value: 0.25 },
  uPixel: { value: 800 },
};

export function initPaintGlobals() {
  G.uNoise.value = noise2D(256, 5);
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blank.needsUpdate = true;
  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  white.needsUpdate = true;
  G.uLightMap.value = blank;
  G.uShadeMap.value = white;
  G.uHeightMap.value = blank;
  G._blank = blank;
  G._white = white;
}

// ------------------------------------------------------------------
// GLSL shared chunks
// ------------------------------------------------------------------
export const COMMON_GLSL = /* glsl */ `
uniform float uTime;
uniform sampler2D uNoise;
uniform vec4 uWaves[8];
uniform float uWaveFresh[8];
uniform float uRestore;
uniform float uSkyRestore;
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uRimColor;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uSkyColor;
uniform vec3 uGroundColor;
uniform vec3 uFogColor;
uniform vec4 uFog;
uniform sampler2D uLightMap;
uniform sampler2D uShadeMap;
uniform sampler2D uHeightMap;
uniform vec4 uMapXf;
uniform float uLamp;
uniform vec4 uLantern;
uniform vec3 uLanternColor;

float sat(float x){ return clamp(x, 0.0, 1.0); }
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 hueShift(vec3 c, float a){
  const vec3 k = vec3(0.57735);
  float ca = cos(a), sa = sin(a);
  return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca);
}
float hash12(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// how much colour has returned at a point; rim = wet edge of a spreading wave
float restoreAt(vec3 P, float nz, out float rim){
  float r = uRestore;
  rim = 0.0;
  for (int i = 0; i < 8; i++){
    vec4 w = uWaves[i];
    if (w.w > 0.01){
      vec3 dv = P - w.xyz;
      dv.y *= 0.3;
      float d = length(dv) + nz;
      r = max(r, 1.0 - smoothstep(w.w - 2.5, w.w, d));
      float e = smoothstep(w.w - 8.0, w.w - 1.0, d) * (1.0 - smoothstep(w.w - 1.0, w.w + 1.2, d));
      rim = max(rim, e * uWaveFresh[i]);
    }
  }
  return r;
}

float fogAmount(vec3 P){
  float dist = length(P - cameraPosition);
  float f = 1.0 - exp(-dist * uFog.x);
  f *= mix(1.0, exp(-max(P.y - uFog.y, 0.0) * uFog.z), 0.75);
  return min(f, uFog.w);
}
vec3 fogColor(){ return mix(uPaper * 0.97, uFogColor, uSkyRestore); }
`;

const PAINT_VERT = /* glsl */ `
attribute vec3 color;
attribute vec4 aData;
uniform float uTime;
uniform float uWobble;
uniform float uSway;
uniform vec4 uSurge;   // amount, dirX, dirZ, speed
uniform float uObjSpace;
uniform float uPulse;   // 1 = rises and subsides as the swell passes
varying vec3 vColor;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vData;
varying vec2 vUv;
void main(){
  vColor = color;
  vUv = uv;
  vData = aData;
  vLocal = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float sw = aData.y;
  if (sw > 0.0){
    float ph = uTime * 1.3 + wp.x * 0.31 + wp.z * 0.27;
    wp.x += sin(ph) * sw * uSway;
    wp.z += cos(ph * 0.83) * sw * uSway * 0.7;
  }
  // the land sways; people (object-space paint) do not, or their painted faces would slide off
  wp.x += sin(wp.y * 0.21 + wp.z * 0.045 + uTime * 0.7) * uWobble * (1.0 - uObjSpace) * clamp(wp.y * 0.05, 0.0, 1.6);
  if (uPulse > 0.0){
    float pu = 0.5 + 0.5 * sin(uTime * uSurge.w * 1.3 - wp.x * 0.012 - wp.z * 0.007);
    wp.y *= mix(1.0, 0.3 + 0.7 * pu, uPulse);
  }
  if (uSurge.x > 0.0){
    // the crest leans out over the trough and draws back, the whole body breathing with it
    float k = smoothstep(0.5, 14.0, wp.y) * (0.3 + 0.7 * smoothstep(10.0, 52.0, wp.y));
    float ph = uTime * uSurge.w + wp.z * 0.03 + wp.x * 0.012;
    float s1 = sin(ph), c1 = cos(ph * 0.9);
    wp.x += uSurge.y * s1 * uSurge.x * k;
    wp.z += uSurge.z * s1 * uSurge.x * k;
    wp.y += c1 * uSurge.x * 0.5 * k + sin(uTime * uSurge.w * 0.6 + wp.x * 0.02) * uSurge.x * 0.22 * smoothstep(0.0, 5.0, wp.y);
  }
  vWorld = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const PAINT_FRAG = /* glsl */ `
${COMMON_GLSL}
uniform sampler2D uStroke;
uniform float uScale;
uniform float uContrast;
uniform float uHueVar;
uniform float uAccentAmt;
uniform vec3 uAccent;
uniform float uAngle;
uniform float uWarp;
uniform float uImpasto;
uniform float uRim;
uniform float uBand;
uniform float uFlat;
uniform float uObjSpace;
uniform float uEmissive;
uniform float uWallStretch;
uniform float uWallVert;
uniform float uBigScale;
uniform float uBig;
uniform sampler2D uMap;
uniform float uUseMap;
uniform vec3 uTintColor;
varying vec2 vUv;
varying vec3 vColor;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vLocal;
varying vec4 vData;

vec3 strokesAt(vec3 p, vec3 w, float sc, vec2 warp){
  float ca = cos(uAngle), sa = sin(uAngle);
  vec2 q = vec2(p.x * ca - p.z * sa, p.x * sa + p.z * ca);
  vec3 s = vec3(0.0);
  if (w.y > 0.01) s += texture2D(uStroke, q * sc + warp).rgb * w.y;
  // on upright surfaces strokes run sideways by default, or top to bottom (uWallVert) for cloth, flame-like trees, falling water
  vec2 wx = mix(vec2(p.z, p.y * uWallStretch), vec2(p.y * uWallStretch, p.z), uWallVert);
  vec2 wz = mix(vec2(p.x, p.y * uWallStretch), vec2(p.y * uWallStretch, p.x), uWallVert);
  if (w.x > 0.01) s += texture2D(uStroke, wx * sc + warp.yx * 0.4).rgb * w.x;
  if (w.z > 0.01) s += texture2D(uStroke, wz * sc + warp * 0.4).rgb * w.z;
  return s;
}
// fine handwork up close, broad loaded strokes that still read from a hilltop
vec3 strokes(vec3 p, vec3 n){
  vec3 w = pow(abs(n), vec3(5.0));
  w /= (w.x + w.y + w.z);
  vec2 warp = (texture2D(uNoise, p.xz * 0.00016).rg - 0.5) * uWarp;
  vec3 s = strokesAt(p, w, uScale, warp);
  if (uBig > 0.0){
    vec3 b = strokesAt(p + 17.3, w, uScale * uBigScale, warp * uBigScale * 1.6);
    s.rg += (b.rg - 0.5) * uBig;
    s.b = mix(s.b, b.b, 0.4);
  }
  return s;
}

void main(){
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 P = vWorld;
  vec3 Pt = mix(P, vLocal, uObjSpace);
  vec3 V = normalize(cameraPosition - P);

  vec3 s = strokes(Pt, N);
  float sv = s.r, sh = s.g, sb = s.b;

  // --- pigment
  vec3 base = vColor;
  if (uUseMap > 0.5) base = texture2D(uMap, vUv).rgb * uTintColor;
  vec3 col = base * (1.0 + (sv - 0.5) * 2.0 * uContrast);
  col = hueShift(col, (sh - 0.5) * uHueVar);
  col = mix(col, uAccent, smoothstep(0.80, 0.93, sh) * uAccentAmt);

  // --- light: two soft planes of tone, edge broken up by the strokes
  float ndl = dot(N, uSunDir) * 0.5 + 0.5;
  float band = smoothstep(0.5 - uBand, 0.5 + uBand, ndl + (sv - 0.5) * 0.35);
  vec3 amb = mix(uGroundColor, uSkyColor, N.y * 0.5 + 0.5);
  vec3 light = amb + uSunColor * band;

  vec2 muv = P.xz * uMapXf.xy + uMapXf.zw;
  float groundH = texture2D(uHeightMap, muv).r;
  float above = max(P.y - groundH, 0.0);
  float shade = texture2D(uShadeMap, muv).r;
  light *= mix(1.0, shade, exp(-above * 0.22));

  // noise breaks the lamp pools into dabs
  float rimW;
  float nz = (sv - 0.5) * 6.0 + (texture2D(uNoise, P.xz * 0.0011).r - 0.5) * 18.0;
  float restore = restoreAt(P, nz, rimW);

  vec3 lamp = texture2D(uLightMap, muv).rgb * uLamp * exp(-above * 0.16);
  lamp *= 0.6 + 0.8 * sv;
  lamp /= 1.0 + luma(lamp) * 1.1;
  light += lamp * 0.7 * restore;

  vec3 Lv = uLantern.xyz - P;
  float ld = length(Lv);
  float latt = sat(1.0 - ld / uLantern.w);
  latt *= latt;
  light += uLanternColor * latt * (0.45 + 0.55 * sat(dot(N, Lv / max(ld, 0.001)))) * (0.6 + 0.8 * sv);

  light = mix(light, vec3(luma(amb + uSunColor * 0.6)) * 1.0, uFlat);
  col *= light;

  // impasto ridges catch the light
  col += uSunColor * pow(sb, 3.0) * uImpasto * (0.3 + band);
  // painted rim so silhouettes read at night
  float fres = pow(1.0 - sat(dot(N, V)), 3.0);
  col += uSkyColor * fres * uRim;

  // windows / lamps
  float em = vData.x;
  if (em > 0.0){
    float fl = 0.86 + 0.14 * sin(uTime * 1.7 + hash12(floor(P.xz * 0.55)) * 60.0);
    vec3 glow = base * (0.9 + 0.5 * sv) * uEmissive * fl;
    col = mix(col, glow, sat(em));
  }

  // --- unrestored: graphite on paper
  float form = 0.34 + 0.46 * band + 0.2 * N.y;
  float tone = sat(form * (0.5 + 0.75 * sqrt(luma(base))));
  float hatch = mix(1.0, 0.45 + 1.0 * sb, 0.75);
  float g = sat(tone * hatch + (sv - 0.5) * 0.22);
  vec3 sketch = mix(uInk, uPaper, smoothstep(0.08, 0.78, g));

  // --- atmosphere
  float fog = fogAmount(P);
  col = mix(col, uFogColor, fog);
  sketch = mix(sketch, uPaper * 0.97, fog * 0.85);

  col = mix(sketch, col, restore);
  col += uRimColor * rimW * (0.6 + sv);

  gl_FragColor = vec4(col, 1.0);
}
`;

const paintDefaults = {
  stroke: null,
  scale: 0.16,
  contrast: 0.42,
  hueVar: 0.5,
  accent: 0xffffff,
  accentAmt: 0,
  angle: 0,
  warp: 0.25,
  impasto: 0.08,
  rim: 0.12,
  band: 0.16,
  flat: 0,
  objSpace: 0,
  emissive: 2.2,
  wallStretch: 1,
  wallVert: 0,
  bigScale: 0.23,
  big: 0.8,
  map: null,
  tintColor: 0xffffff,
  surge: [0, 1, 0, 0.6],
  pulse: 0,
  side: THREE.FrontSide,
};

export function paintMaterial(opts = {}) {
  const o = { ...paintDefaults, ...opts };
  const m = new THREE.ShaderMaterial({
    vertexShader: PAINT_VERT,
    fragmentShader: PAINT_FRAG,
    side: o.side,
    uniforms: {
      ...G,
      uStroke: { value: o.stroke },
      uScale: { value: o.scale },
      uContrast: { value: o.contrast },
      uHueVar: { value: o.hueVar },
      uAccent: { value: new THREE.Color(o.accent) },
      uAccentAmt: { value: o.accentAmt },
      uAngle: { value: o.angle },
      uWarp: { value: o.warp },
      uImpasto: { value: o.impasto },
      uRim: { value: o.rim },
      uBand: { value: o.band },
      uFlat: { value: o.flat },
      uObjSpace: { value: o.objSpace },
      uEmissive: { value: o.emissive },
      uWallStretch: { value: o.wallStretch },
      uWallVert: { value: o.wallVert },
      uBigScale: { value: o.bigScale },
      uBig: { value: o.big },
      uMap: { value: o.map ?? G._white },
      uUseMap: { value: o.map ? 1 : 0 },
      uSurge: { value: new THREE.Vector4(...o.surge) },
      uPulse: { value: o.pulse },
      uTintColor: { value: new THREE.Color(o.tintColor) },
    },
  });
  return m;
}

// ------------------------------------------------------------------
// Water: horizontal dashes of reflected colour.
// ------------------------------------------------------------------
const WATER_VERT = /* glsl */ `
uniform float uTime;
uniform float uSwell;
varying vec3 vWorld;
varying float vH;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float h = sin(wp.x * 0.08 + uTime * 0.8) * 0.5 + sin(wp.z * 0.11 - uTime * 0.6 + wp.x * 0.03) * 0.5
          + sin((wp.x + wp.z) * 0.21 + uTime * 1.1) * 0.25;
  wp.y += h * uSwell;
  vH = h;
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const WATER_FRAG = /* glsl */ `
${COMMON_GLSL}
uniform sampler2D uStroke;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uReflect;
uniform vec3 uGlint;
uniform vec3 uFoam;
uniform float uScale;
uniform float uStripe;
uniform float uGlintAmt;
uniform float uFlow;
uniform float uSwell;
varying vec3 vWorld;
varying float vH;
void main(){
  vec3 P = vWorld;
  vec3 V = normalize(cameraPosition - P);
  vec2 uv = P.xz * uScale;
  vec2 wob = (texture2D(uNoise, P.xz * 0.0007 + uTime * 0.0004).rg - 0.5) * 0.12;
  vec3 s1 = texture2D(uStroke, vec2(uv.x * 0.45 + uTime * uFlow, uv.y * 1.5) + wob).rgb;
  vec3 s2 = texture2D(uStroke, vec2(uv.x * 0.3 - uTime * uFlow * 0.7, uv.y * 1.1 + 0.37) - wob).rgb;
  float sv = (s1.r + s2.r) * 0.5;
  float fres = pow(1.0 - sat(V.y), 2.2);

  vec3 col = mix(uDeep, uShallow, sat(sv * 1.3 - 0.1 + vH * 0.15));
  col = mix(col, uReflect, sat(fres * 0.85 + (s1.r - 0.5) * 0.5) * 0.85);
  col = hueShift(col, (s1.g - 0.5) * 0.35);

  // glitter path under the light
  vec3 R = reflect(-V, normalize(vec3((s1.r - 0.5) * 0.5, 1.0, (s2.r - 0.5) * 0.5)));
  float gl = pow(sat(dot(R, uSunDir)), 14.0);
  col += uGlint * gl * smoothstep(0.5, 0.75, s2.r) * uGlintAmt;

  // woodblock stripes + crest foam
  float stripe = sin(P.z * 0.55 + sin(P.x * 0.13 + uTime * 0.4) * 2.2 + vH * 3.0);
  col = mix(col, mix(uDeep, uShallow, step(0.0, stripe)), uStripe);
  float foam = smoothstep(0.72, 0.9, vH * 0.5 + 0.5 + (s1.r - 0.5) * 0.5) * step(0.001, uSwell);
  col = mix(col, uFoam, foam * 0.85);

  vec2 muv = P.xz * uMapXf.xy + uMapXf.zw;
  float rimW;
  float nz = (sv - 0.5) * 6.0 + (texture2D(uNoise, P.xz * 0.0011).r - 0.5) * 18.0;
  float restore = restoreAt(P, nz, rimW);
  vec3 lamp = texture2D(uLightMap, muv).rgb * uLamp;
  col += lamp * (0.25 + 0.9 * smoothstep(0.45, 0.8, s1.r)) * restore;

  float g = sat(0.62 + (sv - 0.5) * 0.9 + vH * 0.1);
  vec3 sketch = mix(uInk, uPaper, smoothstep(0.1, 0.8, g * (0.5 + s1.b)));

  float fog = fogAmount(P);
  col = mix(col, uFogColor, fog);
  sketch = mix(sketch, uPaper * 0.97, fog * 0.85);
  col = mix(sketch, col, restore);
  col += uRimColor * rimW * (0.6 + sv);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function waterMaterial(o = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    uniforms: {
      ...G,
      uStroke: { value: o.stroke },
      uDeep: { value: new THREE.Color(o.deep ?? 0x10204a) },
      uShallow: { value: new THREE.Color(o.shallow ?? 0x2f62b8) },
      uReflect: { value: new THREE.Color(o.reflect ?? 0x7aa6d8) },
      uGlint: { value: new THREE.Color(o.glint ?? 0xffe9a0) },
      uFoam: { value: new THREE.Color(o.foam ?? 0xf4efe0) },
      uScale: { value: o.scale ?? 0.06 },
      uStripe: { value: o.stripe ?? 0 },
      uGlintAmt: { value: o.glintAmt ?? 1.2 },
      uFlow: { value: o.flow ?? 0.02 },
      uSwell: { value: o.swell ?? 0 },
    },
  });
}

// ------------------------------------------------------------------
// Glow points: lamps, fireflies, pigment motes. One draw call a set.
// ------------------------------------------------------------------
const GLOW_VERT = /* glsl */ `
attribute vec3 color;
attribute vec4 aGlow;   // size, phase, drift, needsRestore
uniform float uTime;
uniform float uPixel;
uniform vec4 uWaves[8];
uniform float uRestore;
uniform float uBoost;
varying vec3 vColor;
varying float vA;
void main(){
  vec3 p = position;
  float ph = aGlow.y * 37.0;
  float dr = aGlow.z;
  p += vec3(sin(uTime * 0.37 + ph), sin(uTime * 0.53 + ph * 1.7) * 0.6, cos(uTime * 0.29 + ph * 2.3)) * dr;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  float r = uRestore;
  for (int i = 0; i < 8; i++){
    vec4 w = uWaves[i];
    if (w.w > 0.01){
      vec3 dv = wp.xyz - w.xyz; dv.y *= 0.3;
      r = max(r, 1.0 - smoothstep(w.w - 2.5, w.w, length(dv)));
    }
  }
  vA = mix(1.0, r, aGlow.w);
  vec4 mv = viewMatrix * wp;
  float fl = 0.78 + 0.22 * sin(uTime * 2.3 + ph);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(aGlow.x * uPixel / max(-mv.z, 0.1) * fl, 420.0);
  vColor = color * uBoost;
}
`;
const GLOW_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vA;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float a = pow(max(1.0 - d, 0.0), 2.2);
  a += pow(max(1.0 - d * 3.2, 0.0), 2.0) * 1.4;
  gl_FragColor = vec4(vColor * a * vA, 1.0);
}
`;

export function glowPoints(list, boost = 1) {
  // list: [{p:[x,y,z], c:THREE.Color|hex, size, drift, needsRestore}]
  const n = list.length;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const dat = new Float32Array(n * 4);
  const c = new THREE.Color();
  list.forEach((g, i) => {
    pos.set(g.p, i * 3);
    c.set(g.c);
    col.set([c.r, c.g, c.b], i * 3);
    dat.set([g.size ?? 2, Math.random(), g.drift ?? 0, g.needsRestore === false ? 0 : 1], i * 4);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aGlow', new THREE.BufferAttribute(dat, 4));
  const mat = new THREE.ShaderMaterial({
    vertexShader: GLOW_VERT,
    fragmentShader: GLOW_FRAG,
    uniforms: { uTime: G.uTime, uPixel: G.uPixel, uWaves: G.uWaves, uRestore: G.uRestore, uBoost: { value: boost } },
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 10;
  return pts;
}

let _glowTex = null;
export function glowSprite(hex, size = 4, opacity = 1) {
  if (!_glowTex) _glowTex = glowTexture(128);
  const m = new THREE.SpriteMaterial({
    map: _glowTex,
    color: hex,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity,
  });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(size);
  s.renderOrder = 11;
  return s;
}

// ------------------------------------------------------------------
// Top-down maps of a world: lamp light, soft contact shade, ground height.
// ------------------------------------------------------------------
export class GroundMaps {
  constructor(extent, heightAt, size = 1024) {
    this.extent = extent;
    this.size = size;
    this.light = document.createElement('canvas');
    this.shade = document.createElement('canvas');
    this.light.width = this.light.height = this.shade.width = this.shade.height = size;
    this.lc = this.light.getContext('2d');
    this.sc = this.shade.getContext('2d');
    this.lc.fillStyle = '#000';
    this.lc.fillRect(0, 0, size, size);
    this.sc.fillStyle = '#fff';
    this.sc.fillRect(0, 0, size, size);
    this.lc.globalCompositeOperation = 'lighter';

    const hs = 256;
    const data = new Uint16Array(hs * hs);
    for (let j = 0; j < hs; j++) {
      for (let i = 0; i < hs; i++) {
        const x = ((i + 0.5) / hs - 0.5) * 2 * extent;
        const z = ((j + 0.5) / hs - 0.5) * 2 * extent;
        data[j * hs + i] = THREE.DataUtils.toHalfFloat(heightAt(x, z));
      }
    }
    this.heightTex = new THREE.DataTexture(data, hs, hs, THREE.RedFormat, THREE.HalfFloatType);
    this.heightTex.minFilter = this.heightTex.magFilter = THREE.LinearFilter;
    this.heightTex.needsUpdate = true;
    this.xf = new THREE.Vector4(1 / (2 * extent), 1 / (2 * extent), 0.5, 0.5);
  }
  px(x) {
    return (x / (2 * this.extent) + 0.5) * this.size;
  }
  // warm pool of lamp light on the ground
  lamp(x, z, radius, hex, strength = 1) {
    const g = this.lc;
    const cx = this.px(x),
      cy = this.px(z),
      r = (radius / (2 * this.extent)) * this.size;
    const c = new THREE.Color(hex);
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    const col = (a) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${a * strength})`;
    grd.addColorStop(0, col(0.95));
    grd.addColorStop(0.35, col(0.45));
    grd.addColorStop(1, col(0));
    g.fillStyle = grd;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  }
  // soft contact shadow under an object
  blob(x, z, radius, strength = 0.4) {
    const g = this.sc;
    const cx = this.px(x),
      cy = this.px(z),
      r = Math.max(1.5, (radius / (2 * this.extent)) * this.size);
    const grd = g.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    grd.addColorStop(0, `rgba(0,0,0,${strength})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  }
  finish() {
    const mk = (cv) => {
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.NoColorSpace;
      t.flipY = false;
      t.minFilter = t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      return t;
    };
    this.lightTex = mk(this.light);
    this.shadeTex = mk(this.shade);
    return this;
  }
  apply() {
    G.uLightMap.value = this.lightTex;
    G.uShadeMap.value = this.shadeTex;
    G.uHeightMap.value = this.heightTex;
    G.uMapXf.value.copy(this.xf);
  }
}
