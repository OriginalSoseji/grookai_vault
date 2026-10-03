import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { loadClassicCanonicalBundle } from '../../backend/catalog/pokemon_classic_canonical_bundle_v1.mjs';
import { loadClassicFrozenPackage, buildClassicFrozenPlan, classicFrozenPackageBinding } from '../../backend/catalog/pokemon_classic_frozen_package_v1.mjs';
import { TABLES, bindClassicIdentityHashes, verifyClassicCanonicalReadback } from '../../backend/catalog/pokemon_classic_canonical_admission_v1.mjs';
import { VERSION, classicExecutionIntent, applyClassicJournaledLocalQualification, reconcileClassicExecution, assertClassicPendingReadback } from '../../backend/catalog/pokemon_classic_execution_journal_v2.mjs';
import { applyDiscoveryIntakeBatch } from '../../backend/catalog/pokemon_warehouse_group_intake_v1.mjs';
import { printingManifestHash as hash } from '../../backend/catalog/printing_completeness_gate_v1.mjs';

import { readClassicInboundCatalog, observeClassicDependencies, assertClassicDependenciesPreserved } from '../../backend/catalog/pokemon_classic_dependency_preservation_v1.mjs';

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
const fixtureAdmin = new pg.Client(config); await fixtureAdmin.connect();
try {
  assert.equal((await fixtureAdmin.query('select current_database() name')).rows[0].name,name);
  await fixtureAdmin.query('create table public.proof_classic_inbound(id integer primary key, parent_id uuid, raw_id bigint references raw_imports(id), mapping_id bigint references external_mappings(id), ledger_id bigint references ingestion_jobs(id), payload jsonb not null)');
  await fixtureAdmin.query('alter table public.proof_classic_inbound add constraint proof_parent_fk foreign key(parent_id) references card_prints(id) not valid');
  if(dependencyBinding) await fixtureAdmin.query('alter table public.proof_classic_inbound owner to '+dependencyBinding.roles.postgres);
} finally { await fixtureAdmin.end(); }
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
  // New clone only: exercise dependencies outside the executor's write tables.

  await db.query('insert into proof_classic_inbound(id,raw_id,payload) values(1,$1,$2)', [plan.lineage.find(r=>r.existing_raw_id!==null).existing_raw_id, JSON.stringify({sentinel:'retained dependency'})]);
  baselineTables.push('proof_classic_inbound');
  const dependencyCatalog = await readClassicInboundCatalog(db);
  const dependencyBaseline = await observeClassicDependencies(db,plan,dependencyCatalog);
  save('dependency-catalog.json', dependencyCatalog); save('dependency-before.json',dependencyBaseline);
  // An existing orphan can survive NOT VALID. Simulate that in a rolled-back
  // local schema transaction; the guard must not infer absence from validation.
  await tx();
  await db.query('alter table proof_classic_inbound drop constraint proof_parent_fk');
  await db.query('insert into proof_classic_inbound(id,parent_id,payload) values(2,$1,$2)',[plan.tables.card_prints[0].id,'{}']);
  await db.query('alter table proof_classic_inbound add constraint proof_parent_fk foreign key(parent_id) references card_prints(id) not valid');
  await assert.rejects(()=>observeClassicDependencies(db,plan,dependencyCatalog),/preexisting_or_unexpected_dependency/);
  await db.query('rollback'); checks.push('NOT VALID orphan referencing proposed canonical UUID rejected');
  const observation = read(freshObservation + '/observation.json');
  const binding = classicFrozenPackageBinding(frozen), intent = classicExecutionIntent(plan, binding, randomUUID(), observation);
  save('plan.json', plan); save('intent.json', intent); save('package-binding.json', binding);
  const apply = async () => {
    const before = await observeClassicDependencies(db,plan,dependencyCatalog);
    const pending = await applyClassicJournaledLocalQualification(db, plan, bundle, frozen, intent, observation);
    const generated = (await db.query('select payload from ingestion_jobs where job_type=$1',[VERSION])).rows[0].payload.generated_rows;
    const after = await observeClassicDependencies(db,plan,dependencyCatalog,generated,pending.job_id);
    assertClassicDependenciesPreserved(before,after);
    return pending;
  };
  const reconcile = async client => {
    await client.query('begin isolation level repeatable read read only');
    try { const value = await reconcileClassicExecution(client, plan, bundle, frozen, intent, observation); await client.query('commit'); return value; }
    catch (error) { await client.query('rollback'); throw error; }
  };
  const baselineHash = hash(await snapshot()); save('baseline.json', { hash: baselineHash, database: name, source_template_preserved: template });
  assert.equal((await reconcile(db)).status, 'independently_verified_absent'); checks.push('full canonical/ingress/journal absence readback');
  await tx();
  await db.query("insert into public.ingestion_jobs(job_type,status,payload) values('POKEMON_CLASSIC_EXECUTION_JOURNAL_V1','succeeded','{}')");
  await assert.rejects(apply, /historical_journal_requires_its_original_reconciliation/); await db.query('rollback');
  assert.equal(hash(await snapshot()), baselineHash); checks.push('V1 historical ledger cannot be ignored or reinterpreted as V2');
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
  const generated = (await db.query('select payload from ingestion_jobs where job_type=$1', [VERSION])).rows[0].payload.generated_rows;
  assert.equal(generated.raw.length, 102); assert.equal(generated.mappings.length, 102);
  assert.equal(generated.raw.filter(r => r.new_ingress).length, 21);
  assert.equal(pending.generated_rows_fingerprint, generated.fingerprint);
  save('generated-row-bindings.json', generated); checks.push('atomic receipt binds102raw IDs including81retained and102new mapping IDs as exact bigint strings');
  checks.push('actual transaction statistics prove exact inserts with zero updates/deletes across all lab tables');
  save('pending.json', { at: new Date().toISOString(), ...pending, intent });
  // Actually commit, then inject the missing acknowledgement. Never retry apply.
  await assert.rejects(async () => { await db.query('commit'); throw new Error('injected_lost_commit_acknowledgement'); }, /injected_lost_commit_acknowledgement/);
  save('lost-ack.json', { status: 'commit_response_injected_missing', recovery: 'independent read-only reconciliation, no writer retry' });
  const independent = new pg.Client(config); await independent.connect();
  try { const result = await reconcile(independent); assert.equal(result.status, 'independently_verified_committed'); assertClassicPendingReadback(read(out + '/pending.json'), result); save('independent-readback.json', result); }
  finally { await independent.end(); }
  checks.push('lost commit acknowledgement reconciled through a fresh connection and exact durable rows');
  const committedHash = hash(await snapshot());
  const dependencyAfter = await observeClassicDependencies(db,plan,dependencyCatalog,generated,pending.job_id);
  assertClassicDependenciesPreserved(dependencyBaseline,dependencyAfter);
  save('dependency-after.json',dependencyAfter);
  checks.push('outside retained raw dependency fingerprints preserved across whole102 commit');
  const dependencyReader=new pg.Client(config); await dependencyReader.connect();
  try {
    await dependencyReader.query('begin isolation level repeatable read read only');
    assert.deepEqual(await observeClassicDependencies(dependencyReader,plan,dependencyCatalog,generated,pending.job_id),dependencyAfter);
    await dependencyReader.query('commit');
  } finally { await dependencyReader.end(); }
  checks.push('outside dependencies independently read back with exact generated raw mapping ledger IDs');
  await tx(); await db.query("update proof_classic_inbound set payload='{\"changed\":true}' where id=1");
  const changedDependency=await observeClassicDependencies(db,plan,dependencyCatalog,generated,pending.job_id);
  assert.throws(()=>assertClassicDependenciesPreserved(dependencyBaseline,changedDependency),/retained_dependency_changed/);
  await db.query('rollback');
  checks.push('same-count retained dependency payload corruption rejected and rolled back');
  for (const [column,id] of [['raw_id',generated.raw.find(r=>r.new_ingress).raw_import_id],['mapping_id',generated.mappings[0].id],['ledger_id',pending.job_id]]) {
    await tx(); await db.query('insert into proof_classic_inbound(id,'+column+',payload) values(2,$1,$2)',[id,'{}']);
    await assert.rejects(()=>observeClassicDependencies(db,plan,dependencyCatalog,generated,pending.job_id),/preexisting_or_unexpected_dependency/);
    await db.query('rollback'); checks.push('unexpected outside '+column+' dependency rejected');
  }
  await tx(); await db.query('alter table proof_classic_inbound drop constraint proof_parent_fk');
  await assert.rejects(()=>observeClassicDependencies(db,plan,dependencyCatalog,generated,pending.job_id),/inbound_catalog_drift/);
  await db.query('rollback'); checks.push('removed inbound constraint rejected before readback');
  await tx(); assert.equal((await apply()).status, 'already_succeeded'); await db.query('commit');
  assert.equal(hash(await snapshot()), committedHash); checks.push('exact repeated intent writes zero canonical, ingress or journal rows');
  await tx(); await assert.rejects(() => applyClassicJournaledLocalQualification(db, plan, bundle, frozen,
    classicExecutionIntent(plan, binding, randomUUID(), observation), observation), /execution_journal_payload_mismatch/); await db.query('rollback');
  checks.push('different execution UUID cannot adopt consumed scope');
  await db.query('begin isolation level repeatable read read write');
  await db.query("update ingestion_jobs set id=nextval('ingestion_jobs_id_seq') where job_type=$1", [VERSION]);
  await db.query('set transaction read only');
  const replacedLedger = await reconcileClassicExecution(db, plan, bundle, frozen, intent, observation);
  assert.throws(() => assertClassicPendingReadback(read(out + '/pending.json'), replacedLedger), /execution_ledger_identity_drift/);
  await db.query('rollback'); checks.push('pending artifact rejects replacement ledger row despite matching payload');
  const corruptions = [
    ['mapping primary key replacement with unchanged source/parent', "update external_mappings set id=nextval('external_mappings_id_seq') where id=$1", [generated.mappings[0].id], /generated_row_identity_drift/],
    ['generated receipt omitted', "update ingestion_jobs set payload=payload-'generated_rows' where job_type=$1", [VERSION], /generated_row_receipt_required/],
    ['ledger payload drift', "update ingestion_jobs set payload=payload||'{\"new_ingress\":20}'::jsonb where job_type=$1", [VERSION], /execution_journal_payload_mismatch/],
    ['duplicate receipt', 'insert into ingestion_jobs(job_type,status,payload) select job_type,status,payload from ingestion_jobs where job_type=$1', [VERSION], /ambiguous_execution_history/],
    ['missing canonical truth review', 'delete from card_printing_truth_reviews where id=$1', [plan.tables.card_printing_truth_reviews[0].id], /canonical_exact_readback:card_printing_truth_reviews/],
    ['canonical data without receipt', 'delete from ingestion_jobs where job_type=$1', [VERSION], /canonical_collision:sets/],
  ];
  for (const [label, sql, args, pattern] of corruptions) {
    await db.query('begin isolation level repeatable read read write'); await db.query(sql, args);
    if (label.startsWith('mapping primary key')) await verifyClassicCanonicalReadback(db, plan);
    await db.query('set transaction read only');
    await assert.rejects(() => reconcileClassicExecution(db, plan, bundle, frozen, intent, observation), pattern); await db.query('rollback'); checks.push(label + ' rejected');
  }
  // Replace a newly admitted raw row with an otherwise identical raw payload, then
  // repoint only the new discovery row. Content-only V1 checks could accept this.
  await db.query('begin isolation level repeatable read read write');
  const raw = generated.raw.find(r => r.new_ingress);
  const replacement = (await db.query('insert into raw_imports(source,status,payload) select source,status,payload from raw_imports where id=$1 returning id::text', [raw.raw_import_id])).rows[0].id;
  await db.query('update external_discovery_candidates set raw_import_id=$1 where id=$2', [replacement, raw.discovery_id]);
  await db.query('delete from raw_imports where id=$1', [raw.raw_import_id]);
  await verifyClassicCanonicalReadback(db, plan);
  await db.query('set transaction read only');
  await assert.rejects(() => reconcileClassicExecution(db, plan, bundle, frozen, intent, observation), /generated_row_identity_drift/);
  await db.query('rollback'); checks.push('same-payload raw row replacement and discovery rebinding rejected');
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