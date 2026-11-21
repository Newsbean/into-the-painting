// Cuts the showcase film together from the frames the recorder wrote (src/dev/film.js).
//
//   node tools/film/assemble.mjs [tools/film/cut.json]      needs ffmpeg on the PATH
//
// The cut is a list of clips, in order, joined by straight cuts:
//   { shot, from, frames }            frames of ./capture/film/<shot>/, starting at frame `from` (1 = first)
//   { color, frames }                 a plain card
// and on any clip:
//   overlays: [{ png, in, out, fade }]    ./capture/film/overlay/<png>.png, shown from `in` to `out` seconds
//   fadeIn / fadeOut: { d, color }        the clip itself, from or to a colour
// The score (./capture/film/score.wav, written by film.score()) is laid under the whole of it.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] ?? 'tools/film/cut.json';
const cut = JSON.parse(fs.readFileSync(file, 'utf8'));
const FPS = cut.fps ?? 30,
  [W, H] = cut.size ?? [1920, 1080],
  FILM = 'capture/film';
const sec = (frames) => (frames / FPS).toFixed(4);

const args = ['-y', '-hide_banner', '-loglevel', 'error', '-nostats'];
const graph = [];
let n = 0; // inputs so far
let total = 0;
const ends = [];
cut.clips.forEach((c, i) => {
  if (c.shot) {
    const dir = path.posix.join(FILM, c.shot),
      have = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length : 0,
      from = c.from ?? 1;
    if (have < from + c.frames - 1) throw new Error(`${c.shot}: the cut wants frames ${from} to ${from + c.frames - 1}, there are ${have}`);
    args.push('-framerate', String(FPS), '-start_number', String(from), '-t', sec(c.frames), '-i', `${dir}/%04d.jpg`);
  } else args.push('-f', 'lavfi', '-t', sec(c.frames), '-i', `color=c=${c.color}:s=${W}x${H}:r=${FPS}`);
  let cur = `b${i}`;
  graph.push(`[${n++}:v]scale=${W}:${H},setsar=1,format=yuv444p[${cur}]`);
  (c.overlays ?? []).forEach((o, k) => {
    const f = o.fade ?? 0.4,
      end = o.out ?? c.frames / FPS;
    args.push('-loop', '1', '-framerate', String(FPS), '-t', sec(c.frames), '-i', `${FILM}/overlay/${o.png}.png`);
    const out = o.out === undefined ? '' : `,fade=t=out:st=${(end - f).toFixed(3)}:d=${f}:alpha=1`;
    graph.push(`[${n++}:v]format=rgba,fade=t=in:st=${o.in ?? 0}:d=${f}:alpha=1${out}[o${i}_${k}]`);
    graph.push(`[${cur}][o${i}_${k}]overlay=0:0:format=auto[b${i}_${k}]`);
    cur = `b${i}_${k}`;
  });
  const fades = [];
  if (c.fadeIn) fades.push(`fade=t=in:st=0:d=${c.fadeIn.d}:color=${c.fadeIn.color ?? 'black'}`);
  if (c.fadeOut) fades.push(`fade=t=out:st=${(c.frames / FPS - c.fadeOut.d).toFixed(3)}:d=${c.fadeOut.d}:color=${c.fadeOut.color ?? 'black'}`);
  graph.push(`[${cur}]${fades.length ? fades.join(',') : 'null'}[c${i}]`);
  total += c.frames;
  ends.push(`${(total / FPS).toFixed(2).padStart(6)}  ${c.shot ?? c.color}`);
});
graph.push(`${cut.clips.map((_, i) => `[c${i}]`).join('')}concat=n=${cut.clips.length}:v=1:a=0,format=yuv420p[v]`);

const score = cut.score ?? `${FILM}/score.wav`;
const sound = fs.existsSync(score);
if (sound) args.push('-i', score);
const out = cut.out ?? 'capture/showcase/into-the-painting.mp4';
fs.mkdirSync(path.dirname(out), { recursive: true });
args.push('-filter_complex', graph.join(';'), '-map', '[v]');
// (the score comes out of the game quiet: bring it up to the loudness video sites expect)
if (sound) args.push('-map', `${n}:a`, '-af', `loudnorm=I=${cut.loudness ?? -16}:TP=-1.5:LRA=14`, '-ar', '48000', '-c:a', 'aac', '-b:a', '256k');
args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', String(cut.crf ?? 20), '-maxrate', cut.maxrate ?? '16M', '-bufsize', '32M', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-t', sec(total), '-movflags', '+faststart', out);

console.log(`${cut.clips.length} clips, ${total} frames, ${(total / FPS).toFixed(2)} s${sound ? '' : '  (no score.wav: silent)'}\n  ends at\n${ends.join('\n')}\nencoding (a few minutes)…`);
const r = spawnSync('ffmpeg', args, { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log('wrote', out, `${(fs.statSync(out).size / 1e6).toFixed(1)} MB`);
