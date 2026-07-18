/**
 * Cloudflare Worker: shared leaderboard for CV Space Cruise.
 *
 * Stores the fastest times per level in a KV namespace so every visitor to
 * gareson.com/cvspacecruise sees the same board. Deployed separately to
 * Cloudflare (free) — it is NOT part of the website. See ../SETUP-LEADERBOARD.md.
 *
 * Required binding: a KV namespace bound to the variable  SCORES
 *
 * Endpoints (CORS open to any origin — the data is public):
 *   GET  /scores                         -> { "1": [{n,t},...], "2": [...], "3": [...] }
 *   POST /scores  { level, name, time }  -> the same shape, after inserting the score
 */

const LEVELS = ['1', '2', '3'];
const BOARD_SIZE = 5;
const MIN_TIME = 0.3;    // reject obviously-fake sub-second times
const MAX_TIME = 3600;   // ...and absurd ones

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

const keyFor = (level) => 'level:' + level;

async function readBoard(env, level) {
  const raw = await env.SCORES.get(keyFor(level));
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}

async function readAll(env) {
  const out = {};
  for (const lvl of LEVELS) out[lvl] = await readBoard(env, lvl);
  return out;
}

// force the submitted initials to exactly 3 uppercase letters
function sanitizeName(name) {
  const up = String(name == null ? '' : name).toUpperCase();
  let letters = '';
  for (const ch of up) {
    if (ch >= 'A' && ch <= 'Z') { letters += ch; if (letters.length === 3) break; }
  }
  while (letters.length < 3) letters += 'A';
  return letters;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/scores') {
      return new Response('CV Space Cruise leaderboard is running. Endpoint: /scores', {
        status: 200,
        headers: { 'Content-Type': 'text/plain', ...CORS },
      });
    }

    if (request.method === 'GET') {
      return json(await readAll(env));
    }

    if (request.method === 'POST') {
      let body;
      try { body = await request.json(); }
      catch (e) { return json({ error: 'bad json' }, 400); }

      const level = String(body.level);
      if (!LEVELS.includes(level)) return json({ error: 'bad level' }, 400);

      const time = Number(body.time);
      if (!isFinite(time) || time < MIN_TIME || time > MAX_TIME) {
        return json({ error: 'bad time' }, 400);
      }

      const name = sanitizeName(body.name);

      const board = await readBoard(env, level);
      board.push({ n: name, t: Math.round(time * 100) / 100 });
      board.sort((a, b) => a.t - b.t);
      const trimmed = board.slice(0, BOARD_SIZE);
      await env.SCORES.put(keyFor(level), JSON.stringify(trimmed));

      // return every level so the client refreshes them all; override the just-
      // written one so an eventually-consistent read can't hand back stale data
      const all = await readAll(env);
      all[level] = trimmed;
      return json(all);
    }

    return json({ error: 'method not allowed' }, 405);
  },
};
