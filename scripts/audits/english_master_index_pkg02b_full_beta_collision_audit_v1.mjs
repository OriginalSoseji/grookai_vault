import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const ROOT = process.cwd();
const AUDIT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'verified_master_set_index_v1',
  'english_master_index_v1',
);
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const ARTIFACT_JSON = path.join(
  AUDIT_DIR,
  'english_master_index_pkg02b_full_beta_final_snapshot_transaction_artifact_v1.json',
);
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02b_full_beta_collision_audit_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg02b_full_beta_collision_audit_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg02b_full_beta_collision_audit_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-02B-FULL-BETA';
const PACKAGE_FINGERPRINT = '932c4fe9c332c1896aecaeac08bd1faf1e005fd1eb9f07f3a50bf8ad2a83c7b8';
const UNIQUE_INDEX_NAME = 'uq_card_prints_identity_v2_standard_sets';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function mdEscape(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function numberPlain(number) {
  if (number === null || number === undefined) return null;
  const value = String(number);
  if (/^[A-Za-z][0-9]+$/.test(value)) return value.toUpperCase();
  if (/[0-9]/.test(value)) {
    return value.replace(/\/.*$/, '').replace(/[^0-9]/g, '');
  }
  return value;
}

function identityKey(row) {
  if (!row.set_id || !row.number_plain || row.set_identity_model !== 'standard') return null;
  return [
    row.set_id,
    row.number_plain,
    row.printed_identity_modifier ?? '',
    row.variant_key ?? '',
  ].join('|');
}

async function readDatabaseContext(cardPrintIds) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      index: null,
      target_rows: [],
      affected_set_rows: [],
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');

    const indexResult = await client.query(
      `select indexname, indexdef
       from pg_indexes
       where schemaname = 'public'
         and tablename = 'card_prints'
         and indexname = $1`,
      [UNIQUE_INDEX_NAME],
    );

    const targetResult = await client.query(
      `select
         cp.id,
         cp.set_id,
         cp.set_code,
         s.code as resolved_set_code,
         s.name as resolved_set_name,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.printed_identity_modifier,
         cp.variant_key,
         cp.set_identity_model,
         coalesce((
           select count(*)::integer
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), 0) as child_printing_count,
         coalesce((
           select count(*)::integer
           from public.vault_items vi
           where vi.card_id = cp.id
         ), 0) as vault_item_count
       from public.card_prints cp
       left join public.sets s on s.id = cp.set_id
       where cp.id = any($1::uuid[])
       order by s.code nulls first, cp.number_plain nulls first, cp.name, cp.id`,
      [cardPrintIds],
    );

    const setIds = [...new Set(targetResult.rows.map((row) => row.set_id).filter(Boolean))];
    const affectedResult = await client.query(
      `select
         cp.id,
         cp.set_id,
         cp.set_code,
         s.code as resolved_set_code,
         s.name as resolved_set_name,
         cp.number,
         cp.number_plain,
         cp.name,
         cp.printed_identity_modifier,
         cp.variant_key,
         cp.set_identity_model,
         coalesce((
           select count(*)::integer
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), 0) as child_printing_count,
         coalesce((
           select count(*)::integer
           from public.vault_items vi
           where vi.card_id = cp.id
         ), 0) as vault_item_count
       from public.card_prints cp
       left join public.sets s on s.id = cp.set_id
       where cp.set_id = any($1::uuid[])
         and cp.number_plain is not null
         and cp.set_identity_model = 'standard'
       order by s.code nulls first, cp.number_plain nulls first, cp.name, cp.id`,
      [setIds],
    );

    await client.query('rollback');
    return {
      available: true,
      reason: null,
      index: indexResult.rows[0] ?? null,
      target_rows: targetResult.rows,
      affected_set_rows: affectedResult.rows,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: error.message,
      index: null,
      target_rows: [],
      affected_set_rows: [],
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function validateArtifact(artifact) {
  const findings = [];
  const scope = artifact.package_scope ?? {};
  if (artifact.artifact_status !== 'pkg02b_full_beta_final_snapshot_and_transaction_artifact_prepared_apply_blocked_no_write') {
    findings.push('source_artifact_status_not_ready');
  }
  if (scope.package_id !== PACKAGE_ID) findings.push('source_artifact_wrong_package_id');
  if (scope.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) findings.push('source_artifact_fingerprint_mismatch');
  if (scope.selected_package_count !== 18) findings.push('source_artifact_package_count_not_18');
  if (scope.card_print_rows !== 422) findings.push('source_artifact_card_print_count_not_422');
  if (scope.child_printing_rows !== 643) findings.push('source_artifact_child_printing_count_not_643');
  if ((scope.excluded_set_keys ?? []).length !== 0) findings.push('source_artifact_has_exclusions');
  if (artifact.db_writes_performed !== false) findings.push('source_artifact_reports_db_write');
  if (artifact.migrations_created !== false) findings.push('source_artifact_reports_migration');
  return findings;
}

function classifyRows(artifact, db) {
  const matrix = artifact.mutation_matrix ?? [];
  const targetById = new Map(db.target_rows.map((row) => [row.id, row]));
  const packageIds = new Set(matrix.map((row) => row.card_print_id));

  const simulatedPackageRows = matrix.map((row) => {
    const current = targetById.get(row.card_print_id);
    const target = row.target_parent_fields ?? {};
    const simulated = {
      id: row.card_print_id,
      set_id: current?.set_id ?? null,
      set_code: target.set_code ?? current?.set_code ?? null,
      resolved_set_code: current?.resolved_set_code ?? null,
      resolved_set_name: current?.resolved_set_name ?? null,
      number: target.number ?? current?.number ?? null,
      number_plain: numberPlain(target.number ?? current?.number ?? null),
      name: target.name ?? current?.name ?? null,
      printed_identity_modifier: current?.printed_identity_modifier ?? null,
      variant_key: current?.variant_key ?? null,
      set_identity_model: current?.set_identity_model ?? null,
      child_printing_count: Number(current?.child_printing_count ?? row.child_printing_count_before ?? 0),
      vault_item_count: Number(current?.vault_item_count ?? row.vault_items_referencing_target ?? 0),
      source_package_set_key: row.set_key,
      source_package_set_name: row.set_name,
      current_parent_fields: row.current_parent_fields,
      target_parent_fields: row.target_parent_fields,
      evidence_sources: row.evidence_sources ?? [],
    };
    return {
      ...simulated,
      identity_key: identityKey(simulated),
      target_row_exists: Boolean(current),
    };
  });

  const simulatedById = new Map(simulatedPackageRows.map((row) => [row.id, row]));
  const postStateRows = [
    ...db.affected_set_rows
      .filter((row) => !packageIds.has(row.id))
      .map((row) => ({ ...row, identity_key: identityKey(row), row_origin: 'existing_unmodified_db_row' })),
    ...simulatedPackageRows.map((row) => ({ ...row, row_origin: 'pkg02b_simulated_target_row' })),
  ].filter((row) => row.identity_key);

  const rowsByKey = new Map();
  for (const row of postStateRows) {
    if (!rowsByKey.has(row.identity_key)) rowsByKey.set(row.identity_key, []);
    rowsByKey.get(row.identity_key).push(row);
  }

  const collisionKeys = new Map([...rowsByKey.entries()].filter(([, rows]) => rows.length > 1));

  const classifiedRows = simulatedPackageRows.map((row) => {
    const keyRows = collisionKeys.get(row.identity_key) ?? [];
    const conflictingRows = keyRows
      .filter((candidate) => candidate.id !== row.id)
      .map((candidate) => ({
        card_print_id: candidate.id,
        row_origin: candidate.row_origin,
        set_code: candidate.resolved_set_code ?? candidate.set_code,
        set_name: candidate.resolved_set_name,
        number: candidate.number,
        number_plain: candidate.number_plain,
        name: candidate.name,
        printed_identity_modifier: candidate.printed_identity_modifier,
        variant_key: candidate.variant_key,
        child_printing_count: Number(candidate.child_printing_count ?? 0),
        vault_item_count: Number(candidate.vault_item_count ?? 0),
      }));
    const status = conflictingRows.length > 0
      ? 'blocked_unique_identity_collision'
      : 'non_colliding';
    return {
      status,
      card_print_id: row.id,
      source_package_set_key: row.source_package_set_key,
      source_package_set_name: row.source_package_set_name,
      target_set_code: row.target_parent_fields?.set_code ?? null,
      resolved_set_code: row.resolved_set_code,
      target_number: row.target_parent_fields?.number ?? null,
      target_number_plain: row.number_plain,
      target_name: row.target_parent_fields?.name ?? null,
      printed_identity_modifier: row.printed_identity_modifier,
      variant_key: row.variant_key,
      set_identity_model: row.set_identity_model,
      identity_key: row.identity_key,
      child_printing_count: row.child_printing_count,
      vault_item_count: row.vault_item_count,
      target_row_exists: row.target_row_exists,
      conflicting_rows: conflictingRows,
      evidence_sources: row.evidence_sources,
    };
  });

  const blockedRows = classifiedRows.filter((row) => row.status === 'blocked_unique_identity_collision');
  const safeRows = classifiedRows.filter((row) => row.status === 'non_colliding');
  const collisionGroups = [...collisionKeys.entries()]
    .filter(([, rows]) => rows.some((row) => packageIds.has(row.id)))
    .map(([key, rows]) => ({
      identity_key: key,
      package_row_count: rows.filter((row) => packageIds.has(row.id)).length,
      existing_unmodified_row_count: rows.filter((row) => !packageIds.has(row.id)).length,
      rows: rows.map((row) => ({
        card_print_id: row.id,
        row_origin: row.row_origin,
        source_package_set_key: simulatedById.get(row.id)?.source_package_set_key ?? null,
        set_code: row.resolved_set_code ?? row.set_code,
        set_name: row.resolved_set_name,
        number: row.number,
        number_plain: row.number_plain,
        name: row.name,
        printed_identity_modifier: row.printed_identity_modifier,
        variant_key: row.variant_key,
        child_printing_count: Number(row.child_printing_count ?? 0),
        vault_item_count: Number(row.vault_item_count ?? 0),
      })),
    }));

  const bySet = {};
  for (const row of classifiedRows) {
    const key = row.source_package_set_key ?? 'unknown';
    bySet[key] ??= {
      set_key: key,
      set_name: row.source_package_set_name,
      total_rows: 0,
      non_colliding_rows: 0,
      blocked_collision_rows: 0,
      non_colliding_child_printings: 0,
      blocked_child_printings: 0,
      vault_refs: 0,
    };
    bySet[key].total_rows += 1;
    bySet[key].vault_refs += row.vault_item_count;
    if (row.status === 'non_colliding') {
      bySet[key].non_colliding_rows += 1;
      bySet[key].non_colliding_child_printings += row.child_printing_count;
    } else {
      bySet[key].blocked_collision_rows += 1;
      bySet[key].blocked_child_printings += row.child_printing_count;
    }
  }

  return {
    classified_rows: classifiedRows,
    safe_rows: safeRows,
    blocked_rows: blockedRows,
    collision_groups: collisionGroups,
    by_set: Object.values(bySet).sort((left, right) => left.set_key.localeCompare(right.set_key)),
    summary: {
      total_package_rows: classifiedRows.length,
      non_colliding_rows: safeRows.length,
      blocked_collision_rows: blockedRows.length,
      total_child_printings: classifiedRows.reduce((sum, row) => sum + row.child_printing_count, 0),
      non_colliding_child_printings: safeRows.reduce((sum, row) => sum + row.child_printing_count, 0),
      blocked_collision_child_printings: blockedRows.reduce((sum, row) => sum + row.child_printing_count, 0),
      total_vault_refs: classifiedRows.reduce((sum, row) => sum + row.vault_item_count, 0),
      non_colliding_vault_refs: safeRows.reduce((sum, row) => sum + row.vault_item_count, 0),
      blocked_collision_vault_refs: blockedRows.reduce((sum, row) => sum + row.vault_item_count, 0),
      collision_group_count: collisionGroups.length,
      affected_sets: Object.keys(bySet).length,
      affected_sets_with_collision_blocks: Object.values(bySet).filter((row) => row.blocked_collision_rows > 0).length,
    },
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02B Full Beta Collision Audit V1');
  lines.push('');
  lines.push('This is a read-only explanation of why the approved PKG-02B guarded dry-run transaction stopped.');
  lines.push('');
  lines.push('No real apply, migration, cleanup, quarantine, merge, delete, or durable DB write was performed.');
  lines.push('');
  lines.push('## Result');
  lines.push('');
  lines.push(`- Status: \`${report.audit_status}\``);
  lines.push(`- Package: \`${report.package.package_id}\``);
  lines.push(`- Fingerprint: \`${report.package.package_fingerprint_sha256}\``);
  lines.push(`- Unique index: \`${report.unique_index.indexname ?? 'unavailable'}\``);
  lines.push(`- Total package rows: ${report.summary.total_package_rows}`);
  lines.push(`- Non-colliding rows: ${report.summary.non_colliding_rows}`);
  lines.push(`- Blocked collision rows: ${report.summary.blocked_collision_rows}`);
  lines.push(`- Non-colliding child printings: ${report.summary.non_colliding_child_printings}`);
  lines.push(`- Blocked collision child printings: ${report.summary.blocked_collision_child_printings}`);
  lines.push(`- Collision groups: ${report.summary.collision_group_count}`);
  lines.push(`- DB writes performed: ${report.db_writes_performed}`);
  lines.push(`- Migrations created: ${report.migrations_created}`);
  lines.push('');
  lines.push('## Unique Index');
  lines.push('');
  lines.push('```sql');
  lines.push(report.unique_index.indexdef ?? 'Unavailable');
  lines.push('```');
  lines.push('');
  lines.push('## Set Summary');
  lines.push('');
  lines.push('| Set | Rows | Non-colliding | Blocked | Non-colliding child printings | Blocked child printings | Vault refs |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const row of report.by_set) {
    lines.push(`| ${mdEscape(row.set_key)} | ${row.total_rows} | ${row.non_colliding_rows} | ${row.blocked_collision_rows} | ${row.non_colliding_child_printings} | ${row.blocked_child_printings} | ${row.vault_refs} |`);
  }
  lines.push('');
  lines.push('## Blocked Collision Rows');
  lines.push('');
  if (report.blocked_rows.length === 0) {
    lines.push('No collision rows were found.');
  } else {
    lines.push('| Set | Card | Target number | Target name | Conflicting row count |');
    lines.push('| --- | --- | ---: | --- | ---: |');
    for (const row of report.blocked_rows.slice(0, 120)) {
      lines.push(`| ${mdEscape(row.source_package_set_key)} | \`${row.card_print_id}\` | ${mdEscape(row.target_number)} | ${mdEscape(row.target_name)} | ${row.conflicting_rows.length} |`);
    }
    if (report.blocked_rows.length > 120) {
      lines.push(`| ... | ... | ... | ... | ${report.blocked_rows.length - 120} additional blocked rows omitted from Markdown; see JSON. |`);
    }
  }
  lines.push('');
  lines.push('## Next Safe Split');
  lines.push('');
  lines.push('The non-colliding rows can be prepared as a new guarded dry-run package. Collision rows require merge/dedupe adjudication and must stay blocked from apply.');
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  for (const item of report.safety) {
    lines.push(`- ${item}`);
  }
  return `${lines.join('\n')}\n`;
}

function updateCheckpointIndex(reportPath) {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const entry = `- 2026-06-09: PKG-02B full beta collision audit after guarded dry-run unique-index stop. Report: \`${path.relative(ROOT, reportPath).replaceAll('\\', '/')}\``;
  let content = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (!content.includes(entry)) {
    content = `${content.trimEnd()}\n${entry}\n`;
    fs.writeFileSync(indexPath, content);
  }
}

async function main() {
  const artifact = readJson(ARTIFACT_JSON);
  const validationFindings = validateArtifact(artifact);
  const cardPrintIds = (artifact.mutation_matrix ?? []).map((row) => row.card_print_id);
  const db = await readDatabaseContext(cardPrintIds);

  const stopFindings = [...validationFindings];
  if (!db.available) stopFindings.push('database_context_unavailable');
  if (!db.index) stopFindings.push('unique_index_definition_unavailable');
  if (db.target_rows.length !== 422) stopFindings.push('target_row_count_not_422');

  const classification = db.available
    ? classifyRows(artifact, db)
    : {
      classified_rows: [],
      safe_rows: [],
      blocked_rows: [],
      collision_groups: [],
      by_set: [],
      summary: {},
    };

  const artifactBody = {
    package: artifact.package_scope,
    unique_index: db.index,
    summary: classification.summary,
    by_set: classification.by_set,
    blocked_rows: classification.blocked_rows,
    collision_groups: classification.collision_groups,
  };

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg02b_full_beta_collision_audit_v1',
    audit_only: true,
    db_reads_performed: db.available,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    real_apply_performed: false,
    package: artifact.package_scope,
    source_artifact_path: path.relative(ROOT, ARTIFACT_JSON).replaceAll('\\', '/'),
    source_artifact_sha256: sha256(fs.readFileSync(ARTIFACT_JSON, 'utf8')),
    database_context: {
      available: db.available,
      reason: db.reason,
      target_rows_found: db.target_rows.length,
      affected_set_rows_found: db.affected_set_rows.length,
    },
    unique_index: db.index,
    audit_status: stopFindings.length === 0
      ? 'pkg02b_full_beta_collision_audit_complete_split_required'
      : 'pkg02b_full_beta_collision_audit_blocked',
    summary: classification.summary,
    by_set: classification.by_set,
    non_colliding_rows: classification.safe_rows,
    blocked_rows: classification.blocked_rows,
    collision_groups: classification.collision_groups,
    split_recommendation: {
      next_package: 'PKG-02C-FULL-BETA-NONCOLLIDING',
      allowed_next_step: 'prepare_new_guarded_dry_run_artifact_for_non_colliding_rows_only',
      blocked_next_step: 'collision_rows_require_merge_dedupe_adjudication_no_apply',
      real_apply_authorized: false,
    },
    safety: [
      'No DB writes were performed.',
      'No migrations were created.',
      'No cleanup, quarantine, merge, or delete was performed.',
      'Collision rows are blocked from apply and require separate adjudication.',
      'Non-colliding rows are not approved for real apply by this report.',
    ],
    stop_findings: stopFindings,
    report_hash_sha256: sha256(stableJson(artifactBody)),
  };

  writeJson(OUTPUT_JSON, report);
  fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
  fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  fs.writeFileSync(CHECKPOINT_MD, renderMarkdown({
    ...report,
    audit_status: `${report.audit_status}_checkpoint`,
  }));
  updateCheckpointIndex(CHECKPOINT_MD);

  console.log(JSON.stringify({
    audit_status: report.audit_status,
    total_package_rows: report.summary.total_package_rows,
    non_colliding_rows: report.summary.non_colliding_rows,
    blocked_collision_rows: report.summary.blocked_collision_rows,
    collision_group_count: report.summary.collision_group_count,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
    output_json: path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
  }, null, 2));

  if (stopFindings.length > 0) process.exitCode = 1;
}

await main();
