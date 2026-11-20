import { sugi, matsu, leafy } from '../plants.js';

// ---------------- the hills: cryptomeria, pine, a hut here and there, so no slope stands empty
export function hills(world, { H, Q, X, P, maps, solid, minka, grove, jizo }) {
  minka(-100, 296, Math.PI + 0.2, 6, 4.6);
  minka(-58, 303, Math.PI - 0.25, 5.4, 4.2, { lit: false });
  minka(41, 297, Math.PI + 0.3, 6, 4.6);
  minka(101, 311, Math.PI - 0.1, 6.4, 4.8);
  minka(196, 284, Math.PI + 0.1, 5.6, 4.4, { lit: false });
  minka(-34, 318, Math.PI + 0.35, 5, 4, { lit: false });
  for (const [x, z] of [[-96, 292.4], [-54.6, 300.6], [44.6, 294], [105, 307.6], [-30.6, 315]]) {
    // split wood stacked by the door
    const y = H(x, z);
    for (let l = 0; l < 3; l++) X.box(1.5 - l * 0.3, 0.26, 0.7, l % 2 ? 0xb89668 : 0xa07e52, x, y - 0.05 + l * 0.26, z, 0.3);
  }
  // a charcoal burner's smoke above the trees
  for (let k = 0; k < 4; k++) X.ball(0.8 + k * 0.45, 0xf6ecd4, -61.5 + k * 0.7, H(-61.5, 306.5) + 2.2 + k * 1.7, 306.5, 1.2, 0.8, 1, 1, { emissive: 0.5, sway: 1.5 });
  X.ball(1.3, 0x6a5a48, -61.5, H(-61.5, 306.5) + 0.2, 306.5, 1, 0.75, 1, 1);
  // the hut under two pines on its point, as at Lake Suwa
  minka(214, 210.4, Math.PI + 0.4, 4.4, 3.6, { h: 2.1, lit: false });
  for (const [x, z, h] of [[217.6, 208.2, 11], [219.2, 211.2, 8.5]]) {
    matsu(P, x, H(x, z), z, h, Q, { pads: 4 });
    solid(x, z, 0.4, H(x, z) + 5);
  }
  const tree = (r) => (x, y, z) => {
    const h = 9 + Q() * 9;
    sugi(P, x, y, z, h, Q);
    solid(x, z, 0.5, y + h * 0.5);
    if (z < 279) maps.blob(x, z, r, 0.3);
  };
  grove(40, -122, -38, 284, 334, tree(3));
  grove(16, -204, -152, 264, 304, tree(3));
  grove(20, 26, 62, 268, 332, tree(3));
  grove(24, 76, 138, 302, 334, tree(3));
  grove(26, 156, 226, 258, 304, tree(3));
  grove(18, -44, 62, 336, 352, tree(3));
  grove(10, -146, -100, 262, 284, tree(3));
  const pines = (x, y, z) => {
    const h = 7 + Q() * 5;
    matsu(P, x, y, z, h, Q);
    solid(x, z, 0.45, y + h * 0.5);
    maps.blob(x, z, 3, 0.3);
  };
  grove(7, -228, -110, 203, 217, pines, 5, 1.35);
  grove(5, 96, 228, 203, 216, pines, 5, 1.35);
  grove(12, -220, 220, 262, 330, pines, 5);
  grove(
    16,
    -165,
    176,
    226,
    270,
    (x, y, z) => {
      const h = 4.5 + Q() * 2.5;
      leafy(P, x, y, z, h, Q, Q() < 0.3 ? { lo: 0xb8863a, hi: 0xe8c66a } : {});
      solid(x, z, 0.35, y + 2.5);
      maps.blob(x, z, 2.6, 0.3);
    },
    4.5
  );
  // way-stones and stone figures where the paths leave the road
  for (const [x, z, ry] of [[-20, 218.6, 1.2], [136.4, 223.4, -1.4], [59.8, 224.6, 1.5], [-124.4, 223.2, -1.5]]) jizo(x, z, ry);
}
