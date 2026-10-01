import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const VERSION = 'POKEMON_WAREHOUSE_COVERAGE_V1';
export function pokemonCoverageDatabaseTarget(connectionString) {
  const url = new URL(connectionString);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol), 'Invalid database protocol');
  const user = decodeURIComponent(url.username);
  assert.ok((url.hostname === 'db.ycdxbpibncqcchqiihfz.supabase.co' && user === 'postgres') ||
    (url.hostname === 'aws-1-us-east-2.pooler.supabase.com' && user === 'postgres.ycdxbpibncqcchqiihfz'), 'Wrong database project');
  assert.equal(url.pathname, '/postgres');
  assert.ok(['', '5432', '6543'].includes(url.port), 'Wrong database port');
  for (const key of url.searchParams.keys()) assert.ok(['sslmode', 'sslcert', 'sslkey', 'sslrootcert'].includes(key), 'Unexpected connection option');
  url.search = '';
  return url;
}
const text = value => String(value ?? '').normalize('NFKC').trim();
const productId = value => /^\d+$/.test(text(value)) ? String(BigInt(text(value))) : '';
const normalized = value => text(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const numberKey = value => text(value).split('/')[0].toLowerCase().replace(/^0+(?=\d)/, '');
const sortedById = rows => [...rows].sort((a, b) => text(a.id).localeCompare(text(b.id)));
const identityHintKey = (name, number, language) => `${normalized(name)}|${numberKey(number)}|${language}`;
const countBy = (rows, field) => Object.fromEntries([...new Set(rows.map(row => row[field]))].sort()
  .map(key => [key, rows.filter(row => row[field] === key).length]));

export function retailerVariant(name) {
  if (/\bgame\s*stop\b/i.test(name)) return 'gamestop';
  if (/\beb\s*games\b/i.test(name)) return 'eb games';
  if (/\bpok[eé]mon\s*cent(?:er|re)\b/i.test(name)) return 'pokemon center';
  if (/\bbuild.?a.?bear\b/i.test(name)) return 'build a bear';
  if (/\btoys?.?r.?us\b/i.test(name)) return 'toys r us';
  return null;
}

function indexRows(rows, key) {
  const result = new Map();
  for (const row of rows) {
    const value = key(row);
    if (!value) continue;
    const group = result.get(value) ?? [];
    group.push(row);
    result.set(value, group);
  }
  return result;
}

// A provider mapping establishes a relationship, not verified printing truth.
// Unmatched products are retained verbatim; name/number guesses never close gaps.
export function reconcilePokemonWarehouse({ products, parents, mappings, discovery, warehouse, sealed }, {
  observedAt, overdueDays = 7,
} = {}) {
  assert.ok(Number.isFinite(Date.parse(observedAt)), 'Explicit observation time required');
  assert.ok(Number.isFinite(overdueDays) && overdueDays > 0, 'Invalid review age threshold');
  for (const rows of [products, parents, mappings, discovery, warehouse, sealed]) assert.ok(Array.isArray(rows));
  assert.equal(new Set(products.map(p => productId(p.product_id))).size, products.length, 'Duplicate source product');
  assert.ok(products.every(p => productId(p.product_id) && [3, 85].includes(Number(p.category_id))), 'Invalid Pokemon source product');
  const parentById = new Map(parents.map(p => [p.id, p]));
  const links = [...mappings.filter(row => row.active && ['tcgplayer', 'tcgcsv'].includes(row.source)),
    ...parents.flatMap(p => [p.tcgplayer_id, p.external_ids?.tcgplayer, p.external_ids?.tcgplayer_id]
      .filter(value => productId(value)).map(external_id => ({ external_id, card_print_id: p.id, active: true, source: 'parent_product_id' })))];
  const mapped = indexRows(links, row => productId(row.external_id));
  const discovered = indexRows(discovery, row => productId(row.tcgplayer_id));
  const queued = indexRows(warehouse, row => productId(row.tcgplayer_id));
  const identityHints = indexRows(parents, p => identityHintKey(p.name, p.number, p.language));
  const sealedById = indexRows(sealed.filter(row => row.source_provider === 'tcgplayer' && row.mapping_status === 'exact_reviewed' && row.promotion_authorized === true),
    row => `${row.source_category_id}:${productId(row.source_product_id)}`);
  const rows = products.map(product => {
    const id = productId(product.product_id);
    const number = text(product.extended_data?.find(e => e.name === 'Number')?.value);
    const relatedDiscovery = sortedById(discovered.get(id) ?? []);
    const relatedWarehouse = sortedById(queued.get(id) ?? []);
    const parentIds = [...new Set((mapped.get(id) ?? []).map(m => m.card_print_id))].sort();
    const candidates = parentIds.map(id => parentById.get(id)).filter(Boolean);
    const retailer = retailerVariant(product.name);
    const targetLanguage = Number(product.category_id) === 85 ? 'ja' : 'en';
    const validParents = candidates.filter(parent => parent.game === 'pokemon' && parent.language === targetLanguage);
    const canonicalRetailer = parent => normalized(`${parent.variant_key ?? ''} ${parent.printed_identity_modifier ?? ''}`);
    const qualifierMismatch = retailer && validParents.some(parent => !canonicalRetailer(parent).includes(retailer));
    const sourceName = text(product.name).split(/\s+-\s+/)[0].replace(/(?:\s*\([^)]*\))+\s*$/, '');
    const suggested = number ? sortedById(identityHints.get(identityHintKey(sourceName, number, targetLanguage)) ?? [])
      .filter(p => p.game === 'pokemon' && (!retailer || canonicalRetailer(p).includes(retailer))) : [];
    const sealedRows = sealedById.get(`${product.category_id}:${id}`) ?? [];
    let status;
    if (parentIds.length > 1 || (parentIds.length && sealedRows.length)) status = 'mapping_conflict';
    else if (parentIds.length && validParents.length !== parentIds.length) status = 'mapping_scope_conflict';
    else if (qualifierMismatch) status = 'retailer_identity_review';
    else if (validParents.length === 1 && !Number(validParents[0].printing_count)) status = 'mapped_parent_without_printings';
    else if (validParents.length === 1) status = 'mapped_parent';
    else if (sealedRows.length === 1) status = 'mapped_sealed_product';
    else if (sealedRows.length > 1) status = 'mapping_conflict';
    else if (suggested.length) status = 'existing_identity_mapping_review';
    else if (relatedWarehouse.length) status = 'promotion_queue_review';
    else if (relatedDiscovery.length) status = 'discovery_review';
    else status = number ? 'untracked_card_candidate' : 'unclassified_product_review';
    const unresolved = !['mapped_parent', 'mapped_sealed_product'].includes(status);
    const timestamps = [product.first_seen_at, ...relatedDiscovery.map(r => r.created_at), ...relatedWarehouse.map(r => r.created_at)]
      .map(v => Date.parse(v)).filter(Number.isFinite);
    const firstSeen = timestamps.length ? Math.min(...timestamps) : null;
    const ageDays = firstSeen === null ? null : Math.max(0, Math.floor((Date.parse(observedAt) - firstSeen) / 86400000));
    return {
      key: `tcgcsv:${product.category_id}:${id}`, category_id: Number(product.category_id), product_id: id,
      group_id: product.group_id, name: product.name, number: number || null,
      source_url: product.source_url, source_image_url: product.image_url, source_payload_hash: product.payload_hash,
      source_active: product.source_active, language: targetLanguage, retailer,
      status, unresolved, age_days: ageDays, overdue: unresolved && (ageDays === null || ageDays >= overdueDays),
      canonical_parent_ids: parentIds, canonical_gv_ids: validParents.map(p => p.gv_id),
      canonical_printing_count: validParents.reduce((sum, p) => sum + Number(p.printing_count ?? 0), 0),
      suggested_existing_parents: suggested.map(p => ({ id: p.id, gv_id: p.gv_id, set_code: p.set_code,
        variant_key: p.variant_key, printing_count: p.printing_count })),
      discovery_candidates: relatedDiscovery.map(r => ({ id: r.id, source: r.source,
        state: r.match_status, bucket: r.candidate_bucket, created_at: r.created_at })),
      promotion_candidates: relatedWarehouse.map(r => ({ id: r.id, state: r.state,
        reason: r.current_review_hold_reason ?? r.interpreter_reason_code, created_at: r.created_at })),
      action: !unresolved ? 'retain_relationship_verify_exact_printing_evidence'
        : status === 'existing_identity_mapping_review' ? 'verify_existing_parent_and_repair_mapping_without_duplicate'
        : status === 'mapped_parent_without_printings' ? 'verify_and_admit_missing_exact_child_printings'
        : 'acquire_exact_identity_and_finish_evidence_then_promote_through_reviewed_master',
      write_ready: false,
    };
  }).sort((a, b) => a.key.localeCompare(b.key));
  const summary = {
    product_count: products.length, accounted_product_count: rows.length,
    unresolved_count: rows.filter(r => r.unresolved).length,
    overdue_count: rows.filter(r => r.overdue).length,
    untracked_count: rows.filter(r => r.status.startsWith('untracked') || r.status === 'unclassified_product_review').length,
    by_status: countBy(rows, 'status'), by_language: countBy(rows, 'language'),
    gamestop: countBy(rows.filter(r => r.retailer === 'gamestop'), 'status'),
  };
  return {
    version: VERSION, observed_at: observedAt, database_writes: false,
    status: summary.unresolved_count ? 'degraded_unresolved_warehouse_products' : 'accounted',
    catalog_completeness_proven: false,
    scope: 'All preserved Pokemon and Pokemon Japan TCGCSV warehouse products, including inactive rows. Mapped relationships do not prove printing completeness.',
    summary, rows,
    fingerprint: createHash('sha256').update(JSON.stringify(rows)).digest('hex'),
  };
}

export function buildPokemonWarehouseWorklist(report) {
  return {
    version: VERSION, observed_at: report.observed_at, coverage_fingerprint: report.fingerprint,
    owner: 'pokemon_catalog', database_writes: false,
    tasks: report.rows.filter(r => r.unresolved).map(row => ({
      task_key: row.key, priority: row.retailer === 'gamestop' ? 0 : row.retailer ? 1 : row.overdue ? 2 : 3,
      product_id: row.product_id, language: row.language, name: row.name, status: row.status,
      source_payload_hash: row.source_payload_hash, source_url: row.source_url,
      source_image_url: row.source_image_url, age_days: row.age_days, overdue: row.overdue,
      next_action: row.action, existing_parent_hints: row.suggested_existing_parents,
      discovery_candidate_ids: row.discovery_candidates.map(c => c.id),
      promotion_candidate_ids: row.promotion_candidates.map(c => c.id),
      completion_requires: ['exact_master_identity_and_finish_evidence', 'canonical_parent_and_verified_printing_readback',
        'exact_source_mapping_readback', ...(row.retailer ? ['retailer_search_readback'] : [])],
      write_ready: false,
    })).sort((a, b) => a.priority - b.priority || (b.age_days ?? Infinity) - (a.age_days ?? Infinity) || a.task_key.localeCompare(b.task_key)),
  };
}

export async function readPokemonWarehouseSnapshot(client) {
  // Caller owns one read-only repeatable-read transaction. Do not add LIMITs:
  // these complete inventories are the denominator for the coverage invariant.
  const products = (await client.query(`select product_id, category_id, group_id, name,
    source_url, image_url, payload_hash, extended_data, source_active, first_seen_at
    from public.tcgcsv_source_products where category_id in (3,85) order by product_id`)).rows;
  const parents = (await client.query(`select cp.id, cp.gv_id, cp.name, cp.number, cp.set_code, cp.tcgplayer_id,
    cp.external_ids, cp.variant_key, cp.printed_identity_modifier, s.game,
    case when cp.identity_domain='pokemon_jpn' then 'ja'
      when cp.identity_domain='pokemon_eng_standard' then 'en' else 'unresolved' end language,
    (select count(*)::int from public.card_printings p where p.card_print_id=cp.id) printing_count
    from public.card_prints cp join public.sets s on s.id=cp.set_id where s.game='pokemon'`)).rows;
  const mappings = (await client.query(`select source, external_id, card_print_id, active
    from public.external_mappings where active and source in ('tcgplayer','tcgcsv')
    and case when external_id ~ '^[0-9]+$' then external_id::numeric end in
      (select product_id from public.tcgcsv_source_products where category_id in (3,85))`)).rows;
  const discovery = (await client.query(`select id, source, tcgplayer_id, match_status, candidate_bucket, created_at
    from public.external_discovery_candidates where tcgplayer_id is not null`)).rows;
  const warehouse = (await client.query(`select id, tcgplayer_id, state, current_review_hold_reason,
    interpreter_reason_code, created_at from public.canon_warehouse_candidates where tcgplayer_id is not null`)).rows;
  const sealed = (await client.query(`select source_provider, source_category_id, source_product_id, mapping_status, promotion_authorized
    from public.sealed_product_source_mappings where source_category_id in (3,85)`)).rows;
  return { products, parents, mappings, discovery, warehouse, sealed };
}
