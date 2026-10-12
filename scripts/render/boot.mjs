import { doc, ptext, textWidth, scanlines, frame } from '../lib/svg.mjs';
import { ADVANCE } from '../lib/font.mjs';
import { T, W } from '../lib/theme.mjs';

const TAGS = {
  OK: T.lime,
  WARN: T.amber,
  FAIL: T.red,
};

/**
 * Terminal that types its boot log line by line, holds, then loops.
 * Typing = an opaque cover sliding right in character-sized steps, with a
 * block cursor riding its left edge. The cover's *resting* position is fully
 * off the text, so with reduced motion the finished log is shown.
 */
export function renderBoot(cfg) {
  const lines = cfg.boot.lines;
  const s = 2;
  const cw = ADVANCE * s; // 12px per character
  const top = 52;
  const lh = 30;
  const x0 = 28;
  const H = top + lines.length * lh + 24;
  const cycle = 16; // seconds
  const cps = 28; // characters per second
  const gap = 0.35; // pause between lines

  let t = 0.6;
  let css = '';
  let body = '';
  lines.forEach((ln, i) => {
    const y = top + i * lh;
    const prompt = '> ';
    const text = prompt + ln.text;
    const n = [...text].length;
    const w = n * cw;
    const dur = n / cps;
    const a = (t / cycle) * 100;
    const b = ((t + dur) / cycle) * 100;
    const last = i === lines.length - 1;
    css += `
@keyframes ty${i} { 0% { transform: translateX(0); } ${a.toFixed(2)}% { transform: translateX(0); animation-timing-function: steps(${n}, end); } ${b.toFixed(2)}%, 96% { transform: translateX(${w}px); } 96.01%, 100% { transform: translateX(0); } }
.ty${i} { animation: ty${i} ${cycle}s infinite; }
@keyframes cu${i} { 0% { opacity: 0; } ${a.toFixed(2)}% { opacity: 1; } ${b.toFixed(2)}% { opacity: ${last ? 1 : 0}; } 96% { opacity: ${last ? 1 : 0}; } 96.01%, 100% { opacity: 0; } }
.cu${i} { animation: cu${i} ${cycle}s steps(1, end) infinite; opacity: ${last ? 1 : 0}; }`;
    // line text
    body += ptext(prompt, x0, y, s, T.cyan);
    body += ptext(ln.text, x0 + 2 * cw, y, s, last ? T.pink : T.text);
    let tagSvg = '';
    if (ln.tag) {
      const tag = `[ ${ln.tag} ]`;
      const tc = TAGS[ln.tag] || T.cyan;
      const ta = ((t + dur + 0.2) / cycle) * 100;
      css += `
@keyframes tg${i} { 0%, ${ta.toFixed(2)}% { opacity: 0; } ${(ta + 0.01).toFixed(2)}%, 96% { opacity: 1; } 96.01%, 100% { opacity: 0; } }
.tg${i} { animation: tg${i} ${cycle}s steps(1) infinite; }`;
      // dotted leader between text and tag
      const lead0 = x0 + w + cw;
      const lead1 = W - 28 - textWidth(tag, s) - cw;
      let dots = '';
      for (let dx = lead0; dx < lead1; dx += cw) dots += `M${dx + 4} ${y + 12}h2v2h-2z`;
      tagSvg = `<g class="tg${i}"><path fill="${T.faint}" d="${dots}"/>${ptext(tag, W - 28, y, s, tc, { align: 'end' })}</g>`;
    }
    // cover + cursor
    body += `<g class="ty${i}" transform="translate(${w} 0)">
<rect x="${x0 - 2}" y="${y - 4}" width="${W - x0}" height="${lh - 6}" fill="${T.panel}"/>
<g class="cu${i}"><rect${last ? ' class="blk"' : ''} x="${x0}" y="${y - 2}" width="${cw - 2}" height="${7 * s + 4}" fill="${last ? T.pink : T.cyan}"/></g>
</g>${tagSvg}`;
    t += dur + gap + (ln.tag ? 0.3 : 0);
  });
  // last-line cursor blinks forever once typed
  css += `
.blk { animation: blk 1s steps(1) infinite; } @keyframes blk { 50% { opacity: 0; } }`;


  const bar = `<rect x="2" y="2" width="${W - 4}" height="30" rx="8" fill="${T.panel2}"/>
<rect x="2" y="30" width="${W - 4}" height="2" fill="${T.edge}"/>
<rect x="16" y="12" width="10" height="10" fill="${T.pink}"/><rect x="32" y="12" width="10" height="10" fill="${T.amber}"/><rect x="48" y="12" width="10" height="10" fill="${T.lime}"/>
${ptext(cfg.boot.host, W / 2, 11, 2, T.dim, { align: 'middle' })}`;

  return doc({
    w: W,
    h: H,
    title: 'Boot terminal',
    desc: `A retro terminal typing a boot log: ${lines.map((l) => l.text + (l.tag ? ` [${l.tag}]` : '')).join('; ')}.`,
    css,
    body: `${bar}${body}${scanlines(W, H, 'scanB', 0.14)}${frame(W, H)}`,
  });
}
