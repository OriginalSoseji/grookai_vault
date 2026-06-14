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
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const PKG15K_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15k_stamped_identity_expansion_candidates_v1.json');
const PKG15J_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15j_stamped_identity_granularity_plan_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg15n_stamped_review_ready_parent_insert_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg15n_stamped_review_ready_parent_insert_readiness_v1.md');

const PACKAGE_ID = 'PKG-15N-STAMPED-REVIEW-READY-PARENT-INSERT-READINESS';
const FUTURE_PACKAGE_ID = 'PKG-15O-STAMPED-REVIEW-READY-PARENT-INSERTS';

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
  for (const row of rows) counts[keyFn(row)] = (counts[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function buildTargets(pkg15k) {
  return (pkg15k.rows ?? [])
    .filter((row) => String(row.expansion_status ?? '').endsWith('finish_multi_source_review_ready'))
    .map((row) => {
      const numberPlain = normalizeNumber(row.card_number);
      const targetParentId = uuidFromSeed(`${FUTURE_PACKAGE_ID}:parent:${row.set_key}:${numberPlain}:${normalizeText(row.card_name)}:${row.expanded_variant_key}`);
      const targetChildId = uuidFromSeed(`${FUTURE_PACKAGE_ID}:child:${row.set_key}:${numberPlain}:${normalizeText(row.card_name)}:${row.expanded_variant_key}:${row.finish_key}`);
      return {
        target_parent_id: targetParentId,
        target_child_id: targetChildId,
        set_key: row.set_key,
        set_name: row.set_name,
        source_card_number: row.card_number,
        source_number_plain: numberPlain,
        card_name: row.card_name,
        target_variant_key: row.expanded_variant_key,
        stamp_label: row.expanded_stamp_label,
        target_finish_key: row.finish_key,
        current_master_variant_key: row.current_master_variant_key,
        expansion_status: row.expansion_status,
        independent_finish_sources: row.independent_finish_sources ?? [],
        independent_identity_sources: row.independent_identity_sources ?? [],
        evidence_context: {
          pkg15k_source_url: row.source_url,
          pkg15k_source_title: row.source_title,
          matching_manual_web_finish_context: row.matching_manual_web_finish_context ?? [],
          matching_pricecharting_identity_context: row.matching_pricecharting_identity_context ?? [],
        },
      };
    })
    .sort((left, right) => String(left.set_key).localeCompare(String(right.set_key))
      || String(left.source_number_plain).localeCompare(String(right.source_number_plain), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name))
      || String(left.target_variant_key).localeCompare(String(right.target_variant_key)));
}

function packageFingerprint(pkg15k, targets) {
  return sha256(stableJson({
    package_id: FUTURE_PACKAGE_ID,
    source_pkg15k_fingerprint: pkg15k.fingerprint_sha256,
    targets: targets.map((row) => ({
      set_key: row.set_key,
      source_number_plain: row.source_number_plain,
      card_name: normalizeText(row.card_name),
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      finish_sources: row.independent_finish_sources,
    })),
  }));
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
         stamp_label text,
         target_finish_key text,
         expansion_status text
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
         coalesce(cp.variant_key, '') as variant_key,
         cp.printed_identity_modifier,
         cp.printed_total,
         cp.printed_set_abbrev,
         cp.identity_domain,
         cp.set_identity_model,
         row_number() over (
           partition by target.target_parent_id
           order by
             case when coalesce(cp.variant_key, '') = '' then 0 else 1 end,
             cp.number
         ) as candidate_rank
       from target
       join public.card_prints cp
         on cp.set_code = target.set_key
        and lower(cp.name) = lower(target.card_name)
        and (
          coalesce(cp.number_plain, cp.number) = target.source_number_plain
          or cp.number = target.source_card_number
        )
        and coalesce(cp.variant_key, '') in ('', coalesce(target.expansion_status, ''))
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
       coalesce(target_parent_collision.parent_collision_count, 0)::int as target_parent_collision_count,
       coalesce(target_child_collision.child_collision_count, 0)::int as target_child_id_collision_count,
       coalesce(active_finish.active_finish_exists, false) as active_finish_exists,
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
       select true as active_finish_exists
       from public.finish_keys fk
       where fk.key = target.target_finish_key
         and fk.is_active = true
       limit 1
     ) active_finish on true
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
     order by target.set_key, target.source_number_plain, target.card_name, target.target_variant_key`,
    [JSON.stringify(targets)],
  );

  return result.rows;
}

function classifyReadiness(row) {
  const blockers = [];
  if (Number(row.base_candidate_count) !== 1) blockers.push('base_parent_not_unique');
  if (!row.base_parent_id) blockers.push('base_parent_missing');
  if (!row.active_finish_exists) blockers.push('active_finish_key_missing_or_inactive');
  if (!row.base_finish_exists) blockers.push('base_parent_lacks_same_active_finish_context');
  if (Number(row.target_parent_collision_count) > 0) blockers.push('target_stamped_parent_already_exists');
  if (Number(row.target_child_id_collision_count) > 0) blockers.push('target_child_id_collision');
  if (Number(row.existing_target_child_count) > 0) blockers.push('target_child_finish_already_exists');
  if (!row.ready_identity_projection) blockers.push('identity_projection_not_ready');
  if (Number(row.identity_hash_collision_count) > 0) blockers.push('identity_hash_collision');

  if (blockers.length === 0) return { readiness_status: 'ready_for_guarded_dry_run_parent_child_insert', blockers };
  return { readiness_status: 'blocked_before_dry_run', blockers };
}

function renderMarkdown(report) {
  const summaryRows = Object.entries(report.summary.by_readiness_status).map(([status, count]) => [status, count]);
  const targetRows = report.rows.map((row) => [
    row.set_key,
    row.source_card_number,
    row.base_parent_number ?? '',
    row.card_name,
    row.target_variant_key,
    row.target_finish_key,
    row.base_parent_id ?? '',
    row.readiness_status,
    row.blockers.join(', '),
  ]);

  return `# PKG-15N Stamped Review-Ready Parent Insert Readiness V1

Read-only readiness package for stamped rows that now have multi-source active-finish support.

## Safety

- audit_only: ${report.audit_only}
- db_reads_performed: ${report.db_reads_performed}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- write_ready_now: ${report.write_ready_now}

## Summary

- target_rows: ${report.summary.target_rows}
- ready_for_guarded_dry_run_parent_child_insert: ${report.summary.ready_for_guarded_dry_run_parent_child_insert}
- blocked_before_dry_run: ${report.summary.blocked_before_dry_run}
- expected_parent_inserts: ${report.summary.expected_parent_inserts}
- expected_child_inserts: ${report.summary.expected_child_inserts}
- expected_deletes: 0
- expected_merges: 0
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`

${markdownTable(['readiness_status', 'rows'], summaryRows)}

## Targets

${markdownTable(['set', 'source_number', 'base_number', 'name', 'variant', 'finish', 'base_parent_id', 'status', 'blockers'], targetRows)}

## Next Boundary

If this package is approved later, the next step is a separate rollback-only guarded dry-run artifact for \`${FUTURE_PACKAGE_ID}\`. That future artifact must insert stamped parent identities and child printings only. It must not delete, merge, quarantine, activate \`finish_key=stamped\`, or mutate base parent rows.
`;
}

async function main() {
  const [pkg15k, pkg15j] = await Promise.all([
    readJson(PKG15K_JSON),
    readJson(PKG15J_JSON),
  ]);
  const targets = buildTargets(pkg15k);
  const pkgFingerprint = packageFingerprint(pkg15k, targets);
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
      target_parent_collision_count: Number(row.target_parent_collision_count ?? 0),
      target_child_id_collision_count: Number(row.target_child_id_collision_count ?? 0),
      existing_target_child_count: Number(row.existing_target_child_count ?? 0),
      active_finish_exists: Boolean(row.active_finish_exists),
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
  const readyRows = rows.filter((row) => row.readiness_status === 'ready_for_guarded_dry_run_parent_child_insert');
  const fingerprintPayload = {
    package_id: PACKAGE_ID,
    future_package_id: FUTURE_PACKAGE_ID,
    source_pkg15k_fingerprint: pkg15k.fingerprint_sha256,
    source_pkg15j_fingerprint: pkg15j.fingerprint_sha256,
    package_fingerprint_sha256: pkgFingerprint,
    rows: rows.map((row) => ({
      set_key: row.set_key,
      source_number_plain: row.source_number_plain,
      base_parent_id: row.base_parent_id,
      base_parent_number: row.base_parent_number,
      card_name: normalizeText(row.card_name),
      target_variant_key: row.target_variant_key,
      target_finish_key: row.target_finish_key,
      target_parent_id: row.target_parent_id,
      target_child_id: row.target_child_id,
      readiness_status: row.readiness_status,
      blockers: row.blockers,
    })),
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg15n_stamped_review_ready_parent_insert_readiness_v1',
    package_id: PACKAGE_ID,
    future_package_id: FUTURE_PACKAGE_ID,
    audit_only: true,
    db_reads_performed: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: {
      pkg15k_stamped_identity_expansion_candidates: path.relative(ROOT, PKG15K_JSON).replaceAll('\\', '/'),
      pkg15j_stamped_identity_granularity_plan: path.relative(ROOT, PKG15J_JSON).replaceAll('\\', '/'),
    },
    source_fingerprints: {
      pkg15k: pkg15k.fingerprint_sha256,
      pkg15j: pkg15j.fingerprint_sha256,
    },
    package_fingerprint_sha256: pkgFingerprint,
    report_fingerprint_sha256: sha256(stableJson(fingerprintPayload)),
    summary: {
      target_rows: rows.length,
      ready_for_guarded_dry_run_parent_child_insert: readyRows.length,
      blocked_before_dry_run: rows.length - readyRows.length,
      expected_parent_inserts: readyRows.length,
      expected_child_inserts: readyRows.length,
      expected_identity_inserts: readyRows.length,
      expected_deletes: 0,
      expected_merges: 0,
      base_parent_vault_refs: rows.reduce((sum, row) => sum + row.base_parent_vault_ref_count, 0),
      base_finish_child_vault_refs: rows.reduce((sum, row) => sum + row.base_finish_child_vault_ref_count, 0),
      base_parent_external_mappings: rows.reduce((sum, row) => sum + row.base_parent_external_mapping_count, 0),
      by_readiness_status: countBy(rows, (row) => row.readiness_status),
      by_set: countBy(rows, (row) => row.set_key),
      by_finish_key: countBy(rows, (row) => row.target_finish_key),
    },
    rows,
    next_boundary: {
      recommended_next_step: 'Prepare rollback-only guarded dry-run transaction artifact if operator wants to move these rows toward apply.',
      required_future_scope: 'parent card_print insert + card_print_identity insert + child card_printing insert only',
      forbidden_future_scope: ['deletes', 'merges', 'quarantine', 'finish_key=stamped activation', 'base parent mutation', 'migration'],
    },
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    target_rows: report.summary.target_rows,
    ready_for_guarded_dry_run_parent_child_insert: report.summary.ready_for_guarded_dry_run_parent_child_insert,
    blocked_before_dry_run: report.summary.blocked_before_dry_run,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
