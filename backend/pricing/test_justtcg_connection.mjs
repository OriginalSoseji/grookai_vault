import '../env.mjs';

const API_KEY = process.env.JUSTTCG_API_KEY;
const BASE_URL =
  process.env.JUSTTCG_BASE_URL ||
  process.env.JUSTTCG_API_BASE_URL ||
  'https://api.justtcg.com/v1';

if (!API_KEY) {
  console.error('❌ Missing JUSTTCG_API_KEY in env');
  process.exit(1);
}

if (typeof fetch !== 'function') {
  console.error('❌ Global fetch unavailable; use Node 18+');
  process.exit(1);
}

async function parseJsonSafely(res) {
  const text = await res.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function testConnection() {
  try {
    console.log('🔍 Testing JustTCG connection...');

    const url = `${BASE_URL.replace(/\/+$/, '')}/cards?q=pikachu&game=pokemon&limit=1`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        Accept: 'application/json',
      },
    });

    console.log('STATUS:', res.status);

    const data = await parseJsonSafely(res);

    if (!res.ok) {
      console.error('❌ API ERROR:', data);
      process.exit(1);
    }

    const card = data?.data?.[0] ?? data?.data ?? null;

    console.log('✅ CONNECTION SUCCESS');

    console.log('\n--- SAMPLE CARD ---');
    console.log('Name:', card?.name);
    console.log('Set:', card?.set_name ?? card?.set);
    console.log('Number:', card?.number);

    const variant = card?.variants?.[0] ?? null;

    console.log('\n--- SAMPLE VARIANT ---');
    console.log('Condition:', variant?.condition);
    console.log('Printing:', variant?.printing);
    console.log('Price:', variant?.price);

    console.log('\n--- RAW PAYLOAD ---');
    console.log(JSON.stringify(card, null, 2));
  } catch (err) {
    console.error('❌ CONNECTION FAILED:', err);
    process.exit(1);
  }
}

testConnection();
