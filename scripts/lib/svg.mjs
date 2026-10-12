import { textPath, textWidth } from './font.mjs';
import { T } from './theme.mjs';

/** XML-escape any string that came from config or the API. */
export function esc(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Deterministic PRNG (mulberry32) so regenerated art never "jumps". */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pixel-font text as a <path>.
 * align: 'start' | 'middle' | 'end' relative to x.
 */
export function ptext(text, x, y, s, fill, { align = 'start', cls = '', extra = '' } = {}) {
  const str = String(text);
  const w = textWidth(str, s);
  const x0 = align === 'middle' ? x - w / 2 : align === 'end' ? x - w : x;
  const c = cls ? ` class="${cls}"` : '';
  return `<path${c} fill="${fill}" d="${textPath(str, x0, y, s)}"${extra}/>`;
}

export { textWidth };

/**
 * Wrap content in a standalone SVG document.
 * - Every animation is CSS so `prefers-reduced-motion` can switch it off.
 * - Elements are authored so their *resting* (non-animated) state is the
 *   finished frame: with motion disabled the viewer still sees everything.
 * - role/title/desc give screen readers a real description.
 */
export function doc({ w, h, title, desc, css = '', body, bg = true }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t d" shape-rendering="crispEdges">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<style>
${css}
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
${bg ? `<rect width="${w}" height="${h}" rx="10" fill="${T.panel}"/>` : ''}
${body}
</svg>
`;
}

/** Pixel-style card frame: border + notched corners + corner ticks. */
export function frame(w, h, color = T.edge, accent = T.cyan) {
  const t = 10; // tick length
  return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="none" stroke="${color}" stroke-width="2"/>
<path fill="${accent}" d="M8 8h${t}v2h${-t + 2}v${t - 2}h-2zM${w - 8} 8h${-t}v2h${t - 2}v${t - 2}h2zM8 ${h - 8}h${t}v-2h${-t + 2}v${-t + 2}h-2zM${w - 8} ${h - 8}h${-t}v-2h${t - 2}v${-t + 2}h2z"/>`;
}

/** Faint horizontal CRT scanlines over an area. */
export function scanlines(w, h, id = 'scan', opacity = 0.18) {
  return `<defs><pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000"/></pattern></defs>
<rect width="${w}" height="${h}" rx="10" fill="url(#${id})" opacity="${opacity}" pointer-events="none"/>`;
}

/** Compact number: 1234 → 1.2K */
export function fmt(n) {
  if (n == null || Number.isNaN(n)) return '--';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1e4) return Math.round(n / 1e3) + 'K';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}
