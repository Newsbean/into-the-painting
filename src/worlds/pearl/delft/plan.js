// The ground plan of Delft: where the water is, where the bridges cross it, and the
// streets the houses stand along. The world's heightAt (index.js) and the town (town.js)
// both read it, so the land and what is built on it cannot disagree.
//
// North is -z. The main canal runs east to west through the middle (z = 0). A second
// canal leaves it at x = 62 and runs south. East of x = 96 the main canal opens out
// into the harbour, as in the View of Delft.
import { smooth } from '../../../engine/gl.js';

export const CANAL = 6.2; // half the width of the main canal
export const SIDE = { x: 62, hw: 5.4, z0: 6, z1: 150 };
export const HARBOUR = { x0: 96, x1: 132, grow: 30 };
export const MARKET = { x: -45, z: 48, hw: 23, hd: 28 }; // the market square
export const CHURCH = { x: -45, z: 86 }; // the tower of the Nieuwe Kerk, at the south end of the market
export const HALL = { x: -80, z: 48 }; // the town hall, on its west side
export const MILL = { x: 104, z: 62 };
export const GATE = { x: 150, z: 42 };
export const VERMEER = { x0: 20, x1: 47, z0: -40, z1: -14 }; // his house and the yard before it

// every bridge: where its middle is, which way its deck runs (ry 0 = along z), its half length,
// half width and rise. The deck is rise * cos(pi/2 * t / half).
export const BRIDGES = [
  { x: 0, z: 0, ry: 0, half: 10.5, wide: 3.3, rise: 2.1 },
  { x: -64, z: 0, ry: 0, half: 10.5, wide: 3.3, rise: 2.1 },
  { x: 62, z: 11.2, ry: Math.PI / 2, half: 9.5, wide: 3.6, rise: 1.9 }, // the south quay, over the mouth of the side canal
  { x: 62, z: 52, ry: Math.PI / 2, half: 9.5, wide: 3.0, rise: 1.9 },
  { x: 62, z: 104, ry: Math.PI / 2, half: 9.5, wide: 3.0, rise: 1.9 },
];

// half the width of the main canal at x: it opens into the harbour to the east
export const mainHalf = (x) => CANAL + smooth(HARBOUR.x0, HARBOUR.x1, x) * HARBOUR.grow;
// 1 in the water, 0 on the quay, with a bank a metre wide between
export function wetAt(x, z) {
  const hw = mainHalf(x);
  const main = 1 - smooth(hw, hw + 1, Math.abs(z));
  const side = (1 - smooth(SIDE.hw, SIDE.hw + 1, Math.abs(x - SIDE.x))) * smooth(SIDE.z0 - 2, SIDE.z0, z) * (1 - smooth(SIDE.z1, SIDE.z1 + 2, z));
  return Math.max(main, side);
}
// the height of a bridge's deck at (x, z), or null where there is no bridge
export function deckAt(x, z) {
  for (const b of BRIDGES) {
    const dx = x - b.x,
      dz = z - b.z,
      sn = Math.sin(b.ry),
      cs = Math.cos(b.ry);
    const t = dx * sn + dz * cs,
      a = dx * cs - dz * sn;
    if (Math.abs(a) < b.wide && Math.abs(t) < b.half) return b.rise * Math.cos((t / b.half) * Math.PI * 0.5);
  }
  return null;
}

// The edges of the water, as lines the quay walls are built along. The land is on the
// left of each line as it is walked.
export function quayLines() {
  const q = 0.7; // how far the wall stands back from the edge of the water
  const s0 = SIDE.x - SIDE.hw - q,
    s1 = SIDE.x + SIDE.hw + q,
    c = CANAL + q,
    h = CANAL + HARBOUR.grow + q;
  return [
    // north bank, walked east to west
    [[175, -h], [HARBOUR.x1, -h], [HARBOUR.x0, -c], [-160, -c]],
    // south bank west of the side canal, walked west to east, then down the side canal's west bank
    [[-160, c], [s0, c], [s0, SIDE.z1]],
    // the side canal's east bank walked north, then the south bank and the harbour
    [[s1, SIDE.z1], [s1, c], [HARBOUR.x0, c], [HARBOUR.x1, h], [175, h]],
    // the foot of the side canal
    [[s0, SIDE.z1], [s1, SIDE.z1]],
  ];
}

// The streets of the town. Houses stand along them (layLots, engine/plan.js): `sides` says
// which side or sides, -1 being the left of the line as it is drawn here.
export function streets() {
  const q = CANAL + 0.7 + 4.4; // the middle of a quay road
  return [
    { name: 'north quay', pts: [[-150, -q], [-40, -q], [20, -q], [93, -q]], w: 8.8, sides: [-1], main: true },
    { name: 'south quay', pts: [[-150, q], [-70, q], [-20, q], [51, q]], w: 8.8, sides: [1], main: true },
    { name: 'south quay east', pts: [[73, q], [94, q]], w: 8.8, sides: [1], main: true },
    { name: 'market west', pts: [[MARKET.x - MARKET.hw - 2.5, MARKET.z - MARKET.hd], [MARKET.x - MARKET.hw - 2.5, MARKET.z + MARKET.hd]], w: 5, sides: [1], main: true, market: true },
    { name: 'market east', pts: [[MARKET.x + MARKET.hw + 2.5, MARKET.z - MARKET.hd], [MARKET.x + MARKET.hw + 2.5, MARKET.z + MARKET.hd]], w: 5, sides: [-1], main: true, market: true },
    { name: 'church side', pts: [[MARKET.x - MARKET.hw - 6, MARKET.z + MARKET.hd + 3], [MARKET.x + MARKET.hw + 6, MARKET.z + MARKET.hd + 3]], w: 6, sides: [1], main: true },
    { name: 'side canal west', pts: [[SIDE.x - SIDE.hw - 5.1, 18], [SIDE.x - SIDE.hw - 5.1, 146]], w: 8.4, sides: [1] },
    { name: 'side canal east', pts: [[SIDE.x + SIDE.hw + 5.1, 18], [SIDE.x + SIDE.hw + 5.1, 146]], w: 8.4, sides: [-1] },
    { name: 'back street', pts: [[-140, -46], [-40, -46], [40, -47], [112, -50]], w: 7 },
    { name: 'choir street', pts: [[MARKET.x + MARKET.hw + 6, 47], [10, 46], [47, 46]], w: 6 },
    { name: 'west street', pts: [[-150, 46], [-112, 47], [-92, 46]], w: 6 },
    { name: 'harbour north', pts: [[97, -q], [132, -42], [166, -42]], w: 9, sides: [-1], main: true },
    { name: 'harbour south', pts: [[97, q], [132, 42], [168, 42]], w: 9, sides: [1], main: true },
    { name: 'north lane', pts: [[-30, -17], [-30, -42]], w: 5.5 },
    { name: 'mill lane', pts: [[82, 22], [84, 60], [86, 100]], w: 6 },
  ];
}
