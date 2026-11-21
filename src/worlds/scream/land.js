import * as THREE from 'three';
import { Builder, terrain, tiles, mountainRing, blobTree, pine, mix } from '../../engine/build.js';
import { fbm, vnoise, smooth, clamp, lerp } from '../../engine/gl.js';

// The lie of the land: the hillside the road runs along, its trees, the far
// shore of the fjord, and the leaves that blow across all of it.

// ---------------- land
export function addLand(world, kit) {
  const { S, H, wavy } = kit;
  const groundCol = (x, z, y) => {
    const n = vnoise(x * 0.03, z * 0.03);
    const c = mix(0x1a2c52, 0x2c4a5a, n);
    c.lerp(new THREE.Color(0x3a5a44), smooth(0.5, 0.85, vnoise(x * 0.012 + 4, z * 0.012)) * 0.55);
    c.lerp(new THREE.Color(0x5a3a2a), smooth(0.7, 0.95, vnoise(x * 0.02 + 11, z * 0.02 + 3)) * 0.4);
    if (y < 2.2) c.lerp(new THREE.Color(0x6a5a4a), smooth(2.2, 0.2, y));
    return c;
  };
  S.add(tiles(terrain(H, 480, 240, groundCol, 0.7, 2.2, -40, -40), wavy({ scale: 0.06, angle: 0.5 }), { n: 6 }));
}

// ---------------- trees: birches by the road, dark spruce up the hill
// These were blobs and stacked discs once. They still throw the dice exactly as they did,
// into a builder nobody draws, so that what is built after them stands where it stood; all
// that is kept is where each one was (kit.oldTrees), and country/ grows a birch or a
// spruce there.
export function addTrees(world, kit) {
  const { R, H, cs, TX, TZ } = kit;
  const T = new Builder();
  const old = (kit.oldTrees = { birches: [], spruces: [] });
  for (let i = 6; i < cs.length - 6; i += 5) {
    const a = cs[i],
      b = cs[i + 1];
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    const x = a.x + ((b.z - a.z) / L) * (6 + R() * 6),
      z = a.z - ((b.x - a.x) / L) * (6 + R() * 6);
    if (R() < 0.35 || Math.hypot(x, z) < 12) continue;
    const h = 7 + R() * 3,
      r = 2.2 + R();
    blobTree(T, x, H(x, z), z, h, r, R, { trunk: 0xe6e0d4, lo: 0x7a4a1a, hi: 0xe8a030, blobs: 3, trunkH: 0.62, sway: 0.4 });
    old.birches.push({ x, z, h });
  }
  let n = 0,
    guard = 0;
  while (n < 150 && guard++ < 3000) {
    const x = -260 + R() * 480,
      z = -40 + R() * 240;
    const dn = world._roadZ(x) - z;
    if (dn > -9 || Math.hypot(x - TX, z - TZ) < 60) continue;
    const y = H(x, z),
      hh = 9 + R() * 9;
    pine(T, x, y, z, hh, 3 + R() * 1.8, R, { lo: 0x12282c, hi: 0x2a4a3a, trunk: 0x2a1c18, tiers: 4 });
    old.spruces.push({ x, z, h: hh });
    n++;
  }
}

// ---------------- far shore
export function addFarShore(world, kit) {
  const { S, wavy } = kit;
  // (the ring of hills used to end in a cliff where it met itself, due north: for the first
  // stretch east of north it now runs on from where the other end leaves off)
  const ridge = (a) => 26 + fbm(a * 3.2, 1.7, 3) * 80 + Math.sin(a * 4) * 12;
  const far = mountainRing({ radius: 520, base: -6, profile: (a) => lerp(ridge(a + Math.PI * 2), ridge(a), smooth(0, 0.6, a)), colorFn: (x, y) => mix(0x1a2248, 0x34406e, clamp(y / 90)), seg: 200, depth: 110 });
  const fm = new THREE.Mesh(far, wavy({ scale: 0.012, side: THREE.DoubleSide, rim: 0, wallStretch: 2.4, accentAmt: 0.1 }));
  fm.frustumCulled = false;
  S.add(fm);
}

// leaves on the wind
export function addLeaves(world, kit) {
  const { R, H, cs } = kit;
  for (let i = 0; i < 140; i++) {
    const p = cs[(R() * cs.length) | 0];
    world.glows.push({ p: [p.x + (R() - 0.5) * 40, H(p.x, p.z) + 1 + R() * 9, p.z + (R() - 0.5) * 40], c: [0xff8a3a, 0xffc060, 0xe04a2a][(R() * 3) | 0], size: 0.22 + R() * 0.2, drift: 2.6 });
  }
}
