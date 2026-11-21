// The Kristiania kit: the materials of a Norwegian harbour town of the 1890s (painted
// boards, plaster, dark roofs), and the joinery that hangs on its houses.
//   const kit = new KristianiaKit(kristianiaMaterials(strokes))
// Lab: /?debug&look=scream&lab=worlds/scream/kristiania/lab.js
import * as THREE from 'three';
import { paintMaterial } from '../../../engine/paint.js';
import { Kit } from '../../../engine/kit.js';
import { Soup } from '../../../engine/soup.js';
import { cuboid } from '../../../engine/facade.js';

export const KR = {
  // board houses are painted: ochre, ox-blood, white, grey-blue, green
  BOARD: [0xc9a24a, 0x8a2f2a, 0xdcd4c0, 0x9a4a34, 0x4a6a7a, 0xb86a3a, 0x6a7a5a, 0xd9b45a, 0x7a3a34, 0xc8c0aa, 0x5a6a80],
  PLASTER: [0xcfc6b4, 0xb8a888, 0xd6c9a8, 0xa89a86, 0xc9b9a0, 0x9aa0a8],
  SHED: [0x7a2f2a, 0x8a3a2c, 0x6a4a34, 0xb8863a, 0x5a3a2c], // the warehouses on the quay
  ROOF: [0x2a2a34, 0x3a2a2a, 0x34303a, 0x4a3a34, 0x2f3540, 0x5a3028],
  TRIM: 0xe8e0d0,
  STONE: 0x8a8690,
  STONE_D: 0x5a5868,
  LIT: [0xffd56b, 0xffb84d, 0xffe6a3, 0xffc861, 0xffa94a],
  DARK: 0x1a2040, // an unlit window at dusk
  IRON: 0x16161e,
  TIMBER: 0x3a2418,
};

// Long swaying strokes, as in the picture; the brushwork follows each face, so boards
// lie level along a wall whichever way the house is turned.
export function kristianiaMaterials(strokes) {
  const built = (stroke, o = {}) => paintMaterial({ stroke, directed: 1, scale: 0.3, contrast: 0.5, hueVar: 0.45, warp: 0.12, impasto: 0.12, rim: 0.14, band: 0.3, accent: 0xe07a3a, accentAmt: 0.14, big: 0.5, ...o });
  return {
    boards: built(strokes.plank, { scale: 0.62, contrast: 0.5 }),
    plaster: built(strokes.oil, { scale: 0.3, contrast: 0.22, hueVar: 0.28 }),
    brick: built(strokes.brick, { scale: 0.32, contrast: 0.5 }),
    roof: built(strokes.slate, { scale: 0.3, contrast: 0.55, hueVar: 0.5 }),
    stone: built(strokes.masonry, { scale: 0.2, contrast: 0.5 }),
    detail: built(strokes.oil, { scale: 0.42, contrast: 0.32, hueVar: 0.3, big: 0, emissive: 1.6 }),
  };
}

// Parts are drawn for a unit opening (x 0..1 across, y 0..1 up, z out of the wall).
// Faces with mask 1 take the colour of the instance.
function makeParts() {
  const W = KR.TRIM;
  const strip = (S, x0, x1, y0, y1, z, col, o) => S.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], col, o);

  // a casement window: a broad white frame, two leaves of three panes each, a cornice over it
  const window_ = (() => {
    const S = new Soup();
    for (const [a, b, c, d] of [[-0.1, 0, -0.04, 1.06], [1, 1.1, -0.04, 1.06], [-0.1, 1.1, 1, 1.1], [-0.1, 1.1, -0.08, 0]]) strip(S, a, b, c, d, 0.04, W);
    strip(S, 0.47, 0.53, 0, 1, 0.02, W);
    for (const y of [0.34, 0.67]) strip(S, 0, 1, y - 0.018, y + 0.018, 0.02, W);
    cuboid(S, [-0.14, 1.1, 0], [1.14, 1.16, 0.1], W, undefined, 'k');
    cuboid(S, [-0.13, -0.12, 0], [1.13, -0.08, 0.09], W, undefined, 'k');
    return S.geometry();
  })();

  // a panelled door under a small pent canopy, on two stone steps; the leaf takes the instance colour
  const door = (() => {
    const S = new Soup();
    for (const [a, b, c, d] of [[-0.1, 0, 0, 1.06], [1, 1.1, 0, 1.06], [-0.1, 1.1, 1, 1.08]]) strip(S, a, b, c, d, 0.04, W);
    strip(S, 0, 1, 0, 1, -0.08, 0xffffff, { mask: 1 });
    for (const [a, b, c, d] of [[0.12, 0.46, 0.08, 0.44], [0.54, 0.88, 0.08, 0.44], [0.12, 0.46, 0.5, 0.92], [0.54, 0.88, 0.5, 0.92]]) strip(S, a, b, c, d, -0.07, 0x000000, { mask: 0.78 });
    strip(S, 0.86, 0.91, 0.44, 0.5, -0.06, 0xc9a24a);
    S.facing([0.5, -9, 0.3]);
    S.quad([-0.25, 1.1, 0.75], [1.25, 1.1, 0.75], [1.25, 1.28, 0], [-0.25, 1.28, 0], 0x2a2a34);
    S.facing(null);
    for (const x of [-0.2, 1.2]) {
      S.tri([x, 1.24, 0], [x, 0.98, 0], [x, 1.1, 0.7], KR.TIMBER);
      S.tri([x, 1.24, 0], [x, 1.1, 0.7], [x, 0.98, 0], KR.TIMBER);
    }
    cuboid(S, [-0.3, -0.16, 0], [1.3, -0.08, 0.9], KR.STONE, undefined, 'k');
    cuboid(S, [-0.2, -0.08, 0], [1.2, 0, 0.55], KR.STONE, undefined, 'k');
    return S.geometry();
  })();

  // the great door of a warehouse, in two leaves with cross braces
  const gate = (() => {
    const S = new Soup();
    strip(S, 0, 1, 0, 1, -0.06, 0xffffff, { mask: 1 });
    strip(S, 0.49, 0.51, 0, 1, -0.05, 0x000000, { mask: 0.5 });
    for (const [a, b] of [[0.04, 0.46], [0.54, 0.96]]) {
      for (const y of [0.12, 0.88]) strip(S, a, b, y - 0.025, y + 0.025, -0.05, 0x000000, { mask: 0.6 });
      S.quad([a, 0.12, -0.05], [a + 0.05, 0.12, -0.05], [b, 0.88, -0.05], [b - 0.05, 0.88, -0.05], 0x000000, { mask: 0.6 });
    }
    return S.geometry();
  })();

  // a hoist beam under the ridge of a warehouse, with its block and rope
  const hoist = (() => {
    const S = new Soup();
    cuboid(S, [-0.08, -0.09, -0.1], [0.08, 0.09, 1.3], KR.TIMBER, undefined, 'k');
    cuboid(S, [-0.02, -1.6, 1.12], [0.02, -0.09, 1.16], 0x8a7a5a, undefined, '');
    cuboid(S, [-0.07, -1.8, 1.07], [0.07, -1.6, 1.21], KR.IRON, undefined, '');
    return S.geometry();
  })();

  // a gas lamp on its post; the lantern takes the instance colour and glows
  const lamp = (() => {
    const S = new Soup();
    S.add(new THREE.CylinderGeometry(0.05, 0.09, 3.3, 6), KR.IRON, new THREE.Matrix4().makeTranslation(0, 1.65, 0));
    S.add(new THREE.CylinderGeometry(0.13, 0.16, 0.2, 6), KR.IRON, new THREE.Matrix4().makeTranslation(0, 0.1, 0));
    S.add(new THREE.CylinderGeometry(0.2, 0.12, 0.46, 6), 0xffffff, new THREE.Matrix4().makeTranslation(0, 3.52, 0), { mask: 1, em: 1 });
    S.add(new THREE.ConeGeometry(0.26, 0.2, 6), KR.IRON, new THREE.Matrix4().makeTranslation(0, 3.85, 0));
    return S.geometry();
  })();

  const barrel = (() => {
    const S = new Soup();
    S.add(new THREE.LatheGeometry([[0.27, 0], [0.33, 0.25], [0.34, 0.45], [0.33, 0.65], [0.27, 0.9]].map(([r, y]) => new THREE.Vector2(r, y)), 10), 0xffffff, null, { mask: 0.85 });
    for (const y of [0.16, 0.74]) S.add(new THREE.CylinderGeometry(0.318, 0.318, 0.045, 10, 1, true), KR.IRON, new THREE.Matrix4().makeTranslation(0, y, 0));
    S.add(new THREE.CircleGeometry(0.27, 10), 0x4a3a2c, new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, 0.88, 0));
    return S.geometry();
  })();
  const crate = (() => {
    const S = new Soup();
    cuboid(S, [-0.45, 0, -0.32], [0.45, 0.55, 0.32], 0xffffff, { mask: 1 }, 'b');
    for (const y of [0.1, 0.45]) cuboid(S, [-0.47, y - 0.03, -0.34], [0.47, y + 0.03, 0.34], 0x3a2c22, undefined, 'tb');
    return S.geometry();
  })();
  // a bollard on the quay
  const bollard = (() => {
    const S = new Soup();
    S.add(new THREE.CylinderGeometry(0.13, 0.17, 0.62, 8), KR.IRON, new THREE.Matrix4().makeTranslation(0, 0.31, 0));
    S.add(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 8), KR.IRON, new THREE.Matrix4().makeTranslation(0, 0.64, 0));
    return S.geometry();
  })();

  return { window: { geometry: window_ }, door: { geometry: door }, gate: { geometry: gate }, hoist: { geometry: hoist }, lamp: { geometry: lamp }, barrel: { geometry: barrel }, crate: { geometry: crate }, bollard: { geometry: bollard } };
}

let LIB = null;
export const kristianiaParts = () => (LIB ??= makeParts());

export class KristianiaKit extends Kit {
  constructor(mats) {
    super(mats, kristianiaParts());
  }
}
