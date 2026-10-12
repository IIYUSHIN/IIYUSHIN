// "Y0-SHIN" — original pixel character drawn for this profile (24 x 36).
// Cyber-hood with antenna tips, glowing visor, pink scarf, neon-trim jacket.
// Each char is one pixel; '.' is transparent. Palette keys below.

export const PALETTE = {
  K: '#05040a', // outline
  H: '#2a1f4a', // hood
  h: '#43337a', // hood light
  V: '#19f7ff', // visor
  v: '#0b8f99', // visor shade
  W: '#ffffff', // glint
  M: '#14101f', // mask
  m: '#2a2340', // mask seam
  C: '#ff2e88', // scarf
  c: '#a8155a', // scarf shade
  J: '#1c1631', // jacket
  j: '#30275a', // jacket light
  N: '#19f7ff', // neon trim
  Z: '#ff2e88', // zip
  P: '#120e20', // pants
  p: '#221b3c', // pants light
  B: '#0b0914', // boots
  b: '#ff2e88', // boot stripe
  A: '#9d4dff', // antenna light
};

// Frame A (idle). Frame B differs only in scarf tail + antenna light, so the
// animation is a cheap two-layer swap.
const BASE = [
  '......A..........A......', // 0
  '......K..........K......', // 1
  '.....KhK........KhK.....', // 2
  '.....KhHK......KHhK.....', // 3
  '.....KhHHKKKKKKHHhK.....', // 4
  '....KHhHHHHHHHHHHhHK....', // 5
  '....KHHhHHHHHHHHHHHK....', // 6
  '...KHHhHHHHHHHHHHHHHK...', // 7
  '...KHhHHHHHHHHHHHHHHK...', // 8
  '...KHhHKKKKKKKKKKHHHK...', // 9
  '...KHhKVVVVVVVVVVKHHK...', // 10
  '...KHhKVWVVVVVVWVKHHK...', // 11
  '...KHHKvVVVVVVVVvKHHK...', // 12
  '...KHHKKMMMMMMMMKKHHK...', // 13
  '...KHHHKMMMmmMMMKHHHK...', // 14
  '....KHHKMMMMMMMMKHHK....', // 15
  '....KKCCCCCCCCCCCCKK....', // 16
  '...KCCCcCCCCCCCCcCCCK...', // 17
  '..KJKCCCCCCCCCCCCCCKJK..', // 18
  '.KJjJKKcCCCCCCCcKKJjJK..', // 19
  '.KJjJJJJKNJZZJNKJJJjJK..', // 20
  '.KJjJJJJJNJZZJNJJJJjJK..', // 21
  '.KJjJJJJJNJZZJNJJJJjJK..', // 22
  '.KJjJJJJJNJZZJNJJJJjJK..', // 23
  '.KJjJKKKJNJZZJNJKKKjJK..', // 24
  '.KJjKjjjKNJZZJNKjjjKJK..', // 25
  '.KJJKKKKKNJZZJNKKKKKJK..', // 26
  '..KJJJJJJNJZZJNJJJJJK...', // 27
  '..KNNNNNNNNNNNNNNNNNK...', // 28
  '...KPPPPPPPKKPPPPPPK....', // 29
  '...KPpPPPPPKKPPPPPpK....', // 30
  '...KPpPPPPK..KPPPPpK....', // 31
  '...KPpPPPPK..KPPPPpK....', // 32
  '...KBBBBBBK..KBBBBBK....', // 33
  '..KBbBBBBBK..KBBBBbBK...', // 34
  '..KKKKKKKKK..KKKKKKKK...', // 35
];

// Scarf tail flutter, grown out of the scarf's right edge: { row: [startCol, pixels] }.
const TAIL_A = { // hanging
  17: [20, 'CCK'],
  18: [22, 'CCK'],
  19: [22, 'cCK'],
  20: [22, 'CCK'],
  21: [22, 'cK'],
  22: [22, 'K'],
};
const TAIL_B = { // caught by the wind
  16: [21, 'KKK'],
  17: [20, 'CCCCK'],
  18: [22, 'cCCCK'],
  19: [24, 'cCK'],
  20: [25, 'K'],
};

export const SPRITE_W = 27;
export const SPRITE_H = 36;

function withTail(tail) {
  return BASE.map((row, r) => {
    const t = tail[r];
    const chars = row.padEnd(SPRITE_W, '.').split('');
    if (t) {
      const [start, seg] = t;
      for (let i = 0; i < seg.length; i++) if (seg[i] !== '.') chars[start + i] = seg[i];
    }
    return chars.join('');
  });
}

export const FRAME_A = withTail(TAIL_A);
export const FRAME_B = withTail(TAIL_B);

/** Merge same-colour horizontal runs into one path per colour. */
export function spriteSvg(rows, x, y, s, { crop = null } = {}) {
  const byColor = {};
  const r0 = crop ? crop[0] : 0;
  const r1 = crop ? crop[1] : rows.length;
  for (let r = r0; r < r1; r++) {
    const row = rows[r];
    let c = 0;
    while (c < row.length) {
      const k = row[c];
      if (k === '.' || !PALETTE[k]) { c++; continue; }
      let len = 1;
      while (row[c + len] === k) len++;
      const col = PALETTE[k];
      byColor[col] = (byColor[col] || '') +
        `M${x + c * s} ${y + (r - r0) * s}h${len * s}v${s}h${-len * s}z`;
      c += len;
    }
  }
  return Object.entries(byColor)
    .map(([col, d]) => `<path fill="${col}" d="${d}"/>`)
    .join('');
}
