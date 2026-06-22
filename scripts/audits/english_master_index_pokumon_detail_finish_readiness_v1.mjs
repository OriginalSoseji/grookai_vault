import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const SOURCE_JSON = path.join(ROOT, 'docs/audits/english_master_index_source_exhaustion_v1/pokumon_detail_finish_review_v1/pokumon_detail_finish_review_v1.json');
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pokumon_detail_finish_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pokumon_detail_finish_readiness_v1.md');

const PACKAGE_ID = 'POKUMON-DETAIL-FINISH-READINESS';
const FUTURE_PACKAGE_ID = 'POKUMON-DETAIL-FINISH-PARENT-INSERTS';

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
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
  return Object.fromEntries(Object.entries(counts).sort((left, right) => Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))));
}

function needsStampLabelGovernance(row) {
  const haystack = normalizeText(`${row.evidence_label ?? ''} ${row.source_url ?? ''}`);
  if (row.variant_key === 'league_stamp' && /\b(first|second|third|fourth) place\b/.test(haystack)) return true;
  if (row.variant_key === 'league_stamp' && /\b(finalist|quarter finalist|semi finalist)\b/.test(haystack)) return true;
  return false;
}

function sourceCandidates(sourceReport) {
  const candidatesByKey = new Map();
  for (const row of sourceReport.canonical_finish_candidates ?? []) {
    if (!row.parsed_finish_key) continue;
    const normalizedName = normalizeText(row.card_name);
    const variantKey = row.variant_key;
    const finishKey = row.parsed_finish_key;
    const key = `${row.set_key}|${row.card_number}|${normalizedName}|${variantKey}|${finishKey}`;
    const existing = candidatesByKey.get(key);
    const evidence = {
      source_key: row.source_key,
      source_kind: row.source_kind,
      source_url: row.source_url,
      evidence_label: row.evidence_label,
      page_classes: row.page_classes,
      parsed_finish_key: finishKey,
      source_fingerprint_sha256: sourceReport.fingerprint_sha256,
    };
    if (existing) {
      existing.source_urls = [...new Set([...existing.source_urls, row.source_url])].sort();
      existing.evidence.push(evidence);
      existing.stamp_label_governance_needed = existing.stamp_label_governance_needed || needsStampLabelGovernance(row);
      continue;
    }
    candidatesByKey.set(key, {
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      target_finish_key: finishKey,
      target_variant_key: variantKey,
      target_printed_identity_modifier: variantKey,
      stamp_label: row.variant_key,
      target_parent_id: uuidFromSeed(`${FUTURE_PACKAGE_ID}:parent:${row.set_key}:${row.card_number}:${normalizedName}:${variantKey}`),
      target_child_id: uuidFromSeed(`${FUTURE_PACKAGE_ID}:child:${row.set_key}:${row.card_number}:${normalizedName}:${variantKey}:${finishKey}`),
      source_urls: [row.source_url],
      stamp_label_governance_needed: needsStampLabelGovernance(row),
      evidence: [evidence],
    });
  }
  return [...candidatesByKey.values()].sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
    || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
    || String(left.card_name).localeCompare(String(right.card_name))
    || String(left.target_variant_key).localeCompare(String(right.target_variant_key))
    || String(left.target_finish_key).localeCompare(String(right.target_finish_key)));
}

async function loadReadinessRows(client, candidates) {
  const result = await client.query(
    `with candidate as (
       select *
       from jsonb_to_recordset($1::jsonb) as c(
         set_key text,
         card_number text,
         card_name text,
         target_finish_key text,
         target_variant_key text,
         target_printed_identity_modifier text,
         stamp_label text,
         target_parent_id uuid,
         target_child_id uuid,
         source_urls text[],
         stamp_label_governance_needed boolean,
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
         base.gv_id as base_gv_id,
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
        and coalesce(base.variant_key, '') = ''
        and coalesce(base.printed_identity_modifier, '') = ''
       left join public.card_printings base_child on base_child.card_print_id = base.id
       group by
         c.set_key, c.card_number, c.card_name, c.target_finish_key,
         c.target_variant_key, c.target_printed_identity_modifier, c.stamp_label,
         c.target_parent_id, c.target_child_id, c.source_urls, c.stamp_label_governance_needed, c.evidence,
         base.id, base.set_id, base.number, base.number_plain, base.name, base.gv_id
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
       bm.set_key, bm.card_number, bm.card_name, bm.target_finish_key,
       bm.target_variant_key, bm.target_printed_identity_modifier, bm.stamp_label,
       bm.target_parent_id, bm.target_child_id, bm.source_urls, bm.stamp_label_governance_needed, bm.evidence,
       bm.base_parent_id, bm.base_set_id, bm.base_number, bm.base_number_plain, bm.base_name, bm.base_gv_id,
       bm.live_base_parent_child_finishes
     order by bm.set_key, bm.card_number, bm.card_name`,
    [JSON.stringify(candidates)],
  );

  return result.rows.map((row) => {
    const blockers = [];
    if (!row.base_parent_id) blockers.push('base_parent_missing');
    if (!row.base_gv_id) blockers.push('base_parent_missing_gv_id');
    if ((row.live_base_parent_child_finishes ?? []).filter((finish) => finish === row.target_finish_key).length === 0) blockers.push('base_parent_missing_target_child_finish');
    if (row.existing_variant_parent_count > 0) blockers.push('target_variant_parent_already_exists_review');
    if (row.target_parent_id_collision_count > 0) blockers.push('target_parent_id_collision');
    if (row.target_child_id_collision_count > 0) blockers.push('target_child_id_collision');
    if (row.identity_target_parent_count > 0) blockers.push('target_identity_collision');
    if (row.stamp_label_governance_needed) blockers.push('stamp_label_granularity_governance_needed');
    return {
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.target_finish_key,
      variant_key: row.target_variant_key,
      stamp_label: row.stamp_label,
      source_urls: row.source_urls,
      base_parent_id: row.base_parent_id,
      base_gv_id: row.base_gv_id,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      live_base_parent_child_finishes: row.live_base_parent_child_finishes,
      existing_variant_parent_count: row.existing_variant_parent_count,
      target_parent_id_collision_count: row.target_parent_id_collision_count,
      target_child_id_collision_count: row.target_child_id_collision_count,
      stamp_label_governance_needed: row.stamp_label_governance_needed,
      readiness_status: blockers.length === 0 ? 'future_guarded_parent_identity_insert_candidate' : 'blocked_or_review',
      blockers,
      evidence: row.evidence,
    };
  });
}

function renderMarkdown(report) {
  return `# Pokumon Detail Finish Readiness V1

Generated: ${report.generated_at}

Read-only readiness view. No DB writes, no migrations, no apply. Pokumon detail-page finish classes are treated as source evidence candidates only, not final truth.

## Summary

${markdownTable(['metric', 'value'], [
    ['source_candidate_rows', report.summary.source_candidate_rows],
    ['deduped_target_facts', report.summary.deduped_target_facts],
    ['future_guarded_parent_identity_insert_candidates', report.summary.future_guarded_parent_identity_insert_candidates],
    ['blocked_or_review_rows', report.summary.blocked_or_review_rows],
    ['write_ready_now', report.summary.write_ready_now],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Blockers

${markdownTable(['blocker', 'count'], Object.entries(report.summary.blockers).map(([key, value]) => [key, value]))}

## Future Guarded Candidates

${report.future_guarded_parent_identity_insert_candidates.length
    ? markdownTable(['set', 'number', 'card', 'variant', 'finish', 'sources'], report.future_guarded_parent_identity_insert_candidates.slice(0, 80).map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.finish_key,
      row.source_urls.length,
    ]))
    : 'None.'}

## Blocked / Review Sample

${report.blocked_or_review_rows.length
    ? markdownTable(['set', 'number', 'card', 'variant', 'finish', 'blockers'], report.blocked_or_review_rows.slice(0, 80).map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.finish_key,
      row.blockers.join(', '),
    ]))
    : 'None.'}
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing database connection string.');

  const sourceReport = await readJson(SOURCE_JSON);
  const candidates = sourceCandidates(sourceReport);
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const rows = await loadReadinessRows(client, candidates);
    const future = rows.filter((row) => row.readiness_status === 'future_guarded_parent_identity_insert_candidate');
    const blocked = rows.filter((row) => row.readiness_status !== 'future_guarded_parent_identity_insert_candidate');
    const blockers = countBy(blocked.flatMap((row) => row.blockers), (blocker) => blocker);
    const fingerprint = sha256(stableJson(rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: normalizeText(row.card_name),
      variant_key: row.variant_key,
      finish_key: row.finish_key,
      readiness_status: row.readiness_status,
      blockers: row.blockers,
    }))));
    const report = {
      generated_at: new Date().toISOString(),
      version: 'pokumon_detail_finish_readiness_v1',
      package_id: PACKAGE_ID,
      source_artifact: rel(SOURCE_JSON),
      source_fingerprint_sha256: sourceReport.fingerprint_sha256,
      fingerprint_sha256: fingerprint,
      db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      summary: {
        source_candidate_rows: sourceReport.summary?.canonical_finish_candidates ?? 0,
        deduped_target_facts: rows.length,
        future_guarded_parent_identity_insert_candidates: future.length,
        blocked_or_review_rows: blocked.length,
        write_ready_now: 0,
        by_finish: countBy(rows, (row) => row.finish_key),
        by_variant: countBy(rows, (row) => row.variant_key),
        blockers,
      },
      future_guarded_parent_identity_insert_candidates: future,
      blocked_or_review_rows: blocked,
    };
    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, renderMarkdown(report));
    console.log(JSON.stringify({
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      fingerprint_sha256: fingerprint,
      summary: report.summary,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
