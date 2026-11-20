import { World } from '../../engine/world.js';
import { paintMaterial, GroundMaps } from '../../engine/paint.js';
import { Builder } from '../../engine/build.js';
import { rng } from '../../engine/gl.js';
import { dirOf, sky } from './sky.js';
import { heightAt, ways, ground, alpilles } from './terrain.js';
import { village } from './village.js';
import { trees, irises, wheat } from './nature.js';
import { villagers } from './people.js';
import { glow } from './glow.js';
import { easel, story } from './story.js';
import { vincent, flyCrows } from './vincent/index.js';

// The Starry Night, built from the parts beside this file. Every part is a function
// part(world, kit), and build() calls them in the one order that gives this world: they
// roll the same seeded dice and fill the same builders, so a part that moves, or rolls
// once more or once less, moves everything built after it.
//
//   sky.js       the sky shader, its stars and vortices
//   terrain.js   height of the land, canal and river, roads and footpaths, fields, the Alpilles
//   village.js   houses, church, asylum, street lamps, the fountain
//   nature.js    trees, irises, the wheat field
//   people.js    person(), the villagers
//   glow.js      fireflies, far villages, and every lamp drawn as a point of light
//   story.js     the easel; wisps, memento, echo, lines, facts
//   vincent/     his other canvases, one file per set piece
//   helpers.js   building blocks the parts share
//   palette.js   colour tables

export class StarryWorld extends World {
  constructor(ctx) {
    super(ctx);
    this.id = 'starry';
    this.index = 0;
    this.kicker = 'I · Saint-Rémy-de-Provence, June 1889';
    this.title = 'The Starry Night';
    this.sub = 'Vincent van Gogh';
    this.aspect = 92 / 73;
    this.extent = 220;
    this.boundary = 205;
    this.ceiling = 95;
    this.env = {
      sunDir: dirOf(25, 34),
      sunColor: 0x66739e,
      skyColor: 0x7482bd,
      groundColor: 0x3d4272,
      fogColor: 0x2c4f9a,
      fog: [0.0021, 4, 0.03, 0.8],
      paper: 0xeee7d3,
      ink: 0x3d3f4f,
      rim: 0xffe27a,
      lamp: 1.1,
      sway: 0.3,
    };
    this.style = { kuwahara: 1.5, bloom: 0.55, threshold: 1.0, outline: 0.22, ink: 0x1a1d33, grain: 0.085, saturation: 1.16, contrast: 1.07, vignette: 0.6 };
    this.spawn = { pos: [-5, 90], yaw: Math.PI };
    this.view = { pos: [-6, 20, 121], target: [-6, 37.6, 21], fov: 50 };
    this.music = 'starry';
    this.build();
  }

  heightAt(x, z) {
    return heightAt(x, z);
  }

  build() {
    const { strokes, noise3 } = this.ctx;
    const R = rng(1889);
    const S = this.scene;
    const maps = (this.maps = new GroundMaps(this.extent, (x, z) => this.heightAt(x, z)));
    const H = (x, z) => this.heightAt(x, z);
    const B = new Builder(); // walls + props
    const P = new Builder();
    const placed = [];
    const free = (x, z, r) => !placed.some((p) => (x - p[0]) ** 2 + (z - p[1]) ** 2 < (r + p[2]) ** 2);
    // free of houses and of the trees that were actually planted
    const open = (x, z, r) => !placed.some((p) => !p[3] && (x - p[0]) ** 2 + (z - p[1]) ** 2 < (r + p[2]) ** 2);
    // what the parts share
    const kit = {
      S, // the scene
      H, // height of the ground at (x, z)
      R, // the seeded dice of the village, the trees and the small things (vincent/ rolls its own)
      maps, // lamp light and contact shade painted on the ground
      strokes, // brush textures for the paint materials
      noise3, // noise for the sky
      B, // walls + props: one mesh, added to the scene at the end of build()
      P, // small things, likewise
      placed, // [x, z, radius, gone] of every house and scattered tree, so that nothing lands on another
      free, // (x, z, r): nothing placed within r
      open, // (x, z, r): the same, but a tree that was rolled and not planted does not count
      AX: 80, // the asylum of Saint-Paul
      AZ: 46,
      ...ways(), // nearRoad, nearTrack, inKeep, cleared: (x, z, pad); VOID: a builder that is thrown away
    };

    // ---------------- sky
    sky(this, kit);
    // ---------------- ground: a patchwork of night fields
    ground(this, kit);
    // ---------------- the village
    village(this, kit);
    // ---------------- trees
    trees(this, kit);
    // ---------------- small things: irises, wheat stooks, people
    irises(this, kit);
    wheat(this, kit);
    villagers(this, kit);
    easel(this, kit);
    // everything else he painted
    vincent(this, kit);
    S.add(P.mesh(paintMaterial({ stroke: strokes.dab, scale: 0.6, contrast: 0.35, hueVar: 0.5, warp: 0.1, rim: 0.3, band: 0.25 })));

    S.add(B.mesh(paintMaterial({ stroke: strokes.dab, scale: 0.26, contrast: 0.42, hueVar: 0.6, warp: 0.12, accent: 0xb0c4ff, accentAmt: 0.16, impasto: 0.1, rim: 0.2, band: 0.2, emissive: 1.85, big: 0.5 })));

    // ---------------- the Alpilles
    alpilles(this, kit);
    // ---------------- glow: lamps, fireflies, far villages
    glow(this, kit);
    // ---------------- story
    story(this, kit);
  }

  tick(dt, time) {
    flyCrows(this, time);
  }
}
