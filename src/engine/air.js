// What drifts in the air, for any world: petals (or leaves, or snow) carried on the wind
// wherever you stand, and smoke climbing from roofs.
//
//   addPetals(scene, { count, box, wind, colors, landZ })
//   addSmoke(scene, hearths, { color, wind })      hearths: [[x, y, z], ...]
import * as THREE from 'three';
import { G, COMMON_GLSL } from './paint.js';
import { rng } from './gl.js';

// ---------------------------------------------------------------- petals
// The petals fill a box that travels with the camera: one that drifts out of one side
// comes in at the other, so there are always some about you and never any far away.
const PETAL_VERT = /* glsl */ `
${COMMON_GLSL}
attribute vec4 aSeed;   // where in the box (0..1), and its own number
uniform float uPixel;
uniform vec3 uBox;
uniform vec3 uWind;
uniform vec2 uLandZ;    // they are only seen where z runs from below .x to above .y
varying float vA;
varying float vPh;
void main(){
  float n = aSeed.w;
  vec3 q = aSeed.xyz * uBox + uWind * uTime * (0.7 + 0.6 * n);
  q.y -= uTime * (0.45 + 0.4 * n);
  q.x += sin(uTime * 1.3 + n * 40.0) * 0.6;
  q.z += cos(uTime * 1.1 + n * 23.0) * 0.6;
  vec3 p = mod(q - cameraPosition, uBox) - uBox * 0.5 + cameraPosition;
  // they blow in drifts, and never under the ground
  float drift = smoothstep(0.38, 0.6, texture2D(uNoise, p.xz * 0.004 + uTime * 0.004).r);
  float gh = texture2D(uHeightMap, p.xz * uMapXf.xy + uMapXf.zw).r;
  vec3 e = abs(p - cameraPosition) / (uBox * 0.5);
  float rim;
  vA = drift * smoothstep(uLandZ.x, uLandZ.y, p.z) * step(max(gh, 0.0) + 0.05, p.y)
     * (1.0 - smoothstep(0.75, 1.0, max(e.x, max(e.y, e.z))))
     * (0.2 + 0.8 * restoreAt(p, 0.0, rim));
  vPh = n;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min((0.16 + 0.12 * n) * uPixel / max(-mv.z, 0.1), 28.0);
}
`;
const PETAL_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColA;
uniform vec3 uColB;
varying float vA;
varying float vPh;
void main(){
  // a petal is an oval, turning over as it falls
  vec2 c = gl_PointCoord - 0.5;
  float a = vPh * 6.283 + uTime * (1.0 + vPh * 2.0);
  c = mat2(cos(a), -sin(a), sin(a), cos(a)) * c;
  float d = length(c * vec2(1.0, 1.7 + 0.8 * sin(uTime * 2.3 + vPh * 31.0))) * 2.0;
  float al = (1.0 - smoothstep(0.8, 1.0, d)) * vA;
  if (al < 0.04) discard;
  gl_FragColor = vec4(mix(uColA, uColB, fract(vPh * 7.0)), al);
}
`;

export function addPetals(scene, o = {}) {
  const R = rng(o.seed ?? 331);
  const n = o.count ?? 800;
  const seed = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) seed[i] = R();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const [ca, cb] = o.colors ?? [0xf5c7d4, 0xfff0f0];
  const mat = new THREE.ShaderMaterial({
    vertexShader: PETAL_VERT,
    fragmentShader: PETAL_FRAG,
    uniforms: {
      ...G,
      uBox: { value: new THREE.Vector3(...(o.box ?? [70, 26, 70])) },
      uWind: { value: new THREE.Vector3(...(o.wind ?? [1.5, 0, 0.5])) },
      uLandZ: { value: new THREE.Vector2(...(o.landZ ?? [-1e6, -1e6 + 1])) },
      uColA: { value: new THREE.Color(ca) },
      uColB: { value: new THREE.Color(cb) },
    },
    transparent: true,
    depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 8;
  scene.add(pts);
  return pts;
}

// ---------------------------------------------------------------- smoke
const SMOKE_VERT = /* glsl */ `
${COMMON_GLSL}
attribute vec4 aS;   // its own number, how far it climbs, how long it lasts, how wide it grows
uniform float uPixel;
uniform vec3 uWind;
varying float vA;
varying float vFog;
void main(){
  float life = fract(uTime / aS.z + aS.x);
  vec3 p = position;
  p.y += life * aS.y;
  p.xz += uWind.xz * life * life * aS.y * 0.55 + vec2(sin(uTime * 0.5 + aS.x * 30.0), cos(uTime * 0.4 + aS.x * 17.0)) * life * 0.9;
  float rim;
  vA = smoothstep(0.0, 0.12, life) * (1.0 - smoothstep(0.45, 1.0, life)) * 0.55 * restoreAt(p, 0.0, rim);
  vFog = fogAmount(p);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min((0.7 + life * aS.w) * uPixel / max(-mv.z, 0.1), 220.0);
}
`;
const SMOKE_FRAG = /* glsl */ `
uniform vec3 uFogColor;
uniform vec3 uColor;
varying float vA;
varying float vFog;
void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float al = (1.0 - smoothstep(0.55, 1.0, d)) * vA * (1.0 - vFog * 0.6);
  if (al < 0.02) discard;
  gl_FragColor = vec4(mix(uColor, uFogColor, vFog), al);
}
`;

// hearths: [[x, y, z], ...] where a plume leaves a roof
export function addSmoke(scene, hearths, o = {}) {
  const R = rng(o.seed ?? 72);
  const per = 9,
    n = hearths.length * per;
  const pos = new Float32Array(n * 3),
    dat = new Float32Array(n * 4);
  hearths.forEach((h, k) => {
    const life = 9 + R() * 5,
      climb = 9 + R() * 6;
    for (let i = 0; i < per; i++) {
      pos.set(h, (k * per + i) * 3);
      dat.set([(i + R() * 0.5) / per + k * 0.37, climb, life, 3 + R() * 2.5], (k * per + i) * 4);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aS', new THREE.BufferAttribute(dat, 4));
  const mat = new THREE.ShaderMaterial({
    vertexShader: SMOKE_VERT,
    fragmentShader: SMOKE_FRAG,
    uniforms: { ...G, uWind: { value: new THREE.Vector3(...(o.wind ?? [1.5, 0, 0.5])) }, uColor: { value: new THREE.Color(o.color ?? 0xe6dfcc) } },
    transparent: true,
    depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 7;
  scene.add(pts);
  return pts;
}
