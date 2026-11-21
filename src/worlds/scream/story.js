import * as THREE from 'three';
import { paintMaterial } from '../../engine/paint.js';
import { Builder } from '../../engine/build.js';
import { buildScreamer } from './figure.js';

// ---------------- story
export function addStory(world, kit) {
  const { strokes, H, cs, TX, TZ } = kit;
  const E = cs[60]; // where he stopped
  const e2 = cs[61];
  const tl = Math.hypot(e2.x - E.x, e2.z - E.z);
  const nx = -(e2.z - E.z) / tl,
    nz = (e2.x - E.x) / tl;
  const ex = E.x + nx * 1.6,
    ez = E.z + nz * 1.6,
    ey = H(ex, ez);
  world.echoSpot = [ex, ey, ez];
  const page = new Builder();
  page.box(0.9, 1.2, 0.03, 0xf4ecd8, 0, -0.6, 0, 0, { emissive: 0.4 });
  for (let i = 0; i < 7; i++) page.box(0.6 - (i % 3) * 0.08, 0.035, 0.035, 0x3a3440, -0.05, 0.4 - i * 0.13, 0.02);
  const pm = page.mesh(paintMaterial({ stroke: strokes.soft, scale: 2, contrast: 0.15, objSpace: 1, emissive: 1.5, side: THREE.DoubleSide }));
  pm.material.uniforms.uRestore = { value: 1 };
  pm.scale.setScalar(1.7);
  // paint the view from just in front of him, looking past him down the road
  world.view = { pos: [ex + 0.643 * 1.8, ey + 1.6, ez + 0.766 * 1.8], target: [ex - 0.643 * 8, ey + 2.3, ez - 0.766 * 8], fov: 60 };

  world.setupStory({
    wisps: [
      { pos: [22, H(22, 6.5) + 1.6, 6.5], color: 0xe8421e, name: 'Vermilion', fact: 'The picture grew out of a walk at sunset with two friends, on a road above the fjord at Kristiania, today’s Oslo.' },
      { pos: [62, H(62, 34) + 2, 34], color: 0xf2a23a, name: 'Flame orange', fact: 'He lost his mother and his older sister to illness when he was young. He painted feelings rather than things.' },
      { pos: [TX, H(TX, TZ) + 1.7, TZ], color: 0xf2d27a, name: 'Lamplight straw', fact: 'He made four versions: two paintings and two drawings, and lithographs from 1895.' },
      { pos: [TX + 14, 2.9, -146], color: 0x3f62c8, name: 'Fjord blue', fact: 'Two versions were stolen, one in 1994 and one in 2004. Both came home.' },
      { pos: [-40, H(-40, -190) + 15, -190], color: 0x9a7ad8, name: 'Dusk violet', fact: 'In Nice, in the winter of 1892, he wrote the walk down as a poem in his diary.', high: true },
    ],
    memento: {
      pos: [-70, 40, -110],
      color: 0xfff0c8,
      model: pm,
      name: 'the page of his diary',
      text: 'The poem from Nice: “I felt a great, infinite scream pass through nature.”',
    },
    echo: {
      pos: [ex, ey, ez],
      ry: 0.86,
      color: 0xffc890,
      model: buildScreamer(strokes),
      name: 'Munch',
      greet: ['My friends walked on. I stood here, trembling. The sky had turned red as blood.', 'I wrote it down once, in Nice. The wind has the page now.'],
      thanks: ['You came back.', 'I do not have to run from it. I can paint it.'],
    },
    exit: { pos: [E.x - nx * 1.2 + 7, H(E.x - nx * 1.2 + 7, E.z - nz * 1.2 + 2.5), E.z - nz * 1.2 + 2.5], ry: 1.2 },
  });
  // ---- the task: he let his friends walk on. Fetch them back, so that he does not stand there alone.
  const far = Math.hypot(e2.x - E.x, e2.z - E.z),
    tx = (e2.x - E.x) / far,
    tz = (e2.z - E.z) / far;
  const beside = [E.x + tx * 9 + nx * 2.7, E.z + tz * 9 + nz * 2.7]; // where they stand in the picture: behind him, at the railing
  const fr = world.friends;
  const walk = (dt, gx, gz, keep, speed) => {
    const dx = gx - fr.x,
      dz = gz - fr.z,
      d = Math.hypot(dx, dz);
    if (d > keep) {
      const s = Math.min(d - keep, (speed + Math.max(0, d - 8) * 0.4) * dt); // they hurry when they have fallen behind
      fr.x += (dx / d) * s;
      fr.z += (dz / d) * s;
      fr.ry = Math.atan2(dx, dz);
      fr.step += s * 2.6;
    }
    fr.mesh.position.set(fr.x, world.groundAt(fr.x, fr.z, H(fr.x, fr.z) + 3) + Math.abs(Math.sin(fr.step)) * 0.03, fr.z);
    fr.mesh.rotation.y = fr.ry;
    return d;
  };
  world.task = {
    done: false,
    ask: ['Yes. These are the words.', 'My friends walked on down the road. I could not call after them. Would you?'],
    text: () => (fr.with ? 'Walk back to Munch with his friends' : 'Go after his two friends, down the road'),
    update(dt, game, mark) {
      const p = game.player.pos;
      if (!fr.with) {
        mark(new THREE.Vector3(fr.x, fr.mesh.position.y + 2.2, fr.z), '#ffe2a0');
        if (Math.hypot(p.x - fr.x, p.z - fr.z) < 4.5 && Math.abs(p.y - fr.mesh.position.y) < 6) {
          fr.with = true;
          game.stuck = 0;
          game.audio.chime(2);
          game.ui.say('His friends', 'Edvard? We thought he was just behind us.');
          game.ui.say('His friends', 'Lead the way. We are coming.');
          game.refreshObjective();
        }
        return false;
      }
      // they keep a few steps behind you all the way back
      walk(dt, p.x, p.z, 2.6, 5.2);
      mark(new THREE.Vector3(ex, ey + 2, ez), '#ffe2a0');
      return Math.hypot(fr.x - ex, fr.z - ez) < 9 && Math.hypot(p.x - ex, p.z - ez) < 7;
    },
  };
  // once they are back they go and stand where the picture has them
  world.tickers.push((dt) => {
    if (world.task.done) walk(dt, beside[0], beside[1], 0.05, 2.2);
  });
  world.finalFact = 'One version set an auction record in 2012. The image lives on as an emoji: 😱. Whatever you carry, you do not have to carry it alone.';
  world.finalLine = 'The last stroke: the sky, exactly as he felt it. And the feeling becomes something shared.';
  world.hints = {
    start: 'The road above the fjord. Follow the railing. Someone has stopped up ahead.',
    high: 'One colour is burning at the top of the lighthouse, out on the island. Hold Space to ride the wind.',
    memento: 'A page is turning over and over, high above the fjord.',
    echo: 'Carry the poem back to Munch, where he stopped on the road.',
    task: () => (world.friends.with ? 'Bring his friends back to where he stands. They will keep behind you.' : 'His friends walked on towards the town. Follow the railing down the road.'),
  };
}
