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
const PACKAGE_DIR = path.join(AUDIT_DIR, 'dry_run_packages');
const SQL_DIR = path.join(ROOT, 'docs', 'sql');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');

const SAFE_SUBSET_JSON = path.join(AUDIT_DIR, 'english_master_index_recovery_vault_safe_subset_v1.json');
const INCLUDE_VAULT_REFERENCED_PACKAGES = process.argv.includes('--include-vault');
const PACKAGE_ID = INCLUDE_VAULT_REFERENCED_PACKAGES ? 'PKG-02B-FULL-BETA' : 'PKG-02A-VAULT-SAFE';
const ARTIFACT_SLUG = INCLUDE_VAULT_REFERENCED_PACKAGES ? 'pkg02b_full_beta' : 'pkg02a_vault_safe';
const OUTPUT_JSON = path.join(
  AUDIT_DIR,
  `english_master_index_${ARTIFACT_SLUG}_final_snapshot_transaction_artifact_v1.json`,
);
const OUTPUT_MD = path.join(
  AUDIT_DIR,
  `english_master_index_${ARTIFACT_SLUG}_final_snapshot_transaction_artifact_v1.md`,
);
const OUTPUT_SQL = path.join(SQL_DIR, `english_master_index_${ARTIFACT_SLUG}_guarded_dry_run_transaction_v1.sql`);
const CHECKPOINT_MD = path.join(
  CHECKPOINT_DIR,
  `20260609_${ARTIFACT_SLUG}_final_snapshot_transaction_artifact_checkpoint_v1.md`,
);

const BLOCKED_SET_KEYS = new Set(['me01', 'sv04.5', 'sv06.5']);
const DIRECT_UPDATE_COLUMNS = ['set_code', 'number', 'name'];
const EXPECTED = INCLUDE_VAULT_REFERENCED_PACKAGES
  ? {
    selectedPackages: 18,
    blockedPackagesExcluded: 0,
    cardPrintRows: 422,
    childPrintingRows: 643,
    vaultRefs: 4,
  }
  : {
    selectedPackages: 15,
    blockedPackagesExcluded: 3,
    cardPrintRows: 185,
    childPrintingRows: 275,
    vaultRefs: 0,
  };

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

function sqlString(value) {
  if (value === null || value === undefined) return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlUuid(value) {
  return `${sqlString(value)}::uuid`;
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function loadSelectedPackages(safeSubset) {
  const packages = [];
  const packageRows = INCLUDE_VAULT_REFERENCED_PACKAGES
    ? [...(safeSubset.safe_packages ?? []), ...(safeSubset.blocked_packages ?? [])]
    : (safeSubset.safe_packages ?? []);
  for (const pkg of packageRows) {
    const setKey = pkg.set_key;
    const filePath = path.join(PACKAGE_DIR, `${setKey}_physical_recovery_dry_run_v1.json`);
    const artifact = readJson(filePath);
    packages.push({ subset_row: pkg, artifact });
  }
  return packages.sort((left, right) =>
    left.artifact.target_set_key.localeCompare(right.artifact.target_set_key));
}

function buildMutationRows(packages) {
  const rows = [];
  for (const pkg of packages) {
    for (const row of pkg.artifact.package_rows ?? []) {
      rows.push({
        package_id: PACKAGE_ID,
        source_package_set_key: pkg.artifact.target_set_key,
        source_package_set_name: pkg.artifact.target_set_name,
        card_print_id: row.card_print_id,
        source_external_id: row.source_external_id,
        source_card_url: row.source_card_url,
        target_parent_fields: {
          set_code: row.target_parent_fields?.set_code,
          number: row.target_parent_fields?.number,
          number_plain_expected: row.target_parent_fields?.number_plain,
          name: row.target_parent_fields?.name,
        },
        target_printings: row.target_printings ?? [],
        supported_finishes: row.supported_finishes ?? [],
        evidence_summary: row.evidence_summary ?? {},
        dry_run_status: row.dry_run_status,
        mutation_authority: 'not mutation authority until separately approved',
      });
    }
  }
  return rows.sort((left, right) =>
    left.source_package_set_key.localeCompare(right.source_package_set_key) ||
    String(left.target_parent_fields.number).localeCompare(String(right.target_parent_fields.number), undefined, { numeric: true }) ||
    String(left.target_parent_fields.name).localeCompare(String(right.target_parent_fields.name)));
}

async function captureFreshSnapshot(cardPrintIds) {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
      impact_counts: {},
    };
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         cp.id,
         to_jsonb(cp) as card_print,
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
           select jsonb_agg(to_jsonb(vi) order by vi.id)
           from public.vault_items vi
           where vi.card_id = cp.id
         ), '[]'::jsonb) as vault_items
       from public.card_prints cp
       where cp.id = any($1::uuid[])
       order by cp.set_code nulls first, cp.name, cp.number, cp.id`,
      [cardPrintIds],
    );

    const rows = result.rows.map((row) => ({
      card_print_id: row.id,
      card_print: row.card_print,
      card_printings: row.card_printings,
      external_mappings: row.external_mappings,
      card_print_identity: row.card_print_identity,
      card_print_traits: row.card_print_traits,
      vault_items: row.vault_items,
      dependency_counts: {
        card_printings: row.card_printings.length,
        external_mappings: row.external_mappings.length,
        card_print_identity: row.card_print_identity.length,
        card_print_traits: row.card_print_traits.length,
        vault_items: row.vault_items.length,
      },
    }));
    await client.query('rollback');

    return {
      available: true,
      reason: null,
      captured_at: new Date().toISOString(),
      rows,
      hash_sha256: sha256(stableJson(rows)),
      impact_counts: {
        card_prints_found: rows.length,
        card_printings_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_printings, 0),
        external_mappings_found: rows.reduce((sum, row) => sum + row.dependency_counts.external_mappings, 0),
        identity_rows_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_print_identity, 0),
        trait_rows_found: rows.reduce((sum, row) => sum + row.dependency_counts.card_print_traits, 0),
        vault_items_found: rows.reduce((sum, row) => sum + row.dependency_counts.vault_items, 0),
      },
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return {
      available: false,
      reason: `Fresh read-only snapshot failed: ${error.message}`,
      rows: [],
      impact_counts: {},
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function buildMatrix(mutationRows, snapshot) {
  const snapshotById = new Map(snapshot.rows.map((row) => [row.card_print_id, row]));
  return mutationRows.map((row) => {
    const before = snapshotById.get(row.card_print_id);
    const beforeCard = before?.card_print ?? {};
    const fieldChanges = {};
    for (const field of DIRECT_UPDATE_COLUMNS) {
      const beforeValue = beforeCard[field] ?? null;
      const afterValue = row.target_parent_fields[field] ?? null;
      if (String(beforeValue ?? '') !== String(afterValue ?? '')) {
        fieldChanges[field] = {
          before: beforeValue,
          after: afterValue,
        };
      }
    }
    const targetFinishes = [...new Set(row.target_printings.map((printing) => printing.finish_key).filter(Boolean))].sort();
    const currentFinishes = [...new Set((before?.card_printings ?? []).map((printing) => printing.finish_key).filter(Boolean))].sort();
    return {
      package_id: PACKAGE_ID,
      set_key: row.source_package_set_key,
      set_name: row.source_package_set_name,
      card_print_id: row.card_print_id,
      source_external_id: row.source_external_id,
      source_card_url: row.source_card_url,
      current_parent_fields: {
        set_code: beforeCard.set_code ?? null,
        number: beforeCard.number ?? null,
        number_plain: beforeCard.number_plain ?? null,
        name: beforeCard.name ?? null,
      },
      target_parent_fields: row.target_parent_fields,
      rollback_parent_fields: {
        set_code: beforeCard.set_code ?? null,
        number: beforeCard.number ?? null,
        name: beforeCard.name ?? null,
      },
      field_changes: fieldChanges,
      current_finishes: currentFinishes,
      target_finishes: targetFinishes,
      child_printing_count_before: before?.dependency_counts?.card_printings ?? null,
      child_printing_count_expected_after: row.target_printings.length,
      vault_items_referencing_target: before?.dependency_counts?.vault_items ?? null,
      evidence_sources: row.evidence_summary?.supported_sources ?? [],
      evidence_source_kinds: row.evidence_summary?.supported_source_kinds ?? [],
      all_target_printings_master_verified: row.evidence_summary?.all_target_printings_master_verified === true,
      dry_run_status: row.dry_run_status,
    };
  });
}

function packageSummaries(packages, matrix) {
  const bySet = new Map();
  for (const pkg of packages) {
    bySet.set(pkg.artifact.target_set_key, {
      set_key: pkg.artifact.target_set_key,
      set_name: pkg.artifact.target_set_name,
      candidate_card_prints: 0,
      candidate_printing_rows: 0,
      changed_fields: {},
      vault_items_referencing_targets: 0,
      status: 'included_in_pkg02a_vault_safe_artifact_no_write',
    });
  }
  for (const row of matrix) {
    const summary = bySet.get(row.set_key);
    summary.candidate_card_prints += 1;
    summary.candidate_printing_rows += row.child_printing_count_expected_after;
    summary.vault_items_referencing_targets += Number(row.vault_items_referencing_target ?? 0);
    for (const field of Object.keys(row.field_changes)) {
      summary.changed_fields[field] = (summary.changed_fields[field] ?? 0) + 1;
    }
  }
  return [...bySet.values()].sort((left, right) => left.set_key.localeCompare(right.set_key));
}

function buildSqlArtifact(matrix, packageFingerprint) {
  const values = matrix.map((row) => [
    sqlUuid(row.card_print_id),
    sqlString(row.target_parent_fields.set_code),
    sqlString(row.target_parent_fields.number),
    sqlString(row.target_parent_fields.number_plain_expected),
    sqlString(row.target_parent_fields.name),
  ].join(', '));

  return `-- ${PACKAGE_ID} GUARDED DRY-RUN TRANSACTION ARTIFACT V1
-- Generated for review only. Do not run without explicit operator approval.
-- Package fingerprint: ${packageFingerprint}
-- Scope: ${EXPECTED.selectedPackages} physical-recovery packages, ${matrix.length} card_print rows.
-- Vault reference policy: ${INCLUDE_VAULT_REFERENCED_PACKAGES ? 'allowed for beta-tester catalog correction dry-run; exact count guarded' : 'excluded from this package'}.
-- Direct update columns if later approved: ${DIRECT_UPDATE_COLUMNS.join(', ')}.
-- This dry-run artifact contains ROLLBACK and intentionally contains no COMMIT.

begin;

create temporary table pkg02a_approved_card_prints (
  card_print_id uuid primary key,
  target_set_code text not null,
  target_number text not null,
  target_number_plain_expected text not null,
  target_name text not null
) on commit drop;

insert into pkg02a_approved_card_prints (
  card_print_id,
  target_set_code,
  target_number,
  target_number_plain_expected,
  target_name
) values
  ${values.map((value) => `(${value})`).join(',\n  ')};

do $$
declare
  target_count int;
  matched_count int;
  vault_ref_count int;
begin
  select count(*) into target_count from pkg02a_approved_card_prints;
  if target_count <> ${matrix.length} then
    raise exception 'PKG-02A target row count mismatch: %', target_count;
  end if;

  select count(*) into matched_count
  from public.card_prints cp
  join pkg02a_approved_card_prints approved on approved.card_print_id = cp.id;
  if matched_count <> ${matrix.length} then
    raise exception 'PKG-02A matched card_print count mismatch: %', matched_count;
  end if;

  select count(*) into vault_ref_count
  from public.vault_items vi
  join pkg02a_approved_card_prints approved on approved.card_print_id = vi.card_id;
  if vault_ref_count <> ${EXPECTED.vaultRefs} then
    raise exception 'PKG-02 vault reference count mismatch: %', vault_ref_count;
  end if;
end $$;

create temporary table pkg02a_before_card_prints on commit drop as
select cp.*
from public.card_prints cp
join pkg02a_approved_card_prints approved on approved.card_print_id = cp.id;

update public.card_prints cp
set set_code = approved.target_set_code,
    number = approved.target_number,
    name = approved.target_name
from pkg02a_approved_card_prints approved
where cp.id = approved.card_print_id;

-- Dry-run readback only.
select
  cp.id,
  cp.set_code,
  cp.number,
  cp.number_plain,
  cp.name,
  approved.target_set_code,
  approved.target_number,
  approved.target_number_plain_expected,
  approved.target_name
from public.card_prints cp
join pkg02a_approved_card_prints approved on approved.card_print_id = cp.id
order by cp.set_code, cp.number, cp.name;

rollback;
`;
}

function validateArtifact(report) {
  const findings = [];
  if (report.safe_subset.split_status !== 'vault_safe_subset_prepared_no_write') findings.push('safe_subset_not_prepared');
  if (report.package_scope.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (report.package_scope.selected_package_count !== EXPECTED.selectedPackages) findings.push('selected_package_count_mismatch');
  if (report.package_scope.blocked_package_count !== EXPECTED.blockedPackagesExcluded) findings.push('blocked_package_count_mismatch');
  if (report.package_scope.card_print_rows !== EXPECTED.cardPrintRows) findings.push('card_print_rows_mismatch');
  if (report.package_scope.child_printing_rows !== EXPECTED.childPrintingRows) findings.push('child_printing_rows_mismatch');
  if (report.package_scope.excluded_set_keys.some((setKey) => !BLOCKED_SET_KEYS.has(setKey))) {
    findings.push('unexpected_excluded_set_key');
  }
  if (!report.fresh_snapshot.available) findings.push('fresh_snapshot_unavailable');
  if (report.fresh_snapshot.impact_counts.card_prints_found !== EXPECTED.cardPrintRows) findings.push('fresh_snapshot_card_print_count_mismatch');
  if (report.fresh_snapshot.impact_counts.card_printings_found !== EXPECTED.childPrintingRows) findings.push('fresh_snapshot_child_printing_count_mismatch');
  if (report.fresh_snapshot.impact_counts.vault_items_found !== EXPECTED.vaultRefs) findings.push('fresh_snapshot_vault_refs_mismatch');
  if (report.summary.vault_references_in_scope !== EXPECTED.vaultRefs) findings.push('matrix_vault_refs_mismatch');
  if (report.summary.rows_missing_snapshot !== 0) findings.push('matrix_rows_missing_snapshot');
  if (report.summary.rows_with_child_count_mismatch !== 0) findings.push('child_count_mismatch');
  if (report.summary.rows_with_unverified_target_printings !== 0) findings.push('unverified_target_printings_present');
  if (report.summary.rows_with_no_field_changes !== 0) findings.push('rows_with_no_field_changes_present');
  if (report.sql_artifact.contains_commit_statement !== false) findings.push('sql_contains_commit');
  if (report.sql_artifact.contains_rollback_statement !== true) findings.push('sql_missing_rollback');
  if (report.db_writes_performed !== false) findings.push('db_write_performed');
  if (report.migrations_created !== false) findings.push('migration_created');
  if (report.cleanup_performed !== false) findings.push('cleanup_performed');
  if (report.quarantine_performed !== false) findings.push('quarantine_performed');
  return findings;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push(`# English Master Index ${PACKAGE_ID} Final Snapshot Transaction Artifact V1`);
  lines.push('');
  lines.push(INCLUDE_VAULT_REFERENCED_PACKAGES
    ? 'This artifact prepares the next guarded review package for all 18 physical-recovery packages, including beta-tester vault-referenced rows.'
    : 'This artifact prepares the next guarded review package for the 15 no-vault physical-recovery packages.');
  lines.push('');
  lines.push('It does not authorize or execute writes. The SQL artifact is a dry-run transaction preview with `ROLLBACK` and no `COMMIT`.');
  lines.push('');
  lines.push('## Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('| --- | --- |');
  lines.push(`| artifact_status | ${report.artifact_status} |`);
  lines.push(`| package_id | ${report.package_scope.package_id} |`);
  lines.push(`| package_fingerprint_sha256 | ${report.package_scope.package_fingerprint_sha256} |`);
  lines.push(`| db_writes_performed | ${report.db_writes_performed} |`);
  lines.push(`| migrations_created | ${report.migrations_created} |`);
  lines.push(`| cleanup_performed | ${report.cleanup_performed} |`);
  lines.push(`| quarantine_performed | ${report.quarantine_performed} |`);
  lines.push(`| stop_findings | ${report.stop_findings.length} |`);
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('| --- | ---: |');
  lines.push(`| Selected packages | ${report.package_scope.selected_package_count} |`);
  lines.push(`| Blocked packages excluded | ${report.package_scope.blocked_package_count} |`);
  lines.push(`| Card print rows | ${report.package_scope.card_print_rows} |`);
  lines.push(`| Child printing rows | ${report.package_scope.child_printing_rows} |`);
  lines.push(`| Fresh snapshot card prints | ${report.fresh_snapshot.impact_counts.card_prints_found ?? null} |`);
  lines.push(`| Fresh snapshot child printings | ${report.fresh_snapshot.impact_counts.card_printings_found ?? null} |`);
  lines.push(`| Fresh snapshot vault refs | ${report.fresh_snapshot.impact_counts.vault_items_found ?? null} |`);
  lines.push('');
  lines.push('## Included Packages');
  lines.push('');
  lines.push('| Set | Name | Cards | Printings | Field changes | Vault refs |');
  lines.push('| --- | --- | ---: | ---: | --- | ---: |');
  for (const pkg of report.package_summaries) {
    const fieldChanges = Object.entries(pkg.changed_fields).map(([field, count]) => `${field}:${count}`).join(', ');
    lines.push(`| ${mdEscape(pkg.set_key)} | ${mdEscape(pkg.set_name)} | ${pkg.candidate_card_prints} | ${pkg.candidate_printing_rows} | ${mdEscape(fieldChanges)} | ${pkg.vault_items_referencing_targets} |`);
  }
  lines.push('');
  lines.push('## Excluded Packages');
  lines.push('');
  lines.push(report.package_scope.excluded_set_keys.map((setKey) => `- ${setKey}`).join('\n'));
  lines.push('');
  lines.push('## Required Approval Phrase');
  lines.push('');
  lines.push('```text');
  lines.push(report.required_operator_approval.exact_phrase);
  lines.push('```');
  lines.push('');
  lines.push('## Stop Findings');
  lines.push('');
  if (report.stop_findings.length === 0) lines.push('None.');
  else for (const finding of report.stop_findings) lines.push(`- ${finding}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderCheckpoint(report) {
  return `# ${PACKAGE_ID} Final Snapshot Transaction Artifact Checkpoint V1

Date: 2026-06-09

## Result

| Field | Value |
| --- | --- |
| artifact_status | ${report.artifact_status} |
| package_id | ${report.package_scope.package_id} |
| package_fingerprint_sha256 | ${report.package_scope.package_fingerprint_sha256} |
| selected_package_count | ${report.package_scope.selected_package_count} |
| blocked_package_count | ${report.package_scope.blocked_package_count} |
| card_print_rows | ${report.package_scope.card_print_rows} |
| child_printing_rows | ${report.package_scope.child_printing_rows} |
| fresh_snapshot_card_prints | ${report.fresh_snapshot.impact_counts.card_prints_found ?? null} |
| fresh_snapshot_child_printings | ${report.fresh_snapshot.impact_counts.card_printings_found ?? null} |
| fresh_snapshot_vault_refs | ${report.fresh_snapshot.impact_counts.vault_items_found ?? null} |
| stop_findings | ${report.stop_findings.length} |

## Safety

- DB writes performed: false
- Migrations created: false
- Cleanup performed: false
- Quarantine performed: false
- SQL artifact contains rollback: ${report.sql_artifact.contains_rollback_statement}
- SQL artifact contains commit: ${report.sql_artifact.contains_commit_statement}
- Blocked sets excluded: ${report.package_scope.excluded_set_keys.join(', ')}
- Vault reference policy: ${report.package_scope.vault_reference_policy}

## Source Reports

- \`${path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/')}\`
- \`${path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/')}\`
- \`${path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/')}\`

`;
}

function updateCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const checkpointName = path.basename(CHECKPOINT_MD);
  const linkLabel = INCLUDE_VAULT_REFERENCED_PACKAGES
    ? 'PKG-02B Full Beta Final Snapshot Transaction Artifact Checkpoint V1'
    : 'PKG-02A Vault-Safe Final Snapshot Transaction Artifact Checkpoint V1';
  const description = INCLUDE_VAULT_REFERENCED_PACKAGES
    ? 'Prepares no-write final fresh snapshot and guarded rollback-only SQL artifact for all 18 recovery packages: 422 card_print rows / 643 child printings; vault references accepted for beta correction planning.'
    : 'Prepares no-write final fresh snapshot and guarded rollback-only SQL artifact for 15 vault-safe recovery packages: 185 card_print rows / 275 child printings; excludes vault-blocked packages.';
  const line = `| 2026-06-09 | [${linkLabel}](${checkpointName}) | ${description} |`;
  const current = fs.readFileSync(indexPath, 'utf8');
  if (current.includes(checkpointName)) {
    fs.writeFileSync(
      indexPath,
      current
        .split('\n')
        .map((existingLine) =>
          existingLine.includes(checkpointName) ? line : existingLine)
        .join('\n'),
    );
  } else {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

const safeSubset = readJson(SAFE_SUBSET_JSON);
const packages = loadSelectedPackages(safeSubset);
const mutationRows = buildMutationRows(packages);
const cardPrintIds = mutationRows.map((row) => row.card_print_id);
const uniqueCardPrintIds = [...new Set(cardPrintIds)];
const duplicateCardPrintIds = cardPrintIds.filter((id, index) => cardPrintIds.indexOf(id) !== index);
const packageFingerprint = sha256(stableJson(mutationRows.map((row) => ({
  card_print_id: row.card_print_id,
  target_parent_fields: row.target_parent_fields,
  target_finishes: row.target_printings.map((printing) => printing.finish_key).sort(),
}))));
const approvalPhrase = INCLUDE_VAULT_REFERENCED_PACKAGES
  ? `Approve PKG-02B-FULL-BETA for guarded dry-run transaction execution only. Fingerprint: ${packageFingerprint}. Scope: 18 beta packages, 422 card_print updates, 643 verified child printings, 4 vault references accepted. No real apply. No migrations.`
  : `Approve PKG-02A-VAULT-SAFE for guarded dry-run transaction execution only. Fingerprint: ${packageFingerprint}. Scope: 15 no-vault packages, 185 card_print updates, 275 verified child printings. Exclude me01, sv04.5, sv06.5. No real apply. No migrations.`;

const snapshot = await captureFreshSnapshot(uniqueCardPrintIds);
const matrix = buildMatrix(mutationRows, snapshot);
const packageSummaryRows = packageSummaries(packages, matrix);
const sqlArtifact = buildSqlArtifact(matrix, packageFingerprint);
fs.mkdirSync(SQL_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_SQL, sqlArtifact);

const report = {
  generated_at: new Date().toISOString(),
  version: 'english_master_index_pkg02a_vault_safe_final_snapshot_transaction_artifact_v1',
  audit_only: true,
  db_reads_performed: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  apply_paths_executed: false,
  artifact_status: INCLUDE_VAULT_REFERENCED_PACKAGES
    ? 'pkg02b_full_beta_final_snapshot_and_transaction_artifact_prepared_apply_blocked_no_write'
    : 'pkg02a_vault_safe_final_snapshot_and_transaction_artifact_prepared_apply_blocked_no_write',
  safe_subset: {
    source_report: path.relative(ROOT, SAFE_SUBSET_JSON).replaceAll('\\', '/'),
    split_status: safeSubset.split_status,
  },
  package_scope: {
    package_id: PACKAGE_ID,
    package_fingerprint_sha256: packageFingerprint,
    selected_package_count: packages.length,
    selected_set_keys: packages.map((pkg) => pkg.artifact.target_set_key).sort(),
    safe_package_count: safeSubset.safe_packages?.length ?? null,
    blocked_package_count: INCLUDE_VAULT_REFERENCED_PACKAGES ? 0 : (safeSubset.blocked_packages?.length ?? null),
    excluded_set_keys: INCLUDE_VAULT_REFERENCED_PACKAGES ? [] : (safeSubset.blocked_packages ?? []).map((pkg) => pkg.set_key).sort(),
    vault_reference_policy: INCLUDE_VAULT_REFERENCED_PACKAGES
      ? 'accepted_for_beta_tester_catalog_correction_planning'
      : 'excluded_from_pkg02a',
    card_print_rows: mutationRows.length,
    unique_card_print_rows: uniqueCardPrintIds.length,
    duplicate_card_print_ids: duplicateCardPrintIds,
    child_printing_rows: matrix.reduce((sum, row) => sum + Number(row.child_printing_count_expected_after ?? 0), 0),
    direct_update_columns: DIRECT_UPDATE_COLUMNS,
    generated_readback_columns: ['number_plain'],
  },
  required_operator_approval: {
    status: 'required_before_dry_run_execution',
    exact_phrase: approvalPhrase,
  },
  fresh_snapshot: snapshot,
  package_summaries: packageSummaryRows,
  mutation_matrix: matrix,
  rollback_matrix: matrix.map((row) => ({
    card_print_id: row.card_print_id,
    rollback_parent_fields: row.rollback_parent_fields,
  })),
  sql_artifact: {
    path: path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
    sha256: sha256(sqlArtifact),
    contains_update_statement: /\bupdate\s+public\.card_prints\b/i.test(sqlArtifact),
    contains_delete_statement: /\bdelete\b/i.test(sqlArtifact),
    contains_insert_statement: /\binsert\s+into\s+pkg02a_approved_card_prints\b/i.test(sqlArtifact),
    contains_commit_statement: /(^|\n)\s*commit\s*;/i.test(sqlArtifact.replace(/--.*$/gm, '')),
    contains_rollback_statement: /\brollback\b/i.test(sqlArtifact.replace(/--.*$/gm, '')),
    execution_performed: false,
  },
  summary: {
    rows_with_vault_references: matrix.filter((row) => Number(row.vault_items_referencing_target ?? 0) > 0).length,
    vault_references_in_scope: matrix.reduce((sum, row) => sum + Number(row.vault_items_referencing_target ?? 0), 0),
    rows_missing_snapshot: matrix.filter((row) => row.child_printing_count_before === null).length,
    rows_with_child_count_mismatch: matrix.filter((row) =>
      Number(row.child_printing_count_before ?? -1) !== Number(row.child_printing_count_expected_after ?? -2)).length,
    rows_with_unverified_target_printings: matrix.filter((row) => row.all_target_printings_master_verified !== true).length,
    rows_with_no_field_changes: matrix.filter((row) => Object.keys(row.field_changes).length === 0).length,
    changed_fields: matrix.reduce((acc, row) => {
      for (const field of Object.keys(row.field_changes)) acc[field] = (acc[field] ?? 0) + 1;
      return acc;
    }, {}),
  },
  stop_findings: [],
  pass: false,
};

report.stop_findings = validateArtifact(report);
report.pass = report.stop_findings.length === 0;

writeJson(OUTPUT_JSON, report);
fs.writeFileSync(OUTPUT_MD, renderMarkdown(report));
fs.writeFileSync(CHECKPOINT_MD, renderCheckpoint(report));
updateCheckpointIndex();

console.log(JSON.stringify({
  generated_files: [
    path.relative(ROOT, OUTPUT_JSON).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_MD).replaceAll('\\', '/'),
    path.relative(ROOT, OUTPUT_SQL).replaceAll('\\', '/'),
    path.relative(ROOT, CHECKPOINT_MD).replaceAll('\\', '/'),
  ],
  artifact_status: report.artifact_status,
  package_id: report.package_scope.package_id,
  package_fingerprint_sha256: report.package_scope.package_fingerprint_sha256,
  selected_package_count: report.package_scope.selected_package_count,
  blocked_package_count: report.package_scope.blocked_package_count,
  card_print_rows: report.package_scope.card_print_rows,
  child_printing_rows: report.package_scope.child_printing_rows,
  fresh_snapshot_card_prints: report.fresh_snapshot.impact_counts.card_prints_found,
  fresh_snapshot_child_printings: report.fresh_snapshot.impact_counts.card_printings_found,
  fresh_snapshot_vault_refs: report.fresh_snapshot.impact_counts.vault_items_found,
  vault_reference_policy: report.package_scope.vault_reference_policy,
  rows_with_child_count_mismatch: report.summary.rows_with_child_count_mismatch,
  rows_with_unverified_target_printings: report.summary.rows_with_unverified_target_printings,
  rows_with_no_field_changes: report.summary.rows_with_no_field_changes,
  sql_contains_commit: report.sql_artifact.contains_commit_statement,
  sql_contains_rollback: report.sql_artifact.contains_rollback_statement,
  db_writes_performed: report.db_writes_performed,
  migrations_created: report.migrations_created,
  cleanup_performed: report.cleanup_performed,
  quarantine_performed: report.quarantine_performed,
  stop_findings: report.stop_findings.length,
}, null, 2));

if (!report.pass) process.exitCode = 1;
