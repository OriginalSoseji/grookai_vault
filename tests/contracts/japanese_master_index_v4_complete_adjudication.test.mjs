import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/complete_no_write';

function readJson(filename, root = OUTPUT_ROOT) {
  return JSON.parse(
    fs.readFileSync(path.join(root, filename), 'utf8'),
  );
}

async function readJsonl(filename, visitor, root = OUTPUT_ROOT) {
  const input = fs.createReadStream(path.join(root, filename));
  const lines = readline.createInterface({
    crlfDelay: Infinity,
    input,
  });
  let count = 0;
  for await (const line of lines) {
    if (!line) continue;
    count += 1;
    visitor?.(JSON.parse(line));
  }
  return count;
}

test('complete adjudication reconciles every required input row', async () => {
  const counts = readJson('jpn_v4_final_counts.json');
  assert.deepEqual(counts.input, {
    source_assertions: 215784,
    source_assertions_and_gaps: 331501,
    source_gaps: 115717,
    working_identity_candidates: 71992,
    working_printing_facts: 71900,
  });
  assert.equal(
    Object.values(counts.identity_dispositions)
      .reduce((sum, value) => sum + value, 0),
    71992,
  );
  assert.equal(
    Object.values(counts.source_dispositions)
      .reduce((sum, value) => sum + value, 0),
    331501,
  );
  assert.equal(
    Object.values(counts.printing_dispositions)
      .reduce((sum, value) => sum + value, 0),
    71900,
  );
  assert.equal(counts.reconciliation.identity_rows_reconcile, true);
  assert.equal(counts.reconciliation.source_rows_reconcile, true);
  assert.equal(counts.reconciliation.printing_rows_reconcile, true);
  assert.equal(counts.reconciliation.generic_blocked_dispositions, 0);
  assert.equal(
    counts.reconciliation.generic_linked_assertion_dispositions,
    0,
  );
  assert.equal(counts.reconciliation.package_conflict_checks_pass, true);
  assert.deepEqual(counts.identity_dispositions, {
    additional_resolved_promotion_ready: 1448,
    blocked_but_otherwise_admissible: 355,
    direct_card_insert_ready: 38,
    duplicate_of_existing_production_identity: 37,
    existing_production_identity_preserved: 22150,
    existing_production_identity_with_core_drift: 167,
    explicitly_excluded: 178,
    historical_record_deferred_for_later_review: 3693,
    insufficient_evidence: 39737,
    set_first_then_card_insert_ready: 3850,
    unresolved_contradiction: 339,
  });
  assert.equal(counts.identity_truth.blocked_candidates_classified, 43806);
});

test('identity dispositions are exclusive and never generic blocked', async () => {
  const keys = new Set();
  const dispositions = new Set();
  const count = await readJsonl(
    'jpn_v4_final_identity_disposition.jsonl',
    (row) => {
      assert.equal(keys.has(row.candidate_key), false);
      keys.add(row.candidate_key);
      assert.notEqual(row.disposition, 'blocked');
      assert.ok(row.disposition);
      dispositions.add(row.disposition);
    },
  );
  assert.equal(count, 71992);
  assert.equal(keys.size, 71992);
  assert.ok(dispositions.has('insufficient_evidence'));
  assert.ok(dispositions.has('unresolved_contradiction'));
  assert.ok(dispositions.has('explicitly_excluded'));
  assert.ok(dispositions.has('blocked_but_otherwise_admissible'));
  assert.ok(
    dispositions.has('duplicate_of_existing_production_identity'),
  );
});

test('source and printing ledgers classify every row explicitly', async () => {
  const counts = readJson('jpn_v4_final_counts.json');
  const exactAssertionDispositions = new Set([
    ...Object.values(
      counts.source_disposition_schema.assertion_dispositions,
    ),
    'source_group_conflict',
    'excluded_source_assertion',
    'unlinked_source_assertion_requires_adjudication',
  ]);
  const sourceKinds = { a: 0, g: 0 };
  const sourceCount = await readJsonl(
    'jpn_v4_final_source_assertion_disposition.jsonl',
    (row) => {
      sourceKinds[row.kind] += 1;
      assert.ok(row.record_key);
      assert.ok(row.disposition);
      assert.notEqual(row.disposition, 'blocked');
      assert.notEqual(
        row.disposition,
        'linked_to_final_identity_disposition',
      );
      if (row.kind === 'a') {
        assert.equal(
          exactAssertionDispositions.has(row.disposition),
          true,
          row.disposition,
        );
      }
    },
  );
  assert.equal(sourceCount, 331501);
  assert.deepEqual(sourceKinds, { a: 215784, g: 115717 });

  const printingDispositions = {};
  const printingCount = await readJsonl(
    'jpn_v4_final_printing_fact_disposition.jsonl',
    (row) => {
      printingDispositions[row.disposition] =
        (printingDispositions[row.disposition] ?? 0) + 1;
      assert.notEqual(row.disposition, 'blocked');
    },
  );
  assert.equal(printingCount, 71900);
  assert.deepEqual(printingDispositions, {
    existing_production_printing_preserved: 25953,
    explicit_finish_claim_requires_corroboration: 255,
    unsupported_exact_printing_claim_rejected: 45692,
  });
});

test('promotion packages preserve old lanes and add resolved cards', async () => {
  const fingerprints = readJson('jpn_v4_final_fingerprints.json');
  const files = fingerprints.files;
  assert.equal(
    files['jpn_v4_direct_card_promotion_package.jsonl'].row_count,
    38,
  );
  assert.equal(
    files['jpn_v4_set_promotion_package.jsonl'].row_count,
    1041,
  );
  assert.equal(
    files['jpn_v4_dependent_card_promotion_package.jsonl'].row_count,
    3850,
  );
  assert.equal(
    files['jpn_v4_additional_resolved_card_package.jsonl'].row_count,
    1448,
  );

  let english = 0;
  let sets = 0;
  const additionalKeys = new Set();
  await readJsonl(
    'jpn_v4_additional_resolved_card_package.jsonl',
    (row) => {
      assert.equal(additionalKeys.has(row.candidate_key), false);
      additionalKeys.add(row.candidate_key);
      assert.deepEqual(row.promotion_blockers, []);
      assert.ok(row.printed_identity.collector_facing_name_en);
      assert.ok(row.target_set.live_set_id
        || row.target_set.prerequisite === 'promote_set_candidate_first');
      if (row.resolution.english) english += 1;
      if (row.resolution.set) sets += 1;
      if (row.resolution.english) {
        assert.ok(row.resolution.english.support_count >= 2);
        assert.equal(
          row.resolution.english.name_kind,
          'approved_collector_display_mapping_not_claimed_official',
        );
      }
      const conflict = row.promotion_contract.conflict_check_results;
      assert.equal(conflict.package_coordinate_duplicate, false);
      assert.deepEqual(conflict.live_set_number_occupant_ids, []);
      assert.equal(conflict.public_gv_id_generated, false);
      assert.equal(conflict.child_printing_generated, false);
    },
  );
  assert.equal(english, 1433);
  assert.equal(sets, 15);
});

test('package collision proof covers every ready card and set', async () => {
  const counts = readJson('jpn_v4_final_counts.json');
  assert.deepEqual(counts.promotion.card_package_conflict_proof, {
    all_conflict_checks_pass: true,
    duplicate_package_candidate_rows: 0,
    duplicate_package_coordinate_groups: 0,
    existing_live_set_target_rows: 53,
    generated_child_printings: 0,
    generated_database_identifiers: 0,
    generated_public_gv_ids: 0,
    live_set_number_conflict_rows: 0,
    package_card_rows: 5336,
    unique_package_coordinates: 5336,
  });
  assert.deepEqual(counts.promotion.set_package_conflict_proof, {
    generated_database_identifiers: 0,
    generated_public_routes: 0,
    insert_ready_reconciliations: 1041,
    live_match_conflict_rows: 0,
    missing_set_reconciliations: 1041,
    set_rows: 1041,
  });
  assert.equal(counts.promotion.image_ready_cards, 5336);
  assert.equal(counts.promotion.total_cards_ready, 5336);

  await readJsonl('jpn_v4_set_promotion_package.jsonl', (row) => {
    const result = row.promotion_contract.conflict_check_results;
    assert.equal(result.reconciliation_status, 'missing_set');
    assert.equal(result.promotion_readiness, 'set_insert_candidate');
    assert.deepEqual(result.live_match_ids, []);
    assert.equal(result.generated_database_identifier, false);
    assert.equal(result.generated_public_route, false);
  });
});

test('admissible blockers and set conflicts retain exact evidence', async () => {
  let admissibleBlocked = 0;
  await readJsonl(
    'jpn_v4_final_identity_disposition.jsonl',
    (row) => {
      if (row.disposition !== 'blocked_but_otherwise_admissible') return;
      admissibleBlocked += 1;
      assert.ok(row.reason_codes.includes(
        'collector_facing_english_name_missing',
      ));
      assert.ok(row.reason_codes.includes(
        'insufficient_authoritative_bilingual_mapping_support',
      ));
      assert.equal(row.promotion_status, 'not_promotion_ready');
      assert.equal(row.readiness.english_display_name, false);
    },
  );
  assert.equal(admissibleBlocked, 355);

  const review = readJson('jpn_v4_remaining_review_queues.json');
  assert.equal(review.summary.unresolved_english_name, 355);
  assert.equal(review.summary.unresolved_set_mapping, 84);
  for (const row of review.queues.unresolved_english_name) {
    assert.equal(
      row.evidence_needed,
      'second_independent_approved_bilingual_mapping_or_authoritative_name',
    );
  }

  const expectedSetCodes = new Set(['jpn-S8b', 'jpn-SV8a']);
  let setResolutions = 0;
  await readJsonl(
    'jpn_v4_additional_resolved_card_package.jsonl',
    (row) => {
      if (!row.resolution.set) return;
      setResolutions += 1;
      assert.equal(
        row.resolution.set.conflict_classification,
        'duplicate_live_set_shells',
      );
      assert.equal(
        row.resolution.set.recommended_action,
        'reuse_named_canonical_set_preserve_other_shell_no_mutation',
      );
      assert.equal(
        expectedSetCodes.has(row.resolution.set.selected_match.code),
        true,
      );
      assert.equal(row.resolution.set.rejected_matches.length, 1);
    },
  );
  assert.equal(setResolutions, 15);
});

test('source gaps are grouped by candidate, source, and kind exactly once', () => {
  const review = readJson('jpn_v4_remaining_review_queues.json');
  assert.deepEqual(review.source_gap_grouping_proof, {
    candidate_source_groups: 115717,
    candidate_source_groups_with_multiple_rows: 0,
    candidate_source_kind_groups: 115717,
    duplicate_candidate_source_kind_groups: 0,
    max_candidate_source_kind_group_size: 1,
    source_gap_rows: 115717,
  });
});

test('duplicate map has deterministic survivors and no invalid inventions', async () => {
  const duplicateKeys = new Set();
  const duplicateCount = await readJsonl(
    'jpn_v4_duplicate_alias_map.jsonl',
    (row) => {
      assert.equal(
        row.disposition,
        'duplicate_of_existing_production_identity',
      );
      assert.ok(row.canonical_identity_key);
      assert.ok(row.canonical_card_print_id);
      assert.equal(duplicateKeys.has(row.duplicate_identity_key), false);
      duplicateKeys.add(row.duplicate_identity_key);
    },
  );
  assert.equal(duplicateCount, 37);
  assert.equal(
    await readJsonl('jpn_v4_invalid_non_card_exclusions.jsonl'),
    0,
  );
});

test('artifact fingerprints and no-write attestation are exact', async () => {
  const manifest = readJson('jpn_v4_final_fingerprints.json');
  for (const [filename, expected] of Object.entries(manifest.files)) {
    const value = await fsp.readFile(path.join(OUTPUT_ROOT, filename));
    assert.equal(value.byteLength, expected.bytes);
    assert.equal(
      crypto.createHash('sha256').update(value).digest('hex'),
      expected.sha256,
      filename,
    );
    assert.ok(
      value.byteLength < 100 * 1024 * 1024,
      `${filename} exceeds GitHub's 100 MiB limit`,
    );
  }
  const attestation = readJson('jpn_v4_no_write_attestation.json');
  assert.equal(attestation.status, 'attested_no_write');
  assert.equal(attestation.production_state_mutated, false);
  assert.equal(attestation.promotion_authorized, false);
  assert.equal(attestation.frozen_live_baseline.all_match, true);
  for (const [key, value] of Object.entries(
    attestation.execution_boundary,
  )) {
    assert.equal(value, false, key);
  }
});

test('complete generator has no database, network, or migration execution path', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v4/'
      + 'complete_adjudication_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /@supabase|postgres|createClient|fetch\s*\(/i);
  assert.doesNotMatch(source, /child_process|spawn\s*\(|exec\s*\(/i);
  assert.doesNotMatch(source, /\.sql\b|migration\s+up|db\s+push/i);
});

test('complete adjudication replays deterministically in clean roots', {
  timeout: 120_000,
}, async () => {
  const roots = [
    '.tmp/jpn_v4_complete_replay_a',
    '.tmp/jpn_v4_complete_replay_b',
  ];
  for (const root of roots) {
    const run = spawnSync(process.execPath, [
      'scripts/audits/japanese_master_index_v4/'
        + 'complete_adjudication_v1.mjs',
      `--output-root=${root}`,
      '--quiet',
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 60_000,
    });
    assert.equal(run.status, 0, run.stderr);
  }
  const canonical = readJson('jpn_v4_final_fingerprints.json');
  const first = readJson('jpn_v4_final_fingerprints.json', roots[0]);
  const second = readJson('jpn_v4_final_fingerprints.json', roots[1]);
  assert.deepEqual(first, canonical);
  assert.deepEqual(second, canonical);
});
