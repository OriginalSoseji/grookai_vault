import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildMtgTcgplayerGlobalExactReviewQueueV1,
  planMtgTcgplayerGlobalExactReviewRowV1,
} from '../../backend/pricing/mtg_tcgplayer_global_exact_review_queue_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function row(overrides = {}) {
  const base = {
    disposition: 'review_queue',
    source_product_id: 100001,
    source_product_name: 'Lightning Bolt (Retro Frame)',
    source_group_id: 100,
    source_group_name: 'Example Set',
    printed_number: '150',
    source_subtypes: ['Normal'],
    supporting_gap_row_count: 2,
    advice: {
      decision: 'lead_candidate',
      candidate_id: 'card-1',
      confidence: 0.99,
      reason_code: 'unique_field_alignment',
    },
    target: {
      candidate_id: 'card-1',
      card_print_id: 'card-1',
      gv_id: 'GV-MTG-SF-11111111-1111-4111-8111-111111111111',
      set_id: 'set-1',
      set_code: 'set',
      set_name: 'Example Set',
      canonical_name: 'Lightning Bolt',
      canonical_number: '150',
      variant_key: 'scryfall:11111111-1111-4111-8111-111111111111',
      game: 'mtg',
      identity_domain: 'mtg_eng_paper_print',
      active_standard_identity_count: 1,
      active_tcgplayer_mapping_count: 0,
      candidate_evidence: {
        target_set_source: 'global_catalog_search',
        number_exact: true,
        name_exact: true,
        name_similarity: 1,
        source_name_match: 'base_name_alias',
      },
    },
    candidate_search: {
      version: 'TCGPLAYER_OLLAMA_CANDIDATE_ENRICHMENT_V1',
      database_reads_only: true,
      likely_sealed_product: false,
      group_consensus: null,
      candidate_pool_count: 8,
      discovered_candidate_count: 1,
      diagnostic_reference_count: 0,
      no_candidate_reason: null,
      mapping_authority: false,
      publication_authority: false,
    },
  };
  return { ...base, ...overrides };
}

test('unique global exact MTG coordinate enters review-only queue', () => {
  const result = planMtgTcgplayerGlobalExactReviewRowV1(row());
  assert.equal(result.ready, true);
  assert.equal(result.row.mapping_authority, false);
  assert.equal(result.row.publication_authority, false);
  assert.equal(result.row.mapping_method,
    'exact_mtg_global_name_number_unique_review_v1');
  assert.equal(result.row.target_set_name, 'Example Set');
  assert.equal(result.row.target_set_source, 'global_catalog_search');
  assert.equal(result.row.target_name_match, 'base_name_alias');
  assert.equal(result.row.active_tcgplayer_mapping_count, 0);
  assert.equal(result.row.model_reason_code, 'unique_field_alignment');
});

test('global ambiguity, weak model advice and current mappings fail closed', () => {
  assert.equal(planMtgTcgplayerGlobalExactReviewRowV1(row({
    candidate_search: {
      ...row().candidate_search,
      discovered_candidate_count: 2,
    },
  })).hold.reason, 'global_search_not_unique');
  assert.equal(planMtgTcgplayerGlobalExactReviewRowV1(row({
    advice: { ...row().advice, confidence: 0.95 },
  })).hold.reason, 'model_lead_not_exactly_bound');
  assert.equal(planMtgTcgplayerGlobalExactReviewRowV1(row({
    target: { ...row().target, active_tcgplayer_mapping_count: 1 },
  })).hold.reason, 'target_identity_or_mapping_state_invalid');
});

test('name and coordinate evidence are independently recomputed', () => {
  assert.equal(planMtgTcgplayerGlobalExactReviewRowV1(row({
    target: { ...row().target, canonical_name: 'Shock' },
  })).hold.reason, 'normalized_name_not_exact');
  assert.equal(planMtgTcgplayerGlobalExactReviewRowV1(row({
    target: { ...row().target, canonical_number: '151' },
  })).hold.reason, 'printed_coordinate_not_exact');
});

test('review evidence requires a readable target set identity', () => {
  assert.equal(planMtgTcgplayerGlobalExactReviewRowV1(row({
    target: { ...row().target, set_name: '' },
  })).hold.reason, 'source_or_target_identity_incomplete');
});

test('review queue shards deterministically into maximum 50-row batches', () => {
  const rows = Array.from({ length: 121 }, (_, index) => row({
    source_product_id: 100001 + index,
    target: {
      ...row().target,
      candidate_id: `card-${index + 1}`,
      card_print_id: `card-${index + 1}`,
      gv_id: `GV-MTG-${index + 1}`,
    },
    advice: {
      ...row().advice,
      candidate_id: `card-${index + 1}`,
    },
  }));
  const result = buildMtgTcgplayerGlobalExactReviewQueueV1(rows);
  assert.equal(result.counts.ready_rows, 121);
  assert.equal(result.counts.batch_count, 3);
  assert.deepEqual(result.batches.map((batch) => batch.row_count), [50, 50, 21]);
  assert.equal(result.boundaries.mapping_writes, false);
  assert.equal(result.boundaries.second_founder_approval_required, true);
  assert.match(result.manifest_sha256, /^[a-f0-9]{64}$/);
  assert.notEqual(
    buildMtgTcgplayerGlobalExactReviewQueueV1([
      row(),
    ]).manifest_sha256,
    buildMtgTcgplayerGlobalExactReviewQueueV1([
      row({ target: { ...row().target, set_name: 'Changed Set Name' } }),
    ]).manifest_sha256,
  );
});

test('duplicate source products and targets are held across the full queue', () => {
  const duplicateProduct = row();
  const duplicateTarget = row({
    source_product_id: 100002,
    advice: { ...row().advice, candidate_id: 'card-1' },
  });
  const result = buildMtgTcgplayerGlobalExactReviewQueueV1([
    row(), duplicateProduct, duplicateTarget,
  ]);
  assert.equal(result.counts.ready_rows, 0);
  assert.equal(result.counts.held_rows, 3);
});

test('CLI writes immutable batch evidence and refuses apply mode', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'grookai-mtg-review-test-'));
  const input = path.join(root, 'review_queue.jsonl');
  const output = path.join(root, 'output');
  fs.writeFileSync(input, `${JSON.stringify(row())}\n`);
  const script = path.join(
    ROOT,
    'scripts/audits/mtg_tcgplayer_global_exact_review_queue_v1.mjs',
  );
  const result = spawnSync(process.execPath, [
    script,
    `--input=${input}`,
    `--out-dir=${output}`,
    `--source-commit=${'a'.repeat(40)}`,
  ], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(fs.readFileSync(
    path.join(output, 'summary.json'),
    'utf8',
  ));
  assert.equal(summary.counts.ready_rows, 1);
  assert.equal(summary.counts.batch_count, 1);
  assert.equal(summary.boundaries.mapping_writes, false);
  assert.equal(fs.readFileSync(
    path.join(output, 'batches/batch-0001/review_candidates.jsonl'),
    'utf8',
  ).trim().length > 0, true);
  const hashes = JSON.parse(fs.readFileSync(
    path.join(output, 'artifact_hashes.json'),
    'utf8',
  ));
  assert.match(hashes['batches/batch-0001/summary.json'], /^[a-f0-9]{64}$/);
  assert.equal(JSON.parse(fs.readFileSync(
    path.join(output, 'COMPLETE_V1.json'),
    'utf8',
  )).status, 'complete');

  const verified = spawnSync(process.execPath, [
    script,
    '--verify-existing',
    `--input=${input}`,
    `--out-dir=${output}`,
    `--source-commit=${'a'.repeat(40)}`,
  ], { encoding: 'utf8' });
  assert.equal(verified.status, 0, verified.stderr);
  assert.equal(JSON.parse(verified.stdout).status, 'verified_complete');

  fs.rmSync(path.join(output, 'COMPLETE_V1.json'));
  const partial = spawnSync(process.execPath, [
    script,
    '--verify-existing',
    `--input=${input}`,
    `--out-dir=${output}`,
    `--source-commit=${'a'.repeat(40)}`,
  ], { encoding: 'utf8' });
  assert.notEqual(partial.status, 0);

  const refused = spawnSync(process.execPath, [script, '--apply'], {
    encoding: 'utf8',
  });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /read-only/);
});

test('continuous runner verifies completion and regenerates partial packages', () => {
  const source = fs.readFileSync(path.join(
    ROOT,
    'scripts/ops/run_continuous_pricing_triage_v2.ps1',
  ), 'utf8');
  assert.match(source, /--verify-existing/);
  assert.match(source, /Removing incomplete or invalid generated review package/);
  assert.match(source, /Remove-Item -LiteralPath \$reviewRoot -Recurse -Force/);
  assert.doesNotMatch(source, /Test-Path -LiteralPath \$reviewSummary[\s\S]{0,120}Reusing completed/);
});

test('continuous runner preserves completed input provenance across unchanged hosted runs', () => {
  const source = fs.readFileSync(path.join(
    ROOT,
    'scripts/ops/run_continuous_pricing_triage_v2.ps1',
  ), 'utf8');
  assert.match(source, /function Get-CompletedSourceCommit/);
  assert.match(source, /\$completion\.input_sha256 -ne \$ExpectedInputSha/);
  assert.match(source, /\$completion\.github_head_sha/);
  assert.match(source, /\^\[a-f0-9\]\{40\}\$/);
  assert.match(source, /-SourceCommit \$completedSourceCommit/);
  assert.doesNotMatch(
    source,
    /if \(Test-Path -LiteralPath \$completePath -PathType Leaf\)[\s\S]{0,700}-SourceCommit \(\[string\]\$latestRun\.headSha\)/,
  );
});
