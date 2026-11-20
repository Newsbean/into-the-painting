import { clamp } from '../../engine/gl.js';

// Where things lie on the land: the routes that are drawn on it, and the ground
// each scene needs kept clear. Anything scattered at random asks here first.

// the coast road, two streams and the footpaths that tie the scenes together
export const ROAD_W = [[-229, 226], [-200, 223], [-170, 221], [-140, 220.5], [-129, 220], [-100, 219], [-70, 217], [-46, 215.5], [-27, 213]];
export const ROAD_M = [[22, 214.5], [30, 219.5], [37, 221]];
export const ROAD_E = [[53, 221], [64, 221.5], [96, 219.5], [112, 219.5], [150, 220], [162, 221.5], [196, 223], [229, 227]];
export const STREAM1 = [[10, 305.5], [12, 297], [20, 283], [31, 269], [37, 257], [38, 246], [38, 236], [41, 228], [45, 221], [47.5, 213], [49.5, 205], [50.5, 199.5]];
export const STREAM2 = [[-126, 296], [-127, 281], [-130, 265], [-133.5, 250], [-134, 238], [-134, 229.5], [-131.5, 220], [-128, 209], [-126, 200]];
export const PATH_FALL = [[-22, 216], [-24, 228], [-14, 240], [-8, 247], [-5, 262], [-6, 280], [-7, 298], [-6, 310], [-3.5, 317.5]];
export const PATH_SHRINE = [[62, 223], [62, 240], [63, 254], [64.5, 265]];
export const STAIR = [[64.5, 265.5], [71, 308]];
export const PATH_HALL = [[134, 221.5], [134, 238], [135, 252], [137, 268], [138, 282], [139, 291]];
export const PATH_PASS = [[-126.3, 221.5], [-126.3, 237], [-126, 251], [-124, 266], [-121.5, 281], [-128, 289.5], [-141, 296], [-153, 300.5], [-166, 303]];
export const ZIGZAG = [[160, 221], [186, 216.6], [168, 212.6], [194, 209.2], [176, 206], [199, 203.6]];

// ground the scenes stand on; the scattered trees keep off it
export const KEEP_LINES = [[ROAD_W, 4], [ROAD_M, 4], [ROAD_E, 4], [STREAM1, 4], [STREAM2, 4], [PATH_FALL, 2.6], [PATH_SHRINE, 2.6], [STAIR, 3.6], [PATH_HALL, 2.6], [PATH_PASS, 2.6], [ZIGZAG, 3]];
export const KEEP_DISCS = [
  [-2, 211, 9], [-16, 211, 9], [12, 211, 9], // the forecourt
  [-50, 221, 9], [-66, 203.5, 12], [-97, 206, 11], [-172, 195, 9], [-206, 213, 8], // tea house, cranes, nets, the fishing rock
  [-134, 228, 10], [-150, 292.5, 10], // drum bridge garden, the great cedar
  [10, 312, 15], [10, 331, 16], [33, 248, 8], [34, 262, 6], // waterfall, water wheel and its flume
  [45, 221, 10], [55, 213.5, 5], [70, 211, 7], [80, 211.5, 7], [90, 211, 7], // bridge, storehouse, timber yard
  [72, 314, 7], [149, 287, 15], [130.6, 277.5, 5], [214, 210, 7], // shrine, the viewing hall, tea store, the hut on the point
];
export const KEEP_RECTS = [
  [-224, -158, 227, 263], [180, 228, 228, 260], // rice terraces west and east
  [-41, -10, 266, 300], [0, 16, 230, 244], [84, 128, 271, 301], // bamboo, kitchen plots, tea rows
  [158, 208, 198, 220], [100, 152, 215, 218.5], // the reed marsh, the pine avenue
  [-89, -66, 244, 266], [94, 113, 239, 259], [143, 163, 249, 271], // terraced plots between the houses
];
export function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax,
    dz = bz - az;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
export function nearRoute(x, z, pad = 0) {
  for (const [pts, r] of KEEP_LINES) for (let i = 0; i < pts.length - 1; i++) if (segDist(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) < r + pad) return true;
  return false;
}
export function keptClear(x, z, pad = 0) {
  for (const [cx, cz, r] of KEEP_DISCS) if (Math.hypot(x - cx, z - cz) < r + pad) return true;
  for (const [x0, x1, z0, z1] of KEEP_RECTS) if (x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad) return true;
  return nearRoute(x, z, pad);
}
