import { Builder } from '../../../engine/build.js';
import { rng } from '../../../engine/gl.js';
import { kristianiaPerson } from '../kristiania/people.js';
import { addShoreStones, addMelancholy } from './shore.js';
import { addGirlsOnTheBridge } from './girls-on-the-bridge.js';
import { addDanceOfLife } from './dance-of-life.js';
import { addYellowLog } from './yellow-log.js';
import { addHisHouse } from './his-house.js';
import { addFields } from './fields.js';
import { addSteamer } from './steamer.js';
import { addSunPillar } from './sun.js';

// ================= Munch's other pictures, set down in his own country =================
// One file each. They are called in this order and the order matters: they draw from the
// same rng. What they build of stone and timber goes into one builder (MB), baked into a
// mesh at the end; their houses and people are made with the Kristiania kit (kit.ck), and
// those have dice of their own (kit.R2), so that dressing a figure never moves a field.
export function addMunch(world, kit) {
  const { strokes, S, H, wavy } = kit;
  const MB = (kit.MB = new Builder());
  kit.R2 = rng(1893);
  // (for the box houses these pictures used to have: they still throw their dice, into nothing)
  kit.burn = { B: new Builder(), W: { heightAt: H, colliders: [], glows: [] } };
  kit.shoreZ = (x) => {
    // walk north from the road until the ground meets the water
    const zr = world._roadZ(x);
    for (let d = 18; d < 120; d += 1.5) if (H(x, zr - d) < 0.7) return zr - d;
    return zr - 72;
  };
  kit.person = (x, z, ry, o) => kristianiaPerson(kit.ck.s('detail'), { x, y: H(x, z), z, ry, R: kit.R2, ...o });

  addShoreStones(world, kit);
  addMelancholy(world, kit);
  addGirlsOnTheBridge(world, kit);
  addDanceOfLife(world, kit);
  addYellowLog(world, kit);
  addHisHouse(world, kit);
  addFields(world, kit);
  addSteamer(world, kit);
  S.add(MB.mesh(wavy({ stroke: strokes.oil, scale: 0.4, warp: 0.12, contrast: 0.4, hueVar: 0.35, emissive: 2.0, big: 0.4, wallStretch: 0.6 })));

  addSunPillar(world, kit);
}
