# Shared leaderboard setup

The CV Space Cruise game (`/cvspacecruise/`) keeps a top-5 fastest-time board for
each level. Right now those scores are saved **only in each visitor's own browser**.
This sets up a tiny Cloudflare Worker + KV database so **everyone shares one board**.

If the worker is ever down or unreachable, the game automatically falls back to the
local per-browser board — so nothing breaks either way.

It takes about 10 minutes and costs nothing (Cloudflare's free tier is plenty).

Files involved:
- **`leaderboard-worker/worker.js`** — the worker you deploy (below).
- **`cvspacecruise/index.html`** — the game; it has an `LB_API` line to fill in with
  your worker URL.

---

## Step 1 — Create the KV database (3 min)

1. Sign in at **https://dash.cloudflare.com** (the same account as your gallery
   worker is fine).
2. Go to **Storage & Databases** → **KV** → **Create a namespace**.
3. Name it `cvsc-scores` (anything works) → **Add**.

That's the little key/value store the scores live in. Leave it — you'll attach it to
the worker in the next step.

---

## Step 2 — Deploy the worker (5 min)

1. Go to **Workers & Pages** → **Create** → **Create Worker**.
2. Give it a name like `cvsc-leaderboard`, click **Deploy** (deploys a placeholder).
3. Click **Edit code**. Delete everything in the editor and paste the entire
   contents of **`leaderboard-worker/worker.js`** from this repo. Click **Deploy**.
4. Note the worker's URL at the top — it looks like:
   `https://cvsc-leaderboard.YOUR-NAME.workers.dev`
   **Copy it.**
5. Attach the KV database so the worker can store scores:
   - Go to the worker's **Settings** → **Bindings** → **Add** → **KV namespace**.
   - **Variable name:** `SCORES` (must be exactly this — the code looks for it).
   - **KV namespace:** pick `cvsc-scores` from Step 1.
   - **Save / Deploy.**

Quick check: open `https://cvsc-leaderboard.YOUR-NAME.workers.dev/scores` in a
browser. You should see `{"1":[],"2":[],"3":[]}`. If you see an error about `SCORES`,
the binding in Step 2.5 isn't set right.

---

## Step 3 — Point the game at your worker (1 min)

In this repo, open **`cvspacecruise/index.html`** and find this line near the top of
the `<script>`:

```js
const LB_API = '';   // e.g. 'https://cvsc-leaderboard.YOUR-NAME.workers.dev' — no trailing slash
```

Put your real worker URL between the quotes (no `/scores`, no trailing slash):

```js
const LB_API = 'https://cvsc-leaderboard.YOUR-NAME.workers.dev';
```

Save it. *(I can make this edit for you — just tell me the URL.)*

---

## Step 4 — Publish

Commit and push. GitHub Pages redeploys in a minute or two, and the game's board
header will read **GLOBAL** instead of **LOCAL** once it's talking to the worker.
*(I can do the commit + push for you — just say so.)*

---

### Notes

- **Cost / limits:** the free tier covers 100,000 KV reads and 1,000 writes per day.
  A reads-on-play, writes-on-record game stays far under that.
- **Cheating:** scores are submitted by the browser, so a determined person could
  POST a fake time. The worker rejects garbage (times under 0.3s or over an hour) and
  keeps only 3-letter names, but it can't prove a run was real. For a casual game
  that's fine; if it ever gets abused, tell me and I'll add stricter checks.
- **CLI alternative:** if you'd rather deploy with Wrangler, `leaderboard-worker/`
  has a `wrangler.toml` — see the comments in it.
