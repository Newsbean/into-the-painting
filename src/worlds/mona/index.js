import * as THREE from 'three';
import { World } from '../../engine/world.js';
import { paintMaterial, glowPoints, GroundMaps } from '../../engine/paint.js';
import { Builder } from '../../engine/build.js';
import { rng, fbm, smooth, clamp, lerp } from '../../engine/gl.js';
import { buildSky } from './sky.js';
import { buildLand, buildRoads, buildFarRocks } from './terrain.js';
import { buildWorkshop } from './workshop.js';
import { buildBridge, buildMill, tickMill } from './bridge-and-mill.js';
import { buildHillTown } from './hill-town.js';
import { buildFlyingMachine, buildFlyers, tickFlyers } from './flying-machines.js';
import { buildVegetation } from './vegetation.js';
import { buildNotebooks, tickNotebooks } from './notebooks/index.js';
import { seatLisa, tickLisa } from './lisa.js';
import { buildTravellers } from './travellers.js';
import { buildStory } from './story.js';

// Leonardo's dream of Tuscany: every edge dissolved in haze. No lines, only
// smoke: sfumato.
//
// The world is built in parts: each is a function (world, kit) in a file beside this
// one, named after what it holds. This file keeps the look, the lie of the land
// (heightAt) and the order the parts run in.

// height of the terrace the workshop stands on: the hilltop exactly where she sits
const TERRACE = 3 + (fbm(2, 9, 3) - 0.5) * 9 + 26;

export class MonaWorld extends World {
  constructor(ctx) {
    super(ctx);
    this.id = 'mona';
    this.index = 4;
    this.kicker = 'V · Florence, about 1503';
    this.title = 'Mona Lisa';
    this.sub = 'Leonardo da Vinci';
    this.aspect = 53 / 77;
    this.extent = 280;
    this.boundary = 270;
    this.center = { x: 0, z: -80 };
    this.ceiling = 120;
    this.waterY = 0.6;
    this.env = {
      sunDir: new THREE.Vector3(-0.5, 0.55, 0.6),
      sunColor: 0xa89a66,
      skyColor: 0x8a9a86,
      groundColor: 0x4a4a34,
      fogColor: 0xa8b08a,
      fog: [0.0052, 2, 0.012, 0.9],
      paper: 0xeee6cf,
      ink: 0x40382c,
      rim: 0xffe9a0,
      lamp: 1.0,
      sway: 0.16,
    };
    this.style = { kuwahara: 2.4, bloom: 0.45, threshold: 1.0, soft: 0.24, grain: 0.07, crackle: 0.12, saturation: 0.94, contrast: 1.07, vignette: 0.95, tint: [1.03, 1.0, 0.86], lift: [0.01, 0.012, 0.0], outline: 0.0, sketchLine: 0.45, ink: 0x2a2218 };
    this.spawn = { pos: [0, 31], yaw: Math.PI };
    this.view = { pos: [0.1, 27.3, -0.5], target: [-0.02, 27.14, -3.3], fov: 34 };
    this._viewRel = { pos: [0.08, 1.07, 1.95], target: [0, 1.02, 0], fov: 27 };
    this.music = 'mona';
    this.smile = 1;
    this.pullBack = 4.5;
    this.pullUp = 0.6;
    // the generated figure faces +X; turn her to the room, a little to her right as in the portrait
    this.modelYaw = -Math.PI / 2 - 0.25;
    this.build();
  }

  riverPath() {
    return [[20, -330], [44, -230], [62, -120], [104, -34], [190, 30], [300, 60]];
  }
  heightAt(x, z) {
    const r0 = Math.hypot(x, z);
    let h = 3 + (fbm(x * 0.012 + 2, z * 0.012 + 9, 3) - 0.5) * 9;
    h += 26 * (1 - smooth(36, 84, r0)); // the hill the workshop stands on
    // the workshop and its loggia stand on a levelled terrace, so the tiled floor is the floor
    const pad = Math.max(Math.abs(x) - 12.5, Math.abs(z - 7.2) - 19, 0);
    if (pad < 12) h = lerp(TERRACE, h, smooth(0, 12, pad));
    h = Math.max(h, 3 + 21 * (1 - smooth(24, 58, Math.hypot(x + 130, z + 150)))); // the hill town
    const cr = Math.hypot(x - 122, z + 44);
    h = Math.max(h, 62 * (1 - smooth(9, 40, cr)) + 3); // the launching crag
    // river and the lake it runs from
    const p = this.riverPath();
    let dmin = 1e9;
    for (let i = 0; i < p.length - 1; i++) {
      const ax = p[i][0],
        az = p[i][1],
        bx = p[i + 1][0],
        bz = p[i + 1][1];
      const t = clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2));
      dmin = Math.min(dmin, Math.hypot(x - ax - t * (bx - ax), z - az - t * (bz - az)));
    }
    const lake = Math.hypot((x + 70) / 1.5, z + 250);
    const wet = Math.min(smooth(7, 22, dmin), smooth(48, 70, lake));
    h = lerp(-2.6, h, wet);
    h += smooth(240, 420, r0) * 40;
    return h;
  }

  build() {
    const { strokes, noise3 } = this.ctx;
    const R = rng(1503);
    const S = this.scene;
    const H = (x, z) => this.heightAt(x, z);
    const maps = (this.maps = new GroundMaps(this.extent, H));
    const soft = (o = {}) => paintMaterial({ stroke: strokes.soft, scale: 0.14, contrast: 0.17, hueVar: 0.14, warp: 0.4, impasto: 0.03, rim: 0.06, band: 0.34, big: 0.35, ...o });
    const B = new Builder();
    const proxy = { heightAt: H, colliders: this.colliders, maps, glows: this.glows };
    // floor of the loggia
    const LY = H(0, 0);
    // the hill town (heightAt raises its hill round the same point)
    const TX = -130,
      TZ = -150;
    // top of the launching crag (which heightAt raises at the same point)
    const CX = 122,
      CZ = -44,
      CY = H(CX, CZ);
    // What the parts share. R is the seeded rng, S the scene, H the height of the land;
    // maps holds the lamp light and shade on the ground; soft() is the hazy paint
    // everything here wears; B is the one builder the hilltop, the bridge, the town and
    // the mill all go into; proxy is what the engine's house() asks of a world; the rest
    // is where the landmarks stand. buildRoads adds roadSamples and nearRoad.
    const kit = { strokes, noise3, R, S, H, maps, soft, B, proxy, LY, TX, TZ, CX, CZ, CY };

    // The order below is the order the world is made in. Every part draws from R and adds
    // to the shared builders, colliders and maps in turn, so moving one changes all that follow.
    buildSky(this, kit);
    buildLand(this, kit);
    Object.assign(kit, buildRoads(this, kit));
    buildWorkshop(this, kit);
    buildBridge(this, kit);
    buildHillTown(this, kit);
    buildMill(this, kit);
    buildFlyingMachine(this, kit);
    // all the stone and timber so far, as one mesh
    S.add(B.meshes(soft({ scale: 0.3, emissive: 1.5, big: 0.25, hueVar: 0.05, contrast: 0.14 })));

    buildFlyers(this, kit);
    // ---------------- cypress avenues, olives, vineyards, the far rocks
    buildVegetation(this, kit);
    buildFarRocks(this, kit);

    // ---------------- his notebooks and his other paintings, out in the valley
    this.buildNotebooks(kit);

    seatLisa(this, kit);
    buildTravellers(this, kit);
    // every glow the parts have left in the air, as one set of points; then the ground maps are complete
    S.add(glowPoints(this.glows, 0.55));
    maps.finish();

    buildStory(this, kit);
  }

  // the notebooks are built and set in motion in ./notebooks; these keep their names on the world
  buildNotebooks(kit) {
    buildNotebooks(this, kit);
  }
  tickNotebooks(time) {
    tickNotebooks(this, time);
  }

  onEnter() {
    if (!this.done) this.smile = 0;
  }

  // whatever moves is moved by the part that built it, in the order it always was
  tick(dt, time) {
    tickMill(this, time);
    this.tickNotebooks(time);
    tickFlyers(this, time);
    tickLisa(this, dt);
  }
}
