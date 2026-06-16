import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich22a_parent_identity_domain_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich22a_parent_identity_domain_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich22a_parent_identity_domain_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-22A-PARENT-IDENTITY-DOMAIN-BACKFILL';
const TARGET_DOMAIN = 'pokemon_eng_standard';
const EXPECTED_TARGET_ROWS = 1115;
const EXPECTED_TARGET_SETS = 70;
const EXPECTED_FINGERPRINT = 'be0295df8c26e2bb202e62c9bacc21b770b73da648a05c0e0943ce05f5650ee2';
const EXPECTED_DRY_RUN_PROOF = '50cf4cfa1f3f238220285048805923ce9c64c3f83a82b629996bb0034fc1d370';
const REQUIRED_APPROVAL_TEXT = 'Approve real ENRICH-22A-PARENT-IDENTITY-DOMAIN-BACKFILL apply only. Fingerprint: be0295df8c26e2bb202e62c9bacc21b770b73da648a05c0e0943ce05f5650ee2. Scope: 1115 parent card_print identity_domain updates from null to pokemon_eng_standard; target sets=70; every target already has active identity; dry-run proof: 50cf4cfa1f3f238220285048805923ce9c64c3f83a82b629996bb0034fc1d370 == 50cf4cfa1f3f238220285048805923ce9c64c3f83a82b629996bb0034fc1d370. No child writes. No identity writes. No external mapping writes. No species writes. No trait writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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

async function loadTargetSummary(client) {
  const result = await client.query(
    `select
       count(*)::int as target_rows,
       count(distinct s.id)::int as target_sets,
       count(*) filter (where s.identity_domain_default = $1)::int as inheritable_standard_rows,
       count(*) filter (where s.identity_domain_default is null)::int as set_domain_null_rows,
       count(*) filter (where s.identity_domain_default is distinct from $1)::int as nonstandard_set_domain_rows,
       count(*) filter (
         where exists (
           select 1
           from public.card_print_identity cpi
           where cpi.card_print_id = cp.id
             and cpi.is_active = true
         )
       )::int as with_active_identity_rows,
       count(*) filter (
         where not exists (
           select 1
           from public.card_print_identity cpi
           where cpi.card_print_id = cp.id
             and cpi.is_active = true
         )
       )::int as without_active_identity_rows,
       count(*) filter (
         where exists (
           select 1
           from public.card_printings cpr
           where cpr.card_print_id = cp.id
         )
       )::int as with_child_printing_rows,
       count(*) filter (
         where exists (
           select 1
           from public.external_mappings em
           where em.card_print_id = cp.id
             and coalesce(em.active, true) = true
         )
       )::int as with_active_mapping_rows
     from public.card_prints cp
     join public.sets s on s.id = cp.set_id
     where cp.identity_domain is null`,
    [TARGET_DOMAIN],
  );
  return result.rows[0];
}

async function loadDomainInventory(client) {
  const result = await client.query(
    `select
       coalesce(cp.identity_domain, '<null>') as identity_domain,
       count(*)::int as parent_rows
     from public.card_prints cp
     group by coalesce(cp.identity_domain, '<null>')
     order by identity_domain`,
  );
  return result.rows;
}

async function loadUpdatedBySet(client) {
  const result = await client.query(
    `select
       s.code as set_code,
       s.name as set_name,
       count(*)::int as parent_rows
     from public.card_prints cp
     join public.sets s on s.id = cp.set_id
     where cp.identity_domain = $1
       and s.identity_domain_default = $1
     group by s.code, s.name
     order by parent_rows desc, s.code`,
    [TARGET_DOMAIN],
  );
  return result.rows;
}

function validateDryRun(dryRun) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('package_id_mismatch');
  if (dryRun.fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('fingerprint_mismatch');
  if (dryRun.dry_run?.proof_hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_proof_mismatch');
  if (dryRun.dry_run?.pass !== true) findings.push('dry_run_not_passed');
  if ((dryRun.stop_findings ?? []).length !== 0) findings.push('dry_run_stop_findings_present');
  if (dryRun.summary?.target_rows !== EXPECTED_TARGET_ROWS) findings.push('target_rows_mismatch');
  if (dryRun.summary?.target_sets !== EXPECTED_TARGET_SETS) findings.push('target_sets_mismatch');
  if (dryRun.summary?.inheritable_standard_rows !== EXPECTED_TARGET_ROWS) findings.push('inheritable_standard_rows_mismatch');
  if (dryRun.summary?.without_active_identity_rows !== 0) findings.push('without_active_identity_rows_present');
  if (dryRun.target_domain !== TARGET_DOMAIN) findings.push('target_domain_mismatch');
  return findings;
}

async function applyPackage(client) {
  const beforeSummary = await loadTargetSummary(client);
  const beforeDomainInventory = await loadDomainInventory(client);

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");

    if (
      beforeSummary.target_rows !== EXPECTED_TARGET_ROWS ||
      beforeSummary.target_sets !== EXPECTED_TARGET_SETS ||
      beforeSummary.inheritable_standard_rows !== EXPECTED_TARGET_ROWS ||
      beforeSummary.set_domain_null_rows !== 0 ||
      beforeSummary.nonstandard_set_domain_rows !== 0 ||
      beforeSummary.without_active_identity_rows !== 0
    ) {
      throw new Error(`pre-apply guard failed: ${JSON.stringify(beforeSummary)}`);
    }

    const updated = await client.query(
      `update public.card_prints cp
       set identity_domain = s.identity_domain_default
       from public.sets s
       where s.id = cp.set_id
         and cp.identity_domain is null
         and s.identity_domain_default = $1
       returning
         cp.id::text as card_print_id,
         s.code as set_code,
         s.name as set_name,
         cp.name as card_name,
         cp.number,
         cp.identity_domain`,
      [TARGET_DOMAIN],
    );

    if (updated.rows.length !== EXPECTED_TARGET_ROWS) {
      throw new Error(`updated row count mismatch: ${updated.rows.length}`);
    }

    const postInside = await loadTargetSummary(client);
    if (postInside.target_rows !== 0) {
      throw new Error(`post-update null identity_domain rows remain in transaction: ${postInside.target_rows}`);
    }

    await client.query('commit');

    const afterSummary = await loadTargetSummary(client);
    const afterDomainInventory = await loadDomainInventory(client);
    const updatedBySet = updated.rows.reduce((counts, row) => {
      counts[row.set_code] = (counts[row.set_code] ?? 0) + 1;
      return counts;
    }, {});

    return {
      before_summary: beforeSummary,
      before_domain_inventory: beforeDomainInventory,
      updated_rows_count: updated.rows.length,
      updated_set_count: Object.keys(updatedBySet).length,
      updated_by_set: Object.fromEntries(Object.entries(updatedBySet).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
      after_summary: afterSummary,
      after_domain_inventory: afterDomainInventory,
      standard_domain_inventory_by_set: await loadUpdatedBySet(client),
      proof_hash_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        before_summary: beforeSummary,
        updated_rows_count: updated.rows.length,
        updated_by_set: updatedBySet,
        after_summary: afterSummary,
        after_domain_inventory: afterDomainInventory,
      })),
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function markdown(report) {
  const updatedRows = Object.entries(report.apply.updated_by_set)
    .slice(0, 40)
    .map(([setCode, count]) => `| ${setCode} | ${count} |`)
    .join('\n');

  return `# ENRICH-22A Parent Identity Domain Backfill Real Apply

Generated at: ${report.generated_at}

Package: ${PACKAGE_ID}

## Applied

- parent card_print identity_domain updates: ${report.apply.updated_rows_count}
- target domain: \`${TARGET_DOMAIN}\`
- target sets updated: ${report.apply.updated_set_count}
- remaining null card_print identity_domain rows: ${report.apply.after_summary.target_rows}

## Top Updated Sets

| set_code | updated_parent_rows |
|---|---:|
${updatedRows}

## Proof

- dry_run_fingerprint: \`${EXPECTED_FINGERPRINT}\`
- dry_run_proof: \`${EXPECTED_DRY_RUN_PROOF}\`
- real_apply_proof_hash_sha256: \`${report.apply.proof_hash_sha256}\`

## Safety

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
  if (dryRunFindings.length > 0) {
    throw new Error(`Dry-run validation failed: ${dryRunFindings.join(', ')}`);
  }

  const client = new Client({ connectionString: conn, application_name: 'card_row_enrichment_enrich22a_parent_identity_domain_real_apply_v1' });
  await client.connect();
  try {
    const apply = await applyPackage(client);
    const report = {
      version: 'ENRICH22A_PARENT_IDENTITY_DOMAIN_REAL_APPLY_V1',
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
      updated_rows_count: apply.updated_rows_count,
      updated_by_set: apply.updated_by_set,
      proof_hash_sha256: apply.proof_hash_sha256,
    }));

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, markdown(report));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      updated_rows_count: report.apply.updated_rows_count,
      updated_set_count: report.apply.updated_set_count,
      remaining_null_card_print_identity_domain_rows: report.apply.after_summary.target_rows,
      dry_run_fingerprint_sha256: report.dry_run_fingerprint_sha256,
      dry_run_proof_hash_sha256: report.dry_run_proof_hash_sha256,
      real_apply_proof_hash_sha256: report.apply.proof_hash_sha256,
      fingerprint_sha256: report.fingerprint_sha256,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
