// The town kit: the materials every building shares, and a Kit that gathers one
// chunk of town (a block, a row of houses) into a few merged meshes plus the
// instanced details that are only drawn close to the player.
import * as THREE from 'three';
import { paintMaterial } from '../../../engine/paint.js';
import { Soup } from '../../../engine/soup.js';
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
    detail: built(strokes.oil, { scale: 0.42, contrast: 0.3, hueVar: 0.22, impasto: 0.08, big: 0, emissive: 1.75 }),
    wood: built(strokes.plank, { scale: 0.8, contrast: 0.4, hueVar: 0.28, big: 0 }),
    cobble: paintMaterial({ stroke: strokes.cobble, scale: 0.25, contrast: 0.6, hueVar: 0.85, warp: 0, accent: 0xf0b6c8, accentAmt: 0.3, impasto: 0.18, rim: 0.05, band: 0.3, big: 0.35 }),
  };
}

let PARTS = null;
export const parts = () => (PARTS ??= makeParts());

export class Kit {
  constructor(mats) {
    this.mats = mats;
    this.soups = {};
    this.placed = {};
  }
  // the merged soup for a material name (see townMaterials)
  s(name) {
    return (this.soups[name] ??= new Soup());
  }
  // draw an instanced part: matrix places its unit opening; color tints its masked faces
  place(part, matrix, color = 0xffffff) {
    (this.placed[part] ??= []).push([matrix, color]);
  }
  // -> { base: Group of merged meshes, detail: Group of instanced parts, tris }
  build() {
    const base = new THREE.Group();
    const detail = new THREE.Group();
    let tris = 0;
    for (const [name, soup] of Object.entries(this.soups)) {
      if (soup.empty()) continue;
      tris += soup.triangles;
      base.add(soup.mesh(this.mats[name]));
    }
    const lib = parts();
    const c = new THREE.Color();
    for (const [name, list] of Object.entries(this.placed)) {
      const geo = lib[name].geometry;
      const im = new THREE.InstancedMesh(geo, this.mats.detail, list.length);
      list.forEach(([m, col], i) => {
        im.setMatrixAt(i, m);
        im.setColorAt(i, c.set(col));
      });
      im.instanceMatrix.needsUpdate = true;
      im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
      im.computeBoundingBox();
      detail.add(im);
      tris += (geo.attributes.position.count / 3) * list.length;
    }
    this.soups = {};
    this.placed = {};
    return { base, detail, tris };
  }
}
