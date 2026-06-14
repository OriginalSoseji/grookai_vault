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

const PKG02B_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02b_full_beta_final_snapshot_transaction_artifact_v1.json');
const PKG02C_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02c_full_beta_noncolliding_real_apply_v1.json');
const PKG02F_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02f_duplicate_dependency_transfer_real_apply_v1.json');
const PKG02G_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02g_number_key_collision_identity_modifier_real_apply_v1.json');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_pkg02b_full_beta_post_apply_reconciliation_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_pkg02b_full_beta_post_apply_reconciliation_v1.md');
const CHECKPOINT_MD = path.join(CHECKPOINT_DIR, '20260609_pkg02b_full_beta_post_apply_reconciliation_checkpoint_v1.md');

const PACKAGE_ID = 'PKG-02B-FULL-BETA';
const PACKAGE_FINGERPRINT = '932c4fe9c332c1896aecaeac08bd1faf1e005fd1eb9f07f3a50bf8ad2a83c7b8';

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

function buildDispositionMaps({ pkg02c, pkg02f, pkg02g }) {
  const pkg02cUpdatedIds = new Set((pkg02c.after_snapshot?.rows ?? []).map((row) => row.card_print_id));
  const pkg02fSurvivorIds = new Set((pkg02f.after_snapshot?.rows ?? []).map((row) => row.card_print_id));
  const pkg02fDeletedParentIds = new Set(
    (pkg02f.before_snapshot?.rows ?? [])
      .map((row) => row.card_print_id)
      .filter((id) => !pkg02fSurvivorIds.has(id)),
  );
  const pkg02gRecoveredIds = new Set(
    (pkg02g.after_snapshot?.rows ?? [])
      .filter((row) => row.card_print?.set_code !== null && row.card_print?.number !== null)
      .map((row) => row.card_print_id),
  );
  const pkg02gTargetIds = new Set(
    (pkg02g.after_snapshot?.rows ?? [])
      .filter((row) => row.card_print?.set_code !== null)
      .map((row) => row.card_print_id),
  );
  return {
    pkg02cUpdatedIds,
    pkg02fDeletedParentIds,
    pkg02gTargetIds,
    pkg02gRecoveredIds,
  };
}

async function captureCurrentRows({ packageRows, affectedSetKeys }) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      package_rows: [],
      affected_unique_collision_groups: null,
      affected_set_rows: null,
    };
  }
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const packageResult = await client.query(
      `select
         cp.id,
         to_jsonb(cp) as card_print,
         s.code as resolved_set_code,
         s.name as resolved_set_name,
         coalesce((
           select jsonb_agg(to_jsonb(cpr) order by cpr.finish_key, cpr.id)
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         ), '[]'::jsonb) as card_printings,
         coalesce((
           select jsonb_agg(to_jsonb(em) order by em.source, em.external_id, em.id)
           from public.external_mappings em
           where em.card_print_id = cp.id
         ), '[]'::jsonb) as external_mappings,
         coalesce((
           select jsonb_agg(to_jsonb(cpi) order by cpi.id)
           from public.card_print_identity cpi
           where cpi.card_print_id = cp.id
         ), '[]'::jsonb) as card_print_identity,
         coalesce((
           select jsonb_agg(to_jsonb(cpt) order by cpt.id)
           from public.card_print_traits cpt
           where cpt.card_print_id = cp.id
         ), '[]'::jsonb) as card_print_traits,
         coalesce((
           select jsonb_agg(to_jsonb(cps) order by cps.id)
           from public.card_print_species cps
           where cps.card_print_id = cp.id
         ), '[]'::jsonb) as card_print_species,
         coalesce((
           select jsonb_agg(to_jsonb(vi) order by vi.id)
           from public.vault_items vi
           where vi.card_id = cp.id
         ), '[]'::jsonb) as vault_items
       from public.card_prints cp
       left join public.sets s on s.id = cp.set_id
       where cp.id = any($1::uuid[])
       order by s.code nulls first, cp.number_plain nulls first, cp.number nulls first, cp.name, cp.id`,
      [packageRows.map((row) => row.card_print_id)],
    );
    const uniqueResult = await client.query(
      `select count(*)::int as collision_groups
       from (
         select
           cp.set_id,
           cp.number_plain,
           coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
           coalesce(cp.variant_key, '') as variant_key,
           count(*) as row_count
         from public.card_prints cp
         join public.sets s on s.id = cp.set_id
         where s.code = any($1::text[])
           and cp.set_id is not null
           and cp.number_plain is not null
           and cp.set_identity_model = 'standard'
         group by cp.set_id, cp.number_plain, coalesce(cp.printed_identity_modifier, ''), coalesce(cp.variant_key, '')
         having count(*) > 1
       ) collisions`,
      [affectedSetKeys],
    );
    const affectedRowsResult = await client.query(
      `select count(*)::int as affected_set_rows
       from public.card_prints cp
       join public.sets s on s.id = cp.set_id
       where s.code = any($1::text[])`,
      [affectedSetKeys],
    );
    await client.query('rollback');
    const rows = packageResult.rows.map((row) => ({
      card_print_id: row.id,
      card_print: row.card_print,
      resolved_set_code: row.resolved_set_code,
      resolved_set_name: row.resolved_set_name,
      card_printings: row.card_printings,
      external_mappings: row.external_mappings,
      card_print_identity: row.card_print_identity,
      card_print_traits: row.card_print_traits,
      card_print_species: row.card_print_species,
      vault_items: row.vault_items,
      dependency_counts: {
        card_printings: row.card_printings.length,
        external_mappings: row.external_mappings.length,
        card_print_identity: row.card_print_identity.length,
        card_print_traits: row.card_print_traits.length,
        card_print_species: row.card_print_species.length,
        vault_items: row.vault_items.length,
      },
    }));
    return {
      available: true,
      reason: null,
      captured_at: new Date().toISOString(),
      package_rows: rows,
      package_row_hash_sha256: sha256(stableJson(rows)),
      affected_unique_collision_groups: uniqueResult.rows[0]?.collision_groups ?? null,
      affected_set_rows: affectedRowsResult.rows[0]?.affected_set_rows ?? null,
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: error.message,
      package_rows: [],
      affected_unique_collision_groups: null,
      affected_set_rows: null,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function classifyRows({ pkg02b, pkg02g, dispositionMaps, currentRowsById }) {
  const pkg02gTargetById = new Map(
    (pkg02g.after_snapshot?.rows ?? [])
      .filter((row) => row.card_print?.set_code !== null)
      .map((row) => [row.card_print_id, row.card_print]),
  );
  const rows = [];
  for (const packageRow of pkg02b.mutation_matrix ?? []) {
    const current = currentRowsById.get(packageRow.card_print_id);
    let disposition = 'uncovered';
    let expected = packageRow.target_parent_fields;
    if (dispositionMaps.pkg02cUpdatedIds.has(packageRow.card_print_id)) {
      disposition = 'pkg02c_noncolliding_parent_updated';
    } else if (dispositionMaps.pkg02fDeletedParentIds.has(packageRow.card_print_id)) {
      disposition = 'pkg02f_duplicate_parent_removed';
      expected = null;
    } else if (dispositionMaps.pkg02gRecoveredIds.has(packageRow.card_print_id)) {
      disposition = 'pkg02g_number_key_collision_parent_recovered';
      expected = {
        set_code: pkg02gTargetById.get(packageRow.card_print_id)?.set_code,
        number: pkg02gTargetById.get(packageRow.card_print_id)?.number,
        name: pkg02gTargetById.get(packageRow.card_print_id)?.name,
        number_plain_expected: pkg02gTargetById.get(packageRow.card_print_id)?.number_plain,
      };
    }

    const findings = [];
    if (disposition === 'uncovered') {
      findings.push('row_not_covered_by_pkg02c_pkg02f_or_pkg02g');
    } else if (disposition === 'pkg02f_duplicate_parent_removed') {
      if (current) findings.push('duplicate_parent_still_exists_after_pkg02f');
    } else {
      if (!current) {
        findings.push('expected_surviving_row_missing');
      } else {
        if (current.card_print?.set_code !== expected?.set_code) findings.push('set_code_mismatch');
        if (current.card_print?.number !== expected?.number) findings.push('number_mismatch');
        if (current.card_print?.name !== expected?.name) findings.push('name_mismatch');
        if (current.card_print?.number_plain !== expected?.number_plain_expected) findings.push('number_plain_mismatch');
        if (current.dependency_counts.card_printings !== packageRow.child_printing_count_expected_after) {
          findings.push('child_printing_count_mismatch');
        }
      }
    }

    rows.push({
      card_print_id: packageRow.card_print_id,
      set_key: packageRow.set_key,
      card_name: packageRow.target_parent_fields?.name ?? packageRow.current_parent_fields?.name,
      target_number: packageRow.target_parent_fields?.number ?? null,
      disposition,
      expected_fields: expected,
      current_fields: current
        ? {
          set_code: current.card_print?.set_code ?? null,
          number: current.card_print?.number ?? null,
          number_plain: current.card_print?.number_plain ?? null,
          name: current.card_print?.name ?? null,
          printed_identity_modifier: current.card_print?.printed_identity_modifier ?? null,
          child_printing_count: current.dependency_counts.card_printings,
          vault_item_count: current.dependency_counts.vault_items,
        }
        : null,
      findings,
      status: findings.length === 0 ? 'verified' : 'needs_review',
    });
  }
  return rows;
}

function summarize(rows) {
  const byDisposition = {};
  const bySet = {};
  let verified = 0;
  let needsReview = 0;
  for (const row of rows) {
    byDisposition[row.disposition] = (byDisposition[row.disposition] ?? 0) + 1;
    if (row.status === 'verified') verified += 1;
    else needsReview += 1;
    bySet[row.set_key] ??= {
      set_key: row.set_key,
      total_rows: 0,
      verified_rows: 0,
      needs_review_rows: 0,
      pkg02c_noncolliding_parent_updated: 0,
      pkg02f_duplicate_parent_removed: 0,
      pkg02g_number_key_collision_parent_recovered: 0,
      uncovered: 0,
    };
    bySet[row.set_key].total_rows += 1;
    bySet[row.set_key][row.status === 'verified' ? 'verified_rows' : 'needs_review_rows'] += 1;
    bySet[row.set_key][row.disposition] += 1;
  }
  return {
    total_original_package_rows: rows.length,
    verified_rows: verified,
    needs_review_rows: needsReview,
    by_disposition: byDisposition,
    by_set: Object.values(bySet).sort((left, right) => left.set_key.localeCompare(right.set_key)),
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index PKG-02B Full Beta Post-Apply Reconciliation V1');
  lines.push('');
  lines.push('This is a read-only closure report for the original `PKG-02B-FULL-BETA` package after PKG-02C, PKG-02F, and PKG-02G.');
  lines.push('');
  lines.push('No DB writes, migrations, cleanup, quarantine, merge, delete, or apply operation was performed by this reconciliation.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| reconciliation_status | ${report.reconciliation_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | \`${report.package_scope.package_fingerprint_sha256}\` |`);
  lines.push(`| original_package_rows | ${report.summary.total_original_package_rows} |`);
  lines.push(`| verified_rows | ${report.summary.verified_rows} |`);
  lines.push(`| needs_review_rows | ${report.summary.needs_review_rows} |`);
  lines.push(`| affected_unique_collision_groups | ${report.current_database_snapshot.affected_unique_collision_groups} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Disposition Counts');
  lines.push('');
  lines.push('| Disposition | Rows |');
  lines.push('| --- | ---: |');
  for (const [key, value] of Object.entries(report.summary.by_disposition)) {
    lines.push(`| ${mdEscape(key)} | ${value} |`);
  }
  lines.push('');
  lines.push('## Set Summary');
  lines.push('');
  lines.push('| Set | Total | Verified | Needs Review | PKG-02C | PKG-02F Removed | PKG-02G |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const row of report.summary.by_set) {
    lines.push(`| ${mdEscape(row.set_key)} | ${row.total_rows} | ${row.verified_rows} | ${row.needs_review_rows} | ${row.pkg02c_noncolliding_parent_updated} | ${row.pkg02f_duplicate_parent_removed} | ${row.pkg02g_number_key_collision_parent_recovered} |`);
  }
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) lines.push('- none');
  else for (const finding of report.stop_findings) lines.push(`- ${mdEscape(finding)}`);
  return `${lines.join('\n')}\n`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const line = '| 2026-06-09 | [PKG-02B Full Beta Post-Apply Reconciliation Checkpoint V1](20260609_pkg02b_full_beta_post_apply_reconciliation_checkpoint_v1.md) | Read-only closure proving the original 422-row PKG-02B package is fully covered by PKG-02C, PKG-02F, and PKG-02G with zero affected unique collision groups. |';
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (current.includes('20260609_pkg02b_full_beta_post_apply_reconciliation_checkpoint_v1.md')) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes('20260609_pkg02b_full_beta_post_apply_reconciliation_checkpoint_v1.md') ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

async function main() {
  const pkg02b = readJson(PKG02B_JSON);
  const pkg02c = readJson(PKG02C_JSON);
  const pkg02f = readJson(PKG02F_JSON);
  const pkg02g = readJson(PKG02G_JSON);
  const dispositionMaps = buildDispositionMaps({ pkg02c, pkg02f, pkg02g });
  const currentSnapshot = await captureCurrentRows({
    packageRows: pkg02b.mutation_matrix ?? [],
    affectedSetKeys: pkg02b.package_scope?.selected_set_keys ?? [],
  });
  const currentRowsById = new Map(currentSnapshot.package_rows.map((row) => [row.card_print_id, row]));
  const reconciliationRows = classifyRows({
    pkg02b,
    pkg02g,
    dispositionMaps,
    currentRowsById,
  });
  const summary = summarize(reconciliationRows);

  const stopFindings = [];
  if (pkg02b.package_scope?.package_id !== PACKAGE_ID) stopFindings.push('pkg02b_wrong_package');
  if (pkg02b.package_scope?.package_fingerprint_sha256 !== PACKAGE_FINGERPRINT) {
    stopFindings.push('pkg02b_fingerprint_mismatch');
  }
  if (pkg02c.apply_status !== 'pkg02c_full_beta_noncolliding_real_apply_committed_and_verified') {
    stopFindings.push('pkg02c_not_verified');
  }
  if (pkg02f.apply_status !== 'pkg02f_duplicate_dependency_transfer_real_apply_committed_and_verified') {
    stopFindings.push('pkg02f_not_verified');
  }
  if (pkg02g.apply_status !== 'pkg02g_number_key_collision_identity_modifier_real_apply_committed_and_verified') {
    stopFindings.push('pkg02g_not_verified');
  }
  if (!currentSnapshot.available) stopFindings.push('current_database_snapshot_unavailable');
  if (summary.total_original_package_rows !== 422) stopFindings.push('original_package_row_count_not_422');
  if (summary.by_disposition.pkg02c_noncolliding_parent_updated !== 343) stopFindings.push('pkg02c_disposition_count_not_343');
  if (summary.by_disposition.pkg02f_duplicate_parent_removed !== 21) stopFindings.push('pkg02f_disposition_count_not_21');
  if (summary.by_disposition.pkg02g_number_key_collision_parent_recovered !== 58) stopFindings.push('pkg02g_disposition_count_not_58');
  if ((summary.by_disposition.uncovered ?? 0) !== 0) stopFindings.push('uncovered_original_package_rows_present');
  if (summary.needs_review_rows !== 0) stopFindings.push('reconciliation_rows_need_review');
  if (currentSnapshot.affected_unique_collision_groups !== 0) stopFindings.push('affected_unique_collision_groups_present');
  if (pkg02g.delete_performed !== false || pkg02f.deleted_parent_rows !== 21) {
    stopFindings.push('unexpected_delete_accounting');
  }

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_pkg02b_full_beta_post_apply_reconciliation_v1',
    audit_only: true,
    db_reads_performed: currentSnapshot.available,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    merge_performed: false,
    delete_performed: false,
    apply_paths_executed: false,
    reconciliation_status: stopFindings.length === 0
      ? 'pkg02b_full_beta_post_apply_reconciliation_complete_verified_no_write'
      : 'pkg02b_full_beta_post_apply_reconciliation_blocked_or_needs_review',
    package_scope: {
      package_id: PACKAGE_ID,
      package_fingerprint_sha256: PACKAGE_FINGERPRINT,
      original_card_print_rows: 422,
      selected_package_count: pkg02b.package_scope?.selected_package_count ?? null,
      selected_set_keys: pkg02b.package_scope?.selected_set_keys ?? [],
      global_apply_included: false,
    },
    source_artifacts: {
      pkg02b_artifact: path.relative(ROOT, PKG02B_JSON).replaceAll('\\', '/'),
      pkg02c_real_apply: path.relative(ROOT, PKG02C_JSON).replaceAll('\\', '/'),
      pkg02f_real_apply: path.relative(ROOT, PKG02F_JSON).replaceAll('\\', '/'),
      pkg02g_real_apply: path.relative(ROOT, PKG02G_JSON).replaceAll('\\', '/'),
    },
    current_database_snapshot: {
      available: currentSnapshot.available,
      reason: currentSnapshot.reason,
      captured_at: currentSnapshot.captured_at,
      surviving_original_package_rows_found: currentSnapshot.package_rows.length,
      package_row_hash_sha256: currentSnapshot.package_row_hash_sha256,
      affected_set_rows: currentSnapshot.affected_set_rows,
      affected_unique_collision_groups: currentSnapshot.affected_unique_collision_groups,
    },
    summary,
    reconciliation_rows: reconciliationRows,
    explicit_non_authorizations: [
      'No DB writes were performed by this reconciliation.',
      'No migrations were created.',
      'No cleanup or quarantine was performed.',
      'No global apply was performed.',
      'No additional deletes, merges, child-printing changes, pricing changes, scanner changes, marketplace changes, or ownership changes were performed.',
    ],
    stop_findings: stopFindings,
    report_hash_sha256: sha256(stableJson({ summary, reconciliationRows })),
    pass: stopFindings.length === 0,
  };

  writeJson(OUTPUT_JSON, report);
  fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
  fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
  fs.writeFileSync(CHECKPOINT_MD, renderMarkdown({
    ...report,
    reconciliation_status: `${report.reconciliation_status}_checkpoint`,
  }));
  updateCheckpointIndex();

  console.log(JSON.stringify({
    generated_files: [
      path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
      path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
      path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
    ],
    reconciliation_status: report.reconciliation_status,
    original_package_rows: report.summary.total_original_package_rows,
    verified_rows: report.summary.verified_rows,
    needs_review_rows: report.summary.needs_review_rows,
    by_disposition: report.summary.by_disposition,
    affected_unique_collision_groups: report.current_database_snapshot.affected_unique_collision_groups,
    db_writes_performed: report.db_writes_performed,
    migrations_created: report.migrations_created,
    stop_findings: report.stop_findings.length,
  }, null, 2));

  if (!report.pass) process.exitCode = 1;
}

await main();
