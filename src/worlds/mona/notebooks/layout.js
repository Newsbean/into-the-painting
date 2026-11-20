import { clamp } from '../../../engine/gl.js';

// ================================================================ Leonardo's notebooks
// Everything buildNotebooks() puts in the valley is his own: machines from the
// codices built full size, and the settings of his other paintings.
//
// This file is the map: where each of them stands, the paths out to them, and the
// ground they keep clear of trees.
export const LEO = {
  vit: [36, 128], // the Vitruvian Man, laid out as a piazza
  horse: [-60, 94], // the clay colossus for Ludovico Sforza
  screw: [-112, 8], // the aerial screw
  garden: [-140, 60], // the Annunciation
  supper: [-52, -136], // the Last Supper
  tank: [70, 100], // the armoured car
  bow: [108, 146], // the giant crossbow
  grotto: [-28, -190], // the Virgin of the Rocks
  deskW: [-26, 5], // drawing tables on the hilltop
  deskE: [26, 4],
};
// the river between the bridge and the mill: s runs downstream, d inland from mid-stream on the west bank
export const RIV = { ux: 42 / Math.hypot(42, 86), uz: 86 / Math.hypot(42, 86) };
export const canalP = (s, d) => [62 + RIV.ux * s - RIV.uz * d, -120 + RIV.uz * s + RIV.ux * d];
export const LEO_WAYS = [
  [[-33, 5], [-58, 8], [-86, 6], [-105.3, 8]], // hilltop desks -> aerial screw
  [[-116.5, 14.2], [-124, 36], [-129.6, 58]], // -> the Annunciation garden
  [[-10, 74], [-28, 84], [-42, 91], [-49.5, 94]], // -> the horse
  [[18, 104], [26, 110], [35.5, 115.4]], // -> the piazza
  [[18, 104], [40, 101], [63.5, 100]], // -> the armoured car
  [[75, 104], [88, 122], [99.3, 133.2]], // -> the crossbow
  [[-56, -102], [-54, -114], [-52, -127.4]], // -> the refectory
  [[-35, -99], [-24, -130], [-26, -160], [-28, -174.5]], // -> the grotto, stopping short of its pool
  [[34, -108], canalP(10, 30), canalP(34, 30), canalP(62, 30), [74, -41], [86, -31]], // towpath to the mill
];
const LEO_KEEP = [
  [36, 130, 21], [-60, 94, 13], [-112, 8, 10], [-140, 60, 21], [-52, -136, 21], [70, 100, 14], [108, 146, 26], [-28, -190, 16], [-26, 5, 10], [26, 4, 10],
  ...[12, 22, 32, 42, 52, 62, 70].map((s) => [...canalP(s, 22), 9]),
];
// true where one of the new things stands, so nothing else is planted there
export function leoKeep(x, z) {
  for (const k of LEO_KEEP) if ((x - k[0]) ** 2 + (z - k[1]) ** 2 < k[2] * k[2]) return true;
  for (const w of LEO_WAYS)
    for (let i = 0; i < w.length - 1; i++) {
      const ax = w[i][0],
        az = w[i][1],
        bx = w[i + 1][0],
        bz = w[i + 1][1];
      const t = clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2));
      if (Math.hypot(x - ax - t * (bx - ax), z - az - t * (bz - az)) < 4) return true;
    }
  return false;
}
