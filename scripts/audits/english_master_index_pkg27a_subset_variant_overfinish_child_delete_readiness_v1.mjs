import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_current_unsupported_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg27a_subset_variant_overfinish_child_delete_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg27a_subset_variant_overfinish_child_delete_readiness_v1.md');
const PACKAGE_ID = 'PKG-27A-SUBSET-VARIANT-OVERFINISH-CHILD-DELETE-READINESS';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

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
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function normalizeFinish(value) {
  const finish = normalizeText(value);
  if (finish === 'reverse_holo') return 'reverse';
  if (finish === 'holofoil') return 'holo';
  return finish;
}

function deterministicFamily(row) {
  const setKey = normalizeText(row.canonical_set_key ?? row.set_code);
  const finish = normalizeFinish(row.finish_key);
  const variant = String(row.variant_key ?? '').trim();
  const modifier = String(row.printed_identity_modifier ?? '').trim();
  if (setKey === 'g1' && variant === 'rc' && !modifier && ['normal', 'holo', 'reverse'].includes(finish)) return 'generations_radiant_collection_overfinish';
  if (setKey === 'bw11' && variant === 'rc' && modifier === 'number_prefix:RC' && ['normal', 'reverse'].includes(finish)) return 'legendary_treasures_radiant_collection_overfinish';
  if (setKey === 'cel25c' && variant === 'cc' && ['normal', 'reverse'].includes(finish)) return 'celebrations_classic_collection_overfinish';
  if (/^swsh\d+tg$/.test(setKey) && variant === 'TG' && finish === 'normal') return 'trainer_gallery_normal_overfinish';
  if (setKey === 'col1' && modifier === 'number_prefix:SL' && !variant && finish === 'reverse') return 'call_of_legends_sl_reverse_overfinish';
  if (modifier === 'number_prefix:AR' && !variant && ['normal', 'reverse'].includes(finish)) return 'arceus_ar_prefix_overfinish';
  if (modifier === 'number_prefix:RT' && !variant && ['normal', 'holo'].includes(finish)) return 'rising_rivals_rotom_prefix_overfinish';
  if (modifier === 'number_prefix:SH' && !variant && finish === 'holo') return 'shiny_secret_prefix_holo_overfinish';
  return null;
}

function rowSort(left, right) {
  return normalizeText(left.canonical_set_key ?? left.set_code).localeCompare(normalizeText(right.canonical_set_key ?? right.set_code))
    || normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number))
    || normalizeText(left.card_name).localeCompare(normalizeText(right.card_name))
    || normalizeFinish(left.finish_key).localeCompare(normalizeFinish(right.finish_key))
    || String(left.card_printing_id).localeCompare(String(right.card_printing_id));
}

async function loadSiblingCounts(targetIds) {
  const conn = connectionString();
  if (!conn || targetIds.length === 0) return { available: false, reason: conn ? 'no targets' : 'database url unavailable', rows: [] };
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `with target as (
         select cpr.id, cpr.card_print_id
         from public.card_printings cpr
         where cpr.id = any($1::uuid[])
       )
       select
         target.id::text as card_printing_id,
         target.card_print_id::text,
         count(sibling.id)::int as parent_child_rows,
         count(sibling.id) filter (where sibling.id <> target.id)::int as sibling_rows_after_target_delete
       from target
       join public.card_printings sibling on sibling.card_print_id = target.card_print_id
       group by target.id, target.card_print_id`,
      [targetIds],
    );
    await client.query('rollback');
    return { available: true, reason: null, rows: result.rows };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, rows: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function renderMarkdown(report) {
  return `# PKG-27A Subset Variant Overfinish Child Delete Readiness V1

Read-only readiness split for deterministic subset/number-prefix overfinish child rows.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- source_rows: ${report.summary.source_rows}
- candidate_rows: ${report.summary.candidate_rows}
- blocked_rows: ${report.summary.blocked_rows}
- package_fingerprint: ${report.package_fingerprint}

## Candidate Families

${markdownTable(['family', 'rows'], Object.entries(report.summary.by_candidate_family).map(([key, count]) => [key, count]))}

## Candidate Sets

${markdownTable(['set', 'rows'], Object.entries(report.summary.by_candidate_set).map(([key, count]) => [key, count]))}

## Blocked Reasons

${markdownTable(['reason', 'rows'], Object.entries(report.summary.by_blocked_reason).map(([key, count]) => [key, count]))}

## Guardrails

- Candidate rows have no dependencies.
- Candidate rows are deterministic subset/number-prefix overfinish shapes only.
- Candidate rows are child-only delete candidates; no parent writes are implied.
- Parent must retain at least one sibling child after target deletion.
- This report is not apply authority.
`;
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.lane === 'subset_or_parallel_identity_review');
const initialCandidates = [];
const blocked = [];
for (const row of sourceRows) {
  const family = deterministicFamily(row);
  const dependencyTotal = Number(row.child_dependency_total ?? 0);
  const knownFinishes = row.known_index_finishes ?? [];
  if (!family) {
    blocked.push({ ...row, blocked_reason: 'not_deterministic_subset_overfinish_family' });
    continue;
  }
  if (dependencyTotal !== 0) {
    blocked.push({ ...row, blocked_reason: 'dependency_refs_present' });
    continue;
  }
  if (knownFinishes.includes(normalizeFinish(row.finish_key))) {
    blocked.push({ ...row, blocked_reason: 'finish_is_supported_by_master_index' });
    continue;
  }
  initialCandidates.push({
    ...row,
    candidate_family: family,
    cleanup_readiness: 'dry_run_candidate',
    reason: 'Deterministic subset/number-prefix child finish is not supported by the current Master Index and has no dependencies.',
  });
}

const siblingCounts = await loadSiblingCounts(initialCandidates.map((row) => row.card_printing_id));
const siblingById = new Map(siblingCounts.rows.map((row) => [row.card_printing_id, row]));
const candidates = [];
for (const row of initialCandidates) {
  const sibling = siblingById.get(row.card_printing_id);
  if (!siblingCounts.available) {
    blocked.push({ ...row, blocked_reason: `sibling_count_unavailable:${siblingCounts.reason}` });
    continue;
  }
  if (!sibling || Number(sibling.sibling_rows_after_target_delete) < 1) {
    blocked.push({ ...row, blocked_reason: 'parent_would_have_no_child_after_delete', sibling });
    continue;
  }
  candidates.push({
    ...row,
    parent_child_rows: Number(sibling.parent_child_rows),
    sibling_rows_after_target_delete: Number(sibling.sibling_rows_after_target_delete),
  });
}

candidates.sort(rowSort);
blocked.sort(rowSort);

const packageFingerprint = sha256(stableJson({
  package_id: PACKAGE_ID,
  candidates: candidates.map((row) => ({
    card_printing_id: row.card_printing_id,
    card_print_id: row.card_print_id,
    canonical_set_key: row.canonical_set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    printed_identity_modifier: row.printed_identity_modifier ?? '',
    variant_key: row.variant_key ?? '',
    candidate_family: row.candidate_family,
  })),
  blocked: blocked.map((row) => ({
    card_printing_id: row.card_printing_id,
    canonical_set_key: row.canonical_set_key,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    blocked_reason: row.blocked_reason,
  })),
}));

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg27a_subset_variant_overfinish_child_delete_readiness_v1',
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  source_artifact: SOURCE_JSON,
  source_generated_at: source.generated_at,
  sibling_count_available: siblingCounts.available,
  sibling_count_reason: siblingCounts.reason,
  summary: {
    source_rows: sourceRows.length,
    candidate_rows: candidates.length,
    blocked_rows: blocked.length,
    by_candidate_family: countBy(candidates, (row) => row.candidate_family),
    by_candidate_set: countBy(candidates, (row) => row.canonical_set_key ?? row.set_code ?? 'unknown'),
    by_candidate_finish: countBy(candidates, (row) => row.finish_key),
    by_blocked_reason: countBy(blocked, (row) => row.blocked_reason),
  },
  candidates,
  blocked_rows: blocked,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  package_id: PACKAGE_ID,
  package_fingerprint: packageFingerprint,
  summary: report.summary,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
