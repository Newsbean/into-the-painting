// A sheet of choices for a puzzle: a few rows, each with a handful of answers, drawn on the
// minigame sheet (ui.mini). Up/Down (or W/S) moves between rows, Left/Right (or A/D)
// changes the answer, Enter or Space says "that is how it was".
//
//   const st = { row: 0, picks: [0, 0, 0] };                 keep it between frames
//   if (dials(game, st, { title, rows: [{ label, options: [...] }], note })) { ...st.picks... }
//
// Returns true on the frame the player confirms. The player should be frozen meanwhile.
// A puzzle with something to look at while choosing passes head: { h, draw(c, x, y, w) },
// a band h tall between the note and the rows that it draws itself.
const any = (game, codes) => codes.some((c) => game.pressed.has(c));

export function dials(game, st, { title, rows, note = '', head = null }) {
  if (any(game, ['ArrowUp', 'KeyW'])) st.row = (st.row + rows.length - 1) % rows.length;
  if (any(game, ['ArrowDown', 'KeyS'])) st.row = (st.row + 1) % rows.length;
  const n = rows[st.row].options.length;
  if (any(game, ['ArrowLeft', 'KeyA'])) st.picks[st.row] = (st.picks[st.row] + n - 1) % n;
  if (any(game, ['ArrowRight', 'KeyD'])) st.picks[st.row] = (st.picks[st.row] + 1) % n;
  const W = 640,
    top = 96 + (head?.h ?? 0),
    H = top + rows.length * 62 + 46,
    c = game.ui.mini(W, H);
  c.fillStyle = 'rgba(24, 20, 16, 0.94)';
  c.fillRect(0, 0, W, H);
  c.textAlign = 'left';
  c.fillStyle = '#f6efdc';
  c.font = 'italic 24px Georgia, serif';
  c.fillText(title, 28, 44);
  c.font = '13px Georgia, serif';
  c.fillStyle = 'rgba(246, 239, 220, 0.7)';
  c.fillText(note, 28, 70);
  head?.draw(c, 28, 86, W - 56);
  c.textAlign = 'left';
  rows.forEach((r, i) => {
    const y = top + i * 62,
      on = i === st.row;
    if (on) {
      c.fillStyle = 'rgba(240, 210, 122, 0.14)';
      c.fillRect(14, y - 4, W - 28, 54);
    }
    c.fillStyle = on ? '#f0d27a' : 'rgba(246, 239, 220, 0.7)';
    c.font = '12px Georgia, serif';
    c.fillText(r.label.toUpperCase(), 28, y + 14);
    c.fillStyle = '#f6efdc';
    c.font = '19px Georgia, serif';
    c.fillText(`${on ? '‹  ' : ''}${r.options[st.picks[i]]}${on ? '  ›' : ''}`, 28, y + 40);
  });
  c.fillStyle = 'rgba(246, 239, 220, 0.7)';
  c.font = '12px Georgia, serif';
  c.fillText('↑ ↓  choose a line      ← →  change it      Enter  that is how it was', 28, H - 18);
  return any(game, ['Enter', 'Space']);
}
