import crypto from 'node:crypto';
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

const MASTER_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join('docs', 'audits', 'english_master_index_source_exhaustion_v1');
const INPUT_JSON = path.join(MASTER_DIR, 'english_master_index_sv03_stamped_parent_active_finish_readiness_queue_v1.json');
const OUT_BASENAME = 'english_master_index_sv03_stamped_db_readiness_v1';
const OUT_JSON = path.join(MASTER_DIR, `${OUT_BASENAME}.json`);
const OUT_MD = path.join(MASTER_DIR, `${OUT_BASENAME}.md`);
const MIRROR_JSON = path.join(SOURCE_DIR, `${OUT_BASENAME}.json`);
const MIRROR_MD = path.join(SOURCE_DIR, `${OUT_BASENAME}.md`);
const PACKAGE_ID = 'PKG-SV03-STAMPED-PARENT-ACTIVE-FINISH-DB-READINESS';
const FUTURE_PACKAGE_ID = 'PKG-SV03-STAMPED-PARENT-ACTIVE-FINISH-INSERTS';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) counts[keyFn(row) || 'unknown'] = (counts[keyFn(row) || 'unknown'] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function evidenceTier(row) {
  if (row.readiness_status === 'review_ready_multi_lane_active_finish') return 'multi_lane';
  if (row.readiness_status === 'review_ready_same_row_source_only') return 'same_row_single_source';
  if (row.readiness_status === 'review_ready_product_family_only') return 'product_family_only';
  return 'blocked';
}

function buildTargets(queue) {
  return (queue.rows ?? [])
    .filter((row) => String(row.readiness_status ?? '').startsWith('review_ready_'))
    .map((row) => {
      const numberPlain = normalizeNumber(row.card_number);
      const normalizedName = normalizeText(row.card_name);
      const targetParentId = uuidFromSeed(`${FUTURE_PACKAGE_ID}:parent:${row.set_key}:${numberPlain}:${normalizedName}:${row.target_variant_key}`);
      const targetChildId = uuidFromSeed(`${FUTURE_PACKAGE_ID}:child:${row.set_key}:${numberPlain}:${normalizedName}:${row.target_variant_key}:${row.proposed_finish_key}`);
      return {
        target_parent_id: targetParentId,
        target_child_id: targetChildId,
        set_key: row.set_key,
        set_name: row.set_name,
        source_card_number: row.card_number,
        source_number_plain: numberPlain,
        card_name: row.card_name,
        target_variant_key: row.target_variant_key,
        target_finish_key: row.proposed_finish_key,
        evidence_tier: evidenceTier(row),
        source_readiness_status: row.readiness_status,
        evidence: row.evidence ?? [],
      };
    })
    .sort((left, right) => Number(left.source_number_plain) - Number(right.source_number_plain)
      || String(left.card_name).localeCompare(String(right.card_name))
      || String(left.target_variant_key).localeCompare(String(right.target_variant_key)));
}

async function captureReadiness(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         target_parent_id uuid,
         target_child_id uuid,
         set_key text,
         set_name text,
         source_card_number text,
         source_number_plain text,
         card_name text,
         target_variant_key text,
         target_finish_key text,
         evidence_tier text,
         source_readiness_status text
       )
     ),
     base_candidates as (
       select
         target.target_parent_id,
         cp.id,
         cp.game_id,
         cp.set_id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.rarity,
         cp.image_url,
         cp.image_alt_url,
         cp.image_path,
         cp.representative_image_url,
         cp.printed_total,
         cp.printed_set_abbrev,
         coalesce(cp.variant_key, '') as variant_key,
         cp.printed_identity_modifier,
         row_number() over (
           partition by target.target_parent_id
           order by case when coalesce(cp.variant_key, '') = '' then 0 else 1 end, cp.number
         ) as candidate_rank
       from target
       join public.card_prints cp
         on cp.set_code = target.set_key
        and lower(cp.name) = lower(target.card_name)
        and (
          coalesce(nullif(ltrim(split_part(coalesce(cp.number_plain, cp.number), '/', 1), '0'), ''), '0') = target.source_number_plain
          or cp.number = target.source_card_number
        )
        and coalesce(cp.variant_key, '') = ''
     ),
     selected_base as (
       select *
       from base_candidates
       where candidate_rank = 1
     ),
     projections as (
       select
         target.target_parent_id,
         public.card_print_identity_backfill_projection_v1(
           s.source,
           base.set_code,
           s.code,
           base.number,
           base.number_plain,
           base.name,
           target.target_variant_key,
           coalesce(base.printed_total, s.printed_total),
           coalesce(base.printed_set_abbrev, s.printed_set_abbrev)
         ) as projected
       from target
       join selected_base base on base.target_parent_id = target.target_parent_id
       left join public.sets s on s.id = base.set_id
     )
     select
       target.*,
       coalesce(base_count.candidate_count, 0)::int as base_candidate_count,
       base.id::text as base_parent_id,
       base.number as base_parent_number,
       base.number_plain as base_parent_number_plain,
       base.variant_key as base_parent_variant_key,
       base.printed_identity_modifier as base_parent_printed_identity_modifier,
       coalesce(base_finish.base_finish_exists, false) as base_finish_exists,
       coalesce(active_finish.active_finish_exists, false) as active_finish_exists,
       coalesce(target_parent_collision.parent_collision_count, 0)::int as target_parent_collision_count,
       coalesce(target_child_collision.child_collision_count, 0)::int as target_child_id_collision_count,
       coalesce(existing_target_child.existing_target_child_count, 0)::int as existing_target_child_count,
       coalesce(identity_projection.ready_identity_projection, false) as ready_identity_projection,
       identity_projection.identity_domain,
       identity_projection.identity_key_version,
       identity_projection.identity_key_hash,
       coalesce(identity_collision.identity_hash_collision_count, 0)::int as identity_hash_collision_count,
       coalesce(vault_parent_refs.vault_parent_ref_count, 0)::int as base_parent_vault_ref_count,
       coalesce(vault_child_refs.vault_child_ref_count, 0)::int as base_finish_child_vault_ref_count,
       coalesce(external_mapping_refs.external_mapping_count, 0)::int as base_parent_external_mapping_count
     from target
     left join (
       select target_parent_id, count(*)::int as candidate_count
       from base_candidates
       group by target_parent_id
     ) base_count on base_count.target_parent_id = target.target_parent_id
     left join selected_base base on base.target_parent_id = target.target_parent_id
     left join lateral (
       select true as base_finish_exists
       from public.card_printings cpr
       where cpr.card_print_id = base.id
         and cpr.finish_key = target.target_finish_key
       limit 1
     ) base_finish on true
     left join lateral (
       select true as active_finish_exists
       from public.finish_keys fk
       where fk.key = target.target_finish_key
         and fk.is_active = true
       limit 1
     ) active_finish on true
     left join lateral (
       select count(*)::int as parent_collision_count
       from public.card_prints cp
       where cp.set_id = base.set_id
         and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
         and lower(cp.name) = lower(base.name)
         and coalesce(cp.variant_key, '') = target.target_variant_key
     ) target_parent_collision on true
     left join lateral (
       select count(*)::int as child_collision_count
       from public.card_printings cpr
       where cpr.id = target.target_child_id
     ) target_child_collision on true
     left join lateral (
       select count(*)::int as existing_target_child_count
       from public.card_printings cpr
       join public.card_prints cp on cp.id = cpr.card_print_id
       where cp.set_id = base.set_id
         and coalesce(cp.number_plain, cp.number) = coalesce(base.number_plain, base.number)
         and lower(cp.name) = lower(base.name)
         and coalesce(cp.variant_key, '') = target.target_variant_key
         and cpr.finish_key = target.target_finish_key
     ) existing_target_child on true
     left join lateral (
       select
         projected->>'status' = 'ready' as ready_identity_projection,
         projected->>'identity_domain' as identity_domain,
         projected->>'identity_key_version' as identity_key_version,
         projected->>'identity_key_hash' as identity_key_hash
       from projections p
       where p.target_parent_id = target.target_parent_id
       limit 1
     ) identity_projection on true
     left join lateral (
       select count(*)::int as identity_hash_collision_count
       from public.card_print_identity cpi
       where cpi.is_active = true
         and cpi.identity_domain = identity_projection.identity_domain
         and cpi.identity_key_version = identity_projection.identity_key_version
         and cpi.identity_key_hash = identity_projection.identity_key_hash
     ) identity_collision on true
     left join lateral (
       select count(*)::int as vault_parent_ref_count
       from public.vault_item_instances vii
       where vii.card_print_id = base.id
     ) vault_parent_refs on true
     left join lateral (
       select count(*)::int as vault_child_ref_count
       from public.vault_item_instances vii
       join public.card_printings cpr on cpr.id = vii.card_printing_id
       where cpr.card_print_id = base.id
         and cpr.finish_key = target.target_finish_key
     ) vault_child_refs on true
     left join lateral (
       select count(*)::int as external_mapping_count
       from public.external_mappings em
       where em.card_print_id = base.id
         and coalesce(em.active, true) = true
     ) external_mapping_refs on true
     order by target.source_number_plain, target.card_name, target.target_variant_key`,
    [JSON.stringify(targets)],
  );

  return result.rows;
}

function classifyReadiness(row) {
  const blockers = [];
  if (row.evidence_tier === 'product_family_only') blockers.push('product_family_only_requires_manual_adjudication_before_dry_run');
  if (row.evidence_tier === 'same_row_single_source') blockers.push('same_row_single_source_requires_second_independent_source_before_dry_run');
  if (Number(row.base_candidate_count) !== 1) blockers.push('base_parent_not_unique');
  if (!row.base_parent_id) blockers.push('base_parent_missing');
  if (!row.active_finish_exists) blockers.push('active_finish_key_missing_or_inactive');
  if (!row.base_finish_exists) blockers.push('base_parent_lacks_same_active_finish_context');
  if (Number(row.target_parent_collision_count) > 0) blockers.push('target_stamped_parent_already_exists');
  if (Number(row.target_child_id_collision_count) > 0) blockers.push('target_child_id_collision');
  if (Number(row.existing_target_child_count) > 0) blockers.push('target_child_finish_already_exists');
  if (!row.ready_identity_projection) blockers.push('identity_projection_not_ready');
  if (Number(row.identity_hash_collision_count) > 0) blockers.push('identity_hash_collision');

  if (blockers.length === 0) {
    return { db_readiness_status: 'ready_for_guarded_rollback_dry_run_preparation', blockers };
  }
  return { db_readiness_status: 'blocked_before_dry_run_preparation', blockers };
}

function renderMarkdown(report) {
  const rows = report.rows.map((row) => [
    row.source_card_number,
    row.card_name,
    row.target_variant_key,
    row.target_finish_key,
    row.evidence_tier,
    row.base_parent_id ?? '',
    row.db_readiness_status,
    row.blockers.join(', '),
  ]);
  return `# English Master Index SV03 Stamped DB Readiness V1

Generated: ${report.generated_at}

Read-only DB readiness checks for SV03 stamped identity review candidates. No database writes, migrations, cleanup, quarantine, insertions, deletions, or apply SQL were performed.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['ready_for_guarded_rollback_dry_run_preparation', report.summary.ready_for_guarded_rollback_dry_run_preparation],
    ['blocked_before_dry_run_preparation', report.summary.blocked_before_dry_run_preparation],
    ['expected_parent_inserts_if_all_ready', report.summary.expected_parent_inserts_if_all_ready],
    ['expected_child_inserts_if_all_ready', report.summary.expected_child_inserts_if_all_ready],
    ['write_ready_now', report.summary.write_ready_now],
    ['package_fingerprint_sha256', `\`${report.package_fingerprint_sha256}\``],
  ])}

## Readiness Counts

${markdownTable(['status', 'rows'], Object.entries(report.summary.by_db_readiness_status))}

## Targets

${markdownTable(['number', 'card', 'variant', 'finish', 'evidence_tier', 'base_parent_id', 'db_status', 'blockers'], rows)}

## Boundary

This report is not an apply authorization. Product-family-only and same-row single-source rows are intentionally blocked from dry-run packaging until adjudicated or independently corroborated.
`;
}

async function main() {
  const queue = await readJson(INPUT_JSON);
  const targets = buildTargets(queue);
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required for read-only readiness checks.');

  const client = new Client({ connectionString: conn });
  await client.connect();
  let dbRows;
  try {
    await client.query('begin read only');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '60s'");
    dbRows = await captureReadiness(client, targets);
    await client.query('rollback');
  } finally {
    await client.end();
  }

  const targetById = new Map(targets.map((row) => [row.target_parent_id, row]));
  const rows = dbRows.map((row) => {
    const target = targetById.get(row.target_parent_id);
    const classified = classifyReadiness(row);
    return {
      ...target,
      base_candidate_count: Number(row.base_candidate_count ?? 0),
      base_parent_id: row.base_parent_id,
      base_parent_number: row.base_parent_number,
      base_parent_number_plain: row.base_parent_number_plain,
      base_parent_variant_key: row.base_parent_variant_key,
      base_parent_printed_identity_modifier: row.base_parent_printed_identity_modifier,
      base_finish_exists: Boolean(row.base_finish_exists),
      active_finish_exists: Boolean(row.active_finish_exists),
      target_parent_collision_count: Number(row.target_parent_collision_count ?? 0),
      target_child_id_collision_count: Number(row.target_child_id_collision_count ?? 0),
      existing_target_child_count: Number(row.existing_target_child_count ?? 0),
      ready_identity_projection: Boolean(row.ready_identity_projection),
      identity_domain: row.identity_domain,
      identity_key_version: row.identity_key_version,
      identity_key_hash: row.identity_key_hash,
      identity_hash_collision_count: Number(row.identity_hash_collision_count ?? 0),
      base_parent_vault_ref_count: Number(row.base_parent_vault_ref_count ?? 0),
      base_finish_child_vault_ref_count: Number(row.base_finish_child_vault_ref_count ?? 0),
      base_parent_external_mapping_count: Number(row.base_parent_external_mapping_count ?? 0),
      ...classified,
    };
  });

  const readyRows = rows.filter((row) => row.db_readiness_status === 'ready_for_guarded_rollback_dry_run_preparation');
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    future_package_id: FUTURE_PACKAGE_ID,
    source_queue_fingerprint: queue.fingerprint_sha256,
    rows: rows.map((row) => ({
      set_key: row.set_key,
      source_number_plain: row.source_number_plain,
      card_name: normalizeText(row.card_name),
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      base_parent_id: row.base_parent_id,
      evidence_tier: row.evidence_tier,
      db_readiness_status: row.db_readiness_status,
      blockers: row.blockers,
    })),
  }));
  const report = {
    version: OUT_BASENAME,
    package_id: PACKAGE_ID,
    future_package_id: FUTURE_PACKAGE_ID,
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_reads_performed: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifact: INPUT_JSON.replaceAll('\\', '/'),
    source_queue_fingerprint: queue.fingerprint_sha256,
    package_fingerprint_sha256: packageFingerprint,
    summary: {
      target_rows: rows.length,
      ready_for_guarded_rollback_dry_run_preparation: readyRows.length,
      blocked_before_dry_run_preparation: rows.length - readyRows.length,
      expected_parent_inserts_if_all_ready: readyRows.length,
      expected_child_inserts_if_all_ready: readyRows.length,
      expected_deletes: 0,
      expected_merges: 0,
      write_ready_now: 0,
      by_db_readiness_status: countBy(rows, (row) => row.db_readiness_status),
      by_evidence_tier: countBy(rows, (row) => row.evidence_tier),
      by_blocker: countBy(rows.flatMap((row) => row.blockers), (blocker) => blocker),
    },
    rows,
    safety_confirmation: {
      audit_only: true,
      db_reads_performed: true,
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      write_ready_now: 0,
    },
  };

  const markdown = renderMarkdown(report);
  await writeJson(OUT_JSON, report);
  await writeText(OUT_MD, markdown);
  await writeJson(MIRROR_JSON, report);
  await writeText(MIRROR_MD, markdown);
  console.log(JSON.stringify({
    output_json: OUT_JSON,
    mirror_json: MIRROR_JSON,
    package_fingerprint_sha256: packageFingerprint,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
