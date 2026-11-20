import * as THREE from 'three';
import { printKit } from './kit.js';
import { roadsAndStreams } from './roads-and-streams.js';
import { amidaFalls } from './amida-falls.js';
import { ondenWaterWheel } from './onden-water-wheel.js';
import { nihonbashi } from './nihonbashi.js';
import { timberYard } from './timber-yard.js';
import { hodogaya } from './hodogaya.js';
import { ejiri } from './ejiri.js';
import { sazaiHall } from './sazai-hall.js';
import { teaPlantation } from './tea-plantation.js';
import { hillShrine } from './hill-shrine.js';
import { bambooGrove } from './bamboo-grove.js';
import { teaHouse } from './tea-house.js';
import { cranes, nets } from './beach.js';
import { kameido } from './kameido.js';
import { riceTerraces } from './rice-terraces.js';
import { kajikazawa } from './kajikazawa.js';
import { mishimaPass } from './mishima-pass.js';
import { hills } from './hills.js';

// what moves once it is built: called from tick() in ../index.js
export { blowPapers } from './ejiri.js';

// ================================================================
// The other prints. Each block below is one picture Hokusai made,
// set down where the land suits it.
// ================================================================
// Each has a file of its own here. They are called in a fixed order because
// they share one seeded dice and three builders (see kit.js): a new print goes
// at the end of the list, or everything after it moves. From the kit of
// ../index.js the prints take only the material; the rest they bring themselves.
export function buildPrints(world, { flat }) {
  const kit = printKit(world, flat);

  roadsAndStreams(world, kit);
  amidaFalls(world, kit);
  ondenWaterWheel(world, kit);
  nihonbashi(world, kit);
  timberYard(world, kit);
  hodogaya(world, kit);
  ejiri(world, kit);
  sazaiHall(world, kit);
  teaPlantation(world, kit);
  hillShrine(world, kit);
  bambooGrove(world, kit);
  teaHouse(world, kit);
  cranes(world, kit);
  nets(world, kit);
  kameido(world, kit);
  riceTerraces(world, kit);
  kajikazawa(world, kit);
  mishimaPass(world, kit);
  hills(world, kit);

  const { S, GR, X, P } = kit;
  const show = (b, mat) => {
    const m = b.meshes(mat); // in cells of ground: the prints cover the whole coast
    m.name = 'prints';
    S.add(m);
  };
  show(GR, flat({ scale: 0.05, side: THREE.DoubleSide }));
  show(X, flat({ scale: 0.25, emissive: 1.5, side: THREE.DoubleSide }));
  show(P, flat({ scale: 0.2, side: THREE.DoubleSide }));
}
