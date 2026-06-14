import fsSync from 'node:fs';
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
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08f_missing_parent_strategy_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08h_external_mapping_collision_adjudication_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08h_external_mapping_collision_adjudication_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08h_external_mapping_collision_adjudication_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-08H-EXTERNAL-MAPPING-COLLISION-ADJUDICATION';

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function topEntries(counts, limit = 20) {
  return Object.entries(counts).slice(0, limit).map(([key, count]) => ({ key, count }));
}

async function loadDependencyCounts(cardPrintIds) {
  const conn = connectionString();
  if (!conn || cardPrintIds.length === 0) {
    return { available: Boolean(conn), reason: conn ? null : 'database_connection_unavailable', rows: [] };
  }
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_code,
         coalesce(cp.number_plain, cp.number) as card_number,
         cp.number,
         cp.number_plain,
         cp.name,
         coalesce((select count(*)::int from public.card_printings cpr where cpr.card_print_id = cp.id), 0) as child_printing_count,
         coalesce((select jsonb_agg(cpr.finish_key order by cpr.finish_key) from public.card_printings cpr where cpr.card_print_id = cp.id), '[]'::jsonb) as child_finishes,
         coalesce((select count(*)::int from public.external_mappings em where em.card_print_id = cp.id), 0) as external_mapping_count,
         coalesce((select count(*)::int from public.vault_items vi where vi.card_id = cp.id), 0) as vault_item_count,
         coalesce((select count(*)::int from public.vault_item_instances vii where vii.card_print_id = cp.id), 0) as vault_item_instance_count,
         coalesce((select count(*)::int from public.card_print_identity cpi where cpi.card_print_id = cp.id), 0) as identity_count,
         coalesce((select count(*)::int from public.card_print_species cps where cps.card_print_id = cp.id), 0) as species_count,
         coalesce((select count(*)::int from public.card_print_traits cpt where cpt.card_print_id = cp.id), 0) as trait_count
       from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.set_code, cp.number, cp.name, cp.id`,
      [cardPrintIds],
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

function classify(row, dependencyByParent) {
  const collision = row.external_mapping_collisions?.[0] ?? null;
  const dependency = collision ? dependencyByParent.get(collision.card_print_id) : null;
  const mappedSet = normalizeText(collision?.set_code);
  const targetSet = normalizeText(row.set_key);
  const mappedNumber = normalizeNumber(collision?.number_plain ?? collision?.number ?? collision?.card_number);
  const targetNumber = normalizeNumber(row.card_number);
  const mappedName = normalizeText(collision?.name);
  const targetName = normalizeText(row.card_name);
  const sameName = mappedName && mappedName === targetName;
  const sameNumber = mappedNumber && mappedNumber === targetNumber;
  const targetNumberStartsWithMapped = targetNumber && mappedNumber && targetNumber.startsWith(mappedNumber) && targetNumber !== mappedNumber;
  const dependencyTotal = dependency
    ? Number(dependency.child_printing_count ?? 0) +
      Number(dependency.external_mapping_count ?? 0) +
      Number(dependency.vault_item_count ?? 0) +
      Number(dependency.vault_item_instance_count ?? 0) +
      Number(dependency.identity_count ?? 0) +
      Number(dependency.species_count ?? 0) +
      Number(dependency.trait_count ?? 0)
    : 0;

  let adjudication_lane = 'blocked_manual_mapping_review';
  let recommended_next_action = 'Manual review required before any mapping transfer, parent insert, or parent identity update.';
  let future_write_shape = 'none';

  if (!collision) {
    adjudication_lane = 'blocked_missing_collision_detail';
    recommended_next_action = 'Regenerate PKG-08F; collision detail was missing.';
  } else if (!collision.card_print_id || !collision.set_code || !mappedNumber) {
    adjudication_lane = 'blocked_mapped_parent_incomplete_identity';
    recommended_next_action = 'Audit mapped parent identity fields and dependencies before any correction.';
  } else if (sameName && sameNumber && mappedSet !== targetSet) {
    adjudication_lane = 'set_alias_parent_update_candidate';
    recommended_next_action = 'Prepare a set-alias parent update dry-run only if dependencies and set alias governance prove the mapped parent is the target card.';
    future_write_shape = 'parent set_code/set_id update plus child insert, no delete';
  } else if (sameName && targetNumberStartsWithMapped) {
    adjudication_lane = 'number_suffix_identity_modifier_candidate';
    recommended_next_action = 'Prepare number/identity modifier dry-run only if the mapped parent should become the suffix-number card.';
    future_write_shape = 'parent number identity update plus child insert, no delete';
  } else if (sameName && mappedSet === targetSet && !sameNumber) {
    adjudication_lane = 'number_identity_mismatch_candidate';
    recommended_next_action = 'Prepare number identity adjudication; do not insert duplicate parent while mapping points at same-name parent.';
    future_write_shape = 'parent number update or mapping transfer after proof';
  } else if (!sameName) {
    adjudication_lane = 'blocked_name_conflict';
    recommended_next_action = 'Do not write. Mapping points at a different card name.';
  }

  return {
    adjudication_lane,
    recommended_next_action,
    future_write_shape,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key,
    tcgdex_external_id: row.tcgdex_external_id,
    mapped_parent: collision,
    mapped_dependency_counts: dependency ? {
      child_printing_count: dependency.child_printing_count,
      child_finishes: dependency.child_finishes,
      external_mapping_count: dependency.external_mapping_count,
      vault_item_count: dependency.vault_item_count,
      vault_item_instance_count: dependency.vault_item_instance_count,
      identity_count: dependency.identity_count,
      species_count: dependency.species_count,
      trait_count: dependency.trait_count,
      dependency_total: dependencyTotal,
    } : null,
    comparison: {
      mapped_set_key: collision?.set_code ?? null,
      mapped_number: mappedNumber || null,
      mapped_name: collision?.name ?? null,
      same_name: Boolean(sameName),
      same_number: Boolean(sameNumber),
      target_number_starts_with_mapped: Boolean(targetNumberStartsWithMapped),
    },
    sources: row.sources ?? [],
    evidence_urls: row.evidence_urls ?? [],
  };
}

function renderMarkdown(report) {
  const laneRows = Object.entries(report.summary.by_adjudication_lane).map(([lane, count]) => [
    lane,
    count,
    report.summary.top_sets_by_adjudication_lane[lane]?.map((row) => `${row.key}:${row.count}`).slice(0, 10).join(', ') ?? '',
  ]);
  const nextRows = report.recommended_next_packages.map((row) => [
    row.package_id,
    row.scope,
    row.candidate_rows,
    row.status,
    row.allowed_write_shape,
  ]);
  return `# PKG-08H External Mapping Collision Adjudication V1

Read-only adjudication for Master Index rows blocked because their TCGdex external ID already maps to a live Grookai parent.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}

## Summary

- source_rows: ${report.summary.source_rows}
- adjudicated_rows: ${report.summary.adjudicated_rows}
- source_strategy_fingerprint_sha256: \`${report.source_strategy_fingerprint_sha256}\`

${markdownTable(['adjudication_lane', 'rows', 'top_sets'], laneRows)}

## Recommended Next Packages

${markdownTable(['package_id', 'scope', 'candidate_rows', 'status', 'allowed_write_shape'], nextRows)}

## Guardrails

- This report is not write authority.
- Mapping collisions are not parent-insert candidates.
- Any future write must have a fresh dry-run proof and exact operator approval.
- Rows with mapped parent identity gaps or name conflicts remain blocked.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08H External Mapping Collision Adjudication Checkpoint V1](20260610_pkg08h_external_mapping_collision_adjudication_checkpoint_v1.md) | Read-only classification of 154 TCGdex mapping collisions into alias, number, and blocked identity lanes. No writes or migrations. |';
  const current = fsSync.existsSync(indexPath) ? fsSync.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08h_external_mapping_collision_adjudication_checkpoint_v1.md')) {
    fsSync.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08h_external_mapping_collision_adjudication_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fsSync.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const source = await readJson(SOURCE_JSON);
const sourceRows = (source.rows ?? []).filter((row) => row.strategy_lane === 'blocked_external_mapping_collision');
const mappedParentIds = [...new Set(sourceRows.flatMap((row) => row.external_mapping_collisions ?? []).map((row) => row.card_print_id).filter(Boolean))];
const dependencies = await loadDependencyCounts(mappedParentIds);
const dependencyByParent = new Map(dependencies.rows.map((row) => [row.card_print_id, row]));
const rows = sourceRows.map((row) => classify(row, dependencyByParent));
const byLane = countBy(rows, (row) => row.adjudication_lane);
const topSetsByLane = {};
for (const lane of Object.keys(byLane)) {
  topSetsByLane[lane] = topEntries(countBy(rows.filter((row) => row.adjudication_lane === lane), (row) => row.set_key), 20);
}

const recommendedNextPackages = [
  {
    package_id: 'PKG-08J',
    scope: 'set_alias_parent_update_candidate',
    candidate_rows: byLane.set_alias_parent_update_candidate ?? 0,
    status: (byLane.set_alias_parent_update_candidate ?? 0) > 0 ? 'ready_for_guarded_dry_run_preparation' : 'blocked_no_candidates',
    allowed_write_shape: 'parent set_code/set_id update plus child insert only, no deletes',
  },
  {
    package_id: 'PKG-08K',
    scope: 'number_suffix_identity_modifier_candidate',
    candidate_rows: byLane.number_suffix_identity_modifier_candidate ?? 0,
    status: (byLane.number_suffix_identity_modifier_candidate ?? 0) > 0 ? 'ready_for_guarded_dry_run_preparation' : 'blocked_no_candidates',
    allowed_write_shape: 'parent number identity update plus child insert only, no deletes',
  },
  {
    package_id: 'PKG-08L',
    scope: 'blocked_mapped_parent_incomplete_identity',
    candidate_rows: byLane.blocked_mapped_parent_incomplete_identity ?? 0,
    status: 'blocked_until_parent_identity_audit',
    allowed_write_shape: 'read-only audit first',
  },
];

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg08h_external_mapping_collision_adjudication_v1',
  package_id: PACKAGE_ID,
  source_strategy_fingerprint_sha256: source.package_fingerprint_sha256 ?? null,
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  live_read: {
    available: dependencies.available,
    reason: dependencies.reason,
    mapped_parent_ids_read: mappedParentIds.length,
    dependency_rows_read: dependencies.rows.length,
  },
  summary: {
    source_rows: sourceRows.length,
    adjudicated_rows: rows.length,
    by_adjudication_lane: byLane,
    top_sets_by_adjudication_lane: topSetsByLane,
    rows_with_vault_dependencies: rows.filter((row) => (
      Number(row.mapped_dependency_counts?.vault_item_count ?? 0) +
      Number(row.mapped_dependency_counts?.vault_item_instance_count ?? 0)
    ) > 0).length,
  },
  recommended_next_packages: recommendedNextPackages,
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
