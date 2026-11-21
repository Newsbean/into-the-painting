// The game of The Starry Night: light the eleven lights of its sky in one flight, before
// the night runs out.
//
// The course starts in the air above the asylum garden and winds inwards over the village
// along the great swirl of the picture, each ring a little smaller than the last. The
// night only starts to run when the first ring is flown through. Each light lit gives
// just enough time to reach the next: less than a steady flight takes, so it wants speed
// (Shift), a turn begun early, and a dive where the course drops. Run out, and the sky
// goes dark again; each time that happens the night is a little longer. The last light
// is the morning star, low beside the cypress, exactly where the painting has it.
import * as THREE from 'three';
import { beam } from '../../engine/world.js';
import { glowSprite } from '../../engine/paint.js';

const N = 11,
  EASE = 0.8, // the share of a steady flyer's time that is given for each stretch...
  MERCY = 0.06, // ...and how much more after every night that runs out
  SPARE = 1.2; // the most that can be carried over from one stretch to the next
const GOLD = 0xffd98a;

export function addTask(world) {
  // where Venus hangs in the picture: low, just to the right of the cypress as he saw it
  const eye = world.view.pos,
    cyp = world.cypressTop,
    dx = cyp[0] - eye[0],
    dz = cyp[2] - eye[2],
    far = Math.hypot(dx, dz);
  const venus = new THREE.Vector3(cyp[0] + (dx / far) * 46 - (dz / far) * 10, eye[1] + (far + 46) * 0.25, cyp[2] + (dz / far) * 46 + (dx / far) * 10);
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
    lit: 0,
    left: 0,
    tries: 0,
    lights,
    ask: ["Theo's letter. And the tubes, good, good.", 'But look up: the sky has no lights in it. There should be eleven. I have counted them.', 'Light them for me in one flight, before the night runs out. The morning star last of all.'],
    text: () => (task.lit ? `Light the next star before the night runs out · ${task.lit} of ${N}` : 'Fly through the first light, above the garden'),
    hint: () => (task.tries ? 'Hold Shift all the way, start each turn before the ring, and where the course drops, look down to dive.' : 'The first ring hangs in the air above the asylum garden. The night only starts to run when you fly through it.'),
    start() {
      dark();
    },
    update(dt, game, mark) {
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
