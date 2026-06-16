import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const SOURCE_JSON = path.join(OUTPUT_DIR, 'enrich31a_physical_gv_id_collision_governance_v1.json');
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich31b_modifier_parent_gv_id_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich31b_modifier_parent_gv_id_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich31b_modifier_parent_gv_id_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-31B-MODIFIER-PARENT-GV-ID-BACKFILL';
const EXPECTED_FINGERPRINT = 'c5b9b3eb58342bbb2e7e7499a79be2aac503d69e63f062990e79b740740fdbb7';
const EXPECTED_DRY_RUN_PROOF = '0d1e934406db1228d6f4dae7282c1d38317be8e4b48a886933089f0339c08b54';
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

function buildTargets(source) {
  return (source.rows ?? [])
    .filter((row) => row.write_safe_now)
    .map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      printed_identity_modifier: row.printed_identity_modifier,
      proposed_gv_id: row.proposed_modifier_gv_id,
    }))
    .sort((a, b) => `${a.set_code}|${a.number}|${a.card_name}`.localeCompare(`${b.set_code}|${b.number}|${b.card_name}`));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
     )
     select
       cp.id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cp.identity_domain,
       cp.gv_id
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name nulls last, cp.id`,
    [JSON.stringify(targets)],
  );

  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      target_rows: targets.length,
      captured_rows: result.rows.length,
      rows_with_gv_id: result.rows.filter((row) => row.gv_id).length,
      rows_without_gv_id: result.rows.filter((row) => !row.gv_id).length,
    },
  };
}

async function validateScope(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         printed_identity_modifier text,
         proposed_gv_id text
       )
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_print_id)::int from target) as distinct_target_count,
       (select count(distinct proposed_gv_id)::int from target) as distinct_proposed_gv_count,
       (select count(*)::int from target where proposed_gv_id is null or btrim(proposed_gv_id) = '') as missing_proposed_gv_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int from target join public.card_prints cp on cp.id = target.card_print_id where cp.gv_id is not null) as target_already_has_gv_count,
       (select count(*)::int from target join public.card_prints cp on cp.id = target.card_print_id where cp.identity_domain is distinct from $2) as target_domain_mismatch_count,
       (select count(*)::int from target join public.card_prints cp on cp.id = target.card_print_id where cp.printed_identity_modifier is distinct from target.printed_identity_modifier) as target_modifier_mismatch_count,
       (select count(*)::int from target join public.card_prints cp on cp.gv_id = target.proposed_gv_id and cp.id <> target.card_print_id) as existing_gv_collision_count,
       (select count(*)::int from (
          select proposed_gv_id
          from target
          group by proposed_gv_id
          having count(*) > 1
        ) dup) as batch_duplicate_gv_count`,
    [JSON.stringify(targets), TARGET_DOMAIN],
  );
  return result.rows[0];
}

function validateDryRun(dryRun, packageFingerprint) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.package_fingerprint_sha256 !== packageFingerprint) findings.push('package_fingerprint_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('expected_fingerprint_mismatch');
  if (dryRun.scope?.target_rows !== EXPECTED_TARGET_ROWS) findings.push('target_rows_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_after_hash_mismatch');
  if (dryRun.execution?.dry_run_status !== 'completed_rolled_back_no_durable_change') findings.push('dry_run_status_mismatch');
  return findings;
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let updateProof = null;

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const guard = await validateScope(client, targets);
    const findings = [];
    if (targets.length !== EXPECTED_TARGET_ROWS) findings.push(`target_rows_mismatch:${targets.length}`);
    if (guard.target_count !== targets.length) findings.push(`guard_target_count_mismatch:${guard.target_count}`);
    if (guard.distinct_target_count !== targets.length) findings.push(`distinct_target_count_mismatch:${guard.distinct_target_count}`);
    if (guard.distinct_proposed_gv_count !== targets.length) findings.push(`distinct_proposed_gv_count_mismatch:${guard.distinct_proposed_gv_count}`);
    if (guard.missing_proposed_gv_count !== 0) findings.push(`missing_proposed_gv_count:${guard.missing_proposed_gv_count}`);
    if (guard.missing_parent_count !== 0) findings.push(`missing_parent_count:${guard.missing_parent_count}`);
    if (guard.target_already_has_gv_count !== 0) findings.push(`target_already_has_gv_count:${guard.target_already_has_gv_count}`);
    if (guard.target_domain_mismatch_count !== 0) findings.push(`target_domain_mismatch_count:${guard.target_domain_mismatch_count}`);
    if (guard.target_modifier_mismatch_count !== 0) findings.push(`target_modifier_mismatch_count:${guard.target_modifier_mismatch_count}`);
    if (guard.existing_gv_collision_count !== 0) findings.push(`existing_gv_collision_count:${guard.existing_gv_collision_count}`);
    if (guard.batch_duplicate_gv_count !== 0) findings.push(`batch_duplicate_gv_count:${guard.batch_duplicate_gv_count}`);
    if (findings.length) throw new Error(`preflight guard failed: ${findings.join(', ')}`);

    const updated = await client.query(
      `with target as (
         select *
         from jsonb_to_recordset($1::jsonb) as t(
           card_print_id uuid,
           printed_identity_modifier text,
           proposed_gv_id text
         )
       )
       update public.card_prints cp
       set gv_id = target.proposed_gv_id,
           updated_at = now()
       from target
       where cp.id = target.card_print_id
         and cp.gv_id is null
         and cp.identity_domain = $2
         and cp.printed_identity_modifier is not distinct from target.printed_identity_modifier
       returning cp.id::text as card_print_id, cp.gv_id`,
      [JSON.stringify(targets), TARGET_DOMAIN],
    );

    const proof = await client.query(
      `with target as (
         select *
         from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid, proposed_gv_id text)
       )
       select
         (select count(*)::int from target) as target_count,
         (select count(*)::int
          from target
          join public.card_prints cp on cp.id = target.card_print_id
          where cp.gv_id = target.proposed_gv_id) as matching_gv_count,
         (select count(*)::int
          from (
            select gv_id
            from public.card_prints
            where gv_id is not null
            group by gv_id
            having count(*) > 1
          ) dup) as duplicate_gv_id_groups`,
      [JSON.stringify(targets)],
    );

    if (updated.rowCount !== targets.length || proof.rows[0]?.matching_gv_count !== targets.length || proof.rows[0]?.duplicate_gv_id_groups !== 0) {
      throw new Error(`apply proof failed: ${JSON.stringify({ updated_rows: updated.rowCount, proof: proof.rows[0] })}`);
    }

    await client.query('commit');
    updateProof = {
      updated_rows: updated.rowCount,
      proof: proof.rows[0],
      committed: true,
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    update_proof: updateProof,
    after_snapshot: afterSnapshot,
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const source = await readJson(SOURCE_JSON);
  const dryRun = await readJson(DRY_RUN_JSON);
  const targets = buildTargets(source);
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_fingerprint: source.fingerprint_sha256,
    targets,
  }));

  const dryRunFindings = validateDryRun(dryRun, packageFingerprint);
  if (dryRunFindings.length) throw new Error(`dry-run validation failed: ${dryRunFindings.join(', ')}`);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const execution = await applyPackage(client, targets);
    const report = {
      version: 'ENRICH31B_MODIFIER_PARENT_GV_ID_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      apply_status: 'committed_and_verified',
      scope: {
        target_rows: targets.length,
        writes_performed: ['card_prints.gv_id'],
        migrations_created: false,
        child_writes_performed: false,
        identity_writes_performed: false,
        deletes_performed: false,
        global_apply: false,
      },
      targets,
      execution,
    };

    await writeJson(OUTPUT_JSON, report);
    const md = [
      '# ENRICH-31B Modifier Parent GV-ID Real Apply V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      '- Apply status: committed_and_verified',
      `- Rows updated: ${execution.update_proof.updated_rows}`,
      '- Writes: `card_prints.gv_id` only',
      '- Migrations created: false',
      '- Child writes performed: false',
      '- Identity writes performed: false',
      '- Deletes performed: false',
      '- Global apply: false',
      '',
      '## Proof',
      '',
      `- Dry-run proof: \`${EXPECTED_DRY_RUN_PROOF}\``,
      `- Before apply hash: \`${execution.before_snapshot.hash_sha256}\``,
      `- After apply hash: \`${execution.after_snapshot.hash_sha256}\``,
      `- Matching GV-ID count: ${execution.update_proof.proof.matching_gv_count}`,
      `- Duplicate GV-ID groups: ${execution.update_proof.proof.duplicate_gv_id_groups}`,
      '',
      `Fingerprint: \`${packageFingerprint}\``,
      '',
    ].join('\n');
    await writeText(OUTPUT_MD, md);

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      package_fingerprint_sha256: packageFingerprint,
      apply_status: report.apply_status,
      updated_rows: execution.update_proof.updated_rows,
      after_apply_hash: execution.after_snapshot.hash_sha256,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
