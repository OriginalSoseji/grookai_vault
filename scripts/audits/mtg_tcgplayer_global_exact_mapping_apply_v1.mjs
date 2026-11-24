#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import pg from 'pg';

import {
  assertLiveState,
  assertVerifiedProductionTls,
  connectionConfig,
  git,
  independentRead,
  loadApprovedPackage,
  loadLiveState,
  mappingSnapshot,
  protectedCounts,
  sha256,
  stableHash,
  writeExclusive,
} from './mtg_tcgplayer_global_exact_mapping_preflight_v1.mjs';

export const MTG_TCGPLAYER_GLOBAL_EXACT_MAPPING_APPLY_V1 =
  'MTG_TCGPLAYER_GLOBAL_EXACT_MAPPING_APPLY_V1';

const PACKAGE_ID = 'MTG-GLOBAL-EXACT-BATCH-0001-MAPPING-OUTCOME-V1';
const MAX_BATCH_ROWS = 50;

function parseArgs(argv) {
  const values = {};
  for (const token of argv) {
    const match = /^--(package-root|approval-file|preflight-root|out-dir|expected-head-sha|approval)=(.+)$/.exec(token);
    assert.ok(match && !values[match[1]], `unknown_or_repeated_argument:${token}`);
    values[match[1]] = match[2];
  }
  assert.match(values.approval ?? '', /^[a-f0-9]{64}$/, 'exact_approval_token_required');
  assert.match(values['expected-head-sha'] ?? '', /^[a-f0-9]{40}$/, 'expected_head_sha_required');
  for (const name of ['package-root', 'approval-file', 'preflight-root', 'out-dir']) {
    assert.ok(values[name], `${name}_required`);
  }
  return {
    packageRoot: path.resolve(values['package-root']),
    approvalFile: path.resolve(values['approval-file']),
    preflightRoot: path.resolve(values['preflight-root']),
    outDir: path.resolve(values['out-dir']),
    expectedHeadSha: values['expected-head-sha'],
    approvalToken: values.approval,
  };
}

function preflightCore(receipt) {
  return {
    version: receipt.version,
    package_id: receipt.package_id,
    source_commit: receipt.source_commit,
    queue_source_commit: receipt.queue_source_commit,
    review_producer_commit: receipt.review_producer_commit,
    queue_manifest_sha256: receipt.queue_manifest_sha256,
    batch_manifest_sha256: receipt.batch_manifest_sha256,
    batch_rows_sha256: receipt.batch_rows_sha256,
    decision_fingerprint_sha256: receipt.decision_fingerprint_sha256,
    approval_artifact_sha256: receipt.approval_artifact_sha256,
    evidence_source_sync_run_id: receipt.evidence_source_sync_run_id,
    latest_catalog_artifact_hash: receipt.latest_catalog_artifact_hash,
    source_products: receipt.source_products,
    target_card_prints: receipt.target_card_prints,
    projected_price_observations: receipt.projected_price_observations,
    mapping_manifest: receipt.mapping_manifest,
    boundaries: receipt.boundaries,
  };
}

function expectedApprovalText(receipt) {
  const firstSnapshot = receipt.proof?.first_relevant_mappings?.hash_sha256;
  const secondSnapshot = receipt.proof?.independent_relevant_mappings?.hash_sha256;
  return `Approve real ${PACKAGE_ID} apply only. Source commit: ${receipt.source_commit}. `
    + `Preflight fingerprint: ${receipt.preflight_fingerprint_sha256}. `
    + `Review decision fingerprint: ${receipt.decision_fingerprint_sha256}. `
    + `Scope: ${receipt.source_products} insert-only active TCGPlayer parent mappings `
    + `covering ${receipt.projected_price_observations} MTG price observations. `
    + `Evidence source sync: ${receipt.evidence_source_sync_run_id}. `
    + `Read-only mapping snapshot: ${firstSnapshot} == ${secondSnapshot}. `
    + 'No canonical identity, pricing, publication, Vault, update, delete, merge, or migration writes.';
}

async function readJsonRaw(file) {
  const raw = await fs.readFile(file, 'utf8');
  return { raw, value: JSON.parse(raw.replace(/^\uFEFF/, '')) };
}

async function readJsonlRaw(file) {
  const raw = await fs.readFile(file, 'utf8');
  return {
    raw,
    rows: raw.split(/\r?\n/).filter(Boolean)
      .map((line, index) => JSON.parse(index === 0 ? line.replace(/^\uFEFF/, '') : line)),
  };
}

export async function bindAuthorizedPreflight(options, packageData) {
  const totalRows = packageData.accepted.length;
  const projectedPriceObservations = packageData.accepted.reduce(
    (total, row) => total + Number(row.supporting_gap_row_count), 0,
  );
  const hashes = (await readJsonRaw(path.join(options.preflightRoot, 'artifact_hashes.json'))).value;
  assert.deepEqual(Object.keys(hashes).sort(), ['preflight.json', 'selected_mappings.jsonl'],
    'preflight_artifact_inventory_changed');
  const receipt = await readJsonRaw(path.join(options.preflightRoot, 'preflight.json'));
  const selected = await readJsonlRaw(path.join(options.preflightRoot, 'selected_mappings.jsonl'));
  assert.equal(sha256(receipt.raw), hashes['preflight.json'], 'preflight_receipt_hash_changed');
  assert.equal(sha256(selected.raw), hashes['selected_mappings.jsonl'], 'preflight_rows_hash_changed');
  assert.equal(receipt.value.status, 'read_only_preflight_passed_zero_mapping_authority');
  assert.equal(receipt.value.package_id, PACKAGE_ID);
  assert.match(receipt.value.source_commit ?? '', /^[a-f0-9]{40}$/,
    'authorized_preflight_source_commit_invalid');
  assert.equal(stableHash(preflightCore(receipt.value)),
    receipt.value.preflight_fingerprint_sha256, 'preflight_fingerprint_changed');
  assert.equal(receipt.value.preflight_fingerprint_sha256, options.approvalToken,
    'exact_approval_token_required');
  assert.equal(receipt.value.approval_artifact_sha256, packageData.approvalSha256,
    'authorized_preflight_approval_artifact_changed');
  assert.equal(receipt.value.queue_manifest_sha256, packageData.approval.queue_manifest_sha256,
    'authorized_preflight_queue_manifest_changed');
  assert.equal(receipt.value.batch_manifest_sha256, packageData.approval.batch_manifest_sha256,
    'authorized_preflight_batch_manifest_changed');
  assert.equal(receipt.value.batch_rows_sha256, packageData.batchRowsSha256,
    'authorized_preflight_batch_rows_changed');
  assert.equal(receipt.value.decision_fingerprint_sha256,
    packageData.approval.decision_fingerprint_sha256,
    'authorized_preflight_decision_changed');
  assert.equal(receipt.value.source_products, totalRows);
  assert.equal(receipt.value.target_card_prints, totalRows);
  assert.equal(receipt.value.projected_price_observations, projectedPriceObservations);
  assert.deepEqual(receipt.value.mapping_manifest, packageData.accepted.map((row) => ({
    source_product_id: row.source_product_id,
    target_card_print_id: row.target_card_print_id,
    mapping_method: row.mapping_method,
  })), 'authorized_preflight_mapping_manifest_changed');
  const requiredEmptyMappingSnapshot = mappingSnapshot([]);
  assert.deepEqual(receipt.value.proof?.first_relevant_mappings,
    requiredEmptyMappingSnapshot, 'authorized_first_mapping_snapshot_changed');
  assert.deepEqual(receipt.value.proof?.independent_relevant_mappings,
    requiredEmptyMappingSnapshot, 'authorized_independent_mapping_snapshot_changed');
  assert.equal(receipt.value.proof?.durable_database_writes, 0);
  assert.equal(receipt.value.approval_text_required, expectedApprovalText(receipt.value),
    'approval_text_changed');
  assert.deepEqual(selected.rows, packageData.accepted, 'approved_selected_rows_changed');
  return receipt.value;
}

async function scopedMappings(client, rows) {
  const sourceIds = rows.map((row) => String(row.source_product_id));
  const targetIds = rows.map((row) => row.target_card_print_id);
  return (await client.query(`select id::text,card_print_id::text,source,external_id,
    active,meta,synced_at from public.external_mappings
    where source='tcgplayer' and (external_id=any($1::text[]) or card_print_id=any($2::uuid[]))
    order by external_id::bigint,id`, [sourceIds, targetIds])).rows;
}

function assertReadback(
  rows,
  mappings,
  rollbackIdentities,
  applyCommit,
  authorization,
  expectedIds = undefined,
) {
  assert.equal(mappings.length, rows.length, 'mapping_readback_count_mismatch');
  const bySource = new Map(mappings.map((row) => [row.external_id, row]));
  for (const row of rows) {
    const actual = bySource.get(String(row.source_product_id));
    assert.ok(actual, `mapping_readback_missing:${row.source_product_id}`);
    if (expectedIds) assert.equal(actual.id, expectedIds.get(String(row.source_product_id)));
    assert.equal(actual.card_print_id, row.target_card_print_id,
      `mapping_readback_target_changed:${row.source_product_id}`);
    assert.equal(actual.active, true, `mapping_readback_inactive:${row.source_product_id}`);
    assert.equal(actual.meta?.package_id, PACKAGE_ID);
    assert.equal(actual.meta?.preflight_fingerprint, authorization.preflightFingerprint);
    assert.equal(actual.meta?.decision_fingerprint, authorization.decisionFingerprint);
    assert.equal(actual.meta?.authorized_source_commit, authorization.sourceCommit);
    assert.equal(actual.meta?.evidence_source_sync_run_id, authorization.evidenceSource);
    assert.equal(actual.meta?.apply_commit, applyCommit);
    assert.equal(actual.meta?.mapping_method, row.mapping_method);
    assert.equal(Number(actual.meta?.supporting_price_observations),
      Number(row.supporting_gap_row_count));
    assert.equal(actual.meta?.rollback_identity,
      rollbackIdentities.get(String(row.source_product_id)));
  }
}

async function reconcileCommitAttempt(
  rows,
  rollbackIdentities,
  applyCommit,
  authorization,
  expectedIds,
) {
  let readback;
  let reconciliationTransactionOpen = false;
  try {
    readback = new pg.Client(connectionConfig('mtg_global_exact_commit_reconcile_v1'));
    await readback.connect();
    assertVerifiedProductionTls(readback);
    await readback.query('begin transaction isolation level read committed');
    reconciliationTransactionOpen = true;
    await readback.query("set local statement_timeout='10min'");
    // The writer holds this transaction-scoped lock until PostgreSQL has made the
    // commit or rollback final. Acquiring it here prevents an early empty read
    // from being mistaken for a definitive rollback after a lost COMMIT response.
    await readback.query(
      "select pg_advisory_xact_lock(hashtext('tcgplayer_market_exact_mapping_apply_v1'))",
    );
    const mappings = await scopedMappings(readback, rows);
    if (mappings.length === 0) {
      await readback.query('commit');
      reconciliationTransactionOpen = false;
      return { outcome: 'not_committed_zero_mappings', mapping_ids: [] };
    }
    try {
      assertReadback(rows, mappings, rollbackIdentities, applyCommit, authorization, expectedIds);
    } catch (error) {
      await readback.query('commit');
      reconciliationTransactionOpen = false;
      return {
        outcome: 'unknown_mismatched_independent_readback',
        mapping_ids: mappings.map((row) => row.id),
        error_code: error.code ?? error.name ?? 'READBACK_MISMATCH',
        error_detail: error.message,
      };
    }
    await readback.query('commit');
    reconciliationTransactionOpen = false;
    return { outcome: 'committed_by_independent_readback', mapping_ids: mappings.map((row) => row.id) };
  } catch (error) {
    return {
      outcome: 'unknown_independent_readback_unavailable',
      mapping_ids: [],
      error_code: error.code ?? error.name ?? 'READBACK_UNAVAILABLE',
      error_detail: error.message,
    };
  } finally {
    if (readback && reconciliationTransactionOpen) await readback.query('rollback').catch(() => {});
    if (readback) await readback.end().catch(() => {});
  }
}

async function sanity(client) {
  const server = (await client.query(`select current_database() database,current_user username,
    current_setting('transaction_read_only') read_only`)).rows[0];
  assert.deepEqual(server, { database: 'postgres', username: 'postgres', read_only: 'off' },
    'unexpected_database_execution_identity');
  const counts = (await client.query(`select
    (select count(*)::integer from public.card_prints) card_prints,
    (select count(*)::integer from public.sets) sets,
    (select count(*)::integer from public.card_print_traits) card_print_traits`)).rows[0];
  assert.ok(Number(counts.card_prints) >= 40_000, 'production_card_print_invariant_failed');
  assert.ok(Number(counts.sets) >= 150, 'production_set_invariant_failed');
  assert.ok(Number(counts.card_print_traits) >= 5_000, 'production_trait_invariant_failed');
  return { server, counts };
}

async function writeHashes(outDir, files) {
  const hashes = {};
  for (const name of files) hashes[name] = sha256(await fs.readFile(path.join(outDir, name)));
  await writeExclusive(path.join(outDir, 'artifact_hashes.json'),
    `${JSON.stringify(hashes, null, 2)}\n`);
}

export async function runMtgTcgplayerGlobalExactMappingApplyV1(argv) {
  const options = parseArgs(argv);
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '',
    'tracked_worktree_must_be_clean');
  const applyCommit = git(['rev-parse', 'HEAD']);
  assert.equal(applyCommit, options.expectedHeadSha, 'expected_head_sha_changed');
  const packageData = await loadApprovedPackage(options, applyCommit);
  const totalRows = packageData.accepted.length;
  assert.ok(totalRows >= 1 && totalRows <= MAX_BATCH_ROWS,
    'authorized_scope_count_out_of_bounds');
  const preflight = await bindAuthorizedPreflight(options, packageData);
  git(['merge-base', '--is-ancestor', preflight.source_commit, applyCommit]);
  const authorization = {
    sourceCommit: preflight.source_commit,
    preflightFingerprint: preflight.preflight_fingerprint_sha256,
    decisionFingerprint: preflight.decision_fingerprint_sha256,
    evidenceSource: preflight.evidence_source_sync_run_id,
    mappingSnapshot: preflight.proof.first_relevant_mappings.hash_sha256,
    approvalText: preflight.approval_text_required,
  };
  await fs.mkdir(options.outDir, { recursive: false });
  const rows = packageData.accepted;
  const rollbackIdentities = new Map(rows.map((row) => [String(row.source_product_id),
    `${authorization.preflightFingerprint}:source:${row.source_product_id}`]));
  const rollbackPlan = {
    version: MTG_TCGPLAYER_GLOBAL_EXACT_MAPPING_APPLY_V1,
    package_id: PACKAGE_ID,
    preflight_fingerprint_sha256: authorization.preflightFingerprint,
    apply_commit: applyCommit,
    mappings: rows.map((row) => ({
      source: 'tcgplayer',
      external_id: String(row.source_product_id),
      card_print_id: row.target_card_print_id,
      rollback_identity: rollbackIdentities.get(String(row.source_product_id)),
    })),
    automatic_rollback_authority: false,
    rollback_requires_separate_review_and_approval: true,
  };
  await writeExclusive(path.join(options.outDir, 'rollback_plan.json'),
    `${JSON.stringify(rollbackPlan, null, 2)}\n`);
  let committed = false;
  let commitAttempted = false;
  let commitOutcome = 'not_attempted';
  let transactionOpen = false;
  let rollbackManifestWritten = false;
  let client;
  let insertedIds = new Map();
  try {
    const before = await independentRead(rows, 'mtg_global_exact_apply_before_v1');
    assertLiveState(rows, before.live);
    assert.equal(before.live.sourceRun.id, authorization.evidenceSource,
      'evidence_source_sync_changed_before_apply');
    assert.equal(before.relevantMappings.hash_sha256, authorization.mappingSnapshot,
      'mapping_snapshot_changed_before_apply');
    client = new pg.Client(connectionConfig('mtg_global_exact_mapping_apply_v1'));
    await client.connect();
    assertVerifiedProductionTls(client);
    const environment = await sanity(client);
    const countsBefore = await protectedCounts(client);
    await client.query('begin transaction isolation level serializable');
    transactionOpen = true;
    await client.query("set local lock_timeout='15s'");
    await client.query("set local statement_timeout='10min'");
    await client.query("select pg_advisory_xact_lock(hashtext('tcgplayer_market_exact_mapping_apply_v1'))");
    const live = await loadLiveState(client, rows);
    assertLiveState(rows, live);
    assert.equal(live.sourceRun.id, authorization.evidenceSource,
      'evidence_source_sync_changed_in_transaction');
    const payload = rows.map((row) => ({
      card_print_id: row.target_card_print_id,
      external_id: String(row.source_product_id),
      meta: {
        contract_version: MTG_TCGPLAYER_GLOBAL_EXACT_MAPPING_APPLY_V1,
        package_id: PACKAGE_ID,
        preflight_fingerprint: authorization.preflightFingerprint,
        decision_fingerprint: authorization.decisionFingerprint,
        approval_text_sha256: sha256(authorization.approvalText),
        queue_manifest_sha256: packageData.approval.queue_manifest_sha256,
        batch_manifest_sha256: packageData.approval.batch_manifest_sha256,
        authorized_source_commit: authorization.sourceCommit,
        apply_commit: applyCommit,
        evidence_source_sync_run_id: authorization.evidenceSource,
        rollback_identity: rollbackIdentities.get(String(row.source_product_id)),
        source_group_id: row.source_group_id,
        source_group_name: row.source_group_name,
        source_product_name: row.source_product_name,
        mapping_method: row.mapping_method,
        mapping_confidence: row.mapping_confidence,
        supporting_price_observations: row.supporting_gap_row_count,
      },
    }));
    const inserted = (await client.query(`insert into public.external_mappings
      (card_print_id,source,external_id,meta,active,synced_at)
      select item.card_print_id,'tcgplayer',item.external_id,item.meta,true,now()
      from jsonb_to_recordset($1::jsonb) as item(card_print_id uuid,external_id text,meta jsonb)
      order by item.external_id::bigint
      returning id::text,card_print_id::text,source,external_id,active,meta,synced_at`,
    [JSON.stringify(payload)])).rows;
    insertedIds = new Map(inserted.map((row) => [row.external_id, row.id]));
    assertReadback(rows, inserted, rollbackIdentities, applyCommit, authorization, insertedIds);
    const insideMappings = await scopedMappings(client, rows);
    assertReadback(rows, insideMappings, rollbackIdentities, applyCommit, authorization, insertedIds);
    const countsInside = await protectedCounts(client);
    assert.equal(Number(countsInside.active_mtg) - Number(countsBefore.active_mtg), totalRows,
      'transaction_mtg_mapping_delta_changed');
    assert.equal(Number(countsInside.active_non_mtg), Number(countsBefore.active_non_mtg),
      'protected_non_mtg_mapping_count_changed');
    const rollbackManifest = {
      ...rollbackPlan,
      status: 'exact_inserted_ids_captured_before_commit',
      mapping_ids: inserted.map((row) => row.id),
      mappings: inserted.map((row) => ({
        id: row.id,
        source: row.source,
        external_id: row.external_id,
        card_print_id: row.card_print_id,
        rollback_identity: row.meta.rollback_identity,
      })),
    };
    await writeExclusive(path.join(options.outDir, 'rollback_manifest.json'),
      `${JSON.stringify(rollbackManifest, null, 2)}\n`);
    rollbackManifestWritten = true;
    commitAttempted = true;
    try {
      await client.query('commit');
      transactionOpen = false;
      committed = true;
      commitOutcome = 'commit_response_confirmed';
    } catch (commitError) {
      transactionOpen = false;
      await client.end().catch(() => {});
      client = undefined;
      const reconciliation = await reconcileCommitAttempt(rows, rollbackIdentities,
        applyCommit, authorization, insertedIds);
      commitOutcome = reconciliation.outcome;
      if (reconciliation.outcome === 'committed_by_independent_readback') {
        committed = true;
      } else {
        const error = new Error(reconciliation.outcome === 'not_committed_zero_mappings'
          ? 'commit_not_applied_after_independent_readback'
          : 'commit_outcome_unknown_after_independent_readback');
        error.code = reconciliation.outcome === 'not_committed_zero_mappings'
          ? 'COMMIT_NOT_APPLIED'
          : 'COMMIT_OUTCOME_UNKNOWN';
        error.commit_error_code = commitError.code ?? commitError.name ?? 'COMMIT_RESPONSE_LOST';
        error.reconciliation = reconciliation;
        throw error;
      }
    }
    if (client) {
      await client.end();
      client = undefined;
    }
    const readback = new pg.Client(connectionConfig('mtg_global_exact_mapping_readback_v1'));
    await readback.connect();
    try {
      assertVerifiedProductionTls(readback);
      const mappings = await scopedMappings(readback, rows);
      assertReadback(rows, mappings, rollbackIdentities, applyCommit, authorization, insertedIds);
      const countsAfter = await protectedCounts(readback);
      assert.equal(Number(countsAfter.active_mtg) - Number(countsBefore.active_mtg), totalRows,
        'post_commit_mtg_mapping_delta_changed');
      assert.equal(Number(countsAfter.active_non_mtg), Number(countsBefore.active_non_mtg),
        'post_commit_non_mtg_mapping_count_changed');
      const receipt = {
        version: MTG_TCGPLAYER_GLOBAL_EXACT_MAPPING_APPLY_V1,
        status: 'committed_zero_mismatch_readback',
        package_id: PACKAGE_ID,
        preflight_fingerprint_sha256: authorization.preflightFingerprint,
        decision_fingerprint_sha256: authorization.decisionFingerprint,
        authorized_source_commit: authorization.sourceCommit,
        apply_commit: applyCommit,
        evidence_source_sync_run_id: authorization.evidenceSource,
        mapping_writes: totalRows,
        projected_price_observations: preflight.projected_price_observations,
        environment,
        protected_counts_before: countsBefore,
        protected_counts_after: countsAfter,
        mapping_snapshot_after: mappingSnapshot(mappings),
        mapping_ids: [...insertedIds.values()],
        commit_outcome: commitOutcome,
        boundaries: {
          mapping_inserts: totalRows,
          canonical_writes: 0,
          pricing_writes: 0,
          publication_writes: 0,
          vault_writes: 0,
          updates: 0,
          deletes: 0,
          merges: 0,
          migrations: 0,
        },
      };
      await writeExclusive(path.join(options.outDir, 'apply_receipt.json'),
        `${JSON.stringify(receipt, null, 2)}\n`);
      await writeHashes(options.outDir,
        ['rollback_plan.json', 'rollback_manifest.json', 'apply_receipt.json']);
      return receipt;
    } finally {
      await readback.end();
    }
  } catch (error) {
    if (transactionOpen && client && !commitAttempted) await client.query('rollback').catch(() => {});
    if (client) await client.end().catch(() => {});
    const commitUnknown = commitOutcome.startsWith('unknown_');
    const failure = {
      version: MTG_TCGPLAYER_GLOBAL_EXACT_MAPPING_APPLY_V1,
      status: committed
        ? 'post_commit_readback_failed'
        : commitUnknown
          ? 'commit_outcome_unknown_requires_operator_readback'
          : 'failed_zero_committed_writes',
      preflight_fingerprint_sha256: authorization.preflightFingerprint,
      apply_commit: applyCommit,
      committed: commitUnknown ? null : committed,
      commit_attempted: commitAttempted,
      commit_outcome: commitOutcome,
      error_code: error.code ?? error.name ?? 'APPLY_FAILURE',
      error_detail: error.message,
      commit_error_code: error.commit_error_code ?? null,
      commit_reconciliation: error.reconciliation ?? null,
      rollback_plan: 'rollback_plan.json',
      rollback_manifest: rollbackManifestWritten ? 'rollback_manifest.json' : null,
    };
    await writeExclusive(path.join(options.outDir, 'failure.json'), `${JSON.stringify(failure, null, 2)}\n`)
      .catch(() => {});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runMtgTcgplayerGlobalExactMappingApplyV1(process.argv.slice(2))
    .then((receipt) => process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`))
    .catch((error) => {
      console.error(`[mtg-global-exact-mapping-apply] ${error.stack ?? error.message}`);
      process.exitCode = 1;
    });
}
