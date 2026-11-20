// Where the town lies and how its streets run.
//
// The old village of the painting keeps its place under the hill. The town is new: it
// stands on the far bank of the Rhône, behind the drawbridge, and fills the plain up to
// the foot of the Alpilles. From the painter's hill it is the field of lit roofs
// between the church spire and the mountains.
//
//   z = -176  the quay along the river (houses on the land side only)
//   z = -304  the boulevard, crossing
//   x =   27  the avenue that comes over the drawbridge, at the Place du Forum
import { smooth, vnoise } from '../../../engine/gl.js';

export const TOWN = { x0: -236, x1: 280, z0: -470, z1: -170, cx: 22, cz: -320 };
export const FORUM = { x: 27, z: -304, r: 24 }; // the market square
export const QUAY_FOOT = { x: 27, z: -171, r: 12 }; // where the avenue meets the river

// 1 inside the town's rectangle, falling to 0 over `edge` metres outside it
export function townWeight(x, z, edge = 46) {
  const dx = Math.max(TOWN.x0 - x, 0, x - TOWN.x1),
    dz = Math.max(TOWN.z0 - z, 0, z - TOWN.z1);
  return 1 - smooth(0, edge, Math.hypot(dx, dz));
}
// the town stands on a plain that climbs gently away from the river
export const townLevel = (x, z) => 0.8 + (TOWN.z1 - z) * 0.013 + (vnoise(x * 0.006 + 2, z * 0.006 + 5) - 0.5) * 3;

// the built-up area: a soft-cornered block with a ragged edge
export function inTown(x, z, grow = 0) {
  const u = (x - TOWN.cx) / (262 + grow),
    v = (z - TOWN.cz) / (154 + grow);
  return u ** 4 + v ** 4 < 1 + (vnoise(x * 0.02 + 4, z * 0.02 + 9) - 0.5) * 0.35;
}

// streets are drawn a little out of true, the way old towns are
const bendZ = (x, z) => z + (vnoise(x * 0.011 + 8, z * 0.004 + 6) - 0.5) * 16;
const bendX = (x, z) => x + (vnoise(z * 0.011 + 3, x * 0.004 + 1) - 0.5) * 20;

export function townStreets() {
  const S = [];
  for (const z of [-176, -240, -304, -368, -432]) {
    const quay = z === -176,
      boulevard = z === -304;
    const pts = [];
    for (let x = TOWN.x0 - 8; x <= TOWN.x1 + 8; x += 24) pts.push([x, quay ? z + (vnoise(x * 0.01, 3.3) - 0.5) * 5 : bendZ(x, z)]);
    S.push({
      name: quay ? 'quay' : boulevard ? 'boulevard' : 'street',
      pts,
      w: boulevard ? 13 : quay ? 10.5 : 8.5,
      main: boulevard || quay,
      festive: boulevard,
      sides: quay ? [-1] : undefined, // traced west to east, -1 is the north side: the river side stays open
    });
  }
  for (const x of [-200, -128, -56, 27, 100, 172, 244]) {
    const avenue = x === 27;
    const pts = [];
    for (let z = TOWN.z1 + 2; z >= TOWN.z0 - 8; z -= 24) pts.push([avenue ? x + (vnoise(z * 0.01, 7.7) - 0.5) * 6 : bendX(x, z), z]);
    S.push({ name: avenue ? 'avenue' : 'street', pts, w: avenue ? 12 : 8, main: avenue, festive: avenue });
  }
  // the way up from the drawbridge to the quay: paved, lit, no houses
  S.push({ name: 'bridge road', pts: [[26.5, -132], [26.6, -146], [27, -160], [27, -172]], w: 6, houses: false, main: true });
  return S;
}

// how tall a house stands: tallest round the Forum and along the quay
export function townFloors(x, z, R, lot) {
  const d = Math.hypot(x - FORUM.x, z - FORUM.z);
  if (d < 85) return 3 + ((R() * 2.5) | 0);
  if (lot?.main || d < 170) return 2 + ((R() * 2.7) | 0);
  return 2 + ((R() * 1.8) | 0);
}
