import { doc, ptext, frame, scanlines, fmt, textWidth } from '../lib/svg.mjs';
import { T, W } from '../lib/theme.mjs';

// 12x16 pixel flame, three frames. R outer, O mid, Y core, W hot.
const FLAME = [
  [
    '.....R......',
    '.....RR.....',
    '....RRR.....',
    '....ROR..R..',
    '...RROR..RR.',
    '...ROOR.RRR.',
    '..RROORRROR.',
    '..ROOYOOROR.',
    '.RROYYYOOOR.',
    '.ROOYWYYOORR',
    'RROYYWWYYOOR',
    'ROOYWWWWYYOR',
    'ROYYWWWWWYOR',
    'ROYWWWWWWYOR',
    '.ROYWWWWYYR.',
    '..RROOOORR..',
  ],
  [
    '......R.....',
    '.....RR.....',
    '.R...RRR....',
    '.RR..ROR....',
    '.RRR.ROOR...',
    '..ROROOOR...',
    '..ROOOYOR.R.',
    '..ROOYYOORR.',
    '.RROYYYYOOR.',
    '.ROOYWWYYOR.',
    'RROYYWWWYOOR',
    'ROOYWWWWYYOR',
    'ROYYWWWWWYOR',
    'ROYWWWWWWYOR',
    '.ROYWWWWYYR.',
    '..RROOOORR..',
  ],
  [
    '....R.......',
    '....RR...R..',
    '....RRR..R..',
    '...RROR.RR..',
    '...ROORRRR..',
    '..RROOROOR..',
    '..ROOYOOOR..',
    '.RROOYYOORR.',
    '.ROOYYWYOOR.',
    '.ROYYWWYYOR.',
    'RROYWWWWYOOR',
    'ROOYWWWWYYOR',
    'ROYYWWWWWYOR',
    'ROYWWWWWWYOR',
    '.ROYWWWWYYR.',
    '..RROOOORR..',
  ],
];
const FC = { R: T.pink, O: T.amber, Y: '#ffe066', W: '#fff7d6' };

function flame(rows, x, y, s) {
  const by = {};
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const k = row[c];
      if (!FC[k]) continue;
      by[k] = (by[k] || '') + `M${x + c * s} ${y + r * s}h${s}v${s}h${-s}z`;
    }
  });
  return Object.entries(by).map(([k, d]) => `<path fill="${FC[k]}" d="${d}"/>`).join('');
}

const H = 214;

function dateLabel(iso) {
  if (!iso) return '--';
  const [y, m, d] = iso.split('-');
  const mon = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][+m - 1];
  return `${mon} ${+d} ${y}`;
}

export function renderCombo(cfg, stats) {
  const live = Boolean(stats);
  const cur = live ? stats.streak.current : { len: 0 };
  const lng = live ? stats.streak.longest : { len: 0 };
  const fs = 7;
  const fx = 36;
  const fy = 40;
  const flames = FLAME.map((f, i) => `<g class="f${i}">${flame(f, fx, fy, fs)}</g>`).join('');

  const nx = 150;
  const num = live ? String(cur.len) : '--';
  const big = `${ptext('COMBO', nx, 30, 2, T.dim)}
${ptext(num, nx + 4, 54, 10, T.pink)}
${ptext(num, nx, 50, 10, T.amber)}
${ptext(cur.len === 1 ? 'DAY STREAK' : 'DAY STREAK', nx + textWidth(num, 10) + 16, 106, 2, T.text)}
${ptext(live && cur.len ? `${dateLabel(cur.start)} ▸ NOW` : live ? 'START A NEW RUN TODAY' : 'SYNCING...', nx, 136, 2, T.dim)}`;

  const panel = (x, label, val, sub, col) => `<rect x="${x}" y="28" width="196" height="118" fill="${T.panel2}"/>
<rect x="${x}" y="28" width="196" height="3" fill="${col}"/>
${ptext(label, x + 14, 44, 2, T.dim)}
${ptext(val, x + 14, 70, 5, col)}
${ptext(sub, x + 14, 120, 1, T.dim)}`;
  const p1 = panel(W - 436, 'MAX COMBO', live ? `${lng.len}` : '--', live && lng.len ? `${dateLabel(lng.start)} - ${dateLabel(lng.end)}` : '', T.cyan);
  const p2 = panel(W - 224, 'TOTAL HITS', live ? fmt(stats.streak.total) : '--', live ? `ALL-TIME SINCE ${stats.since}` : '', T.lime);

  // last-30-days strip
  let strip = '';
  if (live) {
    const days = stats.last30;
    const max = Math.max(1, ...days.map((d) => d.count));
    const sw = (W - 48) / days.length;
    days.forEach((d, i) => {
      const h = d.count ? 4 + Math.round((d.count / max) * 26) : 2;
      const col = d.count ? (d.count / max > 0.66 ? T.cyan : d.count / max > 0.33 ? T.violet : '#4b2c8f') : T.grid;
      strip += `<rect class="bar" style="animation-delay:${(i * 0.03).toFixed(2)}s" x="${(24 + i * sw).toFixed(1)}" y="${H - 22 - h}" width="${(sw - 3).toFixed(1)}" height="${h}" fill="${col}"/>`;
    });
    strip += ptext('LAST 30 DAYS', 24, H - 14, 1, T.faint);
  }

  const css = `
.f0 { animation: f0 .45s steps(1) infinite; } .f1 { animation: f1 .45s steps(1) infinite; opacity: 0; } .f2 { animation: f2 .45s steps(1) infinite; opacity: 0; }
@keyframes f0 { 0% { opacity: 1; } 33% { opacity: 0; } }
@keyframes f1 { 0% { opacity: 0; } 33% { opacity: 1; } 66% { opacity: 0; } }
@keyframes f2 { 0% { opacity: 0; } 66% { opacity: 1; } }
.glow { animation: gl 1.2s ease-in-out infinite; } @keyframes gl { 50% { opacity: .35; } }
.bar { animation: bar .3s steps(1) backwards; } @keyframes bar { from { opacity: 0; } }`;

  return doc({
    w: W,
    h: H,
    title: `${cfg.name} — contribution streak`,
    desc: live
      ? `Current streak ${cur.len} days. Longest streak ${lng.len} days. ${stats.streak.total} total contributions since ${stats.since}.`
      : 'Contribution streak counter, waiting for its first data sync.',
    css,
    body: `<defs><filter id="fb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter></defs>
<circle class="glow" cx="${fx + 6 * fs}" cy="${fy + 10 * fs}" r="48" fill="${T.amber}" opacity=".5" filter="url(#fb)"/>
${flames}${big}${p1}${p2}${strip}${scanlines(W, H, 'scanC', 0.12)}${frame(W, H, T.edge, T.amber)}`,
  });
}
