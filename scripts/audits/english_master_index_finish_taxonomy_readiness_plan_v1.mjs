import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const READINESS_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg06a_child_printing_insert_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_finish_taxonomy_readiness_plan_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_finish_taxonomy_readiness_plan_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_finish_taxonomy_readiness_plan_checkpoint_v1.md');

const TARGET_FINISH_KEYS = ['first_edition_holo', 'first_edition_normal', 'stamped'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function sumObjectValues(object) {
  return Object.values(object ?? {}).reduce((total, value) => total + Number(value ?? 0), 0);
}

function collectRecommendedRows(readiness) {
  return (readiness.recommended_bucket?.sets ?? [])
    .flatMap((set) => (set.rows ?? []).map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      source_count: row.source_count,
      sources: row.sources ?? [],
      evidence_urls: row.evidence_urls ?? [],
      target_card_print_id: row.target_card_print_id,
      live_parent_match_count: row.live_parent_match_count,
      classification: row.classification,
    })))
    .filter((row) => TARGET_FINISH_KEYS.includes(row.finish_key));
}

function examplesFor(rows, finishKey) {
  return rows
    .filter((row) => row.finish_key === finishKey)
    .slice(0, 8)
    .map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      source_count: row.source_count,
      sources: row.sources,
    }));
}

function buildStrategyRows({ globalCounts, recommendedRows }) {
  const recommendedCounts = countBy(recommendedRows, (row) => row.finish_key);
  const recommendedSetCounts = countBy(recommendedRows, (row) => `${row.set_key}|${row.set_name}`);
  return [
    {
      finish_key: 'first_edition_holo',
      observed_global_non_present_rows: Number(globalCounts.first_edition_holo ?? 0),
      observed_current_bucket_rows: Number(recommendedCounts.first_edition_holo ?? 0),
      requested_strategy_bucket: 'canonical_finish_strategy',
      final_identity_strategy: 'canonical_version_required_then_child_holo',
      canonical_finish_key_after_decomposition: 'holo',
      display_modifier_strategy: 'Display "1st Edition" from canonical version or edition metadata; do not display it as a finish.',
      blocked_evidence_required_strategy: 'Blocked from child-only insert until the target first-edition canonical parent exists or is created through a separate canonical-version package.',
      contract_basis: [
        'VERSION_VS_FINISH_CONTRACT_V1: edition differences are version differences and must never be treated as finishes.',
        'CHILD_PRINTING_CONTRACT_V1: 1st Edition is already canonical / must not be reintroduced as child.',
      ],
      apply_readiness: 'not_child_insert_ready',
      allowed_future_write_class: 'parent canonical version resolution first; child holo insert only under the first-edition parent after separate dry-run and approval',
      forbidden_write_class: 'do not add finish_key first_edition_holo; do not insert holo under the unlimited/base parent as a proxy for first edition',
      examples: examplesFor(recommendedRows, 'first_edition_holo'),
    },
    {
      finish_key: 'first_edition_normal',
      observed_global_non_present_rows: Number(globalCounts.first_edition_normal ?? 0),
      observed_current_bucket_rows: Number(recommendedCounts.first_edition_normal ?? 0),
      requested_strategy_bucket: 'canonical_finish_strategy',
      final_identity_strategy: 'canonical_version_required_then_child_normal',
      canonical_finish_key_after_decomposition: 'normal',
      display_modifier_strategy: 'Display "1st Edition" from canonical version or edition metadata; do not display it as a finish.',
      blocked_evidence_required_strategy: 'Blocked from child-only insert until the target first-edition canonical parent exists or is created through a separate canonical-version package.',
      contract_basis: [
        'VERSION_VS_FINISH_CONTRACT_V1: edition differences are version differences and must never be treated as finishes.',
        'CHILD_PRINTING_CONTRACT_V1: 1st Edition is already canonical / must not be reintroduced as child.',
      ],
      apply_readiness: 'not_child_insert_ready',
      allowed_future_write_class: 'parent canonical version resolution first; child normal insert only under the first-edition parent after separate dry-run and approval',
      forbidden_write_class: 'do not add finish_key first_edition_normal; do not insert normal under the unlimited/base parent as a proxy for first edition',
      examples: examplesFor(recommendedRows, 'first_edition_normal'),
    },
    {
      finish_key: 'stamped',
      observed_global_non_present_rows: Number(globalCounts.stamped ?? 0),
      observed_current_bucket_rows: Number(recommendedCounts.stamped ?? 0),
      requested_strategy_bucket: 'blocked_evidence_required_strategy',
      final_identity_strategy: 'exact_stamp_identity_required',
      canonical_finish_key_after_decomposition: null,
      display_modifier_strategy: 'Display the exact stamp label only after canonical stamped identity is resolved; generic "stamped" is not display-ready truth.',
      blocked_evidence_required_strategy: 'Blocked until each row has exact stamp phrase, underlying base route, deterministic variant_key, and evidence proving the stamped printed identity.',
      contract_basis: [
        'VERSION_VS_FINISH_CONTRACT_V1: stamps are version differences and must never be treated as finishes.',
        'CHILD_PRINTING_CONTRACT_V1: stamped promos are canon-sensitive / provisional and require explicit review.',
        'STAMPED_IDENTITY_RULE_V1: lawful stamped identities need a known base plus deterministic stamped modifier.',
      ],
      apply_readiness: 'blocked_evidence_required',
      allowed_future_write_class: 'separate stamped canonical identity package only after exact stamp evidence and base-route proof',
      forbidden_write_class: 'do not add finish_key stamped; do not create a generic stamped child printing; do not collapse stamped rows into base canon',
      examples: examplesFor(recommendedRows, 'stamped'),
    },
  ].map((row) => ({
    ...row,
    current_bucket_set_counts: Object.fromEntries(
      Object.entries(recommendedSetCounts)
        .filter(([setKey]) => recommendedRows.some((candidate) => (
          `${candidate.set_key}|${candidate.set_name}` === setKey && candidate.finish_key === row.finish_key
        )))
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  }));
}

function renderMarkdown(report) {
  const strategyTable = report.strategy_classification.map((row) => [
    row.finish_key,
    row.requested_strategy_bucket,
    row.canonical_finish_key_after_decomposition ?? 'none',
    row.observed_global_non_present_rows,
    row.observed_current_bucket_rows,
    row.apply_readiness,
  ]);
  const lines = [];
  lines.push('# English Master Index Finish Taxonomy Readiness Plan V1');
  lines.push('');
  lines.push('Audit-only plan for blocked Master Index finish labels that are not active child `finish_keys`.');
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- db_writes_performed: false');
  lines.push('- migrations_created: false');
  lines.push('- cleanup_performed: false');
  lines.push('- quarantine_performed: false');
  lines.push('- apply_paths_executed: false');
  lines.push('- write_ready_now: 0');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(markdownTable(['finish_key', 'strategy', 'decomposed_finish', 'global_non_present', 'current_bucket', 'readiness'], strategyTable));
  lines.push('');
  lines.push('## Decision');
  lines.push('');
  lines.push('- `first_edition_holo` is not a finish key. It decomposes into canonical first-edition identity plus child `holo` only under that first-edition parent.');
  lines.push('- `first_edition_normal` is not a finish key. It decomposes into canonical first-edition identity plus child `normal` only under that first-edition parent.');
  lines.push('- `stamped` is not a finish key and is not specific enough to apply. It needs exact stamp identity evidence and a deterministic stamped canonical row strategy.');
  lines.push('');
  lines.push('## Strategy Details');
  lines.push('');
  for (const row of report.strategy_classification) {
    lines.push(`### ${row.finish_key}`);
    lines.push('');
    lines.push(`- requested_strategy_bucket: ${row.requested_strategy_bucket}`);
    lines.push(`- final_identity_strategy: ${row.final_identity_strategy}`);
    lines.push(`- canonical_finish_key_after_decomposition: ${row.canonical_finish_key_after_decomposition ?? 'none'}`);
    lines.push(`- apply_readiness: ${row.apply_readiness}`);
    lines.push(`- allowed_future_write_class: ${row.allowed_future_write_class}`);
    lines.push(`- forbidden_write_class: ${row.forbidden_write_class}`);
    lines.push(`- display_modifier_strategy: ${row.display_modifier_strategy}`);
    lines.push(`- blocked_evidence_required_strategy: ${row.blocked_evidence_required_strategy}`);
    lines.push('');
    lines.push('Contract basis:');
    for (const basis of row.contract_basis) lines.push(`- ${basis}`);
    lines.push('');
  }
  lines.push('## Current Bucket Set Counts');
  lines.push('');
  lines.push(markdownTable(['set', 'rows'], Object.entries(report.current_bucket_set_counts)));
  lines.push('');
  lines.push('## Next Safe Work');
  lines.push('');
  for (const item of report.next_safe_work) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## Stop Rules');
  lines.push('');
  for (const item of report.stop_rules) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
}

function renderCheckpoint(report) {
  return `# Finish Taxonomy Readiness Plan Checkpoint V1

Date: 2026-06-09

## Result

| Field | Value |
| --- | --- |
| audit_only | ${report.audit_only} |
| db_writes_performed | ${report.db_writes_performed} |
| migrations_created | ${report.migrations_created} |
| write_ready_now | ${report.write_ready_now} |
| readiness_source_fingerprint | \`${report.readiness_source_fingerprint_sha256}\` |
| plan_fingerprint | \`${report.plan_fingerprint_sha256}\` |
| target_finish_keys | ${report.target_finish_keys.join(', ')} |
| total_global_non_present_rows | ${report.total_global_non_present_rows} |
| total_current_bucket_rows | ${report.total_current_bucket_rows} |

## Decision

First-edition labels are canonical-version modifiers, not child finishes. Generic stamped labels remain blocked until exact stamped identity evidence is acquired.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [Finish Taxonomy Readiness Plan Checkpoint V1](20260609_finish_taxonomy_readiness_plan_checkpoint_v1.md) | Classifies first_edition_holo, first_edition_normal, and stamped as non-child finish taxonomy work; no writes or migrations. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_finish_taxonomy_readiness_plan_checkpoint_v1.md')) {
    writeText(indexPath, current.split('\n').map((existing) => (
      existing.includes('20260609_finish_taxonomy_readiness_plan_checkpoint_v1.md') ? line : existing
    )).join('\n'));
  } else {
    writeText(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const readiness = readJson(READINESS_JSON);
const globalCounts = readiness.summary?.by_finish_for_non_present_rows ?? {};
const recommendedRows = collectRecommendedRows(readiness);
const strategyClassification = buildStrategyRows({ globalCounts, recommendedRows });
const currentBucketSetCounts = countBy(recommendedRows, (row) => `${row.set_key}|${row.set_name}`);
const totalGlobalNonPresentRows = sumObjectValues(Object.fromEntries(
  TARGET_FINISH_KEYS.map((finishKey) => [finishKey, globalCounts[finishKey] ?? 0]),
));
const totalCurrentBucketRows = recommendedRows.length;

const planPayload = {
  readiness_source_fingerprint_sha256: readiness.package_fingerprint_sha256,
  target_finish_keys: TARGET_FINISH_KEYS,
  strategy_classification: strategyClassification.map((row) => ({
    finish_key: row.finish_key,
    requested_strategy_bucket: row.requested_strategy_bucket,
    final_identity_strategy: row.final_identity_strategy,
    canonical_finish_key_after_decomposition: row.canonical_finish_key_after_decomposition,
    observed_global_non_present_rows: row.observed_global_non_present_rows,
    observed_current_bucket_rows: row.observed_current_bucket_rows,
  })),
};

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_finish_taxonomy_readiness_plan_v1',
  audit_only: true,
  db_reads_performed: false,
  db_writes_performed: false,
  durable_db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  apply_paths_executed: false,
  write_ready_now: 0,
  source_artifacts: {
    child_printing_insert_readiness: path.relative(ROOT, READINESS_JSON).replaceAll('\\', '/'),
    contracts: [
      'docs/contracts/VERSION_VS_FINISH_CONTRACT_V1.md',
      'docs/contracts/CHILD_PRINTING_CONTRACT_V1.md',
      'docs/contracts/STAMPED_IDENTITY_RULE_V1.md',
    ],
  },
  readiness_source_fingerprint_sha256: readiness.package_fingerprint_sha256,
  plan_fingerprint_sha256: sha256(stableJson(planPayload)),
  target_finish_keys: TARGET_FINISH_KEYS,
  total_global_non_present_rows: totalGlobalNonPresentRows,
  total_current_bucket_rows: totalCurrentBucketRows,
  global_non_present_counts: Object.fromEntries(TARGET_FINISH_KEYS.map((finishKey) => [finishKey, Number(globalCounts[finishKey] ?? 0)])),
  current_bucket_set_counts: currentBucketSetCounts,
  strategy_classification: strategyClassification,
  next_safe_work: [
    'Remove first_edition_holo, first_edition_normal, and stamped from child-only insert packages.',
    'Build a canonical-version readiness plan for first-edition parent resolution before any first-edition child finish inserts.',
    'Build a stamped identity evidence queue that captures exact stamp label, underlying base route, deterministic variant_key, and source URLs.',
    'Build the next active-finish child insert package by skipping inactive taxonomy keys and using only active finish_keys.',
  ],
  stop_rules: [
    'Do not add first_edition_holo, first_edition_normal, or stamped to public.finish_keys from this report.',
    'Do not insert these labels into card_printings as child finishes.',
    'Do not use generic stamped evidence as canonical stamped identity.',
    'Do not create parent canonical version rows from this report.',
    'Do not execute apply, cleanup, quarantine, deletes, merges, or migrations from this report.',
  ],
};

writeJson(OUTPUT_JSON, report);
writeText(OUTPUT_MD, renderMarkdown(report));
writeText(CHECKPOINT_MD, renderCheckpoint(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  generated_files: [
    path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
  ],
  readiness_source_fingerprint_sha256: report.readiness_source_fingerprint_sha256,
  plan_fingerprint_sha256: report.plan_fingerprint_sha256,
  target_finish_keys: report.target_finish_keys,
  total_global_non_present_rows: report.total_global_non_present_rows,
  total_current_bucket_rows: report.total_current_bucket_rows,
  strategy: Object.fromEntries(report.strategy_classification.map((row) => [row.finish_key, row.requested_strategy_bucket])),
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  write_ready_now: report.write_ready_now,
}, null, 2));
