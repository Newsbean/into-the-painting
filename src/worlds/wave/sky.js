import { Sky } from '../../engine/sky.js';

// A woodblock print: flat fields of colour, a dark blue key line, paper
// showing through. The sky is one long gradation wiped on with a rag.
const SKY = /* glsl */ `
vec3 skyColor(vec3 dIn){
  vec3 d = normalize(vec3(dIn.x, abs(dIn.y) + 0.002, dIn.z));
  float el = asin(d.y);
  float az = atan(d.x, -d.z);
  float grain = texture(uNoise3, vec3(az * 0.9, el * 14.0, 0.3)).r;
  vec3 paperC = vec3(0.94, 0.88, 0.74);
  vec3 dusk = vec3(0.36, 0.40, 0.46);
  // bokashi: dark at the horizon, fading up into bare paper
  float g = exp(-el * 5.2) * (0.86 + 0.2 * grain);
  vec3 col = mix(paperC, dusk, clamp(g, 0.0, 1.0));
  // one great pale cloud standing over the mountain
  float cl = texture(uNoise3, vec3(az * 0.055 + uTime * 0.0006, el * 0.16, 0.7)).g * 0.75 + texture(uNoise3, vec3(az * 0.21, el * 0.5, 0.2)).b * 0.25;
  float cloud = smoothstep(0.5, 0.53, cl + (0.3 - abs(el - 0.42)) * 0.55) * smoothstep(0.1, 0.2, el);
  col = mix(col, vec3(0.97, 0.93, 0.82), cloud * 0.85);
  col = mix(col, vec3(0.99, 0.84, 0.72), smoothstep(0.5, 1.2, el) * 0.35);
  col *= 0.97 + 0.06 * grain;
  // unprinted paper with the faintest pencil plan
  vec3 sk = uPaper * (0.98 - 0.05 * grain - cloud * 0.04);
  float m = paintedIn(d, grain);
  col = mix(sk, col, m);
  return col;
}
`;

export function addSky(world, { S, noise3 }) {
  world.sky = new Sky({ body: SKY, noise3 });
  S.add(world.sky.mesh);
}
