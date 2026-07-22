// One-off smoke test for the import-prices-bridge Edge function.
// Usage: npm run pricing:bridge-smoke
// Behavior: calls the retired Edge entrypoint's database-free health branch.
// It must never invoke the legacy admin.import_prices_do RPC.

import '../env.mjs';

const projectUrl = process.env.SUPABASE_URL ?? process.env.PROJECT_URL;

async function main() {
  const apikey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!apikey) {
    console.error('[bridge-smoke] Missing SUPABASE_PUBLISHABLE_KEY in env');
    process.exit(1);
  }

  if (!projectUrl) {
    console.error('[bridge-smoke] Missing SUPABASE_URL or PROJECT_URL in env');
    process.exit(1);
  }

  const edgeUrl = new URL('/functions/v1/import-prices-bridge', projectUrl).toString();

  const payload = {
    mode: 'health',
  };

  console.log('[bridge-smoke] POST', edgeUrl);
  console.log('[bridge-smoke] payload:', JSON.stringify(payload));

  if (typeof fetch !== 'function') {
    console.error('[bridge-smoke] Global fetch unavailable; use Node 18+');
    process.exit(1);
  }

  const res = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  const text = await res.text();
  console.log('[bridge-smoke] status:', res.status);
  console.log('[bridge-smoke] raw body:', text);

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error('[bridge-smoke] response was not valid JSON');
    process.exit(res.ok ? 0 : 1);
  }

  console.log('[bridge-smoke] parsed JSON:', JSON.stringify(json, null, 2));

  if (
    !res.ok ||
    json.ok !== true ||
    json.mode !== 'health' ||
    json.pipeline !== 'retired'
  ) {
    console.error('[bridge-smoke] Retired bridge health check failed');
    process.exit(1);
  }

  console.log(
    '[bridge-smoke] SUCCESS: retired bridge is reachable without database work',
  );
}

main().catch((err) => {
  console.error('[bridge-smoke] Unhandled error:', err);
  process.exit(1);
});
