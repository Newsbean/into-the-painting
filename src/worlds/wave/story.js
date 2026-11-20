import { ghostMaterial } from '../../engine/world.js';
import { paintMaterial } from '../../engine/paint.js';
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
      thanks: ['The blue from across the world! Ōi, the last block, quickly.', 'When I am a hundred and ten, every dot and line will be alive.'],
    },
    exit: { pos: [2, H(2, 208), 208], ry: 0 },
  });
  world.finalFact = 'Under the Wave off Kanagawa travelled the whole world. Today it is even an emoji: 🌊';
  world.finalLine = 'The last layer: the deep blue. And the sea stands up into the picture.';
  world.hints = {
    start: 'The sea is only a print: you can walk on it. Follow the pier out towards the great wave.',
    memento: 'The packet of blue is tumbling in the spray above the biggest swell, out past the boats. Hold Space and ride up to it.',
    echo: 'Bring the blue back to Hokusai at his workshop on the shore.',
  };
}
