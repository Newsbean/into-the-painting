// The puzzle of the Mona Lisa: read his page, find his players, play her a smile.
//
// 1. Read.    The page she carries back is in his mirror hand, right to left. It can be
//             read backwards by anyone patient enough; held to the round mirror on his
//             workbench it reads the right way round.
// 2. Gather.  The page says what she needs (music) and where he left it: his three players
//             are out in the land he put behind her in the portrait. The lute where the
//             road winds, the pipe on the bridge of arches, the voice at the mill wheel on
//             the river. Nothing points the way: each plays his own note where he stands,
//             louder as you come near, and tells you which of the three notes is his.
// 3. Play.    Back in the loggia they play a phrase; play it back in the same order (1 2 3,
//             or J K L, or the arrow keys). Five phrases, each a note longer and a little
//             quicker than the last. Every phrase played back warms her smile; a wrong note
//             and she looks away, and that phrase is played again (a new one, as long).
//
// Vasari wrote that Leonardo kept musicians by her while he painted, so that she would not
// look melancholy; the winding road, the bridge of arches and the river are what stands
// behind her in the painting; and he did write his notes backwards.
import * as THREE from 'three';
import { glowSprite } from '../../engine/paint.js';
import { xf } from '../../engine/build.js';
import { rng } from '../../engine/gl.js';
import { Soup } from '../../engine/soup.js';
import { tuscanPerson } from './tuscany/life.js';

const PHRASES = [3, 4, 5, 6, 7]; // how many notes in each
const KEYS = [
  ['Digit1', 'Numpad1', 'KeyJ', 'ArrowLeft'],
  ['Digit2', 'Numpad2', 'KeyK', 'ArrowDown', 'ArrowUp'],
  ['Digit3', 'Numpad3', 'KeyL', 'ArrowRight'],
];
const NOTE = [0, 2, 4]; // which notes of the world's scale they sound: low, middle, high
const HEAR = 70; // metres at which a player out in the land begins to be heard
const BAND = [
  { who: 'lute', name: 'The lute player', kind: 'man', coat: 0x8a2f2a, light: 0xffb060, at: [[-33, -94], [-39, -101], [-30, -90]], where: 'where the road to the hill town winds, down in the valley', line: 'She is sitting already? Then mark my note: it is the low one. I am on my way up.' },
  { who: 'pipe', name: 'The piper', kind: 'man', coat: 0x2f5a4a, light: 0x9fe0b0, at: [[63, -120]], where: 'on the bridge of arches over the river', line: 'From this bridge you can see her loggia. Mine is the middle note: do not forget it.' },
  { who: 'voice', name: 'The singer', kind: 'woman', coat: 0x3a4a7a, light: 0xa8c8ff, at: [[86, -31.5], [82, -33], [90, -30]], where: 'at the mill wheel on the river, under the crag', line: 'I sing over the mill wheel to keep in practice. Mine is the high note. Go on: I shall be there before you.' },
];

// his page, as he wrote it (backwards) or as the mirror shows it
const PW = 320,
  PH = 268;
const PAGE = ['For the lady: music,', 'or she grows sad.', '', 'Behind her I will put the road', 'that winds, the bridge of arches,', 'and the river. My three players', 'are out there now: the lute where', 'the road winds, the pipe on the', 'bridge, the voice at the mill wheel.'];
function page(c, readable) {
  c.fillStyle = '#e6d9b4';
  c.fillRect(0, 0, PW, PH);
  c.strokeStyle = 'rgba(90, 60, 30, 0.35)';
  c.strokeRect(5.5, 5.5, PW - 11, PH - 11);
  c.save();
  if (!readable) {
    c.translate(PW, 0);
    c.scale(-1, 1);
  }
  c.fillStyle = '#4a3320';
  c.font = 'italic 16px Georgia, serif';
  c.textAlign = 'left';
  PAGE.forEach((l, i) => c.fillText(l, 20, 40 + i * 22));
  c.restore();
  c.fillStyle = 'rgba(74, 51, 32, 0.65)';
  c.font = '10.5px Georgia, serif';
  c.fillText(readable ? 'HIS PAGE, IN THE MIRROR' : 'HIS PAGE · WRITTEN BACKWARDS', 20, PH - 16);
}

// a number hanging over a musician's head
function numeral(n) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.font = 'italic 46px Georgia, serif';
  g.textAlign = 'center';
  g.fillStyle = 'rgba(20, 16, 12, 0.55)';
  g.beginPath();
  g.arc(32, 32, 26, 0, 6.2832);
  g.fill();
  g.fillStyle = '#f6efdc';
  g.fillText(String(n), 31, 48);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.scale.setScalar(0.5);
  return s;
}
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

export function addTask(world, { H, LY, tuMats }) {
  const R = rng(1550); // (the year Vasari's Lives came out)
  // in the loggia they stand in a row to the left of her, as the game looks at them
  const eye = new THREE.Vector3(2.6, LY + 1.75, 4.8),
    look = new THREE.Vector3(-1.9, LY + 1.2, -3.0);
  const leo = new THREE.Vector3(3.9, LY + 2, -1.6),
    glass = new THREE.Vector3(...world.mirror);
  const band = BAND.map((b, i) => {
    const S = new Soup();
    tuscanPerson(S, { x: 0, y: 0, z: 0, ry: 0, R, kind: b.kind, col: b.coat });
    if (i === 0) {
      S.add(new THREE.SphereGeometry(0.2, 10, 8), 0xb8863a, xf(0.06, 1.0, 0.2, 0, 1, 1.25, 0.5)); // the lute's belly, and its neck
      S.add(new THREE.CylinderGeometry(0.026, 0.026, 0.56, 5), 0x5a3a20, xf(0.3, 1.16, 0.2, 0, 1, 1, 1, 0, -1.15));
    } else if (i === 1) S.add(new THREE.CylinderGeometry(0.018, 0.024, 0.5, 5), 0x5a3a20, xf(0, 1.47, 0.26, 0, 1, 1, 1, 1.25, 0));
    else S.add(new THREE.BoxGeometry(0.34, 0.26, 0.02), 0xe8dcba, xf(0, 1.1, 0.3, 0, 1, 1, 1, -0.5, 0), { emissive: 0.2 });
    const g = new THREE.Group(),
      halo = glowSprite(b.light, 2.6, 0.25),
      tag = numeral(i + 1);
    halo.position.y = 1.3;
    tag.position.y = 2.25;
    tag.visible = false;
    g.add(S.mesh(tuMats.detail), halo, tag);
    // out in the land, looking back up at the workshop
    const [x, z] = b.at.find(([px, pz]) => H(px, pz) > 1.2 && !world.blocked(px, H(px, pz) + 1, pz)) ?? b.at[0];
    const y = world.groundAt(x, z, 99);
    g.position.set(x, y, z);
    g.rotation.y = Math.atan2(-x, -z);
    g.visible = false;
    world.scene.add(g);
    return { ...b, g, halo, tag, y, hop: 0, home: false, next: 1 + i * 0.8 };
  });
  const seat = (m, i) => {
    const x = -2.6 + (i - 1) * 1.15, // (clear of his workbench)
      z = -2.4 - (i - 1) * 0.62;
    m.g.position.set(x, LY, z);
    m.g.rotation.y = Math.atan2(eye.x - x, eye.z - z);
    m.y = LY;
    m.tag.visible = true;
    m.home = true;
  };
  const sound = (k, game) => {
    band[k].hop = 1;
    game.audio.tone(NOTE[k], 0.8);
  };
  const phrase = (n) => Array.from({ length: n }, () => (Math.random() * 3) | 0);
  const task = {
    done: false,
    stage: 'mirror', // mirror -> gather -> back -> play
    read: false,
    help: false,
    sheet: '',
    clock: 0,
    round: 0,
    warm: 0, // how near a smile she is
    phase: 'ready',
    t: 0,
    i: 0,
    seq: [],
    ask: ['My own hand, backwards as always. And I cannot read a word of it without my mirror.', 'Hold it to the mirror on my bench, and do what it says. I wrote down what she needs.', 'She will not smile for chalk and silence.'],
    text: () =>
      task.stage === 'mirror'
        ? 'Hold his page to the mirror on the workbench'
        : task.stage === 'gather'
        ? `Find his three players, out in the land behind her · ${band.filter((m) => m.home).length} of 3`
        : task.stage === 'back'
        ? 'Go back to her in the loggia'
        : `Play her a smile · phrase ${Math.min(PHRASES.length, task.round + 1)} of ${PHRASES.length}`,
    hint: () => {
      if (task.stage === 'mirror') {
        task.help = true; // from now on a light shows it
        return 'A round mirror stands on the workbench nearest his easel.';
      }
      if (task.stage === 'gather') {
        task.help = true;
        const m = band.find((q) => !q.home);
        return `Follow the sound. The ${m.who} is ${m.where}.`;
      }
      return task.stage === 'back' ? 'They are waiting with her in the loggia.' : 'Say the numbers to yourself as they play: one, three, three, two. Then press them in that order.';
    },
    start() {
      for (const m of band) m.g.visible = true;
    },
    update(dt, game, mark) {
      const p = game.player.pos;
      for (const m of band) {
        m.hop *= Math.exp(-dt * 5);
        m.g.position.y = m.y + m.hop * 0.12;
        m.halo.material.opacity = Math.max(m.home ? 0 : 0.25, m.hop * 0.9);
      }
      const said = task.text();
      if (said !== task.said) {
        task.said = said;
        game.refreshObjective();
      }
      if (task.stage === 'mirror' || task.stage === 'gather') {
        // the page in her hand
        const how = task.read ? 'read' : 'backwards';
        if (task.sheet !== how) {
          page(game.ui.mini(PW, PH, true), task.read);
          task.sheet = how;
        }
        // each plays his own note where he stands: louder as you come near
        task.clock += dt;
        band.forEach((m, k) => {
          if (m.home) return;
          const d = m.g.position.distanceTo(p);
          if (task.clock > m.next) {
            m.next = task.clock + 2.4;
            m.hop = 1;
            const vel = Math.min(1, 1.25 - d / HEAR);
            if (vel > 0.06) game.audio.tone(NOTE[k], 0.8, vel * 0.9);
          }
          if (task.help && m === band.find((q) => !q.home)) mark(m.g.position, hex(m.light));
          if (d > 4.2 + game.player.fly * 3) return;
          // found: he plays his note, says which it is, and goes up to her
          world.bloom(m.g.position.clone(), 30);
          seat(m, k);
          task.help = false;
          game.stuck = 0;
          game.audio.tone(NOTE[k], 1.8);
          game.ui.say(m.name, m.line);
        });
        if (task.stage === 'mirror') {
          if (task.help) mark(glass, '#fff0c8');
          const near = Math.hypot(p.x - glass.x, p.z - glass.z) < 3.4 && Math.abs(p.y - LY) < 3;
          if (near !== task.near) game.ui.prompt((task.near = near) ? 'E · hold the page to the mirror' : '');
          if (near && game.pressed.has('KeyE')) {
            task.read = true;
            task.help = false;
            game.stuck = 0;
            game.ui.prompt('');
            game.audio.tone(4, 1.4);
            game.ui.say('The Curator', 'There: in the glass it reads the right way round.');
            game.ui.say('The Curator', 'The road, the bridge, the river: that is the land he put behind her. And his three players are still out in it.');
          }
          if (task.read || band.some((m) => m.home)) {
            task.stage = 'gather'; // (whoever can read it backwards needs no mirror)
            if (task.near) game.ui.prompt('');
          }
        }
        if (band.every((m) => m.home)) {
          task.stage = 'back';
          task.sheet = '';
          game.ui.mini();
          game.ui.say('The Curator', 'All three. Back to the loggia: she is waiting, and so are they.');
        }
        return false;
      }
      if (task.stage === 'back') {
        mark(leo, '#ffe9b0');
        if (Math.hypot(p.x - leo.x, p.z - leo.z) > 6 || Math.abs(p.y - LY) > 4) return false;
        task.stage = 'play';
        game.stuck = 0;
        game.player.pos.set(4.9, LY, -0.6); // she listens from beside him, out of the way of the view
        world.bloom(new THREE.Vector3(-2.6, LY + 1, -2.4), 14);
        game.hold({ pos: eye, target: look, fov: 48 }, 2.2);
        game.ui.say('Leonardo', 'There they are. They play a phrase: you play it back to them. Do not get it wrong. She notices.');
        game.ui.fact('The musicians', 'Vasari wrote that while Leonardo painted her he kept singers and musicians by her, and jesters, so that she would not look melancholy.');
        task.t = 3.2;
        return false;
      }
      world.smile += (task.warm * 0.92 - world.smile) * Math.min(1, dt * 2);
      game.ui.meter(task.round / PHRASES.length, `${task.round} of ${PHRASES.length} phrases`);
      task.t -= dt;
      const beat = 0.68 - task.round * 0.055;
      if (task.phase === 'ready' || task.phase === 'again') {
        // a breath, then they play
        if (task.t > 0) return false;
        if (task.phase === 'ready') task.seq = phrase(PHRASES[task.round]);
        task.phase = 'listen';
        task.i = 0;
        task.t = 0.4;
        game.ui.prompt('Listen');
      } else if (task.phase === 'listen') {
        if (task.t > 0) return false;
        if (task.i < task.seq.length) {
          sound(task.seq[task.i++], game);
          task.t = beat;
          return false;
        }
        task.phase = 'play';
        task.i = 0;
        task.t = 8; // how long she will wait for the next note
        game.ui.prompt('Play it back · 1  2  3');
      } else if (task.phase === 'play') {
        const k = KEYS.findIndex((codes) => codes.some((c) => game.pressed.has(c)));
        if (k < 0) {
          if (task.t < 0) {
            // lost the thread: they play it again
            task.phase = 'again';
            task.t = 0.6;
          }
          return false;
        }
        sound(k, game);
        task.t = 8;
        if (k !== task.seq[task.i]) {
          // a wrong note: she looks away, and it is a new phrase
          task.warm = Math.max(0, task.warm - 0.1);
          task.phase = 'ready';
          task.t = 1.5;
          game.audio.tone(-5, 0.9, 0.9);
          game.ui.prompt('A wrong note');
          return false;
        }
        if (++task.i < task.seq.length) return false;
        task.round++;
        task.warm = task.round / PHRASES.length;
        game.stuck = 0;
        game.ui.prompt(task.round < PHRASES.length ? 'Yes' : '');
        if (task.round === PHRASES.length) {
          task.phase = 'done';
          task.t = 1.8;
          return false;
        }
        task.phase = 'ready';
        task.t = 1.3;
      } else if (task.t < 0) {
        game.ui.meter(null);
        game.ui.prompt('');
        return true;
      }
      return false;
    },
  };
  return (world.task = task);
}
