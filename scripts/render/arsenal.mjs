import { doc, ptext, frame, scanlines, textWidth } from '../lib/svg.mjs';
import { T, W } from '../lib/theme.mjs';

const RARITY = {
  legendary: { col: T.amber, mark: '★' },
  epic: { col: T.violet, mark: '◆' },
  rare: { col: T.cyan, mark: '' },
};

/** Abbreviation for the item's icon slot: config `abbr`, else initials. */
function abbr(item) {
  if (item.abbr) return String(item.abbr).slice(0, 3).toUpperCase();
  const words = String(item.name).toUpperCase().split(/[\s\-_.]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)) || '??';
}

/**
 * Tech stack as a loot inventory: one row per category, items as chips that
 * wrap. Rarity (legendary/epic/rare) changes the chip colour; legendary chips
 * pulse. Empty categories render as locked slots instead of fake content.
 */
export function renderArsenal(cfg) {
  const s = 2;
  const chipH = 40;
  const gap = 10;
  const left = 24;
  const right = W - 24;
  let y = 24;
  let body = '';
  let delay = 0;

  for (const cat of cfg.arsenal) {
    const accent = T[cat.color] || T.cyan;
    body += `<rect x="${left}" y="${y}" width="6" height="14" fill="${accent}"/>${ptext(cat.category, left + 14, y, 2, accent)}`;
    body += `<rect x="${left + 14 + textWidth(cat.category, 2) + 12}" y="${y + 6}" width="${right - (left + 14 + textWidth(cat.category, 2) + 12)}" height="2" fill="${T.grid}"/>`;
    y += 26;
    let x = left;
    const items = cat.items?.length ? cat.items : null;
    if (!items) {
      for (let i = 0; i < 4; i++) {
        const w = 150;
        body += `<rect x="${x}" y="${y}" width="${w}" height="${chipH}" fill="none" stroke="${T.faint}" stroke-width="2" stroke-dasharray="6 4"/>
${ptext('LOCKED', x + w / 2, y + 13, 2, T.faint, { align: 'middle' })}`;
        x += w + gap;
      }
      y += chipH + 22;
      continue;
    }
    for (const item of items) {
      const r = RARITY[item.rarity] || RARITY.rare;
      const label = String(item.name).toUpperCase() + (r.mark ? ' ' + r.mark : '');
      const w = 44 + textWidth(label, s) + 16;
      if (x + w > right) {
        x = left;
        y += chipH + gap;
      }
      const cls = item.rarity === 'legendary' ? ' class="leg"' : '';
      body += `<g class="pop" style="animation-delay:${(delay += 0.04).toFixed(2)}s">
<rect x="${x}" y="${y}" width="${w}" height="${chipH}" fill="${T.panel2}"/>
<rect${cls} x="${x}" y="${y}" width="${w}" height="${chipH}" fill="none" stroke="${r.col}" stroke-width="2"/>
<rect x="${x + 4}" y="${y + 4}" width="32" height="32" fill="${accent}" opacity=".16"/>
${ptext(abbr(item), x + 20, y + 13, 2, accent, { align: 'middle' })}
${ptext(label, x + 44, y + 13, s, T.text)}
</g>`;
      x += w + gap;
    }
    y += chipH + 22;
  }
  const H = y + 4;
  const css = `
.pop { animation: pop .3s steps(1) backwards; } @keyframes pop { from { opacity: 0; } }
.leg { animation: leg 1.6s ease-in-out infinite; } @keyframes leg { 50% { stroke: ${T.pink}; } }`;
  const names = cfg.arsenal.map((c) => `${c.category}: ${c.items?.length ? c.items.map((i) => i.name).join(', ') : 'locked'}`).join('. ');
  return doc({
    w: W,
    h: H,
    title: `${cfg.name} — arsenal`,
    desc: `Tech stack shown as a game inventory. ${names}.`,
    css,
    body: `${body}${scanlines(W, H, 'scanA', 0.1)}${frame(W, H, T.edge, T.violet)}`,
  });
}
