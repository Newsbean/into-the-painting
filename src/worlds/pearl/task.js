// The game of Girl with a Pearl Earring: which one is she?
//
// She has slipped out to the market, and so, it seems, has every girl in Delft with a
// scarf on her head. Only one wears the blue scarf with the yellow tail, and the pearl.
// Walk up to a girl and press E to say "that is her". Right, and she laughs and is off
// again into a bigger crowd; wrong, and it costs you time and they all scatter. Three
// rounds against the clock: more girls each time, scarves closer to hers, and in the last
// she keeps away from you.
import * as THREE from 'three';
import { Soup } from '../../engine/soup.js';
import { MARKET } from './delft/plan.js';
import { delftMaterials } from './delft/kit.js';

const BLUE = 0x4a6fb0,
  YELLOW = 0xd9b84a;
// scarf, tail: every one of these is wrong (the last few only just)
const WRONG = [[0xe8e2d4, 0xe8e2d4], [0x9a3a2a, YELLOW], [0x4a7a5a, YELLOW], [BLUE, 0xe8e2d4], [YELLOW, BLUE], [0x6a7a9a, 0xc9a24a], [BLUE, BLUE], [0x3a5a9a, 0xe0c060]];
const ROUNDS = [
  { girls: 5, reach: 15, speed: 1.3, time: 70 },
  { girls: 7, reach: 21, speed: 1.8, time: 60 },
  { girls: 9, reach: 25, speed: 2.2, time: 60, shy: true },
];
const HOME = [33.98, 0.06, -33.4];

const lathe = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 9);
const DRESS = lathe([[0.3, 0], [0.31, 0.05], [0.25, 0.55], [0.17, 0.98], [0.16, 1.05], [0.2, 1.2], [0.21, 1.33], [0.15, 1.43], [0.06, 1.48], [0.055, 1.54]]);
const BALL = new THREE.IcosahedronGeometry(1, 1);
const T = (x, y, z, rx = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(sx, sy, sz));

// A girl in a jacket and a headscarf, facing +z. The scarf is wound round her head in one
// colour; its end, in the other, is knotted on top and hangs down her back, so both show
// from every side. The pearl only if she is the one.
function girl(mat, scarf, tail, pearl) {
  const S = new Soup(),
    c = new THREE.Color();
  S.add(DRESS, (x, y) => c.set(y > 0.98 ? 0x9a6f24 : 0x34424e).multiplyScalar(0.8 + 0.2 * Math.min(1, y)), null, { sway: 0.02 });
  S.add(BALL, 0xd9c4a6, T(0, 1.63, 0.01, 0, 0.1, 0.115, 0.1));
  S.add(BALL, scarf, T(0, 1.69, -0.02, -0.2, 0.125, 0.1, 0.135));
  S.add(BALL, tail, T(0, 1.79, -0.05, 0, 0.075, 0.06, 0.085));
  S.add(new THREE.ConeGeometry(0.065, 0.5, 6), tail, T(0, 1.46, -0.15, 0.25));
  if (pearl) for (const sx of [-1, 1]) S.add(BALL, 0xffffff, T(sx * 0.095, 1.57, 0.02, 0, 0.028, 0.034, 0.028), { em: 1 });
  const m = S.mesh(mat, false);
  m.visible = false;
  return m;
}

export function addTask(world, { strokes }) {
  const mat = delftMaterials(strokes).detail; // painted as the townspeople are
  const her = girl(mat, BLUE, YELLOW, true),
    others = WRONG.map(([a, b]) => girl(mat, a, b, false));
  world.scene.add(her, ...others);
  const H = (x, z) => world.heightAt(x, z);
  const free = (x, z) => !world.blocked(x, H(x, z) + 1, z);
  let cast = []; // who is on the square this round: { m, x, z, tx, tz, wait, real }
  const somewhere = (c, reach, away) => {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * 6.283,
        d = Math.sqrt(Math.random()) * reach,
        x = MARKET.x + Math.cos(a) * d,
        z = MARKET.z + Math.sin(a) * d * 1.15;
      if (!free(x, z)) continue;
      if (away && Math.hypot(x - away.x, z - away.z) < 16 && i < 18) continue;
      // nothing in the way between here and there
      let clear = true;
      for (let k = 1; k < 8 && clear; k++) clear = free(c.x + ((x - c.x) * k) / 8, c.z + ((z - c.z) * k) / 8);
      if (clear || i > 20) return [x, z];
    }
    return [c.x, c.z];
  };
  const stand = (x, y, z) => {
    world.girl.group.position.set(x, y, z);
    world.girlModel?.position.set(x, y, z);
  };
  const task = {
    done: false,
    round: 0,
    left: 0,
    pause: 0,
    ask: ['Lapis. Real lapis. Then I can finish her today.', 'But look, she has slipped out while I waited for my blue. To the market, I have no doubt.', 'Half the girls in Delft wear a scarf. Hers is blue, with a yellow tail, and she has my pearl in her ear. Bring her back!'],
    text: () => `Which one is she? · round ${Math.min(3, task.round + 1)} of 3`,
    hint: () => 'Blue scarf, yellow tail, and a pearl that catches the light. Walk up to her and press E. A wrong guess costs you ten seconds.',
    start(game) {
      stand(HOME[0], -40, HOME[2]); // she is out
      world.away = { ry: 0 };
      task.deal(game);
      game.ui.say('The Curator', 'The market square, under the tower of the New Church. Look at the scarves.');
    },
    // a new crowd on the square
    deal(game) {
      const r = ROUNDS[task.round];
      for (const c of cast) c.m.visible = false;
      // the later rounds use the scarves that are nearest to hers
      const pool = others.slice(task.round === 0 ? 0 : others.length - (r.girls - 1));
      cast = [her, ...pool.slice(0, r.girls - 1)].map((m, i) => {
        const c = { m, x: MARKET.x, z: MARKET.z, wait: Math.random() * 2, real: i === 0, step: Math.random() * 6 };
        [c.x, c.z] = somewhere(c, r.reach, game.player.pos);
        [c.tx, c.tz] = [c.x, c.z];
        m.visible = true;
        return c;
      });
      task.left = r.time;
      game.refreshObjective();
    },
    update(dt, game) {
      const r = ROUNDS[Math.min(task.round, ROUNDS.length - 1)],
        p = game.player.pos;
      if (task.pause > 0) {
        // she has been found: a moment, then the next crowd (or home)
        task.pause -= dt;
        if (task.pause > 0) return false;
        if (task.round === ROUNDS.length) {
          for (const c of cast) c.m.visible = false;
          stand(...HOME);
          world.away = null;
          game.ui.meter(null);
          game.ui.prompt('');
          return true;
        }
        task.deal(game);
      }
      // they wander among the stalls
      let near = null,
        nd = 2.7;
      for (const c of cast) {
        const dx = c.tx - c.x,
          dz = c.tz - c.z,
          d = Math.hypot(dx, dz);
        const shy = c.real && r.shy && Math.hypot(p.x - c.x, p.z - c.z) < 11;
        if (shy && !c.fled) {
          // she has seen you coming
          [c.tx, c.tz] = somewhere(c, r.reach, p);
          c.fled = 2.5;
        }
        c.fled = Math.max(0, (c.fled ?? 0) - dt);
        if (d > 0.3) {
          const s = Math.min(d, (c.fled ? 3.6 : r.speed) * dt);
          c.x += (dx / d) * s;
          c.z += (dz / d) * s;
          c.step += s * 3;
          c.m.rotation.y = Math.atan2(dx, dz);
        } else if ((c.wait -= dt) < 0) {
          [c.tx, c.tz] = somewhere(c, r.reach);
          c.wait = 0.6 + Math.random() * 2.8;
        }
        c.m.position.set(c.x, H(c.x, c.z) + Math.abs(Math.sin(c.step)) * 0.025, c.z);
        const pd = Math.hypot(p.x - c.x, p.z - c.z);
        if (pd < nd) {
          nd = pd;
          near = c;
        }
      }
      task.left -= dt;
      game.ui.meter(task.left / r.time, `${Math.max(0, Math.ceil(task.left))} s`);
      game.ui.prompt(near ? 'E · that is her' : '');
      if (task.left <= 0) {
        game.audio.tone(-3, 1.2, 0.8);
        game.ui.say('The Curator', 'She has given you the slip. They have all moved: look again.');
        task.deal(game);
        return false;
      }
      if (!near || !game.pressed.has('KeyE')) return false;
      if (!near.real) {
        task.left -= 10;
        game.audio.tone(-4, 0.6, 0.9);
        game.ui.say('The Curator', 'Not her. Look at the scarf again: blue, a yellow tail, and the pearl.');
        for (const c of cast) {
          [c.tx, c.tz] = somewhere(c, r.reach, c === near ? null : p);
          c.wait = 0;
        }
        return false;
      }
      task.round++;
      task.pause = 1.6;
      game.stuck = 0;
      game.audio.tone(task.round * 2, 1.4);
      world.bloom(new THREE.Vector3(near.x, H(near.x, near.z) + 1, near.z), 18 + task.round * 8);
      game.ui.prompt('');
      game.ui.say('The Curator', task.round === 1 ? 'That is her! And she is off again, laughing. More scarves than before.' : task.round === 2 ? 'Her again. Now she knows your face: she will not let you come close so easily.' : 'Caught. She gathers her skirt and runs for home, the pearl swinging.');
      return false;
    },
  };
  return (world.task = task);
}
