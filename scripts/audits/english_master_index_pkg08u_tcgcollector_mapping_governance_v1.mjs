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
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08s_non_tcgdex_parent_insert_readiness_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08u_tcgcollector_mapping_governance_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08u_tcgcollector_mapping_governance_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08u_tcgcollector_mapping_governance_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08U-TCGCOLLECTOR-MAPPING-GOVERNANCE';
const SOURCE_READINESS_FINGERPRINT = '17432e7255bad914984b5caf33b8a2fa0c3701edb907ddd55a5be0fac5b0f5ed';

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

async function loadSourceCollisions(rows) {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable', rows: [] };
  const pairs = rows
    .map((row) => row.preferred_external_mapping)
    .filter((row) => row?.source && row?.external_id)
    .map((row) => ({ source: row.source, external_id: row.external_id }));

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

function classifyRows(sourceRows, collisionRows) {
  const collisionByKey = new Map();
  for (const row of collisionRows) {
    const key = `${normalizeText(row.source)}|${String(row.external_id ?? '').trim()}`;
    if (!collisionByKey.has(key)) collisionByKey.set(key, []);
    collisionByKey.get(key).push(row);
  }

  return sourceRows.map((row) => {
    const mapping = row.preferred_external_mapping;
    const key = `${normalizeText(mapping?.source)}|${String(mapping?.external_id ?? '').trim()}`;
    const collisions = collisionByKey.get(key) ?? [];
    const hasExactTcgCollectorCardUrl = mapping?.source === 'tcgcollector'
      && /^\d+$/.test(String(mapping.external_id ?? ''))
      && /^https:\/\/www\.tcgcollector\.com\/cards\/\d+\//i.test(String(mapping.source_url ?? ''));
    const hasRequiredSecondSource = (row.sources ?? []).includes('thepricedex_price_list');
    const hasKnownFixtureLane = (row.sources ?? []).includes('tcgcollector_card_variants');

    let governance_status = 'blocked_source_not_governed_for_mapping';
    let mapping_governance = 'blocked';
    let recommended_next_action = 'Do not use this source as an external mapping carrier yet.';

    if (mapping?.source === 'tcgcollector') {
      if (collisions.length) {
        governance_status = 'blocked_existing_source_mapping_collision';
        recommended_next_action = 'Adjudicate existing source/external_id ownership before any parent insert.';
      } else if (hasExactTcgCollectorCardUrl && hasRequiredSecondSource && hasKnownFixtureLane) {
        governance_status = 'governed_mapping_carrier_ready_for_dry_run';
        mapping_governance = 'tcgcollector_exact_card_id_allowed_for_pkg08v_parent_insert_only';
        recommended_next_action = 'Eligible for guarded parent+child insert dry-run using tcgcollector exact card ID as mapping carrier.';
      } else {
        governance_status = 'blocked_tcgcollector_exactness_gap';
        recommended_next_action = 'Require exact TCGCollector numeric card page plus second source before using as mapping carrier.';
      }
    } else if (mapping?.source === 'bulbapedia') {
      governance_status = 'blocked_reference_source_not_mapping_carrier';
      mapping_governance = 'reference_only';
      recommended_next_action = 'Keep Bulbapedia as evidence only; acquire a stable product/card external ID before parent insert.';
    }

    return {
      governance_status,
      mapping_governance,
      recommended_next_action,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      source_count: row.source_count,
      matched_set_alias: row.matched_set_alias,
      preferred_external_mapping: mapping,
      source_mapping_collisions: collisions,
      sources: row.sources ?? [],
      evidence_urls: row.evidence_urls ?? [],
    };
  });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# PKG-08U TCGCollector Mapping Governance V1');
  lines.push('');
  lines.push('No-write governance report for PKG-08S rows blocked only because their exact source carrier was not previously approved for parent insert provenance.');
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
  lines.push(`- governed_mapping_carrier_ready_for_dry_run: ${report.summary.governed_mapping_carrier_ready_for_dry_run}`);
  lines.push(`- blocked_reference_source_not_mapping_carrier: ${report.summary.blocked_reference_source_not_mapping_carrier}`);
  lines.push('');
  lines.push(markdownTable(
    ['governance_status', 'rows', 'top_sets'],
    Object.entries(report.summary.by_governance_status).map(([status, count]) => [
      status,
      count,
      report.summary.top_sets_by_governance_status[status]?.map((item) => `${item.key}:${item.count}`).join(', ') ?? '',
    ]),
  ));
  lines.push('');
  lines.push('## Governance Decision');
  lines.push('');
  lines.push('- `tcgcollector` numeric card page IDs are approved for a guarded dry-run package only when the row has exact TCGCollector card URL evidence and an independent ThePriceDex set/list source.');
  lines.push('- `bulbapedia` remains reference evidence only in this lane because page titles are not stable Grookai external mapping IDs for the missing MEP promo parent rows.');
  lines.push('- This report is not write authority. It only permits preparing a rollback-only dry-run package for governed rows.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const sourceRows = (source.rows ?? []).filter((row) => row.readiness_status === 'blocked_mapping_source_governance_required');
  const collisionRead = await loadSourceCollisions(sourceRows);
  const rows = classifyRows(sourceRows, collisionRead.rows);
  const readyRows = rows.filter((row) => row.governance_status === 'governed_mapping_carrier_ready_for_dry_run');

  const byStatus = countBy(rows, (row) => row.governance_status);
  const topSetsByStatus = {};
  for (const status of Object.keys(byStatus)) {
    topSetsByStatus[status] = topEntries(countBy(rows.filter((row) => row.governance_status === status), (row) => row.set_key));
  }
  const summary = {
    source_rows: sourceRows.length,
    classified_rows: rows.length,
    by_governance_status: byStatus,
    top_sets_by_governance_status: topSetsByStatus,
    governed_mapping_carrier_ready_for_dry_run: readyRows.length,
    blocked_reference_source_not_mapping_carrier: byStatus.blocked_reference_source_not_mapping_carrier ?? 0,
    blocked_existing_source_mapping_collision: byStatus.blocked_existing_source_mapping_collision ?? 0,
    ready_rows_by_set: countBy(readyRows, (row) => row.set_key),
    ready_rows_by_finish: countBy(readyRows, (row) => row.finish_key),
    ready_rows_by_mapping_source: countBy(readyRows, (row) => row.preferred_external_mapping?.source ?? 'none'),
  };
  const fingerprintPayload = {
    package_id: PACKAGE_ID,
    source_readiness_fingerprint: source.package_fingerprint_sha256,
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
    version: 'english_master_index_pkg08u_tcgcollector_mapping_governance_v1',
    package_id: PACKAGE_ID,
    source_readiness_fingerprint_sha256: source.package_fingerprint_sha256 ?? null,
    expected_source_readiness_fingerprint_sha256: SOURCE_READINESS_FINGERPRINT,
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
    summary,
    recommended_next_package: {
      package_id: 'PKG-08V',
      scope: 'governed_mapping_carrier_ready_for_dry_run',
      candidate_rows: readyRows.length,
      allowed_write_shape: 'parent inserts + child inserts + tcgcollector external_mappings only',
      status: readyRows.length ? 'ready_for_guarded_dry_run_preparation' : 'blocked_no_candidates',
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeText(CHECKPOINT_MD, renderMarkdown(report));

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
