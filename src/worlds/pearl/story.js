import * as THREE from 'three';
import { ghostMaterial } from '../../engine/world.js';
import { paintMaterial } from '../../engine/paint.js';
import { Builder, figure, mix, xf } from '../../engine/build.js';
import { vnoise } from '../../engine/gl.js';
import { addTask } from './task.js';

// ---------------- story
export function addStory(world, kit) {
  const { strokes, MX, MZ } = kit;
  const ver = new Builder();
  figure(ver, 0, 0, 0, 0, { coat: 0xffffff, legs: 0xffffff, skin: 0xffffff, hat: 'top', hatCol: 0xffffff, arms: 0.25 });
  const stone = new Builder();
  stone.add(new THREE.IcosahedronGeometry(0.45, 0), (x, y, z) => mix(0x1f3fb0, 0x3f6fe0, vnoise(x * 6, y * 6 + z * 6)), xf(0, 0, 0, 0.4, 1.2, 0.8, 1), { emissive: 0.35 });
  stone.ball(0.08, 0xe6c860, 0.2, 0.12, 0.25, 1, 1, 1, 0, { emissive: 0.6 });
  const sm = stone.mesh(paintMaterial({ stroke: strokes.dab, scale: 3, contrast: 0.3, objSpace: 1, rim: 0.5, emissive: 1.8 }));
  sm.material.uniforms.uRestore = { value: 1 };
  sm.scale.setScalar(1.5);

  world.setupStory({
    wisps: [
      { pos: [31.6, 1.6, -31.2], color: 0xffd98a, name: 'Window gold', fact: 'She is not a portrait of anyone we know. She is a tronie: a study of a face in costume, which is why she wears a turban.' },
      { pos: [0, 4.2, 0], color: 0xf2c94c, name: 'Lead-tin yellow', fact: 'Vermeer worked in Delft, in the Dutch Republic, and finished only a few pictures a year.' },
      { pos: [MX + 4, 1.7, MZ - 3], color: 0xd9643a, name: 'Brick red', fact: 'The blue he wanted, ultramarine, was ground from lapis lazuli and cost more than gold.' },
      { pos: [-22, 0.9, -3.4], color: 0x5fb08a, name: 'Canal green', fact: 'He supported a large household, and money was always a worry.' },
      { pos: [98, 15, 62], color: 0xe9dfc4, name: 'Sailcloth white', fact: 'The lapis came from mines in what is now north-east Afghanistan, carried west along the trade roads.', high: true },
    ],
    memento: {
      pos: world.crowNest,
      color: 0x5f8fff,
      model: sm,
      name: 'the piece of lapis lazuli',
      text: 'A blue stone from the far side of the world. Ground to powder, it becomes ultramarine.',
    },
    echo: {
      pos: [37.6, 0.06, -32.4],
      ry: -2.2,
      color: 0xffe2a0,
      model: ver.mesh(ghostMaterial(0xffdf9a, 1.0)),
      name: 'Vermeer',
      greet: ['Softly, please. The light is only right for an hour.', 'I keep putting off her scarf. The blue it needs costs more than this house earns in a season.'],
      thanks: ['There you are. Stand as you stood.', 'Open the shutter a little more. There.'],
    },
    exit: { pos: [34, 0, -19.5], ry: 0 },
  });
  const task = addTask(world, { strokes }); // the puzzle of this picture: task.js
  world.finalFact = 'The blue of her scarf is ultramarine. The painting hangs in the Mauritshuis in The Hague.';
  world.finalLine = 'The last stroke: the blue of the scarf, and she turns.';
  world.hints = {
    start: 'The hall of Vermeer’s house. She is standing in the window light, through the archway. Go closer.',
    high: 'One colour is caught on the windmill at the edge of town. Hold Space to ride the wind.',
    memento: 'A trading ship has tied up at the east end of the canal. The stone is up in its rigging.',
    echo: 'Bring the lapis to Vermeer, in the studio with the tall windows.',
    task: () => task.hint(),
  };
}
