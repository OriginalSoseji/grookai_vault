import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const SOURCE_JSON = path.join(OUTPUT_DIR, 'enrich13f_suffix_variant_collision_governance_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich23a1_suffix_owner_modifier_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich23a1_suffix_owner_modifier_guarded_dry_run_v1.md');

const PACKAGE_ID = 'ENRICH-23A1-SUFFIX-OWNER-MODIFIER-BACKFILL';
const EXPECTED_TARGET_ROWS = 4;
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

function suffixPart(number) {
  return String(number ?? '').match(/([a-z])$/i)?.[1]?.toLowerCase() ?? null;
}

function buildTargets(source) {
  return (source.base_number_suffix_collision_rows ?? [])
    .map((row) => ({
      owner_card_print_id: row.existing_owner_card_print_id,
      source_card_print_id: row.source_card_print_id,
      set_code: row.set_code,
      set_name: row.set_name,
      owner_number: row.owner_number,
      owner_name: row.owner_name,
      target_modifier: row.owner_suffix ?? suffixPart(row.owner_number),
      source_number: row.proposed_number,
      source_name: row.source_name,
    }))
    .sort((a, b) => `${a.set_code}|${a.owner_number}|${a.owner_name}`.localeCompare(`${b.set_code}|${b.owner_number}|${b.owner_name}`));
}

async function loadLiveTargets(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         owner_card_print_id uuid,
         source_card_print_id uuid,
         set_code text,
         owner_number text,
         target_modifier text
       )
     )
     select
       target.owner_card_print_id::text,
       target.source_card_print_id::text,
       target.set_code as target_set_code,
       target.owner_number as target_owner_number,
       target.target_modifier,
       owner.set_code as owner_set_code,
       owner.number as owner_number,
       owner.number_plain as owner_number_plain,
       owner.name as owner_name,
       owner.gv_id as owner_gv_id,
       owner.identity_domain as owner_identity_domain,
       owner.printed_identity_modifier as owner_printed_identity_modifier,
       source.set_code as source_set_code,
       source.number as source_number,
       source.number_plain as source_number_plain,
       source.name as source_name,
       source.printed_identity_modifier as source_printed_identity_modifier,
       s.identity_domain_default,
       count(distinct cpr.id)::int as owner_child_count,
       count(distinct cpi.id) filter (where cpi.is_active = true)::int as owner_active_identity_count,
       count(distinct em.id) filter (where coalesce(em.active, true) = true)::int as owner_active_mapping_count
     from target
     join public.card_prints owner on owner.id = target.owner_card_print_id
     join public.card_prints source on source.id = target.source_card_print_id
     join public.sets s on s.id = owner.set_id
     left join public.card_printings cpr on cpr.card_print_id = owner.id
     left join public.card_print_identity cpi on cpi.card_print_id = owner.id
     left join public.external_mappings em on em.card_print_id = owner.id
     group by
       target.owner_card_print_id, target.source_card_print_id, target.set_code, target.owner_number, target.target_modifier,
       owner.set_code, owner.number, owner.number_plain, owner.name, owner.gv_id, owner.identity_domain, owner.printed_identity_modifier,
       source.set_code, source.number, source.number_plain, source.name, source.printed_identity_modifier,
       s.identity_domain_default
     order by target.set_code, target.owner_number`,
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

async function parentIdentityCollisionCount(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         owner_card_print_id uuid,
         target_modifier text
       )
     ),
     projected as (
       select
         owner.id,
         owner.set_id,
         owner.number_plain,
         target.target_modifier,
         coalesce(owner.variant_key, '') as variant_key
       from target
       join public.card_prints owner on owner.id = target.owner_card_print_id
     )
     select count(*)::int as collision_count
     from projected
     join public.card_prints other
       on other.set_id = projected.set_id
      and other.id <> projected.id
      and other.number_plain is not distinct from projected.number_plain
      and coalesce(other.printed_identity_modifier, '') = projected.target_modifier
      and coalesce(other.variant_key, '') = projected.variant_key`,
    [JSON.stringify(targets)],
  );
  return result.rows[0]?.collision_count ?? 0;
}

async function runRollbackDryRun(client, targets) {
  const beforeTargets = await loadLiveTargets(client, targets);
  const beforeDuplicateGroups = await activeIdentityDuplicateGroups(client);
  const beforeProjectedCollisions = await parentIdentityCollisionCount(client, targets);

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");

    const guardFindings = [];
    if (targets.length !== EXPECTED_TARGET_ROWS) guardFindings.push(`target_rows_mismatch:${targets.length}`);
    if (beforeTargets.length !== targets.length) guardFindings.push(`live_target_rows_mismatch:${beforeTargets.length}`);
    if (beforeDuplicateGroups !== 0) guardFindings.push(`preexisting_active_identity_duplicate_groups:${beforeDuplicateGroups}`);
    if (beforeProjectedCollisions !== 0) guardFindings.push(`projected_modifier_parent_collisions:${beforeProjectedCollisions}`);
    for (const row of beforeTargets) {
      if (row.owner_identity_domain !== TARGET_DOMAIN || row.identity_domain_default !== TARGET_DOMAIN) {
        guardFindings.push(`domain_mismatch:${row.owner_card_print_id}`);
      }
      if (row.owner_printed_identity_modifier !== null) {
        guardFindings.push(`owner_modifier_already_set:${row.owner_card_print_id}`);
      }
      if (!row.target_modifier || !/^[a-z]$/i.test(row.target_modifier)) {
        guardFindings.push(`invalid_target_modifier:${row.owner_card_print_id}`);
      }
      if (!String(row.owner_number ?? '').toLowerCase().endsWith(row.target_modifier)) {
        guardFindings.push(`owner_number_suffix_mismatch:${row.owner_card_print_id}`);
      }
      if (row.source_set_code !== null || row.source_number !== null || row.source_printed_identity_modifier !== null) {
        guardFindings.push(`source_row_not_still_blocked:${row.source_card_print_id}`);
      }
    }
    if (guardFindings.length) throw new Error(`preflight guard failed: ${guardFindings.join(', ')}`);

    const updated = await client.query(
      `with target as (
         select *
         from jsonb_to_recordset($1::jsonb) as t(
           owner_card_print_id uuid,
           target_modifier text
         )
       )
       update public.card_prints cp
       set printed_identity_modifier = target.target_modifier
       from target
       where cp.id = target.owner_card_print_id
         and cp.printed_identity_modifier is null
         and cp.identity_domain = $2
       returning
         cp.id::text as card_print_id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name as card_name,
         cp.printed_identity_modifier`,
      [JSON.stringify(targets), TARGET_DOMAIN],
    );

    const afterTargets = await loadLiveTargets(client, targets);
    const afterDuplicateGroups = await activeIdentityDuplicateGroups(client);

    await client.query('rollback');

    return {
      pass: updated.rows.length === EXPECTED_TARGET_ROWS && afterDuplicateGroups === 0,
      before_targets: beforeTargets,
      updated_rows: updated.rows,
      after_targets: afterTargets,
      before_active_identity_duplicate_groups: beforeDuplicateGroups,
      after_active_identity_duplicate_groups: afterDuplicateGroups,
      before_projected_parent_collision_count: beforeProjectedCollisions,
      proof_hash_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        updated_rows: updated.rows,
        after_active_identity_duplicate_groups: afterDuplicateGroups,
      })),
      stop_findings: [
        ...(updated.rows.length === EXPECTED_TARGET_ROWS ? [] : [`updated_rows_mismatch:${updated.rows.length}`]),
        ...(afterDuplicateGroups === 0 ? [] : [`after_active_identity_duplicate_groups:${afterDuplicateGroups}`]),
      ],
    };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function markdown(report) {
  const rows = markdownTable(report.dry_run.updated_rows, [
    { label: 'set_code', value: (row) => row.set_code },
    { label: 'number', value: (row) => row.number },
    { label: 'number_plain', value: (row) => row.number_plain },
    { label: 'modifier', value: (row) => row.printed_identity_modifier },
    { label: 'card_name', value: (row) => row.card_name },
  ]);

  return `# ENRICH-23A1 Suffix Owner Modifier Backfill Dry Run

Generated at: ${report.generated_at}

Mode: guarded dry-run, rollback-only.

DB writes performed: false
Migrations created: false
Cleanup performed: false

## Scope

Set \`card_prints.printed_identity_modifier\` to the source-backed suffix letter for four existing suffix parents whose base-number counterpart is currently blocked by \`uq_card_prints_identity_v2_standard_sets\`.

This does not update base rows, GV IDs, child rows, active identities, external mappings, traits, species, images, deletes, merges, migrations, or global apply.

## Dry-Run Result

- pass: ${report.dry_run.pass}
- target rows: ${report.summary.target_rows}
- updated rows in rollback transaction: ${report.dry_run.updated_rows.length}
- active identity duplicate groups after dry run: ${report.dry_run.after_active_identity_duplicate_groups}
- dry-run proof hash: \`${report.dry_run.proof_hash_sha256}\`
- package fingerprint: \`${report.fingerprint_sha256}\`

## Rows

${rows}

## Recommended Approval

\`Approve real ${PACKAGE_ID} apply only. Fingerprint: ${report.fingerprint_sha256}. Scope: ${report.summary.target_rows} suffix parent printed_identity_modifier updates to suffix letter a for existing 65a/98a/XY150a/XY198a parents; dry-run proof: ${report.dry_run.proof_hash_sha256} == ${report.dry_run.proof_hash_sha256}. No base parent writes. No GV-ID writes. No child writes. No identity writes. No external mapping writes. No species writes. No trait writes. No deletes. No merges. No migrations. No image writes. No global apply.\`
`;
}

async function main() {
  const conn = connectionString();
  if (!conn) throw new Error('Missing database connection string.');

  const source = await readJson(SOURCE_JSON);
  const targets = buildTargets(source);

  const client = new Client({ connectionString: conn, application_name: 'card_row_enrichment_enrich23a1_suffix_owner_modifier_guarded_dry_run_v1' });
  await client.connect();
  try {
    const dryRun = await runRollbackDryRun(client, targets);
    const report = {
      version: 'ENRICH23A1_SUFFIX_OWNER_MODIFIER_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'guarded_dry_run_rollback_only',
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      source_file: SOURCE_JSON,
      target_domain: TARGET_DOMAIN,
      summary: {
        target_rows: targets.length,
        target_sets: [...new Set(targets.map((row) => row.set_code))].sort().length,
      },
      targets,
      dry_run: dryRun,
      stop_findings: dryRun.stop_findings,
      forbidden: [
        'base parent writes',
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
        owner_card_print_id: row.owner_card_print_id,
        set_code: row.set_code,
        owner_number: row.owner_number,
        target_modifier: row.target_modifier,
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
