import crypto from 'node:crypto';
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
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg12_parent_identity_mismatch_strategy_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg12_parent_identity_mismatch_strategy_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg12_parent_identity_mismatch_strategy_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-12-PARENT-IDENTITY-MISMATCH-STRATEGY';

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
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function topEntries(counts, limit = 20) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0])))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function foldText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function displayNameComparable(value) {
  const raw = foldText(value)
    .replaceAll('α', 'alpha')
    .replaceAll('β', 'beta')
    .replaceAll('γ', 'gamma')
    .replaceAll('δ', 'delta');
  return normalizeText(raw)
    .replace(/\bimposter\b/g, 'impostor')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function eliteFourComparable(value) {
  return displayNameComparable(value).replace(/\s+4$/, ' e4');
}

function plainNumber(value) {
  return normalizeNumber(value).replace(/[^0-9]/g, '');
}

function rowHasPlainNumericNumber(row) {
  return /^[0-9]+$/.test(normalizeNumber(row.card_number));
}

function parentNumbers(parent) {
  return [...new Set([
    parent.card_number,
    parent.number,
    parent.number_plain,
  ].filter((value) => value !== null && value !== undefined && String(value).trim()).map(normalizeNumber))];
}

function candidateHasFinish(candidate, finishKey) {
  return (candidate.finishes ?? []).map(normalizeText).includes(normalizeText(finishKey));
}

function candidateIsPrefixCollision(row, candidate) {
  if (!rowHasPlainNumericNumber(row)) return false;
  const number = String(candidate.number ?? '').trim();
  const numberPlain = String(candidate.number_plain ?? '').trim();
  const modifier = String(candidate.printed_identity_modifier ?? '').trim();
  if (modifier.startsWith('number_prefix:')) return true;
  if (number && normalizeNumber(number) !== normalizeNumber(row.card_number) && plainNumber(number) === plainNumber(row.card_number)) return true;
  if (numberPlain && normalizeNumber(numberPlain) === normalizeNumber(row.card_number) && /[a-z]/i.test(number)) return true;
  return false;
}

function extractExternalIds(row) {
  const ids = [];
  for (const url of row.evidence_urls ?? []) {
    const text = String(url ?? '');
    let match = text.match(/api\.pokemontcg\.io\/v2\/cards\/([^/?#]+)/i);
    if (match?.[1]) ids.push({ source: 'pokemonapi', external_id: decodeURIComponent(match[1]), source_url: text });
    match = text.match(/api\.tcgdex\.net\/v2\/en\/cards\/([^/?#]+)/i);
    if (match?.[1]) ids.push({ source: 'tcgdex', external_id: decodeURIComponent(match[1]), source_url: text });
    match = text.match(/tcgplayer\.com\/product\/(\d+)/i);
    if (match?.[1]) ids.push({ source: 'tcgplayer', external_id: match[1], source_url: text });
  }
  const seen = new Set();
  return ids.filter((id) => {
    const key = `${id.source}|${id.external_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
         cp.set_id::text as set_id,
         cp.set_code,
         coalesce(cp.number_plain, cp.number) as card_number,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.rarity,
         cp.variant_key,
         cp.printed_identity_modifier,
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
           select jsonb_agg(jsonb_build_object('source', em.source, 'external_id', em.external_id) order by em.source, em.external_id)
           from public.external_mappings em
           where em.card_print_id = cp.id
         ), '[]'::jsonb) as external_mappings,
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

function liveCandidatesFor(row, liveParents) {
  const aliases = new Set((row.set_aliases_checked ?? [row.set_key]).map(normalizeText));
  return liveParents.filter((parent) => (
    aliases.has(normalizeText(parent.set_code))
    && parentNumbers(parent).includes(normalizeNumber(row.card_number))
  ));
}

function classifyRow(row, candidates) {
  const targetFinishPresent = candidates.some((candidate) => candidateHasFinish(candidate, row.finish_key));
  const prefixCandidates = candidates.filter((candidate) => candidateIsPrefixCollision(row, candidate));
  const nonPrefixCandidates = candidates.filter((candidate) => !candidateIsPrefixCollision(row, candidate));
  const master = displayNameComparable(row.card_name);
  const eliteMaster = eliteFourComparable(row.card_name);
  const exactDisplayCandidates = candidates.filter((candidate) => displayNameComparable(candidate.name) === master);
  const eliteFourCandidates = candidates.filter((candidate) => eliteFourComparable(candidate.name) === eliteMaster);

  let strategy_status = 'blocked_manual_identity_review';
  let strategy_lane = 'blocked';
  let recommended_next_action = 'Keep blocked until exact identity can be adjudicated.';
  let safety_reason = 'Same set+number exists with a non-equivalent live parent name.';

  if (candidates.length === 0) {
    strategy_status = 'blocked_no_live_same_number_candidate';
    strategy_lane = 'blocked';
    safety_reason = 'No live same-number parent candidate exists after the latest reconciliation refresh.';
  } else if (prefixCandidates.length === candidates.length && exactDisplayCandidates.length === 0) {
    strategy_status = 'prefix_collision_true_parent_insert_candidate';
    strategy_lane = 'parent_insert_candidate';
    recommended_next_action = 'Prepare guarded parent+child insert dry-run; existing same-number parents are prefix/subset identities and must remain untouched.';
    safety_reason = 'All live same-number candidates carry a number prefix or printed identity modifier, while the Master Index row is an unprefixed checklist card.';
  } else if (exactDisplayCandidates.length === 1) {
    const candidate = exactDisplayCandidates[0];
    if (candidateHasFinish(candidate, row.finish_key)) {
      strategy_status = 'display_alias_existing_finish_governance';
      strategy_lane = 'identity_alias_suppression';
      recommended_next_action = 'Suppress from missing queue through governed display alias; no write needed for this row.';
      safety_reason = 'The live parent is equivalent after accent/punctuation normalization and already has the target child finish.';
    } else {
      strategy_status = 'display_alias_child_finish_insert_candidate';
      strategy_lane = 'child_insert_candidate';
      recommended_next_action = 'Prepare guarded child-only insert dry-run on the existing equivalent live parent.';
      safety_reason = 'The live parent is equivalent after accent/punctuation normalization but is missing the target child finish.';
    }
  } else if (eliteFourCandidates.length === 1 && normalizeText(row.set_key) === 'pl2') {
    const candidate = eliteFourCandidates[0];
    if (candidateHasFinish(candidate, row.finish_key)) {
      strategy_status = 'elite_four_alias_existing_finish_governance';
      strategy_lane = 'identity_alias_suppression';
      recommended_next_action = 'Suppress from missing queue through governed Rising Rivals Elite Four notation alias; no write needed for this row.';
      safety_reason = 'Rising Rivals uses E4 notation in Grookai and 4 notation in source labels; target finish already exists.';
    } else {
      strategy_status = 'elite_four_alias_child_finish_insert_candidate';
      strategy_lane = 'child_insert_candidate';
      recommended_next_action = 'Prepare guarded child-only insert dry-run only after the E4/4 alias rule is accepted.';
      safety_reason = 'Rising Rivals E4/4 notation appears equivalent, but the target finish is missing.';
    }
  } else if (candidates.length > 1) {
    strategy_status = 'blocked_multiple_same_number_candidates';
    strategy_lane = 'blocked';
    safety_reason = 'Multiple same-number candidates exist; exact target parent cannot be selected automatically.';
  } else if (nonPrefixCandidates.length === 1) {
    const live = displayNameComparable(nonPrefixCandidates[0].name);
    const nameHasVariantSuffixConflict = /\s(g|c|gl|fb|m|sp)$/i.test(` ${row.card_name}`) || /\s(g|c|gl|fb|m|sp)$/i.test(` ${nonPrefixCandidates[0].name}`);
    if (nameHasVariantSuffixConflict || master !== live) {
      strategy_status = 'blocked_name_suffix_or_true_identity_conflict';
      strategy_lane = 'blocked';
      safety_reason = 'The mismatch appears to distinguish different printed card identities, not a display alias.';
    }
  }

  return {
    strategy_lane,
    strategy_status,
    recommended_next_action,
    safety_reason,
    target_finish_present: targetFinishPresent,
    extracted_external_ids: extractExternalIds(row),
    live_same_number_candidate_count: candidates.length,
    prefix_collision_candidate_count: prefixCandidates.length,
    non_prefix_candidate_count: nonPrefixCandidates.length,
    live_same_number_candidates: candidates.map((candidate) => ({
      card_print_id: candidate.card_print_id,
      set_code: candidate.set_code,
      number: candidate.number,
      number_plain: candidate.number_plain,
      name: candidate.name,
      rarity: candidate.rarity,
      variant_key: candidate.variant_key,
      printed_identity_modifier: candidate.printed_identity_modifier,
      finishes: candidate.finishes,
      child_count: candidate.child_count,
      external_mappings: candidate.external_mappings,
      vault_item_count: candidate.vault_item_count,
      is_prefix_collision: candidateIsPrefixCollision(row, candidate),
      has_target_finish: candidateHasFinish(candidate, row.finish_key),
    })),
  };
}

function renderMarkdown(report) {
  const laneRows = Object.entries(report.summary.by_strategy_lane).map(([lane, count]) => [
    lane,
    count,
    (report.summary.top_sets_by_strategy_lane[lane] ?? []).map((row) => `${row.key}:${row.count}`).join(', '),
  ]);
  const statusRows = Object.entries(report.summary.by_strategy_status).map(([status, count]) => [
    status,
    count,
    (report.summary.top_sets_by_strategy_status[status] ?? []).map((row) => `${row.key}:${row.count}`).join(', '),
  ]);
  const nextPackageRows = [
    ['PKG-12A', 'prefix_collision_true_parent_insert_candidate', report.summary.by_strategy_status.prefix_collision_true_parent_insert_candidate ?? 0, 'Guarded parent+child insert dry-run only; preserve prefix/subset parents.'],
    ['PKG-12B', 'display_alias_child_finish_insert_candidate', report.summary.by_strategy_status.display_alias_child_finish_insert_candidate ?? 0, 'Guarded child-only insert dry-run on equivalent display alias parents.'],
    ['PKG-12C', 'identity alias suppression', report.summary.identity_alias_suppression_ready, 'Governed reconciliation suppression only; no DB write needed.'],
    ['Blocked', 'manual/identity conflict', report.summary.blocked_rows, 'Do not apply until exact identity is proven.'],
  ];

  return `# PKG-12 Parent Identity Mismatch Strategy V1

Read-only strategy for the remaining same-number parent identity mismatches in the English Master Index reconciliation queue.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- source_rows: ${report.summary.source_rows}
- strategy_rows: ${report.summary.strategy_rows}
- fingerprint: \`${report.fingerprint}\`
- live_parent_rows_read: ${report.live_read.live_parent_rows_read}

${markdownTable(['strategy_lane', 'rows', 'top_sets'], laneRows)}

## Status Detail

${markdownTable(['strategy_status', 'rows', 'top_sets'], statusRows)}

## Recommended Next Packages

${markdownTable(['package', 'scope', 'rows', 'guardrail'], nextPackageRows)}

## Guardrails

- Prefix/subset parents must remain untouched when inserting unprefixed base checklist parents.
- Display aliases can only create child printings when the normalized parent identity is equivalent and the target finish is missing.
- Existing-finish alias rows should be suppressed from reconciliation, not written.
- PL4-style true-name conflicts remain blocked.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-12 Parent Identity Mismatch Strategy Checkpoint V1](20260610_pkg12_parent_identity_mismatch_strategy_checkpoint_v1.md) | Read-only strategy for 46 remaining same-number/name-mismatch rows; scopes prefix-collision inserts, display-alias child inserts, alias suppression, and blocked identity conflicts. No writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg12_parent_identity_mismatch_strategy_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg12_parent_identity_mismatch_strategy_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.lane === 'parent_identity_mismatch_same_number');
const live = await loadLiveParents();
const rows = live.available
  ? sourceRows.map((row) => {
    const candidates = liveCandidatesFor(row, live.rows);
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      source_count: row.source_count,
      sources: row.sources ?? [],
      evidence_urls: row.evidence_urls ?? [],
      ...classifyRow(row, candidates),
    };
  })
  : [];

const byStrategyLane = countBy(rows, (row) => row.strategy_lane);
const byStrategyStatus = countBy(rows, (row) => row.strategy_status);
const topSetsByStrategyLane = Object.fromEntries(Object.keys(byStrategyLane).map((lane) => [
  lane,
  topEntries(countBy(rows.filter((row) => row.strategy_lane === lane), (row) => row.set_key)),
]));
const topSetsByStrategyStatus = Object.fromEntries(Object.keys(byStrategyStatus).map((status) => [
  status,
  topEntries(countBy(rows.filter((row) => row.strategy_status === status), (row) => row.set_key)),
]));

const fingerprintPayload = rows.map((row) => ({
  set_key: row.set_key,
  card_number: row.card_number,
  card_name: row.card_name,
  finish_key: row.finish_key,
  strategy_status: row.strategy_status,
  live_candidates: row.live_same_number_candidates.map((candidate) => ({
    card_print_id: candidate.card_print_id,
    number: candidate.number,
    number_plain: candidate.number_plain,
    name: candidate.name,
    printed_identity_modifier: candidate.printed_identity_modifier,
    finishes: candidate.finishes,
  })),
}));

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg12_parent_identity_mismatch_strategy_v1',
  package_id: PACKAGE_ID,
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
  fingerprint: sha256(stableJson(fingerprintPayload)),
  summary: {
    source_rows: sourceRows.length,
    strategy_rows: rows.length,
    by_strategy_lane: byStrategyLane,
    by_strategy_status: byStrategyStatus,
    top_sets_by_strategy_lane: topSetsByStrategyLane,
    top_sets_by_strategy_status: topSetsByStrategyStatus,
    parent_insert_candidate_rows: rows.filter((row) => row.strategy_lane === 'parent_insert_candidate').length,
    child_insert_candidate_rows: rows.filter((row) => row.strategy_lane === 'child_insert_candidate').length,
    identity_alias_suppression_ready: rows.filter((row) => row.strategy_lane === 'identity_alias_suppression').length,
    blocked_rows: rows.filter((row) => row.strategy_lane === 'blocked').length,
    vault_referenced_candidate_rows: rows.filter((row) => row.live_same_number_candidates.some((candidate) => candidate.vault_item_count > 0)).length,
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
  fingerprint: report.fingerprint,
  summary: report.summary,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
