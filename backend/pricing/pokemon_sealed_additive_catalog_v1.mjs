import assert from 'node:assert/strict';
import { buildPokemonSealedWorldPlanV1, validatePokemonSealedWorldPlanV1,
  POKEMON_SEALED_REVIEWER_ID, pokemonSealedHashV1 as hash } from './pokemon_sealed_world_v1.mjs';
import { insertSealedWorldPlanV1 } from './sealed_world_writer_v1.mjs';

export const POKEMON_SEALED_ADDITIVE_CATALOG_V1 = 'POKEMON_SEALED_ADDITIVE_CATALOG_V1';
export const POKEMON_SEALED_ADDITIVE_TABLES_V1 = Object.freeze({
  candidates: 'sealed_product_candidates', families: 'sealed_product_families',
  variants: 'sealed_product_variants', reviews: 'sealed_product_candidate_reviews',
  mappings: 'sealed_product_source_mappings', evidence: 'sealed_product_variant_evidence',
  qualifications: 'sealed_product_pricing_lane_qualifications', releases: 'sealed_product_releases',
  members: 'sealed_product_release_members',
});
const tables = POKEMON_SEALED_ADDITIVE_TABLES_V1;
const sorted = ids => [...ids].map(Number).sort((a, b) => a - b);

export function assertPokemonSealedAdditiveScopeV1(plan, authority) {
  const validation = validatePokemonSealedWorldPlanV1(plan);
  assert.ok(validation.valid, validation.findings.join(','));
  assert.equal(plan.plan_fingerprint_sha256, authority.fingerprint, 'Plan authority mismatch');
  assert.equal(plan.producer_commit, authority.producerCommit, 'Producer mismatch');
  assert.ok(authority.productIds.length > 0 && authority.productIds.length <= 50);
  assert.ok(authority.productIds.every(id => Number.isSafeInteger(id) && id > 0));
  assert.equal(new Set(authority.productIds).size, authority.productIds.length);
  assert.deepEqual(sorted(plan.payload.mappings.map(r => r.source_product_id)), sorted(authority.productIds), 'Product scope mismatch');
  assert.equal(plan.payload.families.length, 1, 'One existing family per additive transaction');
  assert.equal(plan.payload.families[0].game_key, 'pokemon');
  assert.equal(plan.payload.qualifications.length, authority.productIds.length);
  assert.equal(plan.payload.members.length, authority.productIds.length, 'Every candidate must have exact price evidence');
  assert.ok(plan.payload.qualifications.every(q => q.qualification_status === 'qualified_exact'));
}

export function assertPokemonSealedProjectionV1(expected, actual, frozenRelease = false) {
  assert.ok(actual, 'Missing expected row');
  for (const [field, value] of Object.entries(expected)) {
    const want = frozenRelease && field === 'release_state' ? 'frozen' : value;
    assert.deepEqual(typeof want === 'number' ? Number(actual[field]) : actual[field], want, `Projection drift: ${field}`);
  }
}

async function targetRows(client, plan) {
  const result = {};
  for (const [key, table] of Object.entries(tables)) result[key] = (await client.query(
    `select to_jsonb(t) value from public.${table} t where id=any($1::uuid[]) order by id`,
    [plan.payload[key].map(r => r.id)])).rows.map(r => r.value);
  return result;
}

export async function verifyPokemonSealedAdditiveAbsentV1(client, plan) {
  const actual = await targetRows(client, plan);
  assert.equal(actual.families.length, 1, 'Existing family must survive rollback');
  assertPokemonSealedProjectionV1(plan.payload.families[0], actual.families[0]);
  for (const key of Object.keys(tables).filter(k => k !== 'families'))
    assert.equal(actual[key].length, 0, `Rollback residue: ${key}`);
}

export async function verifyPokemonSealedAdditiveReadbackV1(client, plan) {
  const actual = await targetRows(client, plan);
  for (const key of Object.keys(tables)) {
    assert.equal(actual[key].length, plan.payload[key].length, `Readback count: ${key}`);
    for (const row of plan.payload[key]) assertPokemonSealedProjectionV1(row,
      actual[key].find(r => r.id === row.id), key === 'releases');
  }
  return Object.fromEntries(Object.entries(actual).map(([k, rows]) => [k, rows.length]));
}

async function protectedState(client, plan) {
  const state = {};
  for (const [key, table] of Object.entries(tables)) {
    const exclude = key === 'families' ? [] : plan.payload[key].map(r => r.id);
    state[table] = (await client.query(`select count(*)::integer count,
      md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by id),'')) digest
      from public.${table} t where not(id=any($1::uuid[]))`, [exclude])).rows[0];
  }
  for (const table of ['sealed_product_release_pointer', 'sealed_product_image_release_pointer', 'sealed_product_game_release_controls'])
    state[table] = (await client.query(`select to_jsonb(t) value from public.${table} t order by game_key`)).rows.map(r => r.value);
  return state;
}

async function attribution(client) {
  return (await client.query(`select relname, n_tup_ins::integer ins,n_tup_upd::integer upd,n_tup_del::integer del
    from pg_stat_xact_user_tables where n_tup_ins<>0 or n_tup_upd<>0 or n_tup_del<>0`)).rows;
}

// Caller owns the transaction, rollback/commit choice, repository freeze and
// independent readback. This function has no pointer or transaction-commit API.
export async function executePokemonSealedAdditiveCatalogV1(client, plan, authority, { write = false } = {}) {
  assertPokemonSealedAdditiveScopeV1(plan, authority);
  const isolation = (await client.query('show transaction_isolation')).rows[0].transaction_isolation;
  assert.equal(isolation, 'serializable', 'Explicit serializable transaction required');
  if (write) await client.query("select pg_advisory_xact_lock(hashtext('pokemon-sealed-world-v1'))");
  const source = (await client.query(`select p.*, c.name category_name,c.display_name category_display_name,
    c.non_sealed_label,g.name group_name from tcgcsv_source_products p
    join tcgcsv_source_categories c using(category_id) left join tcgcsv_source_groups g using(group_id)
    where p.product_id=any($1::bigint[]) order by p.product_id`, [authority.productIds])).rows;
  assert.equal(source.length, authority.productIds.length, 'Source population mismatch');
  const prices = (await client.query(`select distinct on(product_id,subtype_name_normalized)
    product_id,source_price_row_identity,subtype_name_normalized,observed_on::text,currency,
    market_price,low_price,mid_price,high_price,direct_low_price,payload_hash
    from tcgcsv_source_price_daily_observations where product_id=any($1::bigint[])
    order by product_id,subtype_name_normalized,observed_on desc,updated_at desc,id desc`, [authority.productIds])).rows;
  const sync = (await client.query(`select id,status,observed_on::text,finished_at
    from tcgcsv_source_sync_runs where id=$1 and sync_mode='current_full_sync'`, [plan.latest_sync.id])).rows[0];
  assert.ok(sync); if (sync.finished_at instanceof Date) sync.finished_at = sync.finished_at.toISOString();
  assert.deepEqual(sync, plan.latest_sync, 'Frozen sync authority changed');
  const day = (await client.query('select current_date::text as today')).rows[0].today;
  const age = value => (Date.parse(day) - Date.parse(value)) / 86400000;
  assert.ok(age(sync.observed_on) >= 0 && age(sync.observed_on) <= 2, 'Source sync expired');
  for (const q of plan.payload.qualifications) assert.ok(age(q.observed_on) >= 0 && age(q.observed_on) <= 7, 'Price expired');
  const fresh = buildPokemonSealedWorldPlanV1({ sourceRows: source, latestPriceRows: prices,
    latestSync: sync, producerCommit: authority.producerCommit });
  assert.equal(fresh.plan_fingerprint_sha256, plan.plan_fingerprint_sha256, 'Fresh source/price projection drift');

  const actual = await targetRows(client, plan);
  assert.equal(actual.families.length, 1, 'Exact existing family required');
  assertPokemonSealedProjectionV1(plan.payload.families[0], actual.families[0]);
  const owners = (await client.query(`select id,variant_id from sealed_product_source_mappings
    where source_provider='tcgplayer' and source_product_id=any($1::bigint[])`, [authority.productIds])).rows;
  const present = Object.keys(tables).filter(k => k !== 'families').reduce((n, k) => n + actual[k].length, 0);
  if (present) {
    await verifyPokemonSealedAdditiveReadbackV1(client, plan);
    assert.deepEqual(owners.map(r => r.id).sort(), plan.payload.mappings.map(r => r.id).sort(), 'Source owner drift');
    return { version: POKEMON_SEALED_ADDITIVE_CATALOG_V1, already_applied: true, inserted: 0, pointer_writes: 0 };
  }
  assert.equal(owners.length, 0, 'Source product already owned');
  const before = await protectedState(client, plan);
  const expectedInserted = Object.entries(plan.payload).filter(([k]) => k in tables && k !== 'families')
    .reduce((n, [, rows]) => n + rows.length, 0);
  if (!write) return { version: POKEMON_SEALED_ADDITIVE_CATALOG_V1, already_applied: false,
    inserted: 0, expected_inserted: expectedInserted, protected_state_fingerprint: hash(before), pointer_writes: 0 };
  const priorWrites = await attribution(client);
  await insertSealedWorldPlanV1(client, { ...plan, payload: { ...plan.payload, families: [] } },
    { reviewerId: POKEMON_SEALED_REVIEWER_ID, activate: false });
  const counts = await verifyPokemonSealedAdditiveReadbackV1(client, plan);
  assert.deepEqual(await protectedState(client, plan), before, 'Existing sealed state changed');
  const changes = new Map();
  for (const row of await attribution(client)) {
    const prior = priorWrites.find(p => p.relname === row.relname) ?? { ins: 0, upd: 0, del: 0 };
    const delta = { ins: row.ins - prior.ins, upd: row.upd - prior.upd, del: row.del - prior.del };
    if (delta.ins || delta.upd || delta.del) changes.set(row.relname, delta);
  }
  for (const [key, table] of Object.entries(tables)) {
    assert.deepEqual(changes.get(table) ?? { ins: 0, upd: 0, del: 0 },
      { ins: key === 'families' ? 0 : plan.payload[key].length, upd: key === 'releases' ? 1 : 0, del: 0 }, `Write attribution: ${table}`);
    changes.delete(table);
  }
  assert.equal(changes.size, 0, 'Unexpected write outside manifest');
  return { version: POKEMON_SEALED_ADDITIVE_CATALOG_V1, already_applied: false,
    inserted: expectedInserted, counts, protected_state_fingerprint: hash(before), pointer_writes: 0 };
}
