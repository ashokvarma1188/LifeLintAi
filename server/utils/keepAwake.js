/*
 * Render's free plan stops the API after ~15 minutes with no incoming traffic. The next
 * request then takes ~30 s (too slow for an SOS), and medicine reminders and Walk-with-me
 * checks can't run while it's stopped. GitHub's scheduled ping is too unreliable to rely
 * on (runs can be hours late), so the server also pings its own public URL every
 * 10 minutes. The request goes out through Render's router, so it counts as incoming
 * traffic.
 *
 * Runs only when there's a public URL: Render sets RENDER_EXTERNAL_URL automatically,
 * and KEEP_AWAKE_URL overrides it. Locally neither is set, so it does nothing.
 */
const PING_MS = 10 * 60 * 1000;

function startKeepAwake() {
  const base = process.env.KEEP_AWAKE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!base) return;
  const url = base.replace(/\/+$/, "") + "/";
  setInterval(() => {
    fetch(url, { signal: AbortSignal.timeout(30000) }).catch((err) => console.error("Keep-awake ping failed:", err.message));
  }, PING_MS);
  console.log(`Keep-awake: pinging ${url} every 10 minutes`);
}

module.exports = { startKeepAwake };
