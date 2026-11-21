import * as THREE from 'three';
import { ghostMaterial } from '../../engine/world.js';
import { paintMaterial } from '../../engine/paint.js';
import { Builder, figure, mix, xf } from '../../engine/build.js';
import { vnoise } from '../../engine/gl.js';
import { MARKET } from './delft/plan.js';

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
  // ---- the task: she has slipped out while he waited for his blue. Find her in the town.
  // She is somewhere on the market square, among the stalls and the people; nothing points
  // to her until the curator has given two clues.
  const HOME = [33.98, 0.06, -33.4];
  const spot = [[MARKET.x + 9, MARKET.z + 15], [MARKET.x - 8, MARKET.z + 10], [MARKET.x + 5, MARKET.z - 8], [MARKET.x - 12, MARKET.z - 14]].find(([x, z]) => !world.blocked(x, world.heightAt(x, z) + 1, z)) ?? [MARKET.x, MARKET.z];
  const stand = (x, y, z) => {
    world.girl.group.position.set(x, y, z);
    world.girlModel?.position.set(x, y, z);
  };
  const clues = [
    'She took her basket with her. On a market day there is one place a girl goes with a basket.',
    'The market square, under the tower of the New Church. Look among the stalls for a blue and yellow scarf.',
    'There, by the stalls: the light has found her earring.',
  ];
  const task = (world.task = {
    done: false,
    found: false,
    clue: 0,
    ask: ['Lapis. Real lapis. Then I can finish her today.', 'But look, she has slipped out while I waited for my blue.', 'She cannot be far. Find her for me. You will know her by the scarf.'],
    text: () => (task.found ? 'She has gone home ahead of you · go back to Vermeer' : 'Find her in the town · a blue and yellow scarf'),
    start(game) {
      const y = world.heightAt(spot[0], spot[1]);
      stand(spot[0], y, spot[1]);
      world.away = { ry: Math.atan2(MARKET.x - spot[0], MARKET.z - spot[1]) }; // looking across the square
      world.bloom(new THREE.Vector3(HOME[0], 1, HOME[2]), 9);
      game.ui.say('The Curator', clues[0]);
      task.clue = 1;
    },
    update(dt, game, mark) {
      const p = game.player.pos;
      if (!task.found) {
        const y = world.heightAt(spot[0], spot[1]);
        if (task.clue >= 3) mark(new THREE.Vector3(spot[0], y + 2.2, spot[1]), '#8fb0ff');
        if (Math.hypot(p.x - spot[0], p.z - spot[1]) < 3.6 && Math.abs(p.y - y) < 5) {
          task.found = true;
          game.stuck = 0;
          game.audio.chime(1);
          world.bloom(new THREE.Vector3(spot[0], y + 1, spot[1]), 24);
          stand(...HOME);
          world.away = null;
          game.ui.say('The Curator', 'There she is, with the light on her scarf. She has seen you: she is hurrying home ahead of you.');
          game.refreshObjective();
        }
        return false;
      }
      mark(new THREE.Vector3(37.6, 2.1, -32.4), '#ffe2a0');
      return Math.hypot(p.x - 37.6, p.z + 32.4) < 5.5 && Math.abs(p.y - 0.06) < 6;
    },
  });
  world.finalFact = 'The blue of her scarf is ultramarine. The painting hangs in the Mauritshuis in The Hague.';
  world.finalLine = 'The last stroke: the blue of the scarf, and she turns.';
  world.hints = {
    start: 'The hall of Vermeer’s house. She is standing in the window light, through the archway. Go closer.',
    high: 'One colour is caught on the windmill at the edge of town. Hold Space to ride the wind.',
    memento: 'A trading ship has tied up at the east end of the canal. The stone is up in its rigging.',
    echo: 'Bring the lapis to Vermeer, in the studio with the tall windows.',
    // each time you are lost for a while, one more clue; after the last, a light shows where she is
    task: () => (task.found ? 'She is back in the studio. Vermeer is waiting, by the tall windows.' : clues[Math.min(clues.length - 1, task.clue++)]),
  };
}
