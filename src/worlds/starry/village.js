import { Builder, house, lampPost, mix, jitter } from '../../engine/build.js';
import { clamp, lerp } from '../../engine/gl.js';
import { WALLS, ROOFS, SHUT } from './palette.js';

// ---------------- the village
export function village(world, { R, H, maps, B, placed, free, nearRoad, AX, AZ }) {
  const RB = new Builder(); // roofs get longer strokes
  const addHouse = (x, z, ry, o = {}) => {
    const w = o.w ?? 6 + R() * 4,
      d = o.d ?? 5.5 + R() * 2.5,
      h = o.h ?? (R() < 0.35 ? 7.2 : 4.4) + R() * 0.8;
    const rad = Math.max(w, d) * 0.55;
    if (!free(x, z, rad) && !o.force) return false;
    placed.push([x, z, rad]);
    // roofs go into their own builder so they can take different brushwork
    const proxy = { heightAt: H, colliders: world.colliders, maps };
    const walls = new Builder();
    house(walls, proxy, {
      R, x, z, ry, w, d, h,
      wall: jitter(WALLS[(R() * WALLS.length) | 0], R, 0.1),
      roof: jitter(ROOFS[(R() * ROOFS.length) | 0], R, 0.1),
      shutters: SHUT[(R() * SHUT.length) | 0],
      flowerBox: true,
      lit: 0.82,
      ...o,
    });
    B.parts.push(...walls.parts);
    return true;
  };
  const row = (ax, az, bx, bz, off, sides = [-1, 1]) => {
    const len = Math.hypot(bx - ax, bz - az);
    const tx = (bx - ax) / len,
      tz = (bz - az) / len;
    for (const side of sides) {
      let t = 2 + R() * 3;
      while (t < len - 3) {
        const w = 6 + R() * 4.5,
          d = 5.5 + R() * 2.5;
        const px = ax + tx * (t + w / 2),
          pz = az + tz * (t + w / 2);
        const nx = -tz * side,
          nz = tx * side;
        const x = px + nx * (off + d / 2),
          z = pz + nz * (off + d / 2);
        addHouse(x, z, Math.atan2(-nx, -nz), { w, d });
        t += w + 0.6 + R() * 2.2;
      }
    }
  };
  row(1, 24, 6, -4, 3.6);
  row(6, -6, 9, -17, 3.6);
  row(-44, -35, -6, -32, 3.3);
  row(27, -31, 64, -28, 3.3);
  row(12, -64, 22, -90, 3.2);
  row(-34, -9, -10, -3, 2.9);
  row(24, -6, 48, 4, 2.9);
  // a looser outer ring of farmhouses
  for (let i = 0; i < 26; i++) {
    const a = R() * 6.283,
      d = 48 + R() * 34;
    const x = 8 + Math.cos(a) * d,
      z = -30 + Math.sin(a) * d * 0.9;
    if (nearRoad(x, z, 6)) continue;
    addHouse(x, z, R() * 6.283, { lit: 0.6 });
  }

  // church: the steeple that pierces the horizon
  {
    const cx = 10,
      cz = -53,
      y = H(cx, cz);
    const proxy = { heightAt: H, colliders: world.colliders, maps };
    house(B, proxy, { R, x: cx, z: cz - 4, y, w: 9, d: 17, h: 8.5, roofH: 5.5, wall: 0xbfc4dc, roof: 0x27408c, lit: 1, door: true, winH: 2.4, winW: 1, chimney: false, ridgeAlongX: false, trim: 0x2a3050 });
    B.box(4.6, 19, 4.6, (px, py) => mix(0xc6cbe2, 0x8f9ac8, clamp(py / 19 + 0.5)), cx, y - 0.4, cz + 6.6);
    B.hip(5.4, 5.4, 17, 0x1f2f6a, cx, y + 18.6, cz + 6.6, 0, undefined, undefined, 0);
    for (const [ox, oz] of [[0, 2.35], [0, -2.35], [2.35, 0], [-2.35, 0]]) B.box(ox ? 0.12 : 1.3, 2.6, oz ? 0.12 : 1.3, 0xffd56b, cx + ox, y + 13.5, cz + 6.6 + oz, 0, { emissive: 1 });
    world.glows.push({ p: [cx, y + 36.2, cz + 6.6], c: 0xfff3c4, size: 3.2 });
    world.glows.push({ p: [cx, y + 15, cz + 9.2], c: 0xffd56b, size: 4 });
    world.colliders.push({ x: cx, z: cz + 6.6, hw: 2.6, hd: 2.6, ry: 0, top: y + 36 });
    placed.push([cx, cz, 12]);
    maps.lamp(cx, cz + 12, 12, 0xffd08a, 0.8);
  }

  // the asylum of Saint-Paul: long monastery wing, cloister wall, a garden
  {
    const proxy = { heightAt: H, colliders: world.colliders, maps };
    const y = H(AX, AZ);
    house(B, proxy, { R, x: AX + 4, z: AZ - 17, y, w: 34, d: 8, h: 8.4, roofH: 3.2, wall: 0xd9c9a0, roof: 0xb5532e, shutters: 0x5f8f9a, lit: 0.5, chimneyChance: 1, winH: 1.6 });
    house(B, proxy, { R, x: AX + 22, z: AZ - 2, y, w: 8, d: 22, h: 7.6, roofH: 3, wall: 0xcfc09a, roof: 0xa84a2c, shutters: 0x5f8f9a, lit: 0.45, winH: 1.6 });
    // low garden wall
    for (const [wx, wz, ww, wd] of [[AX - 14, AZ, 0.7, 30], [AX + 2, AZ + 15, 32, 0.7]]) {
      B.box(ww, 1.5, wd, 0xb8ab8a, wx, H(wx, wz) - 0.3, wz);
      world.colliders.push({ x: wx, z: wz, hw: ww / 2, hd: wd / 2, ry: 0, top: H(wx, wz) + 1.2 });
    }
    placed.push([AX + 4, AZ - 10, 26], [AX, AZ, 18]);
  }

  // lamps along the streets
  const lampAt = [[3, 30], [-1, 12], [8, -12], [2, -26], [19, -26], [10, -40], [-14, -30], [-34, -37], [-58, -29], [36, -34], [56, -26], [78, -33], [16, -70], [-22, -3], [-44, -9], [32, -2], [52, 12], [66, 32], [-6, 58], [-8, 80]];
  for (const [x, z] of lampAt) lampPost(B, world, x + (nearRoad(x, z) ? 3.1 : 0), z, { glow: 2.6, radius: 10 });
  // string of lights across the square
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = lerp(-3, 23, t),
      z = -22 + Math.sin(t * Math.PI) * -3;
    world.glows.push({ p: [x, 6.4 - Math.sin(t * Math.PI) * 1.6, z], c: [0xff8f5a, 0xffd56b, 0x8fd0ff, 0xff7ab0][i % 4], size: 0.9 });
  }
  maps.lamp(10, -24, 14, 0xffc47a, 0.5);

  // a fountain to anchor the square
  {
    const y = H(10, -32);
    B.cyl(3.1, 3.3, 0.7, 0x8a94c0, 10, y, -32, 14);
    B.cyl(2.7, 2.7, 0.12, 0x5fb0d8, 10, y + 0.62, -32, 14, { emissive: 0.35 });
    B.cyl(0.35, 0.5, 2.2, 0x9aa4cc, 10, y, -32, 8);
    B.cyl(1.1, 0.4, 0.3, 0x9aa4cc, 10, y + 2.1, -32, 10);
    world.colliders.push({ x: 10, z: -32, r: 3.3, top: y + 2.5 });
  }
}
