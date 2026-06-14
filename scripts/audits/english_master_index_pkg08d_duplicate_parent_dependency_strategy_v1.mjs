import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const SOURCE_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08c_duplicate_parent_transfer_plan_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_strategy_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg08d_duplicate_parent_dependency_strategy_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260610_pkg08d_duplicate_parent_dependency_strategy_checkpoint_v1.md');

const ALLOWED_TRANSFER_TABLES = new Set([
  'canon_warehouse_candidates',
  'card_print_species',
  'external_mappings',
  'justtcg_variant_price_snapshots',
  'justtcg_variant_prices_latest',
  'justtcg_variants',
]);

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) out[keyFn(row)] = (out[keyFn(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([left], [right]) => left.localeCompare(right)));
}

function speciesSignature(row) {
  return stableJson({
    species_id: row.species_id,
    role: row.role,
    active: row.active,
  });
}

async function readDependencyRows(client, blockedIds, survivorIds) {
  const allIds = [...new Set([...blockedIds, ...survivorIds])];
  const externalMappings = await client.query(
    `select id::text, card_print_id::text, source, external_id
     from public.external_mappings
     where card_print_id = any($1::uuid[])
     order by card_print_id, source, external_id, id`,
    [allIds],
  );
  const species = await client.query(
    `select id::text, card_print_id::text, species_id::text, role, counts_for_completion, source, evidence, active
     from public.card_print_species
     where card_print_id = any($1::uuid[])
     order by card_print_id, species_id, role, source, id`,
    [allIds],
  );
  const warehouse = await client.query(
    `select id::text, promoted_card_print_id::text, state, promotion_result_type
     from public.canon_warehouse_candidates
     where promoted_card_print_id = any($1::uuid[])
     order by promoted_card_print_id, id`,
    [blockedIds],
  );
  const variants = await client.query(
    `select variant_id, card_print_id::text, condition, printing, language
     from public.justtcg_variants
     where card_print_id = any($1::uuid[])
     order by card_print_id, variant_id`,
    [blockedIds],
  );
  const latest = await client.query(
    `select variant_id, card_print_id::text, condition, printing, language
     from public.justtcg_variant_prices_latest
     where card_print_id = any($1::uuid[])
     order by card_print_id, variant_id`,
    [blockedIds],
  );
  const snapshots = await client.query(
    `select card_print_id::text, count(*)::int as rows
     from public.justtcg_variant_price_snapshots
     where card_print_id = any($1::uuid[])
     group by card_print_id
     order by card_print_id`,
    [blockedIds],
  );

  return {
    external_mappings: externalMappings.rows,
    species: species.rows,
    warehouse_candidates: warehouse.rows,
    justtcg_variants: variants.rows,
    justtcg_latest: latest.rows,
    justtcg_snapshots: snapshots.rows,
  };
}

function rowsByCardPrint(rows) {
  const map = new Map();
  for (const row of rows) {
    const id = row.card_print_id ?? row.promoted_card_print_id;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(row);
  }
  return map;
}

function buildStrategies(sourcePlans, dependencyRows) {
  const mappingsByParent = rowsByCardPrint(dependencyRows.external_mappings);
  const speciesByParent = rowsByCardPrint(dependencyRows.species);
  const warehouseByParent = rowsByCardPrint(dependencyRows.warehouse_candidates);
  const variantsByParent = rowsByCardPrint(dependencyRows.justtcg_variants);
  const latestByParent = rowsByCardPrint(dependencyRows.justtcg_latest);
  const snapshotRowsByParent = new Map(dependencyRows.justtcg_snapshots.map((row) => [row.card_print_id, Number(row.rows)]));

  return sourcePlans.map((plan) => {
    const blockedRows = plan.blocked_card_print_ids.map((blockedId) => {
      const survivorSpeciesSignatures = new Set((speciesByParent.get(plan.survivor_card_print_id) ?? []).map(speciesSignature));
      const blockedSpeciesRows = speciesByParent.get(blockedId) ?? [];
      const speciesTransferRows = blockedSpeciesRows.filter((row) => !survivorSpeciesSignatures.has(speciesSignature(row)));
      const speciesRedundantRows = blockedSpeciesRows.length - speciesTransferRows.length;
      const dependencyTables = new Set(plan.blocked_dependency_tables ?? []);
      const unsupportedTables = [...dependencyTables].filter((table) => !ALLOWED_TRANSFER_TABLES.has(table));
      return {
        blocked_card_print_id: blockedId,
        survivor_card_print_id: plan.survivor_card_print_id,
        external_mappings_update_rows: (mappingsByParent.get(blockedId) ?? []).length,
        card_print_species_transfer_rows: speciesTransferRows.length,
        card_print_species_redundant_rows: speciesRedundantRows,
        canon_warehouse_candidates_update_rows: (warehouseByParent.get(blockedId) ?? []).length,
        justtcg_variants_update_rows: (variantsByParent.get(blockedId) ?? []).length,
        justtcg_latest_update_rows: (latestByParent.get(blockedId) ?? []).length,
        justtcg_snapshot_update_rows: snapshotRowsByParent.get(blockedId) ?? 0,
        unsupported_dependency_tables: unsupportedTables,
      };
    });

    const unsupportedTables = [...new Set(blockedRows.flatMap((row) => row.unsupported_dependency_tables))].sort();
    const updateCount = blockedRows.reduce((sum, row) => (
      sum +
      row.external_mappings_update_rows +
      row.card_print_species_transfer_rows +
      row.canon_warehouse_candidates_update_rows +
      row.justtcg_variants_update_rows +
      row.justtcg_latest_update_rows +
      row.justtcg_snapshot_update_rows
    ), 0);
    const readiness = unsupportedTables.length
      ? 'blocked_unsupported_dependency_table'
      : 'dry_run_artifact_candidate_with_dependency_transfer';
    return {
      readiness,
      recommended_next_step: readiness === 'dry_run_artifact_candidate_with_dependency_transfer'
        ? 'prepare_rollback_only_dependency_transfer_dry_run_artifact'
        : 'manual_dependency_strategy_required',
      set_key: plan.set_key,
      set_name: plan.set_name,
      card_number: plan.card_number,
      card_name: plan.card_name,
      finish_keys_needed: plan.finish_keys_needed,
      survivor_card_print_id: plan.survivor_card_print_id,
      blocked_card_print_ids: plan.blocked_card_print_ids,
      blocked_rows: blockedRows,
      total_update_rows_before_parent_delete: updateCount,
      unsupported_dependency_tables: unsupportedTables,
    };
  });
}

function summarize(strategies) {
  const candidates = strategies.filter((row) => row.readiness === 'dry_run_artifact_candidate_with_dependency_transfer');
  const total = (field) => candidates.reduce((sum, plan) => sum + plan.blocked_rows.reduce((inner, row) => inner + row[field], 0), 0);
  return {
    strategy_rows: strategies.length,
    by_readiness: countBy(strategies, (row) => row.readiness),
    dry_run_candidate_groups: candidates.length,
    dry_run_candidate_blocked_parent_rows: candidates.reduce((sum, row) => sum + row.blocked_card_print_ids.length, 0),
    planned_updates: {
      external_mappings: total('external_mappings_update_rows'),
      card_print_species_transfer: total('card_print_species_transfer_rows'),
      card_print_species_redundant_left_for_parent_delete_cascade: total('card_print_species_redundant_rows'),
      canon_warehouse_candidates: total('canon_warehouse_candidates_update_rows'),
      justtcg_variants: total('justtcg_variants_update_rows'),
      justtcg_variant_prices_latest: total('justtcg_latest_update_rows'),
      justtcg_variant_price_snapshots: total('justtcg_snapshot_update_rows'),
    },
    by_set: Object.entries(countBy(strategies, (row) => row.set_key))
      .map(([set_key, count]) => ({ set_key, count }))
      .sort((left, right) => right.count - left.count || left.set_key.localeCompare(right.set_key)),
  };
}

function renderMarkdown(report) {
  const readinessRows = Object.entries(report.summary.by_readiness).map(([readiness, count]) => [readiness, count]);
  const updateRows = Object.entries(report.summary.planned_updates).map(([table, count]) => [table, count]);
  const setRows = report.summary.by_set.slice(0, 30).map((row) => [row.set_key, row.count]);
  return `# PKG-08D Duplicate Parent Dependency Strategy V1

Read-only dependency-transfer strategy for PKG-08C duplicate parent rows.

No DB writes, migrations, cleanup, quarantine, merge, delete, SQL artifact execution, or apply path was executed.

## Summary

- status: \`${report.audit_status}\`
- package_fingerprint_sha256: \`${report.package_fingerprint_sha256}\`
- dry_run_candidate_groups: ${report.summary.dry_run_candidate_groups}
- dry_run_candidate_blocked_parent_rows: ${report.summary.dry_run_candidate_blocked_parent_rows}

## Readiness

${markdownTable(['readiness', 'count'], readinessRows)}

## Planned Dependency Updates

${markdownTable(['dependency', 'rows'], updateRows)}

## Sets

${markdownTable(['set', 'groups'], setRows)}

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- merge_performed: ${report.merge_performed}
- delete_performed: ${report.delete_performed}

## Next Step

Prepare a rollback-only guarded dry-run transaction artifact for these dependency-transfer candidates. That artifact must update dependencies first, verify no blocked-parent references remain, delete duplicate parents only inside a transaction, and end in \`ROLLBACK\`.
`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-10 | [PKG-08D Duplicate Parent Dependency Strategy Checkpoint V1](20260610_pkg08d_duplicate_parent_dependency_strategy_checkpoint_v1.md) | Read-only dependency-transfer strategy for duplicate parent rows. No writes or migrations. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260610_pkg08d_duplicate_parent_dependency_strategy_checkpoint_v1.md')) {
    fs.writeFileSync(indexPath, current.split('\n').map((existingLine) => (
      existingLine.includes('20260610_pkg08d_duplicate_parent_dependency_strategy_checkpoint_v1.md') ? line : existingLine
    )).join('\n'));
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const source = readJson(SOURCE_JSON);
  const sourcePlans = (source.transfer_plans ?? [])
    .filter((row) => row.readiness === 'dependency_transfer_strategy_required');
  const blockedIds = [...new Set(sourcePlans.flatMap((row) => row.blocked_card_print_ids))].sort();
  const survivorIds = [...new Set(sourcePlans.map((row) => row.survivor_card_print_id).filter(Boolean))].sort();
  const conn = connectionString();
  const stopFindings = [];
  let dependencyRows = {
    external_mappings: [],
    species: [],
    warehouse_candidates: [],
    justtcg_variants: [],
    justtcg_latest: [],
    justtcg_snapshots: [],
  };

  if (!conn) {
    stopFindings.push('database_connection_unavailable');
  } else {
    const client = new Client({ connectionString: conn });
    await client.connect();
    try {
      await client.query('begin read only');
      await client.query('set transaction read only');
      dependencyRows = await readDependencyRows(client, blockedIds, survivorIds);
      await client.query('rollback');
    } catch (error) {
      await client.query('rollback').catch(() => {});
      stopFindings.push(`database_read_failed: ${error.message}`);
    } finally {
      await client.end().catch(() => {});
    }
  }

  const strategies = buildStrategies(sourcePlans, dependencyRows);
  const summary = summarize(strategies);
  const packagePayload = {
    package_id: 'PKG-08D-DUPLICATE-PARENT-DEPENDENCY-STRATEGY',
    candidates: strategies
      .filter((row) => row.readiness === 'dry_run_artifact_candidate_with_dependency_transfer')
      .map((row) => ({
        set_key: row.set_key,
        card_number: row.card_number,
        card_name: row.card_name,
        survivor_card_print_id: row.survivor_card_print_id,
        blocked_card_print_ids: row.blocked_card_print_ids,
      })),
  };
  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg08d_duplicate_parent_dependency_strategy_v1',
    package_id: 'PKG-08D-DUPLICATE-PARENT-DEPENDENCY-STRATEGY',
    audit_only: true,
    db_reads_performed: Boolean(conn),
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    merge_performed: false,
    delete_performed: false,
    apply_paths_executed: false,
    audit_status: stopFindings.length === 0
      ? 'pkg08d_duplicate_parent_dependency_strategy_complete_no_write'
      : 'pkg08d_duplicate_parent_dependency_strategy_blocked',
    package_fingerprint_sha256: sha256(stableJson(packagePayload)),
    source_artifacts: {
      duplicate_parent_transfer_plan: path.relative(ROOT, SOURCE_JSON).replaceAll('\\', '/'),
    },
    allowed_transfer_tables: [...ALLOWED_TRANSFER_TABLES].sort(),
    summary,
    dependency_strategies: strategies,
    stop_findings: stopFindings,
    pass: stopFindings.length === 0,
  };

  writeJson(OUTPUT_JSON, report);
  writeText(OUTPUT_MD, renderMarkdown(report));
  writeText(CHECKPOINT_MD, renderMarkdown(report));
  updateCheckpointIndex();

  console.log(JSON.stringify({
    audit_status: report.audit_status,
    package_fingerprint_sha256: report.package_fingerprint_sha256,
    summary: report.summary,
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    db_writes_performed: false,
    migrations_created: false,
    stop_findings: stopFindings,
  }, null, 2));

  if (!report.pass) process.exitCode = 1;
}

await main();
