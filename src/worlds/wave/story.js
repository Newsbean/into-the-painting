import * as THREE from 'three';
import { ghostMaterial, beam } from '../../engine/world.js';
import { paintMaterial, glowSprite } from '../../engine/paint.js';
import { Builder, figure } from '../../engine/build.js';
import { WX, WZ } from './great-wave.js';

// What there is to find and who there is to meet: the drops of colour, the
// packet of blue, Hokusai himself, the way out, and what the curator says.

// ---------------- story
export function addStory(world, { H, strokes }) {
  const hok = new Builder();
  figure(hok, 0, 0, 0, 0, { coat: 0xffffff, legs: 0xffffff, skin: 0xffffff, dress: true, lean: 0.25, arms: 0.35, scale: 0.92 });
  figure(hok, 1.5, 0, 0.4, -0.5, { coat: 0xffffff, legs: 0xffffff, skin: 0xffffff, dress: true, arms: 0.15, scale: 0.98 });
  const packet = new Builder();
  packet.box(0.7, 0.5, 0.5, 0xe9dfc6, 0, -0.25, 0);
  packet.box(0.74, 0.14, 0.54, 0x8a2f2f, 0, -0.07, 0);
  packet.ball(0.3, 0x1f4fb0, 0, 0.42, 0, 1, 0.6, 1, 1, { emissive: 0.5 });
  const pm = packet.mesh(paintMaterial({ stroke: strokes.wood, scale: 2, contrast: 0.1, objSpace: 1, flat: 0.5, emissive: 1.6 }));
  pm.material.uniforms.uRestore = { value: 1 };
  pm.scale.setScalar(1.8);
  const ey = H(-9, 213) + 0.02;

  world.setupStory({
    wisps: [
      { pos: [10, 3.2, 176], color: 0x2f6fd0, name: 'Indigo', fact: 'The wave belongs to Thirty-Six Views of Mount Fuji, a series Hokusai began at about seventy.' },
      { pos: [14, H(14, 211) + 1.6, 211], color: 0xf0c060, name: 'Paper gold', fact: 'A print is pressed from several carved blocks, one for each colour: the outline first, then light blue, then deep blue.' },
      { pos: [22, 3.2, 30], color: 0xe8b060, name: 'Boat ochre', fact: 'Its Japanese title means Under the Wave off Kanagawa. Three boats of rowers face the sea, heads down.' },
      { pos: [-40, 16, 74], color: 0xd8f0ff, name: 'Foam white', fact: 'Hokusai wrote that nothing he had drawn before seventy was worth counting.' },
      { pos: [174, 12, -22], color: 0x8fb8d8, name: 'Mountain grey', fact: 'Thousands of copies were printed. About a hundred originals survive today.', radius: 150 },
    ],
    memento: {
      pos: [WX + 16, 26, WZ + 6],
      color: 0x6fb0ff,
      model: pm,
      name: 'the packet of Prussian blue',
      text: 'Prussian blue was invented in Europe in 1706, and had only just become affordable in Japan. Hokusai spent money he barely had on it.',
    },
    echo: {
      pos: [-9, ey, 213],
      ry: Math.PI,
      color: 0xfff0c8,
      model: hok.mesh(ghostMaterial(0xffe2b0, 1.0)),
      name: 'Hokusai',
      greet: ['Ha! A guest from the sea. Sit, sit. I am seventy, and only now beginning to learn how to draw.', 'My daughter Ōi keeps the workshop. I have lost my new blue to that wave. Would you look?'],
      thanks: ['The deep blue, last of all. Now, press!', 'When I am a hundred and ten, every dot and line will be alive.'],
    },
    exit: { pos: [2, H(2, 208), 208], ry: 0 },
  });
  // ---- the task: a print is pressed one carved block at a time, and in order. The three
  // blocks are out drying along the shore; he wants the outline, then the pale blue, then
  // the deep blue. Bring the wrong one and it goes back where it was.
  const free = (list) => list.map(([x, z]) => [x, H(x, z) + 1.5, z]).find((p) => p[1] > 2.3 && !world.blocked(p[0], p[1], p[2])) ?? [list[0][0], Math.max(H(...list[0]), 1) + 1.5, list[0][1]];
  const blocks = [
    { name: 'the key block', ink: 0x1c1c2a, light: 0xf0e8d8, line: 'The outline. Good: everything hangs on it.', home: free([[40, 226], [30, 222], [22, 217]]) },
    { name: 'the pale blue block', ink: 0x8fb8d8, light: 0x8fb8d8, line: 'The pale blue: the sky, and the shallows.', home: free([[66, 262], [58, 250], [48, 238]]) },
    { name: 'the deep blue block', ink: 0x1f4fb0, light: 0x3f6fe0, line: 'And the deep blue.', home: free([[-74, 262], [-60, 250], [-44, 234]]) },
  ].map((b) => {
    const B = new Builder();
    B.box(0.9, 0.14, 0.6, 0xa8743a, 0, 0, 0);
    B.box(0.8, 0.03, 0.5, b.ink, 0, 0.14, 0, 0, { emissive: 0.3 });
    const m = B.mesh(paintMaterial({ stroke: strokes.wood, scale: 2, contrast: 0.1, objSpace: 1, flat: 0.5, emissive: 1.6 }));
    m.material.uniforms.uRestore = { value: 1 };
    m.scale.setScalar(1.7);
    const g = new THREE.Group(),
      shaft = beam(b.light, 60, 0.9);
    g.add(m, glowSprite(b.light, 4, 0.6), shaft);
    g.position.set(...b.home);
    g.visible = false;
    world.scene.add(g);
    return { ...b, g, shaft, pressed: false, mark: '#' + new THREE.Color(b.light).getHexString() };
  });
  const over = new THREE.Vector3(),
    press = new THREE.Vector3(-9, ey + 2, 213);
  const task = (world.task = {
    done: false,
    held: -1,
    next: 0,
    ask: ['The blue from across the world! Ōi, the last block, quickly.', 'Ah, but the blocks are still out drying, all three of them.', 'A print is pressed one block at a time, and in order. Bring me the outline first, then the pale blue, then the deep blue.'],
    text: () => (task.held >= 0 ? `Carry ${blocks[task.held].name} to Hokusai` : `Bring Hokusai the three blocks, in order · ${3 - task.next} to go`),
    start() {
      for (const b of blocks) b.g.visible = true;
    },
    update(dt, game, mark) {
      const p = game.player.pos,
        t = performance.now() * 0.002;
      blocks.forEach((b, i) => {
        if (b.pressed || task.held === i) return;
        b.g.position.set(b.home[0], b.home[1] + Math.sin(t + i * 2) * 0.2, b.home[2]);
        b.g.rotation.y += dt * 0.7;
        if (task.held >= 0) return;
        mark(b.g.position, b.mark);
        if (b.g.position.distanceTo(p) < 4.2 + game.player.fly * 3) {
          task.held = i;
          b.shaft.visible = false;
          game.stuck = 0;
          game.audio.chime(i);
          game.ui.say('The Curator', `You have ${b.name}. Take it to Hokusai.`);
          game.refreshObjective();
        }
      });
      if (task.held < 0) return false;
      const b = blocks[task.held];
      b.g.position.lerp(over.set(p.x, p.y + 2.5, p.z), Math.min(1, dt * 6));
      mark(press, '#fff0c8');
      if (Math.hypot(p.x + 9, p.z - 213) > 5.5) return false;
      if (task.held === task.next) {
        // pressed: one more layer of the print
        b.pressed = true;
        b.g.visible = false;
        task.next++;
        world.bloom(press, 50 + task.next * 30);
        game.audio.chime(task.next + 1);
        game.ui.say('Hokusai', b.line);
      } else {
        b.shaft.visible = true;
        game.ui.say('Hokusai', 'Not that one yet! First the outline, then the pale blue, then the deep blue.');
      }
      task.held = -1;
      game.stuck = 0;
      game.refreshObjective();
      return task.next === 3;
    },
  });
  world.finalFact = 'Under the Wave off Kanagawa travelled the whole world. Today it is even an emoji: 🌊';
  world.finalLine = 'The last layer: the deep blue. And the sea stands up into the picture.';
  world.hints = {
    start: 'The sea is only a print: you can walk on it. Follow the pier out towards the great wave.',
    memento: 'The packet of blue is tumbling in the spray above the biggest swell, out past the boats. Hold Space and ride up to it.',
    echo: 'Bring the blue back to Hokusai at his workshop on the shore.',
    task: 'Three carved blocks are drying along the shore road, each under its own light. He wants the outline first, then the pale blue, then the deep blue.',
  };
}
