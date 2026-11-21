// The game of the Mona Lisa: play her a smile.
//
// Vasari wrote that Leonardo kept musicians by her while he painted, so that she would not
// look melancholy. Three of them stand in the loggia: a lute, a pipe, a voice. They play a
// phrase; play it back in the same order (1 2 3, or J K L, or the arrow keys). Five
// phrases, each a note longer and a little quicker than the last. Every phrase played
// back warms her smile; a wrong note and she looks away, and that phrase is played again
// (a new one, of the same length).
import * as THREE from 'three';
import { paintMaterial, glowSprite } from '../../engine/paint.js';
import { Builder, figure } from '../../engine/build.js';

const PHRASES = [3, 4, 5, 6, 7]; // how many notes in each
const KEYS = [
  ['Digit1', 'Numpad1', 'KeyJ', 'ArrowLeft'],
  ['Digit2', 'Numpad2', 'KeyK', 'ArrowDown', 'ArrowUp'],
  ['Digit3', 'Numpad3', 'KeyL', 'ArrowRight'],
];
const NOTE = [0, 2, 4]; // which notes of the world's scale they sound
const BAND = [
  { who: 'lute', coat: 0x8a2f2a, cap: 0x2f4a3a, light: 0xffb060 },
  { who: 'pipe', coat: 0x2f5a4a, cap: 0x8a2f2a, light: 0x9fe0b0 },
  { who: 'voice', coat: 0x3a4a7a, cap: 0xc9a24a, light: 0xa8c8ff },
];

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

export function addTask(world, { strokes, LY }) {
  const mat = paintMaterial({ stroke: strokes.soft, scale: 1.2, contrast: 0.3 });
  // they stand in a row to the left of her, as the game looks at them
  const eye = new THREE.Vector3(2.6, LY + 1.75, 4.8),
    look = new THREE.Vector3(-1.9, LY + 1.2, -3.0);
  const band = BAND.map((b, i) => {
    const B = new Builder();
    figure(B, 0, 0, 0, 0, { coat: b.coat, legs: 0x2a2420, skin: 0xe0b890, hat: 'straw', hatCol: b.cap, arms: 0.5 });
    if (i === 0) {
      B.ball(0.2, 0xb8863a, 0.1, 1.02, 0.24, 1, 1.25, 0.5, 1); // the lute's belly, and its neck
      B.cyl(0.028, 0.028, 0.55, 0x5a3a20, 0.2, 1.1, 0.24, 5, undefined, undefined, 0, -1.15);
    } else if (i === 1) B.cyl(0.02, 0.026, 0.5, 0x5a3a20, 0, 1.5, 0.2, 5, undefined, undefined, 1.25, 0);
    else B.box(0.34, 0.26, 0.02, 0xe8dcba, 0, 1.12, 0.3, 0, { emissive: 0.2 });
    const g = new THREE.Group(),
      halo = glowSprite(b.light, 2.2, 0),
      tag = numeral(i + 1);
    halo.position.y = 1.3;
    tag.position.y = 2.25;
    g.add(B.mesh(mat), halo, tag);
    const x = -2.6 + (i - 1) * 1.15, // (clear of his workbench)
      z = -2.4 - (i - 1) * 0.62;
    g.position.set(x, LY, z);
    g.rotation.y = Math.atan2(eye.x - x, eye.z - z);
    g.visible = false;
    world.scene.add(g);
    return { ...b, g, halo, hop: 0 };
  });
  const sound = (k, game) => {
    band[k].hop = 1;
    game.audio.tone(NOTE[k], 0.8);
  };
  const phrase = (n) => Array.from({ length: n }, () => (Math.random() * 3) | 0);
  const task = {
    done: false,
    round: 0,
    warm: 0, // how near a smile she is
    phase: 'ready',
    t: 0,
    i: 0,
    seq: [],
    ask: ['My own hand, backwards as always. Hold it to the mirror. There.', 'But she will not smile for chalk and silence. In Florence I kept musicians by her.', 'They are here. They play a phrase: you play it back to them. Do not get it wrong. She notices.'],
    text: () => `Play her a smile · phrase ${Math.min(PHRASES.length, task.round + 1)} of ${PHRASES.length}`,
    hint: () => 'Say the numbers to yourself as they play: one, three, three, two. Then press them in that order.',
    start(game) {
      for (const m of band) m.g.visible = true;
      world.bloom(new THREE.Vector3(-2.6, LY + 1, -2.4), 14);
      game.hold({ pos: eye, target: look, fov: 48 }, 2.2);
      game.ui.fact('The musicians', 'Vasari wrote that while Leonardo painted her he kept singers and musicians by her, and jesters, so that she would not look melancholy.');
      task.t = 3.2;
    },
    update(dt, game) {
      for (const m of band) {
        m.hop *= Math.exp(-dt * 5);
        m.g.position.y = LY + m.hop * 0.12;
        m.halo.material.opacity = m.hop * 0.9;
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
        game.refreshObjective();
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
