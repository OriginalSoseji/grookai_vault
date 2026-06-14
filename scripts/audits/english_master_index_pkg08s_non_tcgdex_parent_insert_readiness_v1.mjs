import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08f_missing_parent_strategy_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08s_non_tcgdex_parent_insert_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08s_non_tcgdex_parent_insert_readiness_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08s_non_tcgdex_parent_insert_readiness_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08S-NON-TCGDEX-PARENT-INSERT-READINESS';
const EXISTING_MAPPING_SOURCES_ALLOWED_FOR_INSERT = new Set(['pokemonapi', 'tcgplayer']);
const GOVERNANCE_REQUIRED_SOURCES = new Set(['tcgcollector', 'cardtrader', 'bulbapedia']);

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
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function topEntries(counts, limit = 20) {
  return Object.entries(counts)
    .sort((left, right) => Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0])))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function uniqueBySourceExternal(ids) {
  const seen = new Set();
  const result = [];
  for (const id of ids) {
    const key = `${normalizeText(id.source)}|${String(id.external_id ?? '').trim()}`;
    if (!id.external_id || seen.has(key)) continue;
    seen.add(key);
    result.push(id);
  }
  return result;
}

function extractExternalIds(row) {
  const ids = [];
  for (const url of row.evidence_urls ?? []) {
    const text = String(url ?? '');
    let match = text.match(/api\.pokemontcg\.io\/v2\/cards\/([^/?#]+)/i);
    if (match?.[1]) ids.push({ source: 'pokemonapi', external_id: decodeURIComponent(match[1]), source_url: text });

    match = text.match(/tcgplayer\.com\/product\/(\d+)/i);
    if (match?.[1]) ids.push({ source: 'tcgplayer', external_id: match[1], source_url: text });

    match = text.match(/tcgcollector\.com\/cards\/(\d+)/i);
    if (match?.[1]) ids.push({ source: 'tcgcollector', external_id: match[1], source_url: text });

    match = text.match(/cardtrader\.com\/en\/cards\/(\d+)/i);
    if (match?.[1]) ids.push({ source: 'cardtrader', external_id: match[1], source_url: text });

    match = text.match(/bulbapedia\.bulbagarden\.net\/wiki\/([^/?#]+)/i);
    if (match?.[1]) ids.push({ source: 'bulbapedia', external_id: decodeURIComponent(match[1]), source_url: text });
  }
  return uniqueBySourceExternal(ids);
}

async function loadMappingCollisions(sourceIds) {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable', rows: [] };

  const pairs = uniqueBySourceExternal(sourceIds).map((item) => ({
    source: item.source,
    external_id: item.external_id,
  }));
  if (!pairs.length) return { available: true, reason: null, rows: [] };

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `with target as (
         select *
         from jsonb_to_recordset($1::jsonb) as t(source text, external_id text)
       )
       select
         em.id::text as external_mapping_id,
         em.source,
         em.external_id,
         em.card_print_id::text,
         cp.set_code,
         coalesce(cp.number_plain, cp.number) as card_number,
         cp.name
       from public.external_mappings em
       join target t on t.source = em.source and t.external_id = em.external_id
       left join public.card_prints cp on cp.id = em.card_print_id
       order by em.source, em.external_id, em.id`,
      [JSON.stringify(pairs)],
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

function classifyRows(rows, collisions) {
  const collisionByKey = new Map();
  for (const row of collisions) {
    const key = `${normalizeText(row.source)}|${String(row.external_id ?? '').trim()}`;
    if (!collisionByKey.has(key)) collisionByKey.set(key, []);
    collisionByKey.get(key).push(row);
  }

  return rows.map((row) => {
    const extracted_external_ids = extractExternalIds(row);
    const existing_source_ids = extracted_external_ids.filter((id) => EXISTING_MAPPING_SOURCES_ALLOWED_FOR_INSERT.has(id.source));
    const governance_source_ids = extracted_external_ids.filter((id) => GOVERNANCE_REQUIRED_SOURCES.has(id.source));
    const collisions_for_existing_sources = existing_source_ids.flatMap((id) => (
      collisionByKey.get(`${normalizeText(id.source)}|${String(id.external_id).trim()}`) ?? []
    ));

    let readiness_status = 'blocked_no_stable_card_external_id';
    let recommended_next_action = 'Acquire exact card-level source ID before parent insert.';
    let preferred_external_mapping = null;

    if (collisions_for_existing_sources.length) {
      readiness_status = 'blocked_existing_external_mapping_collision';
      recommended_next_action = 'Adjudicate existing mapping target before insert.';
    } else if (existing_source_ids.length) {
      readiness_status = 'ready_for_non_tcgdex_parent_insert_dry_run';
      preferred_external_mapping = existing_source_ids[0];
      recommended_next_action = 'Eligible for a guarded parent+child insert dry-run using the preferred non-TCGdex mapping source.';
    } else if (governance_source_ids.length) {
      readiness_status = 'blocked_mapping_source_governance_required';
      preferred_external_mapping = governance_source_ids[0];
      recommended_next_action = 'Approve mapping-source governance before this source can carry inserted parent provenance.';
    }

    return {
      readiness_status,
      recommended_next_action,
      preferred_external_mapping,
      extracted_external_ids,
      existing_source_mapping_collisions: collisions_for_existing_sources,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      source_count: row.source_count,
      matched_set_alias: row.matched_set_alias,
      sources: row.sources ?? [],
      evidence_urls: row.evidence_urls ?? [],
      original_strategy_lane: row.strategy_lane,
    };
  });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# PKG-08S Non-TCGdex Parent Insert Readiness V1');
  lines.push('');
  lines.push('Read-only readiness report for `candidate_without_tcgdex_mapping` rows from PKG-08F.');
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- audit_only: true');
  lines.push('- db_writes_performed: false');
  lines.push('- migrations_created: false');
  lines.push('- cleanup_performed: false');
  lines.push('- quarantine_performed: false');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- package_id: ${report.package_id}`);
  lines.push(`- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\``);
  lines.push(`- source_rows: ${report.summary.source_rows}`);
  lines.push(`- ready_for_non_tcgdex_parent_insert_dry_run: ${report.summary.ready_for_non_tcgdex_parent_insert_dry_run}`);
  lines.push(`- blocked_mapping_source_governance_required: ${report.summary.blocked_mapping_source_governance_required}`);
  lines.push(`- blocked_no_stable_card_external_id: ${report.summary.blocked_no_stable_card_external_id}`);
  lines.push(`- blocked_existing_external_mapping_collision: ${report.summary.blocked_existing_external_mapping_collision}`);
  lines.push('');
  lines.push(markdownTable(
    ['readiness_status', 'rows', 'top_sets'],
    Object.entries(report.summary.by_readiness_status).map(([status, count]) => [
      status,
      count,
      report.summary.top_sets_by_readiness_status[status]?.map((item) => `${item.key}:${item.count}`).join(', ') ?? '',
    ]),
  ));
  lines.push('');
  lines.push('## Existing Mapping Sources Ready');
  lines.push('');
  lines.push(markdownTable(
    ['source', 'rows'],
    Object.entries(report.summary.ready_rows_by_preferred_source).map(([source, count]) => [source, count]),
  ));
  lines.push('');
  lines.push('## Guardrails');
  lines.push('');
  lines.push('- This report does not authorize writes.');
  lines.push('- Only `pokemonapi` and `tcgplayer` are treated as existing approved mapping carriers for the next dry-run.');
  lines.push('- TCGCollector, CardTrader, and Bulbapedia exact IDs remain blocked until mapping-source governance is explicitly approved.');
  lines.push('- Set-page-only evidence remains blocked from parent insertion.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const sourceRows = (source.rows ?? []).filter((row) => row.strategy_lane === 'candidate_without_tcgdex_mapping');
  const extracted = sourceRows.flatMap(extractExternalIds);
  const collisionRead = await loadMappingCollisions(extracted);
  const rows = classifyRows(sourceRows, collisionRead.rows);

  const byStatus = countBy(rows, (row) => row.readiness_status);
  const topSetsByStatus = {};
  for (const status of Object.keys(byStatus)) {
    topSetsByStatus[status] = topEntries(countBy(rows.filter((row) => row.readiness_status === status), (row) => row.set_key));
  }
  const readyRows = rows.filter((row) => row.readiness_status === 'ready_for_non_tcgdex_parent_insert_dry_run');
  const summary = {
    source_rows: sourceRows.length,
    classified_rows: rows.length,
    by_readiness_status: byStatus,
    top_sets_by_readiness_status: topSetsByStatus,
    ready_for_non_tcgdex_parent_insert_dry_run: readyRows.length,
    blocked_mapping_source_governance_required: byStatus.blocked_mapping_source_governance_required ?? 0,
    blocked_no_stable_card_external_id: byStatus.blocked_no_stable_card_external_id ?? 0,
    blocked_existing_external_mapping_collision: byStatus.blocked_existing_external_mapping_collision ?? 0,
    ready_rows_by_preferred_source: countBy(readyRows, (row) => row.preferred_external_mapping?.source ?? 'none'),
    ready_rows_by_set: countBy(readyRows, (row) => row.set_key),
  };

  const fingerprintPayload = {
    package_id: PACKAGE_ID,
    source_fingerprint: source.package_fingerprint_sha256,
    summary,
    ready_rows: readyRows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      preferred_external_mapping: row.preferred_external_mapping,
    })),
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08s_non_tcgdex_parent_insert_readiness_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    collision_read: {
      available: collisionRead.available,
      reason: collisionRead.reason,
      collision_rows: collisionRead.rows.length,
    },
    source_package_fingerprint_sha256: source.package_fingerprint_sha256,
    summary,
    recommended_next_package: {
      package_id: 'PKG-08T',
      scope: 'ready_for_non_tcgdex_parent_insert_dry_run',
      candidate_rows: readyRows.length,
      allowed_write_shape: 'parent inserts + child inserts + external_mappings for existing approved sources only',
      status: readyRows.length ? 'ready_for_guarded_dry_run_preparation' : 'blocked_no_candidates',
      blocked_governance_rows: summary.blocked_mapping_source_governance_required,
      blocked_no_stable_id_rows: summary.blocked_no_stable_card_external_id,
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeText(CHECKPOINT_MD, `# PKG-08S Non-TCGdex Parent Insert Readiness Checkpoint V1

- generated_at: ${report.generated_at}
- package_id: ${PACKAGE_ID}
- package_fingerprint_sha256: ${report.package_fingerprint_sha256}
- source_package_fingerprint_sha256: ${report.source_package_fingerprint_sha256}
- source_rows: ${summary.source_rows}
- ready_for_non_tcgdex_parent_insert_dry_run: ${summary.ready_for_non_tcgdex_parent_insert_dry_run}
- blocked_mapping_source_governance_required: ${summary.blocked_mapping_source_governance_required}
- blocked_no_stable_card_external_id: ${summary.blocked_no_stable_card_external_id}
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

Next safe step: prepare PKG-08T guarded dry-run for only ready rows using approved existing mapping sources.
`);

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
    checkpoint_md: CHECKPOINT_MD,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    summary,
    recommended_next_package: report.recommended_next_package,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
