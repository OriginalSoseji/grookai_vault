#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import pg from 'pg';

import '../../backend/env.mjs';
import {
  EXPECTED_ROWS,
  MAPPING_METHOD,
  RELEASE_PACKAGE_FINGERPRINT,
  SOURCE_PRODUCT_IDS,
  VERSION as PACKAGE_VERSION,
  assertRepairTargetsV1,
  buildRepairMetaV1,
  buildRepairPackageV1,
  repairApprovalTextV1,
  sha256,
  stableJson,
} from '../../backend/catalog/pokemon_countdown_calendar_mapping_method_repair_v1.mjs';
import {
  commitMappingTransaction,
  mappingDatabaseConfig,
  mappingTransactionState,
  rollbackMappingTransaction,
} from '../../backend/pricing/exact_mapping_execution_guard_v1.mjs';

const { Client } = pg;
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const VERSION = 'POKEMON_COUNTDOWN_CALENDAR_MAPPING_METHOD_REPAIR_EXECUTION_V1';
const CODE_FILES = [
  'backend/catalog/pokemon_countdown_calendar_mapping_method_repair_v1.mjs',
  'backend/pricing/exact_mapping_execution_guard_v1.mjs',
  'scripts/audits/pokemon_countdown_calendar_mapping_method_repair_v1.mjs',
];

function parseArgs(argv) {
  const prepare = argv.includes('--prepare');
  const apply = argv.includes('--apply');
  assert.notEqual(prepare, apply, 'Choose exactly one of --prepare or --apply');
  const output = argv.find((arg) => arg.startsWith('--output='))?.slice('--output='.length).trim();
  assert.ok(output, '--output is required');
  return { mode: apply ? 'apply' : 'prepare', output: path.resolve(output) };
}

function currentCommitSha() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
}

function assertCleanTrackedTree() {
  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  assert.equal(status, '', 'countdown_mapping_repair_tracked_tree_not_clean');
}

async function codeFiles() {
  return Promise.all(CODE_FILES.map(async (file) => ({
    file,
    sha256: crypto.createHash('sha256').update(await fs.readFile(path.join(ROOT, file))).digest('hex'),
  })));
}

function clientConfig() {
  const connectionString = process.env.SUPABASE_DB_URL ?? '';
  assert.ok(connectionString, 'SUPABASE_DB_URL is required');
  const config = mappingDatabaseConfig(connectionString, { mode: 'apply' });
  if (process.env.SUPABASE_DB_CA_CERT?.trim()) {
    config.ssl = { ...config.ssl, ca: process.env.SUPABASE_DB_CA_CERT.trim() };
  }
  return config;
}

async function readBeforeTargets(client) {
  const result = await client.query(
    `select mapping.id::text as mapping_id,
            mapping.external_id::bigint as source_product_id,
            mapping.card_print_id::text as card_print_id,
            mapping.meta as before_meta,
            mapping.meta->>'release_package_fingerprint_sha256' as release_package_fingerprint_sha256,
            count(identity.id)::int as active_identity_count,
            count(printing.id)::int as exact_printing_count
       from public.external_mappings mapping
       join public.card_prints card on card.id = mapping.card_print_id
       left join public.card_print_identity identity
         on identity.card_print_id = card.id and identity.is_active = true
       left join public.card_printings printing
         on printing.card_print_id = card.id
        and printing.is_provisional = false
        and printing.created_by = 'pokemon_countdown_calendar_variant_release_v1'
      where mapping.source = 'tcgplayer'
        and mapping.external_id = any($1::text[])
        and mapping.active = true
        and card.ai_metadata->>'release_package_fingerprint_sha256' = $2
      group by mapping.id, mapping.external_id, mapping.card_print_id, mapping.meta
      order by mapping.external_id::bigint`,
    [SOURCE_PRODUCT_IDS.map(String), RELEASE_PACKAGE_FINGERPRINT],
  );
  const targets = result.rows.map((row) => ({
    mapping_id: row.mapping_id,
    source_product_id: Number(row.source_product_id),
    card_print_id: row.card_print_id,
    before_meta: row.before_meta,
    before_meta_fingerprint_sha256: sha256(stableJson(row.before_meta)),
    release_package_fingerprint_sha256: row.release_package_fingerprint_sha256,
    active_identity_count: Number(row.active_identity_count),
    exact_printing_count: Number(row.exact_printing_count),
  }));
  assertRepairTargetsV1(targets);
  for (const target of targets) {
    assert.equal(target.active_identity_count, 1, `countdown_mapping_repair_identity:${target.source_product_id}`);
    assert.equal(target.exact_printing_count, 1, `countdown_mapping_repair_printing:${target.source_product_id}`);
    assert.equal(target.before_meta?.authority, 'pokemon_countdown_calendar_variant_release_v1',
      `countdown_mapping_repair_authority:${target.source_product_id}`);
    assert.ok(!String(target.before_meta?.mapping_method ?? '').trim(),
      `countdown_mapping_repair_method_already_present:${target.source_product_id}`);
    assert.equal(target.before_meta?.mapping_method_audit, undefined,
      `countdown_mapping_repair_audit_already_present:${target.source_product_id}`);
  }
  return targets;
}

function targetManifestFingerprint(targets) {
  return sha256(stableJson(assertRepairTargetsV1(targets)));
}

function expectedAfterMeta(target, sourceCommitSha, manifestFingerprint) {
  return buildRepairMetaV1(target.before_meta, {
    targetManifestFingerprint: manifestFingerprint,
    sourceCommitSha,
  });
}

async function updateTargets(client, targets, sourceCommitSha, manifestFingerprint) {
  let updatedRows = 0;
  for (const target of targets) {
    const afterMeta = expectedAfterMeta(target, sourceCommitSha, manifestFingerprint);
    const result = await client.query(
      `update public.external_mappings
          set meta = $1::jsonb
        where id = $2::bigint
          and source = 'tcgplayer'
          and external_id = $3::text
          and card_print_id = $4::uuid
          and active = true
          and meta = $5::jsonb
          and coalesce(meta->>'mapping_method', '') = ''
          and not (meta ? 'mapping_method_audit')`,
      [JSON.stringify(afterMeta), target.mapping_id, String(target.source_product_id),
        target.card_print_id, JSON.stringify(target.before_meta)],
    );
    assert.equal(result.rowCount, 1, `countdown_mapping_repair_live_drift:${target.source_product_id}`);
    updatedRows += result.rowCount;
  }
  assert.equal(updatedRows, EXPECTED_ROWS, 'countdown_mapping_repair_update_count');
  return updatedRows;
}

async function captureExactState(client, targets) {
  const result = await client.query(
    `select id::text as mapping_id, source, external_id,
            card_print_id::text as card_print_id, active, meta
       from public.external_mappings
      where id = any($1::bigint[])
      order by id`,
    [targets.map((target) => target.mapping_id)],
  );
  return {
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

function assertAfterState(snapshot, targets, sourceCommitSha, manifestFingerprint) {
  assert.equal(snapshot.rows.length, EXPECTED_ROWS, 'countdown_mapping_repair_readback_count');
  const byId = new Map(snapshot.rows.map((row) => [String(row.mapping_id), row]));
  for (const target of targets) {
    const row = byId.get(String(target.mapping_id));
    assert.ok(row, `countdown_mapping_repair_missing_readback:${target.mapping_id}`);
    assert.equal(row.source, 'tcgplayer');
    assert.equal(row.external_id, String(target.source_product_id));
    assert.equal(row.card_print_id, target.card_print_id);
    assert.equal(row.active, true);
    assert.deepEqual(row.meta, expectedAfterMeta(target, sourceCommitSha, manifestFingerprint));
    assert.equal(row.meta.mapping_method, MAPPING_METHOD);
  }
}

async function rehearse(client, targets, sourceCommitSha, manifestFingerprint) {
  const transaction = mappingTransactionState();
  let before;
  let inTransaction;
  try {
    await client.query('begin isolation level serializable');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query("select pg_advisory_xact_lock(hashtextextended('grookai:pokemon-countdown-calendar-2008:mapping-method-repair:v1', 0))");
    const freshTargets = await readBeforeTargets(client);
    assert.deepEqual(freshTargets, targets, 'countdown_mapping_repair_rehearsal_live_drift');
    before = await captureExactState(client, targets);
    const updatedRows = await updateTargets(client, targets, sourceCommitSha, manifestFingerprint);
    inTransaction = await captureExactState(client, targets);
    assertAfterState(inTransaction, targets, sourceCommitSha, manifestFingerprint);
    await rollbackMappingTransaction(client, transaction);
    assert.equal(transaction.rollback_proven, true);
    const afterRollback = await captureExactState(client, targets);
    assert.equal(afterRollback.hash_sha256, before.hash_sha256,
      'countdown_mapping_repair_rollback_not_restored');
    const core = {
      version: 'POKEMON_COUNTDOWN_CALENDAR_MAPPING_METHOD_REPAIR_ROLLBACK_PROOF_V1',
      status: 'passed_rolled_back_no_durable_change',
      source_commit_sha: sourceCommitSha,
      target_manifest_fingerprint_sha256: manifestFingerprint,
      updated_rows: updatedRows,
      transaction,
      before_hash_sha256: before.hash_sha256,
      in_transaction_hash_sha256: inTransaction.hash_sha256,
      after_rollback_hash_sha256: afterRollback.hash_sha256,
    };
    return { ...core, fingerprint_sha256: sha256(stableJson(core)) };
  } catch (error) {
    if (!transaction.rollback_proven) await rollbackMappingTransaction(client, transaction).catch(() => {});
    error.rollback_uncertain = transaction.rollback_uncertain;
    throw error;
  }
}

async function applyRepair(targets, sourceCommitSha, manifestFingerprint) {
  const transaction = mappingTransactionState();
  const client = new Client(clientConfig());
  let before;
  let transactional;
  try {
    await client.connect();
    await client.query('begin isolation level serializable');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query("select pg_advisory_xact_lock(hashtextextended('grookai:pokemon-countdown-calendar-2008:mapping-method-repair:v1', 0))");
    const freshTargets = await readBeforeTargets(client);
    assert.deepEqual(freshTargets, targets, 'countdown_mapping_repair_apply_live_drift');
    before = await captureExactState(client, targets);
    const updatedRows = await updateTargets(client, targets, sourceCommitSha, manifestFingerprint);
    transactional = await captureExactState(client, targets);
    assertAfterState(transactional, targets, sourceCommitSha, manifestFingerprint);
    await commitMappingTransaction(client, transaction);
    assert.equal(updatedRows, EXPECTED_ROWS);
  } catch (error) {
    if (!transaction.commit_attempted && !transaction.rollback_proven) {
      await rollbackMappingTransaction(client, transaction).catch(() => {});
    }
    error.commit_uncertain = transaction.commit_uncertain;
    error.rollback_uncertain = transaction.rollback_uncertain;
    throw error;
  } finally {
    await client.end().catch(() => {});
  }

  const readbackClient = new Client(clientConfig());
  try {
    await readbackClient.connect();
    const durable = await captureExactState(readbackClient, targets);
    assertAfterState(durable, targets, sourceCommitSha, manifestFingerprint);
    assert.notEqual(durable.hash_sha256, before.hash_sha256);
    assert.equal(durable.hash_sha256, transactional.hash_sha256);
    return {
      status: 'committed_and_independently_verified',
      transaction,
      writes: { external_mapping_metadata_updates: EXPECTED_ROWS, total_updates: EXPECTED_ROWS },
      before,
      transactional,
      durable,
      exact_readback: true,
      pricing_publication_performed: false,
      customer_state_changed: false,
    };
  } catch (error) {
    error.commit_succeeded = transaction.committed === true;
    error.commit_uncertain = transaction.commit_uncertain;
    throw error;
  } finally {
    await readbackClient.end().catch(() => {});
  }
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const sourceCommitSha = currentCommitSha();
  const expectedSha = process.env.COUNTDOWN_MAPPING_REPAIR_EXPECTED_SHA?.trim();
  if (expectedSha) assert.equal(sourceCommitSha, expectedSha,
    'countdown_mapping_repair_expected_sha_mismatch');
  const client = new Client(clientConfig());
  await client.connect();
  let targets;
  let rollbackProof;
  try {
    targets = await readBeforeTargets(client);
    rollbackProof = await rehearse(client, targets, sourceCommitSha, targetManifestFingerprint(targets));
  } finally {
    await client.end().catch(() => {});
  }
  const files = await codeFiles();
  const pkg = buildRepairPackageV1({ targets, sourceCommitSha, codeFiles: files, rollbackProof });
  const requiredApprovalText = repairApprovalTextV1(pkg);
  let execution = null;
  if (args.mode === 'apply') {
    assertCleanTrackedTree();
    assert.equal(process.env.COUNTDOWN_MAPPING_REPAIR_APPROVAL?.trim(), requiredApprovalText,
      'countdown_mapping_repair_exact_approval_required');
    execution = await applyRepair(targets, sourceCommitSha, pkg.target_manifest_fingerprint_sha256);
  }
  const report = {
    version: VERSION,
    package_version: PACKAGE_VERSION,
    generated_at: new Date().toISOString(),
    mode: args.mode,
    status: args.mode === 'prepare' ? 'prepared_not_authorized' : execution.status,
    package: pkg,
    targets,
    rollback_proof: rollbackProof,
    required_approval_text: requiredApprovalText,
    execution,
    durable_database_writes_performed: args.mode === 'apply',
    price_publication_performed: false,
    customer_state_changed: false,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    version: report.version,
    mode: report.mode,
    status: report.status,
    package: report.package,
    rollback_proof: report.rollback_proof,
    execution: report.execution,
  }));
  await fs.mkdir(path.dirname(args.output), { recursive: true });
  await fs.writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    source_commit_sha: sourceCommitSha,
    package_fingerprint_sha256: pkg.package_fingerprint_sha256,
    required_approval_text: requiredApprovalText,
    execution: execution ? { writes: execution.writes, exact_readback: execution.exact_readback } : null,
  })}\n`);
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(async (error) => {
    const outputArg = process.argv.slice(2).find((arg) => arg.startsWith('--output='));
    if (outputArg) {
      const output = path.resolve(outputArg.slice('--output='.length));
      const failure = {
        version: VERSION,
        generated_at: new Date().toISOString(),
        status: 'failed',
        commit_succeeded: error.commit_succeeded ?? false,
        commit_uncertain: error.commit_uncertain ?? false,
        rollback_uncertain: error.rollback_uncertain ?? false,
        error_name: error.name ?? 'Error',
        error_code: error.code ?? null,
        error_message: String(error.message ?? error).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[database-url-redacted]'),
        required_action: error.commit_succeeded || error.commit_uncertain
          ? 'Stop and perform independent exact readback. Do not retry blindly.'
          : 'No durable commit was acknowledged. Correct the failed gate before preparing again.',
      };
      failure.fingerprint_sha256 = sha256(stableJson(failure));
      await fs.mkdir(path.dirname(output), { recursive: true });
      await fs.writeFile(output, `${JSON.stringify(failure, null, 2)}\n`, { flag: 'wx' }).catch(() => {});
    }
    console.error(`[pokemon-countdown-calendar-mapping-method-repair] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
