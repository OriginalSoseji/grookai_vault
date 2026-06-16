import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich23a1_suffix_owner_modifier_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich23a1_suffix_owner_modifier_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich23a1_suffix_owner_modifier_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-23A1-SUFFIX-OWNER-MODIFIER-BACKFILL';
const TARGET_DOMAIN = 'pokemon_eng_standard';
const EXPECTED_TARGET_ROWS = 4;
const EXPECTED_TARGET_SETS = 3;
const EXPECTED_FINGERPRINT = 'bdf9392380013b2fa6697804a05e9221a3e3cc8be5d3f610449ec4da06b2f1f0';
const EXPECTED_DRY_RUN_PROOF = '10208e8b979230fae02067f86ce8cf22f2376fd0e645840a395504569f49a99f';
const REQUIRED_APPROVAL_TEXT = 'Approve real ENRICH-23A1-SUFFIX-OWNER-MODIFIER-BACKFILL apply only. Fingerprint: bdf9392380013b2fa6697804a05e9221a3e3cc8be5d3f610449ec4da06b2f1f0. Scope: 4 suffix parent printed_identity_modifier updates to suffix letter a for existing 65a/98a/XY150a/XY198a parents; dry-run proof: 10208e8b979230fae02067f86ce8cf22f2376fd0e645840a395504569f49a99f == 10208e8b979230fae02067f86ce8cf22f2376fd0e645840a395504569f49a99f. No base parent writes. No GV-ID writes. No child writes. No identity writes. No external mapping writes. No species writes. No trait writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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
  if (dryRun.summary?.target_sets !== EXPECTED_TARGET_SETS) findings.push('target_sets_mismatch');
  return findings;
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

async function applyPackage(client, targets) {
  const beforeTargets = await loadLiveTargets(client, targets);
  const beforeDuplicateGroups = await activeIdentityDuplicateGroups(client);
  const beforeProjectedCollisions = await parentIdentityCollisionCount(client, targets);
  const alreadyApplied = beforeTargets.length === targets.length
    && beforeTargets.every((row) => row.owner_printed_identity_modifier === row.target_modifier);

  if (alreadyApplied) {
    const afterDuplicateGroups = await activeIdentityDuplicateGroups(client);
    const updatedRows = beforeTargets.map((row) => ({
      card_print_id: row.owner_card_print_id,
      set_code: row.owner_set_code,
      number: row.owner_number,
      number_plain: row.owner_number_plain,
      card_name: row.owner_name,
      printed_identity_modifier: row.owner_printed_identity_modifier,
    }));

    return {
      apply_status: 'already_applied_verified_noop',
      durable_db_writes_already_present: true,
      before_targets: beforeTargets,
      updated_rows: updatedRows,
      after_targets_inside_transaction: beforeTargets,
      after_targets: beforeTargets,
      before_active_identity_duplicate_groups: beforeDuplicateGroups,
      after_active_identity_duplicate_groups: afterDuplicateGroups,
      before_projected_parent_collision_count: beforeProjectedCollisions,
      proof_hash_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        apply_status: 'already_applied_verified_noop',
        updated_rows: updatedRows,
        after_targets: beforeTargets,
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
    if (guardFindings.length) throw new Error(`pre-apply guard failed: ${guardFindings.join(', ')}`);

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

    if (updated.rows.length !== EXPECTED_TARGET_ROWS) {
      throw new Error(`updated row count mismatch: ${updated.rows.length}`);
    }

    const afterTargetsInside = await loadLiveTargets(client, targets);
    const afterDuplicateGroupsInside = await activeIdentityDuplicateGroups(client);
    if (afterDuplicateGroupsInside !== 0) {
      throw new Error(`active identity duplicate groups after update: ${afterDuplicateGroupsInside}`);
    }

    await client.query('commit');

    const afterTargets = await loadLiveTargets(client, targets);
    const afterDuplicateGroups = await activeIdentityDuplicateGroups(client);

    return {
      before_targets: beforeTargets,
      updated_rows: updated.rows,
      after_targets_inside_transaction: afterTargetsInside,
      after_targets: afterTargets,
      before_active_identity_duplicate_groups: beforeDuplicateGroups,
      after_active_identity_duplicate_groups: afterDuplicateGroups,
      before_projected_parent_collision_count: beforeProjectedCollisions,
      proof_hash_sha256: sha256(stableJson({
        package_id: PACKAGE_ID,
        updated_rows: updated.rows,
        after_targets: afterTargets,
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
    .map((row) => `| ${row.set_code} | ${row.number} | ${row.number_plain} | ${row.printed_identity_modifier} | ${row.card_name} | ${row.card_print_id} |`)
    .join('\n');
  return `# ENRICH-23A1 Suffix Owner Modifier Backfill Real Apply

Generated at: ${report.generated_at}

Package: ${PACKAGE_ID}

## Applied

| set_code | number | number_plain | modifier | card_name | card_print_id |
|---|---:|---:|---|---|---|
${rows}

## Proof

- dry_run_fingerprint: \`${EXPECTED_FINGERPRINT}\`
- dry_run_proof: \`${EXPECTED_DRY_RUN_PROOF}\`
- real_apply_proof_hash_sha256: \`${report.apply.proof_hash_sha256}\`
- updated_rows: ${report.apply.updated_rows.length}
- active_identity_duplicate_groups_after_apply: ${report.apply.after_active_identity_duplicate_groups}

## Safety

- base parent writes: 0
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
  if (dryRunFindings.length > 0) {
    throw new Error(`Dry-run validation failed: ${dryRunFindings.join(', ')}`);
  }

  const targets = dryRun.targets ?? [];
  const client = new Client({ connectionString: conn, application_name: 'card_row_enrichment_enrich23a1_suffix_owner_modifier_real_apply_v1' });
  await client.connect();
  try {
    const apply = await applyPackage(client, targets);
    const report = {
      version: 'ENRICH23A1_SUFFIX_OWNER_MODIFIER_REAL_APPLY_V1',
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
      updated_rows_count: report.apply.updated_rows.length,
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
