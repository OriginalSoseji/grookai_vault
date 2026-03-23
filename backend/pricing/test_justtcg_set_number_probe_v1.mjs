import '../env.mjs';

import { requestJustTcgJson } from './justtcg_client.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    setId: null,
    number: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--set-id' && args[index + 1]) {
      options.setId = args[index + 1].trim();
      index += 1;
    } else if (token.startsWith('--set-id=')) {
      options.setId = token.split('=')[1].trim();
    } else if (token === '--number' && args[index + 1]) {
      options.number = args[index + 1].trim();
      index += 1;
    } else if (token.startsWith('--number=')) {
      options.number = token.split('=')[1].trim();
    }
  }

  return options;
}

function unwrapData(payload) {
  const data = payload?.data;
  if (Array.isArray(data)) {
    return data;
  }

  if (data) {
    return [data];
  }

  return [];
}

async function main() {
  const options = parseArgs();
  if (!options.setId || !options.number) {
    console.error('Usage: node backend\\pricing\\test_justtcg_set_number_probe_v1.mjs --set-id=<justtcg_set_id> --number=<printed_number>');
    process.exit(1);
  }

  const params = new URLSearchParams({
    game: 'pokemon',
    set: options.setId,
    number: options.number,
    include_null_prices: 'true',
    include_price_history: 'false',
    include_statistics: '7d',
  });

  const response = await requestJustTcgJson('GET', '/cards', { params });
  console.log('REQUEST:');
  console.log(`/cards?${params.toString()}`);
  console.log(`ok: ${response.ok}`);
  console.log(`status: ${response.status}`);
  console.log(`error: ${response.error ?? 'null'}`);

  const cards = unwrapData(response.payload);
  console.log(`count: ${cards.length}`);
  console.log(JSON.stringify(cards.slice(0, 10), null, 2));
}

main().catch((error) => {
  console.error('❌ JustTCG set+number probe failed:', error);
  process.exit(1);
});
