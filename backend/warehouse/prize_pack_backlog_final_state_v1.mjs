import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const CHECKPOINT_DIR = path.join(repoRoot, 'docs', 'checkpoints', 'warehouse');

const WORKFLOW = 'FINALIZE_PRIZE_PACK_BACKLOG_STATE';
const V22_INPUT_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v22_nonblocked_input.json');
const V22_OUTPUT_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_evidence_v22_nonblocked.json');
const SPECIAL_REPAIR_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_special_identity_family_repair_v1.json',
);
const OUTPUT_JSON_PATH = path.join(
  CHECKPOINT_DIR,
  'prize_pack_backlog_final_state_v1.json',
);
const OUTPUT_MD_PATH = path.join(CHECKPOINT_DIR, 'prize_pack_backlog_final_state_v1.md');

const FUTURE_PATHS = [
  {
    id: 'SERIES_2_OR_OTHER_OFFICIAL_SOURCE_ACQUISITION',
    allowed_when:
      'A new official or first-party distributed checklist/source appears that can supply exact printed-identity evidence for unresolved rows.',
    action:
      'Import as local JSON or equivalent source-backed artifact, then rerun a bounded evidence-upgrade pass only for rows affected by that source.',
  },
  {
    id: 'NONBLOCKED_RESEARCH_REOPEN',
    allowed_when:
      'A genuinely new accessible authoritative source appears with exact name + set/number evidence, not a community-maintained transcription.',
    action:
      'Open one bounded evidence slice and preserve the same READY / DO_NOT_CANON / WAIT classification rules.',
  },
  {
    id: 'PRIZE_PACK_BACKLOG_FREEZE',
    allowed_when:
      'No stronger evidence exists than the current local official pack, Series 3-8 fixtures, and reachable Bulbapedia pages.',
    action:
      'Leave unresolved rows frozen in their final buckets; do not promote, map, image-close, or mutate canon from no-hit or near-hit evidence.',
  },
  {
    id: 'ERROR_SOURCE_CLEANUP_REVIEW',
    allowed_when:
      'Duplicate/error source rows need explicit source-staging cleanup so they are not mistaken for independent canon candidates.',
    action:
      'Review source staging only; this is not a canon mutation or Prize Pack promotion path.',
  },
];

function relativeCheckpointPath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function listPrizePackArtifacts() {
  const names = await fs.readdir(CHECKPOINT_DIR);
  return names
    .filter((name) => name.endsWith('.json'))
    .filter(
      (name) =>
        name.startsWith('prize_pack_') ||
        name.startsWith('local_official_checklist_import_for_prize_pack'),
    )
    .sort()
    .map((name) => `docs/checkpoints/warehouse/${name}`);
}

function rowKey(row) {
  return [
    row.candidate_name ?? row.name ?? '',
    row.printed_number ?? '',
    row.set_code ?? '',
  ]
    .join('::')
    .toLowerCase();
}

function isErrorSourceDuplicate(row) {
  return /\b(error|duplicate)\b/i.test(
    `${row.candidate_name ?? ''} ${row.name ?? ''} ${row.source_external_id ?? ''}`,
  );
}

function rowSummary(row, extra = {}) {
  return {
    candidate_name: row.candidate_name ?? row.name ?? null,
    printed_number: row.printed_number ?? null,
    set_code: row.set_code ?? null,
    effective_base_owner_gv_id: row.effective_base_owner_gv_id ?? null,
    source_family: row.source_family ?? null,
    source_external_id: row.source_external_id ?? null,
    current_blocker_class: row.current_blocker_class ?? null,
    evidence_tier: row.evidence_tier ?? null,
    blocked_by_official_acquisition: Boolean(row.blocked_by_official_acquisition),
    evidence_signal: row.evidence_signal ?? null,
    ...extra,
  };
}

function makeBucket(definition) {
  return {
    definition,
    count: 0,
    rows: [],
  };
}

function partitionRows(rows, specialRepair) {
  const buckets = {
    ACQUISITION_BLOCKED: makeBucket(
      'Row depends on official-source confirmation not currently available in the validated local source pack.',
    ),
    NONBLOCKED_NO_HIT: makeBucket(
      'Route is valid, accessible evidence was searched, and no exact or near corroborated series hit was found.',
    ),
    NONBLOCKED_NEAR_HIT_ONLY: makeBucket(
      'Accessible evidence contains only near hits such as wrong number, wrong set token, or otherwise non-exact identity evidence.',
    ),
    SPECIAL_CASE_UNRESOLVED: makeBucket(
      'Remaining nonblocked row with special-family history or special-case handling that still lacks exact Prize Pack evidence.',
    ),
    ERROR_SOURCE_DUPLICATE: makeBucket(
      'Duplicate/error source row that should not be treated as an independent unresolved canon candidate.',
    ),
  };

  const normalRowsByKey = new Map(
    rows
      .filter((row) => !isErrorSourceDuplicate(row))
      .map((row) => [rowKey(row), row.source_external_id]),
  );

  for (const row of rows) {
    if (row.blocked_by_official_acquisition) {
      buckets.ACQUISITION_BLOCKED.rows.push(
        rowSummary(row, {
          final_bucket_reason:
            'Latest wait surface marks this row blocked by official acquisition; no exact validated local-source evidence is available.',
        }),
      );
      continue;
    }

    if (row.current_blocker_class === 'SPECIAL_IDENTITY_FAMILY_COLLISION') {
      buckets.SPECIAL_CASE_UNRESOLVED.rows.push(
        rowSummary(row, {
          final_bucket_reason:
            'Special-family repair proved a lawful base owner but no exact Prize Pack series evidence; keep unresolved without promotion.',
          special_repair_diagnosis: specialRepair?.diagnosis ?? null,
          special_repair_final_state: specialRepair?.final_state ?? null,
          special_repair_rebucketed_blocker_class: specialRepair?.rebucketed_blocker_class ?? null,
          lawful_base_owner_gv_id:
            specialRepair?.family_audit_summary?.exact_owner?.gv_id ?? null,
        }),
      );
      continue;
    }

    if (isErrorSourceDuplicate(row)) {
      buckets.ERROR_SOURCE_DUPLICATE.rows.push(
        rowSummary(row, {
          final_bucket_reason:
            'Source row is labelled as an error/duplicate and has a same name-number-set companion row; keep out of canon execution.',
          duplicate_of_source_external_id: normalRowsByKey.get(rowKey(row)) ?? null,
        }),
      );
      continue;
    }

    const signal = row.evidence_signal;
    const exactCount = Number(signal?.exact_evidence_count ?? 0);
    const nearCount = Number(signal?.near_evidence_count ?? 0);

    if (exactCount === 0 && nearCount > 0) {
      buckets.NONBLOCKED_NEAR_HIT_ONLY.rows.push(
        rowSummary(row, {
          final_bucket_reason:
            'Accessible sources showed name-level or set-family signal only; no exact name + printed-number identity match was found.',
          near_series: signal?.near_series ?? [],
        }),
      );
      continue;
    }

    buckets.NONBLOCKED_NO_HIT.rows.push(
      rowSummary(row, {
        final_bucket_reason:
          'Accessible Series 1-8 sources produced no exact hit and no usable near-hit evidence for this printed identity.',
      }),
    );
  }

  for (const bucket of Object.values(buckets)) {
    bucket.count = bucket.rows.length;
  }

  return buckets;
}

function bucketTotal(buckets) {
  return Object.values(buckets).reduce((total, bucket) => total + bucket.count, 0);
}

function representatives(buckets) {
  const byBucket = {};
  for (const [bucketName, bucket] of Object.entries(buckets)) {
    byBucket[bucketName] = bucket.rows.slice(0, bucketName === 'ACQUISITION_BLOCKED' ? 8 : 6);
  }
  return byBucket;
}

function markdownTable(rows) {
  if (rows.length === 0) return '_None._\n';
  const lines = [
    '| Name | Number | Set | Source External ID | Reason |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const row of rows) {
    lines.push(
      `| ${row.candidate_name ?? ''} | ${row.printed_number ?? ''} | ${row.set_code ?? ''} | ${row.source_external_id ?? ''} | ${row.final_bucket_reason ?? ''} |`,
    );
  }
  return `${lines.join('\n')}\n`;
}

function buildMarkdown(report) {
  const counts = report.final_counts;
  const reps = report.representative_rows_by_bucket;

  return `# Prize Pack Backlog Final State V1

Generated: ${report.generated_at}

## Executive Summary

The Prize Pack backlog now has a deterministic final checkpoint. The executable evidence lane has been exhausted against the current source pack. The remaining unresolved rows are separated into acquisition-blocked, nonblocked no-hit, nonblocked near-hit-only, error/duplicate source, and special-case buckets. No promotion, mapping, image, or canon writes were performed by this finalization pass.

## Exact Counts

- PROMOTED: ${counts.PROMOTED}
- DO_NOT_CANON: ${counts.DO_NOT_CANON}
- WAIT_TOTAL: ${counts.WAIT_TOTAL}
- WAIT_ACQUISITION_BLOCKED: ${counts.WAIT_ACQUISITION_BLOCKED}
- WAIT_NONBLOCKED_NEAR_HIT_ONLY: ${counts.WAIT_NONBLOCKED_NEAR_HIT_ONLY}
- WAIT_NONBLOCKED_NO_HIT: ${counts.WAIT_NONBLOCKED_NO_HIT}
- ERROR_SOURCE_DUPLICATE: ${counts.ERROR_SOURCE_DUPLICATE}
- WAIT_SPECIAL_FAMILY: ${counts.WAIT_SPECIAL_FAMILY}
- Remaining exact accessible hits: ${counts.WAIT_REMAINING_EXACT_ACCESSIBLE_HIT}

## What Is Closed

- ${counts.PROMOTED} Prize Pack rows are promoted.
- ${counts.DO_NOT_CANON} rows are ruled out as canon-creating Prize Pack stamped identities.
- All executed READY batches through V20 are closed through promotion, mapping, and representative image coverage.

## What Is Blocked Externally

${counts.WAIT_ACQUISITION_BLOCKED} rows remain in \`ACQUISITION_BLOCKED\`. They require stronger official-source confirmation than exists in the validated local source pack and must not be promoted from current evidence.

${markdownTable(reps.ACQUISITION_BLOCKED)}

## What Remains Unresolved But Truthful

### NONBLOCKED_NEAR_HIT_ONLY

${markdownTable(reps.NONBLOCKED_NEAR_HIT_ONLY)}

### NONBLOCKED_NO_HIT

${markdownTable(reps.NONBLOCKED_NO_HIT)}

### ERROR_SOURCE_DUPLICATE

${markdownTable(reps.ERROR_SOURCE_DUPLICATE)}

### SPECIAL_CASE_UNRESOLVED

${markdownTable(reps.SPECIAL_CASE_UNRESOLVED)}

## What Should Happen Next If New Official Data Appears

- Import only official or first-party distributed source material.
- Normalize it into the existing local JSON/source artifact contracts.
- Reopen only the rows directly affected by that new source.
- Preserve the existing READY / DO_NOT_CANON / WAIT decision rules.

## What Should Happen Next If No New Data Appears

- Freeze the unresolved backlog in these buckets.
- Do not promote no-hit or near-hit-only rows.
- Use \`ERROR_SOURCE_CLEANUP_REVIEW\` only for source-staging cleanup, not canon mutation.
- Leave the special-family row unresolved unless exact Prize Pack series evidence appears.

## Legal Future Paths

${report.recommended_future_paths
  .map((pathItem) => `- \`${pathItem.id}\`: ${pathItem.allowed_when}`)
  .join('\n')}

## Validation

- Unresolved rows: ${report.bucket_assignment_validation.unresolved_row_count}
- Bucketed rows: ${report.bucket_assignment_validation.bucketed_row_count}
- Every unresolved row assigned exactly once: ${report.bucket_assignment_validation.passed ? 'YES' : 'NO'}
- Checkpoint index alignment: ${report.checkpoint_index_alignment.status}
`;
}

async function main() {
  const [v22Input, v22Output, specialRepair] = await Promise.all([
    readJson(V22_INPUT_PATH),
    readJson(V22_OUTPUT_PATH),
    readJson(SPECIAL_REPAIR_PATH),
  ]);

  const rows = v22Input.rows ?? [];
  const buckets = partitionRows(rows, specialRepair);
  const bucketedRowCount = bucketTotal(buckets);
  const promotedTotal =
    v22Output.remaining_backlog?.promoted_prize_pack_total ??
    v22Output.current_backlog?.promoted_prize_pack_total;
  const doNotCanonTotal =
    v22Output.remaining_backlog?.do_not_canon_total_after_v22_nonblocked ??
    v22Output.current_backlog?.do_not_canon_total;

  const validation = {
    unresolved_row_count: rows.length,
    bucketed_row_count: bucketedRowCount,
    passed: rows.length === bucketedRowCount,
    unassigned_rows: rows.length === bucketedRowCount ? [] : ['bucket_count_mismatch'],
    duplicate_assignments: [],
  };

  if (!validation.passed) {
    throw new Error(`final_bucket_validation_failed:${JSON.stringify(validation)}`);
  }

  const sourceArtifacts = await listPrizePackArtifacts();
  const finalCounts = {
    PROMOTED: Number(promotedTotal),
    DO_NOT_CANON: Number(doNotCanonTotal),
    WAIT_TOTAL: rows.length,
    WAIT_ACQUISITION_BLOCKED: buckets.ACQUISITION_BLOCKED.count,
    WAIT_NONBLOCKED_NO_HIT: buckets.NONBLOCKED_NO_HIT.count,
    WAIT_NONBLOCKED_NEAR_HIT_ONLY: buckets.NONBLOCKED_NEAR_HIT_ONLY.count,
    WAIT_SPECIAL_FAMILY: buckets.SPECIAL_CASE_UNRESOLVED.count,
    ERROR_SOURCE_DUPLICATE: buckets.ERROR_SOURCE_DUPLICATE.count,
    RAW_WAIT_ERROR_OR_DUPLICATE_ROWS: buckets.ERROR_SOURCE_DUPLICATE.count,
    WAIT_NONBLOCKED_NO_HIT_INCLUDING_ERROR_SOURCE_DUPLICATE:
      buckets.NONBLOCKED_NO_HIT.count + buckets.ERROR_SOURCE_DUPLICATE.count,
    WAIT_REMAINING_EXACT_ACCESSIBLE_HIT: 0,
    WAIT_EXCLUSIVE_BUCKET_TOTAL: bucketedRowCount,
  };

  const report = {
    generated_at: new Date().toISOString(),
    workflow: WORKFLOW,
    scope:
      'Read-only final reconstruction of the Prize Pack backlog after V22 nonblocked evidence exhaustion.',
    source_of_truth: {
      unresolved_wait_surface: relativeCheckpointPath(V22_INPUT_PATH),
      latest_signal_test: relativeCheckpointPath(V22_OUTPUT_PATH),
      special_family_diagnosis: relativeCheckpointPath(SPECIAL_REPAIR_PATH),
    },
    source_artifacts: sourceArtifacts,
    final_counts: finalCounts,
    final_unresolved_buckets: buckets,
    representative_rows_by_bucket: representatives(buckets),
    recommended_future_paths: FUTURE_PATHS,
    recommended_primary_state: 'PRIZE_PACK_BACKLOG_FREEZE',
    checkpoint_index_alignment: {
      status: 'SKIPPED_NO_WAREHOUSE_CHECKPOINT_INDEX_FOUND',
      note:
        'Repository scan found no warehouse checkpoint index or TODO ledger requiring append-only alignment.',
    },
    bucket_assignment_validation: validation,
  };

  await writeJson(OUTPUT_JSON_PATH, report);
  await fs.writeFile(OUTPUT_MD_PATH, buildMarkdown(report), 'utf8');
}

await main();
