// Everything that makes the land and the sea feel lived in. It is built after the rest of
// the world, with dice of its own, so none of it moves anything that was already there.
//
//   ground.js    what covers the ground: grass, flowers, bushes, stones, the hill forest,
//                the gear of a fishing beach, Edo's pines and moored boats
//   walkers.js   people walking the roads, and the daimyo's procession on the Tokaido
//   sea-sky.js   cranes and gulls on the wing, coasters under sail
//   air.js       cherry petals on the wind, smoke from the roofs
//   raw.js       the tools the others share
//
// (The surf on the beach and the lines of foam on the swell are in the sea's own paint:
// `shore` and `lace` in waterMaterial.)
import { addGroundCover } from './ground.js';
import { addWalkers } from './walkers.js';
import { addBirds, addSailBoats } from './sea-sky.js';
import { addPetals, addSmoke } from './air.js';

// houses with a fire lit under the roof: the thatched farmhouses above the village, and one in every few in Edo
const FARMS = [[-58, 252], [86, 256], [18, 256], [-22, 250], [-98, 262], [120, 264], [-50, 221]];

export function addLife(world, kit) {
  const { H } = kit;
  const cover = addGroundCover(world, kit);
  const folk = addWalkers(world, kit);
  const birds = addBirds(world, kit);
  const boats = addSailBoats(world, kit);
  addPetals(world, kit);
  const hearths = FARMS.map(([x, z]) => [x, H(x, z) + 5.6, z]);
  (world.edo?.lots ?? []).forEach((l, i) => {
    if (i % 7 === 3) hearths.push([l.x, H(l.x, l.z) + 7.2, l.z]);
  });
  addSmoke(world, kit, hearths);
  return {
    tick(dt, time, cam) {
      cover.tick(cam);
      folk.tick(dt, time, cam);
      birds.tick(dt, time);
      boats.tick(dt, time);
    },
  };
}
