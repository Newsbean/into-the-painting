// The puzzle of The Great Wave: make the print.
//
// 1. Find.      The three carved blocks are out drying along the shore road. They are bare
//               wood, cut backwards as every block is: nothing says which is which, only
//               what stands proud on each. (They are cut out of the real print.)
// 2. Work out.  Back with Hokusai: which ink does each block take, which is pressed first,
//               and where does the new blue go? The print itself answers, if you look.
// 3. Pull it.   Each block slides over the paper and must be pressed (Space) at the moment
//               it sits true, when its corner marks meet the marks on the sheet. Press it
//               off register and the sheet is spoiled: a new one, and the lines again.
//
// What the puzzle says about the print is what has been found in it: the block of lines
// was inked in blue, not the usual black (Prussian blue mixed with indigo, and with it the
// dark stripes in the wave); the pure Prussian blue went on over those stripes and between
// them; the sky behind Fuji is grey. A real impression took more blocks than three: the
// sheet here starts with its palest colours already on it.
//
// The blocks are cut out of the picture on the gallery wall (public/paintings/wave.jpg) by
// colour, each faster and less forgiving than the last, and a pull that is only just good
// enough stays on the paper exactly as far out as it was pressed.
import * as THREE from 'three';
import { beam } from '../../engine/world.js';
import { glowSprite } from '../../engine/paint.js';
import { dials } from '../../engine/dials.js';

// what is cut on each block, as the player finds it
const CUT = [
  'Fine lines and narrow stripes stand proud on it: every claw of foam, the boats, the mountain.',
  'One broad shape stands proud on it: the sky behind the mountain, with the mountain left out.',
  'The body of the great wave stands proud on it, and the backs of the swells.',
];
const WORK = [
  { label: 'The block of lines takes', options: ['black', 'dark blue, mixed with indigo', 'grey'], right: 1, wrong: 'Look closely at the print. Not one line of it is black.' },
  { label: 'The block of the sky takes', options: ['pure Prussian blue', 'dark blue, mixed with indigo', 'grey'], right: 2, wrong: 'Behind the mountain the sky is no blue at all. Look at it.' },
  { label: 'The block of the wave takes', options: ['grey', 'pure Prussian blue', 'black'], right: 1, wrong: 'The body of the wave is the blue from across the world. That is what the money went on!' },
  { label: 'Pressed first', options: ['the wave', 'the sky', 'the lines'], right: 2, wrong: 'First the block that tells every other where to go.' },
  { label: 'The Prussian blue goes', options: ['under the dark stripes', 'over the dark stripes, and between them', 'beside the stripes, never touching'], right: 1, wrong: 'Dark first. Then the pure blue over it and between: that is where the depth of the wave comes from.' },
];

const W = 760,
  H = 511, // the print on the sheet
  MX = 40,
  MY = 62; // where it lies on the drawing
const BLOCKS = [
  { name: 'the lines, in dark blue', amp: 150, w: 1.5, bob: 0, tol: 22 },
  { name: 'the sky, in grey', amp: 150, w: 1.8, bob: 16, tol: 19 },
  { name: 'the wave, in Prussian blue', amp: 160, w: 2.1, bob: 26, tol: 17 },
];
const MERCY = 0.07; // every spoiled sheet makes the next a little kinder

const sheet = (w = W, h = H) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};
// the picture taken apart by colour: what is on the paper already, and the three blocks
// (1 the lines and dark stripes, 2 the grey of the sky, 3 the blue body of the wave)
function separate(img) {
  const src = sheet(),
    sx = src.getContext('2d', { willReadFrequently: true });
  sx.drawImage(img, 0, 0, W, H);
  const px = sx.getImageData(0, 0, W, H).data;
  const out = [sheet(), sheet(), sheet(), sheet()],
    ctx = out.map((c) => c.getContext('2d')),
    data = ctx.map((c) => c.createImageData(W, H));
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i],
      g = px[i + 1],
      b = px[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b,
      blue = b - (r + g) / 2;
    // a thin line is ink thinned by the paper around it: bluer than the sky's grey at the
    // same darkness, which is how the two are told apart
    const k = blue > 22 && lum >= 58 && lum < 128 ? 3 : lum < 58 || blue > 12 ? 1 : lum < 176 ? (blue > 26.9 - 0.225 * lum ? 1 : 2) : 0;
    const d = data[k].data;
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 255;
    if (k) {
      // bare paper where a block will print
      const p = data[0].data;
      p[i] = 234;
      p[i + 1] = 223;
      p[i + 2] = 198;
      p[i + 3] = 255;
    }
  }
  ctx.forEach((c, k) => c.putImageData(data[k], 0, 0));
  return out;
}
// a block as it lies there: bare wood, what prints standing proud (pale) and the rest cut
// away (dark), and the whole picture backwards
function wood(layer) {
  const w = 380,
    h = 256,
    c = sheet(w, h),
    x = c.getContext('2d'),
    top = sheet(w, h),
    tx = top.getContext('2d');
  x.fillStyle = '#5f3f24';
  x.fillRect(0, 0, w, h);
  tx.translate(w, 0);
  tx.scale(-1, 1);
  tx.imageSmoothingQuality = 'high';
  tx.drawImage(layer, 0, 0, w, h);
  tx.setTransform(1, 0, 0, 1, 0, 0);
  tx.globalCompositeOperation = 'source-in';
  tx.fillStyle = '#c99b63';
  tx.fillRect(0, 0, w, h);
  x.drawImage(top, 0, 0);
  return c;
}
// the registration marks: a corner and a bar, as on a real block
function marks(c, x, y, colour, wide) {
  c.strokeStyle = colour;
  c.lineWidth = wide;
  c.beginPath();
  c.moveTo(x + W - 46, y + H + 14);
  c.lineTo(x + W + 14, y + H + 14);
  c.lineTo(x + W + 14, y + H - 46);
  c.moveTo(x + 60, y + H + 14);
  c.lineTo(x + 150, y + H + 14);
  c.stroke();
}

export function addTask(world) {
  const ground = (x, z) => world.heightAt(x, z);
  const free = (list) => list.map(([x, z]) => [x, ground(x, z) + 1.5, z]).find((q) => q[1] > 2.3 && !world.blocked(q[0], q[1], q[2])) ?? [list[0][0], Math.max(ground(...list[0]), 1) + 1.5, list[0][1]];
  // the three blocks, where they lie drying (all the same bare wood)
  const lying = [free([[40, 226], [30, 222], [22, 217]]), free([[66, 262], [58, 250], [48, 238]]), free([[-74, 262], [-60, 250], [-44, 234]])].map((at, i) => {
    const g = new THREE.Group(),
      shaft = beam(0xe8d8b0, 50, 0.9);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 1.0), new THREE.MeshBasicMaterial({ color: 0x9a6a3a })), glowSprite(0xe8d8b0, 3.4, 0.6), shaft);
    g.position.set(...at);
    g.visible = false;
    world.scene.add(g);
    return { g, i, got: false };
  });
  const work = { row: 0, picks: [0, 0, 0, 0, 0] };
  let layers = null,
    art = null, // the three blocks as bare wood, to look at
    look = null, // the one just picked up, held up for a while: { i, t }
    failed = false;
  const img = new Image();
  img.onload = () => {
    layers = separate(img);
    art = layers.slice(1).map(wood);
  };
  img.onerror = () => (failed = true);
  const held = (game, i) => {
    const c = game.ui.mini(300, 232, true);
    c.fillStyle = 'rgba(24, 20, 16, 0.94)';
    c.fillRect(0, 0, 300, 232);
    c.drawImage(art[i], 12, 12, 276, 186);
    c.fillStyle = 'rgba(246, 239, 220, 0.75)';
    c.font = '11px Georgia, serif';
    c.textAlign = 'left';
    c.fillText('BARE WOOD, CUT BACKWARDS AS EVERY BLOCK IS', 12, 217);
  };
  // the three of them across the top of the sheet of choices
  const head = {
    h: 152,
    draw(c, x, y, w) {
      const bw = (w - 28) / 3,
        bh = (bw * 256) / 380;
      ['THE LINES', 'THE SKY', 'THE WAVE'].forEach((name, i) => {
        if (art) c.drawImage(art[i], x + i * (bw + 14), y, bw, bh);
        c.fillStyle = 'rgba(246, 239, 220, 0.7)';
        c.font = '12px Georgia, serif';
        c.fillText(name, x + i * (bw + 14), y + bh + 17);
      });
    },
  };
  const task = {
    done: false,
    block: 0, // which block is on the paper
    sheets: 3,
    spoiled: 0,
    pulled: [], // how far out each good pull was pressed: [x, y]
    t: 0,
    flash: 0,
    off: [0, 0],
    stage: 'find', // find -> work -> pull
    ask: ['The blue from across the world! Now we print. Ōi, the blocks!', 'Ah. They are still out drying along the shore road, all three. Fetch them for me.', 'They are bare wood, mind. You will have to look at what is cut on each.'],
    text: () => (task.stage === 'find' ? `Find the three carved blocks · ${lying.filter((b) => b.got).length} of 3` : task.stage === 'work' ? (task.at ? 'Which ink, and in what order?' : 'Bring the blocks to Hokusai') : `Pull the print · block ${Math.min(3, task.block + 1)} of 3: ${BLOCKS[Math.min(2, task.block)].name}`),
    hint: () => (task.stage === 'find' ? 'Three lights stand along the shore road, east and west of the workshop.' : task.stage === 'work' ? 'Look at the print itself, line by line. The lines come first; and the blue you carried back goes on over the dark.' : 'Watch the corner mark, not the wave. The block passes over the true place at its fastest, so press just as the marks close, not when you see them meet.'),
    start() {
      img.src = `${import.meta.env.BASE_URL}paintings/wave.jpg`;
      for (const b of lying) b.g.visible = true;
    },
    update(dt, game, mark) {
      const p = game.player.pos;
      if (look && !task.at) {
        // the block in your hands
        if ((look.t -= dt) > 0 && art) held(game, look.i);
        else {
          look = null;
          game.ui.mini();
        }
      }
      if (task.stage === 'find') {
        for (const b of lying) {
          if (b.got) continue;
          b.g.rotation.y += dt * 0.6;
          mark(b.g.position, '#e8d8b0');
          if (b.g.position.distanceTo(p) > 4.2 + game.player.fly * 3) continue;
          b.got = true;
          b.g.visible = false;
          look = { i: b.i, t: 9 };
          game.stuck = 0;
          game.audio.tone(b.i * 2, 1.2);
          game.ui.fact('A carved block', CUT[b.i], 9000);
        }
        if (lying.every((b) => b.got)) {
          task.stage = 'work';
          game.ui.say('The Curator', 'All three. Take them to Hokusai, at his workshop on the shore.');
        }
        game.refreshObjective();
        return false;
      }
      if (task.stage === 'work') {
        if (!task.at) {
          mark(new THREE.Vector3(-9, ground(-9, 213) + 2, 213), '#fff0c8');
          if (Math.hypot(p.x + 9, p.z - 213) > 5.5) return false;
          task.at = true;
          look = null;
          game.player.frozen = true;
          game.ui.say('Hokusai', 'Good. Now, before any ink touches them: which colour on which block, and in what order?');
          game.refreshObjective();
        }
        if (!dials(game, work, { title: 'Three blocks, one print', rows: WORK, note: 'Decide before the ink goes on. The print itself will tell you.', head })) return false;
        const bad = WORK.filter((r, i) => work.picks[i] !== r.right);
        if (bad.length) {
          game.audio.tone(-4, 0.6, 0.9);
          game.ui.say('Hokusai', `${WORK.length - bad.length} of five right. ${bad[0].wrong}`);
          return false;
        }
        task.stage = 'pull';
        game.ui.say('Hokusai', 'Just so! Now you pull it. Press each block when its marks meet the marks on the paper.');
        game.ui.prompt('Space · press the block');
        game.refreshObjective();
        return false;
      }
      if (failed) return true; // no print to pull without the picture: let the story go on
      const c = game.ui.mini(W + MX * 2, H + MY + 46);
      if (task.block === 3) {
        // pulled: a moment to look at it, every block as far out as it was pressed
        c.drawImage(layers[0], MX, MY);
        task.pulled.forEach((o, k) => c.drawImage(layers[k + 1], MX + o[0], MY + o[1]));
        if ((task.t -= dt) > 0) return false;
        game.ui.mini();
        game.ui.meter(null);
        return true;
      }
      c.fillStyle = '#2a2420';
      c.fillRect(0, 0, c.canvas.width, c.canvas.height);
      c.fillStyle = '#f0e6d0';
      c.font = '15px Georgia, serif';
      c.textAlign = 'left';
      if (!layers) {
        c.fillText('Hokusai is inking the block…', MX, 36);
        return false;
      }
      const b = BLOCKS[task.block];
      task.t += dt;
      const ph = task.t * b.w;
      task.off = [Math.sin(ph) * b.amp, Math.sin(ph * 2) * b.bob];
      // the sheet, what is printed on it so far, and the block passing over it
      c.drawImage(layers[0], MX, MY);
      task.pulled.forEach((o, k) => c.drawImage(layers[k + 1], MX + o[0], MY + o[1]));
      marks(c, MX, MY, '#8a2f2a', 3);
      c.globalAlpha = 0.9;
      c.drawImage(layers[task.block + 1], MX + task.off[0], MY + task.off[1]);
      c.globalAlpha = 1;
      marks(c, MX + task.off[0], MY + task.off[1], '#1c1c2a', 1.6);
      c.fillText(`Block ${task.block + 1} of 3 · ${b.name}`, MX, 36);
      c.textAlign = 'right';
      c.fillText(`${'▮'.repeat(task.sheets)}${'▯'.repeat(3 - task.sheets)}  sheets`, MX + W, 36);
      if (task.flash > 0) {
        task.flash -= dt;
        c.fillStyle = `rgba(160, 40, 30, ${Math.min(0.5, task.flash)})`;
        c.fillRect(MX, MY, W, H);
      }
      game.ui.meter(task.block / 3, `${task.block} of 3 pulled`);
      if (!game.pressed.has('Space')) return false;
      const err = Math.hypot(task.off[0], task.off[1]);
      if (err > b.tol * (1 + MERCY * Math.min(task.spoiled, 6))) {
        // off register: the sheet is spoiled
        task.flash = 0.7;
        task.block = 0;
        task.pulled = [];
        task.sheets--;
        task.spoiled++;
        game.audio.tone(-4, 0.7, 0.9);
        if (task.sheets < 0) {
          task.sheets = 3;
          game.ui.say('Hokusai', 'Ha! Three sheets gone. Never mind: paper is cheaper than blue. Ōi, another stack.');
        } else game.ui.say('Hokusai', `Off by ${err < 40 ? 'a hair' : 'a hand'}! That sheet is spoiled. Again, from the lines.`);
        game.refreshObjective();
        return false;
      }
      task.pulled.push(task.off.slice());
      task.block++;
      task.t = 0.9 + Math.random() * 2; // the next block does not start where this one stopped
      game.audio.tone(task.block * 2, 1.2);
      game.stuck = 0;
      if (task.block < 3) {
        game.ui.say('Hokusai', task.block === 1 ? 'The lines. Good: everything hangs on them.' : 'The grey of the sky. Now the one that matters: the blue.');
        game.refreshObjective();
        return false;
      }
      // the last block is down: off register by so much, all told
      const out = task.pulled.reduce((n, o) => n + Math.hypot(o[0], o[1]), 0);
      game.ui.say('Hokusai', out < 14 ? 'Hardly a hair out anywhere. You have pulled prints before!' : 'A little soft at the edges, but it is a wave. It will do. It will more than do.');
      game.ui.meter(1, '3 of 3 pulled');
      game.ui.prompt('');
      task.t = 2.6;
      return false;
    },
  };
  return (world.task = task);
}
