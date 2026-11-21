// The Tuscan kit: what the towns and farms of the Arno valley are made of about 1500
// (stucco the colour of the earth, rough stone, roofs of terracotta tile), and what hangs
// on their walls. The engine's house generator (engine/townhouse.js) builds with it.
//   const kit = new TuscanKit(tuscanMaterials(strokes))
import * as THREE from 'three';
import { paintMaterial } from '../../../engine/paint.js';
import { Kit } from '../../../engine/kit.js';
import { Soup } from '../../../engine/soup.js';
import { cuboid } from '../../../engine/facade.js';

export const TU = {
  PLASTER: [0xd9b888, 0xc9a878, 0xe0c090, 0xcfa070, 0xd8a878, 0xe6cfa0, 0xc8926a, 0xddc8a0],
  BOARD: [0xb89868, 0xa88858],
  SHED: [0xb89868, 0xa88858],
  ROOF: [0xa8582e, 0xb8663a, 0x9a4e2a, 0xc0744a, 0xa86038],
  TRIM: 0xb8a88a, // the grey-brown stone of sills and corners
  STONE: 0xa89a80,
  STONE_D: 0x7a6e5a,
  LIT: [0xffd56b, 0xffb84d, 0xffe6a3],
  DARK: 0x2a2c34,
  IRON: 0x2a2420,
  TIMBER: 0x5a4026,
  SHUTTER: [0x4a5a3a, 0x5a4026, 0x6a3a2a, 0x3a4a4a, 0x6a5a3a],
};

// Everything in this picture is seen through haze: the paint is soft and close in tone.
export function tuscanMaterials(strokes) {
  const built = (stroke, o = {}) => paintMaterial({ stroke, directed: 1, scale: 0.3, contrast: 0.22, hueVar: 0.12, warp: 0.1, impasto: 0.04, rim: 0.06, band: 0.34, big: 0.3, ...o });
  return {
    boards: built(strokes.plank, { scale: 0.6, contrast: 0.3 }),
    plaster: built(strokes.soft, { scale: 0.28, contrast: 0.16 }),
    brick: built(strokes.brick, { scale: 0.32, contrast: 0.3 }),
    roof: built(strokes.tiles, { scale: 0.34, contrast: 0.36, hueVar: 0.22 }),
    stone: built(strokes.masonry, { scale: 0.22, contrast: 0.32 }),
    detail: built(strokes.soft, { scale: 0.42, contrast: 0.22, big: 0, emissive: 1.5 }),
  };
}

// Parts are drawn for a unit opening (x 0..1 across, y 0..1 up, z out of the wall).
// Faces with mask 1 take the colour of the instance.
function makeParts() {
  const strip = (S, x0, x1, y0, y1, z, col, o) => S.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], col, o);
  // a window: a stone sill and lintel, and two board shutters folded back against the wall
  const window_ = (() => {
    const S = new Soup();
    cuboid(S, [-0.12, -0.1, 0], [1.12, -0.02, 0.1], TU.TRIM, undefined, 'k');
    cuboid(S, [-0.08, 1.0, 0], [1.08, 1.09, 0.06], TU.TRIM, undefined, 'k');
    for (const sx of [-1, 1]) {
      const x0 = sx < 0 ? -0.52 : 1.02;
      cuboid(S, [x0, 0.0, 0], [x0 + 0.5, 1.0, 0.035], 0xffffff, { mask: 1 }, 'k');
      for (const y of [0.25, 0.75]) strip(S, x0 + 0.03, x0 + 0.47, y - 0.03, y + 0.03, 0.04, 0x000000, { mask: 0.6 });
    }
    strip(S, 0.47, 0.53, 0, 1, -0.06, TU.TIMBER);
    strip(S, 0, 1, 0.47, 0.53, -0.06, TU.TIMBER);
    return S.geometry();
  })();
  // a door of planks under a round stone arch; the leaf takes the instance colour
  const door = (() => {
    const S = new Soup();
    strip(S, 0, 1, 0, 1, -0.1, 0xffffff, { mask: 1 });
    for (const x of [0.25, 0.5, 0.75]) strip(S, x - 0.008, x + 0.008, 0, 1, -0.095, 0x000000, { mask: 0.5 });
    for (const y of [0.2, 0.72]) strip(S, 0.03, 0.97, y - 0.02, y + 0.02, -0.09, TU.IRON);
    for (const sx of [-1, 1]) cuboid(S, [sx < 0 ? -0.14 : 1, 0, 0], [sx < 0 ? 0 : 1.14, 1.0, 0.05], TU.TRIM, undefined, 'k');
    // the arch over it, in seven stones
    for (let i = 0; i < 7; i++) {
      const a0 = Math.PI - (i / 7) * Math.PI,
        a1 = Math.PI - ((i + 1) / 7) * Math.PI;
      const p = (a, r) => [0.5 + Math.cos(a) * r, 1.0 + Math.sin(a) * r * 0.62, 0.05];
      S.quad(p(a0, 0.5), p(a0, 0.66), p(a1, 0.66), p(a1, 0.5), i % 2 ? TU.TRIM : TU.STONE_D);
    }
    S.tri([0, 1, 0.02], [1, 1, 0.02], [0.5, 1.3, 0.02], 0x1c1814);
    cuboid(S, [-0.2, -0.12, 0], [1.2, 0, 0.5], TU.STONE, undefined, 'k');
    return S.geometry();
  })();
  // an awning for a market stall: striped cloth on four poles; the cloth takes the instance colour
  const stall = (() => {
    const S = new Soup();
    for (const [x, z] of [[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.7], [1.1, 0.7]]) cuboid(S, [x - 0.04, 0, z - 0.04], [x + 0.04, z > 0 ? 2.0 : 2.4, z + 0.04], TU.TIMBER, undefined, 'b');
    S.facing([0, -9, 0]);
    for (let i = 0; i < 6; i++) S.quad([-1.3 + i * 0.433, 2.45, -0.85], [-1.3 + (i + 1) * 0.433, 2.45, -0.85], [-1.3 + (i + 1) * 0.433, 2.02, 0.9], [-1.3 + i * 0.433, 2.02, 0.9], i % 2 ? 0xe8dcc0 : 0xffffff, { mask: i % 2 ? 0 : 1, sway: 0.06 });
    S.facing(null);
    cuboid(S, [-1.15, 0.78, -0.5], [1.15, 0.86, 0.5], 0x8a6a44, undefined, '');
    for (const sx of [-1, 1]) cuboid(S, [sx * 1.05 - 0.04, 0, -0.45], [sx * 1.05 + 0.04, 0.78, 0.45], TU.TIMBER, undefined, 'b');
    return S.geometry();
  })();
  // a big oil jar
  const jar = (() => {
    const S = new Soup();
    S.add(new THREE.LatheGeometry([[0.12, 0], [0.3, 0.2], [0.36, 0.5], [0.3, 0.8], [0.16, 0.95], [0.2, 1.02]].map(([r, y]) => new THREE.Vector2(r, y)), 10), 0xffffff, null, { mask: 0.9 });
    return S.geometry();
  })();
  const barrel = (() => {
    const S = new Soup();
    S.add(new THREE.LatheGeometry([[0.27, 0], [0.33, 0.25], [0.34, 0.45], [0.33, 0.65], [0.27, 0.9]].map(([r, y]) => new THREE.Vector2(r, y)), 10), 0xffffff, null, { mask: 0.85 });
    for (const y of [0.16, 0.74]) S.add(new THREE.CylinderGeometry(0.318, 0.318, 0.045, 10, 1, true), TU.IRON, new THREE.Matrix4().makeTranslation(0, y, 0));
    return S.geometry();
  })();
  // a lantern on an iron bracket; its glass takes the instance colour and glows
  const lantern = (() => {
    const S = new Soup();
    cuboid(S, [-0.02, 0.3, 0], [0.02, 0.34, 0.5], TU.IRON, undefined, 'k');
    cuboid(S, [-0.1, 0, 0.38], [0.1, 0.28, 0.58], 0xffffff, { mask: 1, em: 1 }, '');
    cuboid(S, [-0.13, 0.28, 0.35], [0.13, 0.32, 0.61], TU.IRON, undefined, '');
    return S.geometry();
  })();
  return { window: { geometry: window_ }, door: { geometry: door }, stall: { geometry: stall }, jar: { geometry: jar }, barrel: { geometry: barrel }, lantern: { geometry: lantern } };
}

let LIB = null;
export const tuscanParts = () => (LIB ??= makeParts());

export class TuscanKit extends Kit {
  constructor(mats) {
    super(mats, tuscanParts());
    this.pal = TU; // what engine/townhouse.js paints its houses from
  }
}
