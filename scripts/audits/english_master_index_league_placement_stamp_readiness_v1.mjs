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
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pokumon_stamp_granularity_governance_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_league_placement_stamp_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_league_placement_stamp_readiness_v1.md');

const PACKAGE_ID = 'LEAGUE-PLACEMENT-STAMP-READINESS';
const FUTURE_PACKAGE_ID = 'LEAGUE-PLACEMENT-STAMP-PARENT-INSERTS';
const GOVERNING_CONTRACT = 'LEAGUE_PLACEMENT_STAMP_IDENTITY_RULE_V1';

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

function variantSuffix(variantKey) {
  const cleaned = String(variantKey ?? 'variant').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  return cleaned.length <= 28 ? cleaned : `${cleaned.slice(0, 20)}-${sha256(cleaned).slice(0, 7).toUpperCase()}`;
}

function finishSuffix(finishKey) {
  return {
    normal: 'STD',
    holo: 'HOLO',
    reverse: 'RH',
    cosmos: 'COSMOS',
    cracked_ice: 'CRACKED',
  }[finishKey] ?? String(finishKey ?? 'UNK').toUpperCase().replace(/[^A-Z0-9]+/g, '-');
}

function buildCandidates(input) {
  const candidates = [];
  for (const row of input.future_readiness_after_contract_rows ?? []) {
    for (const split of row.proposed_split_rows ?? []) {
      const normalizedName = normalizeText(row.card_name);
      const targetParentId = uuidFromSeed(`${FUTURE_PACKAGE_ID}:parent:${row.set_key}:${row.card_number}:${normalizedName}:${split.variant_key}`);
      const targetChildId = uuidFromSeed(`${FUTURE_PACKAGE_ID}:child:${row.set_key}:${row.card_number}:${normalizedName}:${split.variant_key}:${split.finish_key}`);
      candidates.push({
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        target_finish_key: split.finish_key,
        target_variant_key: split.variant_key,
        target_printed_identity_modifier: split.printed_identity_modifier,
        stamp_label: split.stamp_label,
        source_variant_key: row.variant_key,
        target_parent_id: targetParentId,
        target_child_id: targetChildId,
        source_urls: row.source_urls ?? [],
        evidence: {
          governing_contract: GOVERNING_CONTRACT,
          source_artifact: rel(INPUT_JSON),
          source_fingerprint_sha256: input.fingerprint_sha256,
          source_variant_key: row.variant_key,
          source_urls: row.source_urls ?? [],
          stamp_label: split.stamp_label,
          variant_key: split.variant_key,
          active_child_finish_key: split.finish_key,
          evidence_label: `${split.stamp_label} placement-specific League stamped identity from Pokumon detail evidence`,
        },
      });
    }
  }
  return candidates.sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
    || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
    || String(left.card_name).localeCompare(String(right.card_name))
    || String(left.target_variant_key).localeCompare(String(right.target_variant_key)));
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
         source_variant_key text,
         target_parent_id uuid,
         target_child_id uuid,
         source_urls text[],
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
         base.identity_domain as base_identity_domain,
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
         c.source_variant_key, c.target_parent_id, c.target_child_id, c.source_urls, c.evidence,
         base.id, base.set_id, base.number, base.number_plain, base.name, base.gv_id, base.identity_domain
     ),
     projection as (
       select
         bm.*,
         public.card_print_identity_backfill_projection_v1(
           s.source,
           base.set_code,
           s.code,
           base.number,
           base.number_plain,
           base.name,
           bm.target_variant_key,
           coalesce(base.printed_total, s.printed_total),
           coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
         ) as projected
       from base_match bm
       left join public.card_prints base on base.id = bm.base_parent_id
       left join public.sets s on s.id = base.set_id
     )
     select
       p.*,
       count(distinct existing_parent.id)::int as existing_variant_parent_count,
       count(distinct target_parent_collision.id)::int as target_parent_id_collision_count,
       count(distinct target_child_collision.id)::int as target_child_id_collision_count,
       count(distinct identity_collision.id)::int as identity_target_parent_count,
       count(distinct identity_hash_collision.id)::int as identity_hash_collision_count
     from projection p
     left join public.card_prints existing_parent
       on existing_parent.set_id = p.base_set_id
      and coalesce(existing_parent.number_plain, existing_parent.number) = coalesce(p.base_number_plain, p.base_number)
      and lower(existing_parent.name) = lower(p.base_name)
      and (
        coalesce(existing_parent.variant_key, '') = p.target_variant_key
        or coalesce(existing_parent.printed_identity_modifier, '') = p.target_printed_identity_modifier
      )
     left join public.card_prints target_parent_collision on target_parent_collision.id = p.target_parent_id
     left join public.card_printings target_child_collision on target_child_collision.id = p.target_child_id
     left join public.card_print_identity identity_collision on identity_collision.card_print_id = p.target_parent_id and identity_collision.is_active = true
     left join public.card_print_identity identity_hash_collision
       on identity_hash_collision.is_active = true
      and identity_hash_collision.card_print_id <> p.target_parent_id
      and identity_hash_collision.identity_domain = p.projected->>'identity_domain'
      and identity_hash_collision.identity_key_version = p.projected->>'identity_key_version'
      and identity_hash_collision.identity_key_hash = p.projected->>'identity_key_hash'
     group by
       p.set_key, p.card_number, p.card_name, p.target_finish_key,
       p.target_variant_key, p.target_printed_identity_modifier, p.stamp_label,
       p.source_variant_key, p.target_parent_id, p.target_child_id, p.source_urls, p.evidence,
       p.base_parent_id, p.base_set_id, p.base_number, p.base_number_plain, p.base_name,
       p.base_gv_id, p.base_identity_domain, p.live_base_parent_child_finishes, p.projected
     order by p.set_key, p.card_number, p.card_name, p.target_variant_key`,
    [JSON.stringify(candidates)],
  );

  return result.rows.map((row) => {
    const blockers = [];
    if (!row.base_parent_id) blockers.push('base_parent_missing');
    if (!row.base_gv_id) blockers.push('base_parent_missing_gv_id');
    if ((row.live_base_parent_child_finishes ?? []).filter((finish) => finish === row.target_finish_key).length === 0) blockers.push('base_parent_missing_target_child_finish');
    if (row.existing_variant_parent_count > 0) blockers.push('target_placement_parent_already_exists_review');
    if (row.target_parent_id_collision_count > 0) blockers.push('target_parent_id_collision');
    if (row.target_child_id_collision_count > 0) blockers.push('target_child_id_collision');
    if (row.identity_target_parent_count > 0) blockers.push('target_identity_collision');
    if (row.projected?.status !== 'ready') blockers.push('identity_projection_not_ready');
    if (row.identity_hash_collision_count > 0) blockers.push('identity_hash_collision');
    const targetGvId = row.base_gv_id ? `${row.base_gv_id}-${variantSuffix(row.target_variant_key)}` : null;
    return {
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.target_finish_key,
      variant_key: row.target_variant_key,
      printed_identity_modifier: row.target_printed_identity_modifier,
      stamp_label: row.stamp_label,
      source_variant_key: row.source_variant_key,
      source_urls: row.source_urls,
      base_parent_id: row.base_parent_id,
      base_gv_id: row.base_gv_id,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      target_gv_id: targetGvId,
      target_printing_gv_id: targetGvId ? `${targetGvId}-${finishSuffix(row.target_finish_key)}` : null,
      live_base_parent_child_finishes: row.live_base_parent_child_finishes,
      readiness_status: blockers.length === 0 ? 'future_guarded_parent_identity_insert_candidate' : 'blocked_or_review',
      blockers,
      evidence: row.evidence,
    };
  });
}

function renderMarkdown(report) {
  return `# League Placement Stamp Readiness V1

Generated: ${report.generated_at}

Read-only readiness under \`${GOVERNING_CONTRACT}\`. No DB writes, no migrations, no apply.

## Summary

${markdownTable(['metric', 'value'], [
    ['source_rows', report.summary.source_rows],
    ['expanded_candidate_rows', report.summary.expanded_candidate_rows],
    ['future_guarded_parent_identity_insert_candidates', report.summary.future_guarded_parent_identity_insert_candidates],
    ['blocked_or_review_rows', report.summary.blocked_or_review_rows],
    ['write_ready_now', report.summary.write_ready_now],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Future Guarded Candidates

${report.future_guarded_parent_identity_insert_candidates.length
    ? markdownTable(['set', 'number', 'card', 'variant', 'finish', 'target gv_id'], report.future_guarded_parent_identity_insert_candidates.slice(0, 80).map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.variant_key,
      row.finish_key,
      row.target_gv_id,
    ]))
    : 'None.'}

## Blockers

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
  const input = await readJson(INPUT_JSON);
  const candidates = buildCandidates(input);
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const rows = await loadReadinessRows(client, candidates);
    const future = rows.filter((row) => row.readiness_status === 'future_guarded_parent_identity_insert_candidate');
    const blocked = rows.filter((row) => row.readiness_status !== 'future_guarded_parent_identity_insert_candidate');
    const fingerprint = sha256(stableJson(rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: normalizeText(row.card_name),
      variant_key: row.variant_key,
      finish_key: row.finish_key,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      readiness_status: row.readiness_status,
      blockers: row.blockers,
    }))));
    const report = {
      generated_at: new Date().toISOString(),
      version: 'league_placement_stamp_readiness_v1',
      package_id: PACKAGE_ID,
      governing_contract: GOVERNING_CONTRACT,
      source_artifact: rel(INPUT_JSON),
      source_fingerprint_sha256: input.fingerprint_sha256,
      fingerprint_sha256: fingerprint,
      db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      summary: {
        source_rows: input.summary?.future_readiness_after_contract_rows ?? 0,
        expanded_candidate_rows: rows.length,
        future_guarded_parent_identity_insert_candidates: future.length,
        blocked_or_review_rows: blocked.length,
        write_ready_now: 0,
        by_variant: countBy(rows, (row) => row.variant_key),
        by_finish: countBy(rows, (row) => row.finish_key),
        blockers: countBy(blocked.flatMap((row) => row.blockers), (blocker) => blocker),
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
