import { doc, ptext, frame, scanlines, rng, textWidth } from '../lib/svg.mjs';
import { T, W } from '../lib/theme.mjs';

const STATUS = {
  classified: { label: 'CLASSIFIED', col: T.red },
  active: { label: 'IN PROGRESS', col: T.pink },
  complete: { label: 'COMPLETE', col: T.lime },
};

const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*@';

/**
 * One quest card. Classified quests run a decrypt-scramble on the title that
 * never resolves, then flash ACCESS DENIED — the project stays private, the
 * flex stays public.
 */
export function renderQuest(cfg, q, index) {
  const H = 132;
  const st = STATUS[q.status] || STATUS.active;
  const secret = q.status === 'classified';
  const tx = 132;
  const r = rng(97 + index * 13);

  // left: quest number block
  const num = String(index + 1).padStart(2, '0');
  let body = `<rect x="20" y="20" width="92" height="92" fill="${T.panel2}"/>
<rect x="20" y="20" width="92" height="92" fill="none" stroke="${st.col}" stroke-width="2"/>
${ptext('QUEST', 66, 34, 2, T.dim, { align: 'middle' })}
${ptext(num, 66, 56, 6, st.col, { align: 'middle' })}`;

  // status chip
  const chipW = textWidth(st.label, 2) + 32;
  body += `<rect x="${tx}" y="20" width="${chipW}" height="24" fill="${st.col}" opacity=".15"/>
<rect class="dot" x="${tx + 8}" y="28" width="8" height="8" fill="${st.col}"/>
${ptext(st.label, tx + 24, 25, 2, st.col)}`;

  const titleY = 56;
  let css = `
.dot { animation: dot 1s steps(1) infinite; } @keyframes dot { 50% { opacity: 0; } }`;

  if (secret) {
    const len = [...q.codename].length;
    const frames = 4;
    for (let f = 0; f < frames; f++) {
      let str = '';
      for (let i = 0; i < len; i++) str += SCRAMBLE[Math.floor(r() * SCRAMBLE.length)];
      body += `<g class="sc sc${f}">${ptext(str, tx, titleY, 4, T.text)}</g>`;
    }
    body += `<g class="sc scR">${ptext(q.codename, tx, titleY, 4, T.text)}</g>`;
    // redacted description bars
    let bars = '';
    let bx = tx;
    while (bx < W - 230) {
      const bw = 24 + Math.floor(r() * 6) * 12;
      bars += `M${bx} 94h${Math.min(bw, W - 230 - bx)}v14h${-Math.min(bw, W - 230 - bx)}z`;
      bx += bw + 12;
    }
    body += `<path fill="${T.faint}" d="${bars}"/>
<g class="shine"><rect x="${tx}" y="92" width="40" height="18" fill="${T.cyan}" opacity=".35"/></g>`;
    // stamp
    body += `<g class="deny"><rect x="${W - 210}" y="52" width="186" height="40" fill="none" stroke="${T.red}" stroke-width="3"/>
${ptext('ACCESS DENIED', W - 117, 65, 2, T.red, { align: 'middle' })}</g>`;
    if (q.teaser) body += ptext(q.teaser, W - 117, 104, 1, T.dim, { align: 'middle' });
    // scramble timing: 4 scramble frames then the redacted codename, loop
    css += `
.sc { opacity: 0; } .scR { opacity: 1; }
${[0, 1, 2, 3].map((f) => `.sc${f} { animation: sc${f} 5s steps(1) infinite; } @keyframes sc${f} { 0% { opacity: 0; } ${70 + f * 4}% { opacity: 1; } ${74 + f * 4}%, 100% { opacity: 0; } }`).join('\n')}
.scR { animation: scR 5s steps(1) infinite; } @keyframes scR { 0% { opacity: 1; } 70%, 86% { opacity: 0; } 86.01%, 100% { opacity: 1; } }
.shine { animation: shine 2.4s linear infinite; } @keyframes shine { from { transform: translateX(0); } to { transform: translateX(${W - 230 - tx - 40}px); } }
.deny { animation: deny 5s steps(1) infinite; } @keyframes deny { 0%, 86% { opacity: 1; } 87% { opacity: 0; } 89% { opacity: 1; } 91% { opacity: 0; } 93%, 100% { opacity: 1; } }`;
  } else {
    body += ptext(q.codename, tx, titleY, 4, T.text);
    if (q.teaser) body += ptext(q.teaser, tx, 96, 2, T.dim);
    if (q.url) body += ptext('OPEN ▸', W - 28, 96, 2, T.cyan, { align: 'end' });
  }

  return doc({
    w: W,
    h: H,
    title: `Quest ${num}: ${secret ? 'classified project' : q.codename}`,
    desc: secret
      ? `Quest ${num} — a private project shown as classified, with a scrambling title and an ACCESS DENIED stamp. ${q.teaser || ''}`
      : `Quest ${num} — ${q.codename}. ${q.teaser || ''} Status: ${st.label}.`,
    css,
    body: `${body}${scanlines(W, H, `scanQ${index}`, 0.12)}${frame(W, H, T.edge, st.col)}`,
  });
}
