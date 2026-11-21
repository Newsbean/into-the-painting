// The game of The Scream: breathe.
//
// He cannot paint the sky while it is screaming. Stand with him and breathe: hold Space as
// the ring opens (in), let go as it closes (out), each on the beat. A breath in time
// steadies the sky a little: the ribbons slow, the ground stops swaying. A breath out of
// time, or no breath at all, and the scream comes back. As it steadies the breaths grow
// longer, no two quite the same length, and the beat less forgiving; and when the sky is
// half still his friends turn round and start back up the road.
//
// Nothing here can frighten: there is no losing, only the sky taking longer to settle.
const STEP = 1 / 7; // what one good breath is worth

// the moment in a list nearest to t, between lo and hi (or null)
function nearest(list, t, lo, hi) {
  let best = null;
  for (const x of list) if (x >= lo && x <= hi && (best === null || Math.abs(x - t) < Math.abs(best - t))) best = x;
  return best;
}

export function addTask(world, { H, back }) {
  const fr = world.friends;
  const walk = (dt, gx, gz, speed) => {
    const dx = gx - fr.x,
      dz = gz - fr.z,
      d = Math.hypot(dx, dz);
    if (d > 0.05) {
      const s = Math.min(d, speed * dt);
      fr.x += (dx / d) * s;
      fr.z += (dz / d) * s;
      fr.ry = Math.atan2(dx, dz);
      fr.step += s * 2.6;
    }
    fr.mesh.position.set(fr.x, world.groundAt(fr.x, fr.z, H(fr.x, fr.z) + 3) + Math.abs(Math.sin(fr.step)) * 0.03, fr.z);
    fr.mesh.rotation.y = fr.ry;
  };
  const task = {
    done: false,
    calm: 0, // 0 the scream .. 1 still
    clock: 0,
    from: 1.6, // when the breath we are in began (the first after a moment to get ready)
    T: 2.9, // how long it lasts
    win: 0.42, // how near the beat a press or a letting-go must fall
    presses: [],
    releases: [],
    was: false,
    word: 'Ready',
    glow: 0,
    ask: ['Yes. These are the words.', 'But look at it. I cannot paint a sky that will not hold still.', 'Stand here with me a while. Breathe as I breathe. Slowly.'],
    text: () => 'Breathe with him until the sky is still',
    hint: () => 'Hold Space while the ring opens, and let go as it closes. Watch the ring, not the clock: no two breaths are the same length.',
    start(game) {
      game.hold(game.viewPose(world), 2.4);
      game.ui.prompt('Hold Space · breathe in     let go · breathe out');
    },
    update(dt, game) {
      task.clock += dt;
      const held = game.keys.has('Space');
      if (held && !task.was) task.presses.push(task.clock);
      if (!held && task.was) task.releases.push(task.clock);
      task.was = held;
      const s = task.from,
        T = task.T;
      if (task.clock >= s + T) {
        // the breath is over: was it in time?
        const down = nearest(task.presses, s, s - T / 4, s + T / 2),
          up = nearest(task.releases, s + T / 2, s + T / 8, s + T);
        const inErr = down === null ? null : down - s,
          outErr = up === null ? null : up - (s + T / 2);
        const inOk = inErr !== null && Math.abs(inErr) < task.win,
          outOk = outErr !== null && Math.abs(outErr) < task.win;
        if (inOk && outOk) {
          task.calm = Math.min(1, task.calm + STEP);
          task.word = 'In time';
          task.glow = 1;
          game.audio.tone(Math.round(task.calm * 7), 2.2, 0.8);
          game.stuck = 0;
        } else {
          if ((down === null && up === null) || (!inOk && !outOk)) task.calm = Math.max(0, task.calm - STEP / 2);
          task.word = !inOk ? (inErr === null ? 'Hold Space as it opens' : inErr > 0 ? 'In: a little late' : 'In: a little early') : outErr === null ? 'Let go as it closes' : outErr > 0 ? 'Out: a little late' : 'Out: a little early';
          task.glow = -1;
        }
        // the next breath: longer as the sky steadies, and never quite the length of the last
        task.from = s + T;
        task.T = (2.9 + 2.5 * task.calm) * (1 + (Math.random() - 0.5) * 0.3 * Math.min(1, task.calm * 2));
        task.win = 0.42 - 0.2 * task.calm;
        task.presses = task.presses.filter((x) => x > task.from - 3);
        task.releases = task.releases.filter((x) => x > task.from - 3);
      }
      task.glow *= Math.exp(-dt * 1.6);
      world.calm = task.calm * 0.9;
      // when the sky is half still, his friends turn round
      if (task.calm > 0.45) walk(dt, back[0], back[1], 2.4);

      // the ring: at the inner circle a breath begins, at the outer it turns
      const S = 300,
        c = game.ui.mini(S, S + 40, true), // to one side: his face is in the middle of the picture
        u = Math.max(0, (task.clock - task.from) / task.T),
        open = u < 0.5 ? u * 2 : 2 - u * 2,
        r0 = 34,
        r1 = 128;
      c.clearRect(0, 0, S, S + 40);
      c.lineWidth = 2;
      c.strokeStyle = 'rgba(246, 239, 220, 0.5)';
      for (const r of [r0, r1]) {
        c.beginPath();
        c.arc(S / 2, S / 2, r, 0, 6.2832);
        c.stroke();
      }
      c.lineWidth = 7;
      c.strokeStyle = task.glow > 0.05 ? `rgba(255, 217, 138, ${0.75 + 0.25 * task.glow})` : task.glow < -0.05 ? `rgba(224, 120, 90, ${0.8 - 0.2 * task.glow})` : 'rgba(246, 239, 220, 0.92)';
      c.beginPath();
      c.arc(S / 2, S / 2, r0 + (r1 - r0) * open, 0, 6.2832);
      c.stroke();
      c.fillStyle = 'rgba(246, 239, 220, 0.95)';
      c.textAlign = 'center';
      c.font = 'italic 26px Georgia, serif';
      c.fillText(task.clock < task.from ? '' : u < 0.5 ? 'in' : 'out', S / 2, S / 2 + 9);
      c.font = '13px Georgia, serif';
      c.fillText(task.word, S / 2, S + 26);
      game.ui.meter(task.calm, `${Math.round(task.calm * 100)}% still`);
      if (task.calm < 1) return false;
      game.ui.mini();
      game.ui.meter(null);
      game.ui.prompt('');
      return true;
    },
  };
  // once the sky is still they come and stand where the picture has them
  world.tickers.push((dt) => {
    if (task.done) walk(dt, back[0], back[1], 2.6);
  });
  return (world.task = task);
}
