import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { coverageRowsHash, buildPokemonWarehouseWorklist, pokemonCoverageDatabaseTarget, reconcilePokemonWarehouse } from '../../backend/catalog/pokemon_warehouse_coverage_v1.mjs';

const observedAt = '2026-10-01T12:00:00Z';
const product = { product_id: 456093, category_id: 3, group_id: 2374,
  name: 'Dragonite - 131/195 (Gamestop Exclusive)', extended_data: [{ name: 'Number', value: '131/195' }],
  first_seen_at: '2026-04-13T03:02:06Z', source_active: true };
const parent = { id: 'parent', gv_id: 'GV-DRAGONITE-GAMESTOP', game: 'pokemon', language: 'en',
  variant_key: 'gamestop_stamp', printing_count: 1, tcgplayer_id: '456093' };
function fixture() { return { products: [structuredClone(product)], parents: [], mappings: [], discovery: [], warehouse: [], sealed: [] }; }
function run(input) { return reconcilePokemonWarehouse(input, { observedAt }); }

test('bounded coverage hashing preserves historical JSON fingerprints including Unicode and escaping',()=>{
 for(const rows of [[],[{name:'ホウオウ',quote:'"\\\n',optional:undefined},null],run(fixture()).rows])
  assert.equal(coverageRowsHash(rows),createHash('sha256').update(JSON.stringify(rows)).digest('hex'));
});

test('Dragonite warehouse-only card becomes an overdue candidate, never silently complete', () => {
  const result = run(fixture());
  assert.equal(result.rows[0].status, 'untracked_card_candidate');
  assert.equal(result.summary.unresolved_count, 1);
  assert.equal(result.summary.overdue_count, 1);
  assert.equal(result.rows[0].write_ready, false);
  assert.equal(result.catalog_completeness_proven, false);
});
test('existing April review remains unresolved, with preserved bucket and age', () => {
  const f = fixture(); f.discovery.push({ id: 'review', tcgplayer_id: '456093', match_status: 'AMBIGUOUS',
    candidate_bucket: 'PRINTED_IDENTITY_REVIEW', created_at: '2026-04-13T03:02:06Z' });
  const row = run(f).rows[0];
  assert.equal(row.status, 'discovery_review'); assert.equal(row.overdue, true);
  assert.equal(row.discovery_candidates[0].bucket, 'PRINTED_IDENTITY_REVIEW');
});
test('a base Dragonite mapping cannot satisfy the GameStop identity', () => {
  const f = fixture(); f.parents.push({ ...parent, variant_key: '' });
  assert.equal(run(f).rows[0].status, 'retailer_identity_review');
});
test('exact GameStop relationship is recognized without claiming verified finish truth', () => {
  const f = fixture(); f.parents.push(parent);
  const result = run(f);
  assert.equal(result.rows[0].status, 'mapped_parent');
  assert.equal(result.summary.unresolved_count, 0);
  assert.equal(result.rows[0].write_ready, false);
  assert.equal(result.catalog_completeness_proven, false);
});
test('Japanese mappings cannot close English identities', () => {
  const f = fixture(); f.parents.push({ ...parent, language: 'ja' });
  assert.equal(run(f).rows[0].status, 'mapping_scope_conflict');
});
test('English mappings cannot close Japanese products', () => {
  const f = fixture(); f.products[0].category_id = 85; f.parents.push(parent);
  assert.equal(run(f).rows[0].status, 'mapping_scope_conflict');
});
test('a mapping to another game is retained as a conflict', () => {
  const f = fixture(); f.mappings.push({ source: 'tcgplayer', external_id: '456093', card_print_id: 'other-game', active: true });
  assert.equal(run(f).rows[0].status, 'mapping_scope_conflict');
});
test('multiple parent mappings remain ambiguous, even if one is GameStop', () => {
  const f = fixture(); f.parents.push(parent, { ...parent, id: 'other' });
  assert.equal(run(f).rows[0].status, 'mapping_conflict');
});
test('inactive mappings cannot close gaps', () => {
  const f = fixture(); f.parents.push({ ...parent, tcgplayer_id: null });
  f.mappings.push({ source: 'tcgplayer', external_id: '456093', card_print_id: parent.id, active: false });
  assert.equal(run(f).rows[0].status, 'untracked_card_candidate');
});
test('identifier normalization handles legacy leading zeros without matching arbitrary tokens', () => {
  const f = fixture(); f.parents.push({ ...parent, tcgplayer_id: '0456093' });
  assert.equal(run(f).rows[0].status, 'mapped_parent');
  f.parents[0].tcgplayer_id = '456093-not-an-id';
  assert.equal(run(f).rows[0].status, 'untracked_card_candidate');
});
test('retired source products remain in the denominator', () => {
  const f = fixture(); f.products[0].source_active = false;
  assert.equal(run(f).summary.unresolved_count, 1);
});
test('no number is not proof of a non-card product', () => {
  const f = fixture(); f.products[0].extended_data = [];
  assert.equal(run(f).rows[0].status, 'unclassified_product_review');
});
test('only an authorized active sealed mapping closes a non-card relationship', () => {
  const f = fixture(); f.sealed.push({ source_category_id: 3, source_product_id: 456093,
    source_provider: 'tcgplayer', mapping_status: 'exact_reviewed', promotion_authorized: false });
  assert.equal(run(f).summary.unresolved_count, 1);
  f.sealed[0].promotion_authorized = true;
  assert.equal(run(f).rows[0].status, 'mapped_sealed_product');
});
test('read-only target accepts both verified canonical routes and rejects other projects and options', () => {
  assert.equal(pokemonCoverageDatabaseTarget('postgres://postgres:x@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres').hostname,
    'db.ycdxbpibncqcchqiihfz.supabase.co');
  assert.equal(pokemonCoverageDatabaseTarget('postgres://postgres.ycdxbpibncqcchqiihfz:x@aws-1-us-east-2.pooler.supabase.com:6543/postgres?sslmode=require').search, '');
  for (const url of ['postgres://postgres:x@other.supabase.co/postgres',
    'postgres://postgres.other:x@aws-1-us-east-2.pooler.supabase.com/postgres',
    'postgres://postgres:x@db.ycdxbpibncqcchqiihfz.supabase.co/postgres?options=bad']) {
    assert.throws(() => pokemonCoverageDatabaseTarget(url));
  }
});
test('review, rejection and promotion labels alone cannot establish a canonical match', () => {
  for (const state of ['REVIEW_READY', 'REJECTED', 'PROMOTED']) {
    const f = fixture(); f.warehouse.push({ id: 'review', tcgplayer_id: '456093', state });
    assert.equal(run(f).summary.unresolved_count, 1);
  }
});
test('all input products have one deterministic output and duplicates fail', () => {
  const f = fixture(); f.products.push({ ...product, product_id: 694625, name: 'Ho-Oh (Gamestop)' });
  assert.deepEqual(run(f), run({ ...f, products: [...f.products].reverse() }));
  assert.equal(run(f).summary.accounted_product_count, 2);
  f.products.push(product); assert.throws(() => run(f), /Duplicate/);
});

test('an existing unmapped stamp is a mapping repair lead, never a duplicate insertion instruction', () => {
  const f = fixture();
  f.parents.push({ ...parent, name: 'Dragonite', number: '0131', tcgplayer_id: null });
  const row = run(f).rows[0];
  assert.equal(row.status, 'existing_identity_mapping_review');
  assert.equal(row.unresolved, true);
  assert.equal(row.suggested_existing_parents[0].id, parent.id);
  assert.equal(row.action, 'verify_existing_parent_and_repair_mapping_without_duplicate');
  f.parents[0].variant_key = 'silver_tempest_stamp';
  assert.deepEqual(run(f).rows[0].suggested_existing_parents, []);
});
test('parent-only promotion remains incomplete until child printings exist', () => {
  const f = fixture(); f.parents.push({ ...parent, printing_count: 0 });
  assert.equal(run(f).rows[0].status, 'mapped_parent_without_printings');
  assert.equal(run(f).summary.unresolved_count, 1);
});
test('worklist prioritizes GameStop, reuses existing queue IDs and cannot grant write authority', () => {
  const f = fixture();
  f.products.push({ ...product, product_id: 100, name: 'Another card' });
  f.warehouse.push({ id: 'existing-queue', tcgplayer_id: 456093, state: 'REVIEW_READY' });
  const report = run(f), work = buildPokemonWarehouseWorklist(report);
  assert.equal(work.tasks.length, 2);
  assert.equal(work.tasks[0].task_key, 'tcgcsv:3:456093');
  assert.deepEqual(work.tasks[0].promotion_candidate_ids, ['existing-queue']);
  assert.ok(work.tasks.every(t => !t.write_ready));
  assert.ok(work.tasks[0].completion_requires.includes('retailer_search_readback'));
  assert.equal(work.coverage_fingerprint, report.fingerprint);
});
test('queue row ordering cannot change the coverage fingerprint', () => {
  const f = fixture();
  f.discovery.push({ id: 'b', tcgplayer_id: 456093 }, { id: 'a', tcgplayer_id: 456093 });
  assert.equal(run(f).fingerprint, run({ ...f, discovery: [...f.discovery].reverse() }).fingerprint);
});
