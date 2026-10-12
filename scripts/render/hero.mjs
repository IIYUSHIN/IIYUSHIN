import { doc, ptext, rng, scanlines } from '../lib/svg.mjs';
import { FRAME_A, FRAME_B, spriteSvg } from '../lib/sprite.mjs';
import { T, W } from '../lib/theme.mjs';

const H = 320;

/** Seamless skyline tile (width W) — drawn twice and scrolled for parallax. */
function skyline(seed, base, minH, maxH, color, edgeColor, winColors, winChance, flicker) {
  const r = rng(seed);
  let x = 0;
  let bld = '';
  let edge = '';
  let wins = '';
  let flick = '';
  while (x < W) {
    const bw = 28 + Math.floor(r() * 7) * 8; // multiples of 8 keep pixel grid
    const bh = minH + Math.floor(r() * ((maxH - minH) / 8)) * 8;
    const w = Math.min(bw, W - x);
    const top = base - bh;
    bld += `M${x} ${top}h${w}v${bh}h${-w}z`;
    edge += `M${x} ${top}h${w}v2h${-w}z`;
    if (r() < 0.35 && w > 30) { // antenna
      const ax = x + 8 + Math.floor(r() * ((w - 16) / 4)) * 4;
      bld += `M${ax} ${top - 12}h4v12h-4z`;
    }
    const lit = r() < 0.7; // some towers are fully dark
    for (let wy = top + 8; wy < base - 8; wy += 12) {
      const floorOn = r() < 0.55;
      for (let wx = x + 6; wx < x + w - 8; wx += 10) {
        if (lit && floorOn && r() < winChance) {
          const col = winColors[Math.floor(r() * winColors.length)];
          const rect = `<rect x="${wx}" y="${wy}" width="4" height="4" fill="${col}"`;
          if (flicker && r() < 0.06) flick += `${rect} class="fl${1 + Math.floor(r() * 3)}"/>`;
          else wins += `${rect}/>`;
        }
      }
    }
    x += w + (r() < 0.3 ? 8 : 0);
  }
  const tile = `<path fill="${color}" d="${bld}"/><path fill="${edgeColor}" d="${edge}"/>${wins}${flick}`;
  return `${tile}<g transform="translate(${W} 0)">${tile}</g>`;
}

function stars() {
  const r = rng(7);
  let s = '';
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * W / 4) * 4;
    const y = Math.floor(r() * 150 / 4) * 4 + 6;
    const size = r() < 0.15 ? 4 : 2;
    const cls = r() < 0.5 ? ` class="tw${1 + Math.floor(r() * 3)}"` : '';
    s += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${r() < 0.2 ? T.cyan : '#cfc8ff'}"${cls}/>`;
  }
  return s;
}

function moon(cx, cy, rad) {
  let d = '';
  let shade = '';
  const p = 4;
  for (let y = -rad; y < rad; y += p) {
    for (let x = -rad; x < rad; x += p) {
      if (x * x + y * y <= rad * rad) {
        const cell = `M${cx + x} ${cy + y}h${p}v${p}h${-p}z`;
        // crescent-ish shading on the lower-left
        if ((x + rad * 0.35) ** 2 + (y - rad * 0.2) ** 2 < (rad * 0.42) ** 2 || (x - 12) ** 2 + (y + 14) ** 2 < 49) shade += cell;
        else d += cell;
      }
    }
  }
  return `<circle cx="${cx}" cy="${cy}" r="${rad + 18}" fill="${T.pink}" opacity="0.18" filter="url(#blur)"/>
<path fill="#ffb3d6" d="${d}"/><path fill="#e07aab" d="${shade}"/>`;
}

function rain() {
  const r = rng(11);
  let a = '';
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * (W + 80) / 2) * 2;
    const y = Math.floor(r() * H);
    const len = 6 + Math.floor(r() * 3) * 2;
    a += `M${x} ${y}h2v${len}h-2z`;
  }
  // tile vertically so the loop is seamless
  return `<g class="rain"><path fill="#9ff8ff" opacity="0.28" d="${a}"/><path fill="#9ff8ff" opacity="0.28" transform="translate(0 ${-H})" d="${a}"/></g>`;
}

function holo(x, y) {
  const r = rng(5);
  let lines = '';
  for (let i = 0; i < 14; i++) {
    const w = 12 + Math.floor(r() * 9) * 6;
    const col = r() < 0.25 ? T.pink : T.cyan;
    lines += `<rect x="${x + 8 + (r() < 0.3 ? 8 : 0)}" y="${y + 8 + i * 8}" width="${w}" height="3" fill="${col}" opacity="0.85"/>`;
  }
  const w = 104;
  const h = 74;
  return `<g class="holo">
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${T.cyan}" opacity="0.08"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${T.cyan}" stroke-width="2" opacity="0.7"/>
<clipPath id="hc"><rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}"/></clipPath>
<g clip-path="url(#hc)"><g class="code">${lines}<g transform="translate(0 112)">${lines}</g></g></g>
<path fill="${T.cyan}" opacity="0.5" d="M${x + w} ${y + h}l20 26h-2l-20 -26z"/>
</g>`;
}

export function renderHero(cfg) {
  const name = cfg.name;
  // logo pixel size: as big as fits in ~430px, capped at 11
  const s = Math.max(5, Math.min(11, Math.floor(430 / ([...name].length * 6 - 1))));
  const lx = 48;
  const ly = 78;
  const logo = (fill, dx = 0) => ptext(name, lx + dx, ly, s, fill);
  const cs = 5;
  const charX = 690;
  const charY = 294 - 36 * cs;

  const css = `
.far { animation: scroll 120s linear infinite; }
.near { animation: scroll 60s linear infinite; }
@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-${W}px); } }
.rain { animation: fall .7s linear infinite; }
@keyframes fall { from { transform: translate(0, 0); } to { transform: translate(-30px, ${H}px); } }
.tw1 { animation: tw 2.4s steps(2) infinite; } .tw2 { animation: tw 3.1s steps(2) infinite .7s; } .tw3 { animation: tw 1.7s steps(2) infinite 1.3s; }
@keyframes tw { 50% { opacity: .15; } }
.fl1 { animation: fl 3s steps(1) infinite; } .fl2 { animation: fl 4.3s steps(1) infinite 1s; } .fl3 { animation: fl 2.2s steps(1) infinite .4s; }
@keyframes fl { 0%, 60% { opacity: 1; } 61%, 70% { opacity: 0; } 71% { opacity: 1; } 85% { opacity: .2; } }
.gp { animation: gp 4s steps(1) infinite; } .gc { animation: gc 4s steps(1) infinite; }
@keyframes gp { 0%, 86% { transform: translate(4px, 0); } 87% { transform: translate(-10px, 2px); } 89% { transform: translate(12px, -2px); } 91%, 100% { transform: translate(4px, 0); } }
@keyframes gc { 0%, 86% { transform: translate(-4px, 0); } 87% { transform: translate(9px, 0); } 89% { transform: translate(-12px, 2px); } 91%, 100% { transform: translate(-4px, 0); } }
.s1 { animation: s1 4s steps(1) infinite; } .s2 { animation: s2 4s steps(1) infinite; }
@keyframes s1 { 0%, 87% { opacity: 0; } 88% { opacity: 1; transform: translateX(22px); } 90%, 100% { opacity: 0; } }
@keyframes s2 { 0%, 88% { opacity: 0; } 89% { opacity: 1; transform: translateX(-18px); } 91%, 100% { opacity: 0; } }
.s1, .s2 { opacity: 0; }
.fa { animation: fa 1s steps(1) infinite; } .fb { animation: fb 1s steps(1) infinite; }
@keyframes fa { 50% { opacity: 0; } } @keyframes fb { 0% { opacity: 0; } 50% { opacity: 1; } }
.fb { opacity: 0; }
.breath { animation: br 2s steps(1) infinite; } @keyframes br { 50% { transform: translateY(4px); } }
.visor { animation: vs 2.6s ease-in-out infinite; } @keyframes vs { 50% { opacity: .25; } }
.code { animation: code 6s linear infinite; } @keyframes code { to { transform: translateY(-112px); } }
.holo { animation: hl 5s steps(1) infinite; } @keyframes hl { 0%, 93% { opacity: 1; } 94% { opacity: .3; } 95% { opacity: 1; } 96% { opacity: .5; } 97% { opacity: 1; } }
.blink { animation: bl 1.2s steps(1) infinite; } @keyframes bl { 50% { opacity: 0; } }
`;

  const body = `<defs>
<clipPath id="card"><rect width="${W}" height="${H}" rx="10"/></clipPath>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#170b33"/><stop offset=".6" stop-color="#0b0718"/><stop offset="1" stop-color="${T.bg}"/></linearGradient>
<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="glow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="b1"><rect x="0" y="${ly + 2 * s}" width="${W}" height="${s}"/></clipPath>
<clipPath id="b2"><rect x="0" y="${ly + 5 * s}" width="${W}" height="${s}"/></clipPath>
<linearGradient id="band" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${T.bg}" stop-opacity=".85"/><stop offset=".55" stop-color="${T.bg}" stop-opacity=".6"/><stop offset="1" stop-color="${T.bg}" stop-opacity="0"/></linearGradient>
<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
</defs>
<g clip-path="url(#card)">
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${stars()}
${moon(560, 82, 40)}
<g class="far">${skyline(3, 270, 70, 170, '#1a1338', '#2c2257', ['#3b2f6b', '#4a3c85'], 0.5, false)}</g>
<g class="near">${skyline(9, 300, 40, 130, '#100c24', '#3a2d6e', [T.cyan, T.pink, T.amber, '#6a5bb0'], 0.45, true)}</g>
${rain()}
<!-- rooftop ledge -->
<path fill="#0f0b1e" d="M600 294h240v26h-240z"/><path fill="${T.pink}" d="M600 294h240v2h-240z"/>
<path fill="#1b1533" d="M616 302h8v18h-8zM800 302h8v18h-8z"/>
${holo(548, 150)}
<!-- character: two frames swapped for scarf flutter, plus a breathing bob -->
<g class="breath">
<g class="fa">${spriteSvg(FRAME_A, charX, charY, cs)}</g>
<g class="fb">${spriteSvg(FRAME_B, charX, charY, cs)}</g>
<rect class="visor" x="${charX + 7 * cs}" y="${charY + 10 * cs}" width="${10 * cs}" height="${3 * cs}" fill="${T.cyan}" filter="url(#blur)" opacity=".9"/>
</g>
<rect x="0" y="${ly + 7 * s + 10}" width="620" height="${62}" fill="url(#band)"/>
<!-- logo: chromatic split + slice glitch -->
<g class="gp" opacity=".85">${logo(T.pink)}</g>
<g class="gc" opacity=".85">${logo(T.cyan)}</g>
<g filter="url(#glow)">${logo('#f4f2ff')}</g>
<g clip-path="url(#b1)"><g class="s1">${logo(T.cyan)}</g></g>
<g clip-path="url(#b2)"><g class="s2">${logo(T.pink)}</g></g>
${ptext(cfg.hero.ticker, lx, ly + 7 * s + 22, 2, T.cyan)}
${ptext(cfg.hero.tagline, lx, ly + 7 * s + 44, 2, T.text)}
${ptext('▸ SCROLL TO START', lx, 276, 2, T.amber, { cls: 'blink' })}
<!-- HUD -->
${ptext(cfg.hero.hud, 20, 18, 2, T.dim)}
<rect class="blink" x="${W - 118}" y="18" width="8" height="14" fill="${T.red}"/>
${ptext('ONLINE', W - 20, 18, 2, T.lime, { align: 'end' })}
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</g>
${scanlines(W, H, 'scanH', 0.22)}
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10" fill="none" stroke="${T.edge}" stroke-width="2"/>`;

  return doc({
    w: W,
    h: H,
    title: `${name} — animated pixel-art banner`,
    desc: `A rainy neon night city scrolls behind a glitching pixel logo reading ${name}, with an original hooded hacker character standing on a rooftop next to a floating hologram screen. Tagline: ${cfg.hero.tagline}`,
    css,
    body,
    bg: false,
  });
}

