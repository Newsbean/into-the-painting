import { Builder, figure } from '../../../engine/build.js';
import { addShoreStones, addMelancholy } from './shore.js';
import { addGirlsOnTheBridge } from './girls-on-the-bridge.js';
import { addDanceOfLife } from './dance-of-life.js';
import { addYellowLog } from './yellow-log.js';
import { addHisHouse } from './his-house.js';
import { addFields } from './fields.js';
import { addSteamer } from './steamer.js';
import { addSunPillar } from './sun.js';

// ================= Munch's other pictures, set down in his own country =================
// One file each. They are called in this order and the order matters: they draw
// from the same rng and add to the same two builders (MB for everything built,
// MT for the great tree), which are baked into two meshes at the end.
export function addMunch(world, kit) {
  const { strokes, S, H, maps, wavy } = kit;
  const MB = (kit.MB = new Builder());
  const MT = (kit.MT = new Builder());
  kit.proxyM = { heightAt: H, colliders: world.colliders, maps, glows: world.glows };
  kit.shoreZ = (x) => {
    // walk north from the road until the ground meets the water
    const zr = world._roadZ(x);
    for (let d = 18; d < 120; d += 1.5) if (H(x, zr - d) < 0.7) return zr - d;
    return zr - 72;
  };
  kit.person = (x, z, ry, o) => figure(MB, x, H(x, z), z, ry, o);

  addShoreStones(world, kit);
  addMelancholy(world, kit);
  addGirlsOnTheBridge(world, kit);
  addDanceOfLife(world, kit);
  addYellowLog(world, kit);
  addHisHouse(world, kit);
  addFields(world, kit);
  addSteamer(world, kit);
  S.add(MB.mesh(wavy({ stroke: strokes.oil, scale: 0.4, warp: 0.12, contrast: 0.4, hueVar: 0.35, emissive: 2.0, big: 0.4, wallStretch: 0.6 })));
  S.add(MT.mesh(wavy({ scale: 0.18, warp: 0.4, rim: 0.3, wallStretch: 0.5, angle: 1.57 })));

  addSunPillar(world, kit);
}
