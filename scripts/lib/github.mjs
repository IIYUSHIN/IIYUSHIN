// Live data from the GitHub GraphQL API.
// Uses only the workflow's own GITHUB_TOKEN — no third-party services.

const ENDPOINT = 'https://api.github.com/graphql';

async function gql(token, query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'iiyushin-profile-generator',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`GitHub API: ${json.errors.map((e) => e.message).join('; ')}`);
  return json.data;
}

const PROFILE_Q = `query($login: String!, $after: String) {
  user(login: $login) {
    createdAt
    followers { totalCount }
    repositories(ownerAffiliations: OWNER, privacy: PUBLIC, first: 100, after: $after, isFork: false) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes { stargazerCount }
    }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      restrictedContributionsCount
      contributionCalendar { totalContributions }
    }
  }
}`;

/** Every day of contributions since the account was created (one GraphQL call, one alias per year). */
async function fetchAllDays(token, login, createdAt, now) {
  const startYear = new Date(createdAt).getUTCFullYear();
  const endYear = now.getUTCFullYear();
  const parts = [];
  for (let y = startYear; y <= endYear; y++) {
    const from = y === startYear ? new Date(createdAt).toISOString() : `${y}-01-01T00:00:00Z`;
    const to = y === endYear ? now.toISOString() : `${y}-12-31T23:59:59Z`;
    parts.push(`y${y}: contributionsCollection(from: "${from}", to: "${to}") {
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }`);
  }
  const data = await gql(token, `query($login: String!) { user(login: $login) { ${parts.join('\n')} } }`, { login });
  const map = new Map();
  for (const key of Object.keys(data.user)) {
    for (const w of data.user[key].contributionCalendar.weeks) {
      for (const d of w.contributionDays) map.set(d.date, d.contributionCount);
    }
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, count]) => ({ date, count }));
}

/**
 * Streak maths. `days` must be sorted ascending and contiguous.
 * Today is a grace day: if you haven't contributed *yet* today the current
 * streak still counts up to yesterday (same rule GitHub users expect).
 */
export function computeStreaks(days, todayISO) {
  let longest = { len: 0, start: null, end: null };
  let run = { len: 0, start: null, end: null };
  for (const d of days) {
    if (d.date > todayISO) break;
    if (d.count > 0) {
      run = run.len ? { len: run.len + 1, start: run.start, end: d.date } : { len: 1, start: d.date, end: d.date };
      if (run.len > longest.len) longest = { ...run };
    } else {
      run = { len: 0, start: null, end: null };
    }
  }
  // current streak = run ending today or yesterday
  let current = { len: 0, start: null, end: null };
  const upto = days.filter((d) => d.date <= todayISO);
  let i = upto.length - 1;
  if (i >= 0 && upto[i].date === todayISO && upto[i].count === 0) i--; // grace
  let len = 0;
  let end = null;
  let start = null;
  while (i >= 0 && upto[i].count > 0) {
    if (!end) end = upto[i].date;
    start = upto[i].date;
    len++;
    i--;
  }
  if (len) current = { len, start, end };
  const total = upto.reduce((s, d) => s + d.count, 0);
  return { current, longest, total };
}

/** Level curve: level L starts at 5·(L−1)² total contributions. Transparent and documented. */
export function levelFor(total) {
  const level = Math.floor(Math.sqrt(Math.max(0, total) / 5)) + 1;
  const floor = 5 * (level - 1) ** 2;
  const next = 5 * level ** 2;
  return { level, floor, next, progress: (total - floor) / (next - floor) };
}

export function rankFor(level) {
  if (level >= 50) return 'MYTHIC';
  if (level >= 30) return 'OVERLORD';
  if (level >= 15) return 'ARCHITECT';
  if (level >= 5) return 'OPERATOR';
  return 'INITIATE';
}

export async function fetchStats(token, login, now = new Date()) {
  let after = null;
  let stars = 0;
  let first = null;
  do {
    const d = await gql(token, PROFILE_Q, { login, after });
    if (!d.user) throw new Error(`GitHub user "${login}" not found`);
    if (!first) first = d.user;
    for (const n of d.user.repositories.nodes) stars += n.stargazerCount;
    const p = d.user.repositories.pageInfo;
    after = p.hasNextPage ? p.endCursor : null;
  } while (after);

  const days = await fetchAllDays(token, login, first.createdAt, now);
  const todayISO = now.toISOString().slice(0, 10);
  const streak = computeStreaks(days, todayISO);
  const cc = first.contributionsCollection;
  return {
    login,
    synced: todayISO,
    since: first.createdAt.slice(0, 4),
    followers: first.followers.totalCount,
    repos: first.repositories.totalCount,
    stars,
    // contributionsCollection with no range = the rolling last 12 months
    last12: {
      contributions: cc.contributionCalendar.totalContributions,
      commits: cc.totalCommitContributions,
      prs: cc.totalPullRequestContributions,
      issues: cc.totalIssueContributions,
      reviews: cc.totalPullRequestReviewContributions,
      private: cc.restrictedContributionsCount,
    },
    streak,
    last30: days.filter((d) => d.date <= todayISO).slice(-30),
  };
}
