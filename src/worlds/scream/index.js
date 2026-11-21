import * as THREE from 'three';
import { World } from '../../engine/world.js';
import { paintMaterial, glowPoints, GroundMaps, G } from '../../engine/paint.js';
import { Builder } from '../../engine/build.js';
import { rng, fbm, smooth, lerp } from '../../engine/gl.js';
import { addSky } from './sky.js';
import { addLand, addTrees, addFarShore, addLeaves } from './land.js';
import { addRoad } from './road.js';
import { addFjord, addTown, addPeople } from './fjord-and-town.js';
import { addMunch } from './munch/index.js';
import { addStory } from './story.js';
import { addKristiania, townWeight, TOWN } from './kristiania/town.js';
import { KristianiaKit, kristianiaMaterials } from './kristiania/kit.js';
import { layYards, cutYards } from './country/plan.js';
import { addCountry } from './country/index.js';

// The Scream. This file is the world itself: its look, the line of the road, the
// shape of the ground, and build(), which calls the parts in order. The parts are
// the files beside this one:
//
//   sky.js             the sky of rolling ribbons, and his great Sun
//   land.js            the hillside, where its trees stand, the far shore, leaves on the wind
//   road.js            the road and its railing
//   fjord-and-town.js  the fjord, and the two friends on the road
//   kristiania/        the town: the Kristiania kit (board houses, warehouses, the church,
//                      ships, people) and the town laid out with it
//   country/           the hill farms on their terraces, the boathouses, the forest and
//                      everything that grows; horses, cattle and sheep; who is on the road
//   munch/             his other pictures, one file each (munch/index.js lists them)
//   figure.js          the figure on the road (buildScreamer)
//   story.js           where he stopped, the diary page, the colours and the words
//
// The order of the calls in build() is part of the world: every part draws from the
// same seeded rng and several add to the same Builder, so moving a call moves things.
export class ScreamWorld extends World {
  constructor(ctx) {
    super(ctx);
    this.id = 'scream';
    this.index = 3;
    this.kicker = 'IV · Kristiania, Norway, 1893';
    this.title = 'The Scream';
    this.sub = 'Edvard Munch';
    this.aspect = 73.5 / 91;
    this.extent = 260;
    this.boundary = 250;
    this.center = { x: -40, z: -40 };
    this.ceiling = 110;
    this.waterY = 0;
    this.env = {
      sunDir: new THREE.Vector3(-0.72, 0.3, -0.5),
      sunColor: 0xa8663a,
      skyColor: 0x70749a,
      groundColor: 0x2a2c4c,
      fogColor: 0x3a3f72,
      fog: [0.0018, 0, 0.01, 0.62],
      paper: 0xeee4cf,
      ink: 0x3a3440,
      rim: 0xffb060,
      lamp: 1.3,
      wobble: 0.26,
      sway: 0.4,
    };
    this.style = { kuwahara: 2.3, bloom: 0.32, threshold: 1.08, grain: 0.09, saturation: 1.16, contrast: 1.1, vignette: 0.8, warp: 1.0, outline: 0.34, ink: 0x161430 };
    this.spawn = { pos: [36, 10.5], yaw: -1.84 };
    this.view = { pos: [2.6, 1.72, 3.1], target: [-4.4, 1.25, -5.2], fov: 62 };
    this.music = 'scream';
    layYards(
      (x, z) => this._hill(x, z),
      (x, z) => smooth(3.6, 7, Math.abs(this._roadZ(x) - z))
    );
    this.build();
  }

  // the road follows this line; everything else is laid out from it
  roadPts() {
    return [[150, 44], [100, 30], [50, 14], [0, 0], [-48, -22], [-96, -44], [-138, -62], [-170, -70]];
  }
  roadY(x) {
    return lerp(6, 34, smooth(-150, -20, x)) + smooth(40, 150, x) * 8;
  }
  heightAt(x, z) {
    // the town stands on level ground by the water (kristiania/town.js says where), and
    // the farms on terraces cut into the hill (country/plan.js)
    const h = cutYards(x, z, lerp(this._hill(x, z), TOWN.y, townWeight(x, z)));
    return Math.max(h, this._island(x, z));
  }
  // the ground as it was when the town was a ring of boxes: only the old town's dice still ask for it
  _oldHeight(x, z) {
    return Math.max(lerp(this._hill(x, z), 3.2, 1 - smooth(34, 62, Math.hypot(x + 172, z + 74))), this._island(x, z));
  }
  // one island out in the fjord
  _island(x, z) {
    return 9 * Math.exp(-((x + 40) ** 2 + (z + 190) ** 2) / (2 * 30 * 30)) - 2.5;
  }
  // the hillside, before anything is levelled on it
  _hill(x, z) {
    // distance north of the road line decides how far down the hill we are
    const zr = this._roadZ(x);
    const dn = zr - z; // + = towards the fjord
    const ry = this.roadY(x);
    let h;
    if (dn > 0) h = ry - smooth(3.5, 60, dn) * (ry + 5) - smooth(60, 120, dn) * 3;
    else h = ry + smooth(4, 90, -dn) * 34;
    h += (fbm(x * 0.02, z * 0.02, 3) - 0.5) * 7 * smooth(5, 26, Math.abs(dn));
    return h;
  }
  _roadZ(x) {
    const p = this.roadPts();
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i],
        b = p[i + 1];
      if (x <= a[0] && x >= b[0]) return lerp(a[1], b[1], (a[0] - x) / (a[0] - b[0]));
    }
    return x > 150 ? 44 + (x - 150) * 0.3 : -70;
  }

  build() {
    const { strokes, noise3 } = this.ctx;
    const R = rng(1893);
    const S = this.scene;
    const H = (x, z) => this.heightAt(x, z);
    const maps = (this.maps = new GroundMaps(this.extent, H));
    const wavy = (o = {}) => paintMaterial({ stroke: strokes.wavy, scale: 0.1, contrast: 0.6, hueVar: 0.55, warp: 0.9, impasto: 0.1, rim: 0.12, band: 0.3, accent: 0xe07a3a, accentAmt: 0.18, big: 0.9, ...o });

    // What the parts share. Every part is a function of (world, kit).
    //   strokes, noise3   the brush textures and the 3D noise, from the game
    //   R                 the seeded rng: one stream for the whole world
    //   S, H, maps        the scene, heightAt, the ground maps (lamp light, contact shade)
    //   wavy              the paint of this world: long swaying strokes
    //   TX, TZ            the middle of the old town by the water
    // and, added as the world goes up:
    //   B                 the railing, the town and the harbour: one builder, one mesh
    //   cs                points spaced along the road
    //   krMats, ck        the Kristiania kit's materials, and one kit for everything built
    //                     with it outside the town (farms, his house, the people of his pictures)
    //   hearths           chimneys that smoke, as [x, y, z]
    //   oldTrees          where the hill's trees stand (land.js)
    //   MB, R2, burn, shoreZ, person     what Munch's other pictures share (munch/index.js)
    const kit = { strokes, noise3, R, S, H, maps, wavy, TX: -172, TZ: -74, hearths: [] };
    kit.krMats = kristianiaMaterials(strokes);
    kit.ck = new KristianiaKit(kit.krMats);

    addSky(this, kit);
    addLand(this, kit);
    addFjord(this, kit);

    const B = (kit.B = new Builder());
    kit.cs = addRoad(this, kit);
    // The ring of box houses this town used to be still throws its dice, into a builder and a
    // world that are thrown away, so that everything random built after it stays where it was.
    addTown({ colliders: [], glows: [], platforms: [], heightAt: (x, z) => this._oldHeight(x, z), _roadZ: (x) => this._roadZ(x) }, { ...kit, B: new Builder(), H: (x, z) => this._oldHeight(x, z), maps: { lamp() {}, blob() {} } });
    this.town = addKristiania(this, kit);
    this.town.tick(0, 12, { x: 2.6, y: 1.7, z: 3.1 });
    S.add(B.meshes(wavy({ stroke: strokes.oil, scale: 0.3, warp: 0.15, contrast: 0.45, hueVar: 0.4, emissive: 2.0, big: 0.5, wallStretch: 0.6 })));

    addTrees(this, kit);
    addPeople(this, kit);
    addFarShore(this, kit);
    addMunch(this, kit);
    this.country = addCountry(this, kit);
    this.country.tick(0, 12, { x: 2.6, y: 1.7, z: 3.1 });

    // leaves on the wind, lights of the town
    addLeaves(this, kit);
    S.add(glowPoints(this.glows, 1.0));
    maps.finish();

    addStory(this, kit);
  }

  tick(dt, time, player, game) {
    // the world sways while the feeling is trapped, and settles once it is painted
    const calm = Math.max(this.final, this.calm ?? 0); // (the breathing game steadies it too: task.js)
    if (game) {
      this.town?.tick(dt, time, game.camera.position);
      this.country?.tick(dt, time, game.camera.position);
    }
    // the couples of The Dance of Life turn, each at its own pace
    for (const d of this.dancers ?? []) d.mesh.rotation.y = d.ph + time * d.w;
    this.pillar.material.uniforms.uAmt.value = 0.55 * this.skyRestore;
    this.sky.uniforms.uCalm.value = calm;
    if (game && game.world === this) {
      G.uWobble.value = lerp(0.26, 0.03, calm) * (0.7 + 0.3 * Math.sin(time * 0.5));
      game.pipeline.mFinal.uniforms.uWarpAmt.value = lerp(1.0, 0.1, calm) * (0.6 + 0.4 * Math.sin(time * 0.37));
    }
  }
}
