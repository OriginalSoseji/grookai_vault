import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { printingManifestHash as hash } from '../../backend/catalog/printing_completeness_gate_v1.mjs';
import { BRANCH, OPEN_GATES, assertClassicReadOnlyTransaction, readClassicSchemaFingerprint,
  buildClassicProductionObservation } from '../../backend/catalog/pokemon_classic_production_planning_v1.mjs';
import { bindClassicIdentityHashes } from '../../backend/catalog/pokemon_classic_canonical_admission_v1.mjs';

test('Classic schema observation rejects writable or nonrepeatable transactions before catalog reads', async () => {
  for (const [readOnly, isolation, error] of [['off', 'repeatable read', /read_only_transaction_required/], ['on', 'read committed', /repeatable_read_required/]]) {
    const calls = [];
    const db = { async query(sql) { calls.push(sql); return { rows: [{ transaction_read_only: readOnly, transaction_isolation: isolation }] }; } };
    await assert.rejects(() => readClassicSchemaFingerprint(db), error);
    assert.ok(calls.every(sql => sql.startsWith('show ')));
  }
  await assertClassicReadOnlyTransaction({ async query() { return { rows: [{ transaction_read_only: 'on', transaction_isolation: 'repeatable read' }] }; } });
});

test('Classic identity hash batching preserves PostgreSQL keyed identity and rejects incomplete/duplicate/drifting results', async () => {
  const make = () => ({ tables: { card_print_identity: [{ id: 'a', identity_key_hash: null }, { id: 'b', identity_key_hash: null }] } });
  let calls = 0;
  const db = { async query(sql) { calls++; assert.match(sql, /jsonb_populate_recordset/); return { rows: [{ id: 'b', hash: 'b'.repeat(64) }, { id: 'a', hash: 'a'.repeat(64) }] }; } };
  const plan = make(); await bindClassicIdentityHashes(db, plan); assert.equal(calls, 1);
  assert.equal(plan.tables.card_print_identity[0].identity_key_hash, 'a'.repeat(64));
  plan.tables.card_print_identity[0].identity_key_hash = 'c'.repeat(64);
  await assert.rejects(() => bindClassicIdentityHashes(db, plan), /identity_sql_hash_drift/);
  await assert.rejects(() => bindClassicIdentityHashes({ query: async () => ({ rows: [] }) }, make()), /identity_sql_hash_count/);
  await assert.rejects(() => bindClassicIdentityHashes({ query: async () => ({ rows: [{ id: 'a' }, { id: 'a' }] }) }, make()), /duplicate_identity_sql_hash/);
});

test('Classic production planner rejects apply/authorization modes before creating outputs or connecting', () => {
  for (const flag of ['--apply=true', '--mode=apply', '--authorization=human.json']) {
    const result = spawnSync(process.execPath, ['scripts/workers/pokemon_classic_production_plan_v1.mjs', flag], { encoding: 'utf8' });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /unique_scope_staging_observation_ca_output_arguments_required/);
  }
});

const root = process.env.CLASSIC_PROOF_INPUT_ROOT;
test('Classic production observation binds the complete real whole102 candidate without turning qualification into permission', { skip: !root }, async t => {
  const plan = JSON.parse(fs.readFileSync(root + '/classic-canonical-plan-v3/plan.json'));
  const schema = { snapshot: { tables: ['test fingerprint binding only'] } }; schema.fingerprint = hash(schema.snapshot);
  const source = { branch: BRANCH, head: 'e'.repeat(40), clean: false, diff_sha256: 'f'.repeat(64), untracked: [] };
  const producer = { ...source, fingerprint: hash(source) };
  const frozenBody = { qualification_at: plan.qualification_at, files: [], production_apply_enabled: false };
  const frozenBinding = { ...frozenBody, fingerprint: hash(frozenBody) };
  const input = { plan, schema, producer, frozenBinding, sanity: { cards: 171036, sets: 3400, traits: 32903 }, coverage: { product_count: 63564, unresolved_count: 40020 }, observedAt: '2026-10-02T21:00:00.000Z' };
  const output = buildClassicProductionObservation(input);
  assert.deepEqual(buildClassicProductionObservation(structuredClone(input)), output);
  assert.equal(output.production_apply_enabled, false); assert.equal(output.production_writes, 0);
  assert.deepEqual(output.open_gates, OPEN_GATES); assert.equal(output.counts.card_prints, 102);
  assert.equal(output.authority.human_signature, null); assert.equal(output.scope.outside_standard_scope_jumbo, 1);
  for (const [label, mutate, pattern] of [
    ['low environment counts', x => x.sanity.cards = 39999, /canonical_environment_gate/],
    ['changed schema', x => x.schema.snapshot.tables.push('drift'), /schema_fingerprint_mismatch/],
    ['changed producer', x => x.producer.head = 'a'.repeat(40), /producer_fingerprint_mismatch/],
    ['changed canonical rows', x => x.plan.tables.card_prints.pop(), /canonical_plan_fingerprint_mismatch/],
    ['claim production apply', x => x.plan.production_apply_enabled = true, /true !== false/],
  ]) await t.test(label + ' is rejected', () => { const changed = structuredClone(input); mutate(changed); assert.throws(() => buildClassicProductionObservation(changed), pattern); });
});
