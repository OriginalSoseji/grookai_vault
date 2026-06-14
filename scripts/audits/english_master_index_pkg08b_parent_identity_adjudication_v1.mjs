import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_remaining_missing_reconciliation_lanes_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08b_parent_identity_adjudication_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08b_parent_identity_adjudication_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08b_parent_identity_adjudication_checkpoint_v1.md');

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

function liveNumbers(row) {
  return [...new Set([
    row.card_number,
    row.number,
    row.number_plain,
  ].filter((value) => value !== null && value !== undefined && String(value).trim()).map(normalizeNumber))];
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function displayNameComparable(value) {
  const raw = String(value ?? '')
    .replaceAll('α', 'alpha')
    .replaceAll('β', 'beta')
    .replaceAll('γ', 'gamma')
    .replaceAll('δ', 'delta');
  return normalizeText(raw)
    .replace(/\bimposter\b/g, 'impostor')
    .replace(/\bteam aqua s technical machine\b/g, 'team aqua technical machine')
    .replace(/\bteam aqua'?s technical machine\b/g, 'team aqua technical machine')
    .replace(/\bteam magma s technical machine\b/g, 'team magma technical machine')
    .replace(/\bteam magma'?s technical machine\b/g, 'team magma technical machine')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function withoutLevelXSuffix(value) {
  return displayNameComparable(value).replace(/\s+lv\s*x$/i, '').trim();
}

function candidateHasFinish(candidate, finishKey) {
  return (candidate.finishes ?? []).map(normalizeText).includes(normalizeText(finishKey));
}

function classifyIdentityPattern(row, candidates) {
  if (candidates.length !== 1) {
    return {
      identity_pattern: candidates.length > 1 ? 'multiple_same_number_candidates' : 'no_same_number_candidate',
      identity_pattern_reason: candidates.length > 1
        ? 'More than one live parent has the same set and number.'
        : 'No live parent candidate was found for the set and number.',
      confidence: 'blocked',
    };
  }

  const candidate = candidates[0];
  const master = displayNameComparable(row.card_name);
  const live = displayNameComparable(candidate.name);
  const liveWithoutLevelX = withoutLevelXSuffix(candidate.name);
  const targetFinishPresent = candidateHasFinish(candidate, row.finish_key);

  if (master === live) {
    return {
      identity_pattern: 'equivalent_after_display_normalization',
      identity_pattern_reason: 'Master and live names match after typography/spelling normalization.',
      confidence: targetFinishPresent ? 'alias_governance_ready' : 'needs_child_finish_review',
    };
  }

  if (master === liveWithoutLevelX && /\blv\.?\s*x\b/i.test(String(candidate.name ?? ''))) {
    return {
      identity_pattern: 'master_name_missing_level_x_suffix',
      identity_pattern_reason: 'Live parent includes LV.X suffix and Master Index row omits it.',
      confidence: targetFinishPresent ? 'master_index_name_governance_ready' : 'needs_child_finish_review',
    };
  }

  if (
    master.replace(/\s+/g, '') === live.replace(/\s+/g, '')
    || withoutLevelXSuffix(row.card_name) === liveWithoutLevelX
  ) {
    return {
      identity_pattern: 'spacing_or_punctuation_variant',
      identity_pattern_reason: 'Names differ only by punctuation, spacing, or normalized suffix formatting.',
      confidence: targetFinishPresent ? 'alias_governance_ready' : 'needs_child_finish_review',
    };
  }

  return {
    identity_pattern: 'unresolved_name_mismatch',
    identity_pattern_reason: 'The live same-number parent name is not equivalent under the current safe normalization rules.',
    confidence: 'manual_review_required',
  };
}

async function loadLiveParents() {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable', rows: [] };
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_code,
         coalesce(cp.number_plain, cp.number) as card_number,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.rarity,
         coalesce((
           select jsonb_agg(cpr.finish_key order by cpr.finish_key)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), '[]'::jsonb) as finishes,
         coalesce((
           select count(*)::int
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), 0) as child_count,
         coalesce((
           select count(*)::int
           from public.external_mappings em
           where em.card_print_id = cp.id
         ), 0) as external_mapping_count,
         coalesce((
           select count(*)::int
           from public.vault_items vi
           where vi.card_id = cp.id
         ), 0) as vault_item_count
       from public.card_prints cp
       where coalesce(cp.set_code, '') <> ''
       order by cp.set_code, cp.number, cp.name, cp.id`,
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

function classifyRows({ sourceRows, liveParents }) {
  const rows = [];
  for (const row of sourceRows) {
    const aliases = new Set((row.set_aliases_checked ?? [row.set_key]).map(normalizeText));
    const candidates = liveParents.filter((parent) => (
      aliases.has(normalizeText(parent.set_code)) &&
      liveNumbers(parent).includes(normalizeNumber(row.card_number))
    ));
    const exactNameCandidates = candidates.filter((parent) => normalizeText(parent.name) === normalizeText(row.card_name));
    let adjudication_lane = 'same_number_name_mismatch';
    let recommended_next_action = 'Manual identity review required before parent update, merge, or child insertion.';
    if (exactNameCandidates.length > 1) {
      adjudication_lane = 'duplicate_exact_parent';
      recommended_next_action = 'Prepare duplicate-parent dependency transfer plan; do not insert new parent.';
    } else if (exactNameCandidates.length === 1) {
      adjudication_lane = 'single_exact_parent_recheck_child';
      recommended_next_action = 'Recheck child finish existence against the single exact parent before any insert.';
    } else if (candidates.length === 0) {
      adjudication_lane = 'no_live_number_candidate';
      recommended_next_action = 'Return to parent insert readiness only after set alias is reconfirmed.';
    }
    const identityPattern = classifyIdentityPattern(row, candidates);
    rows.push({
      adjudication_lane,
      recommended_next_action,
      ...identityPattern,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      source_count: row.source_count,
      exact_parent_match_count: exactNameCandidates.length,
      same_number_candidate_count: candidates.length,
      same_number_candidate_has_target_finish: candidates.some((candidate) => candidateHasFinish(candidate, row.finish_key)),
      same_number_candidates: candidates.map((parent) => ({
        card_print_id: parent.card_print_id,
        set_code: parent.set_code,
        number: parent.number,
        number_plain: parent.number_plain,
        name: parent.name,
        rarity: parent.rarity,
        finishes: parent.finishes,
        child_count: parent.child_count,
        external_mapping_count: parent.external_mapping_count,
        vault_item_count: parent.vault_item_count,
      })),
      sources: row.sources ?? [],
      evidence_urls: row.evidence_urls ?? [],
    });
  }
  return rows;
}

function renderMarkdown(report) {
  const laneRows = Object.entries(report.summary.by_adjudication_lane).map(([lane, count]) => [
    lane,
    count,
    report.summary.top_sets_by_lane[lane]?.map((row) => `${row.key}:${row.count}`).slice(0, 10).join(', ') ?? '',
  ]);
  const patternRows = Object.entries(report.summary.by_identity_pattern).map(([pattern, count]) => [
    pattern,
    count,
    report.summary.top_sets_by_identity_pattern[pattern]?.map((row) => `${row.key}:${row.count}`).slice(0, 10).join(', ') ?? '',
  ]);
  return `# PKG-08B Parent Identity Adjudication V1

Read-only identity adjudication for remaining Master Index rows where the same set+number has ambiguous live parent state.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

${markdownTable(['lane', 'rows', 'top_sets'], laneRows)}

## Identity Patterns

${markdownTable(['pattern', 'rows', 'top_sets'], patternRows)}

## Next Actions

- duplicate_exact_parent: build dependency-transfer dry run before any merge/delete.
- same_number_name_mismatch: manual identity adjudication; no automatic writes.
- single_exact_parent_recheck_child: can be returned to child-only readiness after a fresh child existence check.
- no_live_number_candidate: return to parent insert readiness only after alias confirmation.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08B Parent Identity Adjudication Checkpoint V1](20260610_pkg08b_parent_identity_adjudication_checkpoint_v1.md) | Read-only adjudication for ambiguous same-number parent rows. No writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08b_parent_identity_adjudication_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08b_parent_identity_adjudication_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.lane === 'parent_identity_mismatch_same_number');
const live = await loadLiveParents();
const rows = live.available ? classifyRows({ sourceRows, liveParents: live.rows }) : [];
const byLane = countBy(rows, (row) => row.adjudication_lane);
const topSetsByLane = {};
for (const lane of Object.keys(byLane)) {
  topSetsByLane[lane] = Object.entries(countBy(rows.filter((row) => row.adjudication_lane === lane), (row) => row.set_key))
    .slice(0, 20)
    .map(([key, count]) => ({ key, count }));
}
const byIdentityPattern = countBy(rows, (row) => row.identity_pattern);
const topSetsByIdentityPattern = {};
for (const pattern of Object.keys(byIdentityPattern)) {
  topSetsByIdentityPattern[pattern] = Object.entries(countBy(rows.filter((row) => row.identity_pattern === pattern), (row) => row.set_key))
    .slice(0, 20)
    .map(([key, count]) => ({ key, count }));
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08b_parent_identity_adjudication_v1',
  package_id: 'PKG-08B-PARENT-IDENTITY-ADJUDICATION',
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  live_read: {
    available: live.available,
    reason: live.reason,
    live_parent_rows_read: live.rows.length,
  },
  summary: {
    source_rows: sourceRows.length,
    adjudicated_rows: rows.length,
    by_adjudication_lane: byLane,
    top_sets_by_lane: topSetsByLane,
    by_identity_pattern: byIdentityPattern,
    top_sets_by_identity_pattern: topSetsByIdentityPattern,
    target_finish_present_on_same_number_candidate: rows.filter((row) => row.same_number_candidate_has_target_finish).length,
    vault_referenced_rows: rows.filter((row) => row.same_number_candidates.some((candidate) => candidate.vault_item_count > 0)).length,
  },
  rows,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  summary: report.summary,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
