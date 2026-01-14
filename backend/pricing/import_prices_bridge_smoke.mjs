// One-off smoke test for the import-prices-bridge Edge function.
// Usage: npm run pricing:bridge-smoke
// Behavior: calls Edge with { mode: 'run', dryRun: true, limit: 5 }
// and logs the status + JSON.

import '../env.mjs';

const EDGE_URL =
  'https://ycdxbpibncqcchqiihfz.supabase.co/functions/v1/import-prices-bridge';

async function main() {
  const apikey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const bridgeToken = process.env.BRIDGE_IMPORT_TOKEN;

  if (!apikey) {
    console.error('[bridge-smoke] Missing SUPABASE_PUBLISHABLE_KEY in env');
    process.exit(1);
  }

  if (!bridgeToken) {
    console.error('[bridge-smoke] Missing BRIDGE_IMPORT_TOKEN in env');
    process.exit(1);
  }

  const payload = {
    mode: 'run',
    dryRun: true,
    limit: 5,
  };

  console.log('[bridge-smoke] POST', EDGE_URL);
  console.log('[bridge-smoke] payload:', JSON.stringify(payload));

  if (typeof fetch !== 'function') {
    console.error('[bridge-smoke] Global fetch unavailable; use Node 18+');
    process.exit(1);
  }

  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey,
      'x-bridge-token': bridgeToken,
    },
    body: JSON.stringify(payload),
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

  if (!res.ok || json.ok === false) {
    console.error('[bridge-smoke] Bridge or RPC reported failure');
    process.exit(1);
  }

  console.log(
    '[bridge-smoke] SUCCESS: bridge -> admin.import_prices_do smoke test passed',
  );
}

main().catch((err) => {
  console.error('[bridge-smoke] Unhandled error:', err);
  process.exit(1);
});
