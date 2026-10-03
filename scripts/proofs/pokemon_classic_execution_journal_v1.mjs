import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { loadClassicCanonicalBundle } from '../../backend/catalog/pokemon_classic_canonical_bundle_v1.mjs';
import { loadClassicFrozenPackage, buildClassicFrozenPlan, classicFrozenPackageBinding } from '../../backend/catalog/pokemon_classic_frozen_package_v1.mjs';
import { TABLES, bindClassicIdentityHashes, verifyClassicCanonicalReadback } from '../../backend/catalog/pokemon_classic_canonical_admission_v1.mjs';
import { VERSION, classicExecutionIntent, applyClassicJournaledLocalQualification, reconcileClassicExecution } from '../../backend/catalog/pokemon_classic_execution_journal_v1.mjs';
import { applyDiscoveryIntakeBatch } from '../../backend/catalog/pokemon_warehouse_group_intake_v1.mjs';
import { printingManifestHash as hash } from '../../backend/catalog/printing_completeness_gate_v1.mjs';

const [state, freshObservation, name, out, dependencyReplay] = process.argv.slice(2);
assert.match(name ?? '', /^grookai_classic_canonical_proof_journal_[a-z0-9_]+$/); assert.ok(out); fs.mkdirSync(out);
const root = fileURLToPath(new URL('../../', import.meta.url));
const read = file => JSON.parse(fs.readFileSync(file));
const save = (file, data) => fs.writeFileSync(path.join(out, file), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const url = new URL(process.env.DISCOVERY_INTAKE_PROOF_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname)); assert.equal(url.pathname, '/postgres');
const dependencyProof = dependencyReplay ? read(dependencyReplay + '/proof.json') : null;
const dependencyBinding = dependencyReplay ? read(dependencyReplay + '/bindings.json') : null;
if (dependencyProof) {
  assert.equal(dependencyProof.status, 'selected_dependency_schema_replayed');
  assert.equal(dependencyProof.independent_catalog_readback, true);
  assert.match(dependencyProof.database, /^grookai_classic_canonical_proof_deps_[a-z0-9_]+$/);
  assert.match(dependencyBinding.roles.postgres, /^classic_dep_[a-f0-9]{12}_postgres$/);
}
const template = dependencyProof?.database ?? 'grookai_classic_canonical_proof_20261002_v4';
const config = { connectionString: url.toString(), ssl: false, connectionTimeoutMillis: 15000 };
const admin = new pg.Client(config); await admin.connect();
assert.equal((await admin.query('select 1 from pg_database where datname=$1', [name])).rowCount, 0, 'new_lab_required');
await admin.query(`create database ${name} template ${template}`); await admin.end();
url.pathname = '/' + name; config.connectionString = url.toString();
if (dependencyBinding) config.options = '-c role=' + dependencyBinding.roles.postgres;
const db = new pg.Client(config); await db.connect(); const checks = [];
const tx = () => db.query('begin isolation level serializable read write');
const frozen = loadClassicFrozenPackage(root);
const bundle = loadClassicCanonicalBundle({ qualificationAt: frozen.qualification_at, stagingDir: state + '/classic-finish-staging-v3',
  speciesFile: freshObservation + '/species.json', observationFile: state + '/classic-family-evidence-v2/clv032-physical-domain-observation.json' });
const built = buildClassicFrozenPlan(bundle, read(freshObservation + '/ingress.json'), frozen), plan = built.plan;
const baselineTables = [...(dependencyProof
  ? read(state + '/classic-dependency-leads-v1/replay-inputs.json').relations.filter(r => r.relkind === 'r').map(r => r.relname)
  : read(state + '/classic-canonical-plan-v3/schema.json').tables), 'proof_existing_dependencies'];
const snapshot = async () => {
  const result = {};
  for (const table of baselineTables) result[table] = (await db.query(`select to_jsonb(t) row from public.${table} t order by to_jsonb(t)::text`)).rows;
  return result;
};
try {
  assert.equal((await db.query('select current_database() name')).rows[0].name, name);
  const old = read(state + '/classic-canonical-plan-v3/plan.json');
  await tx(); await verifyClassicCanonicalReadback(db, old);
  // This cleanup is restricted to the NEW clone; never touches the template.
  const rawIds = (await db.query('select raw_import_id::text id from external_discovery_candidates where id=any($1::uuid[])', [old.ingress.entries.map(r => r.candidate_id)])).rows.map(r => r.id);
  assert.equal(rawIds.length, 21);
  for (const table of [...TABLES].reverse()) {
    const column = table === 'external_mappings' ? 'card_print_id' : 'id';
    const values = table === 'external_mappings' ? old.tables.card_prints.map(r => r.id) : old.tables[table].map(r => r.id);
    const deleted = await db.query(`delete from public.${table} where ${column}=any($1::uuid[])`, [values]);
    assert.equal(deleted.rowCount, old.tables[table].length);
  }
  assert.equal((await db.query('delete from external_discovery_candidates where id=any($1::uuid[])', [old.ingress.entries.map(r => r.candidate_id)])).rowCount, 21);
  assert.equal((await db.query('delete from raw_imports where id=any($1::bigint[])', [rawIds])).rowCount, 21);
  await db.query('commit');
  await bindClassicIdentityHashes(db, plan);
  const observation = read(freshObservation + '/observation.json');
  const binding = classicFrozenPackageBinding(frozen), intent = classicExecutionIntent(plan, binding, randomUUID(), observation);
  save('plan.json', plan); save('intent.json', intent); save('package-binding.json', binding);
  const apply = () => applyClassicJournaledLocalQualification(db, plan, bundle, frozen, intent, observation);
  const reconcile = async client => {
    await client.query('begin isolation level repeatable read read only');
    try { const value = await reconcileClassicExecution(client, plan, bundle, frozen, intent, observation); await client.query('commit'); return value; }
    catch (error) { await client.query('rollback'); throw error; }
  };
  const baselineHash = hash(await snapshot()); save('baseline.json', { hash: baselineHash, database: name, source_template_preserved: template });
  assert.equal((await reconcile(db)).status, 'independently_verified_absent'); checks.push('full canonical/ingress/journal absence readback');
  await tx();
  await applyDiscoveryIntakeBatch(db, plan.ingress, plan.ingress.entries, { authorization: { approved: true,
    plan_fingerprint: plan.ingress.fingerprint, operator: 'automated_isolated_proof', request: 'negative unreceipted ingress fixture only' } });
  await assert.rejects(apply, /unreceipted_ingress_requires_reconciliation/); await db.query('rollback');
  assert.equal(hash(await snapshot()), baselineHash); checks.push('unreceipted21ingress is rejected rather than adopted');
  await tx(); const validated = await apply(); assert.equal(validated.status, 'transaction_validated_commit_not_acknowledged'); await db.query('rollback');
  assert.equal(hash(await snapshot()), baselineHash); checks.push('102canon+21ingress+database receipt rollback atomically');
  const query = db.query.bind(db);
  await tx(); db.query = async (sql, args) => { if (sql.startsWith('insert into public.ingestion_jobs')) throw new Error('injected_ledger_failure'); return query(sql, args); };
  await assert.rejects(apply, /injected_ledger_failure/); db.query = query; await db.query('rollback');
  assert.equal(hash(await snapshot()), baselineHash); checks.push('late receipt failure rolls back every canonical and ingress row');
  const contender = new pg.Client(config); await contender.connect();
  try {
    await tx(); await db.query("select pg_advisory_xact_lock(hashtext('pokemon_classic_execution_journal_v1'))");
    await contender.query('begin isolation level serializable read write'); await contender.query("set local lock_timeout='100ms'");
    await assert.rejects(() => applyClassicJournaledLocalQualification(contender, plan, bundle, frozen, intent, observation), e => e.code === '55P03');
    await contender.query('rollback'); await db.query('rollback'); checks.push('own execution journal lock excludes competing writers');
  } finally { await contender.end(); }
  await tx(); const pending = await apply();
  const footprint = (await db.query(`select schemaname,relname,n_tup_ins::int inserted,n_tup_upd::int updated,n_tup_del::int deleted
    from pg_stat_xact_user_tables where n_tup_ins+n_tup_upd+n_tup_del>0 order by schemaname,relname`)).rows;
  const expectedWrites = Object.fromEntries(TABLES.map(t => [t, plan.tables[t].length]));
  Object.assign(expectedWrites, {raw_imports: 21, external_discovery_candidates: 21, ingestion_jobs: 1});
  assert.deepEqual(Object.fromEntries(footprint.map(r => [r.relname, r.inserted])), expectedWrites);
  assert.ok(footprint.every(r => r.schemaname === 'public' && r.updated === 0 && r.deleted === 0), 'additive_write_footprint_required');
  save('write-footprint.json', {rows: footprint, production_writes: 0});
  checks.push('actual transaction statistics prove exact inserts with zero updates/deletes across all lab tables');
  save('pending.json', { at: new Date().toISOString(), ...pending, intent });
  // Actually commit, then inject the missing acknowledgement. Never retry apply.
  await assert.rejects(async () => { await db.query('commit'); throw new Error('injected_lost_commit_acknowledgement'); }, /injected_lost_commit_acknowledgement/);
  save('lost-ack.json', { status: 'commit_response_injected_missing', recovery: 'independent read-only reconciliation, no writer retry' });
  const independent = new pg.Client(config); await independent.connect();
  try { const result = await reconcile(independent); assert.equal(result.status, 'independently_verified_committed'); save('independent-readback.json', result); }
  finally { await independent.end(); }
  checks.push('lost commit acknowledgement reconciled through a fresh connection and exact durable rows');
  const committedHash = hash(await snapshot());
  await tx(); assert.equal((await apply()).status, 'already_succeeded'); await db.query('commit');
  assert.equal(hash(await snapshot()), committedHash); checks.push('exact repeated intent writes zero canonical, ingress or journal rows');
  await tx(); await assert.rejects(() => applyClassicJournaledLocalQualification(db, plan, bundle, frozen,
    classicExecutionIntent(plan, binding, randomUUID(), observation), observation), /execution_journal_payload_mismatch/); await db.query('rollback');
  checks.push('different execution UUID cannot adopt consumed scope');
  const corruptions = [
    ['ledger payload drift', "update ingestion_jobs set payload=payload||'{\"new_ingress\":20}'::jsonb where job_type=$1", [VERSION], /execution_journal_payload_mismatch/],
    ['duplicate receipt', 'insert into ingestion_jobs(job_type,status,payload) select job_type,status,payload from ingestion_jobs where job_type=$1', [VERSION], /ambiguous_execution_history/],
    ['missing canonical truth review', 'delete from card_printing_truth_reviews where id=$1', [plan.tables.card_printing_truth_reviews[0].id], /canonical_exact_readback:card_printing_truth_reviews/],
    ['canonical data without receipt', 'delete from ingestion_jobs where job_type=$1', [VERSION], /canonical_collision:sets/],
  ];
  for (const [label, sql, args, pattern] of corruptions) {
    await db.query('begin isolation level repeatable read read write'); await db.query(sql, args); await db.query('set transaction read only');
    await assert.rejects(() => reconcileClassicExecution(db, plan, bundle, frozen, intent, observation), pattern); await db.query('rollback'); checks.push(label + ' rejected');
  }
  assert.equal(hash(await snapshot()), committedHash); checks.push('all corruption probes rollback to exact committed database');
  const ledger = read(state + '/classic-journal-schema-v1/ledger.json');
  const constraints = (await db.query("select conname,contype,pg_get_constraintdef(oid) definition from pg_constraint where conrelid='public.ingestion_jobs'::regclass order by conname")).rows;
  assert.deepEqual(constraints, ledger.constraints.map(({ conname,contype,definition }) => ({conname,contype,definition})));
  checks.push('existing database ledger constraints match fresh verified-TLS production capture');
  save('proof.json', { status: 'passed', at: new Date().toISOString(), database: name, checks, production_writes: 0,
    canonical_relationships_repaired: 0, partial_application_fixture: true, selected_dependency_replay: dependencyProof?.database ?? null, real_auth_http: false, production_apply_enabled: false });
  console.log(JSON.stringify({ status: 'passed', checks: checks.length, database: name, production_writes: 0 }));
} catch (error) {
  await db.query('rollback').catch(() => {}); save('failure.json', { at: new Date().toISOString(), code: error.code ?? 'PROOF_FAILED', message: error.message, checks, production_writes: 0 }); throw error;
} finally { await db.end(); }