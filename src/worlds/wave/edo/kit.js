// The Edo kit: woodblock materials for built things, and the small parts that hang on
// them (shop curtains, paper lanterns, signboards, rain barrels, benches).
//   const kit = new EdoKit(edoMaterials(strokes))
// Lab: /?debug&look=wave&lab=worlds/wave/edo/lab.js
import * as THREE from 'three';
import { paintMaterial } from '../../../engine/paint.js';
import { Kit } from '../../../engine/kit.js';
import { Soup } from '../../../engine/soup.js';
import { cuboid } from '../../../engine/facade.js';

export const EDO = {
  PLASTER: 0xefe7d2,
  CREAM: 0xe0d3b4,
  TIMBER: 0x4a3526,
  WOOD: 0x7d5c3c,
  WEATHER: 0x8c7b66,
  TILE: [0x4a5a72, 0x3f4e62, 0x566274, 0x45566a],
  THATCH: 0xc2a25e,
  THATCH_D: 0x7d6338,
  INDIGO: 0x1f3f7a,
  VERM: 0xd9482b,
  PAPER: 0xf6e3a8,
  STONE: 0xa8a394,
  STONE_D: 0x7f7b70,
  GOLD: 0xd9a93a,
};

// Flat colour with printed line: every material follows the face it is on.
export function edoMaterials(strokes) {
  const flat = (stroke, o = {}) => paintMaterial({ stroke, directed: 1, scale: 0.3, contrast: 0.5, hueVar: 0.06, warp: 0, flat: 0.72, rim: 0, band: 0.08, impasto: 0, big: 0.1, ...o });
  return {
    kawara: flat(strokes.kawara, { scale: 0.32, contrast: 0.55 }), // tiled roofs
    thatch: flat(strokes.thatch, { scale: 0.2, contrast: 0.42, hueVar: 0.12 }),
    boards: flat(strokes.boards, { scale: 0.42, contrast: 0.42 }), // board walls
    koshi: flat(strokes.koshi, { scale: 0.5, contrast: 0.85 }), // lattice
    shoji: flat(strokes.shoji, { scale: 0.62, contrast: 0.5, emissive: 1.25 }), // paper screens
    namako: flat(strokes.namako, { scale: 0.6, contrast: 0.75 }), // storehouse dado
    stone: flat(strokes.ishigaki, { scale: 0.14, contrast: 0.4 }),
    plaster: flat(strokes.wood, { scale: 0.06, contrast: 0.12 }),
    detail: flat(strokes.wood, { scale: 0.25, contrast: 0.14, emissive: 1.5 }), // timbers, parts, lanterns
  };
}

function makeParts() {
  const T = (x, y, z, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));

  // noren: the short split curtain of a shop door. Unit width (x 0..1), hanging from y = 0 down to y = -1.
  // Its cloth takes the instance colour; each panel carries a white crest.
  const noren = (() => {
    const S = new Soup();
    const n = 4;
    for (let i = 0; i < n; i++) {
      const x0 = i / n + 0.012,
        x1 = (i + 1) / n - 0.012,
        xm = (x0 + x1) / 2;
      for (let k = 0; k < 3; k++) {
        const y0 = -k / 3,
          y1 = -(k + 1) / 3,
          sway = 0.015 + k * 0.03;
        S.quad([x0, y1, 0.02], [x1, y1, 0.02], [x1, y0, 0.02], [x0, y0, 0.02], 0xffffff, { mask: 1, sway });
        S.quad([x1, y1, 0.015], [x0, y1, 0.015], [x0, y0, 0.015], [x1, y0, 0.015], 0x000000, { mask: 0.7, sway });
      }
      for (let s = 0; s < 8; s++) {
        const a0 = (s / 8) * 6.283,
          a1 = ((s + 1) / 8) * 6.283;
        S.tri([xm, -0.5, 0.026], [xm + Math.cos(a0) * 0.075, -0.5 + Math.sin(a0) * 0.19, 0.026], [xm + Math.cos(a1) * 0.075, -0.5 + Math.sin(a1) * 0.19, 0.026], 0xf4efe2, { sway: 0.045 });
      }
    }
    cuboid(S, [-0.02, -0.02, 0], [1.02, 0.03, 0.05], EDO.TIMBER, undefined, '');
    return S.geometry();
  })();

  // chochin: a paper lantern, in real metres, hanging down from its origin; the paper takes the instance colour
  const chochin = (() => {
    const S = new Soup();
    S.add(new THREE.SphereGeometry(1, 10, 8), 0xffffff, T(0, -0.42, 0, 0.2, 0.27, 0.2), { em: 1, mask: 1 });
    const cap = new THREE.CylinderGeometry(0.11, 0.11, 0.05, 8);
    S.add(cap, 0x1c1c22, T(0, -0.16, 0));
    S.add(cap, 0x1c1c22, T(0, -0.68, 0));
    cuboid(S, [-0.008, -0.16, -0.008], [0.008, 0, 0.008], 0x1c1c22, undefined, '');
    return S.geometry();
  })();

  // kanban: a signboard hung out from the wall on a bracket, a few brushed characters down each face
  const kanban = (() => {
    const S = new Soup();
    cuboid(S, [-0.025, -0.025, 0], [0.025, 0.025, 0.7], EDO.TIMBER, undefined, '');
    cuboid(S, [-0.025, -1.32, 0.3], [0.025, -0.06, 0.68], 0xffffff, { mask: 1 }, '');
    S.facing([0, -0.7, 0.49]);
    for (const sx of [-1, 1])
      for (let k = 0; k < 4; k++) {
        const y0 = -0.36 - k * 0.27,
          x = sx * 0.028,
          z0 = 0.37 + (k % 2) * 0.03,
          z1 = 0.6 - ((k + 1) % 2) * 0.04;
        S.quad([x, y0, z0], [x, y0, z1], [x, y0 + 0.17, z1], [x, y0 + 0.17, z0], 0x16161c);
        S.quad([x, y0 + 0.06, z0 + 0.06], [x, y0 + 0.06, z1 - 0.06], [x, y0 + 0.11, z1 - 0.06], [x, y0 + 0.11, z0 + 0.06], 0xffffff, { mask: 1 });
      }
    S.facing(null);
    return S.geometry();
  })();

  // tensui-oke: the rain barrel kept at a street corner against fire, buckets stacked on its lid
  const tensui = (() => {
    const S = new Soup();
    S.add(new THREE.CylinderGeometry(0.42, 0.36, 0.8, 10), EDO.WOOD, T(0, 0.4, 0));
    const hoop = new THREE.CylinderGeometry(0.435, 0.435, 0.05, 10);
    for (const yb of [0.18, 0.62]) S.add(hoop, 0x2a2a2e, T(0, yb, 0));
    cuboid(S, [-0.5, 0.8, -0.5], [0.5, 0.86, 0.5], EDO.TIMBER, undefined, 'b');
    const b = new THREE.CylinderGeometry(0.13, 0.1, 0.2, 7);
    for (const [bx, by] of [[-0.26, 0.96], [0, 0.96], [0.26, 0.96], [-0.13, 1.16], [0.13, 1.16], [0, 1.36]]) S.add(b, EDO.WEATHER, T(bx, by, 0));
    return S.geometry();
  })();

  // shogi: the bench outside a shop
  const bench = (() => {
    const S = new Soup();
    cuboid(S, [-0.8, 0.4, -0.22], [0.8, 0.46, 0.22], EDO.WOOD, undefined, '');
    for (const x of [-0.62, 0.62]) cuboid(S, [x - 0.04, 0, -0.18], [x + 0.04, 0.4, 0.18], EDO.TIMBER, undefined, 'tb');
    return S.geometry();
  })();

  return { noren: { geometry: noren }, chochin: { geometry: chochin }, kanban: { geometry: kanban }, tensui: { geometry: tensui }, bench: { geometry: bench } };
}

let LIB = null;
export const edoParts = () => (LIB ??= makeParts());

export class EdoKit extends Kit {
  constructor(mats) {
    super(mats, edoParts());
  }
}
