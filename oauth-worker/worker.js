/**
 * Cloudflare Worker: GitHub OAuth backend for Decap CMS.
 *
 * This is the small piece that completes the "Sign in with GitHub" handshake
 * for the admin at gareson.com/admin. It is NOT part of the website — it is
 * deployed separately to Cloudflare (free). See ../SETUP-GALLERY.md.
 *
 * Two secrets must be configured on the Worker (Step 2 of the setup doc):
 *   GITHUB_CLIENT_ID      - from your GitHub OAuth App
 *   GITHUB_CLIENT_SECRET  - from your GitHub OAuth App
 */

const PROVIDER = "github";

// Returns an HTML page that hands the result back to the Decap admin window.
function postResultPage(status, content) {
  const payload = JSON.stringify(content);
  const html = `<!DOCTYPE html><html><body><script>
    (function () {
      function send(e) {
        window.opener.postMessage(
          'authorization:${PROVIDER}:${status}:${payload}',
          e.origin
        );
        window.removeEventListener('message', send, false);
      }
      window.addEventListener('message', send, false);
      window.opener.postMessage('authorizing:${PROVIDER}', '*');
    })();
  </script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const clientId = env.GITHUB_CLIENT_ID;
    const clientSecret = env.GITHUB_CLIENT_SECRET;

    // Step 1: Decap opens /auth -> we redirect the user to GitHub to log in.
    if (url.pathname === "/auth") {
      const authorize = new URL("https://github.com/login/oauth/authorize");
      authorize.searchParams.set("client_id", clientId);
      authorize.searchParams.set("redirect_uri", `${url.origin}/callback`);
      authorize.searchParams.set("scope", url.searchParams.get("scope") || "repo");
      authorize.searchParams.set("state", crypto.randomUUID());
      return Response.redirect(authorize.toString(), 302);
    }

    // Step 2: GitHub sends the user back here with a code -> swap it for a token.
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return postResultPage("error", { message: "Missing code" });

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "decap-cms-oauth-worker",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const data = await tokenRes.json();
      if (data.error || !data.access_token) {
        return postResultPage("error", { message: data.error || "No access token" });
      }
      return postResultPage("success", { token: data.access_token, provider: PROVIDER });
    }

    // Health check / anything else.
    return new Response("Decap CMS OAuth worker is running. Endpoints: /auth, /callback", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  },
};
