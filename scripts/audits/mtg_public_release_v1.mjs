import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertMtgPublicAdditivePlanV1, buildMtgPublicAdditivePlanV1, mtgDigestV1 } from './mtg_public_additive_plan_v1.mjs';
import { stageMtgPublicReviewV1 } from './mtg_public_additive_rehearsal_v1.mjs';
import { captureMtgMappingSequenceV1, assertMtgMappingAllocationV1 } from './mtg_public_commit_qualification_v1.mjs';
import { captureMtgPromotionCollisionsV1, captureMtgPromotionExactReadbackV1, insertMtgPromotionRowsV1 } from './mtg_canonical_catalog_promotion_rollback_proof_v1.mjs';

export const MTG_PUBLIC_RELEASE_PLAN_SHA = '226b29133774f33c1ab3e7d540c9b482f60fe6de4c753b7f58ef6a0c02fe9c1a';
export const MTG_PUBLIC_RELEASE_VERSION = 'MTG_PUBLIC_RELEASE_V1';
export const MTG_PUBLIC_RELEASE_COUNTS = Object.freeze({ sets: 2, card_prints: 555, card_print_identity: 555,
  card_printings: 960, external_mappings: 555, external_printing_mappings: 945 });
const truth = JSON.parse(readFileSync(new URL('../../docs/truth/mtg/reality_fracture_released_20261007.json', import.meta.url)));
const quote = value => '"' + value.replaceAll('"', '""') + '"';

// Separate authority from the historical rollback-only qualification plan. The
// original generator provenance and its frozen boundary are never rewritten.
export function assertMtgReleasePayloadV1(plan) {
  assertMtgPublicAdditivePlanV1(plan);
  assert.equal(plan.plan_sha256, MTG_PUBLIC_RELEASE_PLAN_SHA, 'Unreviewed release plan');
  assert.deepEqual(buildMtgPublicAdditivePlanV1(plan.stages.map(s => s.payload), truth), plan);
  assert.deepEqual(Object.fromEntries(Object.entries(plan.rows).map(([k, rows]) => [k, rows.length])), MTG_PUBLIC_RELEASE_COUNTS);
}

export function assertMtgReleaseEnvelopeV1(envelope, { producer, now = new Date() }) {
  const { sha256, ...core } = envelope;
  assert.equal(mtgDigestV1(core), sha256, 'Release envelope changed');
  assert.equal(core.version, MTG_PUBLIC_RELEASE_VERSION);
  assert.equal(core.plan_sha256, MTG_PUBLIC_RELEASE_PLAN_SHA);
  assert.match(producer, /^[a-f0-9]{40}$/);
  assert.equal(core.executor_commit_sha, producer, 'Wrong immutable executor');
  assert.equal(core.project_ref, 'ycdxbpibncqcchqiihfz');
  assert.equal(core.source_bulk_sha256, truth.source_bulk_sha256);
  assert.equal(core.source_updated_at, truth.source_updated_at);
  assert.equal(core.source_sync_run_id, '3732f66b-66f0-42e2-8afa-9699d7a0f286');
  assert.equal(core.source_sync_finished_at, '2026-10-07T09:31:11.339Z');
  assert.equal(core.qualification_commit_sha, '86a39f88469bdb5c5e0a0f74a7c8aa7136a623ac');
  assert.match(core.schema_versions_sha256, /^[a-f0-9]{64}$/);
  assert.match(core.database_structure_sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(core.boundaries, { inserts: MTG_PUBLIC_RELEASE_COUNTS, staging_batches: 2, staging_rows: 3572,
    updates: false, deletes: false, ddl: false, pricing_activation: false, release_control_changes: false, vault_writes: false });
  const at = now.getTime();
  for (const [date, maxAge] of [[core.source_updated_at, 24 * 3600000], [core.source_sync_finished_at, 36 * 3600000]]) {
    const age = at - Date.parse(date);
    assert.ok(Number.isFinite(age) && age >= 0 && age <= maxAge, 'Release source evidence expired');
  }
  assert.ok(at < Date.parse(truth.held_until + 'T00:00:00Z'), 'Future-card holds require a new review');
  return core;
}

export async function assertMtgProductionReleaseTargetV1(client) {
  const p = client.connectionParameters;
  assert.equal(p.host, 'aws-1-us-east-2.pooler.supabase.com');
  assert.equal(Number(p.port), 5432);
  assert.equal(p.user, 'postgres.ycdxbpibncqcchqiihfz');
  assert.equal(p.database, 'postgres');
  assert.equal(p.ssl?.rejectUnauthorized, true);
  assert.equal(client.connection.stream.authorized, true);
  const s = (await client.query(`select current_database() db,current_user username,
    current_setting('transaction_isolation') isolation,current_setting('transaction_read_only') readonly,
    current_setting('track_counts') track_counts`)).rows[0];
  assert.deepEqual(s, { db: 'postgres', username: 'postgres', isolation: 'serializable', readonly: 'off', track_counts: 'on' });
  const counts = (await client.query(`select (select count(*)::int from public.card_prints) cards,
    (select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits`)).rows[0];
  assert.ok(counts.cards >= 40000 && counts.sets >= 150 && counts.traits >= 5000, 'Environment mismatch');
  return counts;
}

// Connection-local native counters include trigger side effects and can include
// pending counts from earlier transactions. Compare within one transaction;
// other sessions' inventory/pricing activity cannot be mistaken for our writes.
export async function captureMtgTransactionWritesV1(client) {
  assert.equal((await client.query('show track_counts')).rows[0].track_counts, 'on');
  return (await client.query(`select schemaname,relname,n_tup_ins::text,n_tup_upd::text,n_tup_del::text
    from pg_stat_xact_all_tables where n_tup_ins<>0 or n_tup_upd<>0 or n_tup_del<>0 order by 1,2`)).rows;
}

export function assertMtgTransactionWritesV1(rows, expected) {
  const actual = {};
  for (const row of rows) {
    assert.equal(row.schemaname, 'public', 'Unexpected schema write');
    assert.ok(Object.hasOwn(expected, row.relname), 'Unexpected table write: ' + row.relname);
    assert.equal(row.n_tup_upd, '0', 'Update side effect');
    assert.equal(row.n_tup_del, '0', 'Delete side effect');
    assert.ok(!Object.hasOwn(actual, row.relname));
    actual[row.relname] = row.n_tup_ins;
  }
  assert.deepEqual(actual, Object.fromEntries(Object.entries(expected).map(([k,v]) => [k,String(v)])), 'Unexpected insert counts');
}

export function mtgTransactionWriteDeltaV1(before, after) {
  const key = r => r.schemaname + '.' + r.relname;
  const first = new Map(before.map(r => [key(r), r])), last = new Map(after.map(r => [key(r), r]));
  const result = [];
  for (const name of [...new Set([...first.keys(), ...last.keys()])].sort()) {
    const a = first.get(name), b = last.get(name), row = { schemaname: (b ?? a).schemaname, relname: (b ?? a).relname };
    for (const field of ['n_tup_ins', 'n_tup_upd', 'n_tup_del']) {
      const delta = BigInt(b?.[field] ?? '0') - BigInt(a?.[field] ?? '0');
      assert.ok(delta >= 0n, 'Write counters reset during protected transaction');
      row[field] = String(delta);
    }
    if (['n_tup_ins','n_tup_upd','n_tup_del'].some(f => row[f] !== '0')) result.push(row);
  }
  return result;
}

export async function captureMtgDatabaseStructureV1(client) {
  const tables = (await client.query(`select n.nspname,c.relname,c.relkind,c.relowner::regrole::text owner,
    c.relrowsecurity,c.relforcerowsecurity,c.relacl::text,
    coalesce((select jsonb_agg(to_jsonb(p) order by policyname) from pg_policies p
      where p.schemaname=n.nspname and p.tablename=c.relname),'[]'::jsonb) policies
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','auth','storage','supabase_migrations') and c.relkind in ('r','p','v','m','S') order by 1,2`)).rows;
  const triggers = (await client.query(`select n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) definition
    from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','auth','storage') order by 1,2,3`)).rows;
  const functions = (await client.query(`select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) args,
    p.proowner::regrole::text owner,p.proacl::text,p.proconfig,p.prosecdef,pg_get_functiondef(p.oid) definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','auth','storage') and p.prokind in ('f','p') order by 1,2,3`)).rows;
  const columns = (await client.query(`select table_schema,table_name,column_name,ordinal_position,data_type,
    udt_schema,udt_name,is_nullable,column_default,is_identity,identity_generation,is_generated,generation_expression
    from information_schema.columns where table_schema in ('public','auth','storage','supabase_migrations') order by 1,2,4`)).rows;
  const constraints = (await client.query(`select n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid) definition
    from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','auth','storage','supabase_migrations') order by 1,2,3`)).rows;
  return { sha256: mtgDigestV1({ tables,triggers,functions,columns,constraints }), tableCount: tables.length };
}

export async function captureMtgReleasePreservationV1(client, plan) {
  assertMtgReleasePayloadV1(plan);
  const names = [...Object.keys(plan.rows), 'mtg_canonical_import_batches', 'mtg_canonical_import_rows',
    'vault_item_instances', 'catalog_game_release_controls'];
  const tables = {};
  for (const name of names) {
    let where = '', params = [];
    if (plan.rows[name]) {
      if (name.includes('mappings')) {
        where = "where not (source||':'||external_id=any($1::text[]))";
        params = [plan.rows[name].map(r => r.source + ':' + r.external_id)];
      } else { where = 'where not(id=any($1::uuid[]))'; params = [plan.rows[name].map(r => r.id)]; }
    } else if (name.startsWith('mtg_canonical_import_')) {
      where = `where not(${name.endsWith('batches') ? 'id' : 'batch_id'}=any($1::uuid[]))`;
      params = [plan.stages.map(s => s.contract.batch_id)];
    }
    tables[name] = (await client.query(`select count(*)::int count,
      encode(sha256(convert_to(coalesce(string_agg(h,'' order by h),''),'UTF8')),'hex') sha256
      from (select encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') h from public.${quote(name)} t ${where}) hashes`, params)).rows[0];
  }
  const ledger = (await client.query('select * from supabase_migrations.schema_migrations order by version')).rows;
  return { tables, ledger_sha256: mtgDigestV1(ledger), structure: await captureMtgDatabaseStructureV1(client) };
}

// Shared insert core: callers must bind a target, own the transaction and persist
// intent first. No COMMIT, connection creation, retry or authorization inference.
export async function insertReviewedMtgPublicReleaseV1(client, plan) {
  assertMtgReleasePayloadV1(plan);
  assert.equal((await client.query('show transaction_isolation')).rows[0].transaction_isolation, 'serializable');
  const writesBefore = await captureMtgTransactionWritesV1(client);
  assert.deepEqual((await client.query("select release_status from public.catalog_game_release_controls where game_code='mtg'")).rows, [{ release_status: 'public' }]);
  assert.equal((await client.query('select pg_try_advisory_xact_lock(20261007,555960) locked')).rows[0].locked, true);
  await client.query('lock table public.sets,public.card_prints,public.card_print_identity,public.card_printings,public.external_mappings,public.external_printing_mappings,public.mtg_canonical_import_batches,public.mtg_canonical_import_rows in share row exclusive mode');
  const collisions = await captureMtgPromotionCollisionsV1(client, plan.rows);
  assert.ok(Object.values(collisions).every(n => Number(n) === 0), 'Canonical collision or partial prior apply');
  assert.equal((await client.query('select count(*)::int n from public.mtg_canonical_import_batches where id=any($1::uuid[])', [plan.stages.map(s => s.contract.batch_id)])).rows[0].n, 0, 'Staging already exists');
  const before = await captureMtgReleasePreservationV1(client, plan);
  const sequenceBefore = await captureMtgMappingSequenceV1(client);
  const otherSequences = async () => (await client.query(`select schemaname,sequencename,sequenceowner,
    start_value::text,min_value::text,max_value::text,increment_by::text,cycle,cache_size::text,last_value::text
    from pg_sequences where schemaname in ('public','auth','storage')
    and not(schemaname='public' and sequencename='external_mappings_id_seq') order by 1,2`)).rows;
  const sequencesBefore = await otherSequences();
  for (const stage of plan.stages) await stageMtgPublicReviewV1(client, stage);
  const inserted = await insertMtgPromotionRowsV1(client, plan.rows);
  assert.deepEqual(inserted, MTG_PUBLIC_RELEASE_COUNTS);
  // Force deferred triggers/constraints before preservation and write-set checks.
  await client.query('set constraints all immediate');
  const exact = await captureMtgPromotionExactReadbackV1(client, plan.rows);
  for (const [table, check] of Object.entries(exact)) {
    assert.equal(Number(check.actual_count), MTG_PUBLIC_RELEASE_COUNTS[table], table);
    assert.equal(Number(check.exact_count), MTG_PUBLIC_RELEASE_COUNTS[table], table);
  }
  const allocated = (await client.query("select id::text,source,external_id,card_print_id from public.external_mappings where source='scryfall' and external_id=any($1::text[]) order by external_id", [plan.rows.external_mappings.map(r => r.external_id)])).rows;
  const sequenceAfter = await captureMtgMappingSequenceV1(client);
  assert.equal(allocated.length, 555);
  assertMtgMappingAllocationV1(sequenceBefore, sequenceAfter, allocated);
  assert.deepEqual(await otherSequences(), sequencesBefore, 'Another sequence advanced; do not reset or retry automatically');
  const writes = mtgTransactionWriteDeltaV1(writesBefore, await captureMtgTransactionWritesV1(client));
  assertMtgTransactionWritesV1(writes, { ...MTG_PUBLIC_RELEASE_COUNTS, mtg_canonical_import_batches: 2, mtg_canonical_import_rows: 3572 });
  assert.deepEqual(await captureMtgReleasePreservationV1(client, plan), before, 'Existing rows, schema or security changed');
  assertMtgReleasePayloadV1(plan);
  assert.deepEqual(mtgTransactionWriteDeltaV1(writesBefore, await captureMtgTransactionWritesV1(client)), writes);
  return { version: MTG_PUBLIC_RELEASE_VERSION, plan_sha256: plan.plan_sha256, inserted, exact, allocated,
    sequenceBefore, sequenceAfter, otherSequences: sequencesBefore, preservation: before, writesBefore, writes, committed: false };
}

export async function prepareMtgProductionReleaseInTransactionV1(client, plan, envelope, producer) {
  assertMtgReleasePayloadV1(plan);
  assertMtgReleaseEnvelopeV1(envelope, { producer });
  await assertMtgProductionReleaseTargetV1(client);
  const versions = (await client.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(r => r.version);
  assert.equal(versions.length, 429);
  assert.equal(mtgDigestV1(versions), envelope.schema_versions_sha256, 'Schema version drift');
  assert.equal((await captureMtgDatabaseStructureV1(client)).sha256, envelope.database_structure_sha256, 'Database structure drift');
  const sync = (await client.query('select status,failed_count,error,finished_at from public.tcgcsv_source_sync_runs where id=$1', [envelope.source_sync_run_id])).rows;
  assert.equal(sync.length, 1);
  assert.equal(sync[0].status, 'completed'); assert.equal(sync[0].failed_count, 0); assert.equal(sync[0].error, null);
  assert.equal(new Date(sync[0].finished_at).toISOString(), envelope.source_sync_finished_at);
  const proof = await insertReviewedMtgPublicReleaseV1(client, plan);
  assertMtgReleaseEnvelopeV1(envelope, { producer });
  return { ...proof, envelope_sha256: envelope.sha256, producer };
}
