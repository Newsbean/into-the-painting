import * as THREE from 'three';
import { World } from '../../engine/world.js';
import { paintMaterial, glowPoints, GroundMaps } from '../../engine/paint.js';
import { Builder } from '../../engine/build.js';
import { rng, fbm, smooth, lerp } from '../../engine/gl.js';
import { MIDBLUE } from './palette.js';
import { addSky } from './sky.js';
import { addSea, addGreatTorii, addIslets, addTrader, addFishingBoats, addPlovers, addBoats } from './sea.js';
import { addWaves } from './great-wave.js';
import { addFuji, addMist, addFarCoast, addCoastLights } from './distance.js';
import { addShore, addShorePines } from './shore.js';
import { addFishingVillage, addPagoda, addCooper, addKites, addCherryTrees } from './village.js';
import { buildPrints, blowPapers } from './prints/index.js';
import { addStory } from './story.js';
import { EdoKit, edoMaterials } from './edo/kit.js';
import { addEdoTown, edoWeight, edoLevel, CASTLE } from './edo/town.js';
import { addLife } from './life/index.js';

// The Great Wave. This file is the world itself: its look, where you stand, the
// lie of the land, and the order its parts are built in. The parts are in the
// files beside it, each named for what it holds:
//
//   sky.js          the sky
//   sea.js          the sea and what is out on it: torii, islets, boats, plovers
//   great-wave.js   every breaking wave, the great one first (wave-material.js paints them)
//   distance.js     Fuji, the bands of mist, the far coast and its lights
//   shore.js        the land, Hokusai's workshop, the pier, the shore pines
//   village.js      the fishing village, pagoda, cooper, kites, cherry trees
//   prints/         the land behind: Hokusai's other prints, one to a file
//   story.js        the wisps, the memento, Hokusai, what the curator says
//   edo/            the Edo kit (merchant houses, storehouses, farmhouses, pagoda, castle)
//                   and the town of Edo at the west end of the coast road
//   life/           what makes it lived in: grass and flowers, the hill forest, people
//                   walking the roads, a daimyo's procession, birds, sails, petals, smoke
//
//   palette.js, ground-plan.js, helpers.js, figures.js, plants.js
//                   the colours, the routes and kept ground, and the small
//                   pieces (timbers, people, trees) the parts are made from

// the lie of the land before the castle's mound is raised on it
function baseHeight(x, z) {
  const edge = z + (fbm(x * 0.018, 3.3, 2) - 0.5) * 34;
  const shore = smooth(170, 200, edge);
  let h = -7 + shore * 8.4 + smooth(205, 330, edge) * 34 * (0.4 + fbm(x * 0.008 + 5, z * 0.008, 3));
  // Edo stands on level ground at the west end of the coast road
  const ew = edoWeight(x, z);
  if (ew > 0) h = lerp(h, edoLevel(x, z), ew);
  return h;
}
let castleY;

export class WaveWorld extends World {
  constructor(ctx) {
    super(ctx);
    this.id = 'wave';
    this.index = 1;
    this.kicker = 'II · Edo, Japan, about 1831';
    this.title = 'The Great Wave';
    this.sub = 'Katsushika Hokusai';
    this.aspect = 37.9 / 25.7;
    this.extent = 470;
    this.boundary = 400;
    this.center = { x: -60, z: 90 };
    this.ceiling = 105;
    this.waterY = 0;
    this.env = {
      sunDir: new THREE.Vector3(0.45, 0.7, 0.5),
      sunColor: 0x4a4a48,
      skyColor: 0xc9c6bc,
      groundColor: 0x9a968c,
      fogColor: 0x7a858c,
      fog: [0.001, 0, 0.0, 0.5],
      paper: 0xf0e7d0,
      ink: 0x35405a,
      rim: 0x6fb0e0,
      lamp: 0.9,
      sway: 0.15,
    };
    this.style = { kuwahara: 0.6, outline: 0.92, sketchLine: 0.1, ink: 0x14244a, bloom: 0.25, threshold: 1.1, grain: 0.03, paper: 0.13, saturation: 1.02, contrast: 1.04, vignette: 0.32, tint: [1.0, 0.985, 0.95] };
    this.spawn = { pos: [10, 196], yaw: Math.PI };
    this.view = { pos: [16, 2.3, 104], target: [9, 25, 4], fov: 52 };
    this.music = 'wave';
    this.build();
  }

  heightAt(x, z) {
    let h = baseHeight(x, z);
    // the castle stands on a levelled mound behind the town
    const cm = 1 - smooth(20, 46, Math.hypot(x - CASTLE.x, z - CASTLE.z));
    if (cm > 0) h = lerp(h, (castleY ??= baseHeight(CASTLE.x, CASTLE.z) + 1.5), cm);
    return h;
  }

  build() {
    const { strokes, noise3 } = this.ctx;
    const R = rng(1831);
    const S = this.scene;
    const H = (x, z) => this.heightAt(x, z);
    const maps = (this.maps = new GroundMaps(this.extent, H, 2048));

    const flat = (o = {}) => paintMaterial({ stroke: strokes.wood, scale: 0.05, contrast: 0.14, hueVar: 0.1, warp: 0.05, flat: 0.72, rim: 0, band: 0.08, impasto: 0, big: 0, ...o });

    // What the parts share. Each part is called as part(this, kit) and takes what it
    // needs from the kit. They all throw the same seeded dice (R), and several bake
    // into the same builders, so the order of the calls below is part of the picture:
    // move one, and everything random that comes after it lands somewhere else.
    const proxy = { heightAt: H, colliders: this.colliders, maps, glows: this.glows };
    // a tree that lands on ground one of the other prints needs is drawn into this
    // spare builder and thrown away, so the dice fall exactly as they always did
    const SPARE = new Builder();
    const X = new Builder(); // more things made of wood, stone and paper
    const T2 = new Builder(); // more things that grow
    const kit = { strokes, noise3, R, S, H, maps, flat, proxy, SPARE, X, T2 };
    // everything built in the Edo manner goes through this kit (edo/); it is baked after the prints
    this.edoKit = new EdoKit(edoMaterials(strokes));

    addSky(this, kit);
    addSea(this, kit);
    addWaves(this, kit);
    addFuji(this, kit);
    addShore(this, kit);
    addShorePines(this, kit);

    // ================= a world worth crossing =================
    addFishingVillage(this, kit);
    addPagoda(this, kit);
    addGreatTorii(this, kit);
    addIslets(this, kit);
    addTrader(this, kit);
    addFishingBoats(this, kit);
    addCooper(this, kit);
    addKites(this, kit);
    addCherryTrees(this, kit);
    // the trees that went to the spare builder leave nothing to bump into
    for (let i = this.colliders.length - 1; i >= 0; i--) if (this.colliders[i].spare) this.colliders.splice(i, 1);
    addMist(this, kit);

    S.add(X.meshes(flat({ scale: 0.25, emissive: 1.5 })));
    S.add(T2.meshes(flat({ scale: 0.2 })));

    addPlovers(this, kit);
    addFarCoast(this, kit);
    addBoats(this, kit);
    addCoastLights(this, kit);
    // the land behind the wave: scenes from the other prints
    buildPrints(this, kit);
    // Edo itself, at the west end of the coast road
    this.edo = addEdoTown(this, kit);
    const eb = this.edoKit.build();
    S.add(eb.base, eb.detail);
    // and everything that lives and moves in it (it has its own dice, so it comes last)
    this.life = addLife(this, kit);
    this.life.tick(0, 12, { x: this.view.pos[0], y: this.view.pos[1], z: this.view.pos[2] });
    S.add(glowPoints(this.glows, 1));
    maps.finish();

    addStory(this, kit);
  }

  // 0 = an ordinary swell on a moving sea, 1 = the wave of the print
  applyRise(r) {
    const sy = lerp(0.17, 1, r);
    this.greatMesh.scale.set(lerp(0.55, 1, r), sy, 1);
    const u = this.greatMesh.material.uniforms;
    u.uPulse.value = 1 - r;
    u.uSurge.value.x = lerp(1.5, 3.4, r);
    // the foam and the clutching of the claws come with the height
    u.uFoamAmt.value = lerp(0.45, 1, r);
    u.uCurl.value = lerp(0.05, 0.16, r);
    this.wavePlat.y = 62 * sy;
    for (const c of this.waveCols) c.top = c.full * sy;
    this.spray.material.uniforms.uBoost.value = r;
  }
  onRestore(v) {
    this.applyRise(this.thumbMode ? 1 : v);
  }

  tick(dt, time, player, game) {
    if (game) {
      this.edo?.tick(game.camera.position);
      this.life?.tick(dt, time, game.camera.position);
    }
    this.applyRise(this.thumbMode ? 1 : smooth(0.05, 1, this.final));
    // the sea stays pale until the final block is printed
    this.seaMat.uniforms.uDeep.value.copy(this.seaPale).lerp(this.seaDeep, this.final);
    this.seaMat.uniforms.uShallow.value.set(0xb9cfd0).lerp(new THREE.Color(MIDBLUE), this.final);
    for (const f of this.flocks) f.m.rotation.y = time * f.sp + f.ph;
    for (const b of this.boats) {
      b.m.position.y = Math.sin(time * 0.8 + b.ph) * 0.45 - 0.1;
      b.m.rotation.z = Math.sin(time * 0.7 + b.ph) * 0.07;
      b.m.rotation.x = Math.cos(time * 0.6 + b.ph) * 0.05;
    }
    // the mill wheel at Onden turns under its flume
    if (this.wheel) this.wheel.rotation.x = -time * 0.55;
    // Ejiri: every sheet of paper (and the two hats) rides the same gust, each tumbling its own way
    if (this.papers) blowPapers(this, time);
  }
}
