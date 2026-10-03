import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { loadClassicCanonicalBundle, assertClassicBundleFilesUnchanged } from '../../backend/catalog/pokemon_classic_canonical_bundle_v1.mjs';
import { applyClassicLocalQualification, verifyClassicCanonicalReadback, assertClassicCanonicalPlan, TABLES } from '../../backend/catalog/pokemon_classic_canonical_admission_v1.mjs';
import { printingManifestHash as hash } from '../../backend/catalog/printing_completeness_gate_v1.mjs';

const [state, inputDir, name, out] = process.argv.slice(2);
assert.match(name ?? '', /^grookai_classic_canonical_proof_[a-z0-9_]+$/); assert.ok(out); fs.mkdirSync(out);
const read = file => JSON.parse(fs.readFileSync(file));
const save = (file, value) => fs.writeFileSync(out + '/' + file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const schema = read(inputDir + '/schema.json'), plan = read(inputDir + '/plan.json'), dependencies = read(inputDir + '/dependencies.json');
const sourceFiles = ['backend/catalog/pokemon_classic_canonical_admission_v1.mjs', 'backend/catalog/pokemon_classic_canonical_bundle_v1.mjs',
  'backend/catalog/pokemon_classic_family_evidence_v1.mjs', 'scripts/proofs/pokemon_classic_canonical_admission_v1.mjs'];
const sourceHashes = sourceFiles.map(file => ({ file, hash: hash(fs.readFileSync(file).toString()) }));
save('source-bindings.json', sourceHashes);
const bundle = loadClassicCanonicalBundle({ qualificationAt: plan.qualification_at, stagingDir: state + '/classic-finish-staging-v3', speciesFile: inputDir + '/species.json', observationFile: state + '/classic-family-evidence-v2/clv032-physical-domain-observation.json' });
assertClassicCanonicalPlan(plan, bundle);
const url = new URL(process.env.DISCOVERY_INTAKE_PROOF_URL); assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname)); assert.equal(url.pathname, '/postgres');
const config = { connectionString: url.toString(), ssl: false, connectionTimeoutMillis: 15000 };
const admin = new pg.Client(config); await admin.connect();
assert.equal((await admin.query('select 1 from pg_database where datname=$1', [name])).rowCount, 0, 'fresh_database_required');
await admin.query(`create database ${name}`); await admin.end(); url.pathname = '/' + name; config.connectionString = url.toString();
const db = new pg.Client(config); await db.connect(); const checks = [], deferred = [];
const insert = async (table, rows) => {
  for (const row of rows) { const cols = Object.keys(row).filter(k => !schema.columns.some(c => c.table_name === table && c.column_name === k && c.is_generated === 'ALWAYS'));
    await db.query(`insert into public.${table} (${cols.join(',')}) select ${cols.join(',')} from jsonb_populate_record(null::public.${table},$1::jsonb)`, [JSON.stringify(row)]); }
};
const tx = () => db.query('begin isolation level serializable read write');
const apply = () => applyClassicLocalQualification(db, plan, bundle);
const baseSnapshot = async () => {
  const result = {};
  for (const table of [...schema.tables, 'proof_existing_dependencies']) result[table] = (await db.query(`select to_jsonb(t) row from public.${table} t order by to_jsonb(t)::text`)).rows;
  return result;
};
try {
  await db.query('create schema extensions'); await db.query('create extension pgcrypto with schema extensions'); await db.query('create extension pg_trgm');
  for (const table of schema.tables) {
    assert.match(table, /^[a-z_]+$/); const cols = schema.columns.filter(c => c.table_name === table); assert.ok(cols.length);
    for (const c of cols.filter(c => c.column_default?.includes('nextval('))) await db.query(`create sequence ${table}_${c.column_name}_seq start 1000000`);
    await db.query(`create table public.${table} (${cols.map(c => {
      assert.match(c.column_name, /^[a-z_]+$/);
      const type = c.data_type === 'ARRAY' ? c.udt_name.slice(1) + '[]' : c.udt_name;
      assert.match(type, /^[a-z0-9_]+(?:\[\])?$/);
      return `"${c.column_name}" ${type}${c.is_generated === 'ALWAYS' ? ' generated always as (' + c.generation_expression + ') stored' : ''}${c.is_nullable === 'NO' ? ' not null' : ''}${c.column_default ? ' default ' + c.column_default : ''}`;
    }).join(',')})`);
  }
  let functions = [...schema.functions];
  while (functions.length) {
    const pending = []; let progressed = false;
    for (const f of functions) {
      try { await db.query(f.definition); progressed = true; }
      catch (e) { if (!['42883', '42P01'].includes(e.code)) throw e; pending.push(f); }
    }
    assert.ok(progressed, 'unresolved_function_dependencies:' + pending.map(f => f.signature).join(',')); functions = pending;
  }
  for (const c of schema.constraints.filter(c => schema.tables.includes(c.table_name)).sort((a, b) => Number(a.contype === 'f') - Number(b.contype === 'f'))) {
    await db.query(`alter table public.${c.table_name} add constraint ${c.conname} ${c.definition}`);
  }
  for (const i of schema.indexes) {
    if (!(await db.query('select 1 from pg_class where relname=$1', [i.indexname])).rowCount) await db.query(i.indexdef);
  }
  for (const t of schema.triggers) await db.query(t.definition);
  await db.query('create table public.canon_warehouse_candidates(tcgplayer_id text)');
  await db.query('create table public.sealed_product_source_mappings(source_provider text,source_product_id bigint,source_category_id int,mapping_status text,promotion_authorized boolean)');
  deferred.push('canon_warehouse_candidates and sealed_product_source_mappings are empty guard fixtures; full application/public RPC replay remains required');
  deferred.push('inbound application FKs are inventoried, not a complete application schema replay; preservation uses explicit dependency sentinels');
  for (const [table, rows] of Object.entries(dependencies)) await insert(table, rows);
  await insert('sets', read(inputDir + '/namespace.json').sets);
  await insert('pokemon_species', bundle.species.map(s => ({ ...s, canonical_name: s.display_name, slug: 'fixture-species-' + s.national_dex_number })));
  const g = plan.ingress.group_input;
  const syncIds = [...new Set(g.products.map(p => p.last_seen_run_id).filter(Boolean))];
  await insert('tcgcsv_source_sync_runs', syncIds.map(id => ({ id, run_key: 'fixture:' + id, sync_mode: 'current_full_sync', worker_version: 'fixture', parser_version: 'fixture', schema_contract_version: 'fixture' })));
  await insert('tcgcsv_source_products', g.products); await insert('raw_imports', g.raw_receipts); await insert('external_discovery_candidates', g.discovery);
  const priorSet = read(inputDir + '/namespace.json').sets.find(s => s.game === 'pokemon');
  const sentinelId = randomUUID(), sentinelChild = randomUUID();
  await insert('card_prints', [{ id: sentinelId, set_id: priorSet.id, name: 'Isolated preservation sentinel', number: 'PROOF', number_plain: 'PROOF', gv_id: 'GV-PK-PROOF-SENTINEL' }]);
  await insert('card_printings', [{ id: sentinelChild, card_print_id: sentinelId, finish_key: 'holo', printing_gv_id: 'GV-PK-PROOF-SENTINEL-H' }]);
  await db.query('create table public.proof_existing_dependencies(id uuid primary key,parent_id uuid references card_prints(id),child_id uuid references card_printings(id),payload jsonb not null)');
  await insert('proof_existing_dependencies', [{ id: randomUUID(), parent_id: sentinelId, child_id: sentinelChild, payload: { ownership: 'preserve', alias: 'preserve', image: 'preserve' } }]);
  const baseline = await baseSnapshot(), baselineHash = hash(baseline); save('baseline.json', { hash: baselineHash, counts: Object.fromEntries(Object.entries(baseline).map(([k, v]) => [k, v.length])) });
  checks.push(`${schema.tables.length} actual table definitions including generated columns, all relevant constraints/indexes/triggers and${schema.functions.length} current functions replayed`);
  const originalQuery = db.query.bind(db);
  const bulkStatements = [], started = performance.now();
  db.query = async (sql, args) => {
    if (/^insert into public\.(sets|card_prints|card_print_identity|card_print_identity_source_evidence|card_print_family_review_queue|card_printings|card_printing_truth_reviews|external_mappings)\s/.test(sql)) bulkStatements.push(sql);
    return originalQuery(sql, args);
  };
  await tx(); await apply(); await db.query('rollback'); db.query = originalQuery;
  save('bulk-performance.json', { elapsed_ms: performance.now() - started, canonical_insert_statements: bulkStatements.length,
    exact_table_batches: 8, local_only: true, production_latency_or_lock_duration_proved: false });
  assert.equal(bulkStatements.length, 8, 'one_canonical_insert_per_dependency_table');
  assert.ok(bulkStatements.every(sql => sql.includes('jsonb_populate_recordset')));
  assert.equal(hash(await baseSnapshot()), baselineHash); checks.push('whole102 canonical plus21 ingress rollback preserves every prior fixture row');
  checks.push('eight bounded canonical table insert statements preserve constraints and row triggers');
  await tx(); db.query = async (sql, args) => { if (sql.startsWith('insert into public.card_printing_truth_reviews')) throw new Error('injected_after102_children'); return originalQuery(sql, args); };
  await assert.rejects(apply, /injected_after102_children/); db.query = originalQuery; await db.query('rollback'); assert.equal(hash(await baseSnapshot()), baselineHash); checks.push('failure after102 children rolls back parents, identities, evidence, families, children and ingress');
  for (const [label, sql, args, expected] of [
    ['source drift', "update tcgcsv_source_products set name='drift' where product_id=$1", [plan.lineage[0].product_id], /whole_group_source_drift/],
    ['species drift', "update pokemon_species set display_name='drift' where id=$1", [bundle.species[0].id], /species_identity_drift/],
    ['inactive finish', "update finish_keys set is_active=false where key='holo'", [], /active_holo_taxonomy_required/],
    ['retained raw drift', "update raw_imports set payload=payload||'{\"drift\":true}'::jsonb where id=$1", [g.raw_receipts[0].id], /whole_group_raw_drift/],
    ['set-code collision', 'insert into sets(code,name) values($1,$2)', [plan.tables.sets[0].code, 'collision'], /canonical_collision:sets/],
    ['GVID collision', 'insert into card_prints(set_id,name,gv_id) values($1,$2,$3)', [priorSet.id, 'collision', plan.tables.card_prints[0].gv_id], /canonical_collision:card_prints/],
  ]) { await tx(); await db.query(sql, args); await assert.rejects(apply, expected); await db.query('rollback'); checks.push(label + ' rejected'); }
  const contender = new pg.Client(config); await contender.connect();
  try {
    await tx(); await apply();
    for (const [label, sql, args] of [
      ['source phantom', 'insert into tcgcsv_source_products(product_id,category_id,group_id,raw_payload,payload_hash) values(999999999,3,23323,$1,$2)', ['{}', 'a'.repeat(64)]],
      ['canonical competing insert', 'insert into sets(code,name) values($1,$2)', [plan.tables.sets[0].code, 'contender']],
      ['retained raw mutation', "update raw_imports set status='pending' where id=$1", [g.raw_receipts[0].id]],
      ['species mutation', "update pokemon_species set display_name='contender' where id=$1", [bundle.species[0].id]],
    ]) {
      await contender.query('begin'); await contender.query("set local lock_timeout='100ms'");
      await assert.rejects(() => contender.query(sql, args), e => e.code === '55P03'); await contender.query('rollback'); checks.push(label + ' excluded until transaction end');
    }
    await db.query('rollback');
    await tx(); await db.query("select pg_advisory_xact_lock(hashtext('pokemon_classic_canonical_admission_v1'))");
    await contender.query('begin isolation level serializable'); await contender.query("set local lock_timeout='100ms'");
    await assert.rejects(() => applyClassicLocalQualification(contender, plan, bundle), e => e.code === '55P03');
    await contender.query('rollback'); await db.query('rollback'); checks.push('own executor lock excludes simultaneous executor');
    await contender.query('begin'); await contender.query("set local lock_timeout='100ms'"); await contender.query('update raw_imports set payload=payload where id=$1', [g.raw_receipts[0].id]); await contender.query('rollback'); checks.push('rollback releases locks for other workers');
  } finally { await contender.end(); }
  assert.equal(hash(await baseSnapshot()), baselineHash);
  await tx(); const result = await apply(); await db.query('commit'); save('committed.json', { result, fingerprint: plan.fingerprint, local_only: true }); checks.push('whole102 plus21 ingress commit');
  const independent = new pg.Client(config); await independent.connect();
  try { await independent.query('begin isolation level repeatable read read only'); const counts = await verifyClassicCanonicalReadback(independent, plan); await independent.query('commit'); save('independent-readback.json', { counts, local_only: true }); }
  finally { await independent.end(); }
  checks.push('independent exact readback reconciles lost commit response without retry');
  const afterHash = hash(await baseSnapshot()); await tx(); const repeat = await apply(); await db.query('commit'); assert.equal(repeat.inserted, 0); assert.equal(hash(await baseSnapshot()), afterHash); checks.push('successful package repeat changes zero rows');
  const after = await baseSnapshot();
  for (const [table, rows] of Object.entries(baseline)) {
    const afterRows = new Set(after[table].map(hash));
    for (const row of rows) assert.ok(afterRows.has(hash(row)), 'existing_dependency_drift:' + table);
  }
  checks.push('all baseline rows and explicit UUID/FK/ownership/alias/image dependency sentinels retained');
  await tx(); await db.query("update card_printings set provenance_ref='tampered' where id=$1", [plan.tables.card_printings[0].id]); await assert.rejects(apply, /canonical_exact_readback:card_printings/); await db.query('rollback'); checks.push('changed committed provenance blocks idempotent replay');
  assertClassicBundleFilesUnchanged(bundle);
  for (const row of sourceHashes) assert.equal(hash(fs.readFileSync(row.file).toString()), row.hash, 'source_changed_during_SQL_qualification');
  const report = { status: 'passed', at: new Date().toISOString(), database: name, fingerprint: plan.fingerprint, checks, deferred,
    source_files_unchanged: true, production_writes: 0, production_apply_enabled: false, local_new_canonical_parents: 102, local_ingress_rows: 21,
    counts: Object.fromEntries(TABLES.map(t => [t, plan.tables[t].length])) };
  save('proof.json', report); console.log(JSON.stringify(report));
} catch (e) { await db.query('rollback').catch(() => {}); save('failure.json', { at: new Date().toISOString(), checks, error: e.stack }); throw e; }
finally { await db.end(); }
