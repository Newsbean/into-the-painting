// Where the hillside is cut level so that something can stand on it: the terraces of the
// hill farms, the garden of his house, the green by the water where they dance.
//
// A yard is a strip of ground lying along the hill:
//   { name, x, z, ry, len, dep, blend, lift }
//   x, z      its middle
//   ry        the way it faces: downhill, towards the fjord (as for the front of a house)
//   len, dep  half its length along the hill, half its depth into it
//   blend     how far the cut fades back into the slope
//   lift      how far above the natural slope at its middle it lies
//
//   layYards(hill, keep)      call once, with the height of the uncut hill, and how much of a
//                             cut is allowed at a point (0 on the road, which must stay as it is)
//   cutYards(x, z, h)         the height of the ground at (x, z) once the yards are cut into h
//   yardAt(x, z)              the yard a point stands on (or null), for keeping trees off it
//   local(yard, u, v)         a point of a yard: u along the hill, v downhill -> [x, z]
import { smooth, lerp } from '../../../engine/gl.js';

export const YARDS = [
  // the hill farms, each a row of buildings along its terrace
  { name: 'haugen', x: -52, z: 36, ry: 2.71, len: 31, dep: 9, blend: 10, lift: 0.6, farm: true },
  { name: 'plassen', x: 5, z: 58, ry: 2.868, len: 18, dep: 8, blend: 9, lift: 0.5, farm: true },
  { name: 'ostgard', x: 125, z: 94, ry: 2.868, len: 27, dep: 9, blend: 10, lift: 0.6, farm: true },
  { name: 'vestgard', x: -132, z: 2, ry: 2.736, len: 25, dep: 9, blend: 10, lift: 0.6, farm: true },
  // the big farm on the brow of the hill, built round a yard
  { name: 'ekeberg', x: 30, z: 124, ry: 2.868, len: 34, dep: 17, blend: 14, lift: 0.3, farm: true },
  // his own house and its garden
  { name: 'his house', x: 106, z: 46, ry: Math.PI, len: 13, dep: 6, blend: 6, lift: 0.2 },
  // the green by the water: the white house, the great lime, and the dance
  { name: 'shore green', x: -100, z: -83, ry: 2.71, len: 27, dep: 8.5, blend: 8, lift: 0.3 },
];

let allowed = () => 1;
export function layYards(hill, keep) {
  for (const y of YARDS) y.y = hill(y.x, y.z) + y.lift;
  if (keep) allowed = keep;
}

// how much of a yard a point is on: 1 on its level ground, falling to 0 across the blend
function weight(y, x, z) {
  const dx = x - y.x,
    dz = z - y.z,
    cs = Math.cos(y.ry),
    sn = Math.sin(y.ry);
  const du = Math.abs(dx * cs - dz * sn),
    dv = Math.abs(dx * sn + dz * cs);
  if (du > y.len + y.blend || dv > y.dep + y.blend) return 0;
  return (1 - smooth(y.len, y.len + y.blend, du)) * (1 - smooth(y.dep, y.dep + y.blend, dv));
}
export function cutYards(x, z, h) {
  for (const y of YARDS) {
    const w = weight(y, x, z);
    if (w > 0) h = lerp(h, y.y, w * allowed(x, z));
  }
  return h;
}
export function yardAt(x, z, least = 0.5) {
  for (const y of YARDS) if (weight(y, x, z) > least) return y;
  return null;
}
export const local = (y, u, v) => [y.x + u * Math.cos(y.ry) + v * Math.sin(y.ry), y.z - u * Math.sin(y.ry) + v * Math.cos(y.ry)];
