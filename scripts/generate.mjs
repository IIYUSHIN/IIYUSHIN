#!/usr/bin/env node
// Generates every profile asset into assets/generated/.
//
//   GITHUB_TOKEN=... GITHUB_USER=<login> node scripts/generate.mjs
//
// Without GITHUB_TOKEN it still renders everything; the live cards show a
// "SYNCING" state instead of numbers. No dependencies — Node 20+ only.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchStats } from './lib/github.mjs';
import { hasGlyph } from './lib/font.mjs';
import { T } from './lib/theme.mjs';
import { renderHero } from './render/hero.mjs';
import { renderBoot } from './render/boot.mjs';
import { renderHeader } from './render/header.mjs';
import { renderPlayer } from './render/player.mjs';
import { renderCombo } from './render/combo.mjs';
import { renderArsenal } from './render/arsenal.mjs';
import { renderQuest } from './render/quest.mjs';
import { renderFooter } from './render/footer.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'generated');

function loadConfig(file) {
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Fail loudly on characters the pixel font can't draw, instead of shipping '?'.
  const strings = [];
  const walk = (v) => {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => k !== 'url' && k !== 'color' && k !== 'rarity' && k !== 'status' && walk(x));
  };
  walk(cfg);
  const bad = new Set();
  for (const s of strings) for (const ch of s) if (!hasGlyph(ch)) bad.add(ch);
  if (bad.size) throw new Error(`profile.config.json uses characters the pixel font can't draw: ${[...bad].map((c) => JSON.stringify(c)).join(' ')}`);
  return cfg;
}

/** Rewrites the quest block in README.md (between markers) so links follow the config. */
function writeQuestLinks(cfg) {
  const readme = path.join(ROOT, 'README.md');
  if (!fs.existsSync(readme)) return;
  const src = fs.readFileSync(readme, 'utf8');
  const START = '<!-- QUESTS:START -->';
  const END = '<!-- QUESTS:END -->';
  const a = src.indexOf(START);
  const b = src.indexOf(END);
  if (a === -1 || b === -1 || b < a) return;
  const safeUrl = (u) => (typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u) ? u : null);
  const block = cfg.quests
    .map((q, i) => {
      const img = `<img src="assets/generated/quest-${i + 1}.svg" width="100%" alt="Quest ${String(i + 1).padStart(2, '0')}${q.status === 'classified' ? ' — classified project' : ''}">`;
      const url = q.status === 'classified' ? null : safeUrl(q.url);
      return url ? `<a href="${url}">${img}</a>` : img;
    })
    .join('\n');
  const next = `${src.slice(0, a + START.length)}\n<p align="center">\n${block}\n</p>\n${src.slice(b)}`;
  if (next !== src) fs.writeFileSync(readme, next);
}

async function main() {
  const cfg = loadConfig(process.env.PROFILE_CONFIG || path.join(ROOT, 'profile.config.json'));
  const token = process.env.GITHUB_TOKEN;
  const login = process.env.GITHUB_USER;

  let stats = null;
  if (process.env.STATS_FIXTURE) {
    stats = JSON.parse(fs.readFileSync(process.env.STATS_FIXTURE, 'utf8'));
  } else if (token && login) {
    stats = await fetchStats(token, login);
    console.log(`synced ${login}: ${stats.streak.total} all-time contributions, streak ${stats.streak.current.len}d`);
  } else {
    console.warn('GITHUB_TOKEN/GITHUB_USER not set — rendering live cards in SYNCING state.');
  }

  fs.mkdirSync(OUT, { recursive: true });
  const files = {
    'hero.svg': renderHero(cfg),
    'boot.svg': renderBoot(cfg),
    'h-player.svg': renderHeader(1, 'PLAYER CARD', T.cyan),
    'player.svg': renderPlayer(cfg, stats),
    'h-combo.svg': renderHeader(2, 'COMBO METER', T.amber),
    'combo.svg': renderCombo(cfg, stats),
    'h-arsenal.svg': renderHeader(3, 'ARSENAL', T.violet),
    'arsenal.svg': renderArsenal(cfg),
    'h-quests.svg': renderHeader(4, 'QUEST LOG', T.pink),
    'h-battle.svg': renderHeader(5, 'BATTLEFIELD', T.lime),
    'footer.svg': renderFooter(cfg),
  };
  cfg.quests.forEach((q, i) => { files[`quest-${i + 1}.svg`] = renderQuest(cfg, q, i); });

  // remove quest cards that no longer exist in config
  for (const f of fs.readdirSync(OUT)) if (/^quest-\d+\.svg$/.test(f) && !files[f]) fs.unlinkSync(path.join(OUT, f));

  for (const [name, svg] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT, name), svg);
  }
  writeQuestLinks(cfg);
  if (stats) fs.writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify(stats, null, 2) + '\n');
  console.log(`wrote ${Object.keys(files).length} files to ${path.relative(process.cwd(), OUT) || OUT}`);
}

main().catch((err) => {
  // Never print the token; error messages here only contain API/user text.
  console.error(`generate failed: ${err.message}`);
  process.exit(1);
});
