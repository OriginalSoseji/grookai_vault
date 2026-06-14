import crypto from 'node:crypto';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
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
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08f_missing_parent_strategy_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08f_missing_parent_strategy_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08f_missing_parent_strategy_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08F-MISSING-PARENT-STRATEGY';

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
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function topEntries(counts, limit = 20) {
  return Object.entries(counts).slice(0, limit).map(([key, count]) => ({ key, count }));
}

function tcgdexExternalId(row) {
  for (const url of row.evidence_urls ?? []) {
    const match = String(url).match(/api\.tcgdex\.net\/v2\/en\/cards\/([^/?#]+)/i);
    if (match?.[1]) return match[1];
  }
  return null;
}

function liveNumbers(row) {
  return [...new Set([
    row.card_number,
    row.number,
    row.number_plain,
  ].filter((value) => value !== null && value !== undefined && String(value).trim()).map(normalizeNumber))];
}

async function loadLiveContext(rows) {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable', sets: [], parents: [], mappings: [] };

  const aliases = [...new Set(rows.flatMap((row) => row.set_aliases_checked ?? [row.set_key]).map(normalizeText))];
  const externalIds = [...new Set(rows.map(tcgdexExternalId).filter(Boolean))];
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const sets = await client.query(
      `select id::text as set_id, code, name
       from public.sets
       where game = 'pokemon'
         and lower(coalesce(code, '')) = any($1::text[])
       order by code, id`,
      [aliases],
    );
    const parents = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_id::text,
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
           from public.external_mappings em
           where em.card_print_id = cp.id
         ), 0) as external_mapping_count,
         coalesce((
           select count(*)::int
           from public.vault_items vi
           where vi.card_id = cp.id
         ), 0) as vault_item_count
       from public.card_prints cp
       where lower(coalesce(cp.set_code, '')) = any($1::text[])
       order by cp.set_code, cp.number, cp.name, cp.id`,
      [aliases],
    );
    const mappings = externalIds.length
      ? await client.query(
        `select
           em.id::text as external_mapping_id,
           em.source,
           em.external_id,
           em.card_print_id::text,
           cp.set_code,
           coalesce(cp.number_plain, cp.number) as card_number,
           cp.number,
           cp.number_plain,
           cp.name
         from public.external_mappings em
         left join public.card_prints cp on cp.id = em.card_print_id
         where em.source = 'tcgdex'
           and em.external_id = any($1::text[])
         order by em.external_id, em.id`,
        [externalIds],
      )
      : { rows: [] };
    await client.query('rollback');
    return {
      available: true,
      reason: null,
      sets: sets.rows,
      parents: parents.rows,
      mappings: mappings.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, sets: [], parents: [], mappings: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function classifyRows({ sourceRows, live }) {
  const setsByAlias = new Map(live.sets.map((row) => [normalizeText(row.code), row]));
  const parentsByAlias = new Map();
  for (const parent of live.parents) {
    const key = normalizeText(parent.set_code);
    if (!parentsByAlias.has(key)) parentsByAlias.set(key, []);
    parentsByAlias.get(key).push(parent);
  }
  const mappingsByExternalId = new Map();
  for (const mapping of live.mappings) {
    if (!mappingsByExternalId.has(mapping.external_id)) mappingsByExternalId.set(mapping.external_id, []);
    mappingsByExternalId.get(mapping.external_id).push(mapping);
  }

  return sourceRows.map((row) => {
    const aliases = (row.set_aliases_checked ?? [row.set_key]).map(normalizeText);
    const matchedSetAlias = aliases.find((alias) => setsByAlias.has(alias)) ?? null;
    const externalId = tcgdexExternalId(row);
    const sameSetParents = aliases.flatMap((alias) => parentsByAlias.get(alias) ?? []);
    const sameNumberParents = sameSetParents.filter((parent) => liveNumbers(parent).includes(normalizeNumber(row.card_number)));
    const exactNameParents = sameNumberParents.filter((parent) => normalizeText(parent.name) === normalizeText(row.card_name));
    const mappingCollisions = externalId ? mappingsByExternalId.get(externalId) ?? [] : [];

    let strategy_lane = 'true_parent_insert_candidate';
    let recommended_next_action = 'Eligible for a guarded parent+child insert dry-run package if grouped with other non-colliding rows.';
    let exclusion_reason = null;

    if (!matchedSetAlias) {
      strategy_lane = 'blocked_live_set_alias_not_resolved';
      exclusion_reason = 'No live set row matched the Master Index aliases.';
      recommended_next_action = 'Resolve set alias or create a missing-set package before parent insert.';
    } else if (exactNameParents.length > 0) {
      strategy_lane = 'stale_or_child_only_recheck';
      exclusion_reason = 'An exact parent now exists; this row should be reclassified through child-only readiness.';
      recommended_next_action = 'Regenerate remaining-missing lanes and return exact parent rows to child-only checks.';
    } else if (sameNumberParents.length > 0) {
      strategy_lane = 'blocked_same_number_identity_adjudication';
      exclusion_reason = 'Live parent rows share set + number but have a different name.';
      recommended_next_action = 'Resolve card identity before any insert, update, or merge.';
    } else if (mappingCollisions.length > 0) {
      strategy_lane = 'blocked_external_mapping_collision';
      exclusion_reason = 'TCGdex external mapping already points at another card_print row.';
      recommended_next_action = 'Adjudicate the mapped parent before inserting a new parent or moving the mapping.';
    } else if (!externalId) {
      strategy_lane = 'candidate_without_tcgdex_mapping';
      exclusion_reason = 'No TCGdex card external ID was found in evidence URLs.';
      recommended_next_action = 'Can be considered only if another stable external mapping/provenance strategy is approved.';
    }

    return {
      strategy_lane,
      recommended_next_action,
      exclusion_reason,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      source_count: row.source_count,
      matched_set_alias: matchedSetAlias,
      tcgdex_external_id: externalId,
      same_number_parent_count: sameNumberParents.length,
      exact_name_parent_count: exactNameParents.length,
      external_mapping_collision_count: mappingCollisions.length,
      same_number_parents: sameNumberParents.slice(0, 8).map((parent) => ({
        card_print_id: parent.card_print_id,
        set_code: parent.set_code,
        number: parent.number,
        number_plain: parent.number_plain,
        name: parent.name,
        rarity: parent.rarity,
        finishes: parent.finishes,
        external_mapping_count: parent.external_mapping_count,
        vault_item_count: parent.vault_item_count,
      })),
      external_mapping_collisions: mappingCollisions.map((mapping) => ({
        external_mapping_id: mapping.external_mapping_id,
        source: mapping.source,
        external_id: mapping.external_id,
        card_print_id: mapping.card_print_id,
        set_code: mapping.set_code,
        number: mapping.number,
        number_plain: mapping.number_plain,
        name: mapping.name,
      })),
      sources: row.sources ?? [],
      evidence_urls: row.evidence_urls ?? [],
    };
  });
}

function renderMarkdown(report) {
  const laneRows = Object.entries(report.summary.by_strategy_lane).map(([lane, count]) => [
    lane,
    count,
    report.summary.top_sets_by_strategy_lane[lane]?.map((row) => `${row.key}:${row.count}`).slice(0, 10).join(', ') ?? '',
  ]);
  const nextRows = report.recommended_next_packages.map((row) => [
    row.package_id,
    row.scope,
    row.candidate_rows,
    row.allowed_write_shape,
    row.status,
  ]);
  return `# PKG-08F Missing Parent Strategy V1

Read-only strategy report for remaining Master Index rows in \`missing_parent_in_existing_set\`.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- package_id: ${report.package_id}
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- source_rows: ${report.summary.source_rows}
- classified_rows: ${report.summary.classified_rows}
- true_parent_insert_candidates: ${report.summary.true_parent_insert_candidates}
- blocked_or_recheck_rows: ${report.summary.blocked_or_recheck_rows}

${markdownTable(['strategy_lane', 'rows', 'top_sets'], laneRows)}

## Recommended Next Packages

${markdownTable(['package_id', 'scope', 'candidate_rows', 'allowed_write_shape', 'status'], nextRows)}

## Guardrails

- This report is not insertion authority by itself.
- External mapping collisions are blocked from parent insert packages.
- Same-number identity mismatches require identity adjudication before writes.
- Rows without a stable external ID need an approved provenance strategy before any insert.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08F Missing Parent Strategy Checkpoint V1](20260610_pkg08f_missing_parent_strategy_checkpoint_v1.md) | Read-only strategy for missing parents in existing sets; separates true parent insert candidates from mapping and identity blockers. No writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08f_missing_parent_strategy_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08f_missing_parent_strategy_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.lane === 'missing_parent_in_existing_set');
const live = await loadLiveContext(sourceRows);
const rows = live.available ? classifyRows({ sourceRows, live }) : [];
const byStrategyLane = countBy(rows, (row) => row.strategy_lane);
const topSetsByStrategyLane = {};
for (const lane of Object.keys(byStrategyLane)) {
  topSetsByStrategyLane[lane] = topEntries(countBy(rows.filter((row) => row.strategy_lane === lane), (row) => row.set_key), 20);
}

const trueParentInsertCandidates = rows.filter((row) => row.strategy_lane === 'true_parent_insert_candidate');
const recommendedNextPackages = [
  {
    package_id: 'PKG-08G',
    scope: 'true_parent_insert_candidate',
    candidate_rows: trueParentInsertCandidates.length,
    allowed_write_shape: 'parent inserts + child inserts + tcgdex external mappings only',
    status: trueParentInsertCandidates.length > 0 ? 'ready_for_guarded_dry_run_preparation' : 'blocked_no_candidates',
  },
  {
    package_id: 'PKG-08H',
    scope: 'blocked_external_mapping_collision',
    candidate_rows: byStrategyLane.blocked_external_mapping_collision ?? 0,
    allowed_write_shape: 'read-only adjudication first',
    status: 'blocked_until_mapping_adjudication',
  },
  {
    package_id: 'PKG-08I',
    scope: 'blocked_same_number_identity_adjudication',
    candidate_rows: byStrategyLane.blocked_same_number_identity_adjudication ?? 0,
    allowed_write_shape: 'read-only identity strategy first',
    status: 'blocked_until_identity_adjudication',
  },
];

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08f_missing_parent_strategy_v1',
  package_id: PACKAGE_ID,
  package_fingerprint_sha256: sha256(stableJson({
    package_id: PACKAGE_ID,
    source_rows: sourceRows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      tcgdex_external_id: tcgdexExternalId(row),
    })),
  })),
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  live_read: {
    available: live.available,
    reason: live.reason,
    live_sets_read: live.sets.length,
    live_parents_read: live.parents.length,
    live_tcgdex_mappings_read: live.mappings.length,
  },
  summary: {
    source_rows: sourceRows.length,
    classified_rows: rows.length,
    by_strategy_lane: byStrategyLane,
    top_sets_by_strategy_lane: topSetsByStrategyLane,
    true_parent_insert_candidates: trueParentInsertCandidates.length,
    blocked_or_recheck_rows: rows.length - trueParentInsertCandidates.length,
    by_finish_for_true_parent_insert_candidates: countBy(trueParentInsertCandidates, (row) => row.finish_key),
    by_set_for_true_parent_insert_candidates: countBy(trueParentInsertCandidates, (row) => row.set_key),
  },
  recommended_next_packages: recommendedNextPackages,
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
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  summary: report.summary,
  recommended_next_packages: report.recommended_next_packages,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
