import * as THREE from 'three';
import { World } from '../../engine/world.js';
import { paintMaterial, glowPoints, GroundMaps, G } from '../../engine/paint.js';
import { Builder } from '../../engine/build.js';
import { rng, fbm, smooth, clamp, lerp, damp } from '../../engine/gl.js';
import { addSky } from './sky.js';
import { addGround, addCanalHouses, addMarket, addChurch, addWindmill, addTreesAndTownsfolk, addFarPolder } from './town.js';
import { addCanal, addQuays, addBridges, addTrader, addCanalBoats, addGnats } from './canal.js';
import { addHouse, addShafts, addMotes } from './house.js';
import { addGirl } from './girl.js';
import { addStory } from './story.js';

// Girl with a Pearl Earring. This file is the world itself: its look, the shape
// of the ground, build(), which calls the parts in order, and the turn of her
// head. The parts are the files beside this one:
//
//   sky.js      the Delft sky
//   town.js     the ground, the canal houses, the market, the Nieuwe Kerk, the windmill, trees and townsfolk
//   canal.js    the water, the quays and bridges, the trader and the boats
//   house.js    Vermeer's house: the hall, the studio, the light through its windows
//   girl.js     the girl (the hand-built stand-in and the loaded figure)
//   story.js    Vermeer, the lapis, the colours and the words
//   palette.js  brick and roof colours
//
// The order of the calls in build() is part of the world: every part draws from the
// same seeded rng and most of them add to the same Builder, so moving a call moves things.
export class PearlWorld extends World {
  constructor(ctx) {
    super(ctx);
    this.id = 'pearl';
    this.index = 2;
    this.kicker = 'III · Delft, Dutch Republic, about 1665';
    this.title = 'Girl with a Pearl Earring';
    this.sub = 'Johannes Vermeer';
    this.aspect = 39 / 44.5;
    this.extent = 200;
    this.boundary = 180;
    this.ceiling = 60;
    this.waterY = -1.15;
    const sun = new THREE.Vector3(-0.72, 0.36, 0.3).normalize();
    this.sun = sun;
    this.env = {
      sunDir: sun,
      sunColor: 0xd9a868,
      skyColor: 0x8f96a8,
      groundColor: 0x5c4e42,
      fogColor: 0xe9cfa6,
      fog: [0.0042, 0, 0.02, 0.8],
      paper: 0xf1e8d4,
      ink: 0x45403a,
      rim: 0xffe9a0,
      lamp: 1.2,
      sway: 0.18,
    };
    this.style = { kuwahara: 2.1, bloom: 0.42, threshold: 1.02, soft: 0.1, grain: 0.07, crackle: 0.07, saturation: 1.08, contrast: 1.08, vignette: 0.75, tint: [1.03, 1.0, 0.93], outline: 0.1, ink: 0x2a2018 };
    this.spawn = { pos: [34, -25.9], yaw: Math.PI };
    this.view = { pos: [34.3, 1.4, -31.9], target: [33.98, 1.33, -33.4], fov: 27 };
    this.music = 'pearl';
    this.turn = 1;
    this.pullBack = 3.2;
    this.pullUp = 0.5;
    this.build();
  }

  baseH(x, z) {
    const canal = smooth(6.2, 7.2, Math.abs(z)) * (1 - smooth(140, 150, Math.abs(x)) * 0);
    const town = 1 - smooth(110, 150, Math.hypot(x, z * 1.1));
    return canal * 0 - (1 - canal) * 2.6 + (1 - town) * (fbm(x * 0.01, z * 0.01, 2) - 0.5) * 2 * canal;
  }
  heightAt(x, z) {
    // two humpback bridges
    for (const bx of [0, -64]) if (Math.abs(x - bx) < 3.3 && Math.abs(z) < 10.5) return 2.1 * Math.cos((z / 10.5) * Math.PI * 0.5);
    return this.baseH(x, z);
  }

  build() {
    const { strokes, noise3 } = this.ctx;
    const R = rng(1665);
    const S = this.scene;
    const H = (x, z) => this.heightAt(x, z);
    const maps = (this.maps = new GroundMaps(this.extent, H));
    const soft = (o = {}) => paintMaterial({ stroke: strokes.soft, scale: 0.2, contrast: 0.18, hueVar: 0.16, warp: 0.15, impasto: 0.04, rim: 0.08, band: 0.24, big: 0.35, ...o });

    // What the parts share. Every part is a function of (world, kit).
    //   strokes, noise3   the brush textures and the 3D noise, from the game
    //   R                 the seeded rng: one stream for the whole world
    //   S, H, maps        the scene, heightAt, the ground maps (lamp light, contact shade)
    //   soft              the paint of this world: thin glazes, soft edges
    //   MX, MZ            the middle of the market square
    // and, added below:
    //   B                 the town, the ships and Vermeer's house: one builder, one mesh
    //   proxy             what house() needs of the world
    const kit = { strokes, noise3, R, S, H, maps, soft, MX: -45, MZ: 44 };

    addSky(this, kit);
    addGround(this, kit);
    addCanal(this, kit);

    const B = (kit.B = new Builder());
    kit.proxy = { heightAt: H, colliders: this.colliders, maps, glows: this.glows };
    addQuays(this, kit);
    addBridges(this, kit);
    addCanalHouses(this, kit);
    addMarket(this, kit);
    addChurch(this, kit);
    addTrader(this, kit);
    addCanalBoats(this, kit);
    addWindmill(this, kit);
    addHouse(this, kit);
    S.add(B.meshes(soft({ stroke: strokes.soft, scale: 0.3, contrast: 0.2, hueVar: 0.16, emissive: 2.3 })));

    addShafts(this, kit);
    addGirl(this, kit);
    addTreesAndTownsfolk(this, kit);
    addFarPolder(this, kit);

    // motes in the studio light, gnats over the canal
    addMotes(this, kit);
    addGnats(this, kit);
    S.add(glowPoints(this.glows, 0.9));
    maps.finish();

    addStory(this, kit);
  }

  onEnter() {
    if (!this.done) this.turn = 0;
  }
  onFinale() {
    this.turnTarget = 1;
  }

  tick(dt, time) {
    this.sails.rotation.x = time * 0.35;
    if (this.stage === 'finale' || this.done) this.turn = damp(this.turn, 1, 0.55, dt);
    // she looks away until the painting is finished, then over her shoulder at you
    const t = this.turn * this.turn * (3 - 2 * this.turn);
    // the generated figure is one piece: she turns on her heel instead of at the neck
    if (this.girlModel) this.girlModel.rotation.y = lerp(2.5, this.modelYaw ?? 0.15, t);
    this.girl.head.rotation.y = lerp(-0.35, 1.82, t);
    this.girl.head.rotation.x = lerp(0.12, -0.04, t);
    this.girl.head.rotation.z = lerp(0, -0.07, t);
    const lit = clamp(this.restore + this.final);
    for (const s of this.shafts) s.material.uniforms.uAmt.value = (0.03 + 0.09 * this.final) * (0.4 + 0.6 * lit) * G.uRestore.value + 0.03 * this.maxWave();
    for (const f of this.girl.face) f.visible = !this.girlModel && this.restoreAt(33.98, -33.4) > 0.5;
  }
  maxWave() {
    return this.restoreAt(32, -30);
  }
  // CPU twin of the shader's restore test, for the few things that are not paint
  restoreAt(x, z) {
    let r = this.restore;
    for (const w of this.waves) if (w.max > 0 && Math.hypot(x - w.pos.x, z - w.pos.z) < w.r) r = 1;
    return r;
  }
}
