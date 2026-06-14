import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const MIRROR_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_existing_stamped_parent_collision_audit_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_sv03_existing_stamped_parent_identity_backfill_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_sv03_existing_stamped_parent_identity_backfill_readiness_v1.md');
const MIRROR_JSON = path.join(MIRROR_DIR, 'english_master_index_sv03_existing_stamped_parent_identity_backfill_readiness_v1.json');
const MIRROR_MD = path.join(MIRROR_DIR, 'english_master_index_sv03_existing_stamped_parent_identity_backfill_readiness_v1.md');

const PACKAGE_ID = 'SV03-EXISTING-STAMPED-PARENT-IDENTITY-BACKFILL-READINESS-V1';
const ACTIVE_CHILD_FINISHES = new Set(['normal', 'holo', 'reverse', 'cosmos', 'cracked_ice']);

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
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function buildTargets(source) {
  return (source.rows ?? [])
    .filter((row) => row.collision_status === 'existing_parent_missing_target_child_finish_blocked')
    .filter((row) => row.existing_parent_id)
    .map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_name: row.card_name,
      card_number: row.source_card_number,
      source_number_plain: row.source_number_plain,
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      evidence_tier: row.evidence_tier,
      source_readiness_status: row.source_readiness_status,
      existing_parent_id: row.existing_parent_id,
      base_parent_id: row.base_parent_id,
      expected_target_child_id: row.expected_target_child_id,
      source_collision_audit_fingerprint: source.fingerprint_sha256,
    }));
}

async function queryReadiness(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         set_key text,
         set_name text,
         card_name text,
         card_number text,
         source_number_plain text,
         target_variant_key text,
         target_finish_key text,
         evidence_tier text,
         source_readiness_status text,
         existing_parent_id uuid,
         base_parent_id uuid,
         expected_target_child_id uuid,
         source_collision_audit_fingerprint text
       )
     ),
     parent_projection as (
       select
         target.*,
         cp.id as live_parent_id,
         cp.set_id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.variant_key,
         cp.printed_identity_modifier,
         cp.gv_id,
         cp.printed_total,
         cp.printed_set_abbrev,
         cp.identity_domain,
         s.source as set_source,
         s.code as source_set_code,
         public.card_print_identity_backfill_projection_v1(
           s.source,
           cp.set_code,
           s.code,
           cp.number,
           cp.number_plain,
           cp.name,
           cp.variant_key,
           coalesce(cp.printed_total, s.printed_total),
           coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
         ) as projected
       from target
       left join public.card_prints cp on cp.id = target.existing_parent_id
       left join public.sets s on s.id = cp.set_id
     )
     select
       pp.*,
       coalesce((
         select jsonb_agg(jsonb_build_object(
           'id', cpr.id::text,
           'finish_key', cpr.finish_key,
           'is_provisional', cpr.is_provisional
         ) order by cpr.finish_key, cpr.id)
         from public.card_printings cpr
         where cpr.card_print_id = pp.live_parent_id
       ), '[]'::jsonb) as child_printings,
       coalesce((
         select jsonb_agg(jsonb_build_object(
           'id', cpi.id::text,
           'identity_domain', cpi.identity_domain,
           'set_code_identity', cpi.set_code_identity,
           'printed_number', cpi.printed_number,
           'normalized_printed_name', cpi.normalized_printed_name,
           'identity_key_version', cpi.identity_key_version,
           'identity_key_hash', cpi.identity_key_hash,
           'is_active', cpi.is_active
         ) order by cpi.is_active desc, cpi.id)
         from public.card_print_identity cpi
         where cpi.card_print_id = pp.live_parent_id
       ), '[]'::jsonb) as identities,
       (
         select count(*)::int
         from public.card_print_identity cpi
         where cpi.card_print_id = pp.live_parent_id
           and cpi.is_active = true
       ) as active_identity_count,
       (
         select count(*)::int
         from public.card_print_identity cpi
         where cpi.is_active = true
           and cpi.card_print_id <> pp.live_parent_id
           and cpi.identity_domain = pp.projected->>'identity_domain'
           and cpi.identity_key_version = pp.projected->>'identity_key_version'
           and cpi.identity_key_hash = pp.projected->>'identity_key_hash'
       ) as projected_identity_hash_collision_count,
       (
         select count(*)::int
         from public.card_printings cpr
         where cpr.id = pp.expected_target_child_id
       ) as expected_target_child_id_collision_count,
       (
         select count(*)::int
         from public.card_printings cpr
         where cpr.card_print_id = pp.live_parent_id
           and cpr.finish_key = pp.target_finish_key
       ) as existing_target_finish_child_count,
       (
         select count(*)::int
         from public.finish_keys fk
         where fk.key = pp.target_finish_key
           and fk.is_active = true
       ) as active_finish_key_count
     from parent_projection pp
     order by pp.set_key, pp.source_number_plain, pp.card_name, pp.target_variant_key`,
    [JSON.stringify(targets)],
  );

  return result.rows;
}

function classify(row) {
  const blockers = [];
  const warnings = [];
  const projected = row.projected ?? {};
  const childPrintings = row.child_printings ?? [];

  if (!row.live_parent_id) blockers.push('existing_parent_missing');
  if (row.set_key !== 'sv03') blockers.push('non_sv03_target');
  if (!row.target_variant_key || row.variant_key !== row.target_variant_key) blockers.push('target_variant_mismatch');
  if (row.active_identity_count !== 0) blockers.push('active_identity_already_exists_or_ambiguous');
  if (projected.status !== 'ready') blockers.push(`identity_projection_not_ready:${projected.status ?? 'missing'}`);
  if (row.projected_identity_hash_collision_count !== 0) blockers.push('projected_identity_hash_collision');
  if (row.expected_target_child_id_collision_count !== 0) blockers.push('expected_target_child_id_collision');
  if (row.active_finish_key_count !== 1) blockers.push('target_finish_key_inactive_or_missing');
  if (!ACTIVE_CHILD_FINISHES.has(row.target_finish_key)) blockers.push('target_finish_not_allowed_active_child_finish');
  if (childPrintings.some((child) => child.finish_key === 'stamped')) blockers.push('forbidden_stamped_child_finish_present');

  if (row.printed_identity_modifier !== row.target_variant_key) warnings.push('parent_printed_identity_modifier_needs_backfill');
  if (row.existing_target_finish_child_count === 0) warnings.push('target_child_finish_missing');
  if (row.evidence_tier === 'product_family_only') warnings.push('child_insert_evidence_still_requires_manual_adjudication');

  let readiness_status = 'ready_for_guarded_identity_backfill_dry_run_preparation';
  if (blockers.length > 0) readiness_status = 'blocked_before_identity_backfill_dry_run';

  let child_action_status = 'blocked_before_child_insert';
  if (row.existing_target_finish_child_count > 0) child_action_status = 'target_child_finish_already_present';
  else if (row.evidence_tier === 'multi_lane' && blockers.length === 0) child_action_status = 'identity_backfill_first_then_child_insert_dry_run_candidate';
  else if (row.evidence_tier === 'product_family_only') child_action_status = 'manual_adjudication_required_before_child_insert';

  return { blockers, warnings, readiness_status, child_action_status };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index SV03 Existing Stamped Parent Identity Backfill Readiness V1');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push('');
  lines.push('Read-only readiness report for existing SV03 stamped parents that already exist in `card_prints` but have no active identity row and are missing the target child finish. No database writes, migrations, cleanup, quarantine, insertions, deletions, or apply SQL were performed.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(markdownTable(
    ['metric', 'value'],
    Object.entries({
      target_rows: report.summary.target_rows,
      identity_backfill_ready_rows: report.summary.identity_backfill_ready_rows,
      blocked_identity_backfill_rows: report.summary.blocked_identity_backfill_rows,
      child_insert_candidate_after_identity_backfill: report.summary.child_insert_candidate_after_identity_backfill,
      child_insert_manual_adjudication_required: report.summary.child_insert_manual_adjudication_required,
      write_ready_now: report.write_ready_now,
      fingerprint_sha256: `\`${report.fingerprint_sha256}\``,
    }),
  ));
  lines.push('');
  lines.push('## Identity Readiness Counts');
  lines.push('');
  lines.push(markdownTable(['status', 'rows'], Object.entries(report.summary.by_readiness_status)));
  lines.push('');
  lines.push('## Child Action Counts');
  lines.push('');
  lines.push(markdownTable(['status', 'rows'], Object.entries(report.summary.by_child_action_status)));
  lines.push('');
  lines.push('## Rows');
  lines.push('');
  lines.push(markdownTable(
    ['number', 'card', 'variant', 'target_finish', 'identity_status', 'child_status', 'blockers', 'warnings'],
    report.rows.map((row) => [
      row.card_number,
      row.card_name,
      row.target_variant_key,
      row.target_finish_key,
      row.readiness_status,
      row.child_action_status,
      row.blockers.join(', ') || 'none',
      row.warnings.join(', ') || 'none',
    ]),
  ));
  lines.push('');
  lines.push('## Boundary');
  lines.push('');
  lines.push('This report only prepares the next guarded package shape. It does not authorize identity backfill or child printing inserts. Product-family-only finish evidence remains blocked from child insert until manual adjudication or an exact independent source is added.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const source = await readJson(SOURCE_JSON);
  const targets = buildTargets(source);
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL for read-only DB audit.');

  const client = new Client({ connectionString: conn });
  await client.connect();

  let dbRows;
  try {
    await client.query('begin read only');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    dbRows = await queryReadiness(client, targets);
    await client.query('rollback');
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Ignore rollback errors after a failed read-only audit.
    }
    throw error;
  } finally {
    await client.end();
  }

  const rows = dbRows.map((row) => {
    const classified = classify(row);
    return {
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      source_number_plain: row.source_number_plain,
      card_name: row.card_name,
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      evidence_tier: row.evidence_tier,
      source_readiness_status: row.source_readiness_status,
      existing_parent_id: row.live_parent_id,
      base_parent_id: row.base_parent_id,
      existing_parent_printed_identity_modifier: row.printed_identity_modifier,
      projected_identity_status: row.projected?.status ?? null,
      projected_identity_domain: row.projected?.identity_domain ?? null,
      projected_set_code_identity: row.projected?.set_code_identity ?? null,
      projected_printed_number: row.projected?.printed_number ?? null,
      projected_normalized_printed_name: row.projected?.normalized_printed_name ?? null,
      projected_identity_key_version: row.projected?.identity_key_version ?? null,
      projected_identity_key_hash: row.projected?.identity_key_hash ?? null,
      child_printings: row.child_printings ?? [],
      active_identity_count: row.active_identity_count,
      identities: row.identities ?? [],
      projected_identity_hash_collision_count: row.projected_identity_hash_collision_count,
      expected_target_child_id_collision_count: row.expected_target_child_id_collision_count,
      existing_target_finish_child_count: row.existing_target_finish_child_count,
      active_finish_key_count: row.active_finish_key_count,
      readiness_status: classified.readiness_status,
      child_action_status: classified.child_action_status,
      blockers: classified.blockers,
      warnings: classified.warnings,
    };
  });

  const summary = {
    target_rows: rows.length,
    identity_backfill_ready_rows: rows.filter((row) => row.readiness_status === 'ready_for_guarded_identity_backfill_dry_run_preparation').length,
    blocked_identity_backfill_rows: rows.filter((row) => row.readiness_status !== 'ready_for_guarded_identity_backfill_dry_run_preparation').length,
    child_insert_candidate_after_identity_backfill: rows.filter((row) => row.child_action_status === 'identity_backfill_first_then_child_insert_dry_run_candidate').length,
    child_insert_manual_adjudication_required: rows.filter((row) => row.child_action_status === 'manual_adjudication_required_before_child_insert').length,
    by_readiness_status: countBy(rows, (row) => row.readiness_status),
    by_child_action_status: countBy(rows, (row) => row.child_action_status),
    by_evidence_tier: countBy(rows, (row) => row.evidence_tier),
    by_blocker: countBy(rows.flatMap((row) => row.blockers), (blocker) => blocker),
    by_warning: countBy(rows.flatMap((row) => row.warnings), (warning) => warning),
  };

  const fingerprintPayload = {
    package_id: PACKAGE_ID,
    source_fingerprint: source.fingerprint_sha256,
    rows: rows.map((row) => ({
      existing_parent_id: row.existing_parent_id,
      card_number: row.card_number,
      card_name: row.card_name,
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      projected_identity_key_hash: row.projected_identity_key_hash,
      readiness_status: row.readiness_status,
      child_action_status: row.child_action_status,
      blockers: row.blockers,
    })),
  };

  const report = {
    version: 1,
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_reads_performed: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifact: path.relative(ROOT, SOURCE_JSON),
    source_collision_audit_fingerprint: source.fingerprint_sha256,
    fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
    summary,
    rows,
    safety_confirmation: {
      no_apply_sql_generated: true,
      no_db_writes_performed: true,
      no_migrations_created: true,
      no_cleanup_or_quarantine_performed: true,
      stamped_is_parent_identity_not_child_finish: true,
    },
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeJson(MIRROR_JSON, report);
  await writeText(MIRROR_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: path.relative(ROOT, OUTPUT_JSON),
    mirror_json: path.relative(ROOT, MIRROR_JSON),
    fingerprint_sha256: report.fingerprint_sha256,
    summary,
    db_writes_performed: false,
    migrations_created: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
