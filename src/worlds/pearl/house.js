import * as THREE from 'three';
import { G } from '../../engine/paint.js';
import { mix } from '../../engine/build.js';
import { vnoise, clamp } from '../../engine/gl.js';

// Vermeer's house on the north bank: the hall you arrive in, the studio through
// the archway, the light from its three tall windows and the motes in it.

// the plan: the walls stand on these lines, the ceiling is at CE
const X0 = 28,
  X1 = 40,
  Z0 = -36,
  Z1 = -24.5,
  CE = 4.7;

// ---------------- Vermeer's house: the studio you can walk into
// The whole house goes into kit.B, after the town (index.js bakes it).
export function addHouse(world, kit) {
  const { B, maps } = kit;
  const brick = 0x9c5238,
    plaster = 0xd9cdb0,
    dark = 0x1a1612;
  const wallCol = (x, y) => mix(plaster, 0xb8a888, clamp(0.5 - y * 0.12));
  // floor: black and white marble
  for (let i = 0; i < 12; i++)
    for (let j = 0; j < 12; j++) B.box(1, 0.12, 0.96, (i + j) & 1 ? 0x1c1a1c : 0xe6ddc8, X0 + 0.5 + i, 0.0, Z0 + 0.48 + j * 0.958);
  // back wall is the dark ground the girl stands against
  B.box(12.6, 9.4, 0.5, (x, y, z) => (z > 0 ? new THREE.Color(0x0c0a08) : new THREE.Color(brick)), 34, 0, Z0 - 0.25);
  world.colliders.push({ x: 34, z: Z0 - 0.25, hw: 6.3, hd: 0.4, ry: 0, top: 12 });
  // east wall
  B.box(0.5, 9.4, 12, (x) => (x < 0 ? wallCol(0, 0) : new THREE.Color(brick)), X1 + 0.25, 0, -30.25);
  world.colliders.push({ x: X1 + 0.25, z: -30.25, hw: 0.4, hd: 6, ry: 0, top: 12 });
  // west wall with three tall leaded windows
  for (const [z, len, y0, hh] of [[-35.35, 1.3, 0, 9.4], [-32.3, 1.0, 0, 9.4], [-29.2, 1.0, 0, 9.4], [-25.6, 2.2, 0, 9.4]]) B.box(0.5, hh, len, (x) => (x > 0 ? wallCol(0, 0) : new THREE.Color(brick)), X0 - 0.25, y0, z);
  for (const z of [-33.75, -30.75, -27.7]) {
    B.box(0.5, 1.0, 2.2, brick, X0 - 0.25, 0, z);
    B.box(0.5, 5.0, 2.2, brick, X0 - 0.25, 4.4, z);
    B.box(0.1, 3.4, 2.0, 0xffe3a0, X0 - 0.3, 1.0, z, 0, { emissive: 0.55 });
    for (let k = 0; k < 4; k++) B.box(0.14, 0.05, 2.0, 0x4a4032, X0 - 0.25, 1.0 + k * 0.85, z);
    for (let k = -1; k <= 1; k++) B.box(0.14, 3.4, 0.05, 0x4a4032, X0 - 0.25, 1.0, z + k * 0.55);
    maps.lamp(X0 + 2.6, z + 0.6, 4.2, 0xffd590, 0.5);
  }
  world.colliders.push({ x: X0 - 0.25, z: -30.25, hw: 0.4, hd: 6, ry: 0, top: 12 });
  // front wall with a wide doorway onto the quay
  B.box(4.6, 9.4, 0.5, (x, y, z) => (z < 0 ? wallCol(0, 0) : new THREE.Color(brick)), 30.3, 0, Z1 + 0.25);
  B.box(4.6, 9.4, 0.5, (x, y, z) => (z < 0 ? wallCol(0, 0) : new THREE.Color(brick)), 37.7, 0, Z1 + 0.25);
  B.box(2.8, 6.4, 0.5, brick, 34, 3.0, Z1 + 0.25);
  world.colliders.push({ x: 30.3, z: Z1 + 0.25, hw: 2.3, hd: 0.4, ry: 0, top: 12 }, { x: 37.7, z: Z1 + 0.25, hw: 2.3, hd: 0.4, ry: 0, top: 12 });
  // beamed ceiling (seen only from inside), stepped-gable roof above
  B.box(12, 0.3, 11.5, 0x3a2c20, 34, CE, -30.25);
  for (let x = X0 + 1; x < X1; x += 1.6) B.box(0.3, 0.35, 11.5, 0x2a1e16, x, CE - 0.35, -30.25);
  B.gable(13.4, 12.6, 5.4, 0xa84e2c, 34, 9.4, -30.25, 0);
  for (const sgn of [-1, 1]) for (let s = 0; s < 4; s++) B.box(12.6 * (1 - s / 4) + 0.3, 1.6, 0.4, brick, 34, 9.4 + s * 1.35, -30.25 + sgn * 6.3);
  world.rooms.push({ minx: X0 + 0.3, maxx: X1 - 0.3, minz: Z0 + 0.3, maxz: Z1 - 0.2, ceil: CE - 0.5 });
  // the hall: an archway through to the studio, a chest, pictures, a coat on its peg
  for (const sx of [-1, 1]) {
    B.box(2.6, CE, 0.4, wallCol(0, 0), 34 + sx * 4.7, 0, -28.9);
    world.colliders.push({ x: 34 + sx * 4.7, z: -28.9, hw: 1.35, hd: 0.3, ry: 0, top: CE });
    B.box(0.34, CE, 0.5, 0x4a3626, 34 + sx * 3.4, 0, -28.9);
  }
  B.box(7.2, 0.9, 0.5, 0x4a3626, 34, CE - 0.9, -28.9);
  B.box(1.8, 0.8, 0.7, 0x5a3c24, 29.3, 0, -26.3);
  B.box(1.9, 0.08, 0.8, 0x3a2618, 29.3, 0.8, -26.3);
  world.colliders.push({ x: 29.3, z: -26.3, hw: 0.95, hd: 0.4, ry: 0, top: 1 });
  for (const [pz, pc] of [[-25.6, 0x3a5a7a], [-27.4, 0x8a6a3a]]) {
    B.box(0.08, 1.1, 1.3, 0xb8963a, X1 - 0.05, 1.7, pz);
    B.box(0.06, 0.9, 1.1, pc, X1 - 0.1, 1.8, pz);
  }
  B.box(0.5, 1.2, 0.16, 0x3a3440, 37.6, 1.3, Z1 - 0.1);
  B.cyl(0.2, 0.26, 0.5, 0x2f5a8a, 38.9, 0, -25.4, 10);
  B.ball(0.3, 0xd9443a, 38.9, 0.75, -25.4, 1, 0.8, 1, 1);
  B.ball(0.22, 0xf2c530, 39.05, 0.9, -25.25, 1, 0.8, 1, 1);
  maps.lamp(34, -26.4, 5, 0xffd9a0, 0.35);
  world.colliders.push({ x: 34, z: -30.25, hw: 6.6, hd: 6.4, ry: 0, top: 16, bottom: CE + 0.4 });
  // furniture: table with a blue cloth and a white jug, a chair, the easel
  B.box(2.2, 0.95, 1.2, (x, y) => mix(0x1f3f8a, 0x4a72c0, clamp(y + 0.5)), 30.2, 0, -33.6);
  B.cyl(0.13, 0.18, 0.42, 0xf2ede0, 29.9, 0.95, -33.5, 10);
  B.ball(0.14, 0xd9a83a, 30.6, 1.08, -33.8, 1, 0.9, 1, 1);
  B.box(0.6, 0.55, 0.6, 0x3a5a8a, 31.6, 0, -31.6);
  B.box(0.6, 1.3, 0.08, 0x4a3626, 31.6, 0, -31.3);
  for (const [ox, rz] of [[-0.4, 0.13], [0.4, -0.13]]) B.cyl(0.035, 0.035, 2.2, 0x6a4a2a, 37.0 + ox, 0, -31.4, 5, undefined, undefined, 0, rz);
  B.cyl(0.035, 0.035, 2.2, 0x6a4a2a, 37.3, 0, -30.9, 5, undefined, undefined, 0.28, 0);
  B.box(0.06, 1.15, 0.95, 0x16130f, 36.96, 0.9, -31.4, -0.3);
  B.box(0.05, 1.05, 0.85, 0xd9cdb0, 36.9, 0.95, -31.4, -0.3);
  // a map on the east wall, as he liked
  B.box(0.06, 1.7, 2.6, (x, y, z) => mix(0xc9b68a, 0xa8925e, vnoise(z * 3, y * 3)), X1 - 0.05, 1.8, -31.5);
  world.colliders.push({ x: 30.2, z: -33.6, hw: 1.15, hd: 0.65, ry: 0, top: 1.4 });
  maps.blob(34, -30.25, 10, 0.5);
  world.studio = { X0, X1, Z0, Z1 };
}

// light through the studio windows
export function addShafts(world, kit) {
  const { S } = kit;
  world.shafts = [];
  for (const z of [-33.75, -30.75, -27.7]) {
    const g = new THREE.BufferGeometry();
    const y0 = 1.0,
      y1 = 4.4,
      reach = 7.5;
    const v = [X0, y1, z - 1, X0, y1, z + 1, X0 + reach, 0.02, z + 2.2, X0, y1, z - 1, X0 + reach, 0.02, z + 2.2, X0 + reach * 0.62, 0.02, z - 0.2, X0, y0, z - 1, X0, y0, z + 1, X0 + reach * 0.45, 0.02, z + 1.5];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    const m = new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms: { uAmt: { value: 0.2 }, uTime: G.uTime, uNoise: G.uNoise },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vP; uniform float uAmt; uniform float uTime; uniform sampler2D uNoise;
          void main(){ float n = texture2D(uNoise, vec2(vP.z * 0.01 + uTime * 0.002, vP.y * 0.004)).r; gl_FragColor = vec4(vec3(1.0, 0.82, 0.5) * uAmt * (0.6 + 0.8 * n), 1.0); }`,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    );
    m.renderOrder = 8;
    S.add(m);
    world.shafts.push(m);
  }
}

// motes in the studio light
export function addMotes(world, kit) {
  const { R } = kit;
  for (let i = 0; i < 70; i++) world.glows.push({ p: [X0 + 0.6 + R() * 7, 0.4 + R() * 3.6, Z0 + 1 + R() * 10], c: 0xffe6b0, size: 0.07 + R() * 0.07, drift: 0.5 });
}
