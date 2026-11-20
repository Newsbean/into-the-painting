// The Starry Night's town kit: the materials every building shares and the parts
// library (parts.js), handed to the engine's Kit (engine/kit.js).
import { paintMaterial } from '../../../engine/paint.js';
import { Kit as BaseKit } from '../../../engine/kit.js';
import { makeParts } from './parts.js';

// One set per world. All of them are "directed": the brushwork follows the face.
export function townMaterials(strokes) {
  const built = (stroke, o = {}) => paintMaterial({ stroke, directed: 1, scale: 0.2, contrast: 0.52, hueVar: 0.42, warp: 0, impasto: 0.13, rim: 0.07, band: 0.3, big: 0.6, ...o });
  return {
    // walls
    stone: built(strokes.masonry),
    plaster: built(strokes.oil, { scale: 0.27, contrast: 0.2, hueVar: 0.3, impasto: 0.09, big: 0.6 }),
    brick: built(strokes.brick, { scale: 0.3, contrast: 0.5 }),
    ashlar: built(strokes.ashlar, { scale: 0.16, contrast: 0.42 }),
    // roofs
    tile: built(strokes.tiles, { scale: 0.25, contrast: 0.62, hueVar: 0.55, impasto: 0.2, rim: 0.1, big: 0.75 }),
    slate: built(strokes.slate, { scale: 0.3, contrast: 0.58, hueVar: 0.5, impasto: 0.2, rim: 0.1, big: 0.75 }),
    // dressings, joinery, iron, glass: colour comes from the faces themselves
    detail: built(strokes.oil, { scale: 0.42, contrast: 0.3, hueVar: 0.22, impasto: 0.08, big: 0, emissive: 1.38 }),
    wood: built(strokes.plank, { scale: 0.8, contrast: 0.4, hueVar: 0.28, big: 0 }),
    cobble: paintMaterial({ stroke: strokes.cobble, scale: 0.25, contrast: 0.6, hueVar: 0.85, warp: 0, accent: 0xf0b6c8, accentAmt: 0.3, impasto: 0.18, rim: 0.05, band: 0.3, big: 0.35 }),
  };
}

let PARTS = null;
export const parts = () => (PARTS ??= makeParts());

// the Starry Night's kit: the engine's Kit with this town's parts
export class Kit extends BaseKit {
  constructor(mats) {
    super(mats, parts());
  }
}
