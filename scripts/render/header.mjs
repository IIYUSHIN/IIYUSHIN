import { doc, ptext, textWidth } from '../lib/svg.mjs';
import { T, W } from '../lib/theme.mjs';

/** Section title bar: "STAGE 0X" chip + title + sweeping scan light. */
export function renderHeader(stage, title, accent = T.cyan) {
  const H = 64;
  const chip = `STAGE ${String(stage).padStart(2, '0')}`;
  const cw = textWidth(chip, 2) + 20;
  const tx = 20 + cw + 18;
  const tw = textWidth(title, 4);
  const lineY = 50;
  const css = `
.sweep { animation: sw 3.6s cubic-bezier(.6,0,.4,1) infinite; }
@keyframes sw { from { transform: translateX(-200px); } to { transform: translateX(${W + 200}px); } }
.blink { animation: bl 1.4s steps(1) infinite; } @keyframes bl { 50% { opacity: 0; } }`;
  const body = `<defs>
<linearGradient id="sg" x1="0" x2="1"><stop offset="0" stop-color="${accent}" stop-opacity="0"/><stop offset=".5" stop-color="${accent}"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></linearGradient>
</defs>
<rect x="20" y="12" width="${cw}" height="26" fill="${accent}"/>
${ptext(chip, 30, 18, 2, T.bg)}
${ptext(title, tx, 11, 4, T.text)}
<rect class="blink" x="${tx + tw + 10}" y="11" width="14" height="28" fill="${accent}"/>
<rect x="20" y="${lineY}" width="${W - 40}" height="2" fill="${T.edge}"/>
<g class="sweep"><rect x="0" y="${lineY - 1}" width="200" height="4" fill="url(#sg)"/></g>
<path fill="${accent}" d="M${W - 20} ${lineY - 6}h-6v-2h8v8h-2zM${W - 40} ${lineY - 8}h8v2h-8z"/>`;
  return doc({
    w: W,
    h: H,
    title: `Stage ${stage}: ${title}`,
    desc: `Section heading: ${title}`,
    css,
    body,
  });
}
