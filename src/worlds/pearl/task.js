// The puzzle of Girl with a Pearl Earring: find his sitter, and set her as he painted her.
//
// 1. Ask.   She has slipped out. Three people in Delft saw her go by, and each noticed one
//           thing: the woman at the market the yellow end of her scarf, the bargeman on
//           the bridge the pearl, the miller's boy her basket of linen (and where she will
//           be at noon). Vermeer himself only says the scarf is blue.
// 2. Find.  At noon the square is full of girls in headscarves, and every one but her is
//           wrong in a single thing: the scarf, its tail, the pearl or the basket. Walk up
//           and press E. A wrong guess costs time and they all move.
// 3. Set.   Back in the studio the picture has to be composed as it was painted: where the
//           light falls from, what is behind her, how she looks at you. The answers are in
//           the painting itself (it hangs in the gallery).
import * as THREE from 'three';
import { Soup } from '../../engine/soup.js';
import { glowSprite } from '../../engine/paint.js';
import { dials } from '../../engine/dials.js';
import { MARKET, MILL } from './delft/plan.js';
import { delftMaterials } from './delft/kit.js';
import { delftPerson } from './delft/people.js';

const BLUE = 0x4a6fb0,
  YELLOW = 0xd9b84a;
// scarf, tail, pearl, basket: she is the first; each of the others is wrong in one thing (the last two in two)
const GIRLS = [
  [BLUE, YELLOW, true, true],
  [BLUE, YELLOW, true, false],
  [BLUE, YELLOW, false, true],
  [BLUE, 0xe8e2d4, true, true],
  [0x4a7a5a, YELLOW, true, true],
  [0x9a3a2a, YELLOW, true, true],
  [BLUE, BLUE, true, true],
  [BLUE, 0xe8e2d4, false, true],
  [0xe8e2d4, YELLOW, true, false],
];
const HOME = [33.98, 0.06, -33.4];
const SET = [
  { label: 'The light falls', options: ['from the right', 'from the left', 'from above'], right: 1, wrong: 'The light? Look at her cheek, and the pearl: it comes from the left, from my window.' },
  { label: 'Behind her', options: ['a map on a white wall', 'the open window', 'darkness: a deep green curtain'], right: 2, wrong: 'No wall, no map. I put nothing behind her but dark: a curtain glazed deep green.' },
  { label: 'She looks', options: ['down at her hands', 'over her shoulder, at you', 'out of the window'], right: 1, wrong: 'She is turning to look at whoever has come in. Over her shoulder: at you.' },
  { label: 'On her head', options: ['a white linen cap', 'a blue scarf, its end hanging yellow', 'nothing: her hair is down'], right: 1, wrong: 'Not a Delft cap. The scarf: blue, and its yellow end down her back.' },
];

const lathe = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 9);
const DRESS = lathe([[0.3, 0], [0.31, 0.05], [0.25, 0.55], [0.17, 0.98], [0.16, 1.05], [0.2, 1.2], [0.21, 1.33], [0.15, 1.43], [0.06, 1.48], [0.055, 1.54]]);
const BALL = new THREE.IcosahedronGeometry(1, 1);
const T = (x, y, z, rx = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, 0)), new THREE.Vector3(sx, sy, sz));

// A girl in a jacket and a headscarf, facing +z. The scarf is wound round her head in one
// colour; its end, in the other, is knotted on top and hangs down her back, so both show
// from every side.
function girl(mat, [scarf, tail, pearl, basket]) {
  const S = new Soup(),
    c = new THREE.Color();
  S.add(DRESS, (x, y) => c.set(y > 0.98 ? 0x9a6f24 : 0x34424e).multiplyScalar(0.8 + 0.2 * Math.min(1, y)), null, { sway: 0.02 });
  S.add(BALL, 0xd9c4a6, T(0, 1.63, 0.01, 0, 0.1, 0.115, 0.1));
  S.add(BALL, scarf, T(0, 1.69, -0.02, -0.2, 0.125, 0.1, 0.135));
  S.add(BALL, tail, T(0, 1.79, -0.05, 0, 0.075, 0.06, 0.085));
  S.add(new THREE.ConeGeometry(0.065, 0.5, 6), tail, T(0, 1.46, -0.15, 0.25));
  if (pearl) for (const sx of [-1, 1]) S.add(BALL, 0xffffff, T(sx * 0.095, 1.57, 0.02, 0, 0.028, 0.034, 0.028), { em: 1 });
  if (basket) {
    S.add(new THREE.CylinderGeometry(0.2, 0.15, 0.2, 9), 0x8a6a3a, T(0.3, 0.92, 0.1));
    S.add(BALL, 0xe8e2d4, T(0.3, 1.03, 0.1, 0, 0.17, 0.07, 0.17)); // the linen in it
  }
  const m = S.mesh(mat, false);
  m.visible = false;
  return m;
}

export function addTask(world, { strokes }) {
  const mat = delftMaterials(strokes).detail; // painted as the townspeople are
  const H = (x, z) => world.heightAt(x, z);
  const free = (x, z) => !world.blocked(x, H(x, z) + 1, z);
  const spot = (list) => list.find(([x, z]) => free(x, z)) ?? list[0];
  // ---- who saw her
  const R = () => Math.random();
  const seen = [
    { who: 'The market woman', kind: 'woman', at: spot([[MARKET.x + 12, MARKET.z - 6], [MARKET.x + 15, MARKET.z + 2]]), says: ['A blue scarf? I have seen three of those since morning.', 'The one who bought my bread had the end of it hanging yellow down her back.'], clue: 'its end hangs yellow' },
    { who: 'The bargeman', kind: 'burgher', at: spot([[1.6, 0], [-1.6, 1]]), says: ['She crossed here not an hour ago, in a hurry.', 'Something flashed at her ear when she turned. A pearl, big as a hazelnut.'], clue: 'a pearl at her ear' },
    { who: "The miller's boy", kind: 'boy', at: spot([[MILL.x - 8, MILL.z - 6], [MILL.x - 10, MILL.z + 4]]), says: ['She had a basket of linen on her arm.', 'She said she would be on the market square again by noon.'], clue: 'a basket of linen' },
  ].map((s) => {
    const S = new Soup();
    delftPerson(S, { x: 0, y: 0, z: 0, ry: 0, R, kind: s.kind });
    const g = new THREE.Group(),
      light = glowSprite(0xffe2a0, 1.6, 0.8);
    light.position.y = 2.5;
    g.add(S.mesh(mat, false), light);
    g.position.set(s.at[0], H(s.at[0], s.at[1]), s.at[1]);
    g.visible = false;
    world.scene.add(g);
    return { ...s, g, light, told: false };
  });
  // ---- the girls on the square
  const cast = GIRLS.map((def, i) => ({ m: girl(mat, def), real: i === 0, x: MARKET.x, z: MARKET.z, tx: 0, tz: 0, wait: 0, step: Math.random() * 6, fled: 0 }));
  world.scene.add(...cast.map((c) => c.m));
  const somewhere = (c, away) => {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * 6.283,
        d = Math.sqrt(Math.random()) * 23,
        x = MARKET.x + Math.cos(a) * d,
        z = MARKET.z + Math.sin(a) * d * 1.15;
      if (!free(x, z) || (away && Math.hypot(x - away.x, z - away.z) < 15 && i < 18)) continue;
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
  const deal = (game) => {
    for (const c of cast) {
      [c.x, c.z] = somewhere(c, game.player.pos);
      [c.tx, c.tz] = [c.x, c.z];
      c.m.visible = true;
    }
    task.left = 90;
  };
  const st = { row: 0, picks: [0, 0, 0, 0] };
  const task = {
    done: false,
    stage: 'ask', // ask -> find -> home -> set
    clues: [],
    left: 0,
    ask: ['Lapis. Real lapis. Then I can finish her today.', 'But look, she has slipped out while I waited for my blue. A blue scarf: that is all I can tell you.', 'Someone in the town will have seen her go by. Ask them. Then bring her back!'],
    text: () => (task.stage === 'ask' ? `Ask who saw her · ${task.clues.length} of 3 clues` : task.stage === 'find' ? 'Find her on the market square' : task.stage === 'home' ? 'Go back to Vermeer' : 'Set her as he painted her'),
    hint: () =>
      task.stage === 'ask'
        ? 'Three people saw her: a woman on the market square, a bargeman on the bridge by the house, a boy at the windmill. Walk up and press E.'
        : task.stage === 'find'
          ? `You know her by: a blue scarf, ${task.clues.join(', ')}. Every other girl is wrong in one of them.`
          : task.stage === 'home'
            ? 'She is back in the studio. Vermeer is waiting, by the tall windows.'
            : 'Think of the painting itself. It hangs in the gallery, if you want to look again.',
    start() {
      stand(HOME[0], -40, HOME[2]); // she is out
      world.away = { ry: 0 };
      for (const s of seen) s.g.visible = true;
    },
    update(dt, game, mark) {
      const p = game.player.pos;
      if (task.stage === 'ask') {
        let near = null;
        for (const s of seen) {
          s.light.material.opacity = s.told ? 0 : 0.55 + 0.3 * Math.sin(performance.now() * 0.004);
          if (s.told) continue;
          mark(s.g.position.clone().setY(s.g.position.y + 2.4), '#ffe2a0');
          if (Math.hypot(p.x - s.at[0], p.z - s.at[1]) < 3.2 && Math.abs(p.y - s.g.position.y) < 4) near = s;
        }
        game.ui.prompt(near ? 'E · ask' : '');
        if (!near || !game.pressed.has('KeyE')) return false;
        near.told = true;
        task.clues.push(near.clue);
        game.stuck = 0;
        game.audio.tone(task.clues.length * 2, 1.2);
        for (const line of near.says) game.ui.say(near.who, line);
        if (task.clues.length === 3) {
          task.stage = 'find';
          game.ui.prompt('');
          game.ui.fact('What you know of her', `A blue scarf; ${task.clues.join('; ')}. She will be on the market square.`);
          deal(game);
        }
        game.refreshObjective();
        return false;
      }
      if (task.stage === 'find') {
        // they wander among the stalls; she keeps away from you
        let near = null,
          nd = 2.7;
        for (const c of cast) {
          const dx = c.tx - c.x,
            dz = c.tz - c.z,
            d = Math.hypot(dx, dz);
          if (c.real && !c.fled && Math.hypot(p.x - c.x, p.z - c.z) < 10) {
            [c.tx, c.tz] = somewhere(c, p);
            c.fled = 2.5;
          }
          c.fled = Math.max(0, c.fled - dt);
          if (d > 0.3) {
            const s = Math.min(d, (c.fled ? 3.4 : 1.7) * dt);
            c.x += (dx / d) * s;
            c.z += (dz / d) * s;
            c.step += s * 3;
            c.m.rotation.y = Math.atan2(dx, dz);
          } else if ((c.wait -= dt) < 0) {
            [c.tx, c.tz] = somewhere(c);
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
        game.ui.meter(task.left / 90, `${Math.max(0, Math.ceil(task.left))} s`);
        game.ui.prompt(near ? 'E · that is her' : '');
        if (task.left <= 0) {
          game.ui.say('The Curator', 'Noon is past and they have all moved. Look again: scarf, tail, pearl, basket.');
          deal(game);
          return false;
        }
        if (!near || !game.pressed.has('KeyE')) return false;
        if (!near.real) {
          task.left -= 15;
          game.audio.tone(-4, 0.6, 0.9);
          game.ui.say('The Curator', 'Not her. One thing about this girl is wrong. Look closer.');
          for (const c of cast) {
            [c.tx, c.tz] = somewhere(c, c === near ? null : p);
            c.wait = 0;
          }
          return false;
        }
        for (const c of cast) c.m.visible = false;
        for (const s of seen) s.g.visible = false;
        stand(...HOME);
        world.away = null;
        world.bloom(new THREE.Vector3(near.x, H(near.x, near.z) + 1, near.z), 26);
        game.audio.tone(6, 1.4);
        game.ui.meter(null);
        game.ui.prompt('');
        game.ui.say('The Curator', 'That is her. She laughs, gathers her skirt and runs for home, the pearl swinging.');
        task.stage = 'home';
        game.stuck = 0;
        game.refreshObjective();
        return false;
      }
      if (task.stage === 'home') {
        mark(new THREE.Vector3(37.6, 2.1, -32.4), '#ffe2a0');
        if (Math.hypot(p.x - 37.6, p.z + 32.4) > 5.5 || Math.abs(p.y - 0.06) > 6) return false;
        task.stage = 'set';
        game.player.frozen = true;
        game.ui.say('Vermeer', 'There you are. Now help me set her, exactly as I mean to paint her.');
        game.refreshObjective();
        return false;
      }
      // ---- set the picture
      if (!dials(game, st, { title: 'How he painted her', rows: SET, note: 'Four things, as they are in the painting.' })) return false;
      const wrong = SET.filter((r, i) => st.picks[i] !== r.right);
      if (wrong.length) {
        game.audio.tone(-4, 0.6, 0.9);
        game.ui.say('Vermeer', `${SET.length - wrong.length} of four as I see her. ${wrong[0].wrong}`);
        return false;
      }
      game.ui.mini();
      return true;
    },
  };
  return (world.task = task);
}
