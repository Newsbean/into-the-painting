// The small things that make a facade: window surrounds and casements, shutters,
// flower boxes, doors with their steps, shopfronts with awnings, balconies, lanterns.
//
// Each part is built once and drawn many times (THREE.InstancedMesh), so a whole
// town of them costs a handful of draw calls. A part is authored in real metres
// for a nominal opening and squeezed into "unit opening space":
//   x 0..1 across the opening, y 0..1 up it, z in metres out of the wall (0 = wall face).
// The house places it with a matrix that stretches it back to the real opening.
// Faces with mask > 0 take the instance colour (the shutter / door / shop colour of
// that house); mask below 1 gives a darker or lighter shade of it.
import * as THREE from 'three';
import { Soup } from '../../../engine/soup.js';

const STONE = 0xd9d0b4;
const STONE_SHADE = 0xb9b096;
const CREAM = 0xe9e2cc;
const IRON = 0x161a2c;
const BRASS = 0xe0b040;
const BLACK = 0x000000;
const WHITE = 0xffffff;
// joinery stands dark against a lit room: a deep shade of the house's own shutter colour
const JOIN = { mask: 0.5 };

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
const face = (S, x0, x1, y0, y1, z, col, o) => S.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], col, o);

const unit = (W, H) => new THREE.Matrix4().makeScale(1 / W, 1 / H, 1);

// ---------------------------------------------------------------- window
// nominal opening 1.1 x 1.7 m, glass 0.22 m back from the wall face
function windowPart({ shutters = false, box = false, plain = false } = {}) {
  const S = new Soup();
  const W = 1.1,
    H = 1.7;
  S.set(unit(W, H));
  if (!plain) {
    // dressed stone round the opening, a keystone, a sill that throws a shadow
    cuboid(S, [-0.15, 0, 0], [0, H, 0.05], STONE);
    cuboid(S, [W, 0, 0], [W + 0.15, H, 0.05], STONE);
    cuboid(S, [-0.21, H, 0], [W + 0.21, H + 0.22, 0.065], STONE);
    cuboid(S, [W / 2 - 0.1, H - 0.02, 0], [W / 2 + 0.1, H + 0.28, 0.11], CREAM);
  }
  cuboid(S, [-0.23, -0.13, -0.04], [W + 0.23, 0, 0.17], plain ? STONE_SHADE : STONE);
  // the casement: frame, a mullion, two glazing bars to each leaf
  const zf = -0.15;
  const t = 0.07;
  face(S, 0, t, 0, H, zf, BLACK, JOIN);
  face(S, W - t, W, 0, H, zf, BLACK, JOIN);
  face(S, t, W - t, H - t, H, zf, BLACK, JOIN);
  face(S, t, W - t, 0, t, zf, BLACK, JOIN);
  face(S, W / 2 - 0.032, W / 2 + 0.032, t, H - t, zf + 0.01, BLACK, JOIN);
  for (const yy of [H * 0.37, H * 0.68]) face(S, t, W - t, yy - 0.018, yy + 0.018, zf + 0.005, BLACK, JOIN);

  if (shutters) {
    // two leaves folded back against the wall, not quite flat, with dark louvre lines
    const a = 0.26,
      L = 0.54,
      th = 0.035;
    for (const side of [-1, 1]) {
      const hx = side < 0 ? -0.01 : W + 0.01; // hinge
      const ex = hx + side * L * Math.cos(a),
        ez = 0.05 + L * Math.sin(a);
      const P0 = [hx, 0.02, 0.05],
        P1 = [ex, 0.02, ez];
      const up = (p, y) => [p[0], y, p[2]];
      const near = side < 0 ? P1 : P0,
        far = side < 0 ? P0 : P1;
      S.quad(near, far, up(far, H - 0.02), up(near, H - 0.02), WHITE, { mask: 1 });
      // its edge, so it reads as a board and not a sheet
      const e0 = [ex, 0.02, ez],
        e1 = [ex - side * th * Math.sin(a), 0.02, ez - th * Math.cos(a)];
      if (side < 0) S.quad(e1, e0, up(e0, H - 0.02), up(e1, H - 0.02), BLACK, { mask: 0.72 });
      else S.quad(e0, e1, up(e1, H - 0.02), up(e0, H - 0.02), BLACK, { mask: 0.72 });
      for (let k = 1; k <= 7; k++) {
        const y = 0.02 + ((H - 0.04) * k) / 8;
        const lift = (p) => [p[0] + 0.004 * Math.sin(a) * side * -1, 0, p[2] + 0.004];
        const n0 = lift(near),
          f0 = lift(far);
        S.quad([n0[0], y - 0.016, n0[2]], [f0[0], y - 0.016, f0[2]], [f0[0], y + 0.016, f0[2]], [n0[0], y + 0.016, n0[2]], BLACK, { mask: 0.5 });
      }
    }
  }
  if (box) {
    // a window box of geraniums
    cuboid(S, [0.04, -0.4, 0.02], [W - 0.04, -0.14, 0.3], 0x9a4a2a);
    const blob = new THREE.IcosahedronGeometry(1, 0);
    const reds = [0xe0304a, 0xf05a6a, 0xd9344a, 0xf2c530, 0xe86aa8];
    for (let i = 0; i < 9; i++) {
      const u = (i + 0.5) / 9;
      const r = 0.085 + ((i * 37) % 5) * 0.012;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(0.08 + u * (W - 0.16), -0.1 + ((i * 53) % 7) * 0.012, 0.13 + ((i * 29) % 5) * 0.025), new THREE.Quaternion().setFromEuler(new THREE.Euler(i, i * 2.1, 0)), new THREE.Vector3(r, r * 0.9, r));
      S.add(blob, i % 3 === 2 ? 0x2f6a3a : reds[i % reds.length], m, { em: i % 3 === 2 ? 0 : 0.12 });
    }
  }
  return S.geometry();
}

// ---------------------------------------------------------------- french window + balcony
// nominal opening 1.2 x 2.3 m reaching the floor, with an iron balcony in front
function balconyPart() {
  const S = new Soup();
  const W = 1.2,
    H = 2.3;
  S.set(unit(W, H));
  cuboid(S, [-0.15, 0, 0], [0, H, 0.05], STONE);
  cuboid(S, [W, 0, 0], [W + 0.15, H, 0.05], STONE);
  cuboid(S, [-0.21, H, 0], [W + 0.21, H + 0.24, 0.07], STONE);
  cuboid(S, [-0.3, H + 0.24, 0], [W + 0.3, H + 0.32, 0.13], CREAM);
  const zf = -0.15,
    t = 0.07;
  face(S, 0, t, 0, H, zf, BLACK, JOIN);
  face(S, W - t, W, 0, H, zf, BLACK, JOIN);
  face(S, t, W - t, H - t, H, zf, BLACK, JOIN);
  face(S, W / 2 - 0.035, W / 2 + 0.035, 0, H - t, zf + 0.01, BLACK, JOIN);
  for (const yy of [H * 0.3, H * 0.55, H * 0.8]) face(S, t, W - t, yy - 0.018, yy + 0.018, zf + 0.005, BLACK, JOIN);
  face(S, t, W - t, 0, 0.4, zf + 0.004, BLACK, JOIN); // kick panels
  // the slab on two brackets
  cuboid(S, [-0.32, -0.14, 0], [W + 0.32, 0, 0.72], STONE, undefined, 'k');
  for (const bx of [-0.2, W + 0.08]) {
    S.tri([bx, -0.6, 0], [bx, -0.14, 0.6], [bx, -0.14, 0], STONE_SHADE);
    S.tri([bx + 0.12, -0.6, 0], [bx + 0.12, -0.14, 0], [bx + 0.12, -0.14, 0.6], STONE_SHADE);
    S.quad([bx, -0.6, 0], [bx + 0.12, -0.6, 0], [bx + 0.12, -0.14, 0.6], [bx, -0.14, 0.6], STONE);
  }
  // wrought iron: rails and bars drawn as thin faces, seen from both sides
  const bar = (x0, x1, y0, y1, z) => {
    S.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], IRON);
    S.quad([x1, y0, z], [x0, y0, z], [x0, y1, z], [x1, y1, z], IRON);
  };
  const sideBar = (x, y0, y1, z0, z1) => {
    S.quad([x, y0, z1], [x, y0, z0], [x, y1, z0], [x, y1, z1], IRON);
    S.quad([x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], IRON);
  };
  const zr = 0.68;
  bar(-0.3, W + 0.3, 0.92, 0.98, zr);
  bar(-0.3, W + 0.3, 0.06, 0.1, zr);
  for (let i = 0; i <= 12; i++) {
    const x = -0.3 + ((W + 0.6) * i) / 12;
    bar(x - 0.014, x + 0.014, 0.1, 0.92, zr);
    // a scroll in every other gap
    if (i % 2 === 0 && i < 12) bar(x + 0.03, x + 0.11, 0.42, 0.58, zr);
  }
  for (const x of [-0.3, W + 0.3]) {
    sideBar(x, 0.92, 0.98, 0, zr);
    sideBar(x, 0.06, 0.1, 0, zr);
    for (let k = 1; k <= 3; k++) sideBar(x, 0.1, 0.92, (zr * k) / 4 - 0.012, (zr * k) / 4 + 0.012);
  }
  // two pots
  const pot = new THREE.CylinderGeometry(0.11, 0.08, 0.2, 7);
  const leaf = new THREE.IcosahedronGeometry(0.16, 0);
  for (const x of [-0.14, W + 0.14]) {
    S.add(pot, 0xb0552e, new THREE.Matrix4().makeTranslation(x, 0.1, 0.5));
    S.add(leaf, 0x2f6a3a, new THREE.Matrix4().makeTranslation(x, 0.32, 0.5));
    S.add(leaf, 0xe0304a, new THREE.Matrix4().compose(new THREE.Vector3(x + 0.05, 0.42, 0.52), new THREE.Quaternion(), new THREE.Vector3(0.5, 0.5, 0.5)), { em: 0.12 });
  }
  return S.geometry();
}

// ---------------------------------------------------------------- door
// nominal opening 1.25 x 2.5 m: pilasters and a cornice, a fanlight over two panelled leaves, a step
function doorPart({ grand = false } = {}) {
  const S = new Soup();
  const W = 1.25,
    H = 2.5;
  S.set(unit(W, H));
  cuboid(S, [-0.2, 0, 0], [0, H + 0.05, 0.07], STONE);
  cuboid(S, [W, 0, 0], [W + 0.2, H + 0.05, 0.07], STONE);
  cuboid(S, [-0.24, 0, 0], [0.02, 0.28, 0.11], STONE_SHADE);
  cuboid(S, [W - 0.02, 0, 0], [W + 0.24, 0.28, 0.11], STONE_SHADE);
  cuboid(S, [-0.26, H + 0.05, 0], [W + 0.26, H + 0.3, 0.12], STONE);
  cuboid(S, [-0.33, H + 0.3, 0], [W + 0.33, H + 0.4, 0.21], CREAM);
  if (grand) {
    // a little pediment
    const x0 = -0.33,
      x1 = W + 0.33,
      y = H + 0.4,
      z = 0.16;
    S.tri([x0, y, z], [x1, y, z], [(x0 + x1) / 2, y + 0.42, z], STONE);
    S.quad([x0, y, 0], [x0, y, z], [(x0 + x1) / 2, y + 0.42, z], [(x0 + x1) / 2, y + 0.42, 0], CREAM);
    S.quad([x1, y, z], [x1, y, 0], [(x0 + x1) / 2, y + 0.42, 0], [(x0 + x1) / 2, y + 0.42, z], CREAM);
  }
  // transom, then the leaves below it
  const zt = -0.12;
  cuboid(S, [0, 2.04, zt - 0.03], [W, 2.12, zt + 0.05], WHITE, { mask: 0.8 });
  face(S, W / 2 - 0.03, W / 2 + 0.03, 2.12, H, zt, CREAM);
  face(S, 0.02, W - 0.02, 0, 2.04, zt, WHITE, { mask: 1 });
  face(S, W / 2 - 0.012, W / 2 + 0.012, 0, 2.04, zt + 0.004, BLACK, { mask: 0.45 });
  for (const lx of [0.09, W / 2 + 0.05]) {
    const rx = lx + W / 2 - 0.14;
    for (const [y0, y1] of [
      [0.16, 0.92],
      [1.06, 1.92],
    ]) {
      face(S, lx, rx, y0, y1, zt + 0.012, WHITE, { mask: 0.86 });
      face(S, lx + 0.05, rx - 0.05, y0 + 0.05, y1 - 0.05, zt + 0.02, BLACK, { mask: 0.78 });
    }
  }
  cuboid(S, [W / 2 + 0.07, 1.0, zt], [W / 2 + 0.13, 1.06, zt + 0.07], BRASS, { em: 0.25 });
  // the step, sunk well into the ground so a slope cannot leave it floating
  cuboid(S, [-0.34, -0.8, -0.05], [W + 0.34, -0.01, 0.46], STONE, undefined, 'kb');
  cuboid(S, [-0.5, -0.8, -0.05], [W + 0.5, -0.17, 0.78], STONE_SHADE, undefined, 'kb');
  return S.geometry();
}

// ---------------------------------------------------------------- shopfront
// nominal opening 3.0 x 2.75 m: stall riser, slim glazing bars, a fascia and a striped awning
function shopPart({ awning = true } = {}) {
  const S = new Soup();
  const W = 3.0,
    H = 2.75;
  S.set(unit(W, H));
  const zt = -0.1;
  // goods on two shelves, dark against the lit room behind
  const goods = [0x7a2f2a, 0x2f4a6a, 0x8a6a2a, 0x3a6a4a, 0x6a3a6a, 0xb8862e];
  for (const [sy, n] of [
    [0.72, 9],
    [1.5, 8],
  ]) {
    cuboid(S, [0.12, sy - 0.05, -0.46], [W - 0.12, sy, -0.2], 0x4a3020);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const gw = 0.1 + ((i * 7 + sy * 10) % 5) * 0.03,
        gh = 0.16 + ((i * 11 + sy * 7) % 6) * 0.06;
      const gx = 0.2 + u * (W - 0.4);
      cuboid(S, [gx - gw, sy, -0.42], [gx + gw, sy + gh, -0.26], goods[(i + (sy > 1 ? 3 : 0)) % goods.length], { em: 0.1 });
    }
  }
  // stall riser with sunk panels, the posts, the head rail
  cuboid(S, [0, 0, zt - 0.06], [W, 0.62, zt + 0.02], WHITE, { mask: 1 });
  for (let i = 0; i < 3; i++) {
    const a = 0.08 + (i * (W - 0.16)) / 3,
      b = 0.08 + ((i + 1) * (W - 0.16)) / 3;
    face(S, a + 0.06, b - 0.06, 0.1, 0.52, zt + 0.026, BLACK, { mask: 0.74 });
  }
  cuboid(S, [0, 0.62, zt - 0.03], [W, 0.7, zt + 0.07], WHITE, { mask: 0.9 });
  for (const x of [0, W - 0.1]) cuboid(S, [x, 0.7, zt - 0.02], [x + 0.1, H, zt + 0.04], WHITE, { mask: 1 });
  cuboid(S, [0.1, H - 0.1, zt - 0.02], [W - 0.1, H, zt + 0.04], WHITE, { mask: 1 });
  for (let i = 1; i < 4; i++) face(S, (W * i) / 4 - 0.022, (W * i) / 4 + 0.022, 0.7, H - 0.1, zt + 0.02, WHITE, { mask: 0.95 });
  face(S, 0.1, W - 0.1, 2.02, 2.06, zt + 0.02, WHITE, { mask: 0.95 });
  // fascia board with a line of gilt "lettering"
  cuboid(S, [-0.12, H, 0], [W + 0.12, H + 0.5, 0.1], WHITE, { mask: 0.8 });
  cuboid(S, [-0.18, H + 0.5, 0], [W + 0.18, H + 0.58, 0.16], CREAM);
  for (let i = 0; i < 9; i++) {
    const x = 0.45 + i * 0.24 + (i > 4 ? 0.12 : 0);
    const lw = 0.1 + ((i * 5) % 3) * 0.03;
    face(S, x, x + lw, H + 0.14, H + 0.36, 0.104, BRASS, { em: 0.22 });
  }
  if (awning) {
    // striped canvas on two iron arms, with a scalloped edge that stirs in the wind
    const y0 = H - 0.02,
      z0 = 0.1,
      y1 = H - 0.62,
      z1 = 1.55;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = -0.1 + ((W + 0.2) * i) / n,
        b = -0.1 + ((W + 0.2) * (i + 1)) / n;
      const o = i % 2 ? { mask: 1 } : undefined;
      const col = i % 2 ? WHITE : CREAM;
      S.quad([a, y1, z1], [b, y1, z1], [b, y0, z0], [a, y0, z0], col, o); // top
      S.quad([b, y1, z1], [a, y1, z1], [a, y0, z0], [b, y0, z0], i % 2 ? BLACK : 0xb8ad94, i % 2 ? { mask: 0.7 } : undefined); // underside
      const m = (a + b) / 2;
      const so = { ...(o || {}), sway: 0.05 };
      S.quad([a, y1 - 0.2, z1], [b, y1 - 0.2, z1], [b, y1, z1], [a, y1, z1], col, so);
      S.tri([a, y1 - 0.2, z1], [m, y1 - 0.3, z1], [b, y1 - 0.2, z1], col, so);
    }
    for (const x of [-0.08, W + 0.08]) {
      S.quad([x - 0.015, y1 - 0.02, z1], [x + 0.015, y1 - 0.02, z1], [x + 0.015, y0 - 0.7, z0 - 0.04], [x - 0.015, y0 - 0.7, z0 - 0.04], IRON);
      S.quad([x + 0.015, y1 - 0.02, z1], [x - 0.015, y1 - 0.02, z1], [x - 0.015, y0 - 0.7, z0 - 0.04], [x + 0.015, y0 - 0.7, z0 - 0.04], IRON);
    }
  }
  return S.geometry();
}

// ---------------------------------------------------------------- wall lantern
// real metres; origin where the bracket meets the wall, +z out into the street
function lanternPart() {
  const S = new Soup();
  cuboid(S, [-0.02, -0.02, 0], [0.02, 0.02, 0.62], IRON, undefined, '');
  S.quad([-0.012, -0.42, 0], [0.012, -0.42, 0], [0.012, -0.02, 0.5], [-0.012, -0.02, 0.5], IRON);
  S.quad([0.012, -0.42, 0], [-0.012, -0.42, 0], [-0.012, -0.02, 0.5], [0.012, -0.02, 0.5], IRON);
  const cx = 0,
    cz = 0.56,
    top = -0.08;
  // glass: four panes, wider at the top
  const a = 0.13,
    b = 0.085,
    hgt = 0.34;
  const ring = (r, y) => [
    [cx - r, y, cz - r],
    [cx + r, y, cz - r],
    [cx + r, y, cz + r],
    [cx - r, y, cz + r],
  ];
  const T = ring(a, top - 0.06),
    Bm = ring(b, top - 0.06 - hgt);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    S.quad(Bm[j], Bm[i], T[i], T[j], 0xffd27a, { em: 1 });
  }
  // cap and finial
  const cap = ring(a + 0.04, top - 0.06);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    S.tri(cap[j], cap[i], [cx, top + 0.1, cz], IRON);
  }
  cuboid(S, [cx - 0.03, top - 0.06 - hgt - 0.05, cz - 0.03], [cx + 0.03, top - 0.06 - hgt, cz + 0.03], IRON, undefined, 't');
  return S.geometry();
}

// ---------------------------------------------------------------- the library
// name -> { geometry, nominal: [W, H] }.  The house stretches a part from its nominal opening to the real one.
export function makeParts() {
  return {
    window: { geometry: windowPart(), nominal: [1.1, 1.7] },
    windowShut: { geometry: windowPart({ shutters: true }), nominal: [1.1, 1.7] },
    windowBox: { geometry: windowPart({ shutters: true, box: true }), nominal: [1.1, 1.7] },
    windowPlain: { geometry: windowPart({ plain: true }), nominal: [1.1, 1.7] },
    balcony: { geometry: balconyPart(), nominal: [1.2, 2.3] },
    door: { geometry: doorPart(), nominal: [1.25, 2.5] },
    doorGrand: { geometry: doorPart({ grand: true }), nominal: [1.25, 2.5] },
    shop: { geometry: shopPart(), nominal: [3.0, 2.75] },
    shopBare: { geometry: shopPart({ awning: false }), nominal: [3.0, 2.75] },
    lantern: { geometry: lanternPart(), nominal: [1, 1] },
  };
}
