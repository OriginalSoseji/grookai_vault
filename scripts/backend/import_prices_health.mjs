const baseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const slug = 'import-prices-v3';

async function main() {
  if (!baseUrl || !publishableKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY');
  }

  const url = new URL(`/functions/v1/${slug}`, baseUrl);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ mode: 'health', source: 'backend-health' }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json().catch(() => null);

  if (
    response.status !== 200 ||
    data?.ok !== true ||
    data?.mode !== 'health' ||
    data?.pipeline !== 'retired'
  ) {
    throw new Error(`Unexpected retired health response (${response.status}): ${JSON.stringify(data)}`);
  }

  console.log('[health] OK:', JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error('[health] ERROR:', error);
  process.exit(1);
});
