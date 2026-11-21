// The game of The Great Wave: pull the print.
//
// A print is pressed from carved blocks, one colour at a time, on one sheet: the outline,
// then the pale blue, then the deep blue. Here each block slides over the paper and must
// be pressed (Space) at the moment it sits true, when its corner marks meet the marks on
// the sheet. Press it off register and the sheet is spoiled: a new one, and the outline
// again. The blocks are cut out of the real print (public/paintings/wave.jpg) by colour,
// each faster and less forgiving than the last, and a pull that is only just good enough
// stays on the paper exactly as far out as it was pressed.
const W = 760,
  H = 511, // the print on the sheet
  MX = 40,
  MY = 62; // where it lies on the drawing
const BLOCKS = [
  { name: 'the outline', amp: 150, w: 1.5, bob: 0, tol: 19 },
  { name: 'the pale blue', amp: 150, w: 1.9, bob: 16, tol: 16 },
  { name: 'the deep blue', amp: 160, w: 2.3, bob: 26, tol: 14 },
];

// the picture taken apart by colour: what is left on the paper, and the three blocks
function separate(img) {
  const mk = () => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return c;
  };
  const src = mk(),
    sx = src.getContext('2d', { willReadFrequently: true });
  sx.drawImage(img, 0, 0, W, H);
  const px = sx.getImageData(0, 0, W, H).data;
  const out = [mk(), mk(), mk(), mk()],
    ctx = out.map((c) => c.getContext('2d')),
    data = ctx.map((c) => c.createImageData(W, H));
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i],
      g = px[i + 1],
      b = px[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b,
      blue = b - (r + g) / 2;
    const k = lum < 58 ? 1 : blue > 22 && lum < 128 ? 3 : blue > 12 ? 2 : 0;
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
  let layers = null,
    failed = false;
  const img = new Image();
  img.onload = () => (layers = separate(img));
  img.onerror = () => (failed = true);
  const task = {
    done: false,
    block: 0, // which block is on the paper
    sheets: 3,
    pulled: [], // how far out each good pull was pressed: [x, y]
    t: 0,
    flash: 0,
    off: [0, 0],
    ask: ['The blue from across the world! Ōi, the last block, quickly.', 'No, wait. You pull it. One sheet, three blocks: the outline, the pale blue, the deep blue.', 'Press each one when its marks meet the marks on the paper. Not before, not after!'],
    text: () => `Pull the print · block ${Math.min(3, task.block + 1)} of 3: ${BLOCKS[Math.min(2, task.block)].name}`,
    hint: () => 'Watch the corner mark, not the wave. The block passes over the true place at its fastest, so press just as the marks close, not when you see them meet.',
    start(game) {
      img.src = `${import.meta.env.BASE_URL}paintings/wave.jpg`;
      game.player.frozen = true;
      game.ui.prompt('Space · press the block');
    },
    update(dt, game) {
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
      if (!game.pressed.has('Space') && !game.pressed.has('Enter')) return false;
      const err = Math.hypot(task.off[0], task.off[1]);
      if (err > b.tol) {
        // off register: the sheet is spoiled
        task.flash = 0.7;
        task.block = 0;
        task.pulled = [];
        task.sheets--;
        game.audio.tone(-4, 0.7, 0.9);
        if (task.sheets < 0) {
          task.sheets = 3;
          game.ui.say('Hokusai', 'Ha! Three sheets gone. Never mind: paper is cheaper than blue. Ōi, another stack.');
        } else game.ui.say('Hokusai', `Off by ${err < 40 ? 'a hair' : 'a hand'}! That sheet is spoiled. Again, from the outline.`);
        game.refreshObjective();
        return false;
      }
      task.pulled.push(task.off.slice());
      task.block++;
      task.t = 0.9 + Math.random() * 2; // the next block does not start where this one stopped
      game.audio.tone(task.block * 2, 1.2);
      game.stuck = 0;
      if (task.block < 3) {
        game.ui.say('Hokusai', task.block === 1 ? 'The outline. Good: everything hangs on it.' : 'The pale blue: the sky and the shallows. Now the one that matters.');
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
