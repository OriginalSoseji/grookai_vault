import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg23a_subset_parallel_governance_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg23a_subset_parallel_governance_readiness_v1.md');
const PACKAGE_ID = 'PKG-23A-SUBSET-PARALLEL-GOVERNANCE-READINESS';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function topEntries(counts, limit = 30) {
  return Object.entries(counts).slice(0, limit).map(([key, count]) => ({ key, count }));
}

function hasVariant(row) {
  const variant = String(row.variant_key ?? '').trim();
  return variant !== '' && variant !== 'base';
}

function hasModifier(row) {
  return String(row.printed_identity_modifier ?? '').trim() !== '';
}

function classify(row) {
  const knownFinishes = row.known_index_finishes ?? [];
  const finishKnownForCard = knownFinishes.includes(row.finish_key);
  const hasKnownCard = knownFinishes.length > 0;
  const dependencyTotal = Number(row.child_dependency_total ?? 0);
  if (dependencyTotal > 0) {
    return {
      governance_bucket: 'dependency_blocked_subset_parallel_child',
      cleanup_readiness: 'blocked',
      reason: 'Child row has downstream references and cannot participate in direct cleanup.',
    };
  }
  if (hasVariant(row) || hasModifier(row)) {
    return {
      governance_bucket: finishKnownForCard
        ? 'subset_parallel_identity_modifier_or_variant_supported_finish_review'
        : 'subset_parallel_identity_modifier_or_variant_source_review',
      cleanup_readiness: 'blocked',
      reason: 'Subset variant/modifier identity requires explicit parent identity governance before any cleanup.',
    };
  }
  if (hasKnownCard && !finishKnownForCard) {
    return {
      governance_bucket: 'subset_parallel_base_finish_overgeneration_candidate',
      cleanup_readiness: 'dry_run_candidate',
      reason: 'Same set/card is Master-index known, this child has no dependencies or variant/modifier, and this finish is unsupported for the subset card.',
    };
  }
  if (hasKnownCard && finishKnownForCard) {
    return {
      governance_bucket: 'subset_parallel_base_supported_finish_key_mismatch_review',
      cleanup_readiness: 'blocked',
      reason: 'Same finish appears supported at card level, but exact reconciliation key did not match; needs key-shape inspection before write.',
    };
  }
  return {
    governance_bucket: 'subset_parallel_source_coverage_gap',
    cleanup_readiness: 'blocked',
    reason: 'No Master Index finish fact matched this subset card; source acquisition or alias governance is required.',
  };
}

function renderMarkdown(report) {
  const bucketRows = Object.entries(report.summary.by_governance_bucket).map(([bucket, count]) => [
    bucket,
    count,
    report.summary.top_sets_by_bucket[bucket]?.slice(0, 10).map((row) => `${row.key}:${row.count}`).join(', ') ?? '',
  ]);
  return `# PKG-23A Subset/Parallel Governance Readiness V1

Read-only governance split for current \`subset_or_parallel_identity_review\` rows.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- source_rows: ${report.summary.source_rows}
- dry_run_candidate_rows: ${report.summary.dry_run_candidate_rows}
- blocked_rows: ${report.summary.blocked_rows}
- package_fingerprint: ${report.package_fingerprint}

## Governance Buckets

${markdownTable(['bucket', 'rows', 'top_sets'], bucketRows)}

## Candidate Shape

These rows are candidates for a future rollback-only child-delete dry run. This report is not deletion authority.

${markdownTable(['set', 'rows'], Object.entries(report.candidate_summary.by_set).map(([set, count]) => [set, count]))}

${markdownTable(['finish', 'rows'], Object.entries(report.candidate_summary.by_finish).map(([finish, count]) => [finish, count]))}

## Guardrails

- No row with dependencies is candidate-ready.
- No row with \`variant_key\` or \`printed_identity_modifier\` is candidate-ready.
- RC/TG/SL/SH/AR/RT/Classic Collection/Shiny Vault identity rows stay blocked for separate identity governance.
- A future apply package must still produce a rollback-only dry-run proof and exact approval text.
`;
}

const source = await readJson(SOURCE_JSON);
const rows = (source.rows ?? []).filter((row) => row.lane === 'subset_or_parallel_identity_review');
const classifiedRows = rows.map((row) => {
  const classification = classify(row);
  return {
    ...classification,
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    set_code: row.set_code,
    canonical_set_key: row.canonical_set_key,
    card_number: row.card_number,
    number: row.number,
    number_plain: row.number_plain,
    card_name: row.card_name,
    finish_key: row.finish_key,
    known_index_finishes: row.known_index_finishes ?? [],
    printed_identity_modifier: row.printed_identity_modifier ?? '',
    variant_key: row.variant_key ?? '',
    child_dependency_total: Number(row.child_dependency_total ?? 0),
    live_number_candidates: row.live_number_candidates ?? [],
  };
});
const candidateRows = classifiedRows.filter((row) => row.cleanup_readiness === 'dry_run_candidate');
const packageFingerprint = sha256(stableJson({
  package_id: PACKAGE_ID,
  source_generated_at: source.generated_at,
  candidate_rows: candidateRows.map((row) => ({
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    canonical_set_key: row.canonical_set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    governance_bucket: row.governance_bucket,
  })),
}));
const topSetsByBucket = {};
for (const bucket of Object.keys(countBy(classifiedRows, (row) => row.governance_bucket))) {
  topSetsByBucket[bucket] = topEntries(countBy(
    classifiedRows.filter((row) => row.governance_bucket === bucket),
    (row) => row.canonical_set_key ?? row.set_code ?? 'unknown',
  ), 20);
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg23a_subset_parallel_governance_readiness_v1',
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifact: SOURCE_JSON,
  source_generated_at: source.generated_at,
  summary: {
    source_rows: classifiedRows.length,
    dry_run_candidate_rows: candidateRows.length,
    blocked_rows: classifiedRows.length - candidateRows.length,
    by_governance_bucket: countBy(classifiedRows, (row) => row.governance_bucket),
    by_cleanup_readiness: countBy(classifiedRows, (row) => row.cleanup_readiness),
    top_sets_by_bucket: topSetsByBucket,
  },
  candidate_summary: {
    by_set: countBy(candidateRows, (row) => row.canonical_set_key ?? row.set_code ?? 'unknown'),
    by_finish: countBy(candidateRows, (row) => row.finish_key),
  },
  rows: classifiedRows,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  summary: report.summary,
  candidate_summary: report.candidate_summary,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
