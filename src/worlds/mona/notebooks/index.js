import * as THREE from 'three';
import { waterMaterial } from '../../../engine/paint.js';
import { Builder, ribbon } from '../../../engine/build.js';
import { rng } from '../../../engine/gl.js';
import { Quads, flame } from '../helpers.js';
import { dust } from '../palette.js';
import { LEO_WAYS } from './layout.js';
import { buildVitruvianPiazza } from './vitruvian-piazza.js';
import { buildAerialScrew, tickAerialScrew } from './aerial-screw.js';
import { buildArmouredCar } from './armoured-car.js';
import { buildCrossbow } from './crossbow.js';
import { buildParachute, tickParachute } from './parachute.js';
import { buildSforzaHorse } from './sforza-horse.js';
import { buildLastSupper } from './last-supper.js';
import { buildAnnunciation } from './annunciation.js';
import { buildGrotto } from './grotto.js';
import { buildHilltopStudies } from './hilltop-studies.js';
import { buildWaterWorks, tickWaterWorks } from './water-works.js';
import { buildPaddleBoat, tickPaddleBoat } from './paddle-boat.js';

// Leonardo's footprint on the valley: the machines of the codices at full size,
// the settings of his other paintings, and the farmed Tuscany he mapped.
// Each invention or scene is a file of its own beside this one; where they all stand
// is in layout.js.
export function buildNotebooks(world, kit) {
  const { S, H, maps, soft, strokes } = kit;
  const Q = rng(1519);
  const C = world.colliders;
  const PL = world.platforms;
  const LB = new Builder(); // stone, timber, bronze, clay
  const LT = new Builder(); // leaves, hay, flowers
  const LG = new Builder(); // paths and fields laid on the ground
  const LP = new Builder(); // people
  const SQ = new Quads(); // flat-coloured stone and cloth
  const GQ = new Quads(); // field strips
  const WQ = new Quads(); // canal water
  const span = (x, z, hw, hd = hw) => {
    let lo = 1e9,
      hi = -1e9;
    for (let i = -3; i <= 3; i++)
      for (let j = -3; j <= 3; j++) {
        const h = H(x + (i / 3) * hw, z + (j / 3) * hd);
        lo = Math.min(lo, h);
        hi = Math.max(hi, h);
      }
    return { lo, hi };
  };
  const toW = (M, x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M);

  // ---- paths out to each of them, dusty like his roads
  // each a little higher than the last, and all above the roads, so that where they meet nothing is coplanar
  LEO_WAYS.forEach((w, i) => LG.parts.push(ribbon(w, 3, H, dust, { lift: 0.16 + i * 0.012, across: 3 })));

  // ---- plants
  const cyp = (x, z, h = 9, r = 1.2) => {
    const y = H(x, z);
    flame(LT, x, y - 0.3, z, h, r, Q() * 6);
    C.push({ x, z, r: 0.6, top: y + h * 0.6 });
    maps.blob(x, z, 2.6, 0.3);
  };

  // What the scenes share on top of the world's kit: their own seeded rng Q, drawn from
  // in the order below; the builders and loose quads that become one mesh per kind of
  // surface at the end; the world's colliders C and platforms PL; and a few closures.
  const nb = { ...kit, Q, C, PL, LB, LT, LG, LP, SQ, GQ, WQ, span, toW, cyp };
  buildVitruvianPiazza(world, nb);
  buildAerialScrew(world, nb);
  buildArmouredCar(world, nb);
  buildCrossbow(world, nb);
  buildParachute(world, nb);
  buildSforzaHorse(world, nb);
  buildLastSupper(world, nb);
  buildAnnunciation(world, nb);
  buildGrotto(world, nb);
  buildHilltopStudies(world, nb);
  buildWaterWorks(world, nb);
  buildPaddleBoat(world, nb);

  // ---- into the scene: one mesh per kind of surface
  LB.parts.push(SQ.geometry());
  LG.parts.push(GQ.geometry());
  const meshes = [
    LB.mesh(soft({ scale: 0.3, emissive: 1.5, big: 0.25, hueVar: 0.05, contrast: 0.14 })),
    LT.mesh(soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.5, hueVar: 0.4, rim: 0.2 })),
    LG.mesh(soft({ stroke: strokes.dab, scale: 0.3, contrast: 0.36 })),
    LP.mesh(soft({ scale: 0.8, rim: 0.2 })),
  ];
  for (const m of meshes) S.add(m);
  const cw = new THREE.Mesh(WQ.geometry(), waterMaterial({ stroke: strokes.soft, deep: 0x2f4a44, shallow: 0x5f8a7a, reflect: 0xb8c49a, glint: 0xfff0c0, scale: 0.09, glintAmt: 0.6, flow: 0.01 }));
  cw.material.side = THREE.DoubleSide;
  cw.frustumCulled = false;
  S.add(cw);
  // triangle count of everything added here, for checking against the budget
  world.leoTris = [...meshes, cw, world.airscrew, world.chute, world.waterScrew, ...world.boat.children].reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);
}

// the notebooks in motion
export function tickNotebooks(world, time) {
  tickAerialScrew(world, time);
  tickWaterWorks(world, time);
  tickParachute(world, time);
  tickPaddleBoat(world, time);
}
