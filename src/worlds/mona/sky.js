import { Sky } from '../../engine/sky.js';

// a warm horizon cooling to blue-green overhead, with a little thin cloud
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

export function buildSky(world, kit) {
  const { S, noise3 } = kit;
  world.sky = new Sky({ body: SKY, noise3 });
  S.add(world.sky.mesh);
}
