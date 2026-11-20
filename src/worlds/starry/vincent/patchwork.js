import { mix, jitter } from '../../../engine/build.js';
import { vnoise, clamp, lerp } from '../../../engine/gl.js';
import { riverAt } from '../terrain.js';
import { drape, hedge, fence, cart, farm } from '../helpers.js';

// ---- the patchwork out to the hills: strips of colour, hedges, fences, haystacks, windbreaks and lit farms.
// One plot per cell of a staggered 36 x 33 m grid. Every plot is squared to the grid and stays inside
// 24 x 22 m, so no two can touch, and its centre keeps 14 m or more off roads, tracks and landmarks.
export function patchwork(world, { H, B, P, F, TR, GP, R, open, nearRoad, nearTrack, inKeep, solid, tree, stack }) {
  const STRIP = [0x6a58c8, 0xd9b63a, 0x3f8f4a, 0x2f8f8a, 0xa8502a, 0x8fb84a, 0x7a4a9a, 0xc9a437, 0x4a9a6a, 0x5a78d0];
  const SEQ = ['farm', 'strips', 'hay', 'strips', 'farm', 'strips', 'wind', 'strips'];
  const busy = (x, z) => {
    const rv = riverAt(x, z);
    return (
      inKeep(x, z, 15) ||
      nearTrack(x, z, 14) ||
      nearRoad(x, z, 14) ||
      Math.hypot(x - 8, z + 30) < 100 || // the village and its ring of farms
      Math.hypot(x - 80, z - 46) < 46 || // the asylum
      (x > -62 && x < 56 && z > 4 && z < 138) || // the hill, the road in, the painting's foreground
      (x > 30 && x < 136 && z > -118 && z < -78) || // the town on the Rhône
      ((x + 92) / 1.25) ** 2 + ((z + 22) / 0.85) ** 2 < 50 ** 2 || // the wheatfield
      (rv && Math.abs(z - rv.zc) < rv.hw + rv.bk + 15)
    );
  };
  // a fence or hedge is only set where no planted tree or house stands in its line
  const clearLine = (a, b) => {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5);
    for (let i = 0; i <= n; i++) if (!open(lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n), 1)) return false;
    return true;
  };
  let row = 0,
    kind = 0;
  for (let gz = -186; gz <= 190; gz += 33, row++)
    for (let gx = -190 + (row % 2) * 18; gx <= 190; gx += 36) {
      const x = gx + (R() - 0.5) * 8,
        z = gz + (R() - 0.5) * 6;
      if (Math.hypot(x, z) > 186 || busy(x, z)) continue;
      const turn = R() < 0.5, // rows run east-west instead of north-south
        ry = (turn ? Math.PI / 2 : 0) + (R() - 0.5) * 0.12,
        c = Math.cos(ry),
        s = Math.sin(ry);
      const LX = turn ? 11 : 12, // half the plot along its own x and z
        LZ = turn ? 12 : 11;
      const at = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
      // nothing tall between the painting's viewpoint and the village
      const low = z < 121 && z > -70 && Math.abs(x + 6) < 0.6 * (121 - z) + 14;
      const k = low ? 'strips' : SEQ[kind++ % SEQ.length];
      if (k === 'farm' && open(x, z, 8)) {
        // a farm facing its yard: fence on three sides with a gap for the gate, hay in the yard, a cypress behind
        const f = farm(B, world, x, z, ry, R);
        const fw = Math.min(LX - 0.5, f.w / 2 + 3 + R() * 2),
          fd = LZ - 0.5;
        const yard = [at(-fw, f.d / 2 + 0.3), at(-fw, fd), at(fw * 0.3, fd), at(fw * 0.3 + 2.6, fd), at(fw, fd), at(fw, f.d / 2 + 0.3)];
        if (clearLine(yard[0], yard[1]) && clearLine(yard[1], yard[2])) fence(F, H, [yard[0], yard[1], yard[2]], R);
        if (clearLine(yard[3], yard[4]) && clearLine(yard[4], yard[5])) fence(F, H, [yard[3], yard[4], yard[5]], R);
        const [tx, tz] = at(-f.w / 2 + 1, -f.d / 2 - 2.4);
        if (open(tx, tz, 1.4)) tree(tx, tz, 7 + R() * 4, 1.2);
        const [hx, hz] = at(fw - 3.2, f.d / 2 + 3 + R() * 1.5);
        if (R() < 0.6 && open(hx, hz, 2.4)) stack(hx, hz, 1.5 + R() * 0.6, 2.6 + R() * 1.2);
      } else if (k === 'hay') {
        // haystacks on the stubble, a fence along it, sometimes the blue cart of the Harvest
        GP.parts.push(drape(H, x, z, ry, 2 * LZ - 4, 2 * LX - 2, () => mix(0xc9a437, 0xe8cc5a, R()), { lift: 0.24, step: 2.7, cols: 4 }));
        const n = 2 + ((R() * 2) | 0);
        for (let i = 0; i < n; i++) {
          const [hx, hz] = at((i - (n - 1) / 2) * 6.5 + (R() - 0.5) * 1.6, 1 + R() * 3.5);
          if (open(hx, hz, 2.6)) stack(hx, hz, 1.6 + R() * 0.9, 2.6 + R() * 1.6);
        }
        const fa = at(-(LX - 1), LZ - 1.5),
          fb = at(LX - 1, LZ - 1.5);
        if (clearLine(fa, fb)) fence(F, H, [fa, fb], R);
        const [cx2, cz2] = at(LX - 4, -(LZ - 4.2));
        if (R() < 0.5 && open(cx2, cz2, 3)) {
          cart(P, cx2, H(cx2, cz2) + 0.24, cz2, ry + 1, { body: 0x3a6ad0, wheel: 0xb0402a });
          solid(cx2, cz2, 1.2, H(cx2, cz2) + 1.6);
        }
      } else if (k === 'wind') {
        // a windbreak of cypresses running into a hedge, a strip of crop on either side of it
        const n = 4 + ((R() * 2) | 0);
        let last = 0;
        for (let i = 0; i < n; i++) {
          last = -LX + 1.6 + i * 3.4;
          const [tx, tz] = at(last, (R() - 0.5) * 0.6);
          if (open(tx, tz, 1.4)) tree(tx, tz, 7.5 + R() * 5, 1.1 + R() * 0.3);
        }
        const ha = at(last + 2.4, 0),
          hb = at(LX - 0.5, 0);
        if (clearLine(ha, hb)) hedge(TR, H, ...ha, ...hb, 1.3, 1.5, R);
        const c0 = (R() * STRIP.length) | 0;
        for (const sg of [-1, 1]) {
          const col = STRIP[(c0 + (sg > 0 ? 3 : 0)) % STRIP.length],
            col2 = jitter(col, R, 0.2);
          GP.parts.push(drape(H, ...at(0, sg * 3.7), ry + Math.PI / 2, 2 * LX - 1, 5.4, (a, b) => mix(col, col2, vnoise(a * 0.9 + sg * 5, b * 3.1 + x)), { lift: 0.24, step: 2.6, cols: 2 }));
        }
      } else {
        // strips of crop side by side: lavender, corn, clover, poppies in the green; a hedge down one side
        const n = 3 + ((R() * 2) | 0),
          wid = (2 * LX - 2.6) / n,
          len = 2 * LZ - 2.4,
          c0 = (R() * STRIP.length) | 0;
        for (let i = 0; i < n; i++) {
          const col = STRIP[(c0 + i * 3) % STRIP.length],
            col2 = jitter(col, R, 0.2),
            lx = (i - (n - 1) / 2) * wid + 0.6;
          GP.parts.push(drape(H, ...at(lx, 0), ry, len, wid - 0.4, (a, b) => mix(col, col2, vnoise(a * 0.9 + i * 7, b * 3.1 + x)), { lift: 0.24, step: 2.6, cols: 2 }));
          if (col === 0xd9b63a || col === 0xc9a437)
            for (let q = 0; q < 3; q++) {
              const [qx, qz] = at(lx + (R() - 0.5) * wid * 0.4, (q - 1) * len * 0.3 + (R() - 0.5) * 2);
              if (open(qx, qz, 1.2)) P.cyl(0.12, 0.8, 1.8, (px, py) => mix(0xb88a2a, 0xf0d060, clamp(py / 1.8 + 0.5)), qx, H(qx, qz) + 0.2, qz, 6, { sway: 0.06 });
            }
          else if (col === 0x3f8f4a || col === 0x8fb84a)
            for (let q = 0; q < 14; q++) {
              const [qx, qz] = at(lx + (R() - 0.5) * (wid - 1.2), (R() - 0.5) * (len - 1.2)),
                gy = H(qx, qz) + 0.22, // just under the surface of the strip
                qy = gy + 0.4 + R() * 0.2;
              F.tri([qx - 0.16, qy, qz, 0.08], [qx + 0.16, qy + 0.05, qz + 0.05, 0.08], [qx, qy + 0.03, qz + 0.2, 0.08], q % 3 ? 0xe0301e : 0xf0502a, 0.25);
              F.tri([qx - 0.03, gy, qz, 0], [qx + 0.03, gy, qz, 0], [qx, qy, qz + 0.06, 0.08], 0x2f6a34);
            }
        }
        const e = (n * wid) / 2 - 0.1,
          ha = at(-e, -len / 2),
          hb = at(-e, len / 2);
        if (clearLine(ha, hb)) hedge(TR, H, ...ha, ...hb, 1.2 + R() * 0.5, 1.4, R);
      }
    }
}
