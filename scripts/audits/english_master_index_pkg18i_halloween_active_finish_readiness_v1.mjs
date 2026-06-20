import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_JSON = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'pkg18h_pricecharting_halloween_active_finish_acquisition_v1', 'pkg18h_pricecharting_halloween_active_finish_acquisition_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg18i_halloween_active_finish_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg18i_halloween_active_finish_readiness_v1.md');

const PACKAGE_ID = 'PKG-18I-HALLOWEEN-ACTIVE-FINISH-READINESS';
const FUTURE_PACKAGE_ID = 'PKG-18J-HALLOWEEN-STAMPED-PARENT-INSERTS';

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

function uuidFromSeed(seed) {
  const hex = sha256(seed).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const raw = hex.join('');
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function sourceCandidates(sourceReport) {
  return (sourceReport.rows ?? [])
    .filter((row) => row.status === 'candidate_pricecharting_halloween_active_finish')
    .map((row) => {
      const numberKey = String(row.card_number ?? '').trim();
      const nameKey = normalizeText(row.card_name);
      const variantKey = row.variant_key;
      const finishKey = row.finish_key;
      return {
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        target_finish_key: finishKey,
        target_variant_key: variantKey,
        target_printed_identity_modifier: variantKey,
        stamp_label: row.stamp_label,
        target_parent_id: uuidFromSeed(`${FUTURE_PACKAGE_ID}:parent:${row.set_key}:${numberKey}:${nameKey}:${variantKey}`),
        target_child_id: uuidFromSeed(`${FUTURE_PACKAGE_ID}:child:${row.set_key}:${numberKey}:${nameKey}:${variantKey}:${finishKey}`),
        source_url: row.source_url,
        evidence: {
          source_package_id: sourceReport.package_id,
          source_fingerprint_sha256: sourceReport.fingerprint_sha256,
          source_status: row.status,
          source_url: row.source_url,
          evidence_label: row.evidence_label,
          product_name: row.product_name,
          console_name: row.console_name,
          stamped_variant_key: variantKey,
          stamp_label: row.stamp_label,
          active_child_finish_key: finishKey,
          caveat: 'PriceCharting proves Trick or Trade product identity and finish label; original printed set comes from existing Master Index identity evidence.',
        },
      };
    })
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name)));
}

async function loadReadinessRows(client, candidates) {
  const result = await client.query(
    `with candidate as (
       select *
       from jsonb_to_recordset($1::jsonb) as c(
         set_key text,
         set_name text,
         card_number text,
         card_name text,
         target_finish_key text,
         target_variant_key text,
         target_printed_identity_modifier text,
         stamp_label text,
         target_parent_id uuid,
         target_child_id uuid,
         source_url text,
         evidence jsonb
       )
     ),
     base_match as (
       select
         c.*,
         base.id as base_parent_id,
         base.set_id as base_set_id,
         base.number as base_number,
         base.number_plain as base_number_plain,
         base.name as base_name,
         base.variant_key as base_variant_key,
         base.printed_identity_modifier as base_printed_identity_modifier,
         coalesce(array_agg(distinct base_child.finish_key order by base_child.finish_key) filter (where base_child.finish_key is not null), '{}') as live_base_parent_child_finishes
       from candidate c
       left join public.card_prints base
         on base.set_code = c.set_key
        and lower(base.name) = lower(c.card_name)
        and (
          base.number = c.card_number
          or base.number_plain = regexp_replace(c.card_number, '^0+', '')
          or base.number_plain = c.card_number
        )
        and coalesce(base.variant_key, '') not in (c.target_variant_key, c.target_printed_identity_modifier)
        and coalesce(base.printed_identity_modifier, '') not in (c.target_variant_key, c.target_printed_identity_modifier)
       left join public.card_printings base_child on base_child.card_print_id = base.id
       group by
         c.set_key,
         c.set_name,
         c.card_number,
         c.card_name,
         c.target_finish_key,
         c.target_variant_key,
         c.target_printed_identity_modifier,
         c.stamp_label,
         c.target_parent_id,
         c.target_child_id,
         c.source_url,
         c.evidence,
         base.id,
         base.set_id,
         base.number,
         base.number_plain,
         base.name,
         base.variant_key,
         base.printed_identity_modifier
     )
     select
       bm.*,
       count(distinct existing_parent.id)::int as existing_variant_parent_count,
       count(distinct target_parent_collision.id)::int as target_parent_id_collision_count,
       count(distinct target_child_collision.id)::int as target_child_id_collision_count,
       count(distinct identity_collision.id)::int as identity_target_parent_count
     from base_match bm
     left join public.card_prints existing_parent
       on existing_parent.set_id = bm.base_set_id
      and coalesce(existing_parent.number_plain, existing_parent.number) = coalesce(bm.base_number_plain, bm.base_number)
      and lower(existing_parent.name) = lower(bm.base_name)
      and (
        coalesce(existing_parent.variant_key, '') = bm.target_variant_key
        or coalesce(existing_parent.printed_identity_modifier, '') = bm.target_printed_identity_modifier
      )
     left join public.card_prints target_parent_collision on target_parent_collision.id = bm.target_parent_id
     left join public.card_printings target_child_collision on target_child_collision.id = bm.target_child_id
     left join public.card_print_identity identity_collision on identity_collision.card_print_id = bm.target_parent_id and identity_collision.is_active = true
     group by
       bm.set_key,
       bm.set_name,
       bm.card_number,
       bm.card_name,
       bm.target_finish_key,
       bm.target_variant_key,
       bm.target_printed_identity_modifier,
       bm.stamp_label,
       bm.target_parent_id,
       bm.target_child_id,
       bm.source_url,
       bm.evidence,
       bm.base_parent_id,
       bm.base_set_id,
       bm.base_number,
       bm.base_number_plain,
       bm.base_name,
       bm.base_variant_key,
       bm.base_printed_identity_modifier,
       bm.live_base_parent_child_finishes
     order by bm.set_key, bm.card_number, bm.card_name`,
    [JSON.stringify(candidates)],
  );

  return result.rows.map((row) => {
    const blockers = [];
    if (!row.base_parent_id) blockers.push('base_parent_missing');
    if ((row.live_base_parent_child_finishes ?? []).filter((finish) => finish === row.target_finish_key).length === 0) blockers.push('base_parent_missing_target_child_finish');
    if (row.existing_variant_parent_count > 0) blockers.push('target_stamped_parent_already_exists_review');
    if (row.target_parent_id_collision_count > 0) blockers.push('target_parent_id_collision');
    if (row.target_child_id_collision_count > 0) blockers.push('target_child_id_collision');
    if (row.identity_target_parent_count > 0) blockers.push('target_identity_collision');
    const readinessStatus = blockers.length === 0
      ? 'future_guarded_parent_identity_insert_candidate'
      : 'blocked_or_review';
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.target_finish_key,
      variant_key: row.target_variant_key,
      stamp_label: row.stamp_label,
      source_url: row.source_url,
      base_parent_id: row.base_parent_id,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      live_base_parent_child_finishes: row.live_base_parent_child_finishes,
      existing_variant_parent_count: row.existing_variant_parent_count,
      target_parent_id_collision_count: row.target_parent_id_collision_count,
      target_child_id_collision_count: row.target_child_id_collision_count,
      readiness_status: readinessStatus,
      blockers,
      evidence: row.evidence,
    };
  });
}

function renderMarkdown(report) {
  const candidateRows = report.rows
    .filter((row) => row.readiness_status === 'future_guarded_parent_identity_insert_candidate')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.finish_key, row.base_parent_id]);
  const blockedRows = report.rows
    .filter((row) => row.readiness_status !== 'future_guarded_parent_identity_insert_candidate')
    .map((row) => [row.set_key, row.card_number, row.card_name, row.variant_key, row.blockers.join(', ')]);

  return `# PKG-18I Halloween Active Finish Readiness V1

Read-only DB readiness view for Halloween stamped parent identity inserts.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- durable_db_writes_performed: ${report.durable_db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

${markdownTable(['metric', 'value'], [
    ['source_candidate_rows', report.summary.source_candidate_rows],
    ['future_guarded_parent_identity_insert_candidates', report.summary.future_guarded_parent_identity_insert_candidates],
    ['blocked_or_review_rows', report.summary.blocked_or_review_rows],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Readiness Status

${markdownTable(['status', 'rows'], Object.entries(report.summary.by_readiness_status))}

## Future Guarded Candidates

${markdownTable(['set', 'number', 'card', 'variant', 'finish', 'base_parent_id'], candidateRows)}

## Blocked Rows

${markdownTable(['set', 'number', 'card', 'variant', 'blockers'], blockedRows)}
`;
}

async function main() {
  const sourceReport = await readJson(SOURCE_JSON);
  const candidates = sourceCandidates(sourceReport);
  const conn = connectionString();
  let rows = candidates.map((row) => ({
    ...row,
    readiness_status: 'blocked_missing_database_connection',
    blockers: ['missing_database_connection'],
  }));
  let dbReadError = null;
  if (conn) {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      rows = await loadReadinessRows(client, candidates);
    } catch (error) {
      dbReadError = error.message;
      rows = candidates.map((row) => ({
        ...row,
        readiness_status: 'blocked_db_read_error',
        blockers: [`db_read_error:${error.message}`],
      }));
    } finally {
      await client.end().catch(() => {});
    }
  }

  const payload = {
    source_fingerprint_sha256: sourceReport.fingerprint_sha256,
    rows,
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg18i_halloween_active_finish_readiness_v1',
    package_id: PACKAGE_ID,
    future_package_id: FUTURE_PACKAGE_ID,
    source_artifact: rel(SOURCE_JSON),
    audit_only: true,
    db_reads_performed: Boolean(conn),
    db_read_error: dbReadError,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    write_ready_now: 0,
    fingerprint_sha256: sha256(stableJson(payload)),
    summary: {
      source_candidate_rows: candidates.length,
      future_guarded_parent_identity_insert_candidates: rows.filter((row) => row.readiness_status === 'future_guarded_parent_identity_insert_candidate').length,
      blocked_or_review_rows: rows.filter((row) => row.readiness_status !== 'future_guarded_parent_identity_insert_candidate').length,
      by_readiness_status: countBy(rows, (row) => row.readiness_status),
      by_blocker: countBy(rows.flatMap((row) => row.blockers ?? []), (blocker) => blocker),
      by_finish: countBy(rows, (row) => row.finish_key),
      by_set: countBy(rows, (row) => row.set_key),
    },
    rows,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    summary: report.summary,
    db_read_error: report.db_read_error,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
