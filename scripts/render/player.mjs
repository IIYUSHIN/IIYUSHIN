import { doc, ptext, frame, scanlines, fmt } from '../lib/svg.mjs';
import { FRAME_A, spriteSvg } from '../lib/sprite.mjs';
import { levelFor, rankFor } from '../lib/github.mjs';
import { T, W } from '../lib/theme.mjs';

const H = 318;

/** RPG character sheet built from live GitHub stats (or a SYNCING state when stats is null). */
export function renderPlayer(cfg, stats) {
  const live = Boolean(stats);
  const total = live ? stats.streak.total : 0;
  const lv = levelFor(total);
  const rank = live ? rankFor(lv.level) : '???';

  // ---- portrait --------------------------------------------------------
  const px = 24;
  const py = 24;
  const pw = 180;
  const ph = 180;
  const ps = 6;
  const crop = [0, 23];
  const sx = px + (pw - 27 * ps) / 2 + 6;
  const sy = py + 8;
  let grid = '';
  for (let g = px + 12; g < px + pw; g += 12) grid += `M${g} ${py}h1v${ph}h-1z`;
  for (let g = py + 12; g < py + ph; g += 12) grid += `M${px} ${g}h${pw}v1h${-pw}z`;
  const portrait = `<clipPath id="pc"><rect x="${px}" y="${py}" width="${pw}" height="${ph}"/></clipPath>
<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="${T.panel2}"/>
<g clip-path="url(#pc)"><path fill="${T.grid}" d="${grid}"/>
<circle cx="${px + pw / 2}" cy="${py + 70}" r="70" fill="${T.violet}" opacity=".18"/>
<g class="bob">${spriteSvg(FRAME_A, sx, sy, ps, { crop })}</g>
<rect class="scanbar" x="${px}" y="${py}" width="${pw}" height="6" fill="${T.cyan}" opacity=".18"/></g>
<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="${T.cyan}" stroke-width="2"/>
<rect x="${px}" y="${py + ph - 34}" width="${pw}" height="34" fill="${T.bg}" opacity=".85"/>
${ptext(`LV.${live ? lv.level : '--'}`, px + pw / 2, py + ph - 27, 3, T.amber, { align: 'middle' })}`;

  // ---- identity + XP ----------------------------------------------------
  const ix = 232;
  let y = 26;
  const ident = `${ptext(cfg.name, ix, y, 5, T.text)}
${ptext('CLASS ▸ ' + cfg.player.class, ix, y + 48, 2, T.cyan)}
${ptext('RANK  ▸ ' + rank, ix, y + 70, 2, T.pink)}`;
  y += 98;
  const barW = W - ix - 28;
  const blocks = 48;
  const bw = barW / blocks;
  const filled = live ? Math.max(1, Math.round(lv.progress * blocks)) : 0;
  let xp = '';
  for (let i = 0; i < blocks; i++) {
    const on = i < filled;
    xp += `<rect${on ? ` class="xb" style="animation-delay:${(i * 0.035).toFixed(3)}s"` : ''} x="${(ix + i * bw).toFixed(1)}" y="${y + 18}" width="${(bw - 3).toFixed(1)}" height="14" fill="${on ? T.lime : T.grid}"/>`;
  }
  const xpLabel = live ? `XP ${total.toLocaleString('en-US')} / ${lv.next.toLocaleString('en-US')}` : 'XP SYNCING...';
  const nextLabel = live ? `NEXT ▸ LV.${lv.level + 1}` : '';
  xp = `${ptext(xpLabel, ix, y, 2, T.dim)}${ptext(nextLabel, W - 28, y, 2, T.dim, { align: 'end' })}${xp}`;

  // ---- stat grid ----------------------------------------------------------
  y += 50;
  const cells = [
    ['CONTRIBS 1Y', live ? stats.last12.contributions : null, T.cyan],
    ['COMMITS 1Y', live ? stats.last12.commits : null, T.text],
    ['PRS 1Y', live ? stats.last12.prs : null, T.text],
    ['REVIEWS 1Y', live ? stats.last12.reviews : null, T.text],
    ['STARS', live ? stats.stars : null, T.amber],
    ['REPOS', live ? stats.repos : null, T.text],
    ['FOLLOWERS', live ? stats.followers : null, T.pink],
    ['SINCE', live ? stats.since : null, T.violet],
  ];
  const cols = 4;
  const cwid = barW / cols;
  let grid2 = '';
  cells.forEach(([label, val, col], i) => {
    const cx = ix + (i % cols) * cwid;
    const cy = y + Math.floor(i / cols) * 58;
    const shown = typeof val === 'string' ? val : fmt(val);
    grid2 += `<rect x="${cx}" y="${cy}" width="${cwid - 8}" height="50" fill="${T.panel2}"/>
<rect x="${cx}" y="${cy}" width="3" height="50" fill="${col}"/>
${ptext(label, cx + 12, cy + 8, 2, T.dim)}
${ptext(shown, cx + 12, cy + 26, 3, col)}`;
  });

  const foot = ptext(live ? `SYNCED ${stats.synced} · AUTO-UPDATES DAILY · 1Y = LAST 12 MONTHS${stats.last12.private ? ' · INCL. PRIVATE WORK' : ''}` : 'AWAITING FIRST SYNC · RUN THE WORKFLOW', 24, H - 22, 1, T.dim);

  const css = `
.xb { animation: xb .25s steps(1) backwards; } @keyframes xb { from { opacity: 0; } }
.bob { animation: bob 2s steps(1) infinite; } @keyframes bob { 50% { transform: translateY(6px); } }
.scanbar { animation: sb 3s linear infinite; } @keyframes sb { from { transform: translateY(-6px); } to { transform: translateY(186px); } }`;

  return doc({
    w: W,
    h: H,
    title: `${cfg.name} — player card`,
    desc: live
      ? `RPG-style stat sheet. Level ${lv.level}, rank ${rank}. ${stats.last12.contributions} contributions in the last 12 months, ${stats.last12.commits} commits, ${stats.last12.prs} pull requests, ${stats.stars} stars, ${stats.repos} public repos, ${stats.followers} followers. ${total} contributions all-time.`
      : 'RPG-style stat sheet, waiting for its first data sync.',
    css,
    body: `${portrait}${ident}${xp}${grid2}${foot}${scanlines(W, H, 'scanP', 0.12)}${frame(W, H)}`,
  });
}
