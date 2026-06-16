import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich23a2_residual_parent_core_identity_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich23a2_residual_parent_core_identity_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich23a2_residual_parent_core_identity_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-23A2-RESIDUAL-PARENT-CORE-IDENTITY-BACKFILL';
const TARGET_DOMAIN = 'pokemon_eng_standard';
const EXPECTED_TARGET_ROWS = 4;
const EXPECTED_REMAINING_CORE_GAPS = 1;
const EXPECTED_FINGERPRINT = 'f8b46df52c7fab9abb40aa6a7c6cc4031916f493b5d5314f3ec18d65ceee8d35';
const EXPECTED_DRY_RUN_PROOF = '354b4c28af74a81da209f176d344f102b716677c80ff8e5ea2f04b569f14baab';
const REQUIRED_APPROVAL_TEXT = 'Approve real ENRICH-23A2-RESIDUAL-PARENT-CORE-IDENTITY-BACKFILL apply only. Fingerprint: f8b46df52c7fab9abb40aa6a7c6cc4031916f493b5d5314f3ec18d65ceee8d35. Scope: 4 parent card_print core identity updates from existing active identity rows; writes card_prints.set_code and card_prints.number only; generated number_plain verified in dry-run; Luxray GL remains manual-blocked; dry-run proof: 354b4c28af74a81da209f176d344f102b716677c80ff8e5ea2f04b569f14baab == 354b4c28af74a81da209f176d344f102b716677c80ff8e5ea2f04b569f14baab. No GV-ID writes. No child writes. No identity writes. No external mapping writes. No species writes. No trait writes. No deletes. No merges. No migrations. No image writes. No global apply.';

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
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

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.dry_run?.proof_hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if (dryRun.dry_run?.pass !== true) findings.push('dry_run_not_passed');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.summary?.target_rows !== EXPECTED_TARGET_ROWS) findings.push('target_rows_mismatch');
  if (dryRun.summary?.remaining_manual_blocked_rows !== EXPECTED_REMAINING_CORE_GAPS) findings.push('remaining_manual_blocked_rows_mismatch');
  return findings;
}

async function loadLiveTargets(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid, set_code text, number text)
     )
     select
       target.card_print_id::text,
       target.set_code as target_set_code,
       target.number as target_number,
       cp.set_code as current_set_code,
       cp.number as current_number,
       cp.number_plain as current_number_plain,
       cp.name as card_name,
       cp.gv_id,
       cp.identity_domain,
       cp.printed_identity_modifier,
       s.identity_domain_default,
       cpi.id::text as active_identity_id,
       cpi.identity_domain as active_identity_domain,
       cpi.set_code_identity,
       cpi.printed_number,
       count(distinct cpr.id)::int as child_count,
       count(distinct em.id) filter (where coalesce(em.active, true) = true)::int as active_mapping_count
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     join public.sets s on s.id = cp.set_id
     left join public.card_print_identity cpi on cpi.card_print_id = cp.id and cpi.is_active = true
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     left join public.external_mappings em on em.card_print_id = cp.id
     group by target.card_print_id, target.set_code, target.number, cp.id, s.identity_domain_default, cpi.id
     order by target.set_code, target.number, cp.name`,
    [JSON.stringify(targets)],
  );
  return result.rows;
}

async function activeIdentityDuplicateGroups(client) {
  const result = await client.query(
    `select count(*)::int as duplicate_groups
     from (
       select identity_domain, identity_key_version, identity_key_hash
       from public.card_print_identity
       where is_active = true
       group by identity_domain, identity_key_version, identity_key_hash
       having count(*) > 1
     ) dup`,
  );
  return result.rows[0]?.duplicate_groups ?? 0;
}

async function coreIdentityGapCount(client) {
  const result = await client.query(
    `select count(*)::int as gap_rows
     from public.card_prints cp
     join public.sets s on s.id = cp.set_id
     where s.identity_domain_default = $1
       and cp.identity_domain = $1
       and (cp.set_code is null or cp.number is null)`,
    [TARGET_DOMAIN],
  );
  return result.rows[0]?.gap_rows ?? 0;
}

async function applyPackage(client, targets) {
  const beforeTargets = await loadLiveTargets(client, targets);
  const beforeDuplicateGroups = await activeIdentityDuplicateGroups(client);
  const beforeCoreIdentityGaps = await coreIdentityGapCount(client);
  const alreadyApplied = beforeTargets.length === targets.length
    && beforeTargets.every((row) => row.current_set_code === row.target_set_code && row.current_number === row.target_number);

  if (alreadyApplied) {
    const afterDuplicateGroups = await activeIdentityDuplicateGroups(client);
    const afterCoreIdentityGaps = await coreIdentityGapCount(client);
    const updatedRows = beforeTargets.map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.current_set_code,
      number: row.current_number,
      number_plain: row.current_number_plain,
      card_name: row.card_name,
    }));
    return {
      apply_status: 'already_applied_verified_noop',
      before_targets: beforeTargets,
      updated_rows: updatedRows,
      after_targets: beforeTargets,
      before_core_identity_gap_rows: beforeCoreIdentityGaps,
      after_core_identity_gap_rows: afterCoreIdentityGaps,
      before_active_identity_duplicate_groups: beforeDuplicateGroups,
      after_active_identity_duplicate_groups: afterDuplicateGroups,
      proof_hash_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        apply_status: 'already_applied_verified_noop',
        updated_rows: updatedRows,
        after_core_identity_gap_rows: afterCoreIdentityGaps,
        after_active_identity_duplicate_groups: afterDuplicateGroups,
      })),
    };
  }

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");

    const guardFindings = [];
    if (targets.length !== EXPECTED_TARGET_ROWS) guardFindings.push(`target_rows_mismatch:${targets.length}`);
    if (beforeTargets.length !== targets.length) guardFindings.push(`live_target_rows_mismatch:${beforeTargets.length}`);
    if (beforeDuplicateGroups !== 0) guardFindings.push(`preexisting_active_identity_duplicate_groups:${beforeDuplicateGroups}`);
    if (beforeCoreIdentityGaps !== EXPECTED_TARGET_ROWS + EXPECTED_REMAINING_CORE_GAPS) guardFindings.push(`core_identity_gap_count_mismatch:${beforeCoreIdentityGaps}`);
    for (const row of beforeTargets) {
      if (row.current_set_code !== null || row.current_number !== null) guardFindings.push(`target_parent_already_has_core_identity:${row.card_print_id}`);
      if (row.identity_domain !== TARGET_DOMAIN || row.identity_domain_default !== TARGET_DOMAIN) guardFindings.push(`target_domain_mismatch:${row.card_print_id}`);
      if (!row.active_identity_id) guardFindings.push(`missing_active_identity:${row.card_print_id}`);
      if (row.active_identity_domain !== TARGET_DOMAIN) guardFindings.push(`active_identity_domain_mismatch:${row.card_print_id}`);
      if (row.set_code_identity !== row.target_set_code || row.printed_number !== row.target_number) guardFindings.push(`active_identity_target_mismatch:${row.card_print_id}`);
      if (row.printed_identity_modifier !== null) guardFindings.push(`target_base_row_has_modifier:${row.card_print_id}`);
    }
    if (guardFindings.length) throw new Error(`pre-apply guard failed: ${guardFindings.join(', ')}`);

    const updated = await client.query(
      `with target as (
         select *
         from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid, set_code text, number text)
       ),
       active_identity as (
         select target.card_print_id, cpi.set_code_identity, cpi.printed_number
         from target
         join public.card_print_identity cpi
           on cpi.card_print_id = target.card_print_id
          and cpi.is_active = true
          and cpi.identity_domain = $2
          and cpi.set_code_identity = target.set_code
          and cpi.printed_number = target.number
       )
       update public.card_prints cp
       set set_code = active_identity.set_code_identity,
           number = active_identity.printed_number
       from active_identity
       where cp.id = active_identity.card_print_id
         and cp.set_code is null
         and cp.number is null
         and cp.identity_domain = $2
       returning cp.id::text as card_print_id, cp.set_code, cp.number, cp.number_plain, cp.name as card_name`,
      [JSON.stringify(targets), TARGET_DOMAIN],
    );

    if (updated.rows.length !== EXPECTED_TARGET_ROWS) throw new Error(`updated row count mismatch:${updated.rows.length}`);

    const afterDuplicateGroupsInside = await activeIdentityDuplicateGroups(client);
    const afterCoreIdentityGapsInside = await coreIdentityGapCount(client);
    if (afterDuplicateGroupsInside !== 0) throw new Error(`active identity duplicate groups after update:${afterDuplicateGroupsInside}`);
    if (afterCoreIdentityGapsInside !== EXPECTED_REMAINING_CORE_GAPS) throw new Error(`core identity gaps after update:${afterCoreIdentityGapsInside}`);

    await client.query('commit');

    const afterTargets = await loadLiveTargets(client, targets);
    const afterDuplicateGroups = await activeIdentityDuplicateGroups(client);
    const afterCoreIdentityGaps = await coreIdentityGapCount(client);

    return {
      apply_status: 'committed',
      before_targets: beforeTargets,
      updated_rows: updated.rows,
      after_targets: afterTargets,
      before_core_identity_gap_rows: beforeCoreIdentityGaps,
      after_core_identity_gap_rows: afterCoreIdentityGaps,
      before_active_identity_duplicate_groups: beforeDuplicateGroups,
      after_active_identity_duplicate_groups: afterDuplicateGroups,
      proof_hash_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        updated_rows: updated.rows,
        after_core_identity_gap_rows: afterCoreIdentityGaps,
        after_active_identity_duplicate_groups: afterDuplicateGroups,
      })),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function markdown(report) {
  const rows = report.apply.updated_rows
    .map((row) => `| ${row.set_code} | ${row.number} | ${row.number_plain} | ${row.card_name} | ${row.card_print_id} |`)
    .join('\n');
  return `# ENRICH-23A2 Residual Parent Core Identity Backfill Real Apply

Generated at: ${report.generated_at}

Package: ${PACKAGE_ID}

## Applied

| set_code | number | number_plain | card_name | card_print_id |
|---|---:|---:|---|---|
${rows}

## Proof

- dry_run_fingerprint: \`${EXPECTED_FINGERPRINT}\`
- dry_run_proof: \`${EXPECTED_DRY_RUN_PROOF}\`
- real_apply_proof_hash_sha256: \`${report.apply.proof_hash_sha256}\`
- updated_rows: ${report.apply.updated_rows.length}
- remaining_core_identity_gap_rows: ${report.apply.after_core_identity_gap_rows}
- active_identity_duplicate_groups_after_apply: ${report.apply.after_active_identity_duplicate_groups}

## Safety

- GV-ID writes: 0
- child writes: 0
- identity writes: 0
- external mapping writes: 0
- species writes: 0
- trait writes: 0
- deletes: 0
- merges: 0
- migrations: 0
- image writes: 0
- global apply: 0
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing database connection string.');

  const dryRun = await readJson(DRY_RUN_JSON);
  const dryRunFindings = validateDryRun(dryRun);
  if (dryRunFindings.length > 0) throw new Error(`Dry-run validation failed: ${dryRunFindings.join(', ')}`);

  const targets = dryRun.targets ?? [];
  const client = new Client({ connectionString: conn, application_name: 'card_row_enrichment_enrich23a2_residual_parent_core_identity_real_apply_v1' });
  await client.connect();
  try {
    const apply = await applyPackage(client, targets);
    const report = {
      version: 'ENRICH23A2_RESIDUAL_PARENT_CORE_IDENTITY_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      db_writes_performed: true,
      migrations_created: false,
      cleanup_performed: false,
      dry_run_fingerprint_sha256: EXPECTED_FINGERPRINT,
      dry_run_proof_hash_sha256: EXPECTED_DRY_RUN_PROOF,
      required_approval_text: REQUIRED_APPROVAL_TEXT,
      apply,
      stop_findings: [],
    };
    report.fingerprint_sha256 = sha256(stableJson({
      package_id: PACKAGE_ID,
      dry_run_fingerprint_sha256: EXPECTED_FINGERPRINT,
      dry_run_proof_hash_sha256: EXPECTED_DRY_RUN_PROOF,
      updated_rows: apply.updated_rows,
      proof_hash_sha256: apply.proof_hash_sha256,
    }));

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, markdown(report));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      apply_status: report.apply.apply_status,
      updated_rows_count: report.apply.updated_rows.length,
      remaining_core_identity_gap_rows: report.apply.after_core_identity_gap_rows,
      dry_run_fingerprint_sha256: report.dry_run_fingerprint_sha256,
      dry_run_proof_hash_sha256: report.dry_run_proof_hash_sha256,
      real_apply_proof_hash_sha256: report.apply.proof_hash_sha256,
      fingerprint_sha256: report.fingerprint_sha256,
      active_identity_duplicate_groups_after_apply: report.apply.after_active_identity_duplicate_groups,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
