import * as THREE from 'three';
import { ghostMaterial } from '../../engine/world.js';
import { paintMaterial } from '../../engine/paint.js';
import { Builder, figure, xf } from '../../engine/build.js';

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
  // ---- the task: she will not smile for chalk and silence. Three musicians are scattered
  // along the valley; each one found falls in behind the last, and the whole band is led
  // back to the loggia.
  const land = (list) => list.find(([x, z]) => H(x, z) > 0.6 && !world.blocked(x, H(x, z) + 1, z)) ?? list[0];
  const band = [
    { who: 'the lute player', coat: 0x8a2f2a, cap: 0x2f4a3a, at: land([[-8, -60], [-14, -58], [-4, -70]]) },
    { who: 'the piper', coat: 0x2f5a4a, cap: 0x8a2f2a, at: land([[TX + 5, TZ + 5], [TX - 5, TZ + 4], [TX, TZ + 7]]) },
    { who: 'the singer', coat: 0x3a4a7a, cap: 0xc9a24a, at: land([[16, 44], [10, 52], [22, 38]]) },
  ].map((m, i) => {
    const B = new Builder();
    figure(B, 0, 0, 0, 0, { coat: m.coat, legs: 0x2a2420, skin: 0xe0b890, hat: 'straw', hatCol: m.cap, arms: 0.5 });
    if (i === 0) {
      B.ball(0.2, 0xb8863a, 0.1, 1.02, 0.24, 1, 1.25, 0.5, 1); // the lute's belly, and its neck
      B.cyl(0.028, 0.028, 0.55, 0x5a3a20, 0.2, 1.1, 0.24, 5, undefined, undefined, 0, -1.15);
    } else if (i === 1) B.cyl(0.02, 0.026, 0.5, 0x5a3a20, 0, 1.5, 0.2, 5, undefined, undefined, 1.25, 0);
    else B.box(0.34, 0.26, 0.02, 0xe8dcba, 0, 1.12, 0.3, 0, { emissive: 0.2 });
    const mesh = B.mesh(paintMaterial({ stroke: strokes.soft, scale: 1.2, contrast: 0.3 }));
    mesh.position.set(m.at[0], H(m.at[0], m.at[1]), m.at[1]);
    world.scene.add(mesh);
    return { ...m, mesh, x: m.at[0], z: m.at[1], with: false, step: 0 };
  });
  const line = []; // the musicians in the order they were found
  const here = new THREE.Vector3();
  const task = (world.task = {
    done: false,
    ask: ['My own hand, backwards as always. Hold it to the mirror. There.', 'But she will not smile for chalk and silence. In Florence I kept musicians by her, and singers.', 'They are scattered along the valley, three of them. Bring them to her.'],
    text: () => (line.length < band.length ? `Find the musicians along the valley · ${band.length - line.length} to find` : 'Lead the musicians to Leonardo'),
    start(game) {
      game.ui.fact('The musicians', 'Vasari wrote that while Leonardo painted her he kept singers and musicians by her, and jesters, so that she would not look melancholy.');
    },
    update(dt, game, mark) {
      const p = game.player.pos;
      for (const m of band) {
        if (m.with) continue;
        mark(here.set(m.x, m.mesh.position.y + 2.2, m.z).clone(), '#ffe9b0');
        if (Math.hypot(p.x - m.x, p.z - m.z) < 4.2 && Math.abs(p.y - m.mesh.position.y) < 6) {
          m.with = true;
          line.push(m);
          game.stuck = 0;
          game.audio.chime(line.length);
          game.ui.say('The Curator', line.length < band.length ? `You have found ${m.who}. They will follow you.` : `And ${m.who}: that is all three. Lead them back to the loggia.`);
          game.refreshObjective();
        }
      }
      // each follows the one before, the first follows you
      let ax = p.x,
        az = p.z;
      for (const m of line) {
        const dx = ax - m.x,
          dz = az - m.z,
          d = Math.hypot(dx, dz);
        if (d > 2.3) {
          const s = Math.min(d - 2.3, (5.4 + Math.max(0, d - 8) * 0.4) * dt); // they hurry when they have fallen behind
          m.x += (dx / d) * s;
          m.z += (dz / d) * s;
          m.step += s * 2.6;
          m.mesh.rotation.y = Math.atan2(dx, dz);
        }
        m.mesh.position.set(m.x, world.groundAt(m.x, m.z, H(m.x, m.z) + 3) + Math.abs(Math.sin(m.step)) * 0.03, m.z);
        ax = m.x;
        az = m.z;
      }
      if (line.length < band.length) return false;
      mark(new THREE.Vector3(3.9, LY + 2, -1.6), '#ffe9b0');
      return Math.hypot(p.x - 3.9, p.z + 1.6) < 6 && line.every((m) => Math.hypot(m.x - 3.9, m.z + 1.6) < 12);
    },
  });
  world.finalFact = 'Stolen in 1911 and missing for more than two years, she came home in January 1914. 120,000 people came to see her in two days.';
  world.finalLine = 'The last stroke: the smile.';
  world.hints = {
    start: 'Leonardo’s workshop. The door is open. Walk in: she is sitting at the far end, where the light is.',
    memento: 'His flying machine waits on the tall crag across the river. The page is up there with it.',
    echo: 'Bring the page back to Leonardo in the loggia.',
    task: () => (line.length < band.length ? 'One plays on the road north of the workshop, one in the town on the hill, one in the meadow by the door.' : 'Walk back to the loggia. They keep a few steps behind you.'),
  };
}
