import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich22a_parent_identity_domain_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich22a_parent_identity_domain_guarded_dry_run_v1.md');

const PACKAGE_ID = 'ENRICH-22A-PARENT-IDENTITY-DOMAIN-BACKFILL';
const TARGET_DOMAIN = 'pokemon_eng_standard';
const EXPECTED_TARGET_ROWS = 1115;

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

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
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

async function loadTargetsBySet(client) {
  const result = await client.query(
    `select
       s.code as set_code,
       s.name as set_name,
       s.identity_domain_default,
       count(*)::int as parent_rows,
       count(*) filter (
         where exists (
           select 1
           from public.card_print_identity cpi
           where cpi.card_print_id = cp.id
             and cpi.is_active = true
         )
       )::int as with_active_identity_rows,
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
     where cp.identity_domain is null
     group by s.code, s.name, s.identity_domain_default
     order by parent_rows desc, s.code`,
  );
  return result.rows;
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

async function runRollbackDryRun(client) {
  const beforeSummary = await loadTargetSummary(client);
  const beforeInventory = await loadDomainInventory(client);

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");

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
         cp.name as card_name,
         cp.number,
         cp.identity_domain`,
      [TARGET_DOMAIN],
    );

    const afterSummary = await loadTargetSummary(client);
    const afterInventory = await loadDomainInventory(client);

    await client.query('rollback');

    return {
      pass: updated.rows.length === EXPECTED_TARGET_ROWS
        && beforeSummary.target_rows === EXPECTED_TARGET_ROWS
        && beforeSummary.inheritable_standard_rows === EXPECTED_TARGET_ROWS
        && beforeSummary.set_domain_null_rows === 0
        && beforeSummary.nonstandard_set_domain_rows === 0
        && beforeSummary.without_active_identity_rows === 0
        && afterSummary.target_rows === 0,
      updated_rows_count: updated.rows.length,
      before_summary: beforeSummary,
      after_summary: afterSummary,
      before_domain_inventory: beforeInventory,
      after_domain_inventory: afterInventory,
      proof_hash_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        target_domain: TARGET_DOMAIN,
        updated_rows_count: updated.rows.length,
        updated_set_counts: updated.rows.reduce((counts, row) => {
          counts[row.set_code] = (counts[row.set_code] ?? 0) + 1;
          return counts;
        }, {}),
        before_summary: beforeSummary,
        after_summary: afterSummary,
        after_domain_inventory: afterInventory,
      })),
      stop_findings: [
        ...(updated.rows.length === EXPECTED_TARGET_ROWS ? [] : [`updated_rows_mismatch:${updated.rows.length}`]),
        ...(beforeSummary.target_rows === EXPECTED_TARGET_ROWS ? [] : [`target_rows_mismatch:${beforeSummary.target_rows}`]),
        ...(beforeSummary.inheritable_standard_rows === EXPECTED_TARGET_ROWS ? [] : [`inheritable_standard_rows_mismatch:${beforeSummary.inheritable_standard_rows}`]),
        ...(beforeSummary.set_domain_null_rows === 0 ? [] : [`set_domain_null_rows_present:${beforeSummary.set_domain_null_rows}`]),
        ...(beforeSummary.nonstandard_set_domain_rows === 0 ? [] : [`nonstandard_set_domain_rows_present:${beforeSummary.nonstandard_set_domain_rows}`]),
        ...(beforeSummary.without_active_identity_rows === 0 ? [] : [`without_active_identity_rows_present:${beforeSummary.without_active_identity_rows}`]),
        ...(afterSummary.target_rows === 0 ? [] : [`after_null_domain_rows_remaining:${afterSummary.target_rows}`]),
      ],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function markdown(report) {
  const setRows = markdownTable(report.targets_by_set.slice(0, 40), [
    { label: 'set_code', value: (row) => row.set_code },
    { label: 'set_name', value: (row) => row.set_name },
    { label: 'domain_default', value: (row) => row.identity_domain_default },
    { label: 'parents', value: (row) => row.parent_rows },
    { label: 'active_identity', value: (row) => row.with_active_identity_rows },
    { label: 'child_printing', value: (row) => row.with_child_printing_rows },
    { label: 'active_mapping', value: (row) => row.with_active_mapping_rows },
  ]);

  return `# ENRICH-22A Parent Identity Domain Backfill Dry Run

Generated at: ${report.generated_at}

Mode: guarded dry-run, rollback-only.

DB writes performed: false
Migrations created: false
Cleanup performed: false

## Scope

Backfill only \`card_prints.identity_domain\` from the owning set's \`identity_domain_default\` where:

- parent \`identity_domain\` is currently null
- set \`identity_domain_default\` is \`${TARGET_DOMAIN}\`
- parent already has an active \`card_print_identity\`

No child rows, identity rows, external mappings, species rows, traits, images, deletes, merges, or migrations are touched.

## Summary

- target parent rows: ${report.summary.target_rows}
- target sets: ${report.summary.target_sets}
- inheritable standard rows: ${report.summary.inheritable_standard_rows}
- rows without active identity: ${report.summary.without_active_identity_rows}
- dry-run updated rows: ${report.dry_run.updated_rows_count}
- dry-run proof hash: \`${report.dry_run.proof_hash_sha256}\`
- package fingerprint: \`${report.fingerprint_sha256}\`

## Top Target Sets

${setRows}

## Guard Result

- pass: ${report.dry_run.pass}
- stop findings: ${report.stop_findings.length ? report.stop_findings.join(', ') : 'none'}

## Recommended Approval

\`Approve real ${PACKAGE_ID} apply only. Fingerprint: ${report.fingerprint_sha256}. Scope: ${report.summary.target_rows} parent card_print identity_domain updates from null to ${TARGET_DOMAIN}; target sets=${report.summary.target_sets}; every target already has active identity; dry-run proof: ${report.dry_run.proof_hash_sha256} == ${report.dry_run.proof_hash_sha256}. No child writes. No identity writes. No external mapping writes. No species writes. No trait writes. No deletes. No merges. No migrations. No image writes. No global apply.\`
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing database connection string.');

  const client = new Client({ connectionString: conn, application_name: 'card_row_enrichment_enrich22a_parent_identity_domain_guarded_dry_run_v1' });
  await client.connect();
  try {
    const summary = await loadTargetSummary(client);
    const targetsBySet = await loadTargetsBySet(client);
    const dryRun = await runRollbackDryRun(client);

    const report = {
      version: 'ENRICH22A_PARENT_IDENTITY_DOMAIN_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'guarded_dry_run_rollback_only',
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      target_domain: TARGET_DOMAIN,
      expected_target_rows: EXPECTED_TARGET_ROWS,
      summary,
      targets_by_set: targetsBySet,
      dry_run: dryRun,
      stop_findings: dryRun.stop_findings,
      forbidden: [
        'card_printings writes',
        'card_print_identity writes',
        'external_mappings writes',
        'card_print_species writes',
        'card_print_traits writes',
        'deletes',
        'merges',
        'migrations',
        'image writes',
        'global apply',
      ],
    };

    report.fingerprint_sha256 = sha256(stableJson({
      package_id: report.package_id,
      target_domain: report.target_domain,
      expected_target_rows: report.expected_target_rows,
      summary: report.summary,
      targets_by_set: report.targets_by_set.map((row) => ({
        set_code: row.set_code,
        parent_rows: row.parent_rows,
        identity_domain_default: row.identity_domain_default,
      })),
      proof_hash_sha256: report.dry_run.proof_hash_sha256,
    }));

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, markdown(report));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.stop_findings.length === 0 && report.dry_run.pass,
      fingerprint_sha256: report.fingerprint_sha256,
      dry_run_proof_hash_sha256: report.dry_run.proof_hash_sha256,
      summary: report.summary,
      stop_findings: report.stop_findings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
