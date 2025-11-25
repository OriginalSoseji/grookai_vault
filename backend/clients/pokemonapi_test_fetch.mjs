// backend/clients/pokemonapi_test_fetch.mjs
// Test Node fetch exactly like pokemonapi.mjs does.

(async () => {
  const url = 'https://api.pokemontcg.io/v2/sets?page=1&pageSize=200';

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Api-Key': process.env.POKEMONAPI_API_KEY,
      // NOTE: No custom User-Agent here – this now matches pokemonapi.mjs
    }
  });

  console.log('Status:', res.status, res.statusText);
  const text = await res.text();
  console.log('Body snippet:', text.slice(0, 300));
})().catch(err => {
  console.error('Node test error:', err);
});
