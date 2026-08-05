import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  EXPECTED_LOW_RESOLUTION_ROWS,
  EXPECTED_CANDIDATE_QUALITY_COUNTS,
  EXPECTED_OFFICIAL_MATCH_COUNTS,
  EXPECTED_REMEDIATION_DISPOSITIONS,
  EXPECTED_SEREBII_DETAIL_ROWS,
  chooseRemediation,
  classifyOfficialMatches,
  ogImageUrl,
} from '../../scripts/audits/japanese_master_index_v4/image_source_remediation_v1.mjs';
import { readVerifiedArtifact } from '../../scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs';
import { contentFingerprint } from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';

const LIVE_ARTIFACT =
  'docs/audits/japanese_master_index_v4/image_source_remediation_v1/'
  + 'jpn_image_source_remediation_v1.json';

function candidate(overrides = {}) {
  return {
    candidate_id: 'candidate-1',
    authority: 'official_exact_set_number_printed_name_unique',
    valid_image: true,
    quality_band: 'high',
    ...overrides,
  };
}

test('source remediation freezes the exact 53-row evidence split', () => {
  assert.equal(EXPECTED_LOW_RESOLUTION_ROWS, 53);
  assert.deepEqual(EXPECTED_OFFICIAL_MATCH_COUNTS, {
    unique: 31,
    ambiguous: 8,
    none: 14,
  });
  assert.equal(EXPECTED_SEREBII_DETAIL_ROWS, 32);
  assert.deepEqual(EXPECTED_REMEDIATION_DISPOSITIONS, {
    ready_high_resolution_source: 36,
    review_ambiguous_official_image: 6,
    review_usable_below_high_resolution_threshold: 7,
    blocked_invalid_higher_resolution_source: 1,
    blocked_no_higher_resolution_exact_source: 3,
  });
  assert.deepEqual(EXPECTED_CANDIDATE_QUALITY_COUNTS, {
    high: 71,
    invalid: 1,
    usable: 7,
  });
});

test('official source matching distinguishes unique, ambiguous, and absent evidence', () => {
  assert.equal(classifyOfficialMatches([]), 'none');
  assert.equal(classifyOfficialMatches([{}]), 'unique');
  assert.equal(classifyOfficialMatches([{}, {}]), 'ambiguous');
});

test('unique exact official evidence is selected over a community detail image', () => {
  const decision = chooseRemediation({
    officialMatchCount: 1,
    officialCandidates: [candidate()],
    serebiiCandidate: candidate({
      candidate_id: 'serebii-1',
      authority: 'preserved_serebii_exact_row_detail_page',
    }),
  });
  assert.deepEqual(decision, {
    disposition: 'ready_high_resolution_source',
    selected_candidate_id: 'candidate-1',
    selected_authority: 'official_exact_set_number_printed_name_unique',
  });
});

test('preserved Serebii detail evidence can resolve an official ambiguity', () => {
  const decision = chooseRemediation({
    officialMatchCount: 2,
    officialCandidates: [
      candidate({ candidate_id: 'official-a' }),
      candidate({ candidate_id: 'official-b' }),
    ],
    serebiiCandidate: candidate({
      candidate_id: 'serebii-1',
      authority: 'preserved_serebii_exact_row_detail_page',
    }),
  });
  assert.equal(decision.disposition, 'ready_high_resolution_source');
  assert.equal(decision.selected_candidate_id, 'serebii-1');
});

test('ambiguous official images remain review-blocked without independent evidence', () => {
  const decision = chooseRemediation({
    officialMatchCount: 2,
    officialCandidates: [
      candidate({ candidate_id: 'official-a' }),
      candidate({ candidate_id: 'official-b' }),
    ],
    serebiiCandidate: null,
  });
  assert.equal(decision.disposition, 'review_ambiguous_official_image');
  assert.equal(decision.selected_candidate_id, null);
});

test('missing higher-resolution evidence remains blocked rather than guessed', () => {
  const decision = chooseRemediation({
    officialMatchCount: 0,
    officialCandidates: [],
    serebiiCandidate: null,
  });
  assert.equal(
    decision.disposition,
    'blocked_no_higher_resolution_exact_source',
  );
});

test('usable but sub-threshold evidence remains review-only', () => {
  const decision = chooseRemediation({
    officialMatchCount: 0,
    officialCandidates: [],
    serebiiCandidate: candidate({ quality_band: 'usable' }),
  });
  assert.equal(
    decision.disposition,
    'review_usable_below_high_resolution_threshold',
  );
  assert.equal(decision.selected_candidate_id, null);
});

test('invalid exact source remains blocked with a distinct disposition', () => {
  const decision = chooseRemediation({
    officialMatchCount: 0,
    officialCandidates: [],
    serebiiCandidate: candidate({
      valid_image: false,
      quality_band: 'invalid',
    }),
  });
  assert.equal(
    decision.disposition,
    'blocked_invalid_higher_resolution_source',
  );
});

test('Serebii detail-page parser extracts the full image rather than the thumbnail', () => {
  const html = '<meta property="og:image" '
    + 'content="https://www.serebii.net/card/example/60.jpg">';
  assert.equal(
    ogImageUrl(html, 'https://www.serebii.net/card/example/060.shtml'),
    'https://www.serebii.net/card/example/60.jpg',
  );
});

test('source-remediation worker has no database or Storage execution path', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v4/image_source_remediation_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /createClient\s*\(/);
  assert.doesNotMatch(source, /new\s+pg\.Client|withReadOnlyClient/);
  assert.doesNotMatch(source, /\.storage\s*\./);
  assert.doesNotMatch(source, /\b(?:insert|update|delete|merge|truncate)\s+(?:into|from|public\.)/i);
  assert.match(source, /database_writes: false/);
  assert.match(source, /storage_writes: false/);
});

test('live remediation artifact freezes the exact source-quality result', async () => {
  const { artifact } = await readVerifiedArtifact(LIVE_ARTIFACT, {
    expectedPackageId:
      'JPN-MASTER-INDEX-V4-IMAGE-SOURCE-REMEDIATION-V1',
  });
  assert.equal(
    artifact.content_fingerprint_sha256,
    '34d55e59a676a0011bac0e4a29a0eea81037b6f60005d1cd805afb569f6db9f5',
  );
  assert.equal(artifact.content.status, 'source_remediation_complete');
  assert.equal(artifact.content.summary.scope_rows, 53);
  assert.equal(artifact.content.summary.ready_rows, 36);
  assert.equal(artifact.content.summary.review_rows, 13);
  assert.equal(artifact.content.summary.blocked_rows, 4);
  assert.equal(artifact.content.summary.candidate_image_rows, 79);
  assert.deepEqual(artifact.content.summary.candidate_quality_counts, {
    high: 71,
    invalid: 1,
    usable: 7,
  });
  assert.deepEqual(artifact.content.summary.selected_authority_counts, {
    official_exact_set_number_printed_name_unique: 31,
    preserved_serebii_exact_row_detail_page: 5,
  });
  assert.equal(artifact.content.execution_boundary.database_reads, false);
  assert.equal(artifact.content.execution_boundary.database_writes, false);
  assert.equal(artifact.content.execution_boundary.storage_reads, false);
  assert.equal(artifact.content.execution_boundary.storage_writes, false);
});

test('live remediation rows preserve all candidates and never promote review rows', async () => {
  const { artifact } = await readVerifiedArtifact(LIVE_ARTIFACT);
  const rows = [];
  for (const shardPath of artifact.content.row_dataset.shard_paths) {
    const { artifact: shard } = await readVerifiedArtifact(shardPath);
    rows.push(...shard.content.rows);
  }
  assert.equal(rows.length, 53);
  assert.equal(
    contentFingerprint(rows),
    artifact.content.row_dataset.content_fingerprint_sha256,
  );
  assert.equal(new Set(rows.map((row) => row.card_print_id)).size, 53);
  assert.equal(
    rows.reduce((total, row) => total + row.candidate_sources.length, 0),
    79,
  );
  const ready = rows.filter((row) =>
    row.disposition === 'ready_high_resolution_source');
  assert.equal(ready.length, 36);
  assert.equal(
    ready.every((row) => row.selected_candidate?.valid_image
      && row.selected_candidate.quality_band === 'high'
      && row.proposed_target_storage_path),
    true,
  );
  assert.equal(
    rows.filter((row) => row.disposition !== 'ready_high_resolution_source')
      .every((row) => !row.selected_candidate
        && !row.proposed_target_storage_path),
    true,
  );
  assert.equal(
    rows.every((row) => row.human_visual_identity_confirmation
      === 'not_performed'),
    true,
  );
  assert.equal(rows.every((row) => !row.database_write_performed), true);
  assert.equal(rows.every((row) => !row.storage_access_performed), true);
});
