import * as THREE from 'three';
import { Soup } from './soup.js';

// A Kit gathers one chunk of something built (a block of town, a row of houses, a temple
// precinct) into a few merged meshes, one per material, plus the instanced parts that
// are drawn many times over (windows, lanterns, lamp posts).
//
//   const kit = new Kit(materials, parts)
//     materials: { name: THREE.Material, ... }          every soup is named after its material
//     parts:     { name: { geometry, material? }, ... } instanced details; material defaults to 'detail'
//   kit.s('stone')            the Soup that will be drawn with materials.stone
//   kit.place('lantern', m)   one more instance of a part, placed by matrix m (and tinted by a colour)
//   const { base, detail, tris } = kit.build()
//     base:   Group of merged meshes: always drawn when in view
//     detail: Group of instanced parts: switch it off when the camera is far away
export class Kit {
  constructor(mats, lib = {}) {
    this.mats = mats;
    this.lib = lib;
    this.soups = {};
    this.placed = {};
  }
  s(name) {
    return (this.soups[name] ??= new Soup());
  }
  place(part, matrix, color = 0xffffff) {
    (this.placed[part] ??= []).push([matrix, color]);
  }
  build() {
    const base = new THREE.Group();
    const detail = new THREE.Group();
    let tris = 0;
    for (const [name, soup] of Object.entries(this.soups)) {
      if (soup.empty()) continue;
      tris += soup.triangles;
      base.add(soup.mesh(this.mats[name]));
    }
    const c = new THREE.Color();
    for (const [name, list] of Object.entries(this.placed)) {
      const part = this.lib[name];
      const im = new THREE.InstancedMesh(part.geometry, this.mats[part.material ?? 'detail'], list.length);
      list.forEach(([m, col], i) => {
        im.setMatrixAt(i, m);
        im.setColorAt(i, c.set(col));
      });
      im.instanceMatrix.needsUpdate = true;
      im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
      im.computeBoundingBox();
      detail.add(im);
      tris += (part.geometry.attributes.position.count / 3) * list.length;
    }
    this.soups = {};
    this.placed = {};
    return { base, detail, tris };
  }
}
