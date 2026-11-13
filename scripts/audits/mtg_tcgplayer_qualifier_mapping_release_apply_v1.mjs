#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import pg from 'pg';

import {
  assertLiveState,
  connectionConfig,
  git,
  independentState,
  loadLiveState,
  loadPackage,
  protectedCounts,
  sha256,
  writeExclusive,
} from './mtg_tcgplayer_qualifier_mapping_guarded_dry_run_v1.mjs';

export const MTG_TCGPLAYER_QUALIFIER_MAPPING_RELEASE_APPLY_V1 =
  'MTG_TCGPLAYER_QUALIFIER_MAPPING_RELEASE_APPLY_V1';

const PACKAGE_ID = 'MTG-TCGPLAYER-QUALIFIER-MAPPING-RELEASE-V1';
const AUTHORIZED_SOURCE_COMMIT = '04a693eadc9cbc1105522c590fd8d7fb8efe7f26';
const REVIEW_SOURCE_COMMIT = '5cd9f40ee1d8ba1b1c2251b54f93bf20ca6a365e';
const AUTHORIZED_FINGERPRINT = '0b38d24e4e211a5d2762f3868c5952c12efb1fccae509b5a668bae65a37f121c';
const AUTHORIZED_EVIDENCE_SOURCE = 'a3c56faf-bae4-474c-816b-0a7e7eb1206c';
const AUTHORIZED_LATEST_CATALOG = '312f4fce-2de2-4744-aa9f-ff86dd0e1fca';
const AUTHORIZED_ROLLBACK_HASH = '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';
const BATCH_SIZE = 25;
const TOTAL_ROWS = 452;
const BATCH_COUNT = Math.ceil(TOTAL_ROWS / BATCH_SIZE);
const APPROVAL_TEXT = `Approve real ${PACKAGE_ID} apply only. Source commit: ${AUTHORIZED_SOURCE_COMMIT}. Review source commit: ${REVIEW_SOURCE_COMMIT}. Fingerprint: ${AUTHORIZED_FINGERPRINT}. Scope: 452 insert-only active TCGPlayer parent mappings covering 453 MTG price observations. Dry-run rollback proof: ${AUTHORIZED_ROLLBACK_HASH} == ${AUTHORIZED_ROLLBACK_HASH}. Evidence source sync: ${AUTHORIZED_EVIDENCE_SOURCE}. Latest catalog sync: ${AUTHORIZED_LATEST_CATALOG}. No canonical identity, pricing, publication, Vault, update, delete, merge, or migration writes.`;

function parseArgs(argv) {
  const values = {};
  for (const token of argv) {
    const match = /^--(package-root|rehearsal-root|out-root|expected-head-sha|approval|batch-index)=(.+)$/.exec(token);
    assert.ok(match && !values[match[1]], `unknown_or_repeated_argument:${token}`);
    values[match[1]] = match[2];
  }
  assert.equal(values.approval, AUTHORIZED_FINGERPRINT, 'exact_approval_token_required');
  assert.match(values['expected-head-sha'] ?? '', /^[a-f0-9]{40}$/, 'expected_head_sha_required');
  const batchIndex = Number(values['batch-index']);
  assert.ok(Number.isInteger(batchIndex) && batchIndex >= 1 && batchIndex <= BATCH_COUNT,
    `batch_index_must_be_1_through_${BATCH_COUNT}`);
  for (const name of ['package-root', 'rehearsal-root', 'out-root']) {
    assert.ok(values[name], `${name}_required`);
  }
  return {
    packageRoot: path.resolve(values['package-root']),
    rehearsalRoot: path.resolve(values['rehearsal-root']),
    outRoot: path.resolve(values['out-root']),
    expectedHeadSha: values['expected-head-sha'],
    batchIndex,
  };
}

async function readJsonRaw(file) {
  const raw = await fs.readFile(file, 'utf8');
  return { raw, value: JSON.parse(raw.replace(/^\uFEFF/, '')) };
}

async function bindRehearsal(root) {
  const hashes = JSON.parse(await fs.readFile(path.join(root, 'artifact_hashes.json'), 'utf8'));
  const receipt = await readJsonRaw(path.join(root, 'guarded_dry_run.json'));
  const selected = await fs.readFile(path.join(root, 'selected_mappings.jsonl'), 'utf8');
  assert.equal(sha256(receipt.raw), hashes['guarded_dry_run.json'], 'rehearsal_receipt_hash_changed');
  assert.equal(sha256(selected), hashes['selected_mappings.jsonl'], 'rehearsal_rows_hash_changed');
  assert.equal(receipt.value.status, 'rollback_proof_passed_zero_durable_changes');
  assert.equal(receipt.value.source_commit, AUTHORIZED_SOURCE_COMMIT);
  assert.equal(receipt.value.review_source_commit, REVIEW_SOURCE_COMMIT);
  assert.equal(receipt.value.package_fingerprint_sha256, AUTHORIZED_FINGERPRINT);
  assert.equal(receipt.value.evidence_source_sync_run_id, AUTHORIZED_EVIDENCE_SOURCE);
  assert.equal(receipt.value.latest_catalog_sync_run_id, AUTHORIZED_LATEST_CATALOG);
  assert.equal(receipt.value.proof?.before_relevant_mappings?.hash_sha256, AUTHORIZED_ROLLBACK_HASH);
  assert.equal(receipt.value.proof?.after_rollback_relevant_mappings?.hash_sha256,
    AUTHORIZED_ROLLBACK_HASH);
  assert.equal(receipt.value.proof?.durable_database_writes, 0);
  assert.equal(receipt.value.approval_text_required, APPROVAL_TEXT, 'approval_text_changed');
  return receipt.value;
}

function bindPackageToRehearsal(packageData, rehearsal) {
  assert.equal(packageData.hashes['ready_mappings.jsonl'], rehearsal.review_rows_sha256,
    'package_rows_do_not_match_approved_rehearsal');
  assert.equal(packageData.summary.manifest_sha256, rehearsal.review_manifest_sha256,
    'package_manifest_does_not_match_approved_rehearsal');
}

async function scopedMappings(client, rows) {
  const sourceIds = rows.map((row) => String(row.source_product_id));
  const targetIds = rows.map((row) => row.target_card_print_id);
  return (await client.query(`select id::text,card_print_id::text,source,external_id,
    active,meta,synced_at from public.external_mappings
    where source='tcgplayer' and (external_id=any($1::text[]) or card_print_id=any($2::uuid[]))
    order by external_id::bigint,id`, [sourceIds, targetIds])).rows;
}

function assertSequenceState(allRows, mappings, expectedCount) {
  assert.equal(mappings.length, expectedCount, 'release_sequence_mapping_count_changed');
  const bySource = new Map(mappings.map((row) => [row.external_id, row]));
  for (let index = 0; index < allRows.length; index += 1) {
    const expected = allRows[index];
    const actual = bySource.get(String(expected.source_product_id));
    if (index < expectedCount) {
      assert.ok(actual, `required_prior_batch_mapping_missing:${expected.source_product_id}`);
      assert.equal(actual.card_print_id, expected.target_card_print_id,
        `required_prior_batch_target_changed:${expected.source_product_id}`);
      assert.equal(actual.active, true, `required_prior_batch_inactive:${expected.source_product_id}`);
      assert.equal(actual.meta?.package_fingerprint, AUTHORIZED_FINGERPRINT,
        `required_prior_batch_fingerprint_changed:${expected.source_product_id}`);
    } else {
      assert.equal(actual, undefined, `future_batch_mapping_already_exists:${expected.source_product_id}`);
    }
  }
}

function assertBatchReadback(batchRows, mappings, rollbackIdentities, applyCommit, batchIndex,
  expectedIds = undefined) {
  assert.equal(mappings.length, batchRows.length, 'batch_readback_count_mismatch');
  const bySource = new Map(mappings.map((row) => [row.external_id, row]));
  for (const row of batchRows) {
    const actual = bySource.get(String(row.source_product_id));
    assert.ok(actual, `batch_readback_missing:${row.source_product_id}`);
    if (expectedIds) assert.equal(actual.id, expectedIds.get(String(row.source_product_id)));
    assert.equal(actual.card_print_id, row.target_card_print_id);
    assert.equal(actual.active, true);
    assert.equal(actual.meta?.package_fingerprint, AUTHORIZED_FINGERPRINT);
    assert.equal(actual.meta?.apply_commit, applyCommit);
    assert.equal(Number(actual.meta?.batch_index), batchIndex);
    assert.equal(actual.meta?.rollback_identity,
      rollbackIdentities.get(String(row.source_product_id)));
  }
}

async function reconcileCommitAttempt(batchRows, rollbackIdentities, applyCommit, batchIndex,
  expectedIds) {
  let readback;
  try {
    readback = new pg.Client(connectionConfig(`mtg_qualifier_commit_reconcile_${batchIndex}_v1`));
    await readback.connect();
    const mappings = await scopedMappings(readback, batchRows);
    if (mappings.length === 0) {
      return { outcome: 'not_committed_zero_mappings', mapping_ids: [] };
    }
    try {
      assertBatchReadback(batchRows, mappings, rollbackIdentities, applyCommit, batchIndex,
        expectedIds);
    } catch (error) {
      return {
        outcome: 'unknown_mismatched_independent_readback',
        mapping_ids: mappings.map((row) => row.id),
        error_code: error.code ?? error.name ?? 'READBACK_MISMATCH',
        error_detail: error.message,
      };
    }
    return {
      outcome: 'committed_by_independent_readback',
      mapping_ids: mappings.map((row) => row.id),
    };
  } catch (error) {
    return {
      outcome: 'unknown_independent_readback_unavailable',
      mapping_ids: [],
      error_code: error.code ?? error.name ?? 'READBACK_UNAVAILABLE',
      error_detail: error.message,
    };
  } finally {
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

export async function runMtgTcgplayerQualifierMappingReleaseApplyV1(argv) {
  const options = parseArgs(argv);
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '',
    'tracked_worktree_must_be_clean');
  const applyCommit = git(['rev-parse', 'HEAD']);
  assert.equal(applyCommit, options.expectedHeadSha, 'expected_head_sha_changed');
  git(['merge-base', '--is-ancestor', AUTHORIZED_SOURCE_COMMIT, applyCommit]);
  const rehearsal = await bindRehearsal(options.rehearsalRoot);
  const packageData = await loadPackage({ packageRoot: options.packageRoot }, AUTHORIZED_SOURCE_COMMIT);
  bindPackageToRehearsal(packageData, rehearsal);
  assert.equal(packageData.ready.length, TOTAL_ROWS, 'authorized_scope_count_changed');
  assert.equal(packageData.summary.source_commit, REVIEW_SOURCE_COMMIT, 'review_source_commit_changed');
  const start = (options.batchIndex - 1) * BATCH_SIZE;
  const batchRows = packageData.ready.slice(start, start + BATCH_SIZE);
  const batchEvidence = packageData.evidenceRows.slice(start, start + BATCH_SIZE);
  const expectedAfter = start + batchRows.length;
  const outDir = path.join(options.outRoot, `batch-${String(options.batchIndex).padStart(2, '0')}`);
  await fs.mkdir(outDir, { recursive: false });
  let committed = false;
  let commitAttempted = false;
  let commitOutcome = 'not_attempted';
  let transactionOpen = false;
  let client;
  let insertedIds = new Map();
  let rollbackManifestWritten = false;
  const rollbackIdentities = new Map(batchRows.map((row) => [String(row.source_product_id),
    `${AUTHORIZED_FINGERPRINT}:batch:${options.batchIndex}:source:${row.source_product_id}`]));
  const rollbackPlan = {
    version: MTG_TCGPLAYER_QUALIFIER_MAPPING_RELEASE_APPLY_V1,
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: AUTHORIZED_FINGERPRINT,
    apply_commit: applyCommit,
    batch_index: options.batchIndex,
    mappings: batchRows.map((row) => ({
      source: 'tcgplayer',
      external_id: String(row.source_product_id),
      card_print_id: row.target_card_print_id,
      rollback_identity: rollbackIdentities.get(String(row.source_product_id)),
    })),
    automatic_rollback_authority: false,
    rollback_requires_separate_review_and_approval: true,
  };
  await writeExclusive(path.join(outDir, 'rollback_plan.json'),
    `${JSON.stringify(rollbackPlan, null, 2)}\n`);
  try {
    const before = await independentState(batchRows,
      `mtg_qualifier_apply_before_${options.batchIndex}_v1`, batchEvidence);
    assertLiveState(batchRows, batchEvidence, before.live);
    assert.equal(before.live.sourceRun.id, AUTHORIZED_LATEST_CATALOG, 'latest_catalog_sync_changed');
    assert.equal(before.live.observations[0]?.last_seen_run_id, AUTHORIZED_EVIDENCE_SOURCE,
      'evidence_source_sync_changed');
    client = new pg.Client(connectionConfig(`mtg_qualifier_apply_${options.batchIndex}_v1`));
    await client.connect();
    const environment = await sanity(client);
    assertSequenceState(packageData.ready, await scopedMappings(client, packageData.ready), start);
    const countsBefore = await protectedCounts(client);
    await client.query('begin transaction isolation level serializable');
    transactionOpen = true;
    await client.query("set local lock_timeout='15s'");
    await client.query("set local statement_timeout='10min'");
    await client.query("select pg_advisory_xact_lock(hashtext('tcgplayer_market_exact_mapping_apply_v1'))");
    const live = await loadLiveState(client, batchRows, batchEvidence);
    assertLiveState(batchRows, batchEvidence, live);
    assert.equal(live.sourceRun.id, AUTHORIZED_LATEST_CATALOG, 'latest_catalog_changed_in_transaction');
    assertSequenceState(packageData.ready, await scopedMappings(client, packageData.ready), start);
    const payload = batchRows.map((row) => ({
      card_print_id: row.target_card_print_id,
      external_id: String(row.source_product_id),
      meta: {
        contract_version: MTG_TCGPLAYER_QUALIFIER_MAPPING_RELEASE_APPLY_V1,
        package_id: PACKAGE_ID,
        package_fingerprint: AUTHORIZED_FINGERPRINT,
        approval_text_sha256: sha256(APPROVAL_TEXT),
        review_manifest_sha256: packageData.summary.manifest_sha256,
        review_rows_sha256: packageData.hashes['ready_mappings.jsonl'],
        authorized_source_commit: AUTHORIZED_SOURCE_COMMIT,
        review_source_commit: REVIEW_SOURCE_COMMIT,
        apply_commit: applyCommit,
        evidence_source_sync_run_id: AUTHORIZED_EVIDENCE_SOURCE,
        latest_catalog_sync_run_id: AUTHORIZED_LATEST_CATALOG,
        batch_index: options.batchIndex,
        batch_count: BATCH_COUNT,
        rollback_identity: rollbackIdentities.get(String(row.source_product_id)),
        source_group_id: row.source_group_id,
        source_group_name: row.source_group_name,
        source_product_name: row.source_product_name,
        mapping_method: row.mapping_method,
        mapping_confidence: row.mapping_confidence,
        reviewed_qualifier: row.reviewed_qualifier,
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
    assertBatchReadback(batchRows, inserted, rollbackIdentities, applyCommit,
      options.batchIndex, insertedIds);
    const insideMappings = await scopedMappings(client, batchRows);
    assertBatchReadback(batchRows, insideMappings, rollbackIdentities, applyCommit,
      options.batchIndex, insertedIds);
    const countsInside = await protectedCounts(client);
    assert.equal(Number(countsInside.active_mtg) - Number(countsBefore.active_mtg), batchRows.length,
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
    await writeExclusive(path.join(outDir, 'rollback_manifest.json'),
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
      const reconciliation = await reconcileCommitAttempt(batchRows, rollbackIdentities,
        applyCommit, options.batchIndex, insertedIds);
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
    const readback = new pg.Client(connectionConfig(`mtg_qualifier_readback_${options.batchIndex}_v1`));
    await readback.connect();
    try {
      const allMappings = await scopedMappings(readback, packageData.ready);
      assertSequenceState(packageData.ready, allMappings, expectedAfter);
      const batchMappings = await scopedMappings(readback, batchRows);
      assertBatchReadback(batchRows, batchMappings, rollbackIdentities, applyCommit,
        options.batchIndex, insertedIds);
      const countsAfter = await protectedCounts(readback);
      assert.equal(Number(countsAfter.active_mtg) - Number(countsBefore.active_mtg), batchRows.length,
        'post_commit_mtg_mapping_delta_changed');
      assert.equal(Number(countsAfter.active_non_mtg), Number(countsBefore.active_non_mtg),
        'post_commit_non_mtg_mapping_count_changed');
      const receipt = {
        version: MTG_TCGPLAYER_QUALIFIER_MAPPING_RELEASE_APPLY_V1,
        status: 'committed_zero_mismatch_readback',
        package_id: PACKAGE_ID,
        package_fingerprint_sha256: AUTHORIZED_FINGERPRINT,
        authorized_source_commit: AUTHORIZED_SOURCE_COMMIT,
        review_source_commit: REVIEW_SOURCE_COMMIT,
        apply_commit: applyCommit,
        evidence_source_sync_run_id: AUTHORIZED_EVIDENCE_SOURCE,
        latest_catalog_sync_run_id: AUTHORIZED_LATEST_CATALOG,
        batch_index: options.batchIndex,
        batch_count: BATCH_COUNT,
        batch_mapping_writes: batchRows.length,
        cumulative_release_mappings: expectedAfter,
        complete: expectedAfter === TOTAL_ROWS,
        environment,
        protected_counts_before: countsBefore,
        protected_counts_after: countsAfter,
        mapping_ids: [...insertedIds.values()],
        commit_outcome: commitOutcome,
        boundaries: {
          mapping_inserts: batchRows.length,
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
      await writeExclusive(path.join(outDir, 'apply_receipt.json'),
        `${JSON.stringify(receipt, null, 2)}\n`);
      await writeHashes(outDir,
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
      version: MTG_TCGPLAYER_QUALIFIER_MAPPING_RELEASE_APPLY_V1,
      status: committed
        ? 'post_commit_readback_failed'
        : commitUnknown
          ? 'commit_outcome_unknown_requires_operator_readback'
          : 'failed_zero_committed_writes',
      package_fingerprint_sha256: AUTHORIZED_FINGERPRINT,
      apply_commit: applyCommit,
      batch_index: options.batchIndex,
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
    await writeExclusive(path.join(outDir, 'failure.json'), `${JSON.stringify(failure, null, 2)}\n`)
      .catch(() => {});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runMtgTcgplayerQualifierMappingReleaseApplyV1(process.argv.slice(2))
    .then((receipt) => process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`))
    .catch((error) => {
      console.error(`[mtg-tcgplayer-qualifier-mapping-apply] ${error.stack ?? error.message}`);
      process.exitCode = 1;
    });
}
