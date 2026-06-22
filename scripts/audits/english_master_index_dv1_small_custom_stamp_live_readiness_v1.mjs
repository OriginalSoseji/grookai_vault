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
const INPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_small_custom_stamp_next_readiness_v1.json',
);
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_dv1_small_custom_stamp_live_readiness_v1.json',
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  'english_master_index_dv1_small_custom_stamp_live_readiness_v1.md',
);

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
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function readinessStatus(row) {
  const blockers = [];
  if (!row.base_parent_id) blockers.push('missing_base_parent');
  if (!row.base_holo_child_exists) blockers.push('missing_base_holo_child');
  if (!row.finish_key_active) blockers.push('inactive_finish_key');
  if (row.identity_projection_status !== 'ready') blockers.push(`identity_projection_${row.identity_projection_status ?? 'missing'}`);
  if (Number(row.identity_hash_collision_count) > 0) blockers.push('identity_hash_collision');

  const targetParentExists = Boolean(row.target_parent_id);
  const targetChildExists = Boolean(row.target_child_id);
  const targetIdentityExists = Boolean(row.target_identity_id);

  if (!blockers.length && targetParentExists && targetChildExists && targetIdentityExists) {
    return {
      live_readiness_status: 'already_satisfied_live',
      blockers: [],
      recommended_next_action: 'No write package needed for this row; live DB already has target parent, active identity, and holo child.',
    };
  }

  if (!blockers.length && !targetParentExists && !targetChildExists && !targetIdentityExists) {
    return {
      live_readiness_status: 'ready_for_fresh_guarded_dry_run_artifact',
      blockers: [],
      recommended_next_action: 'Prepare a fresh rollback-only guarded dry-run artifact if operator wants to advance this lane. No real apply from this report.',
    };
  }

  if (!blockers.length && (targetParentExists || targetChildExists || targetIdentityExists)) {
    return {
      live_readiness_status: 'partial_live_state_needs_manual_review',
      blockers: ['partial_target_state'],
      recommended_next_action: 'Do not package automatically. Inspect partial target parent/child/identity state first.',
    };
  }

  return {
    live_readiness_status: 'blocked_live_readiness',
    blockers,
    recommended_next_action: 'Do not package. Resolve blockers before any dry-run artifact.',
  };
}

async function buildRows(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         set_key text,
         card_number text,
         card_name text,
         variant_key text,
         stamp_label text,
         finish_key text
       )
     ),
     base as (
       select
         target.*,
         cp.id as base_parent_id,
         cp.set_id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.printed_total,
         cp.printed_set_abbrev,
         exists (
           select 1
           from public.card_printings base_child
           where base_child.card_print_id = cp.id
             and base_child.finish_key = target.finish_key
         ) as base_holo_child_exists
       from target
       left join public.card_prints cp
         on cp.set_code = target.set_key
        and coalesce(cp.number_plain, cp.number) = regexp_replace(target.card_number, '^0+(?=\\d)', '')
        and lower(cp.name) = lower(target.card_name)
        and coalesce(cp.variant_key, '') = ''
     ),
     target_parent as (
       select
         base.*,
         tcp.id as target_parent_id,
         tcpr.id as target_child_id,
         cpi.id as target_identity_id
       from base
       left join public.card_prints tcp
         on tcp.set_id = base.set_id
        and coalesce(tcp.number_plain, tcp.number) = coalesce(base.number_plain, base.number)
        and lower(tcp.name) = lower(base.name)
        and coalesce(tcp.variant_key, '') = base.variant_key
       left join public.card_printings tcpr
         on tcpr.card_print_id = tcp.id
        and tcpr.finish_key = base.finish_key
       left join public.card_print_identity cpi
         on cpi.card_print_id = tcp.id
        and cpi.is_active = true
     ),
     projection as (
       select
         target_parent.*,
         public.card_print_identity_backfill_projection_v1(
           s.source,
           target_parent.set_code,
           s.code,
           target_parent.number,
           target_parent.number_plain,
           target_parent.name,
           target_parent.variant_key,
           coalesce(target_parent.printed_total, s.printed_total),
           coalesce(target_parent.printed_set_abbrev, s.printed_set_abbrev)
         ) as projected
       from target_parent
       left join public.sets s on s.id = target_parent.set_id
     )
     select
       projection.set_key,
       projection.card_number,
       projection.card_name,
       projection.variant_key,
       projection.stamp_label,
       projection.finish_key,
       projection.base_parent_id::text,
       projection.target_parent_id::text,
       projection.target_child_id::text,
       projection.target_identity_id::text,
       projection.base_holo_child_exists,
       exists(select 1 from public.finish_keys fk where fk.key = projection.finish_key and fk.is_active = true) as finish_key_active,
       projection.projected->>'status' as identity_projection_status,
       (
         select count(*)::int
         from public.card_print_identity existing
         where existing.is_active = true
           and existing.card_print_id <> coalesce(projection.target_parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
           and existing.identity_domain = projection.projected->>'identity_domain'
           and existing.identity_key_version = projection.projected->>'identity_key_version'
           and existing.identity_key_hash = projection.projected->>'identity_key_hash'
       ) as identity_hash_collision_count
     from projection
     order by projection.set_key, projection.card_number::int, projection.card_name`,
    [JSON.stringify(targets)],
  );

  return result.rows.map((row) => ({
    ...row,
    ...readinessStatus(row),
    write_ready_now: false,
  }));
}

function buildMarkdown(report) {
  return `# DV1 Small Custom Stamp Live Readiness V1

Read-only live DB readiness check for Dragon Vault small custom stamp refresh candidates.

## Summary

${markdownTable(['metric', 'value'], [
    ['target_rows', report.summary.target_rows],
    ['ready_for_fresh_guarded_dry_run_artifact', report.summary.by_live_readiness_status.ready_for_fresh_guarded_dry_run_artifact ?? 0],
    ['already_satisfied_live', report.summary.by_live_readiness_status.already_satisfied_live ?? 0],
    ['partial_live_state_needs_manual_review', report.summary.by_live_readiness_status.partial_live_state_needs_manual_review ?? 0],
    ['blocked_live_readiness', report.summary.by_live_readiness_status.blocked_live_readiness ?? 0],
    ['write_ready_now', report.summary.write_ready_now],
    ['db_writes_performed', report.safety.db_writes_performed],
    ['migrations_created', report.safety.migrations_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Rows

${markdownTable(
    ['status', 'set', 'number', 'card', 'stamp', 'finish', 'base parent', 'target parent', 'target child', 'target identity', 'blockers'],
    report.rows.map((row) => [
      row.live_readiness_status,
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.finish_key,
      row.base_parent_id ? 'yes' : 'no',
      row.target_parent_id ? 'yes' : 'no',
      row.target_child_id ? 'yes' : 'no',
      row.target_identity_id ? 'yes' : 'no',
      row.blockers.join(', ') || 'none',
    ]),
  )}

## Safety

- Read-only live DB check.
- No DB writes.
- No migrations.
- No SQL artifact generated.
- No rollback transaction executed.
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL.');

  const input = await readJson(INPUT_JSON);
  const targets = (input.rows ?? [])
    .filter((row) => row.readiness_status === 'refresh_existing_guarded_package_candidate')
    .map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      finish_key: row.finish_keys?.[0] ?? 'holo',
    }));

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const rows = await buildRows(client, targets);
    const report = {
      generated_at: new Date().toISOString(),
      version: 'english_master_index_dv1_small_custom_stamp_live_readiness_v1',
      input_report: rel(INPUT_JSON),
      audit_only: true,
      safety: {
        db_writes_performed: false,
        durable_db_writes_performed: false,
        migrations_created: false,
        apply_performed: false,
        cleanup_performed: false,
        quarantine_performed: false,
        global_apply_performed: false,
        sql_generated: false,
        rollback_transaction_executed: false,
      },
      summary: {
        target_rows: rows.length,
        write_ready_now: 0,
        by_live_readiness_status: countBy(rows, (row) => row.live_readiness_status),
      },
      rows,
    };
    report.fingerprint_sha256 = sha256(stableJson({
      summary: report.summary,
      rows: rows.map((row) => ({
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        variant_key: row.variant_key,
        finish_key: row.finish_key,
        live_readiness_status: row.live_readiness_status,
        blockers: row.blockers,
        base_parent_id: row.base_parent_id,
        target_parent_id: row.target_parent_id,
        target_child_id: row.target_child_id,
        target_identity_id: row.target_identity_id,
      })),
    }));

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, buildMarkdown(report));

    console.log(JSON.stringify({
      output_json: rel(OUTPUT_JSON),
      output_md: rel(OUTPUT_MD),
      summary: report.summary,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
