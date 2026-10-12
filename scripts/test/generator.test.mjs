// Runs in CI before every render (`node --test "scripts/test/*.test.mjs"`). Zero dependencies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { computeStreaks, levelFor, rankFor } from '../lib/github.mjs';
import { esc } from '../lib/svg.mjs';
import { hasGlyph, textWidth, missing } from '../lib/font.mjs';
import { renderHero } from '../render/hero.mjs';
import { renderBoot } from '../render/boot.mjs';
import { renderHeader } from '../render/header.mjs';
import { renderPlayer } from '../render/player.mjs';
import { renderCombo } from '../render/combo.mjs';
import { renderArsenal } from '../render/arsenal.mjs';
import { renderQuest } from '../render/quest.mjs';
import { renderFooter } from '../render/footer.mjs';

const day = (date, count) => ({ date, count });

test('current streak counts back from today', () => {
  const days = [day('2026-01-01', 0), day('2026-01-02', 3), day('2026-01-03', 1), day('2026-01-04', 2)];
  const s = computeStreaks(days, '2026-01-04');
  assert.equal(s.current.len, 3);
  assert.equal(s.current.start, '2026-01-02');
  assert.equal(s.total, 6);
});

test('today with zero contributions is a grace day', () => {
  const days = [day('2026-01-01', 1), day('2026-01-02', 1), day('2026-01-03', 0)];
  assert.equal(computeStreaks(days, '2026-01-03').current.len, 2);
});

test('a missed yesterday breaks the streak', () => {
  const days = [day('2026-01-01', 1), day('2026-01-02', 0), day('2026-01-03', 0)];
  assert.equal(computeStreaks(days, '2026-01-03').current.len, 0);
});

test('longest streak is tracked across gaps', () => {
  const days = [day('a1', 1), day('a2', 1), day('a3', 1), day('a4', 0), day('a5', 1)].map((d, i) => ({ ...d, date: `2026-02-0${i + 1}` }));
  const s = computeStreaks(days, '2026-02-05');
  assert.equal(s.longest.len, 3);
  assert.equal(s.longest.end, '2026-02-03');
  assert.equal(s.current.len, 1);
});

test('future days are ignored', () => {
  const days = [day('2026-03-01', 1), day('2026-03-02', 5)];
  assert.equal(computeStreaks(days, '2026-03-01').total, 1);
});

test('level curve is monotonic and progress is in [0,1)', () => {
  let prev = 0;
  for (const n of [0, 1, 4, 5, 19, 20, 500, 1690, 99999]) {
    const l = levelFor(n);
    assert.ok(l.level >= prev);
    assert.ok(l.progress >= 0 && l.progress < 1, `progress for ${n}`);
    assert.ok(n >= l.floor && n < l.next);
    prev = l.level;
  }
  assert.equal(rankFor(1), 'INITIATE');
  assert.equal(rankFor(50), 'MYTHIC');
});

test('XML escaping covers every special char', () => {
  assert.equal(esc(`<a href="x">&'</a>`), '&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;');
});

test('font: width math and glyph coverage', () => {
  assert.equal(textWidth('AB', 2), (12 - 1) * 2);
  for (const ch of 'ABCXYZ0123456789 .:-/>[]★◆█▸') assert.ok(hasGlyph(ch), ch);
});

test('every renderer outputs a sane standalone SVG (with and without live data)', () => {
  const cfg = JSON.parse(fs.readFileSync(new URL('../../profile.config.json', import.meta.url), 'utf8'));
  const stats = {
    login: 't', synced: '2026-10-12', since: '2024', followers: 1, repos: 2, stars: 3,
    last12: { contributions: 10, commits: 5, prs: 1, issues: 1, reviews: 0, private: 0 },
    streak: { current: { len: 2, start: '2026-10-11', end: '2026-10-12' }, longest: { len: 4, start: '2026-01-01', end: '2026-01-04' }, total: 40 },
    last30: Array.from({ length: 30 }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, count: i % 3 })),
  };
  const out = [
    renderHero(cfg), renderBoot(cfg), renderHeader(1, 'TEST'), renderArsenal(cfg), renderFooter(cfg),
    renderPlayer(cfg, null), renderPlayer(cfg, stats), renderCombo(cfg, null), renderCombo(cfg, stats),
    ...cfg.quests.map((q, i) => renderQuest(cfg, q, i)),
  ];
  for (const svg of out) {
    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.trimEnd().endsWith('</svg>'));
    assert.ok(!/undefined|NaN|\[object Object\]/.test(svg), 'no leaked JS values');
    assert.ok(!/<script|foreignObject|href="http/.test(svg), 'no scripts or external resources');
    assert.ok(Buffer.byteLength(svg) < 400_000, 'stays light');
  }
  assert.deepEqual([...missing], [], 'every drawn character exists in the pixel font');
});

test('fetchStats parses the GraphQL responses end-to-end (mocked network)', async () => {
  const { fetchStats } = await import('../lib/github.mjs');
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (_url, opts) => {
    const body = JSON.parse(opts.body);
    calls.push(body);
    let data;
    if (body.query.includes('repositories(')) {
      const page2 = body.variables.after === 'c1';
      data = { user: {
        createdAt: '2025-06-01T00:00:00Z',
        followers: { totalCount: 7 },
        repositories: { totalCount: 3, pageInfo: { hasNextPage: !page2, endCursor: 'c1' }, nodes: page2 ? [{ stargazerCount: 4 }] : [{ stargazerCount: 1 }, { stargazerCount: 2 }] },
        contributionsCollection: { totalCommitContributions: 9, totalPullRequestContributions: 2, totalIssueContributions: 1, totalPullRequestReviewContributions: 0, restrictedContributionsCount: 5, contributionCalendar: { totalContributions: 12 } },
      } };
    } else {
      assert.match(body.query, /y2025: contributionsCollection/);
      assert.match(body.query, /y2026: contributionsCollection/);
      const wk = (dates) => ({ contributionCalendar: { weeks: [{ contributionDays: dates.map(([date, contributionCount]) => ({ date, contributionCount })) }] } });
      data = { user: { y2025: wk([['2025-12-30', 1], ['2025-12-31', 1]]), y2026: wk([['2026-01-01', 2], ['2026-01-02', 0], ['2026-01-03', 4]]) } };
    }
    return { ok: true, json: async () => ({ data }) };
  };
  try {
    const s = await fetchStats('tkn', 'someone', new Date('2026-01-03T12:00:00Z'));
    assert.equal(s.stars, 7);
    assert.equal(s.repos, 3);
    assert.equal(s.since, '2025');
    assert.equal(s.streak.total, 8);
    assert.equal(s.streak.longest.len, 3); // Dec 30 → Jan 1 crosses the year boundary
    assert.equal(s.streak.current.len, 1);
    assert.equal(s.last12.private, 5);
    assert.ok(calls.every((c) => !JSON.stringify(c).includes('tkn')), 'token only travels in the header');
  } finally {
    globalThis.fetch = realFetch;
  }
});
