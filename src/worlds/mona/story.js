import * as THREE from 'three';
import { ghostMaterial } from '../../engine/world.js';
import { paintMaterial } from '../../engine/paint.js';
import { Builder, figure, xf } from '../../engine/build.js';
import { addTask } from './task.js';

// ---------------- story
export function buildStory(world, kit) {
  const { strokes, H, LY, TX, TZ, CX, CY, CZ } = kit;
  const leo = new Builder();
  figure(leo, 0, 0, 0, 0, { coat: 0xffffff, legs: 0xffffff, skin: 0xffffff, dress: true, arms: 0.3, scale: 1.05 });
  leo.ball(0.16, 0xffffff, 0, 1.52, 0.12, 0.9, 1.5, 0.6, 1); // the beard
  const page = new Builder();
  page.box(1.0, 1.3, 0.03, 0xe8dcba, 0, -0.65, 0, 0, { emissive: 0.35 });
  for (let i = 0; i < 8; i++) page.box(0.7 - (i % 3) * 0.1, 0.035, 0.035, 0x5a3a20, 0.05, 0.45 - i * 0.13, 0.02);
  page.add(new THREE.TorusGeometry(0.16, 0.02, 5, 14), 0x5a3a20, xf(-0.22, -0.42, 0.03));
  const pm = page.mesh(paintMaterial({ stroke: strokes.soft, scale: 2, contrast: 0.15, objSpace: 1, emissive: 1.5, side: THREE.DoubleSide }));
  pm.material.uniforms.uRestore = { value: 1 };
  pm.scale.setScalar(1.7);

  world.setupStory({
    wisps: [
      { pos: [0, LY + 1.6, 7], color: 0x6fae8a, name: 'Verdigris', fact: 'Leonardo began the portrait in Florence around 1503, and kept working on it for years.' },
      { pos: [-12, H(-12, -66) + 1.6, -66], color: 0xb8863a, name: 'Raw umber', fact: 'Sfumato: his way of blending tones so softly that the edges disappear, like smoke.' },
      { pos: [63, 8.2, -120], color: 0x5fb0b0, name: 'River green', fact: 'He wrote his notes from right to left, readable only in a mirror.' },
      { pos: [TX, H(TX, TZ) + 1.7, TZ], color: 0xe0b060, name: 'Tower ochre', fact: 'He carried the painting to France in 1516. King Francis I later bought it.' },
      { pos: [96 - 3.6, 8.5, -38], color: 0xdfe8d8, name: 'Mist white', fact: 'She became the most famous painting in the world only after she was stolen from the Louvre in August 1911.' },
    ],
    memento: {
      pos: [CX, CY + 4.5, CZ],
      color: 0xfff0c0,
      model: pm,
      name: 'the page in mirror writing',
      text: 'His notes on how light and shadow fall on a face, written backwards in his own hand.',
    },
    echo: {
      pos: [3.9, LY + 0.02, -1.6],
      ry: -1.0,
      color: 0xffe9b0,
      model: leo.mesh(ghostMaterial(0xffe2a0, 1.0)),
      name: 'Leonardo',
      greet: ['Ah! Tell me, have you ever watched smoke leave a candle? No edges. None at all.', 'I have been at her smile for years. I wrote down how the light should fall, and then I lost the page. Typical.'],
      thanks: ['Play, play! There: do you see it? The corner of her mouth.', 'Light, then shadow, and nothing between them.'],
    },
    exit: { pos: [5.5, LY, 27], ry: -0.5 },
  });
  const task = addTask(world, kit); // the puzzle of this picture: task.js
  world.finalFact = 'Stolen in 1911 and missing for more than two years, she came home in January 1914. 120,000 people came to see her in two days.';
  world.finalLine = 'The last stroke: the smile.';
  world.hints = {
    start: 'Leonardo’s workshop. The door is open. Walk in: she is sitting at the far end, where the light is.',
    memento: 'His flying machine waits on the tall crag across the river. The page is up there with it.',
    echo: 'Bring the page back to Leonardo in the loggia.',
    task: () => task.hint(),
  };
}
