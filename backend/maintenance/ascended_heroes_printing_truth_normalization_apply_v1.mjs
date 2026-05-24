/**
 * CANON MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * Ascended Heroes printing truth normalization readiness gate.
 *
 * This script is not a runtime worker. It must only run from the canon
 * maintenance entrypoint, defaults to dry-run, and must not be wired into
 * application flows.
 */
import '../env.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

import {
  CANON_MAINTENANCE_DRY_RUN_ENV_V1,
  CANON_MAINTENANCE_ENABLE_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_ENV_V1,
  CANON_MAINTENANCE_ENTRYPOINT_V1,
  CANON_MAINTENANCE_MODE_ENV_V1,
  installCanonMaintenanceBoundaryV1,
} from './canon_maintenance_boundary_v1.mjs';
import {
  markdownTable,
  normalizeNumber,
  normalizeText,
  uniqueSorted,
} from '../../scripts/audits/verified_master_set_index_v1/shared.mjs';

if (process.env[CANON_MAINTENANCE_ENABLE_ENV_V1] !== 'true') {
  throw new Error(
    'RUNTIME_ENFORCEMENT: canon maintenance is disabled. Set ENABLE_CANON_MAINTENANCE_MODE=true.',
  );
}

if (process.env[CANON_MAINTENANCE_MODE_ENV_V1] !== 'EXPLICIT') {
  throw new Error(
    "RUNTIME_ENFORCEMENT: CANON_MAINTENANCE_MODE must be 'EXPLICIT'.",
  );
}

if (process.env[CANON_MAINTENANCE_ENTRYPOINT_ENV_V1] !== CANON_MAINTENANCE_ENTRYPOINT_V1) {
  throw new Error(
    `RUNTIME_ENFORCEMENT: canon maintenance scripts must be launched from ${CANON_MAINTENANCE_ENTRYPOINT_V1}.`,
  );
}

const DRY_RUN = process.env[CANON_MAINTENANCE_DRY_RUN_ENV_V1] !== 'false';
const { assertCanonMaintenanceWriteAllowed } = installCanonMaintenanceBoundaryV1(import.meta.url);
void assertCanonMaintenanceWriteAllowed;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PLAN_PATH = path.join(
  REPO_ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'ascended_heroes',
  'ascended_heroes_normalization_plan_v1.json',
);
const OUTPUT_DIR = path.join(
  REPO_ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'ascended_heroes',
);
const READINESS_JSON = 'ascended_heroes_apply_readiness_v1.json';
const READINESS_MD = 'ascended_heroes_apply_readiness_v1.md';
const EXPECTED_PLAN_VERSION = 'ASCENDED_HEROES_NORMALIZATION_PLAN_V1';
const APPLY_CONFIRMATION = 'ASCENDED_HEROES_NORMALIZATION_V1';
const FINISH_GV_SUFFIX = {
  normal: 'STD',
  holo: 'HOLO',
  reverse: 'RH',
  pokeball: 'PB',
  masterball: 'MB',
  cosmos: 'COSMOS',
  rocket_reverse: 'ROCKET',
};

function parseMode() {
  const hasApply = process.argv.includes('--apply');
  const hasDryRun = process.argv.includes('--dry-run');
  if (hasApply && hasDryRun) throw new Error('MODE_CONFLICT: use either --dry-run or --apply.');
  return hasApply && !DRY_RUN ? 'apply' : 'dry-run';
}

function rowBlockers(row) {
  return Array.isArray(row.apply_blockers) ? row.apply_blockers.filter(Boolean) : [];
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort());
}

function assertPlanShape(plan) {
  if (plan.version !== EXPECTED_PLAN_VERSION) {
    throw new Error(`PLAN_VERSION_MISMATCH:${plan.version}`);
  }
  if (plan.audit_only !== true || plan.db_writes !== false) {
    throw new Error('PLAN_NOT_AUDIT_ONLY');
  }
  if (plan.quarantine_applied !== false || plan.destructive_actions_applied !== false) {
    throw new Error('PLAN_ALREADY_APPLIED');
  }
}

async function loadPlan() {
  const plan = JSON.parse(await fs.readFile(PLAN_PATH, 'utf8'));
  assertPlanShape(plan);
  return plan;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function loadAscendedParents(client) {
  const rows = await queryRows(
    client,
    `select id, set_code, number, number_plain, name, gv_id
     from public.card_prints
     where lower(set_code) = any($1::text[])`,
    [['me02.5', 'me2pt5', 'ascended_heroes', 'asc']],
  );
  const byNumber = new Map();
  for (const row of rows) {
    const key = normalizeNumber(row.number_plain ?? row.number);
    if (!byNumber.has(key)) byNumber.set(key, []);
    byNumber.get(key).push(row);
  }
  return byNumber;
}

function validateAddParents(addRows, parentsByNumber) {
  const blocked = [];
  const ready = [];
  for (const row of addRows) {
    const parents = parentsByNumber.get(normalizeNumber(row.normalized_card_number ?? row.card_number)) ?? [];
    const matchingParents = parents.filter((parent) => normalizeText(parent.name) === normalizeText(row.index_card_name));
    if (matchingParents.length !== 1) {
      blocked.push({
        ...row,
        readiness_blocker: matchingParents.length === 0 ? 'parent_card_print_not_found' : 'parent_card_print_ambiguous',
        parent_match_count: matchingParents.length,
      });
      continue;
    }
    ready.push({
      ...row,
      target_card_print_id: matchingParents[0].id,
      target_parent_gv_id: matchingParents[0].gv_id,
    });
  }
  return { ready, blocked };
}

async function validateRemoveDependencies(client, removeRows) {
  if (removeRows.length === 0) return { ready: [], blocked: [] };
  const ids = removeRows.map((row) => row.grookai_printing_id);
  const dependencyRows = await queryRows(
    client,
    `select
       p.id as card_printing_id,
       (
         select count(*)::int
         from public.vault_item_instances vii
         where vii.card_printing_id = p.id
       ) as vault_item_instance_count,
       (
         select count(*)::int
         from public.external_printing_mappings epm
         where epm.card_printing_id = p.id
       ) as external_printing_mapping_count,
       (
         select count(*)::int
         from public.canon_warehouse_candidates cwc
         where cwc.promoted_card_printing_id = p.id
       ) as warehouse_candidate_count
     from public.card_printings p
     where p.id = any($1::uuid[])`,
    [ids],
  );
  const dependencyById = new Map(dependencyRows.map((row) => [row.card_printing_id, row]));
  const ready = [];
  const blocked = [];
  for (const row of removeRows) {
    const dependency = dependencyById.get(row.grookai_printing_id);
    if (!dependency) {
      blocked.push({ ...row, readiness_blocker: 'candidate_printing_missing' });
      continue;
    }
    const dependencyTotal = Number(dependency.vault_item_instance_count ?? 0)
      + Number(dependency.external_printing_mapping_count ?? 0)
      + Number(dependency.warehouse_candidate_count ?? 0);
    if (dependencyTotal > 0) {
      blocked.push({ ...row, readiness_blocker: 'downstream_dependency_present', dependency });
      continue;
    }
    ready.push(row);
  }
  return { ready, blocked };
}

async function validateAddExistingPrintings(client, addRows) {
  if (addRows.length === 0) return [];
  const payload = addRows.map((row) => ({
    card_print_id: row.target_card_print_id,
    finish_key: row.finish_key,
  }));
  return queryRows(
    client,
    `select p.card_print_id, p.finish_key, p.id as existing_printing_id
     from public.card_printings p
     join jsonb_to_recordset($1::jsonb) as payload(card_print_id uuid, finish_key text)
       on payload.card_print_id = p.card_print_id
      and payload.finish_key = p.finish_key`,
    [JSON.stringify(payload)],
  );
}

function buildPlannedPrintingGvId(row) {
  const suffix = FINISH_GV_SUFFIX[row.finish_key];
  if (!suffix) throw new Error(`UNSUPPORTED_PRINTING_GV_SUFFIX:${row.finish_key}`);
  if (!row.target_parent_gv_id) return null;
  return `${row.target_parent_gv_id}-${suffix}`;
}

async function validatePrintingGvIds(client, addRows) {
  const planned = addRows.map((row) => ({
    ...row,
    planned_printing_gv_id: buildPlannedPrintingGvId(row),
  }));
  const ids = planned.map((row) => row.planned_printing_gv_id).filter(Boolean);
  const duplicatePlanned = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicatePlanned.length > 0) {
    return {
      planned,
      blockers: uniqueSorted(duplicatePlanned).map((id) => ({
        blocker: 'planned_printing_gv_id_duplicate',
        planned_printing_gv_id: id,
        reason: 'The apply plan generated duplicate child printing public IDs.',
      })),
    };
  }
  if (ids.length === 0) return { planned, blockers: [] };
  const collisions = await queryRows(
    client,
    `select 'card_printings' as surface, id::text as id, printing_gv_id as value
     from public.card_printings
     where printing_gv_id = any($1::text[])
     union all
     select 'card_prints' as surface, id::text as id, gv_id as value
     from public.card_prints
     where gv_id = any($1::text[])`,
    [ids],
  );
  return {
    planned,
    blockers: collisions.map((row) => ({
      blocker: 'printing_gv_id_collision',
      planned_printing_gv_id: row.value,
      reason: `Planned child printing public ID already exists on ${row.surface}:${row.id}.`,
    })),
  };
}

async function analyzePlan(plan) {
  const rows = plan.rows ?? [];
  const removeRows = rows.filter((row) => row.action === 'remove_or_quarantine_candidate');
  const addRows = rows.filter((row) => row.action === 'add_missing_printing_candidate');
  const manualRows = rows.filter((row) => row.action === 'manual_review_required');
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DB_CONNECTION_STRING_MISSING');

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const finishKeys = await queryRows(client, 'select key from public.finish_keys order by key');
    const availableFinishKeys = new Set(finishKeys.map((row) => row.key));
    const missingFinishKeys = uniqueSorted(rows
      .filter((row) => row.status === 'missing_from_grookai')
      .map((row) => row.finish_key)
      .filter((finishKey) => !availableFinishKeys.has(finishKey)));
    const parentsByNumber = await loadAscendedParents(client);
    const parentValidation = validateAddParents(addRows, parentsByNumber);
    const existingAddPrintings = await validateAddExistingPrintings(client, parentValidation.ready);
    const printingGvValidation = await validatePrintingGvIds(client, parentValidation.ready);
    const removeValidation = await validateRemoveDependencies(client, removeRows);

    const blockers = [
      ...manualRows.map((row) => ({
        blocker: rowBlockers(row)[0] ?? row.safety_class ?? 'manual_review_required',
        card_number: row.card_number,
        card_name: row.grookai_card_name ?? row.index_card_name,
        finish_key: row.finish_key,
        reason: row.reason,
      })),
      ...parentValidation.blocked.map((row) => ({
        blocker: row.readiness_blocker,
        card_number: row.card_number,
        card_name: row.index_card_name,
        finish_key: row.finish_key,
        reason: 'Missing printing parent card_print could not be resolved exactly.',
      })),
      ...existingAddPrintings.map((row) => ({
        blocker: 'target_printing_already_exists',
        card_print_id: row.card_print_id,
        finish_key: row.finish_key,
        existing_printing_id: row.existing_printing_id,
        reason: 'A planned missing printing already exists in card_printings.',
      })),
      ...printingGvValidation.blockers,
      ...removeValidation.blocked.map((row) => ({
        blocker: row.readiness_blocker,
        card_number: row.card_number,
        card_name: row.grookai_card_name,
        finish_key: row.finish_key,
        printing_id: row.grookai_printing_id,
        reason: 'A remove/quarantine candidate failed live dependency validation.',
      })),
    ];

    return {
      version: 'ASCENDED_HEROES_APPLY_READINESS_V1',
      generated_at: new Date().toISOString(),
      source_plan_path: path.relative(REPO_ROOT, PLAN_PATH).replace(/\\/g, '/'),
      audit_only: true,
      db_writes: false,
      mode: DRY_RUN ? 'dry-run' : 'apply-requested',
      ready_to_apply: blockers.length === 0,
      apply_supported_by_this_runner: true,
      stop_reason: blockers.length > 0
        ? 'Guardrail blockers must be resolved before any write-capable apply path is approved.'
        : 'Plan is readiness-clean. Apply still requires explicit canon maintenance mode and confirmation.',
      summary: {
        remove_or_quarantine_candidates: removeRows.length,
        remove_candidates_live_dependency_clean: removeValidation.ready.length,
        add_missing_printing_candidates: addRows.length,
        add_candidates_parent_resolved: parentValidation.ready.length,
        manual_review_holds: manualRows.length,
        blocker_count: blockers.length,
        blockers_by_type: countBy(blockers, (row) => row.blocker),
        remove_candidates_by_finish: countBy(removeRows, (row) => row.finish_key),
        add_candidates_by_finish: countBy(addRows, (row) => row.finish_key),
        available_finish_keys: uniqueSorted([...availableFinishKeys]),
        missing_finish_keys: missingFinishKeys,
      },
      blockers,
      apply_plan: {
        add_rows: blockers.length === 0 ? printingGvValidation.planned : [],
        remove_rows: blockers.length === 0 ? removeValidation.ready : [],
      },
    };
  } finally {
    await client.end().catch(() => {});
  }
}

async function writeRollbackArtifact(backupRows, insertedRows, deletedRows) {
  const artifact = {
    version: 'ASCENDED_HEROES_NORMALIZATION_ROLLBACK_V1',
    generated_at: new Date().toISOString(),
    note: 'Rollback must be reviewed before use. It only restores/deletes rows captured by exact IDs from this apply.',
    deleted_card_printings_backup: backupRows,
    inserted_card_printings: insertedRows,
    deleted_card_printings: deletedRows,
  };
  const fileName = `ascended_heroes_normalization_rollback_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await fs.writeFile(path.join(OUTPUT_DIR, fileName), `${JSON.stringify(artifact, null, 2)}\n`);
  return fileName;
}

async function applyPlan(report) {
  if (!report.ready_to_apply) {
    throw new Error('APPLY_BLOCKED:readiness report is not clean.');
  }
  const addRows = report.apply_plan?.add_rows ?? [];
  const removeRows = report.apply_plan?.remove_rows ?? [];
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DB_CONNECTION_STRING_MISSING');

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('begin');

    const removeIds = removeRows.map((row) => row.grookai_printing_id);
    const backupRows = removeIds.length > 0
      ? await queryRows(client, 'select * from public.card_printings where id = any($1::uuid[]) order by id', [removeIds])
      : [];
    if (backupRows.length !== removeIds.length) {
      throw new Error(`REMOVE_BACKUP_COUNT_MISMATCH:${backupRows.length}:${removeIds.length}`);
    }

    const addPayload = addRows.map((row) => ({
      card_print_id: row.target_card_print_id,
      finish_key: row.finish_key,
      printing_gv_id: row.planned_printing_gv_id,
      provenance_source: 'verified_master_set_index_v1',
      provenance_ref: 'docs/audits/verified_master_set_index_v1/ascended_heroes/ascended_heroes_verified_index_v1.json',
      created_by: 'ascended_heroes_printing_truth_normalization_apply_v1',
    }));
    const insertedRows = addPayload.length > 0
      ? await queryRows(
        client,
        `insert into public.card_printings (
           card_print_id,
           finish_key,
           printing_gv_id,
           provenance_source,
           provenance_ref,
           created_by
         )
         select
           payload.card_print_id,
           payload.finish_key,
           payload.printing_gv_id,
           payload.provenance_source,
           payload.provenance_ref,
           payload.created_by
         from jsonb_to_recordset($1::jsonb) as payload(
           card_print_id uuid,
           finish_key text,
           printing_gv_id text,
           provenance_source text,
           provenance_ref text,
           created_by text
         )
         returning *`,
        [JSON.stringify(addPayload)],
      )
      : [];
    if (insertedRows.length !== addPayload.length) {
      throw new Error(`INSERT_COUNT_MISMATCH:${insertedRows.length}:${addPayload.length}`);
    }

    const deletedRows = removeIds.length > 0
      ? await queryRows(
        client,
        `delete from public.card_printings p
         where p.id = any($1::uuid[])
           and not exists (
             select 1 from public.vault_item_instances vii
             where vii.card_printing_id = p.id
           )
           and not exists (
             select 1 from public.external_printing_mappings epm
             where epm.card_printing_id = p.id
           )
           and not exists (
             select 1 from public.canon_warehouse_candidates cwc
             where cwc.promoted_card_printing_id = p.id
           )
         returning *`,
        [removeIds],
      )
      : [];
    if (deletedRows.length !== removeIds.length) {
      throw new Error(`DELETE_COUNT_MISMATCH:${deletedRows.length}:${removeIds.length}`);
    }

    const rollbackArtifact = await writeRollbackArtifact(backupRows, insertedRows, deletedRows);
    await client.query('commit');
    return {
      applied: true,
      inserted_printings: insertedRows.length,
      deleted_printings: deletedRows.length,
      rollback_artifact: rollbackArtifact,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

function buildReadinessMarkdown(report) {
  return [
    '# Ascended Heroes Apply Readiness V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'Audit only. This runner did not write to the database.',
    '',
    `Ready to apply: ${report.ready_to_apply}`,
    '',
    `Stop reason: ${report.stop_reason}`,
    '',
    '## Summary',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(report.summary).map(([key, value]) => [
        key,
        Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : value,
      ]),
    ),
    '',
    '## Blockers',
    '',
    report.blockers.length > 0
      ? markdownTable(
        ['blocker', 'number', 'name', 'finish', 'reason'],
        report.blockers.map((row) => [
          row.blocker,
          row.card_number ?? '',
          row.card_name ?? '',
          row.finish_key ?? '',
          row.reason ?? '',
        ]),
      )
      : 'No readiness blockers.',
    '',
  ].join('\n');
}

async function writeReadinessReport(report) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUTPUT_DIR, READINESS_JSON), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(OUTPUT_DIR, READINESS_MD), buildReadinessMarkdown(report));
}

async function main() {
  const mode = parseMode();
  const plan = await loadPlan();
  const report = await analyzePlan(plan);
  await writeReadinessReport(report);
  console.log(JSON.stringify({
    mode,
    ready_to_apply: report.ready_to_apply,
    blocker_count: report.summary.blocker_count,
    blockers_by_type: report.summary.blockers_by_type,
    report: path.relative(REPO_ROOT, path.join(OUTPUT_DIR, READINESS_JSON)).replace(/\\/g, '/'),
  }, null, 2));

  if (mode === 'apply') {
    if (process.env.ASCENDED_HEROES_NORMALIZATION_CONFIRM !== APPLY_CONFIRMATION) {
      throw new Error(`APPLY_CONFIRMATION_MISSING:set ASCENDED_HEROES_NORMALIZATION_CONFIRM=${APPLY_CONFIRMATION}`);
    }
    const applyResult = await applyPlan(report);
    console.log(JSON.stringify(applyResult, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
