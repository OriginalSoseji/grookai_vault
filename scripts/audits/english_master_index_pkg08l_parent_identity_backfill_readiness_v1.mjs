import crypto from 'node:crypto';
import fsSync from 'node:fs';
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
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08h_external_mapping_collision_adjudication_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08l_parent_identity_backfill_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08l_parent_identity_backfill_readiness_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08l_parent_identity_backfill_readiness_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08L-PARENT-IDENTITY-BACKFILL-READINESS';
const TARGET_LANE = 'blocked_mapped_parent_incomplete_identity';

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

function numberPlain(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (/^[A-Za-z][0-9]+$/.test(raw)) return raw.toUpperCase();
  if (/[0-9]/.test(raw)) return raw.replace(/\/.*$/, '').replace(/[^0-9]/g, '') || null;
  return raw;
}

function printedIdentityModifier(value) {
  const raw = String(value ?? '').trim();
  const prefixMatch = raw.match(/^([A-Za-z]+)(?=[0-9]+$)/);
  return prefixMatch ? `number_prefix:${prefixMatch[1].toUpperCase()}` : null;
}

async function loadLiveContext(targetRows) {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable', rows: [] };
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `with target as (
         select *
         from jsonb_to_recordset($1::jsonb) as t(
           set_key text,
           card_number text,
           card_name text,
           finish_key text,
           tcgdex_external_id text,
           card_print_id uuid
         )
       )
       select
         t.set_key,
         t.card_number,
         t.card_name,
         t.finish_key,
         t.tcgdex_external_id,
         s.id::text as expected_set_id,
         s.name as expected_set_name,
         cp.id::text as card_print_id,
         cp.set_id::text as current_set_id,
         cp.set_code as current_set_code,
         cp.number as current_number,
         cp.number_plain as current_number_plain,
         cp.name as current_name,
         cp.gv_id,
         cp.variant_key,
         cp.printed_identity_modifier,
         cp.set_identity_model,
         cp.external_ids,
         cp.ai_metadata,
         coalesce((
           select jsonb_agg(to_jsonb(cpi) order by cpi.is_active desc, cpi.id)
           from public.card_print_identity cpi
           where cpi.card_print_id = cp.id
         ), '[]'::jsonb) as identity_rows,
         coalesce((
           select jsonb_agg(cpr.finish_key order by cpr.finish_key)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), '[]'::jsonb) as child_finishes,
         coalesce((
           select count(*)::int
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), 0) as child_printing_count,
         coalesce((
           select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id)
           from public.external_mappings em
           where em.card_print_id = cp.id
         ), '[]'::jsonb) as external_mappings,
         coalesce((select count(*)::int from public.vault_items vi where vi.card_id = cp.id), 0) as vault_item_count,
         coalesce((select count(*)::int from public.vault_item_instances vii where vii.card_print_id = cp.id), 0) as vault_item_instance_count,
         coalesce((select count(*)::int from public.card_print_species cps where cps.card_print_id = cp.id), 0) as species_count,
         coalesce((select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = cp.id), 0) as trait_count,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'card_print_id', existing.id::text,
             'set_code', existing.set_code,
             'number', existing.number,
             'number_plain', existing.number_plain,
             'name', existing.name,
             'variant_key', existing.variant_key,
             'printed_identity_modifier', existing.printed_identity_modifier
           ) order by existing.id)
           from public.card_prints existing
           where existing.id <> cp.id
             and (
               existing.set_id = s.id
               or lower(coalesce(existing.set_code, '')) = lower(t.set_key)
             )
             and lower(coalesce(existing.name, '')) = lower(t.card_name)
             and (
               lower(coalesce(existing.number, '')) = lower(t.card_number)
               or lower(coalesce(existing.number_plain, '')) = lower(
                 case
                   when t.card_number ~ '^[A-Za-z]+[0-9]+$' then upper(t.card_number)
                   when t.card_number ~ '[0-9]' then regexp_replace(regexp_replace(t.card_number, '/.*$', ''), '[^0-9]', '', 'g')
                   else t.card_number
                 end
               )
             )
         ), '[]'::jsonb) as target_parent_collisions
       from target t
       join public.card_prints cp on cp.id = t.card_print_id
       left join public.sets s on lower(s.code) = lower(t.set_key)
       order by t.set_key, t.card_number, t.card_name`,
      [JSON.stringify(targetRows.map((row) => ({
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: row.finish_key,
        tcgdex_external_id: row.tcgdex_external_id,
        card_print_id: row.mapped_parent.card_print_id,
      })))],
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

function classifyRow(sourceRow, liveRow) {
  if (!liveRow) {
    return {
      readiness_lane: 'blocked_live_parent_missing',
      recommended_next_action: 'Stop. The mapped parent no longer exists.',
      blocked_reasons: ['live_parent_missing'],
    };
  }
  const activeIdentities = (liveRow.identity_rows ?? []).filter((row) => row.is_active === true);
  const activeIdentity = activeIdentities[0] ?? null;
  const targetPlain = numberPlain(sourceRow.card_number);
  const blockedReasons = [];

  if (!liveRow.expected_set_id) blockedReasons.push('expected_set_missing');
  if (normalizeText(liveRow.current_name) !== normalizeText(sourceRow.card_name)) blockedReasons.push('name_mismatch');
  if (liveRow.target_parent_collisions.length !== 0) blockedReasons.push('target_parent_collision');
  if (activeIdentities.length !== 1) blockedReasons.push('active_identity_count_not_1');
  if (activeIdentity && normalizeText(activeIdentity.set_code_identity) !== normalizeText(sourceRow.set_key)) blockedReasons.push('active_identity_set_code_mismatch');
  if (activeIdentity && normalizeText(activeIdentity.printed_number) !== normalizeText(sourceRow.card_number)) blockedReasons.push('active_identity_printed_number_mismatch');
  if (
    activeIdentity &&
    normalizeText(activeIdentity.source_name_raw ?? activeIdentity.normalized_printed_name) !== normalizeText(sourceRow.card_name)
  ) {
    blockedReasons.push('active_identity_name_mismatch');
  }
  if (!liveRow.child_finishes.includes(sourceRow.finish_key)) blockedReasons.push('target_finish_missing_on_parent');
  const exactMapping = (liveRow.external_mappings ?? []).filter((row) => (
    row.source === 'tcgdex' && row.external_id === sourceRow.tcgdex_external_id
  ));
  if (exactMapping.length !== 1) blockedReasons.push('exact_tcgdex_mapping_count_not_1');
  if (liveRow.current_set_code && normalizeText(liveRow.current_set_code) !== normalizeText(sourceRow.set_key)) blockedReasons.push('current_set_code_conflicts');
  if (liveRow.current_number && normalizeText(liveRow.current_number) !== normalizeText(sourceRow.card_number)) blockedReasons.push('current_number_conflicts');
  if (liveRow.current_number_plain && normalizeText(liveRow.current_number_plain) !== normalizeText(targetPlain)) blockedReasons.push('current_number_plain_conflicts');

  const missingFields = [];
  if (!liveRow.current_set_id) missingFields.push('set_id');
  if (!liveRow.current_set_code) missingFields.push('set_code');
  if (!liveRow.current_number) missingFields.push('number');
  if (!liveRow.current_number_plain) missingFields.push('number_plain');

  let readinessLane = 'blocked_parent_identity_review';
  let recommendedNextAction = 'Keep blocked. Manual review is required before any write package.';
  let futureWriteShape = 'none';
  if (blockedReasons.length === 0 && missingFields.length > 0) {
    readinessLane = 'parent_field_backfill_candidate';
    recommendedNextAction = 'Prepare guarded dry-run for parent field backfill only; no child writes, deletes, merges, or cleanup.';
    futureWriteShape = 'parent_update_only_set_id_set_code_number_printed_identity_modifier';
  } else if (blockedReasons.length === 0 && missingFields.length === 0) {
    readinessLane = 'stale_missing_row_recheck';
    recommendedNextAction = 'Regenerate global missing comparison; the mapped parent already has complete identity fields.';
    futureWriteShape = 'none';
  }

  return {
    readiness_lane: readinessLane,
    recommended_next_action: recommendedNextAction,
    future_write_shape: futureWriteShape,
    blocked_reasons: blockedReasons,
    missing_parent_fields: missingFields,
    proposed_parent_update: {
      card_print_id: sourceRow.mapped_parent.card_print_id,
      set_id: liveRow.expected_set_id,
      set_code: sourceRow.set_key,
      number: sourceRow.card_number,
      number_plain: targetPlain,
      printed_identity_modifier: printedIdentityModifier(sourceRow.card_number),
      name: sourceRow.card_name,
      preserve_existing_base_parent: true,
      child_writes_allowed: false,
      deletes_allowed: false,
      cleanup_allowed: false,
    },
  };
}

function renderMarkdown(report) {
  const laneRows = Object.entries(report.summary.by_readiness_lane).map(([lane, count]) => [
    lane,
    count,
    report.summary.top_sets_by_readiness_lane[lane]?.map((row) => `${row.key}:${row.count}`).join(', ') ?? '',
  ]);
  const candidateRows = report.rows.map((row) => [
    row.readiness_lane,
    row.set_key,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.mapped_parent.card_print_id,
    row.blocked_reasons.join(', '),
  ]);
  return `# PKG-08L Parent Identity Backfill Readiness V1

Read-only audit for mapped parents that already own the external mapping but have incomplete parent identity fields.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

${markdownTable(['lane', 'rows', 'top_sets'], laneRows)}

## Rows

${markdownTable(['lane', 'set', 'number', 'card', 'finish', 'parent', 'blocked_reasons'], candidateRows)}

## Next Actions

- parent_field_backfill_candidate: prepare a guarded dry-run for parent field updates only.
- blocked_parent_identity_review: keep blocked until the listed reasons are resolved.
- stale_missing_row_recheck: regenerate the global missing comparison before any package.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08L Parent Identity Backfill Readiness Checkpoint V1](20260610_pkg08l_parent_identity_backfill_readiness_checkpoint_v1.md) | Read-only audit for incomplete mapped parent identity rows. No writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08l_parent_identity_backfill_readiness_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08l_parent_identity_backfill_readiness_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.adjudication_lane === TARGET_LANE);
const live = await loadLiveContext(sourceRows);
const liveByParentId = new Map(live.rows.map((row) => [row.card_print_id, row]));
const rows = sourceRows.map((sourceRow) => {
  const liveRow = liveByParentId.get(sourceRow.mapped_parent.card_print_id);
  return {
    ...classifyRow(sourceRow, liveRow),
    set_key: sourceRow.set_key,
    set_name: sourceRow.set_name,
    card_number: sourceRow.card_number,
    card_name: sourceRow.card_name,
    finish_key: sourceRow.finish_key,
    tcgdex_external_id: sourceRow.tcgdex_external_id,
    mapped_parent: sourceRow.mapped_parent,
    mapped_dependency_counts: sourceRow.mapped_dependency_counts,
    live_parent: liveRow ?? null,
    sources: sourceRow.sources ?? [],
    evidence_urls: sourceRow.evidence_urls ?? [],
  };
});

const byLane = countBy(rows, (row) => row.readiness_lane);
const topSetsByLane = {};
for (const lane of Object.keys(byLane)) {
  topSetsByLane[lane] = Object.entries(countBy(rows.filter((row) => row.readiness_lane === lane), (row) => row.set_key))
    .slice(0, 20)
    .map(([key, count]) => ({ key, count }));
}
const parentFieldCandidates = rows.filter((row) => row.readiness_lane === 'parent_field_backfill_candidate');

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08l_parent_identity_backfill_readiness_v1',
  package_id: PACKAGE_ID,
  source_package: source.package_id,
  source_strategy_fingerprint_sha256: source.source_strategy_fingerprint_sha256,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  live_read: {
    available: live.available,
    reason: live.reason,
    source_rows: sourceRows.length,
    live_rows_read: live.rows.length,
  },
  summary: {
    source_rows: sourceRows.length,
    audited_rows: rows.length,
    by_readiness_lane: byLane,
    top_sets_by_readiness_lane: topSetsByLane,
    parent_field_backfill_candidates: parentFieldCandidates.length,
    parent_field_backfill_fingerprint_sha256: sha256(stableJson(parentFieldCandidates.map((row) => row.proposed_parent_update))),
    rows_with_vault_dependencies: rows.filter((row) => (
      Number(row.live_parent?.vault_item_count ?? 0) > 0 ||
      Number(row.live_parent?.vault_item_instance_count ?? 0) > 0
    )).length,
  },
  recommended_next_packages: [
    {
      package_id: 'PKG-08N',
      scope: 'parent_field_backfill_candidate',
      candidate_rows: parentFieldCandidates.length,
      allowed_write_shape: 'parent set_id/set_code/number/printed_identity_modifier update only; generated number_plain readback required; no child writes; no deletes; no merges; no unsupported cleanup',
      status: parentFieldCandidates.length > 0 ? 'ready_for_guarded_dry_run_preparation' : 'blocked_no_candidates',
    },
  ],
  rows,
};

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, renderMarkdown(report));
await writeText(CHECKPOINT_MD, renderMarkdown(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  checkpoint_md: CHECKPOINT_MD,
  summary: report.summary,
  recommended_next_packages: report.recommended_next_packages,
  db_writes_performed: false,
  migrations_created: false,
}, null, 2));
