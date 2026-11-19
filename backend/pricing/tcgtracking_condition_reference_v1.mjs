import { createHash } from 'node:crypto';

export const VERSION = 'TCGTRACKING_CONDITION_REFERENCE_V1';
export const SOURCE = 'tcgtracking_condition_reference';
export const STAGED_STATUS = 'tcgtracking_condition_staged';
export const CONDITIONS = Object.freeze(['NM', 'LP', 'MP', 'HP', 'DMG']);
export const FINISHES = Object.freeze({ Normal: 'normal', Foil: 'foil', Holofoil: 'holo', 'Reverse Holofoil': 'reverse' });
export const DOMAIN_SCOPES = Object.freeze({
  mtg_eng_paper_print: { category: 1, language: 'EN' },
  pokemon_eng_standard: { category: 3, language: 'EN' },
  one_piece_eng_print: { category: 68, language: 'EN' },
  pokemon_jpn: { category: 85, language: 'JP' },
});
export function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
export const hash = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(stable(value))).digest('hex');
export const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;

// A provider product may own different MTG parents per finish. Never resolve at parent level.
export function resolveTargets(rows) {
  const buckets = new Map();
  const withheld = [];
  for (const row of rows) {
    const domain = DOMAIN_SCOPES[row.identity_domain];
    let reason = !domain || domain.category !== row.category_id ? 'unsupported_identity_domain_or_category' : !Object.values(FINISHES).includes(row.finish_key) ? 'unsupported_finish' : !row.card_printing_id || !row.card_print_id ? 'missing_exact_printing' : null;
    if (reason) { withheld.push({ ...row, reason }); continue; }
    const key = `${row.category_id}|${row.product_id}|${row.finish_key}|${domain.language}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push({ ...row, language: domain.language });
    buckets.set(key, bucket);
  }
  const targets = [];
  for (const [key, rows] of buckets) {
    if (new Set(rows.map(row => row.card_printing_id)).size !== 1 || new Set(rows.map(row => row.card_print_id)).size !== 1) {
      withheld.push(...rows.map(row => ({ ...row, reason: 'conflicting_existing_mappings', mapping_key: key })));
      continue;
    }
    rows.sort((a, b) => Number(b.mapping_lane === 'exact_printing') - Number(a.mapping_lane === 'exact_printing') || String(a.mapping_id).localeCompare(String(b.mapping_id)));
    targets.push(rows[0]);
  }
  const byPrinting = new Map();
  for (const target of targets) {
    const bucket = byPrinting.get(target.card_printing_id) ?? [];
    bucket.push(target); byPrinting.set(target.card_printing_id, bucket);
  }
  const exactTargets = [];
  for (const bucket of byPrinting.values()) {
    if (bucket.length > 1) withheld.push(...bucket.map(row => ({ ...row, reason: 'multiple_source_products_for_printing' })));
    else exactTargets.push(bucket[0]);
  }
  exactTargets.sort((a, b) => a.category_id - b.category_id || a.group_id - b.group_id || a.product_id - b.product_id || a.finish_key.localeCompare(b.finish_key));
  return { targets: exactTargets, withheld };
}

export function normalizeGroup({ response, targets, categoryId, groupId, fetchedAt }) {
  if (!response || response.set_id !== groupId || !response.products || Array.isArray(response.products)) throw new Error('SOURCE_SET_OR_SHAPE_MISMATCH');
  const sourceTime = Date.parse(response.updated);
  const fetchTime = Date.parse(fetchedAt);
  const fresh = Number.isFinite(sourceTime) && Number.isFinite(fetchTime) && sourceTime <= fetchTime + 300000 && fetchTime - sourceTime <= 36 * 3600000;
  const targetMap = new Map(targets.map(target => [`${target.product_id}|${target.finish_key}|${target.language}`, target]));
  const candidates = [];
  const withheld = {};
  const seen = new Set();
  let rawCount = 0;
  const count = reason => { withheld[reason] = (withheld[reason] ?? 0) + 1; };
  for (const [productId, skus] of Object.entries(response.products)) {
    if (!/^[1-9]\d*$/.test(productId) || !skus || Array.isArray(skus) || typeof skus !== 'object') throw new Error('INVALID_PRODUCT_SKU_SHAPE');
    for (const [skuId, sku] of Object.entries(skus)) {
      rawCount++;
      if (!/^[1-9]\d*$/.test(skuId) || seen.has(skuId)) throw new Error('INVALID_OR_DUPLICATE_SKU_ID');
      seen.add(skuId);
      const finish = FINISHES[sku.var];
      const target = targetMap.get(`${productId}|${finish}|${sku.lng}`);
      const reason = !finish ? 'unsupported_provider_finish' : !CONDITIONS.includes(sku.cnd) ? 'unsupported_condition' : !target ? 'no_exact_existing_mapping' : !fresh ? 'source_stale_or_timestamp_invalid' : !positive(sku.mkt) ? 'market_price_unavailable' : null;
      if (reason) { count(reason); continue; }
      candidates.push({
        card_print_id: target.card_print_id, card_printing_id: target.card_printing_id,
        gv_id: target.gv_id, printing_gv_id: target.printing_gv_id,
        product_id: Number(productId), sku_id: skuId, category_id: categoryId, group_id: groupId,
        finish_key: finish, language: sku.lng, condition: sku.cnd, market_price: sku.mkt,
        mapping_lane: target.mapping_lane, mapping_source: target.mapping_source, mapping_id: target.mapping_id,
        provider_updated_at: response.updated, fetched_at: fetchedAt,
        currency: null, currency_hint: 'USD', currency_verified: false,
        source: SOURCE, source_label: 'TCGPlayer condition reference via TCGTracking',
        pricing_lane: 'reference', needs_review: true, app_visible: false, can_publish_price_directly: false,
      });
    }
  }
  if (rawCount !== response.sku_count) throw new Error('PROVIDER_SKU_COUNT_MISMATCH');
  const byExactCondition = new Map();
  for (const row of candidates) {
    const key = `${row.card_printing_id}|${row.condition}|${row.language}`;
    const bucket = byExactCondition.get(key) ?? [];
    bucket.push(row); byExactCondition.set(key, bucket);
  }
  const rows = [];
  for (const bucket of byExactCondition.values()) {
    // Two different source products/SKUs for a single owned printing are ambiguous.
    if (bucket.length !== 1) { for (const row of bucket) count('ambiguous_exact_condition_skus'); }
    else rows.push(bucket[0]);
  }
  rows.sort((a, b) => a.card_printing_id.localeCompare(b.card_printing_id) || CONDITIONS.indexOf(a.condition) - CONDITIONS.indexOf(b.condition));
  const coverage = Object.fromEntries(CONDITIONS.map(condition => [condition, rows.filter(row => row.condition === condition).length]));
  return { version: VERSION, source_fresh: fresh, raw_sku_count: rawCount, target_count: targets.length, priced_count: rows.length, coverage, withheld, rows };
}

// Internal inspection only. Public/app-facing promotion needs its own qualified contract.
export function selectConditionReference(rows, { cardPrintingId, condition, now = new Date().toISOString() }) {
  if (!CONDITIONS.includes(condition) || !cardPrintingId) return { status: 'unavailable', reason: 'invalid_exact_condition_request' };
  const matches = rows.filter(row => row.card_printing_id === cardPrintingId && row.condition === condition);
  if (matches.length !== 1) return { status: 'unavailable', reason: matches.length ? 'ambiguous_condition_price' : 'condition_price_unavailable' };
  const row = matches[0];
  const age = Date.parse(now) - Date.parse(row.provider_updated_at);
  if (!positive(row.market_price) || !Number.isFinite(age) || age < -300000 || age > 36 * 3600000) return { status: 'unavailable', reason: 'stale_or_invalid_price' };
  return { ...row, status: 'reference_available' };
}
