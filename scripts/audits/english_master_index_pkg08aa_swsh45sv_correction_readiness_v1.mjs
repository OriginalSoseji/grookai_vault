import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
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
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const REMAINING_JSON = path.join(AUDIT_DIR, 'english_master_index_remaining_missing_reconciliation_lanes_v1.json');
const SUPPRESSION_JSON = path.join(AUDIT_DIR, 'english_master_index_host_subset_duplicate_suppression_v1.json');
const PKG08Y_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08y_host_subset_relocation_cleanup_real_apply_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08aa_swsh45sv_correction_readiness_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08aa_swsh45sv_correction_readiness_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08aa_swsh45sv_correction_readiness_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08AA-SWSH45SV-CORRECTION-READINESS';

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

function rowKey(row) {
  return [
    normalizeText(row.card_number ?? row.number ?? row.number_plain),
    normalizeText(row.card_name ?? row.name),
  ].join('|');
}

function liveNumberCandidates(row) {
  return [...new Set([
    row?.card_number,
    row?.number,
    row?.number_plain,
  ].filter((value) => value !== null && value !== undefined && String(value).trim()).map(normalizeText))];
}

function buildTargets({ missingRows, pkg08yTargets, suppressionRows }) {
  const missingByKey = new Map(missingRows.map((row) => [rowKey(row), row]));
  const suppressionByKey = new Map(suppressionRows.map((row) => [rowKey(row), row]));
  return pkg08yTargets
    .map((row) => {
      const key = rowKey(row);
      const missing = missingByKey.get(key) ?? null;
      const suppression = suppressionByKey.get(key) ?? null;
      return {
        card_print_id: row.card_print_id,
        current_set_code: 'swsh4.5',
        target_set_code: 'swsh45sv',
        card_number: row.card_number,
        card_name: row.card_name,
        current_child_printing_id: row.target_child_printing_id,
        current_finish_key: 'normal',
        target_finish_key: 'holo',
        prior_deleted_child_printing_ids: row.extra_child_printing_ids ?? [],
        prior_deleted_child_finishes: row.extra_child_finishes ?? [],
        prior_tcgdex_external_id: row.tcgdex_external_id,
        master_index_sources: missing?.sources ?? [],
        master_index_evidence_urls: missing?.evidence_urls ?? [],
        host_suppression_rule_id: suppression?.rule_id ?? null,
        host_suppression_reason: suppression?.reason ?? null,
        host_evidence_urls: suppression?.host_evidence_urls ?? [],
        subset_evidence_urls: suppression?.subset_evidence_urls ?? [],
        readiness_basis: {
          has_master_missing_row: Boolean(missing),
          has_host_subset_suppression_row: Boolean(suppression),
          master_finish_key: missing?.finish_key ?? null,
          suppression_subset_set_key: suppression?.subset_set_key ?? null,
          suppression_host_set_key: suppression?.host_set_key ?? null,
        },
      };
    })
    .sort((left, right) => normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true }));
}

async function loadLiveContext(targets) {
  const conn = connectionString();
  if (!conn) return { available: false, reason: 'database_connection_unavailable', rows: [], summary: {}, findings: ['database_connection_unavailable'] };

  const parentIds = targets.map((row) => row.card_print_id);
  const childIds = targets.map((row) => row.current_child_printing_id);
  const numbers = [...new Set(targets.map((row) => row.card_number))];
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const sets = await client.query(
      `select id::text as set_id, code, name
       from public.sets
       where game = 'pokemon'
         and lower(code) = any($1::text[])
       order by code`,
      [['swsh4.5', 'swsh45sv']],
    );
    const parents = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_id::text,
         cp.set_code,
         cp.number,
         cp.number_plain,
         coalesce(cp.number_plain, cp.number) as card_number,
         cp.name as card_name,
         cp.rarity,
         coalesce((select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as child_printings,
         coalesce((select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id) from public.external_mappings em where em.card_print_id = cp.id), '[]'::jsonb) as external_mappings,
         coalesce((select count(*)::int from public.vault_items vi where vi.card_id = cp.id), 0) as vault_item_count,
         coalesce((select count(*)::int from public.vault_item_instances vii where vii.card_print_id = cp.id), 0) as vault_instance_parent_count,
         coalesce((select count(*)::int from public.pricing_watch pw where pw.card_print_id = cp.id), 0) as pricing_watch_count,
         coalesce((select count(*)::int from public.card_feed_events cfe where cfe.card_print_id = cp.id), 0) as card_feed_event_count
       from public.card_prints cp
       where cp.id = any($1::uuid[])
          or (lower(cp.set_code) in ('swsh4.5', 'swsh45sv') and coalesce(cp.number_plain, cp.number) = any($2::text[]))
       order by cp.set_code, cp.number, cp.name, cp.id`,
      [parentIds, numbers],
    );
    const childDeps = await client.query(
      `select
         cpr.id::text as card_printing_id,
         cpr.card_print_id::text,
         cp.set_code,
         coalesce(cp.number_plain, cp.number) as card_number,
         cp.name as card_name,
         cpr.finish_key,
         coalesce((select count(*)::int from public.external_printing_mappings epm where epm.card_printing_id = cpr.id), 0) as external_printing_mapping_count,
         coalesce((select count(*)::int from public.vault_item_instances vii where vii.card_printing_id = cpr.id), 0) as vault_instance_child_count
       from public.card_printings cpr
       join public.card_prints cp on cp.id = cpr.card_print_id
       where cpr.id = any($1::uuid[])
       order by cp.set_code, card_number, cp.name, cpr.finish_key, cpr.id`,
      [childIds],
    );
    await client.query('rollback');

    const targetSet = sets.rows.find((row) => normalizeText(row.code) === 'swsh45sv') ?? null;
    const hostSet = sets.rows.find((row) => normalizeText(row.code) === 'swsh4 5') ?? sets.rows.find((row) => row.code === 'swsh4.5') ?? null;
    const parentsById = new Map(parents.rows.map((row) => [row.card_print_id, row]));
    const childrenById = new Map(childDeps.rows.map((row) => [row.card_printing_id, row]));

    const liveRows = targets.map((target) => {
      const parent = parentsById.get(target.card_print_id) ?? null;
      const child = childrenById.get(target.current_child_printing_id) ?? null;
      const collisions = parents.rows.filter((row) => (
        normalizeText(row.set_code) === 'swsh45sv' &&
        liveNumberCandidates(row).includes(normalizeText(target.card_number)) &&
        normalizeText(row.card_name) === normalizeText(target.card_name) &&
        row.card_print_id !== target.card_print_id
      ));
      const sameNumberRows = parents.rows.filter((row) => (
        normalizeText(row.set_code) === 'swsh45sv' &&
        liveNumberCandidates(row).includes(normalizeText(target.card_number)) &&
        row.card_print_id !== target.card_print_id
      ));
      const childFinishes = (parent?.child_printings ?? []).map((row) => row.finish_key).sort();
      const statusFindings = [];
      if (!parent) statusFindings.push('current_parent_not_found');
      if (parent && normalizeText(parent.set_code) !== 'swsh4 5') statusFindings.push(`current_parent_not_in_swsh4.5:${parent.set_code}`);
      if (parent && !liveNumberCandidates(parent).includes(normalizeText(target.card_number))) statusFindings.push('current_parent_number_mismatch');
      if (parent && normalizeText(parent.card_name) !== normalizeText(target.card_name)) statusFindings.push('current_parent_name_mismatch');
      if (!child) statusFindings.push('current_child_not_found');
      if (child && child.finish_key !== 'normal') statusFindings.push(`current_child_finish_not_normal:${child.finish_key}`);
      if (childFinishes.length !== 1 || childFinishes[0] !== 'normal') statusFindings.push(`current_parent_child_shape_not_single_normal:${childFinishes.join(',')}`);
      if (collisions.length > 0) statusFindings.push(`target_parent_collision_count:${collisions.length}`);
      if (!target.readiness_basis.has_master_missing_row) statusFindings.push('missing_master_index_target_row');
      if (!target.readiness_basis.has_host_subset_suppression_row) statusFindings.push('missing_host_subset_suppression_row');
      if (target.readiness_basis.master_finish_key !== 'holo') statusFindings.push(`master_finish_not_holo:${target.readiness_basis.master_finish_key}`);
      if (target.readiness_basis.suppression_subset_set_key !== 'swsh45sv') statusFindings.push(`suppression_subset_not_swsh45sv:${target.readiness_basis.suppression_subset_set_key}`);
      if (target.readiness_basis.suppression_host_set_key !== 'swsh4.5') statusFindings.push(`suppression_host_not_swsh4.5:${target.readiness_basis.suppression_host_set_key}`);

      return {
        ...target,
        current_parent: parent,
        current_child_dependency_counts: child,
        target_parent_collisions: collisions,
        same_number_target_set_rows: sameNumberRows,
        live_status: statusFindings.length === 0 ? 'ready_for_guarded_correction_dry_run' : 'blocked',
        status_findings: statusFindings,
      };
    });

    const findings = [];
    if (!targetSet) findings.push('target_set_swsh45sv_not_found');
    if (!hostSet) findings.push('host_set_swsh4.5_not_found');
    if (liveRows.length !== 25) findings.push(`live_target_count_not_25:${liveRows.length}`);
    const blockedRows = liveRows.filter((row) => row.live_status !== 'ready_for_guarded_correction_dry_run');
    if (blockedRows.length > 0) findings.push(`blocked_live_rows:${blockedRows.length}`);

    return {
      available: true,
      reason: null,
      sets: sets.rows,
      target_set: targetSet,
      host_set: hostSet,
      rows: liveRows,
      summary: {
        target_rows: liveRows.length,
        ready_rows: liveRows.filter((row) => row.live_status === 'ready_for_guarded_correction_dry_run').length,
        blocked_rows: blockedRows.length,
        current_set_counts: countBy(liveRows, (row) => row.current_parent?.set_code ?? 'missing_parent'),
        current_child_finish_counts: countBy(liveRows, (row) => (row.current_parent?.child_printings ?? []).map((child) => child.finish_key).sort().join('+') || 'missing_child'),
        child_external_printing_mapping_refs: liveRows.reduce((sum, row) => sum + Number(row.current_child_dependency_counts?.external_printing_mapping_count ?? 0), 0),
        child_vault_instance_refs: liveRows.reduce((sum, row) => sum + Number(row.current_child_dependency_counts?.vault_instance_child_count ?? 0), 0),
        parent_vault_item_refs: liveRows.reduce((sum, row) => sum + Number(row.current_parent?.vault_item_count ?? 0), 0),
        parent_vault_instance_refs: liveRows.reduce((sum, row) => sum + Number(row.current_parent?.vault_instance_parent_count ?? 0), 0),
        parent_pricing_watch_refs: liveRows.reduce((sum, row) => sum + Number(row.current_parent?.pricing_watch_count ?? 0), 0),
        parent_card_feed_event_refs: liveRows.reduce((sum, row) => sum + Number(row.current_parent?.card_feed_event_count ?? 0), 0),
      },
      findings,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: error.message, rows: [], summary: {}, findings: [error.message] };
  } finally {
    await client.end().catch(() => {});
  }
}

function renderMarkdown(report) {
  const tableRows = report.rows.slice(0, 30).map((row) => [
    row.card_number,
    row.card_name,
    row.current_parent?.set_code ?? 'missing',
    (row.current_parent?.child_printings ?? []).map((child) => child.finish_key).join(', ') || 'missing',
    row.target_set_code,
    row.target_finish_key,
    row.live_status,
    row.status_findings.join('; ') || 'none',
  ]);

  return `# PKG-08AA SWSH45SV Correction Readiness V1

Read-only readiness report for correcting the PKG-08Y Shining Fates Shiny Vault direction.

## Summary

- Package: \`${report.package_id}\`
- Fingerprint: \`${report.package_fingerprint_sha256}\`
- Readiness: \`${report.readiness_status}\`
- DB writes performed: \`${report.db_writes_performed}\`
- Migrations created: \`${report.migrations_created}\`
- Cleanup performed: \`${report.cleanup_performed}\`
- Target rows: ${report.summary.target_rows}
- Ready rows: ${report.summary.ready_rows}
- Blocked rows: ${report.summary.blocked_rows}

## Why This Exists

PKG-08Y relocated 25 Shining Fates Shiny Vault rows from \`swsh45sv\` to host set \`swsh4.5\` and preserved \`normal\` children. The refreshed Master Index and host/subset governance indicate the opposite canonical direction: Shiny Vault SV-number rows are governed under subset \`swsh45sv\`, and the exact 25 rows are Master Index \`holo\` facts with two sources.

## Proposed Correction Shape

- Move the 25 current parents from \`swsh4.5\` back to \`swsh45sv\`.
- Update the surviving child printing in place from \`normal\` to \`holo\`.
- Preserve parent IDs, child IDs, and existing external mappings.
- No deletes, no merges, no migrations, no global apply.

## Live Dependency Summary

\`\`\`json
${JSON.stringify(report.live_summary, null, 2)}
\`\`\`

## Findings

${report.stop_findings.length ? report.stop_findings.map((finding) => `- ${finding}`).join('\n') : '- none'}

## Rows

${markdownTable(['Number', 'Name', 'Current Set', 'Current Finishes', 'Target Set', 'Target Finish', 'Status', 'Findings'], tableRows)}

## Next Step

${report.readiness_status === 'ready_for_guarded_correction_dry_run'
    ? 'Build PKG-08AA guarded dry-run transaction using this exact scope. Real apply is still separate.'
    : 'Do not write. Resolve blocked findings first.'}
`;
}

async function updateCheckpointIndex() {
  await fs.mkdir(CHECKPOINT_DIR, { recursive: true });
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08AA SWSH45SV Correction Readiness Checkpoint V1](20260610_pkg08aa_swsh45sv_correction_readiness_checkpoint_v1.md) | Read-only correction readiness for PKG-08Y Shining Fates Shiny Vault direction. No writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? await fs.readFile(indexPath, 'utf8') : '# Master Index Checkpoint Index\n\n';
  if (current.includes('20260610_pkg08aa_swsh45sv_correction_readiness_checkpoint_v1.md')) {
    const next = current.split(/\r?\n/).map((existingLine) => (
      existingLine.includes('20260610_pkg08aa_swsh45sv_correction_readiness_checkpoint_v1.md') ? line : existingLine
    )).join('\n');
    await fs.writeFile(indexPath, next.endsWith('\n') ? next : `${next}\n`);
    return;
  }
  await fs.writeFile(indexPath, `${current.trimEnd()}\n${line}\n`);
}

async function main() {
  const remaining = await readJson(REMAINING_JSON);
  const suppression = await readJson(SUPPRESSION_JSON);
  const pkg08y = await readJson(PKG08Y_JSON);

  const missingRows = (remaining.rows ?? []).filter((row) => (
    row.lane === 'missing_parent_in_existing_set' &&
    row.set_key === 'swsh45sv' &&
    row.finish_key === 'holo'
  ));
  const suppressionRows = (suppression.rows ?? suppression.suppressed_rows ?? []).filter((row) => (
    row.rule_id === 'swsh4_5_shiny_vault_host_duplicate' &&
    row.subset_set_key === 'swsh45sv' &&
    row.finish_key === 'holo'
  ));
  const pkg08yTargets = pkg08y.scope?.targets ?? [];
  const targets = buildTargets({ missingRows, pkg08yTargets, suppressionRows });
  const live = await loadLiveContext(targets);

  const sourceFindings = [];
  if (missingRows.length !== 25) sourceFindings.push(`missing_master_rows_not_25:${missingRows.length}`);
  if (pkg08yTargets.length !== 25) sourceFindings.push(`pkg08y_target_rows_not_25:${pkg08yTargets.length}`);
  if (suppressionRows.length < 25) sourceFindings.push(`suppression_rows_less_than_25:${suppressionRows.length}`);
  if (targets.length !== 25) sourceFindings.push(`target_rows_not_25:${targets.length}`);
  if (targets.some((row) => row.master_index_sources.length < 2)) sourceFindings.push('target_with_less_than_two_master_sources');
  if (targets.some((row) => !row.master_index_sources.includes('pokemontcg_api'))) sourceFindings.push('target_missing_pokemontcg_api_source');
  if (targets.some((row) => !row.master_index_sources.includes('thepricedex_price_list'))) sourceFindings.push('target_missing_thepricedex_source');

  const liveFindings = live.findings ?? [];
  const stopFindings = [...sourceFindings, ...liveFindings];
  const readinessStatus = stopFindings.length === 0
    ? 'ready_for_guarded_correction_dry_run'
    : 'blocked';

  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    correction_strategy: 'swsh4.5_to_swsh45sv_parent_relocation_plus_normal_to_holo_child_update_in_place',
    targets: targets.map((row) => ({
      card_print_id: row.card_print_id,
      current_child_printing_id: row.current_child_printing_id,
      card_number: row.card_number,
      card_name: row.card_name,
      current_set_code: row.current_set_code,
      target_set_code: row.target_set_code,
      current_finish_key: row.current_finish_key,
      target_finish_key: row.target_finish_key,
    })),
  }));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08aa_swsh45sv_correction_readiness_v1',
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    global_apply_performed: false,
    readiness_status: readinessStatus,
    summary: {
      target_rows: targets.length,
      ready_rows: live.summary?.ready_rows ?? 0,
      blocked_rows: live.summary?.blocked_rows ?? targets.length,
      source_missing_rows: missingRows.length,
      source_pkg08y_rows: pkg08yTargets.length,
      source_suppression_rows: suppressionRows.length,
      rows_by_master_finish: countBy(missingRows, (row) => row.finish_key),
      rows_by_master_sources: countBy(missingRows, (row) => (row.sources ?? []).join('+')),
    },
    live_summary: live.summary ?? {},
    correction_strategy: {
      parent_update: 'set_code/set_id swsh4.5 -> swsh45sv',
      child_update: 'finish_key normal -> holo in place',
      preserves_parent_ids: true,
      preserves_child_ids: true,
      preserves_external_mappings: true,
      deletes: false,
      inserts: false,
      migrations: false,
    },
    stop_findings: stopFindings,
    source_findings: sourceFindings,
    live_findings: liveFindings,
    source_artifacts: {
      remaining_missing: path.relative(ROOT, REMAINING_JSON),
      host_subset_suppression: path.relative(ROOT, SUPPRESSION_JSON),
      pkg08y_real_apply: path.relative(ROOT, PKG08Y_JSON),
    },
    rows: live.rows ?? [],
    recommended_next_step: readinessStatus === 'ready_for_guarded_correction_dry_run'
      ? 'Build and run PKG-08AA guarded dry-run transaction artifact. Do not perform real apply until dry-run proof is generated.'
      : 'Stop. Do not write until blocked findings are resolved.',
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  await writeText(CHECKPOINT_MD, `# PKG-08AA SWSH45SV Correction Readiness Checkpoint V1

- Package: \`${PACKAGE_ID}\`
- Fingerprint: \`${packageFingerprint}\`
- Readiness: \`${readinessStatus}\`
- Target rows: ${report.summary.target_rows}
- Ready rows: ${report.summary.ready_rows}
- Blocked rows: ${report.summary.blocked_rows}
- DB writes performed: \`false\`
- Migrations created: \`false\`
- Cleanup performed: \`false\`

This checkpoint documents the read-only correction readiness for the PKG-08Y Shining Fates Shiny Vault direction issue.
`);
  await updateCheckpointIndex();

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    readiness_status: readinessStatus,
    summary: report.summary,
    live_summary: report.live_summary,
    stop_findings: stopFindings,
    output_json: path.relative(ROOT, OUTPUT_JSON),
    output_md: path.relative(ROOT, OUTPUT_MD),
  }, null, 2));

  if (readinessStatus !== 'ready_for_guarded_correction_dry_run') {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
