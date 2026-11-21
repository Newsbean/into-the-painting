
// travellers on the road, birds of haze
export function buildTravellers(world, kit) {
  const { R } = kit;
  // (seven figures stood on the roads: the people of tuscany/ walk them now, but the dice are thrown as before)
  for (let i = 0; i < 14; i++) R();
  for (let i = 0; i < 120; i++) world.glows.push({ p: [(R() - 0.5) * 300, 2 + R() * 30, -80 + (R() - 0.5) * 300], c: 0xfff0c8, size: 0.2 + R() * 0.25, drift: 3 });
}
