// The paint of a breaking wave, the way the print draws one: flat Prussian blue, long
// pale streaks that run with the water towards the lip, a cap of white foam cut into
// scallops and trailing fingers, and claws that are white outside and blue-grey inside
// the hook. The ink line round every shape is drawn afterwards by the outline pass.
//
//   waveMaterial({ stroke, surge, pulse, curl })   for a geometry from great-wave.js
//   sprayPoints(list)                              the snow of drops thrown off the crest
import * as THREE from 'three';
import { G, COMMON_GLSL } from '../../engine/paint.js';
import { PRUSSIAN, MIDBLUE, PALE, FOAM } from './palette.js';

const VERT = /* glsl */ `
attribute vec4 aUv;    // water: metres along the surface from the peak (the way the crest runs), 0..1 round the section, metres from the crest line, metres from the lip
attribute vec4 aCl;    // 0 water or 1 claw | how far a claw bends here | its phase | water: how tall the wave stands, claw: its shaded side
attribute vec3 aPiv;   // where a claw is rooted
uniform float uTime;
uniform vec4 uSurge;   // amount, dirX, dirZ, speed
uniform float uPulse;  // 1 = rises and subsides as the swell passes
uniform float uCurl;   // how far the claws clutch
uniform vec3 uCurlAxis;
varying vec4 vUv;
varying vec4 vCl;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vSize;   // how big this wave is beside the great one (1)
void main(){
  vUv = aUv;
  vCl = aCl;
  vSize = aCl.x > 0.5 ? 1.0 : aPiv.x;
  vec3 p = position, n = normal;
  if (aCl.y > 0.0 && uCurl > 0.0){
    // the claws clutch and let go, each in its own time
    float a = -uCurl * aCl.y * (0.3 + sin(uTime * 0.8 + aCl.z * 6.283) + 0.35 * sin(uTime * 1.9 + aCl.z * 17.0));
    float c = cos(a), s = sin(a);
    vec3 d = p - aPiv;
    d = d * c + cross(uCurlAxis, d) * s + uCurlAxis * dot(uCurlAxis, d) * (1.0 - c);
    n = n * c + cross(uCurlAxis, n) * s + uCurlAxis * dot(uCurlAxis, n) * (1.0 - c);
    p = aPiv + d;
  }
  vec4 wp = modelMatrix * vec4(p, 1.0);
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
  vNormal = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = /* glsl */ `
${COMMON_GLSL}
uniform sampler2D uStroke;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uPale;
uniform vec3 uFoamCol;
uniform float uFlow;      // how fast the streaks run
uniform float uFoamAmt;   // how much of the foam has formed
uniform float uGrain;
varying vec4 vUv;
varying vec4 vCl;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vSize;

float h11(float n){ return fract(sin(n * 127.1 + 3.7) * 43758.5453); }
// a row of round-ended tongues: 0 in the gaps between them, 1 down the middle of each
float arch(float x){ float f = fract(x) * 2.0 - 1.0; return sqrt(max(1.0 - f * f, 0.0)); }

void main(){
  vec3 P = vWorld;
  vec3 N = normalize(vNormal);
  float sv = texture2D(uStroke, P.xz * 0.05 + P.y * 0.021).r;
  vec3 col;

  if (vCl.x > 0.5){
    // a claw: bare paper, blue-grey inside the hook, white again at the very tip
    float inside = smoothstep(0.35, 0.55, vCl.w) * (1.0 - smoothstep(0.72, 0.95, vUv.y));
    col = mix(uFoamCol, mix(uPale, uFoamCol, 0.3), inside);
  } else {
    float a = vUv.x, t = vUv.y, ac = vUv.z, at = vUv.w, hs = vCl.w;

    // --- streaks: thin tapered lines that run with the water, all of it drawn towards the lip
    float x = a / 2.6 + sin(at * 0.035 + a * 0.05) * 0.3;
    float id = floor(x), f = fract(x);
    float r1 = h11(id), r2 = h11(id + 31.7);
    float ph = -abs(at) / (46.0 + 60.0 * r1) - uTime * uFlow * (0.7 + 0.6 * r2) + r2 * 9.0;
    float d = fract(ph);
    float taper = smoothstep(0.0, 0.35, d) * (1.0 - smoothstep(0.55, 1.0, d));
    float w = (0.16 + 0.3 * r1) * taper;
    if (r2 > 0.55) w *= 0.45;   // the pale ones are thin
    if (r2 > 0.9) w = 0.0;
    float aa = fwidth(x) * 1.1 + 0.002;
    float line = (1.0 - smoothstep(w - aa, w + aa, abs(f - 0.5))) * step(0.004, w);
    vec3 water = mix(uDeep, r2 > 0.55 ? uPale : uMid, line);
    // in the hollow under the lip the blue is lighter and the lines are whiter
    float hollow = smoothstep(0.5, 0.56, t) * (1.0 - smoothstep(0.8, 0.97, t)) * smoothstep(0.2, 0.6, hs);
    water = mix(water, mix(mix(uDeep, uMid, 0.55), mix(uPale, uFoamCol, 0.5), line), hollow);

    // --- foam, in two fringes. Everything is measured against the great wave, so a
    //     small wave carries the same drawing at its own size.
    float sz = vSize, b = a / sz;
    float tall = smoothstep(0.22, 0.6, hs) * uFoamAmt * sz;
    // along the ridge: fingers of it trail down the back, a shorter fringe looks forward
    float back = 4.0 + 19.0 * arch(b / 7.3 + 0.21) * (0.3 + 0.7 * h11(floor(b / 7.3 + 0.21) + 5.0)) + 2.2 * arch(b / 2.1);
    float fore = 3.0 + 8.0 * arch(b / 4.3 + 0.5) * (0.3 + 0.7 * h11(floor(b / 4.3 + 0.5) + 2.0)) + 1.2 * arch(b / 1.6);
    float ridge = min(ac + back * tall, fore * tall - ac);
    // along the edge of the lip: fingers reach up its outside, tongues hang into the hollow
    float up = 5.0 + 13.0 * arch(b / 6.1 + 0.4) * (0.3 + 0.7 * h11(floor(b / 6.1 + 0.4) + 7.0)) + 1.5 * arch(b / 1.9);
    float under = 3.0 + 15.0 * arch(b / 5.1 + 0.6) * (0.3 + 0.7 * h11(floor(b / 5.1 + 0.6) + 11.0)) + 1.8 * arch(b / 1.7 + 0.3);
    float lipb = min(at + up * tall, under * tall - at);
    float edge = max(ridge, lipb);   // metres inside the foam
    float cap = smoothstep(0.0, fwidth(edge) * 1.2 + 0.01, edge) * step(0.001, tall);
    // rows of scales on the foam, each a blue-grey crescent
    float row = -(ridge > lipb ? ac : at) / (4.4 * sz) + 0.3;
    float ri = floor(row), q = 1.0 - fract(row);
    float ar = arch(b / 4.9 + ri * 0.5 + h11(ri) * 0.37);
    float arc = smoothstep(0.0, 0.1, ar * 0.92 - q) * smoothstep(0.0, 0.1, q - ar * 0.58);
    vec3 foam = mix(uFoamCol, mix(uPale, uFoamCol, 0.35), arc * smoothstep(0.5, 2.5, edge / sz));
    col = mix(water, foam, cap);

    // --- lace where the wave stands out of the sea
    //     (only where it stands steeply: a shallow back slides under the water without a fringe)
    float lx = a / (1.3 + 1.4 * sz);
    float lw = 0.5 + 0.3 * sin(lx * 6.283 + sin(uTime * 0.5 + a * 0.3)) + 0.2 * sin(lx * 15.7 + 1.3);
    float lace = (1.0 - smoothstep(0.0, 0.3, P.y - (0.5 + (0.5 + sz) * lw))) * smoothstep(0.03, 0.2, 1.0 - N.y);
    col = mix(col, uFoamCol, lace);
  }

  // printed flat: the grain of the block and one even light, a little greyer underneath
  col *= 1.0 + (sv - 0.5) * 2.0 * uGrain;
  vec3 amb = mix(uGroundColor, uSkyColor, N.y * 0.5 + 0.5);
  col *= mix(1.0, luma(amb + uSunColor * 0.6), 0.85);

  float rimW;
  float nz = (sv - 0.5) * 6.0 + (texture2D(uNoise, P.xz * 0.0011).r - 0.5) * 18.0;
  float restore = restoreAt(P, nz, rimW);
  // unrestored: the same drawing in graphite on paper
  float tone = sat(0.3 + 0.75 * luma(col)) * (0.75 + 0.5 * sv);
  vec3 sketch = mix(uInk, uPaper, smoothstep(0.08, 0.78, tone));

  float fog = fogAmount(P);
  col = mix(col, uFogColor, fog);
  sketch = mix(sketch, uPaper * 0.97, fog * 0.85);
  col = mix(sketch, col, restore);
  col += uRimColor * rimW * (0.6 + sv);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function waveMaterial(o = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
    uniforms: {
      ...G,
      uStroke: { value: o.stroke },
      uDeep: { value: new THREE.Color(o.deep ?? PRUSSIAN) },
      uMid: { value: new THREE.Color(o.mid ?? MIDBLUE) },
      uPale: { value: new THREE.Color(o.pale ?? PALE) },
      uFoamCol: { value: new THREE.Color(o.foam ?? FOAM) },
      uFlow: { value: o.flow ?? 0.16 },
      uFoamAmt: { value: o.foamAmt ?? 1 },
      uGrain: { value: o.grain ?? 0.1 },
      uSurge: { value: new THREE.Vector4(...(o.surge ?? [0, 1, 0, 0.6])) },
      uPulse: { value: o.pulse ?? 0 },
      uCurl: { value: o.curl ?? 0 },
      uCurlAxis: { value: new THREE.Vector3(...(o.curlAxis ?? [0, 0, 1])) },
    },
  });
}

// ------------------------------------------------------------------
// Spray: round drops of bare paper thrown off the crest, sinking like snow.
// ------------------------------------------------------------------
const SPRAY_VERT = /* glsl */ `
attribute vec3 aVel;
attribute vec4 aS;      // seed, size in metres, life in seconds
uniform float uTime;
uniform float uPixel;
uniform float uBoost;
uniform float uGravity;
uniform vec4 uFog;
varying float vA;
varying float vFog;
void main(){
  float life = fract(uTime / aS.z + aS.x);
  float tau = life * aS.z;
  vec3 p = position + aVel * tau;
  p.y -= 0.5 * uGravity * tau * tau;
  p.x += sin(uTime * 0.6 + aS.x * 40.0) * 0.8;
  p.z += cos(uTime * 0.5 + aS.x * 61.0) * 0.8;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vA = smoothstep(0.0, 0.05, life) * (1.0 - smoothstep(0.7, 1.0, life)) * uBoost * step(0.4, wp.y);
  vec4 mv = viewMatrix * wp;
  vFog = min(1.0 - exp(mv.z * uFog.x), uFog.w);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(aS.y * (0.55 + 0.45 * (1.0 - life)) * uPixel / max(-mv.z, 0.1), 48.0);
}
`;
const SPRAY_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uFogColor;
varying float vA;
varying float vFog;
void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.78, 1.0, d)) * vA;
  if (a < 0.03) discard;
  gl_FragColor = vec4(mix(uColor, uFogColor, vFog * 0.7), a);
}
`;

// list: [{ p: [x, y, z], v: [vx, vy, vz], size, life }]
export function sprayPoints(list, { color = FOAM, gravity = 2, boost = 1, seedOf = Math.random } = {}) {
  const n = list.length;
  const pos = new Float32Array(n * 3),
    vel = new Float32Array(n * 3),
    dat = new Float32Array(n * 4);
  list.forEach((s, i) => {
    pos.set(s.p, i * 3);
    vel.set(s.v, i * 3);
    dat.set([seedOf(), s.size ?? 0.4, s.life ?? 8, 0], i * 4);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
  geo.setAttribute('aS', new THREE.BufferAttribute(dat, 4));
  const mat = new THREE.ShaderMaterial({
    vertexShader: SPRAY_VERT,
    fragmentShader: SPRAY_FRAG,
    uniforms: { uTime: G.uTime, uPixel: G.uPixel, uFog: G.uFog, uFogColor: G.uFogColor, uBoost: { value: boost }, uGravity: { value: gravity }, uColor: { value: new THREE.Color(color) } },
    transparent: true,
    depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 9;
  return pts;
}
