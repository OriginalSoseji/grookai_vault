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

const MASTER_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join('docs', 'audits', 'english_master_index_source_exhaustion_v1');
const INPUT_JSON = path.join(MASTER_DIR, 'english_master_index_sv03_stamped_db_readiness_v1.json');
const OUT_BASENAME = 'english_master_index_sv03_existing_stamped_parent_collision_audit_v1';
const OUT_JSON = path.join(MASTER_DIR, `${OUT_BASENAME}.json`);
const OUT_MD = path.join(MASTER_DIR, `${OUT_BASENAME}.md`);
const MIRROR_JSON = path.join(SOURCE_DIR, `${OUT_BASENAME}.json`);
const MIRROR_MD = path.join(SOURCE_DIR, `${OUT_BASENAME}.md`);

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

function targetRows(readiness) {
  return (readiness.rows ?? [])
    .filter((row) => Number(row.target_parent_collision_count ?? 0) > 0)
    .map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      source_card_number: row.source_card_number,
      source_number_plain: row.source_number_plain,
      card_name: row.card_name,
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      evidence_tier: row.evidence_tier,
      source_readiness_status: row.source_readiness_status,
      readiness_blockers: row.blockers ?? [],
      expected_target_parent_id: row.target_parent_id,
      expected_target_child_id: row.target_child_id,
      base_parent_id: row.base_parent_id,
      evidence: row.evidence ?? [],
    }));
}

async function captureExistingParents(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         set_key text,
         set_name text,
         source_card_number text,
         source_number_plain text,
         card_name text,
         target_variant_key text,
         target_finish_key text,
         evidence_tier text,
         source_readiness_status text,
         expected_target_parent_id uuid,
         expected_target_child_id uuid,
         base_parent_id uuid
       )
     ),
     target_parent as (
       select
         target.*,
         cp.id,
         cp.set_id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.variant_key,
         cp.printed_identity_modifier,
         cp.gv_id,
         cp.image_url,
         cp.representative_image_url
       from target
       join public.card_prints cp
         on cp.set_code = target.set_key
        and lower(cp.name) = lower(target.card_name)
        and coalesce(nullif(ltrim(split_part(coalesce(cp.number_plain, cp.number), '/', 1), '0'), ''), '0') = target.source_number_plain
        and coalesce(cp.variant_key, '') = target.target_variant_key
     ),
     child_summary as (
       select
         tp.id as parent_id,
         jsonb_agg(
           jsonb_build_object(
             'id', cpr.id::text,
             'finish_key', cpr.finish_key,
             'is_provisional', cpr.is_provisional,
             'created_by', cpr.created_by
           )
           order by cpr.finish_key, cpr.id
         ) filter (where cpr.id is not null) as child_printings,
         count(cpr.id)::int as child_printing_count,
         count(cpr.id) filter (where cpr.finish_key = tp.target_finish_key)::int as target_child_finish_count,
         count(cpr.id) filter (where cpr.finish_key = 'stamped')::int as forbidden_stamped_child_count
       from target_parent tp
       left join public.card_printings cpr on cpr.card_print_id = tp.id
       group by tp.id
     ),
     identity_summary as (
       select
         tp.id as parent_id,
         jsonb_agg(
           jsonb_build_object(
             'id', cpi.id::text,
             'identity_domain', cpi.identity_domain,
             'identity_key_version', cpi.identity_key_version,
             'identity_key_hash', cpi.identity_key_hash,
             'is_active', cpi.is_active
           )
           order by cpi.is_active desc, cpi.id
         ) filter (where cpi.id is not null) as identities,
         count(cpi.id) filter (where cpi.is_active)::int as active_identity_count
       from target_parent tp
       left join public.card_print_identity cpi on cpi.card_print_id = tp.id
       group by tp.id
     ),
     external_summary as (
       select
         tp.id as parent_id,
         count(em.id)::int as active_external_mapping_count
       from target_parent tp
       left join public.external_mappings em
         on em.card_print_id = tp.id
        and coalesce(em.active, true) = true
       group by tp.id
     ),
     vault_summary as (
       select
         tp.id as parent_id,
         count(vii.id)::int as vault_parent_ref_count,
         count(vii.id) filter (where cpr.finish_key = tp.target_finish_key)::int as vault_target_child_ref_count
       from target_parent tp
       left join public.vault_item_instances vii on vii.card_print_id = tp.id
       left join public.card_printings cpr on cpr.id = vii.card_printing_id
       group by tp.id
     )
     select
       tp.*,
       coalesce(cs.child_printings, '[]'::jsonb) as child_printings,
       coalesce(cs.child_printing_count, 0)::int as child_printing_count,
       coalesce(cs.target_child_finish_count, 0)::int as target_child_finish_count,
       coalesce(cs.forbidden_stamped_child_count, 0)::int as forbidden_stamped_child_count,
       coalesce(ids.identities, '[]'::jsonb) as identities,
       coalesce(ids.active_identity_count, 0)::int as active_identity_count,
       coalesce(ext.active_external_mapping_count, 0)::int as active_external_mapping_count,
       coalesce(vault.vault_parent_ref_count, 0)::int as vault_parent_ref_count,
       coalesce(vault.vault_target_child_ref_count, 0)::int as vault_target_child_ref_count
     from target_parent tp
     left join child_summary cs on cs.parent_id = tp.id
     left join identity_summary ids on ids.parent_id = tp.id
     left join external_summary ext on ext.parent_id = tp.id
     left join vault_summary vault on vault.parent_id = tp.id
     order by tp.source_number_plain, tp.card_name, tp.target_variant_key`,
    [JSON.stringify(targets)],
  );

  return result.rows;
}

function classify(row) {
  const blockers = [];
  if (row.evidence_tier === 'product_family_only') blockers.push('product_family_only_requires_manual_adjudication_before_child_action');
  if (row.evidence_tier === 'same_row_single_source') blockers.push('same_row_single_source_requires_second_independent_source_before_child_action');
  if (Number(row.active_identity_count) !== 1) blockers.push('existing_parent_active_identity_not_exactly_one');
  if (Number(row.forbidden_stamped_child_count) > 0) blockers.push('forbidden_stamped_child_finish_exists');

  if (Number(row.target_child_finish_count) > 0 && blockers.length === 0) {
    return { collision_status: 'existing_parent_already_satisfies_target_finish', blockers };
  }
  if (Number(row.target_child_finish_count) > 0) {
    return { collision_status: 'existing_parent_has_target_finish_but_blocked_by_evidence_or_identity', blockers };
  }
  if (blockers.length === 0) {
    return { collision_status: 'existing_parent_missing_target_child_finish_after_evidence_gate', blockers };
  }
  return { collision_status: 'existing_parent_missing_target_child_finish_blocked', blockers };
}

function renderMarkdown(report) {
  const rows = report.rows.map((row) => [
    row.source_card_number,
    row.card_name,
    row.target_variant_key,
    row.target_finish_key,
    row.existing_parent_id,
    row.child_printings.map((child) => child.finish_key).join(', '),
    row.collision_status,
    row.blockers.join(', '),
  ]);
  return `# English Master Index SV03 Existing Stamped Parent Collision Audit V1

Generated: ${report.generated_at}

Read-only audit of existing SV03 stamped parent rows that blocked insert readiness. No database writes, migrations, cleanup, quarantine, insertions, deletions, or apply SQL were performed.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_collision_rows', report.summary.target_collision_rows],
    ['existing_parent_rows_found', report.summary.existing_parent_rows_found],
    ['existing_parent_missing_target_child_finish', report.summary.existing_parent_missing_target_child_finish],
    ['existing_parent_has_target_child_finish', report.summary.existing_parent_has_target_child_finish],
    ['forbidden_stamped_child_finishes', report.summary.forbidden_stamped_child_finishes],
    ['write_ready_now', report.summary.write_ready_now],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Status Counts

${markdownTable(['status', 'rows'], Object.entries(report.summary.by_collision_status))}

## Rows

${markdownTable(['number', 'card', 'variant', 'target_finish', 'existing_parent_id', 'existing_child_finishes', 'status', 'blockers'], rows)}

## Boundary

This audit does not authorize child inserts or parent cleanup. Existing stamped parents with product-family-only evidence remain blocked until adjudication. Existing parents with missing target child finishes require a separate guarded dry-run package if later approved.
`;
}

async function main() {
  const readiness = await readJson(INPUT_JSON);
  const targets = targetRows(readiness);
  const conn = connectionString();
  if (!conn) throw new Error('SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required for read-only collision audit.');

  const client = new Client({ connectionString: conn });
  await client.connect();
  let dbRows;
  try {
    await client.query('begin read only');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '60s'");
    dbRows = await captureExistingParents(client, targets);
    await client.query('rollback');
  } finally {
    await client.end();
  }

  const rows = dbRows.map((row) => {
    const classified = classify(row);
    const childPrintings = Array.isArray(row.child_printings) ? row.child_printings : JSON.parse(row.child_printings ?? '[]');
    const identities = Array.isArray(row.identities) ? row.identities : JSON.parse(row.identities ?? '[]');
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      source_card_number: row.source_card_number,
      source_number_plain: row.source_number_plain,
      card_name: row.card_name,
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      evidence_tier: row.evidence_tier,
      source_readiness_status: row.source_readiness_status,
      base_parent_id: row.base_parent_id,
      expected_target_parent_id: row.expected_target_parent_id,
      expected_target_child_id: row.expected_target_child_id,
      existing_parent_id: row.id,
      existing_parent_number: row.number,
      existing_parent_number_plain: row.number_plain,
      existing_parent_variant_key: row.variant_key,
      existing_parent_printed_identity_modifier: row.printed_identity_modifier,
      existing_parent_gv_id: row.gv_id,
      child_printing_count: Number(row.child_printing_count ?? 0),
      child_printings: childPrintings,
      target_child_finish_count: Number(row.target_child_finish_count ?? 0),
      forbidden_stamped_child_count: Number(row.forbidden_stamped_child_count ?? 0),
      active_identity_count: Number(row.active_identity_count ?? 0),
      identities,
      active_external_mapping_count: Number(row.active_external_mapping_count ?? 0),
      vault_parent_ref_count: Number(row.vault_parent_ref_count ?? 0),
      vault_target_child_ref_count: Number(row.vault_target_child_ref_count ?? 0),
      ...classified,
    };
  });

  const report = {
    version: OUT_BASENAME,
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
    source_readiness_fingerprint: readiness.package_fingerprint_sha256,
    fingerprint_sha256: sha256(stableJson(rows.map((row) => ({
      set_key: row.set_key,
      source_number_plain: row.source_number_plain,
      card_name: normalizeText(row.card_name),
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      existing_parent_id: row.existing_parent_id,
      child_finish_keys: row.child_printings.map((child) => child.finish_key).sort(),
      collision_status: row.collision_status,
      blockers: row.blockers,
    })))),
    summary: {
      target_collision_rows: targets.length,
      existing_parent_rows_found: rows.length,
      existing_parent_missing_target_child_finish: rows.filter((row) => row.target_child_finish_count === 0).length,
      existing_parent_has_target_child_finish: rows.filter((row) => row.target_child_finish_count > 0).length,
      forbidden_stamped_child_finishes: rows.reduce((sum, row) => sum + row.forbidden_stamped_child_count, 0),
      write_ready_now: 0,
      by_collision_status: countBy(rows, (row) => row.collision_status),
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
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

await main();
