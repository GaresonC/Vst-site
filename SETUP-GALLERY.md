# Gallery + Admin setup

Your site now has:

- **`gallery.html`** — the public gallery at `https://gareson.com/gallery.html` (linked in the footer).
- **`admin/`** — the login + upload dashboard at `https://gareson.com/admin/`.
- **`oauth-worker/worker.js`** — the little login helper you deploy to Cloudflare (below).

Everything except two small accounts is already done. Follow the steps in order.
It takes about 15 minutes and costs nothing.

---

## Step 1 — Create a GitHub OAuth App (5 min)

This is what lets you press "Login with GitHub" on the admin page.

1. Go to **https://github.com/settings/developers** → **OAuth Apps** → **New OAuth App**.
2. Fill in:
   - **Application name:** `MF AMP Gallery Admin` (anything you like)
   - **Homepage URL:** `https://gareson.com`
   - **Authorization callback URL:** `https://REPLACE_LATER/callback`
     *(leave this for now — you'll fix it in Step 2 once you know the worker URL)*
3. Click **Register application**.
4. On the next screen, copy the **Client ID**.
5. Click **Generate a new client secret**, and copy the **secret** (you only see it once — keep it somewhere safe for a minute).

Keep this tab open; you'll come back to fix the callback URL.

---

## Step 2 — Deploy the login worker to Cloudflare (7 min)

1. Sign up (free, no credit card) at **https://dash.cloudflare.com/sign-up**.
2. In the dashboard, go to **Workers & Pages** → **Create** → **Create Worker**.
3. Give it a name like `mf-amp-oauth`, click **Deploy** (deploys a placeholder).
4. Click **Edit code**. Delete everything in the editor and paste the entire
   contents of **`oauth-worker/worker.js`** from this repo. Click **Deploy**.
5. Note the worker's URL shown at the top — it looks like:
   `https://mf-amp-oauth.YOUR-NAME.workers.dev`
   **Copy it.**
6. Add your two secrets so the worker can talk to GitHub:
   - Go to the worker's **Settings** → **Variables and Secrets**.
   - Add a secret named `GITHUB_CLIENT_ID` = the Client ID from Step 1.
   - Add a secret named `GITHUB_CLIENT_SECRET` = the secret from Step 1.
   - Save/Deploy.

Now go back to your **GitHub OAuth App** tab (Step 1) and set the
**Authorization callback URL** to:

```
https://mf-amp-oauth.YOUR-NAME.workers.dev/callback
```

(use your real worker URL) and **Update application**.

---

## Step 3 — Point the admin at your worker (1 min)

In this repo, open **`admin/config.yml`** and replace this line:

```yaml
  base_url: REPLACE_WITH_YOUR_WORKER_URL
```

with your real worker URL (no `/callback`, no trailing slash):

```yaml
  base_url: https://mf-amp-oauth.YOUR-NAME.workers.dev
```

Save it. *(I can make this edit for you — just tell me the URL.)*

---

## Step 4 — Publish

Commit and push these changes to GitHub. GitHub Pages will redeploy in a minute
or two. *(I can do the commit + push for you when you're ready — just say so.)*

---

## Using it

1. Go to **https://gareson.com/admin/** and click **Login with GitHub**.
2. Click **New Artwork**, give it a title, drag in an image, (optional) add a
   description, then **Publish**.
3. Within a minute it appears on **https://gareson.com/gallery.html** automatically.

That's it — no database, no monthly cost. Uploads are committed straight into
the `images/art/` and `content/art/` folders of this repo.

---

### Troubleshooting

- **"Login with GitHub" does nothing / popup closes instantly** — the callback
  URL in the GitHub OAuth App doesn't exactly match `‹worker-url›/callback`, or
  the two Cloudflare secrets aren't set. Recheck Steps 1 & 2.
- **Gallery says "No artwork yet" after uploading** — give Pages a minute to
  rebuild, then refresh. GitHub's public API also limits anonymous viewers to
  60 requests/hour per IP; a personal gallery stays well under that.
- **Admin page is blank** — make sure `base_url` in `admin/config.yml` is filled
  in and pushed.
