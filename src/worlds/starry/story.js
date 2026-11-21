import { ghostMaterial } from '../../engine/world.js';
import { paintMaterial } from '../../engine/paint.js';
import { addTask } from './task.js';
import { Builder, figure } from '../../engine/build.js';
import { FORUM } from './town/layout.js';

// Vincent's easel in the garden
export function easel(world, { H, P }) {
  const ex = 76.4,
    ez = 41.2,
    y = H(ex, ez);
  for (const [ox, oz, rz, rx] of [[-0.35, 0, 0.12, 0], [0.35, 0, -0.12, 0], [0, -0.5, 0, -0.3]]) P.cyl(0.03, 0.03, 1.9, 0x6a4a2a, ex + ox, y, ez + oz, 5, undefined, undefined, rx, rz);
  P.box(1.1, 0.9, 0.05, 0x27408c, ex, y + 0.95, ez + 0.02, 0, { emissive: 0.25 });
  P.box(1.2, 1.0, 0.04, 0xe8dcc0, ex, y + 0.9, ez - 0.02);
}

// ---------------- story
export function story(world, { H, strokes }) {
  const vincent = new Builder();
  figure(vincent, 0, 0, 0, 0, { coat: 0xffffff, legs: 0xffffff, skin: 0xffffff, hat: 'straw', hatCol: 0xffffff, arms: 0.3 });
  const vy = H(77.4, 42.4);
  const parcel = new Builder();
  parcel.box(0.9, 0.5, 0.65, 0xc9a26a, 0, -0.25, 0);
  parcel.box(0.95, 0.06, 0.1, 0xb0362e, 0, 0.02, 0);
  parcel.box(0.7, 0.03, 0.5, 0xf6efdc, 0.1, 0.3, 0.05, 0.3);
  for (let i = 0; i < 3; i++) parcel.cyl(0.07, 0.07, 0.42, [0x2f62d8, 0xf2c530, 0xf6f2e0][i], -0.3 + i * 0.3, 0.42, -0.1, 8, { emissive: 0.6 }, undefined, 1.57, 0.2 * i);
  const pm = parcel.mesh(paintMaterial({ stroke: strokes.dab, scale: 2, contrast: 0.2, objSpace: 1, rim: 0.4, emissive: 1.6 }));
  pm.material.uniforms.uRestore = { value: 1 };
  pm.scale.setScalar(1.7);

  world.setupStory({
    wisps: [
      { pos: [-10, H(-10, 76) + 1.6, 76], color: 0x3f7bff, name: 'Cobalt blue', fact: 'The cypress in the painting is drawn far bigger and closer than it really stood.' },
      { pos: [10, H(10, -22) + 1.6, -22], color: 0xffc933, name: 'Chrome yellow', fact: 'The village is imagined. Vincent borrowed it from a sketch he made on a hillside.' },
      { pos: [74, H(74, 50) + 1.6, 50], color: 0x8a6cff, name: 'Iris violet', fact: 'In May 1889 Vincent admitted himself to the asylum of Saint-Paul, a former monastery, to rest and to work.' },
      { pos: [-92, H(-92, -22) + 1.6, -22], color: 0xf0b030, name: 'Wheat ochre', fact: 'He painted The Starry Night around mid-June 1889, in his ground-floor studio.' },
      { pos: world.cypressTop, color: 0xbfe6ff, name: 'Star white', fact: 'From his east-facing window he watched the sky before sunrise, night after night.', high: true },
    ],
    memento: {
      pos: [FORUM.x, H(FORUM.x, FORUM.z) + 46, FORUM.z], // high over the market square of the town across the river
      color: 0xfff0b8,
      model: pm,
      name: "Theo's letter and a parcel of paints",
      text: 'Theo, an art dealer in Paris, sent his brother paint, canvas and letters all his life.',
    },
    echo: {
      pos: [77.4, vy, 42.4],
      ry: -2.2,
      color: 0xffe2a0,
      model: vincent.mesh(ghostMaterial(0xffd98a, 1.0)),
      name: 'Vincent',
      greet: ['Ah, a visitor, at this hour. Look how the sky moves tonight.', 'My brother Theo sends paint from Paris. His parcel has blown up among the stars.'],
      thanks: ['Eleven. I have counted them again.', 'This morning I saw the countryside from my window, with nothing but the morning star, which looked very big.'],
    },
    exit: { pos: [70, H(70, 36), 36], ry: 0.9 },
  });
  const task = addTask(world); // the game of this picture: task.js
  world.finalFact = 'The “morning star” was the planet Venus. The painting has hung at MoMA in New York since 1941.';
  world.finalLine = 'The last stroke: the morning star.';
  world.hints = {
    start: 'Something is glowing near the great cypress. Walk into it.',
    high: 'One colour is caught at the very top of the cypress. Hold Space to ride the wind.',
    memento: "Theo's parcel has blown over the river, high above the lights of the town. Fly to it.",
    echo: 'Carry it to Vincent in the asylum garden.',
    task: () => task.hint(),
  };
}
