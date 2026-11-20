import * as THREE from 'three';

// Building blocks for facades, for any world. A facade F is a wall seen from outside:
//   F = { o: [x, 0, z] its lower left corner, u: [ux, 0, uz] along it (left to right),
//         n: [nx, 0, nz] out of it, W: its width }        (n = u x up)
// Everything is written into a Soup (engine/soup.js). Points are [x, y, z].

// a point on a facade: x along it, y up, z out of the wall
export const at = (F, x, y, z = 0) => [F.o[0] + F.u[0] * x + F.n[0] * z, y, F.o[2] + F.u[2] * x + F.n[2] * z];

// the wall between y0 and y1 with holes left for the openings (sorted by x)
export function wallBand(S, F, y0, y1, ops, col) {
  const q = (xa, xb, ya, yb) => {
    if (xb - xa > 0.004 && yb - ya > 0.004) S.quad(at(F, xa, ya), at(F, xb, ya), at(F, xb, yb), at(F, xa, yb), col);
  };
  let cx = 0;
  for (const o of ops) {
    q(cx, o.x0, y0, y1);
    q(o.x0, o.x1, y0, Math.max(y0, o.y0));
    q(o.x0, o.x1, Math.min(y1, o.y1), y1);
    cx = o.x1;
  }
  q(cx, F.W, y0, y1);
}
// the four inner faces of an opening
export function reveal(S, F, o, depth, col, sill) {
  const { x0, x1, y0, y1 } = o;
  S.quad(at(F, x0, y0, 0), at(F, x0, y0, -depth), at(F, x0, y1, -depth), at(F, x0, y1, 0), col);
  S.quad(at(F, x1, y0, -depth), at(F, x1, y0, 0), at(F, x1, y1, 0), at(F, x1, y1, -depth), col);
  S.quad(at(F, x0, y1, 0), at(F, x0, y1, -depth), at(F, x1, y1, -depth), at(F, x1, y1, 0), col);
  S.quad(at(F, x0, y0, -depth), at(F, x0, y0, 0), at(F, x1, y0, 0), at(F, x1, y0, -depth), sill ?? col);
}
export const pane = (S, F, x0, x1, y0, y1, z, col, o) => S.quad(at(F, x0, y0, z), at(F, x1, y0, z), at(F, x1, y1, z), at(F, x0, y1, z), col, o);
// a block lying on a facade: x0..x1 along it, y0..y1 up, standing z0..z1 out of the wall
export function slab(S, F, x0, x1, y0, y1, z0, z1, col, o, skip = 'k') {
  const P = (x, y, z) => at(F, x, y, z);
  if (!skip.includes('f')) S.quad(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), col, o);
  if (!skip.includes('r')) S.quad(P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), col, o);
  if (!skip.includes('l')) S.quad(P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), col, o);
  if (!skip.includes('t')) S.quad(P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0), col, o);
  if (!skip.includes('b')) S.quad(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), col, o);
}
// where an instanced part goes: its unit opening onto x0..x0+w, y0..y0+h of the facade
export function partMatrix(M, F, x0, y0, w, h) {
  const o = at(F, x0, y0);
  const m = new THREE.Matrix4().set(F.u[0] * w, 0, F.n[0], o[0], 0, h, 0, o[1], F.u[2] * w, 0, F.n[2], o[2], 0, 0, 0, 1);
  return M.clone().multiply(m);
}
// the stretches of 0..W left free by some intervals
export function gaps(W, cuts) {
  const out = [];
  let c = 0;
  for (const [a, b] of cuts.slice().sort((p, q) => p[0] - q[0])) {
    if (a > c + 0.05) out.push([c, a]);
    c = Math.max(c, b);
  }
  if (W > c + 0.05) out.push([c, W]);
  return out;
}

// an axis-aligned block from corner a to corner b; skip faces by letter: f(+z) k(-z) l(-x) r(+x) t(+y) b(-y)
export function cuboid(S, a, b, col, o, skip = 'k') {
  const [x0, y0, z0] = a,
    [x1, y1, z1] = b;
  if (!skip.includes('f')) S.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, o);
  if (!skip.includes('k')) S.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col, o);
  if (!skip.includes('r')) S.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col, o);
  if (!skip.includes('l')) S.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col, o);
  if (!skip.includes('t')) S.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], col, o);
  if (!skip.includes('b')) S.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col, o);
}
// a flat panel facing out of the wall at depth z
export const face = (S, x0, x1, y0, y1, z, col, o) => S.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], col, o);
