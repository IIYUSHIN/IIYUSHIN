import { doc, ptext, rng, scanlines, textWidth } from '../lib/svg.mjs';
import { FRAME_A, FRAME_B, spriteSvg } from '../lib/sprite.mjs';
import { T, W } from '../lib/theme.mjs';

/** Ending card: "TO BE CONTINUED" arrow, INSERT COIN blink, character on the skyline. */
export function renderFooter(cfg) {
  const H = 170;
  const r = rng(21);
  let city = '';
  let x = 0;
  while (x < W) {
    const bw = 24 + Math.floor(r() * 6) * 8;
    const bh = 16 + Math.floor(r() * 7) * 8;
    city += `M${x} ${H - bh}h${bw}v${bh}h${-bw}z`;
    x += bw;
  }
  const cs = 3;
  const cx = 60;
  const cy = H - 22 - 36 * cs;
  const tbc = 'TO BE CONTINUED';
  const tw = textWidth(tbc, 3);
  const ax = W - tw - 92;
  const ay = 98;
  // arrow-shaped plate
  const plate = `<path fill="${T.amber}" d="M${ax} ${ay}h${tw + 36}l24 18l-24 18h${-(tw + 36)}z"/>
${ptext(tbc, ax + 16, ay + 8, 3, T.bg)}`;

  const css = `
.blink { animation: bl 1s steps(1) infinite; } @keyframes bl { 50% { opacity: 0; } }
.fa { animation: fa 1s steps(1) infinite; } .fb { animation: fb 1s steps(1) infinite; opacity: 0; }
@keyframes fa { 50% { opacity: 0; } } @keyframes fb { 0% { opacity: 0; } 50% { opacity: 1; } }
.slide { animation: slide 6s cubic-bezier(.2,.8,.2,1) infinite; }
@keyframes slide { 0% { transform: translateX(${W}px); opacity: 1; } 15%, 85% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(0); opacity: 0; } }`;

  const body = `<defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.panel}"/><stop offset="1" stop-color="#1a0f33"/></linearGradient>
<clipPath id="fc"><rect width="${W}" height="${H}" rx="10"/></clipPath></defs>
<g clip-path="url(#fc)">
<rect width="${W}" height="${H}" fill="url(#fg)"/>
<path fill="#140d29" d="${city}"/>
<rect y="${H - 22}" width="${W}" height="22" fill="${T.bg}"/><rect y="${H - 22}" width="${W}" height="2" fill="${T.pink}"/>
<g class="fa">${spriteSvg(FRAME_A, cx, cy, cs)}</g><g class="fb">${spriteSvg(FRAME_B, cx, cy, cs)}</g>
${ptext(cfg.footer.line, 160, 36, 2, T.text)}
${ptext('INSERT COIN TO CONTINUE ▸', 160, 62, 2, T.amber, { cls: 'blink' })}
${ptext('CREDITS 99', 160, 88, 2, T.dim)}
<g class="slide">${plate}</g>
</g>
${scanlines(W, H, 'scanF', 0.14)}
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10" fill="none" stroke="${T.edge}" stroke-width="2"/>`;

  return doc({
    w: W,
    h: H,
    title: 'To be continued',
    desc: `Closing card: the pixel hacker stands on a skyline, "${cfg.footer.line}", INSERT COIN TO CONTINUE blinking, and a TO BE CONTINUED arrow slides in.`,
    css,
    body,
    bg: false,
  });
}
