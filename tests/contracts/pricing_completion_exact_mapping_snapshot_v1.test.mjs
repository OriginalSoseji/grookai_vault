import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertCredentialFreeExactMappingPlannerEnvironmentV1,
  assertPricingCompletionSnapshotTargetV1,
  buildPricingCompletionExactMappingSnapshotV1,
  sha256PricingCompletionSnapshotInputV1,
  validatePricingCompletionExactMappingSnapshotV1,
} from '../../backend/pricing/pricing_completion_exact_mapping_snapshot_v1.mjs';

const RUN = '51ce449c-5bdf-4662-8f97-d0190f959384';
const GAP_BYTES = Buffer.from('{"gap":1}\n');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function fixture() {
  return buildPricingCompletionExactMappingSnapshotV1({
    capturedAt: '2026-10-30T05:00:00.000Z',
    sourceSyncRunId: RUN,
    coverageGapsSha256: sha256PricingCompletionSnapshotInputV1(GAP_BYTES),
    databaseTarget: {
      kind: 'production_operator_snapshot',
      project_ref: 'ycdxbpibncqcchqiihfz',
      verified_tls: true,
      transaction_read_only: true,
      isolation: 'repeatable read',
    },
    sourceRun: {
      id: RUN,
      sync_mode: 'current_full_sync',
      status: 'completed',
      failed_count: 0,
    },
    sources: [{ source_product_id: 101, source_group_id: 7 }],
    directTargetsByProduct: new Map([[101, [{ card_print_id: 'card-1' }]]]),
    consensusByGroup: new Map([[7, { source_group_id: 7, set_count: 1 }]]),
    authorities: new Map(),
    setTargets: [{ card_print_id: 'card-1' }],
  });
}

test('credential-free snapshot validates one exact frozen census', () => {
  const result = validatePricingCompletionExactMappingSnapshotV1({
    snapshot: fixture(),
    expectedSourceSyncRunId: RUN,
    expectedCoverageGapsSha256: sha256PricingCompletionSnapshotInputV1(GAP_BYTES),
    expectedSourceProductIds: [101],
    now: Date.parse('2026-10-30T05:05:00.000Z'),
  });
  assert.equal(result.sources.length, 1);
  assert.equal(result.directTargetsByProduct.get(101)[0].card_print_id, 'card-1');
  assert.equal(result.databaseTarget.kind, 'production_operator_snapshot');
  assert.equal(result.snapshotReceipt.credential_free_offline_plan, true);
});

test('snapshot rejects drift, stale evidence, write boundaries, and credentials', () => {
  const args = {
    expectedSourceSyncRunId: RUN,
    expectedCoverageGapsSha256: sha256PricingCompletionSnapshotInputV1(GAP_BYTES),
    expectedSourceProductIds: [101],
    now: Date.parse('2026-10-30T05:05:00.000Z'),
  };
  for (const mutate of [
    (value) => { value.source_sync_run_id = 'different'; },
    (value) => { value.coverage_gaps_sha256 = '0'.repeat(64); },
    (value) => { value.captured_at = '2026-10-28T05:00:00.000Z'; },
    (value) => { value.boundaries.database_writes = true; },
    (value) => { value.database_target.verified_tls = false; },
    (value) => { value.sources[0].connection = 'postgresql://reader:password@example/postgres'; },
    (value) => { value.counts.sources = 2; },
  ]) {
    const snapshot = structuredClone(fixture());
    mutate(snapshot);
    assert.throws(() => validatePricingCompletionExactMappingSnapshotV1({ snapshot, ...args }));
  }
});

test('snapshot rejects partial or duplicate product scope', () => {
  assert.throws(() => validatePricingCompletionExactMappingSnapshotV1({
    snapshot: fixture(),
    expectedSourceSyncRunId: RUN,
    expectedCoverageGapsSha256: sha256PricingCompletionSnapshotInputV1(GAP_BYTES),
    expectedSourceProductIds: [101, 102],
    now: Date.parse('2026-10-30T05:05:00.000Z'),
  }), /source_product_census_mismatch/);
});

test('capture pins the production project and verified TLS options', () => {
  const direct = 'postgresql://postgres:synthetic@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres?sslmode=require';
  const pooler = 'postgresql://postgres.ycdxbpibncqcchqiihfz:synthetic@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
  assert.equal(assertPricingCompletionSnapshotTargetV1(direct, {}).hostname,
    'db.ycdxbpibncqcchqiihfz.supabase.co');
  assert.equal(assertPricingCompletionSnapshotTargetV1(pooler, {}).username,
    'postgres.ycdxbpibncqcchqiihfz');
  for (const invalid of [
    direct.replace('ycdxbpibncqcchqiihfz', 'wrongproject'),
    direct.replace('postgres:', 'other:'),
    direct.replace('sslmode=require', 'sslmode=no-verify'),
    `${pooler}?options=-c%20statement_timeout%3D0`,
  ]) {
    assert.throws(() => assertPricingCompletionSnapshotTargetV1(invalid, {}));
  }
  assert.throws(() => assertPricingCompletionSnapshotTargetV1(direct, {
    NODE_TLS_REJECT_UNAUTHORIZED: '0',
  }));
});

test('offline planner refuses any database or service credential', () => {
  assert.doesNotThrow(() => assertCredentialFreeExactMappingPlannerEnvironmentV1({
    PATH: 'synthetic', GITHUB_SHA: 'a'.repeat(40),
  }));
  for (const key of [
    'SUPABASE_DB_URL', 'PROD_SUPABASE_URL', 'DATABASE_URL', 'POSTGRES_URL',
    'PGPASSWORD', 'SUPABASE_SECRET_KEY', 'PROD_SERVICE_ROLE_KEY',
  ]) {
    assert.throws(() => assertCredentialFreeExactMappingPlannerEnvironmentV1({
      PATH: 'synthetic', [key]: 'secret',
    }), /credential_free_planner_environment_required/);
  }
});

test('planner CLI produces an exact candidate from snapshot bytes without credentials', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'grookai-exact-snapshot-'));
  try {
    const gap = {
      policy_version: 'TCGPLAYER_MARKET_COVERAGE_POLICY_V1_3',
      primary_gap_reason: 'missing_active_source_mapping',
      source_product_id: 101,
      source_product_name: 'Tropius - 001/084',
      source_group_id: 7,
      source_group_name: 'ME05: Pitch Black',
      source_subtype_name: 'Normal',
      source_observation_id: 'observation-1',
    };
    const gapText = `${JSON.stringify(gap)}\n`;
    const gapPath = path.join(directory, 'gaps.jsonl');
    const snapshotPath = path.join(directory, 'snapshot.json');
    const outRoot = path.join(directory, 'out');
    writeFileSync(gapPath, gapText);
    const snapshot = buildPricingCompletionExactMappingSnapshotV1({
      capturedAt: new Date().toISOString(),
      sourceSyncRunId: RUN,
      coverageGapsSha256: sha256PricingCompletionSnapshotInputV1(gapText),
      databaseTarget: {
        kind: 'production_operator_snapshot',
        project_ref: 'ycdxbpibncqcchqiihfz',
        verified_tls: true,
        transaction_read_only: true,
        isolation: 'repeatable read',
      },
      sourceRun: { id: RUN, sync_mode: 'current_full_sync', status: 'completed', failed_count: 0 },
      sources: [{
        source_product_id: 101,
        source_product_name: 'Tropius - 001/084',
        source_group_id: 7,
        source_group_name: 'ME05: Pitch Black',
        printed_number: '001/084',
        has_printed_number_evidence: true,
        source_product_active: true,
        source_product_catalog_status: 'current',
        active_source_mapping_count: 0,
        source_subtypes: ['Normal'],
        supporting_gap_observation_ids: ['observation-1'],
        supporting_gap_row_count: 1,
      }],
      directTargetsByProduct: new Map([[101, [{
        card_print_id: 'card-1',
        gv_id: 'GV-PK-ME05-001',
        set_id: 'set-1',
        set_code: 'me05',
        name: 'Tropius',
        number: '001',
        variant_key: '',
        embedded_external_id: 'tcgcsv:7:101',
        active_standard_identity_count: 1,
        active_tcgplayer_mapping_count: 0,
      }]]]),
      consensusByGroup: new Map(),
      authorities: new Map(),
      setTargets: [],
    });
    writeFileSync(snapshotPath, `${JSON.stringify(snapshot)}\n`);
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !/(?:SUPABASE|DATABASE|POSTGRES|PGHOST|PGUSER|PGPASSWORD|PGDATABASE|PGPORT|PGOPTIONS|SECRET_KEY|SERVICE_ROLE)/i.test(key)));
    const result = spawnSync(process.execPath, [
      'scripts/audits/tcgplayer_market_exact_mapping_plan_v1.mjs',
      `--source-run-id=${RUN}`,
      `--coverage-gaps=${gapPath}`,
      `--snapshot-input=${snapshotPath}`,
      `--out-root=${outRoot}`,
    ], { cwd: ROOT, env, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const child = readdirSync(outRoot);
    assert.equal(child.length, 1);
    const summary = JSON.parse(readFileSync(path.join(outRoot, child[0], 'summary.json'), 'utf8'));
    const plan = JSON.parse(readFileSync(path.join(outRoot, child[0], 'run_plan.json'), 'utf8'));
    assert.equal(summary.counts.candidates, 1);
    assert.equal(summary.database_target.kind, 'production_operator_snapshot');
    assert.equal(plan.mode, 'credential_free_snapshot_dry_run');
    assert.equal(plan.boundaries.database_writes, false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
