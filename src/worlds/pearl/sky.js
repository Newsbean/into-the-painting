import { Sky } from '../../engine/sky.js';

// Delft, late afternoon. Thin glazes, soft edges, light that comes from one side.
const SKY = /* glsl */ `
uniform vec3 uSun;
vec3 skyColor(vec3 dIn){
  vec3 d = normalize(vec3(dIn.x, abs(dIn.y) + 0.002, dIn.z));
  float h = d.y;
  vec3 zen = vec3(0.36, 0.52, 0.74), hor = vec3(0.98, 0.84, 0.62);
  vec3 col = mix(hor, zen, pow(smoothstep(0.0, 0.75, h), 0.7));
  float sd = max(dot(d, uSun), 0.0);
  col += vec3(1.0, 0.72, 0.38) * pow(sd, 6.0) * 0.5;
  // heaped Dutch cloud: bright where it faces the sun, slate underneath
  vec3 q = d / (d.y + 0.32);
  vec3 w = vec3(q.x * 0.5 + uTime * 0.004, q.z * 0.5, 0.0);
  float c1 = texture(uNoise3, w * 0.22).r;
  float c2 = texture(uNoise3, w * 0.55 + 0.3).g;
  float c3 = texture(uNoise3, w * 1.4 + 0.6).b;
  float cl = c1 * 0.55 + c2 * 0.3 + c3 * 0.15;
  float cover = smoothstep(0.47, 0.62, cl) * smoothstep(0.02, 0.16, h);
  float lit = clamp(0.55 + (c2 - 0.5) * 1.6 + sd * 0.5, 0.0, 1.0);
  vec3 cloud = mix(vec3(0.50, 0.50, 0.58), vec3(1.0, 0.93, 0.80), lit);
  cloud = mix(cloud, vec3(1.0, 0.80, 0.56), pow(sd, 3.0) * 0.5);
  col = mix(col, cloud, cover * 0.94);
  vec3 sk = uPaper * (0.99 - cover * 0.10 * (0.5 + c3) - (1.0 - smoothstep(0.0, 0.2, h)) * 0.05);
  float m = paintedIn(d, c3);
  return mix(sk, col, m);
}
`;

export function addSky(world, kit) {
  const { S, noise3 } = kit;
  world.sky = new Sky({ body: SKY, noise3, uniforms: { uSun: { value: world.sun } } });
  S.add(world.sky.mesh);
}
