// The puzzle of The Starry Night: find the picture in the land, then light it.
//
// 1. Find.   Three pages of his letters to Theo have blown away: one under his window, one
//            at the foot of the great cypress, one before the church door. They are his own
//            words (in plain English), and the last of them says what he did: he arranged it.
// 2. Stand.  Nothing in the land stands where it stands in the picture, except from one
//            place. Three rings hang in the view, where the painting has its cypress, its
//            steeple and its moon: turn, and walk, until each thing sits in its own ring.
//            (The moon and the steeple are far off and only turning moves them; the cypress
//            is near, and slides across the sky as you walk.)
// 3. Fly.    Light the eleven lights of its sky in one flight, before the night runs out.
//
// The flight starts in the air above the asylum garden and winds inwards over the village
// along the great swirl of the picture, each ring a little smaller than the last. The
// night only starts to run when the first ring is flown through. Each light lit gives
// just enough time to reach the next: less than a steady flight takes, so it wants speed
// (Shift), a turn begun early, and a dive where the course drops. Run out, and the sky
// goes dark again; each time that happens the night is a little longer. The last light
// is the morning star, low beside the cypress, exactly where the painting has it.
import * as THREE from 'three';
import { beam } from '../../engine/world.js';
import { glowSprite } from '../../engine/paint.js';
import { dirOf } from './sky.js';

const N = 11,
  EASE = 0.8, // the share of a steady flyer's time that is given for each stretch...
  MERCY = 0.06, // ...and how much more after every night that runs out
  SPARE = 1.2; // the most that can be carried over from one stretch to the next
const GOLD = 0xffd98a;
const TOL = 0.095, // how far out of its ring a thing may stand (five or six degrees)
  STILL = 1.3; // seconds the three must be held in place
const MOON = dirOf(25, 29); // (as sky.js has it)
const STAND = [-3, 131], // a place on the ground where the picture comes together: the low field south of the cypress
  DOWN = 20; // the ring sits on the body of the cypress, this far under its tip

// his own words, from the letters to Theo (Saint-Rémy, 1889)
const PAGES = [
  { where: 'under his window, in the asylum garden', label: 'A page · to Theo, June 1889', text: '“This morning I saw the country from my window, long before sunrise, with nothing but the morning star, which looked very big.”', at: [[92, 38], [90, 46], [70, 30]] },
  { where: 'at the foot of the great cypress', label: 'A page · to Theo, 25 June 1889', text: '“The cypresses are always on my mind. In line and in proportion a cypress is as fine as an Egyptian obelisk.”', at: [[-19, 78], [-29, 78], [-17, 67]] },
  { where: 'before the church door, in the village', label: 'A page · to Theo, September 1889', text: '“The night study, too, is an exaggeration in its arrangement: its lines twist like the lines of old woodcuts.”', at: [[10, -36], [4, -33], [16, -33], [10, -29]] },
];
const RINGS = ['the cypress', 'the steeple', 'the moon'];

const _v = new THREE.Vector3();
// where a point stands in the frame of a camera: (x, y) over depth (null when behind it)
const inFrame = (cam, p) => {
  _v.copy(p).applyMatrix4(cam.matrixWorldInverse);
  return _v.z < -0.01 ? [_v.x / -_v.z, _v.y / -_v.z] : null;
};

export function addTask(world) {
  const H = (x, z) => world.heightAt(x, z);
  // ---- 1. the pages
  const pages = PAGES.map((pg, i) => {
    const [x, z] = pg.at.find(([px, pz]) => !world.blocked(px, H(px, pz) + 1, pz)) ?? pg.at[0];
    const g = new THREE.Group(),
      leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.0), new THREE.MeshBasicMaterial({ color: 0xf6efdc, side: THREE.DoubleSide }));
    leaf.rotation.x = -0.35;
    g.add(leaf, glowSprite(0xfff3c8, 3.2, 0.7), beam(0xfff0c8, 46, 0.9));
    g.position.set(x, world.groundAt(x, z, H(x, z) + 3) + 1.5, z);
    g.visible = false;
    world.scene.add(g);
    return { g, i, got: false };
  });

  // ---- 2. the picture. The painting's own view hangs twenty metres up in the air, where
  // nobody can stand; this is the same arrangement from the ground under it, as the camera
  // that follows her sees it when she stands at STAND and looks north and a little up.
  const cyp = new THREE.Vector3(world.cypressTop[0], world.cypressTop[1] - DOWN, world.cypressTop[2]),
    spire = new THREE.Vector3(...world.spire),
    moon = new THREE.Vector3();
  const things = [cyp, spire, moon];
  const [sx, sz] = STAND,
    back = 7.04; // how far behind her the camera sits
  const stand = new THREE.PerspectiveCamera();
  stand.position.set(sx, world.groundAt(sx, sz + back, 99) + 0.5, sz + back);
  stand.lookAt(sx, H(sx, sz) + 1.8, sz);
  stand.updateMatrixWorld();
  moon.copy(stand.position).addScaledVector(MOON, 5000);
  const ref = things.map((p) => inFrame(stand, p));
  const spot = new THREE.Vector3(sx, H(sx, sz) + 1.5, sz);

  // ---- 3. the lights
  // where Venus hangs in the picture: low, just to the right of the cypress as he saw it
  const eye = world.view.pos,
    top = world.cypressTop,
    dx = top[0] - eye[0],
    dz = top[2] - eye[2],
    far = Math.hypot(dx, dz);
  const venus = new THREE.Vector3(top[0] + (dx / far) * 46 - (dz / far) * 10, eye[1] + (far + 46) * 0.25, top[2] + (dz / far) * 46 + (dx / far) * 10);
  const at = [];
  for (let k = 0; k < N - 1; k++) {
    const a = 0.626 - k * 0.7,
      r = 95 - k * 6.5;
    at.push(new THREE.Vector3(5 + Math.cos(a) * r, 38 + 28 * Math.sin((Math.PI * k) / 9), -10 + Math.sin(a) * r));
  }
  at.push(venus);

  const lights = at.map((p, k) => {
    const R = 7.6 - k * 0.24;
    const g = new THREE.Group();
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(R, 0.42, 6, 30), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
    const star = glowSprite(0xfff3c8, 3, 0.35);
    g.add(hoop, star);
    g.position.copy(p);
    g.lookAt(k ? at[k - 1] : new THREE.Vector3(77.4, p.y - 6, 42.4)); // each ring faces the way you come at it
    const shaft = beam(GOLD, 60, 1.6);
    shaft.rotation.x = Math.PI; // a light hanging down from it, to find it by
    shaft.position.copy(p);
    g.visible = shaft.visible = false;
    world.scene.add(g, shaft);
    return { g, hoop, star, shaft, R };
  });
  const show = (k, state) => {
    const l = lights[k];
    l.g.visible = true;
    l.shaft.visible = state === 'next';
    l.hoop.visible = state !== 'lit';
    l.hoop.material.opacity = state === 'next' ? 0.9 : 0.24;
    l.star.scale.setScalar(state === 'lit' ? (k === N - 1 ? 13 : 9) : state === 'next' ? 5 : 2.5);
    l.star.material.opacity = state === 'lit' ? 1 : state === 'next' ? 0.7 : 0.3;
  };
  const dark = () => {
    for (let k = 0; k < N; k++) show(k, k ? 'wait' : 'next');
  };
  const head = new THREE.Vector3();
  // the seconds a steady flyer takes to reach light k from the one before it
  const steady = (k) => (at[k].distanceTo(at[k - 1]) - 10) / 14;

  const task = {
    done: false,
    stage: 'find', // find -> stand -> fly
    placed: 0, // how many of the three stand in their rings
    still: 0,
    help: false,
    lit: 0,
    left: 0,
    tries: 0,
    lights,
    ref,
    ask: ["Theo's letter. And the tubes, good, good.", 'But I cannot find my sky again. I wrote to Theo how it was, and the wind has taken the pages: three of them.', 'Bring me my own words. Then find me the place where the picture comes together.'],
    text: () =>
      task.stage === 'find'
        ? `Find the three pages of his letters · ${pages.filter((p) => p.got).length} of 3`
        : task.stage === 'stand'
        ? `Stand where the picture comes together · ${task.placed} of 3 in place`
        : task.lit
        ? `Light the next star before the night runs out · ${task.lit} of ${N}`
        : 'Fly through the first light, above the garden',
    hint: () => {
      if (task.stage === 'find') return `One page lies ${PAGES[pages.find((p) => !p.got).i].where}.`;
      if (task.stage === 'stand') {
        task.help = true; // from now on a light shows a place that will do
        return 'The moon and the steeple are far off: turn until they sit in their rings. The cypress is near: walk, and it slides across the sky. Try the low field south of its hill.';
      }
      return task.tries ? 'Hold Shift all the way, start each turn before the ring, and where the course drops, look down to dive.' : 'The first ring hangs in the air above the asylum garden. The night only starts to run when you fly through it.';
    },
    start() {
      for (const p of pages) p.g.visible = true;
    },
    update(dt, game, mark) {
      if (task.stage === 'find') {
        const p = game.player.pos;
        for (const pg of pages) {
          if (pg.got) continue;
          pg.g.rotation.y += dt * 0.7;
          mark(pg.g.position, '#fff0c8');
          if (pg.g.position.distanceTo(p) > 4.2 + game.player.fly * 3) continue;
          pg.got = true;
          pg.g.visible = false;
          game.stuck = 0;
          game.audio.tone(pages.filter((q) => q.got).length * 2, 1.4);
          game.ui.fact(PAGES[pg.i].label, PAGES[pg.i].text, 10000);
        }
        if (pages.every((pg) => pg.got)) {
          task.stage = 'stand';
          game.ui.say('The Curator', 'His own words: he arranged it. So nothing in this land stands where it stands in the picture. Except from one place.');
          game.ui.say('The Curator', 'Three rings hang in your view. Turn, and walk, until the cypress, the steeple and the moon each sit in their own.');
        }
        game.refreshObjective();
        return false;
      }
      if (task.stage === 'stand') {
        const cam = game.camera,
          t = Math.tan((cam.fov * Math.PI) / 360),
          w = window.innerWidth / 2,
          h = window.innerHeight / 2;
        cam.updateMatrixWorld();
        moon.copy(cam.position).addScaledVector(MOON, 5000);
        let n = 0;
        game.ui.rings(
          things.map((p, i) => {
            const q = inFrame(cam, p),
              on = !!q && Math.hypot(q[0] - ref[i][0], q[1] - ref[i][1]) < TOL;
            if (on) n++;
            return { x: w + (ref[i][0] / (t * cam.aspect)) * w, y: h - (ref[i][1] / t) * h, r: (TOL / t) * h, label: RINGS[i], on };
          })
        );
        if (task.help) mark(spot, '#ffd98a');
        if (n !== task.placed) {
          if (n > task.placed) {
            game.audio.tone(n * 2, 0.8, 0.6);
            game.stuck = 0;
          }
          task.placed = n;
          game.refreshObjective();
        }
        task.still = n === 3 ? task.still + dt : 0;
        if (task.still < STILL) return false;
        // it has come together
        game.ui.rings();
        task.stage = 'fly';
        game.stuck = 0;
        game.audio.tone(7, 2.2);
        dark();
        game.ui.say('Vincent', 'There! Stand there. The cypress close at my left hand, the steeple under the great swirl, the moon up in the corner.');
        game.ui.say('Vincent', 'Now the lights. There should be eleven: I have counted them. One flight, before the night runs out, and the morning star last of all.');
        game.refreshObjective();
        return false;
      }
      const next = lights[task.lit];
      next.hoop.material.opacity = 0.62 + 0.3 * Math.sin(performance.now() * 0.008);
      mark(next.g.position, '#ffd98a');
      if (task.lit) {
        task.left -= dt;
        game.ui.meter(task.left / 4, `${Math.max(0, task.left).toFixed(1)} s`);
        if (task.left <= 0) {
          // the night ran out: every light goes dark, and it starts again from the first
          task.lit = 0;
          task.tries++;
          dark();
          game.ui.meter(null);
          game.audio.tone(-3, 1.4, 0.8);
          game.ui.say('The Curator', 'The night ran out, and the sky has gone dark. The first light is waiting above the garden.');
          game.refreshObjective();
          return false;
        }
      }
      head.copy(game.player.pos).y += 1;
      if (head.distanceTo(next.g.position) > next.R + 1.6) return false;
      show(task.lit, 'lit');
      game.audio.tone(task.lit, 1.6);
      task.lit++;
      game.stuck = 0;
      if (task.lit < N) task.left = (task.lit > 1 ? Math.min(task.left, SPARE) : 0) + steady(task.lit) * (EASE + MERCY * Math.min(6, task.tries));
      if (task.lit === N) {
        game.ui.meter(null);
        return true;
      }
      show(task.lit, 'next');
      game.refreshObjective();
      return false;
    },
  };
  return (world.task = task);
}
