import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const READINESS_JSON = path.join(OUTPUT_DIR, 'enrich13_core_identity_resolution_readiness_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich23a2_residual_parent_core_identity_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich23a2_residual_parent_core_identity_guarded_dry_run_v1.md');

const PACKAGE_ID = 'ENRICH-23A2-RESIDUAL-PARENT-CORE-IDENTITY-BACKFILL';
const EXPECTED_TARGET_ROWS = 4;
const EXPECTED_REMAINING_CORE_GAPS = 1;
const TARGET_DOMAIN = 'pokemon_eng_standard';

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

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function buildTargets(readiness) {
  return (readiness.rows ?? [])
    .filter((row) => row.classification === 'ready_for_core_identity_guarded_dry_run_preparation')
    .map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.proposed_set_code,
      number: row.proposed_number,
      number_plain: row.proposed_number_plain,
      card_name: row.card_name,
      external_ids: row.external_ids,
    }))
    .sort((a, b) => `${a.set_code}|${a.number}|${a.card_name}`.localeCompare(`${b.set_code}|${b.number}|${b.card_name}`));
}

async function loadLiveTargets(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_code text,
         number text,
         number_plain text,
         card_name text
       )
     )
     select
       target.card_print_id::text,
       target.set_code as target_set_code,
       target.number as target_number,
       target.number_plain as target_number_plain,
       cp.set_code as current_set_code,
       cp.number as current_number,
       cp.number_plain as current_number_plain,
       cp.name as card_name,
       cp.gv_id,
       cp.identity_domain,
       cp.printed_identity_modifier,
       cp.variant_key,
       s.code as owning_set_code,
       s.name as set_name,
       s.identity_domain_default,
       cpi.id::text as active_identity_id,
       cpi.identity_domain as active_identity_domain,
       cpi.set_code_identity,
       cpi.printed_number,
       cpi.normalized_printed_name,
       cpi.identity_key_version,
       cpi.identity_key_hash,
       count(distinct cpr.id)::int as child_count,
       count(distinct em.id) filter (where coalesce(em.active, true) = true)::int as active_mapping_count,
       count(distinct cpt.id)::int as trait_count,
       count(distinct cps.id)::int as species_count
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     join public.sets s on s.id = cp.set_id
     left join public.card_print_identity cpi on cpi.card_print_id = cp.id and cpi.is_active = true
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     left join public.external_mappings em on em.card_print_id = cp.id
     left join public.card_print_traits cpt on cpt.card_print_id = cp.id
     left join public.card_print_species cps on cps.card_print_id = cp.id
     group by
       target.card_print_id, target.set_code, target.number, target.number_plain,
       cp.set_code, cp.number, cp.number_plain, cp.name, cp.gv_id, cp.identity_domain, cp.printed_identity_modifier, cp.variant_key,
       s.code, s.name, s.identity_domain_default,
       cpi.id, cpi.identity_domain, cpi.set_code_identity, cpi.printed_number, cpi.normalized_printed_name,
       cpi.identity_key_version, cpi.identity_key_hash
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

async function projectedParentCollisionCount(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_code text,
         number text
       )
     ),
     projected as (
       select
         cp.id,
         cp.set_id,
         regexp_replace(target.number, '[^0-9]', '', 'g') as number_plain,
         coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
         coalesce(cp.variant_key, '') as variant_key
       from target
       join public.card_prints cp on cp.id = target.card_print_id
     )
     select count(*)::int as collision_count
     from projected
     join public.card_prints other
       on other.set_id = projected.set_id
      and other.id <> projected.id
      and other.number_plain is not distinct from projected.number_plain
      and coalesce(other.printed_identity_modifier, '') = projected.printed_identity_modifier
      and coalesce(other.variant_key, '') = projected.variant_key`,
    [JSON.stringify(targets)],
  );
  return result.rows[0]?.collision_count ?? 0;
}

async function runRollbackDryRun(client, targets) {
  const beforeTargets = await loadLiveTargets(client, targets);
  const beforeDuplicateGroups = await activeIdentityDuplicateGroups(client);
  const beforeCoreIdentityGaps = await coreIdentityGapCount(client);
  const beforeProjectedParentCollisions = await projectedParentCollisionCount(client, targets);

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");

    const guardFindings = [];
    if (targets.length !== EXPECTED_TARGET_ROWS) guardFindings.push(`target_rows_mismatch:${targets.length}`);
    if (beforeTargets.length !== targets.length) guardFindings.push(`live_target_rows_mismatch:${beforeTargets.length}`);
    if (beforeDuplicateGroups !== 0) guardFindings.push(`preexisting_active_identity_duplicate_groups:${beforeDuplicateGroups}`);
    if (beforeCoreIdentityGaps !== EXPECTED_TARGET_ROWS + EXPECTED_REMAINING_CORE_GAPS) guardFindings.push(`core_identity_gap_count_mismatch:${beforeCoreIdentityGaps}`);
    if (beforeProjectedParentCollisions !== 0) guardFindings.push(`projected_parent_collisions:${beforeProjectedParentCollisions}`);
    for (const row of beforeTargets) {
      if (row.current_set_code !== null || row.current_number !== null) {
        guardFindings.push(`target_parent_already_has_core_identity:${row.card_print_id}`);
      }
      if (row.identity_domain !== TARGET_DOMAIN || row.identity_domain_default !== TARGET_DOMAIN) {
        guardFindings.push(`target_domain_mismatch:${row.card_print_id}`);
      }
      if (!row.active_identity_id) {
        guardFindings.push(`missing_active_identity:${row.card_print_id}`);
      }
      if (row.active_identity_domain !== TARGET_DOMAIN) {
        guardFindings.push(`active_identity_domain_mismatch:${row.card_print_id}`);
      }
      if (row.set_code_identity !== row.target_set_code || row.printed_number !== row.target_number) {
        guardFindings.push(`active_identity_target_mismatch:${row.card_print_id}`);
      }
      if (row.printed_identity_modifier !== null) {
        guardFindings.push(`target_base_row_has_modifier:${row.card_print_id}`);
      }
    }
    if (guardFindings.length) throw new Error(`preflight guard failed: ${guardFindings.join(', ')}`);

    const updated = await client.query(
      `with target as (
         select *
         from jsonb_to_recordset($1::jsonb) as t(
           card_print_id uuid,
           set_code text,
           number text
         )
       ),
       active_identity as (
         select
           target.card_print_id,
           cpi.set_code_identity,
           cpi.printed_number
         from target
         join public.card_print_identity cpi
           on cpi.card_print_id = target.card_print_id
          and cpi.is_active = true
          and cpi.identity_domain = $2
          and cpi.set_code_identity = target.set_code
          and cpi.printed_number = target.number
       )
       update public.card_prints cp
       set
         set_code = active_identity.set_code_identity,
         number = active_identity.printed_number
       from active_identity
       where cp.id = active_identity.card_print_id
         and cp.set_code is null
         and cp.number is null
         and cp.identity_domain = $2
       returning
         cp.id::text as card_print_id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name as card_name`,
      [JSON.stringify(targets), TARGET_DOMAIN],
    );

    const afterTargets = await loadLiveTargets(client, targets);
    const afterDuplicateGroups = await activeIdentityDuplicateGroups(client);
    const afterCoreIdentityGaps = await coreIdentityGapCount(client);

    await client.query('rollback');

    return {
      pass: updated.rows.length === EXPECTED_TARGET_ROWS
        && afterCoreIdentityGaps === EXPECTED_REMAINING_CORE_GAPS
        && beforeDuplicateGroups === 0
        && afterDuplicateGroups === 0,
      before_targets: beforeTargets,
      updated_rows: updated.rows,
      after_targets: afterTargets,
      before_core_identity_gap_rows: beforeCoreIdentityGaps,
      after_core_identity_gap_rows: afterCoreIdentityGaps,
      before_active_identity_duplicate_groups: beforeDuplicateGroups,
      after_active_identity_duplicate_groups: afterDuplicateGroups,
      before_projected_parent_collision_count: beforeProjectedParentCollisions,
      proof_hash_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        updated_rows: updated.rows,
        after_core_identity_gap_rows: afterCoreIdentityGaps,
        after_active_identity_duplicate_groups: afterDuplicateGroups,
      })),
      stop_findings: [
        ...(updated.rows.length === EXPECTED_TARGET_ROWS ? [] : [`updated_rows_mismatch:${updated.rows.length}`]),
        ...(afterCoreIdentityGaps === EXPECTED_REMAINING_CORE_GAPS ? [] : [`after_core_identity_gaps_unexpected:${afterCoreIdentityGaps}`]),
        ...(afterDuplicateGroups === 0 ? [] : [`after_active_identity_duplicate_groups:${afterDuplicateGroups}`]),
      ],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function markdown(report) {
  const rows = markdownTable(report.dry_run.updated_rows, [
    { label: 'set_code', value: (row) => row.set_code },
    { label: 'number', value: (row) => row.number },
    { label: 'number_plain', value: (row) => row.number_plain },
    { label: 'card_name', value: (row) => row.card_name },
    { label: 'card_print_id', value: (row) => row.card_print_id },
  ]);

  return `# ENRICH-23A2 Residual Parent Core Identity Backfill Dry Run

Generated at: ${report.generated_at}

Mode: guarded dry-run, rollback-only.

DB writes performed: false
Migrations created: false
Cleanup performed: false

## Scope

Backfill parent mirror fields from existing active identity rows for four base-number rows unlocked by ENRICH-23A1:

- \`card_prints.set_code\`
- \`card_prints.number\`
- generated \`card_prints.number_plain\`

Luxray GL remains excluded/manual-blocked. This package does not write GV IDs, child rows, active identities, external mappings, traits, species, images, deletes, merges, migrations, or global apply.

## Dry-Run Result

- pass: ${report.dry_run.pass}
- target rows: ${report.summary.target_rows}
- updated rows in rollback transaction: ${report.dry_run.updated_rows.length}
- before core identity gap rows: ${report.dry_run.before_core_identity_gap_rows}
- after core identity gap rows inside dry run: ${report.dry_run.after_core_identity_gap_rows}
- active identity duplicate groups after dry run: ${report.dry_run.after_active_identity_duplicate_groups}
- dry-run proof hash: \`${report.dry_run.proof_hash_sha256}\`
- package fingerprint: \`${report.fingerprint_sha256}\`

## Rows

${rows}

## Recommended Approval

\`Approve real ${PACKAGE_ID} apply only. Fingerprint: ${report.fingerprint_sha256}. Scope: ${report.summary.target_rows} parent card_print core identity updates from existing active identity rows; writes card_prints.set_code and card_prints.number only; generated number_plain verified in dry-run; Luxray GL remains manual-blocked; dry-run proof: ${report.dry_run.proof_hash_sha256} == ${report.dry_run.proof_hash_sha256}. No GV-ID writes. No child writes. No identity writes. No external mapping writes. No species writes. No trait writes. No deletes. No merges. No migrations. No image writes. No global apply.\`
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing database connection string.');

  const readiness = await readJson(READINESS_JSON);
  const targets = buildTargets(readiness);

  const client = new Client({ connectionString: conn, application_name: 'card_row_enrichment_enrich23a2_residual_parent_core_identity_guarded_dry_run_v1' });
  await client.connect();
  try {
    const dryRun = await runRollbackDryRun(client, targets);
    const report = {
      version: 'ENRICH23A2_RESIDUAL_PARENT_CORE_IDENTITY_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'guarded_dry_run_rollback_only',
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      source_file: READINESS_JSON,
      target_domain: TARGET_DOMAIN,
      summary: {
        target_rows: targets.length,
        target_sets: [...new Set(targets.map((row) => row.set_code))].sort().length,
        remaining_manual_blocked_rows: EXPECTED_REMAINING_CORE_GAPS,
      },
      targets,
      dry_run: dryRun,
      stop_findings: dryRun.stop_findings,
      forbidden: [
        'gv_id writes',
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
      targets: report.targets.map((row) => ({
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        number: row.number,
        card_name: row.card_name,
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
