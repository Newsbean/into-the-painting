// The puzzle of The Scream: put his evening back together, then breathe.
//
// 1. Find.   The page of his diary is torn. Five lines of it lie where each one happened:
//            on the road by his two friends, at the bench where the sun goes down, in the
//            red sky itself, on the railing, at the end of the pier over the fjord.
// 2. Order.  Back with him, the lines are set in the order of that evening. He says which
//            is the first one out of place.
// 3. Breathe (below).
//
// The lines are his own diary note of 1892, in plain words.
//
// He cannot paint the sky while it is screaming. Stand with him and breathe: hold Space as
// the ring opens (in), let go as it closes (out), each on the beat. A breath in time
// steadies the sky a little: the ribbons slow, the ground stops swaying. A breath out of
// time, or no breath at all, and the scream comes back. As it steadies the breaths grow
// longer, no two quite the same length, and the beat less forgiving; and when the sky is
// half still his friends turn round and start back up the road.
//
// Nothing here can frighten: there is no losing, only the sky taking longer to settle.
const STEP = 1 / 7; // what one good breath is worth
// the evening, in order
const LINES = ['I was walking along the road with two friends.', 'The sun was setting.', 'Suddenly the sky turned red as blood.', 'I stopped, tired, and leaned on the railing.', 'Fire hung over the blue-black fjord and the town.'];
const WHERE = ['where his two friends are walking', 'at the bench, where the sun goes down', 'up in the red sky, over the road', 'on the railing, down the road', 'at the end of the pier, over the fjord'];

import * as THREE from 'three';
import { beam } from '../../engine/world.js';
import { glowSprite } from '../../engine/paint.js';
import { dials } from '../../engine/dials.js';

// the moment in a list nearest to t, between lo and hi (or null)
function nearest(list, t, lo, hi) {
  let best = null;
  for (const x of list) if (x >= lo && x <= hi && (best === null || Math.abs(x - t) < Math.abs(best - t))) best = x;
  return best;
}

export function addTask(world, { H, back }) {
  const fr = world.friends;
  const walk = (dt, gx, gz, speed) => {
    const dx = gx - fr.x,
      dz = gz - fr.z,
      d = Math.hypot(dx, dz);
    if (d > 0.05) {
      const s = Math.min(d, speed * dt);
      fr.x += (dx / d) * s;
      fr.z += (dz / d) * s;
      fr.ry = Math.atan2(dx, dz);
      fr.step += s * 2.6;
    }
    fr.mesh.position.set(fr.x, world.groundAt(fr.x, fr.z, H(fr.x, fr.z) + 3) + Math.abs(Math.sin(fr.step)) * 0.03, fr.z);
    fr.mesh.rotation.y = fr.ry;
  };
  // ---- the torn lines, each where it happened
  const road = (x, off) => [x, world._roadZ(x) - off];
  const spots = [[fr.x - 2.2, fr.z + 1.4, 1.4], [62.6, 35.6, 1.5], [18, world._roadZ(18) - 1, 24], [...road(-62, 2.4), 1.5], [-158, -148, 1.6]];
  const torn = spots.map(([x, z, up], i) => {
    const g = new THREE.Group(),
      shaft = beam(0xfff0c8, 40, 0.9);
    g.add(glowSprite(0xfff0c8, 3, 0.8), shaft);
    g.position.set(x, world.groundAt(x, z, 99) + up, z); // (99: from above, so that the pier's deck counts)
    g.visible = false;
    world.scene.add(g);
    return { g, shaft, i, got: false };
  });
  const order = { row: 0, picks: [4, 3, 2, 1, 0] }; // handed to you upside down
  const task = {
    done: false,
    stage: 'find', // find -> order -> breathe
    help: false,
    calm: 0, // 0 the scream .. 1 still
    clock: 0,
    from: 1.6, // when the breath we are in began (the first after a moment to get ready)
    T: 2.9, // how long it lasts
    win: 0.42, // how near the beat a press or a letting-go must fall
    presses: [],
    releases: [],
    was: false,
    word: 'Ready',
    glow: 0,
    ask: ['Yes. That is the last line. But the page is torn: the rest of that evening has blown away.', 'Five lines. Each will have come down where it happened.', 'Bring them to me, and help me set them in order.'],
    text: () => (task.stage === 'find' ? `Find the torn lines · ${torn.filter((t) => t.got).length} of 5` : task.stage === 'order' ? (task.at ? 'Set the evening in order' : 'Bring the lines back to Munch') : 'Breathe with him until the sky is still'),
    hint: () => {
      if (task.stage === 'find') {
        task.help = true; // from now on a light shows over each
        return `One lies ${WHERE[torn.find((t) => !t.got).i]}.`;
      }
      return task.stage === 'order' ? 'What came first that evening? He was walking; the sun went down; the sky changed; he stopped; he looked out over the fjord.' : 'Hold Space while the ring opens, and let go as it closes. Watch the ring, not the clock: no two breaths are the same length.';
    },
    start() {
      for (const t of torn) t.g.visible = true;
    },
    update(dt, game, mark) {
      const p = game.player.pos;
      if (task.stage === 'find') {
        for (const t of torn) {
          if (t.got) continue;
          t.shaft.visible = task.help;
          if (task.help) mark(t.g.position, '#fff0c8');
          if (t.g.position.distanceTo(p) > 4 + game.player.fly * 3) continue;
          t.got = true;
          t.g.visible = false;
          game.stuck = 0;
          game.audio.tone(torn.filter((q) => q.got).length, 1.4);
          game.ui.fact('A torn line', LINES[t.i]);
        }
        if (torn.every((t) => t.got)) {
          task.stage = 'order';
          game.ui.say('The Curator', 'All five. Take them back to him, where he stopped on the road.');
        }
        game.refreshObjective();
        return false;
      }
      if (task.stage === 'order') {
        const e = world.echoSpot;
        if (!task.at) {
          mark(new THREE.Vector3(e[0], e[1] + 2, e[2]), '#ffe2a0');
          if (Math.hypot(p.x - e[0], p.z - e[2]) > 5.5) return false;
          task.at = true;
          game.player.frozen = true;
          game.refreshObjective();
        }
        const rows = ['First', 'Then', 'Then', 'Then', 'And then'].map((label) => ({ label, options: LINES }));
        if (!dials(game, order, { title: 'That evening on the road', rows, note: 'Each line once, in the order it happened.' })) return false;
        const bad = order.picks.findIndex((k, i) => k !== i);
        if (bad >= 0) {
          game.audio.tone(-4, 0.6, 0.9);
          game.ui.say('Munch', bad === 0 ? 'No. It began quietly: I was only walking.' : `No. After "${LINES[bad - 1]}" something else came.`);
          return false;
        }
        game.ui.mini();
        task.stage = 'breathe';
        game.hold(game.viewPose(world), 2.4);
        game.ui.say('Munch', 'Yes. That was how it went. And then the scream. Stand with me. Breathe as I breathe, slowly.');
        game.ui.prompt('Hold Space · breathe in     let go · breathe out');
        game.refreshObjective();
        return false;
      }
      task.clock += dt;
      const held = game.keys.has('Space');
      if (held && !task.was) task.presses.push(task.clock);
      if (!held && task.was) task.releases.push(task.clock);
      task.was = held;
      const s = task.from,
        T = task.T;
      if (task.clock >= s + T) {
        // the breath is over: was it in time?
        const down = nearest(task.presses, s, s - T / 4, s + T / 2),
          up = nearest(task.releases, s + T / 2, s + T / 8, s + T);
        const inErr = down === null ? null : down - s,
          outErr = up === null ? null : up - (s + T / 2);
        const inOk = inErr !== null && Math.abs(inErr) < task.win,
          outOk = outErr !== null && Math.abs(outErr) < task.win;
        if (inOk && outOk) {
          task.calm = Math.min(1, task.calm + STEP);
          task.word = 'In time';
          task.glow = 1;
          game.audio.tone(Math.round(task.calm * 7), 2.2, 0.8);
          game.stuck = 0;
        } else {
          if ((down === null && up === null) || (!inOk && !outOk)) task.calm = Math.max(0, task.calm - STEP / 2);
          task.word = !inOk ? (inErr === null ? 'Hold Space as it opens' : inErr > 0 ? 'In: a little late' : 'In: a little early') : outErr === null ? 'Let go as it closes' : outErr > 0 ? 'Out: a little late' : 'Out: a little early';
          task.glow = -1;
        }
        // the next breath: longer as the sky steadies, and never quite the length of the last
        task.from = s + T;
        task.T = (2.9 + 2.5 * task.calm) * (1 + (Math.random() - 0.5) * 0.3 * Math.min(1, task.calm * 2));
        task.win = 0.42 - 0.2 * task.calm;
        task.presses = task.presses.filter((x) => x > task.from - 3);
        task.releases = task.releases.filter((x) => x > task.from - 3);
      }
      task.glow *= Math.exp(-dt * 1.6);
      world.calm = task.calm * 0.9;
      // when the sky is half still, his friends turn round
      if (task.calm > 0.45) walk(dt, back[0], back[1], 2.4);

      // the ring: at the inner circle a breath begins, at the outer it turns
      const S = 300,
        c = game.ui.mini(S, S + 40, true), // to one side: his face is in the middle of the picture
        u = Math.max(0, (task.clock - task.from) / task.T),
        open = u < 0.5 ? u * 2 : 2 - u * 2,
        r0 = 34,
        r1 = 128;
      c.clearRect(0, 0, S, S + 40);
      c.lineWidth = 2;
      c.strokeStyle = 'rgba(246, 239, 220, 0.5)';
      for (const r of [r0, r1]) {
        c.beginPath();
        c.arc(S / 2, S / 2, r, 0, 6.2832);
        c.stroke();
      }
      c.lineWidth = 7;
      c.strokeStyle = task.glow > 0.05 ? `rgba(255, 217, 138, ${0.75 + 0.25 * task.glow})` : task.glow < -0.05 ? `rgba(224, 120, 90, ${0.8 - 0.2 * task.glow})` : 'rgba(246, 239, 220, 0.92)';
      c.beginPath();
      c.arc(S / 2, S / 2, r0 + (r1 - r0) * open, 0, 6.2832);
      c.stroke();
      c.fillStyle = 'rgba(246, 239, 220, 0.95)';
      c.textAlign = 'center';
      c.font = 'italic 26px Georgia, serif';
      c.fillText(task.clock < task.from ? '' : u < 0.5 ? 'in' : 'out', S / 2, S / 2 + 9);
      c.font = '13px Georgia, serif';
      c.fillText(task.word, S / 2, S + 26);
      game.ui.meter(task.calm, `${Math.round(task.calm * 100)}% still`);
      if (task.calm < 1) return false;
      game.ui.mini();
      game.ui.meter(null);
      game.ui.prompt('');
      return true;
    },
  };
  // once the sky is still they come and stand where the picture has them
  world.tickers.push((dt) => {
    if (task.done) walk(dt, back[0], back[1], 2.6);
  });
  return (world.task = task);
}
