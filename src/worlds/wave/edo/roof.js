// Japanese roofs: gable (kirizuma), hip (yosemune) and hip-and-gable (irimoya), with the
// slope that hollows towards the eaves and the corners that lift.
import { cuboid } from '../../../engine/facade.js';

// roof(S, det, o) draws the covering into S and the timber and plaster into det:
//   A, B     half-length along local x (the ridge) and half-depth, both measured at the eaves
//   y, h     height of the eaves, and the rise from eaves to ridge
//   type     'gable' | 'hip' | 'irimoya';  tg: where an irimoya's gable starts (0 ridge .. 1 eaves)
//   hollow   how much the slope sags towards the eaves (0 = straight)
//   lift     how far the corners rise;  thick: the thickness shown at the eaves
//   over     how far the eaves stand out from the wall (for the underside)
//   col, edge, under, gable   colours (col may be a function of position)
export function roof(S, det, o) {
  const { A, B, y, h, type = 'gable', hollow = 0.3, lift = 0, thick = 0.22, col, under = 0x3a2a1e, cx = 0, cz = 0 } = o;
  const tg = type === 'irimoya' ? o.tg ?? 0.55 : 0;
  const curved = hollow > 0 || lift > 0;
  const NT = curved ? 5 : 1,
    NU = lift > 0 ? 6 : 2;
  const p = 1 + hollow;
  const ec = o.edge ?? col;
  const ov = o.over ?? 0.8;
  const rh = o.ridgeH ?? 0.28;
  const hgt = (t) => h * Math.pow(1 - t, p);
  const halfW = (t) => (type === 'gable' ? A : A - B * (1 - Math.max(t, tg)));
  const up = (u, t) => lift * Math.pow(Math.abs(u), 3) * t * t;
  // a point on the front (sgn 1) or back (-1) slope: u -1..1 along the eaves, t 0 ridge .. 1 eaves
  const F = (u, t, sgn) => [cx + u * halfW(t), y + hgt(t) + up(u, t), cz + sgn * B * t];
  // a point on a hipped end
  const E = (v, t, sgn) => [cx + sgn * (A - B * (1 - t)), y + hgt(t) + up(v, t), cz + v * B * t];
  const drop = (q, d) => [q[0], q[1] - d, q[2]];
  const us = (i) => -1 + (2 * i) / NU;

  // the slopes
  S.facing([cx, y - 40, cz]);
  for (const sgn of [1, -1]) {
    for (let i = 0; i < NU; i++)
      for (let j = 0; j < NT; j++) S.quad(F(us(i), j / NT, sgn), F(us(i + 1), j / NT, sgn), F(us(i + 1), (j + 1) / NT, sgn), F(us(i), (j + 1) / NT, sgn), col);
    if (type !== 'gable')
      for (let i = 0; i < NU; i++)
        for (let j = 0; j < NT; j++) {
          const t0 = tg + ((1 - tg) * j) / NT,
            t1 = tg + ((1 - tg) * (j + 1)) / NT;
          S.quad(E(us(i), t0, sgn), E(us(i + 1), t0, sgn), E(us(i + 1), t1, sgn), E(us(i), t1, sgn), col);
        }
  }
  // hip ridges
  if (type !== 'gable')
    for (const sx of [1, -1])
      for (const zs of [1, -1])
        for (let j = 0; j < NT; j++) {
          const a = F(sx, tg + ((1 - tg) * j) / NT, zs),
            b = F(sx, tg + ((1 - tg) * (j + 1)) / NT, zs);
          const dx = b[0] - a[0],
            dz = b[2] - a[2],
            l = Math.hypot(dx, dz) || 1,
            qx = (-dz / l) * 0.14,
            qz = (dx / l) * 0.14;
          const at = [a[0], a[1] + 0.17, a[2]],
            bt = [b[0], b[1] + 0.17, b[2]];
          S.quad([a[0] - qx, a[1], a[2] - qz], [b[0] - qx, b[1], b[2] - qz], bt, at, ec);
          S.quad(at, bt, [b[0] + qx, b[1], b[2] + qz], [a[0] + qx, a[1], a[2] + qz], ec);
        }

  // the thickness of the roof where it ends
  S.facing([cx, y, cz]);
  for (const sgn of [1, -1]) {
    for (let i = 0; i < NU; i++) {
      const a = F(us(i), 1, sgn),
        b = F(us(i + 1), 1, sgn);
      S.quad(a, b, drop(b, thick), drop(a, thick), ec);
    }
    if (type !== 'gable')
      for (let i = 0; i < NU; i++) {
        const a = E(us(i), 1, sgn),
          b = E(us(i + 1), 1, sgn);
        S.quad(a, b, drop(b, thick), drop(a, thick), ec);
      }
    else
      for (let j = 0; j < NT; j++)
        for (const zs of [1, -1]) {
          const a = F(sgn, j / NT, zs),
            b = F(sgn, (j + 1) / NT, zs);
          S.quad(a, b, drop(b, thick), drop(a, thick), ec);
        }
  }

  // the underside of the eaves, back to the wall
  det.facing([cx, y + 60, cz]);
  for (const sgn of [1, -1]) {
    for (let i = 0; i < NU; i++) {
      const a = drop(F(us(i), 1, sgn), thick),
        b = drop(F(us(i + 1), 1, sgn), thick);
      det.quad(a, b, [b[0], y - thick, b[2] - sgn * ov], [a[0], y - thick, a[2] - sgn * ov], under);
    }
    if (type !== 'gable')
      for (let i = 0; i < NU; i++) {
        const a = drop(E(us(i), 1, sgn), thick),
          b = drop(E(us(i + 1), 1, sgn), thick);
        det.quad(a, b, [b[0] - sgn * ov, y - thick, b[2]], [a[0] - sgn * ov, y - thick, a[2]], under);
      }
  }

  // an irimoya's little gables
  const r0 = halfW(0);
  if (type === 'irimoya') {
    det.facing([cx, y, cz]);
    for (const sx of [1, -1]) det.tri([cx + sx * r0, y + hgt(tg), cz - B * tg], [cx + sx * r0, y + hgt(tg), cz + B * tg], [cx + sx * r0, y + h, cz], o.gable ?? 0xefe7d2);
  }
  S.facing(null);
  det.facing(null);

  // the ridge: a course of tiles on edge, turned up at the ends
  if (r0 > 0.05) cuboid(S, [cx - r0, y + h - 0.05, cz - 0.17], [cx + r0, y + h + rh, cz + 0.17], ec, undefined, 'b');
  for (const sx of r0 > 0.05 ? [1, -1] : [1]) cuboid(S, [cx + sx * r0 - 0.17, y + h - 0.02, cz - 0.21], [cx + sx * r0 + 0.17, y + h + rh + 0.2, cz + 0.21], ec, undefined, 'b');
  return { ridgeY: y + h, ridgeHalf: r0 };
}
