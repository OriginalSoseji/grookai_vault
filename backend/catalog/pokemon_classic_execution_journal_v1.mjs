import assert from 'node:assert/strict';
import { printingManifestHash as hash } from './printing_completeness_gate_v1.mjs';
import { applyClassicLocalQualification, assertClassicCanonicalPlan, assertClassicCanonicalAbsence,
  verifyClassicCanonicalReadback, TABLES } from './pokemon_classic_canonical_admission_v1.mjs';
import { verifyGroupPreservation } from './pokemon_warehouse_group_intake_v1.mjs';

export const VERSION = 'POKEMON_CLASSIC_EXECUTION_JOURNAL_V1';
import { buildClassicFrozenPlan, classicFrozenPackageBinding, assertClassicFrozenPackageUnchanged } from './pokemon_classic_frozen_package_v1.mjs';

// This is a transaction/receipt qualification layer, not a production entrypoint.
// Keep the original executor's loopback/database guard. A future production CLI
// needs the still-open Auth/application/image/producer gates independently.
export function classicExecutionIntent(plan, frozenBinding, runId, observation) {
  assert.match(runId, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  const { fingerprint: packageHash, ...packageBody } = frozenBinding;
  assert.equal(packageHash, hash(packageBody), 'frozen_binding_fingerprint_mismatch');
  assert.equal(frozenBinding.qualification_at, plan.qualification_at);
  const { fingerprint: observationHash, ...observationBody } = observation;
  assert.equal(observationHash, hash(observationBody), 'observation_fingerprint_mismatch');
  assert.equal(observation.canonical_fingerprint, plan.fingerprint, 'observed_canonical_scope_mismatch');
  assert.equal(observation.frozen_package.fingerprint, packageHash, 'observed_frozen_package_mismatch');
  assert.match(observation.schema_fingerprint, /^[a-f0-9]{64}$/);
  const { fingerprint: producerHash, ...producerBody } = observation.producer;
  assert.equal(producerHash, hash(producerBody), 'observed_producer_fingerprint_mismatch');
  const body = { version: VERSION, run_id: runId, canonical_fingerprint: plan.fingerprint,
    observation_fingerprint: observationHash, schema_fingerprint: observation.schema_fingerprint,
    producer_fingerprint: producerHash, producer_head: observation.producer.head,
    producer_committed: observation.producer.clean,
    frozen_package_fingerprint: packageHash, ingress_fingerprint: plan.ingress.fingerprint,
    execution_scope: 'isolated_local_receipt_qualification_only', production_apply_enabled: false,
    category_id: 3, group_id: 23323, parent_ids: plan.tables.card_prints.map(r => r.id),
    discovery_ids: plan.ingress.entries.map(r => r.candidate_id) };
  return { ...body, fingerprint: hash(body) };
}

function assertIntent(intent, plan, frozenBinding, observation) {
  assert.deepEqual(intent, classicExecutionIntent(plan, frozenBinding, intent.run_id, observation), 'execution_intent_tamper');
}
async function journalRows(db) {
  return (await db.query('select id::text, status, payload from public.ingestion_jobs where job_type=$1 order by id', [VERSION])).rows;
}
function assertJournalRow(row, intent, plan) {
  assert.equal(row.status, 'succeeded', 'execution_journal_not_succeeded');
  assert.deepEqual(row.payload, { ...intent, outcome: 'committed_atomic_whole102',
    counts: Object.fromEntries(TABLES.map(t => [t, plan.tables[t].length])), new_ingress: 21, retained_lineages: 81 },
  'execution_journal_payload_mismatch');
}

export async function applyClassicJournaledLocalQualification(db, plan, bundle, frozen, intent, observation) {
  assert.ok(['127.0.0.1', 'localhost'].includes(db.connectionParameters?.host), 'local_journal_qualification_host_required');
  assert.match((await db.query('select current_database() name')).rows[0].name, /^grookai_classic_canonical_proof_[a-z0-9_]+$/);
  assert.equal((await db.query('show transaction_isolation')).rows[0].transaction_isolation, 'serializable');
  assert.equal((await db.query('show transaction_read_only')).rows[0].transaction_read_only, 'off');
  const frozenBinding = classicFrozenPackageBinding(frozen);
  assertClassicFrozenPackageUnchanged(frozen); buildClassicFrozenPlan(bundle, plan.ingress, frozen);
  assertIntent(intent, plan, frozenBinding, observation); assertClassicCanonicalPlan(plan, bundle);
  await db.query("select pg_advisory_xact_lock(hashtext('pokemon_classic_execution_journal_v1'))");
  // Match the existing writer lock order before inspecting absence. Otherwise
  // a concurrent ingress commit could be silently adopted between the check and
  // the old writer's idempotent ingress path.
  await db.query("select pg_advisory_xact_lock(hashtext('pokemon_classic_canonical_admission_v1'))");
  await db.query("select pg_advisory_xact_lock(hashtext('pokemon_warehouse_discovery_intake_v1'))");
  await db.query('lock table public.tcgcsv_source_products in share mode');
  await db.query(`lock table ${[...TABLES, 'external_discovery_candidates', 'raw_imports', 'external_printing_mappings', 'pokemon_species', 'finish_keys'].map(t => 'public.' + t).join(',')} in share row exclusive mode`);
  const previous = await journalRows(db);
  if (previous.length) {
    assert.equal(previous.length, 1, 'ambiguous_execution_history');
    assertJournalRow(previous[0], intent, plan);
    await verifyClassicCanonicalReadback(db, plan);
    return { status: 'already_succeeded', job_id: previous[0].id, inserted: 0 };
  }
  // Never manufacture a receipt for already-existing, unreceipted canonical data.
  await verifyGroupPreservation(db, plan.ingress);
  await assertClassicCanonicalAbsence(db, plan);
  assert.equal((await db.query('select 1 from public.external_discovery_candidates where id=any($1::uuid[]) limit 1', [intent.discovery_ids])).rowCount, 0, 'unreceipted_ingress_requires_reconciliation');
  const applied = await applyClassicLocalQualification(db, plan, bundle);
  assert.equal(applied.status, 'inserted_local_qualification');
  const payload = { ...intent, outcome: 'committed_atomic_whole102',
    counts: Object.fromEntries(TABLES.map(t => [t, plan.tables[t].length])), new_ingress: 21, retained_lineages: 81 };
  const result = await db.query(`insert into public.ingestion_jobs(job_type,status,attempts,last_attempt_at,payload)
    values($1,'succeeded',1,now(),$2::jsonb) returning id::text,status,payload`, [VERSION, JSON.stringify(payload)]);
  assert.equal(result.rowCount, 1); assertJournalRow(result.rows[0], intent, plan);
  await verifyClassicCanonicalReadback(db, plan);
  return { status: 'transaction_validated_commit_not_acknowledged', job_id: result.rows[0].id, inserted: 102 };
}

// No mutation/retry path: even a complete canonical scope without its atomic
// ledger is an inconsistent state. A ledger alone likewise never proves repair.
export async function reconcileClassicExecution(db, plan, bundle, frozen, intent, observation) {
  assert.equal((await db.query('show transaction_read_only')).rows[0].transaction_read_only, 'on');
  assert.equal((await db.query('show transaction_isolation')).rows[0].transaction_isolation, 'repeatable read');
  const frozenBinding = classicFrozenPackageBinding(frozen);
  assertClassicFrozenPackageUnchanged(frozen); buildClassicFrozenPlan(bundle, plan.ingress, frozen);
  assertIntent(intent, plan, frozenBinding, observation); assertClassicCanonicalPlan(plan, bundle);
  const rows = await journalRows(db);
  if (rows.length) {
    assert.equal(rows.length, 1, 'ambiguous_execution_history'); assertJournalRow(rows[0], intent, plan);
    const counts = await verifyClassicCanonicalReadback(db, plan);
    return { status: 'independently_verified_committed', job_id: rows[0].id, counts, retry_allowed: false };
  }
  await verifyGroupPreservation(db, plan.ingress); await assertClassicCanonicalAbsence(db, plan);
  assert.equal((await db.query('select 1 from public.external_discovery_candidates where id=any($1::uuid[]) limit 1',
    [intent.discovery_ids])).rowCount, 0, 'unreceipted_ingress_requires_reconciliation');
  return { status: 'independently_verified_absent', canonical_rows_present: 0, receipt_rows_present: 0,
    retry_allowed: false, next_step: 'new qualification required; this receipt never retries a writer' };
}