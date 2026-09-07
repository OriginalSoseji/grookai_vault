import assert from 'node:assert/strict';

export function createPokemonSealedSourceCircuitV1() {
  const blocked = new Map();
  return {
    status(url) { return blocked.get(new URL(url).origin) ?? null; },
    observe(url, status) { if ([401,403,429].includes(status)) blocked.set(new URL(url).origin,status); },
  };
}

export function validatePokemonSealedImageRetryV1(row) {
  assert.equal(row.status, 'excluded');
  assert.ok(Number.isSafeInteger(row.source_product_id) && row.source_product_id > 0);
  assert.match(row.source_payload_hash, /^[a-f0-9]{64}$/);
  assert.ok(Array.isArray(row.urls) && row.urls.length > 0 && row.urls.length <= 3);
  const id = row.source_product_id;
  const allowed = new Set([
    `https://tcgplayer-cdn.tcgplayer.com/product/${id}_in_1000x1000.jpg`,
    `https://tcgplayer-cdn.tcgplayer.com/product/${id}_200w.jpg`,
    `https://product-images.tcgplayer.com/fit-in/1000x1000/${id}.jpg`,
  ]);
  for (const url of row.urls) assert.ok(allowed.has(url), 'Image identity or source mismatch');
  assert.equal(new Set(row.urls).size, row.urls.length);
  return row.urls;
}

export function comparePokemonSealedSourcePriceV1(row, payload) {
  assert.ok(payload?.success === true && Array.isArray(payload.results), 'Invalid source response');
  const matches = payload.results.filter(p => Number(p.productId) === Number(row.source_product_id)
    && String(p.subTypeName).trim().toLowerCase() === 'normal');
  if (matches.length > 1) return { disposition: 'ambiguous_source_price', matched_rows: matches.length };
  if (!matches.length) return { disposition: 'not_in_current_source_prices', matched_rows: 0 };
  const price = matches[0].marketPrice;
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return { disposition: 'current_source_market_price_unavailable', matched_rows: 1 };
  }
  return { disposition: 'current_source_price_requires_warehouse_reconciliation', matched_rows: 1,
    source_market_price: price, equals_published_quote: price === Number(row.market_price) };
}

export function buildPokemonSealedAgingDetailV1(rows) {
  return rows.map(row => {
    assert.ok(Number.isInteger(row.age_days) && row.age_days >= 4);
    return { ...row, freshness_status: row.age_days > 7 ? 'expired' : row.age_days === 7 ? 'expires_next_day' : 'aging',
      action: 'verify_exact_source_observation_without_redating_or_substitution' };
  });
}
