// The Delft kit: the materials of a Dutch brick town, and the joinery and ironwork that
// hang on its houses (cross-windows with their shutters, doors, awnings, hoists, lanterns).
//   const kit = new DelftKit(delftMaterials(strokes))
// Lab: /?debug&look=pearl&lab=worlds/pearl/delft/lab.js
import * as THREE from 'three';
import { paintMaterial } from '../../../engine/paint.js';
import { Kit } from '../../../engine/kit.js';
import { Soup } from '../../../engine/soup.js';
import { cuboid } from '../../../engine/facade.js';

export const DELFT = {
  BRICK: [0x9c5238, 0x8a4a34, 0xa85c3c, 0x7a3e30, 0xb0684a, 0x93503a, 0x86503e, 0xa0563e, 0xb87a56],
  ROOF: [0xb5532e, 0xc4603a, 0xa84a2c, 0x9a4630, 0xb96a3c, 0x5a606c],
  STONE: 0xd9cfb8,
  STONE_D: 0xb0a58c,
  WHITE: 0xe9e2d0, // whitewash, and painted wood
  SHUTTER: [0x8a2a22, 0x2f5a3a, 0x24405a, 0x7a2f2a, 0x3a5a44, 0x9a3a2a, 0x2a4a3a],
  DOOR: [0x2a3a2c, 0x5a1e1a, 0x1e2a36, 0x3a2a1e, 0x24382a, 0x4a2a20],
  GLASS: [0x2c3a40, 0x3a4a50, 0x25323a, 0x445860, 0x34444a],
  LIT: [0xffd590, 0xffc878, 0xffe2a8],
  IRON: 0x1e1e22,
  LEAD: 0x2a2e34,
  TIMBER: 0x4a3626,
  WOOD: 0x8a6a48,
  CLOTH: [0xb2452f, 0xe6d9b0, 0x2f5f8a, 0xd9a83a, 0x4a7a4a, 0xd9cdb0, 0x7a3a5a],
};

// Thin glazes and quiet colour, as he painted; the brushwork follows the face, so
// the courses of brick and tile run level whichever way a house is turned.
export function delftMaterials(strokes) {
  const built = (stroke, o = {}) => paintMaterial({ stroke, directed: 1, scale: 0.2, contrast: 0.36, hueVar: 0.14, warp: 0, impasto: 0.05, rim: 0.06, band: 0.24, big: 0.35, ...o });
  return {
    brick: built(strokes.brick, { scale: 0.34, contrast: 0.4, hueVar: 0.18 }),
    plaster: built(strokes.soft, { scale: 0.22, contrast: 0.16, hueVar: 0.08 }), // whitewash
    stone: built(strokes.ashlar, { scale: 0.2, contrast: 0.3, hueVar: 0.1 }),
    tile: built(strokes.tiles, { scale: 0.27, contrast: 0.5, hueVar: 0.26, impasto: 0.1 }),
    slate: built(strokes.slate, { scale: 0.3, contrast: 0.42, hueVar: 0.16 }),
    wood: built(strokes.plank, { scale: 0.8, contrast: 0.34, hueVar: 0.12, big: 0 }),
    detail: built(strokes.soft, { scale: 0.4, contrast: 0.18, hueVar: 0.1, big: 0, emissive: 1.7 }), // joinery, glass, iron, cloth
    cobble: paintMaterial({ stroke: strokes.cobble, scale: 0.26, contrast: 0.42, hueVar: 0.22, warp: 0, impasto: 0.08, rim: 0.04, band: 0.26, big: 0.3 }),
  };
}

// Every part is drawn for a unit opening (x 0..1 across, y 0..1 up, z out of the wall) and
// stretched onto the real one. Faces with mask 1 take the colour of the instance.
function makeParts() {
  const W = DELFT.WHITE,
    lead = DELFT.LEAD,
    iron = DELFT.IRON;
  // a flat strip on the wall plane at depth z
  const strip = (S, x0, x1, y0, y1, z, col, o) => S.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], col, o);

  // The cross-window: a mullion and a transom make four lights. The upper two are fixed
  // and leaded; the lower two open, and their shutters fold back flat against the wall.
  const crossWindow = (shutters) => {
    const S = new Soup();
    const T = 0.58; // the transom
    strip(S, 0, 1, 0, 0.035, 0.03, W);
    strip(S, 0, 1, 0.965, 1, 0.03, W);
    strip(S, 0, 0.06, 0, 1, 0.03, W);
    strip(S, 0.94, 1, 0, 1, 0.03, W);
    strip(S, 0.47, 0.53, 0, 1, 0.03, W);
    strip(S, 0, 1, T - 0.02, T + 0.02, 0.035, W);
    // the leading of the upper lights, and one bar across each lower one
    for (const [a, b] of [[0.06, 0.47], [0.53, 0.94]]) {
      for (let k = 1; k < 3; k++) strip(S, a + ((b - a) * k) / 3 - 0.008, a + ((b - a) * k) / 3 + 0.008, T + 0.02, 0.965, -0.1, lead);
      for (let k = 1; k < 3; k++) strip(S, a, b, T + 0.02 + ((0.945 - T) * k) / 3 - 0.006, T + 0.02 + ((0.945 - T) * k) / 3 + 0.006, -0.1, lead);
      strip(S, a, b, T * 0.5 - 0.006, T * 0.5 + 0.006, -0.1, lead);
    }
    // the sill
    cuboid(S, [-0.05, -0.05, 0], [1.05, 0, 0.1], DELFT.STONE, undefined, 'k');
    if (shutters)
      for (const [a, b] of [[-0.43, -0.02], [1.02, 1.43]]) {
        strip(S, a, b, 0.035, T - 0.02, 0.05, 0xffffff, { mask: 1 });
        strip(S, a + 0.05, b - 0.05, 0.09, T - 0.075, 0.056, 0xd8d8d8, { mask: 1 }); // the sunk panel, a shade paler
        for (const y of [0.12, T - 0.11]) strip(S, a, b, y - 0.012, y + 0.012, 0.062, iron); // strap hinges
      }
    return S.geometry();
  };

  // a small leaded window for a gable or a back wall
  const smallWindow = (() => {
    const S = new Soup();
    strip(S, 0, 1, 0, 0.05, 0.03, W);
    strip(S, 0, 1, 0.95, 1, 0.03, W);
    strip(S, 0, 0.08, 0, 1, 0.03, W);
    strip(S, 0.92, 1, 0, 1, 0.03, W);
    strip(S, 0.47, 0.53, 0, 1, 0.03, W);
    for (let k = 1; k < 3; k++) strip(S, 0.08, 0.92, k / 3 - 0.008, k / 3 + 0.008, -0.1, lead);
    cuboid(S, [-0.06, -0.06, 0], [1.06, 0, 0.09], DELFT.STONE, undefined, 'k');
    return S.geometry();
  })();

  // a plank door under a leaded fanlight, on its stone step; the leaf takes the instance colour
  const door = (() => {
    const S = new Soup();
    const F = 0.8; // where the fanlight begins
    strip(S, 0, 0.07, 0, 1, 0.04, W);
    strip(S, 0.93, 1, 0, 1, 0.04, W);
    strip(S, 0, 1, 0.965, 1, 0.04, W);
    strip(S, 0, 1, F - 0.02, F + 0.02, 0.045, W);
    for (let k = 1; k < 4; k++) strip(S, 0.07 + (0.86 * k) / 4 - 0.008, 0.07 + (0.86 * k) / 4 + 0.008, F + 0.02, 0.965, -0.12, lead);
    strip(S, 0.07, 0.93, 0, F - 0.02, -0.06, 0xffffff, { mask: 1 });
    for (let k = 1; k < 5; k++) strip(S, 0.07 + (0.86 * k) / 5 - 0.006, 0.07 + (0.86 * k) / 5 + 0.006, 0.02, F - 0.04, -0.055, 0x000000, { mask: 0.55 }); // the joints between the planks
    strip(S, 0.78, 0.84, 0.36, 0.42, -0.05, iron);
    for (const y of [0.14, F - 0.16]) strip(S, 0.07, 0.5, y - 0.012, y + 0.012, -0.05, iron);
    cuboid(S, [-0.18, -0.07, 0], [1.18, 0, 0.5], DELFT.STONE, undefined, 'k');
    return S.geometry();
  })();

  // the pent roof over a shop window: boards on two brackets
  const luifel = (() => {
    const S = new Soup();
    S.facing([0.5, -20, 0.5]);
    S.quad([-0.03, 0.72, 1.15], [1.03, 0.72, 1.15], [1.03, 1, 0], [-0.03, 1, 0], 0xffffff, { mask: 1 });
    S.facing([0.5, 20, 0.5]);
    S.quad([-0.03, 0.69, 1.15], [1.03, 0.69, 1.15], [1.03, 0.97, 0], [-0.03, 0.97, 0], 0x8a8a8a, { mask: 1 });
    S.facing([0.5, 0.8, 0]);
    S.quad([-0.03, 0.69, 1.15], [1.03, 0.69, 1.15], [1.03, 0.72, 1.15], [-0.03, 0.72, 1.15], 0xb0b0b0, { mask: 1 });
    S.facing(null);
    for (const x of [0.04, 0.96]) {
      S.tri([x, 0.94, 0], [x, 0.4, 0], [x, 0.74, 0.95], DELFT.TIMBER);
      S.tri([x, 0.94, 0], [x, 0.74, 0.95], [x, 0.4, 0], DELFT.TIMBER);
    }
    return S.geometry();
  })();

  // the hoisting beam at the top of a gable, with its hook
  const hoist = (() => {
    const S = new Soup();
    cuboid(S, [-0.07, -0.08, -0.1], [0.07, 0.08, 1.0], DELFT.TIMBER, undefined, 'k');
    cuboid(S, [-0.015, -0.42, 0.86], [0.015, -0.08, 0.89], iron, undefined, '');
    cuboid(S, [-0.05, -0.5, 0.84], [0.05, -0.42, 0.91], iron, undefined, '');
    return S.geometry();
  })();

  // a lantern on an iron arm; its panes take the instance colour and glow
  const lantern = (() => {
    const S = new Soup();
    cuboid(S, [-0.015, 0.3, 0], [0.015, 0.33, 0.55], iron, undefined, '');
    cuboid(S, [-0.012, 0.0, 0.5], [0.012, 0.3, 0.52], iron, undefined, '');
    cuboid(S, [-0.11, -0.3, 0.4], [0.11, 0.0, 0.62], 0xffffff, { mask: 1, em: 1 }, '');
    S.facing([0, -5, 0.51]);
    for (const [a, b] of [[[-0.14, 0, 0.37], [0.14, 0, 0.37]], [[0.14, 0, 0.37], [0.14, 0, 0.65]], [[0.14, 0, 0.65], [-0.14, 0, 0.65]], [[-0.14, 0, 0.65], [-0.14, 0, 0.37]]]) S.tri(a, b, [0, 0.12, 0.51], iron);
    S.facing(null);
    cuboid(S, [-0.12, -0.33, 0.39], [0.12, -0.3, 0.63], iron, undefined, '');
    return S.geometry();
  })();

  // a painted board swinging from an iron bracket
  const sign = (() => {
    const S = new Soup();
    cuboid(S, [-0.015, 0.0, 0], [0.015, 0.03, 0.95], iron, undefined, '');
    for (const sx of [-1, 1]) {
      S.quad([sx * 0.02, -0.6, 0.25], [sx * 0.02, -0.6, 0.9], [sx * 0.02, -0.06, 0.9], [sx * 0.02, -0.06, 0.25], 0xffffff, { mask: 1, sway: 0.25 });
      S.quad([sx * 0.024, -0.48, 0.38], [sx * 0.024, -0.48, 0.77], [sx * 0.024, -0.18, 0.77], [sx * 0.024, -0.18, 0.38], 0x3a3a3a, { mask: 0.6, sway: 0.25 });
    }
    return S.geometry();
  })();

  // an iron wall tie: a short upright bar with a foot at each end
  const anchor = (() => {
    const S = new Soup();
    strip(S, -0.018, 0.018, -0.17, 0.17, 0.025, iron);
    for (const y of [-0.17, 0.17]) strip(S, -0.05, 0.05, y - 0.015, y + 0.015, 0.027, iron);
    return S.geometry();
  })();

  // the bench beside a door
  const bench = (() => {
    const S = new Soup();
    cuboid(S, [-0.7, 0.42, 0], [0.7, 0.48, 0.38], DELFT.WOOD, undefined, '');
    for (const x of [-0.56, 0.56]) cuboid(S, [x - 0.04, 0, 0.03], [x + 0.04, 0.42, 0.35], DELFT.TIMBER, undefined, 'tb');
    return S.geometry();
  })();

  // a barrel on end, hooped in iron
  const barrel = (() => {
    const S = new Soup();
    const prof = [[0.27, 0], [0.33, 0.25], [0.34, 0.45], [0.33, 0.65], [0.27, 0.9]];
    S.add(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 10), 0xffffff, null, { mask: 0.85 });
    for (const [y, r] of [[0.16, 0.318], [0.74, 0.318]]) S.add(new THREE.CylinderGeometry(r, r, 0.045, 10, 1, true), iron, new THREE.Matrix4().makeTranslation(0, y, 0));
    S.add(new THREE.CircleGeometry(0.27, 10), 0x6a5238, new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, 0.88, 0));
    return S.geometry();
  })();

  // a slatted crate; what is in it takes the instance colour
  const crate = (() => {
    const S = new Soup();
    cuboid(S, [-0.36, 0, -0.26], [0.36, 0.3, 0.26], DELFT.WOOD, undefined, 'tb');
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) S.add(new THREE.IcosahedronGeometry(0.085, 0), 0xffffff, new THREE.Matrix4().makeTranslation(-0.27 + i * 0.135, 0.3 + ((i + j) % 2) * 0.03, -0.16 + j * 0.16), { mask: 1 });
    return S.geometry();
  })();

  // a market stall: trestle table, four poles, a cloth awning in the instance colour
  const stall = (() => {
    const S = new Soup();
    cuboid(S, [-1.7, 0.84, -0.7], [1.7, 0.92, 0.7], DELFT.WOOD, undefined, '');
    for (const x of [-1.5, 1.5]) cuboid(S, [x - 0.05, 0, -0.6], [x + 0.05, 0.84, 0.6], DELFT.TIMBER, undefined, 'tb');
    for (const [x, z] of [[-1.75, -0.75], [1.75, -0.75], [-1.75, 0.75], [1.75, 0.75]]) cuboid(S, [x - 0.035, 0, z - 0.035], [x + 0.035, z > 0 ? 2.25 : 2.75, z + 0.035], DELFT.TIMBER, undefined, 'tb');
    S.facing([0, -20, 0]);
    S.quad([-1.95, 2.25, 0.95], [1.95, 2.25, 0.95], [1.95, 2.78, -0.95], [-1.95, 2.78, -0.95], 0xffffff, { mask: 1, sway: 0.06 });
    S.facing([0, 20, 0]);
    S.quad([-1.95, 2.22, 0.95], [1.95, 2.22, 0.95], [1.95, 2.75, -0.95], [-1.95, 2.75, -0.95], 0x9a9a9a, { mask: 1, sway: 0.06 });
    S.facing(null);
    // the valance hanging at the front, cut in tongues
    for (let i = 0; i < 9; i++) {
      const x0 = -1.95 + (i * 3.9) / 9,
        x1 = x0 + 3.9 / 9;
      for (const z of [0.95, 0.951])
        (z === 0.95 ? S.facing([0, 2, 5]) : S.facing([0, 2, -5])).tri([x0, 2.25, z], [x1, 2.25, z], [(x0 + x1) / 2, 1.98, z], i % 2 ? 0xffffff : 0xd0d0d0, { mask: 1, sway: 0.12 });
    }
    S.facing(null);
    return S.geometry();
  })();

  return {
    window: { geometry: crossWindow(true) },
    windowBare: { geometry: crossWindow(false) },
    windowSmall: { geometry: smallWindow },
    door: { geometry: door },
    luifel: { geometry: luifel },
    hoist: { geometry: hoist },
    lantern: { geometry: lantern },
    sign: { geometry: sign },
    anchor: { geometry: anchor },
    bench: { geometry: bench },
    barrel: { geometry: barrel },
    crate: { geometry: crate },
    stall: { geometry: stall },
  };
}

let LIB = null;
export const delftParts = () => (LIB ??= makeParts());

export class DelftKit extends Kit {
  constructor(mats) {
    super(mats, delftParts());
  }
}
