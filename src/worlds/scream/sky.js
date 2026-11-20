import * as THREE from 'three';
import { Sky } from '../../engine/sky.js';

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

export function addSky(world, kit) {
  const { S, noise3 } = kit;
  world.sky = new Sky({ body: SKY, noise3, uniforms: { uCalm: { value: 0 }, uBigSun: { value: new THREE.Vector3(0.876, 0.122, -0.466).normalize() } } });
  S.add(world.sky.mesh);
}
