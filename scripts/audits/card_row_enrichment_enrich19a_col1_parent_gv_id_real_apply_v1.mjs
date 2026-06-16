import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const SOURCE_JSON = path.join(OUTPUT_DIR, 'parent_gv_id_backfill_candidates_v1.json');
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich19a_col1_parent_gv_id_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich19a_col1_parent_gv_id_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich19a_col1_parent_gv_id_real_apply_v1.md');
const PACKAGE_ID = 'ENRICH-19A-COL1-PARENT-GV-ID-BACKFILL';
const TARGET_SET_CODE = 'col1';
const EXPECTED_FINGERPRINT = 'f3cb5ee87c0814783b070401b5bc179b11e5e6a4be56269fc7d700aaa36948aa';
const EXPECTED_DRY_RUN_PROOF = 'aa1a903e3ae1c6d965fc363bc89de7c9bad676985b07cca81566ebdb6197c00c';
const EXPECTED_TARGET_ROWS = 3;
const APPROVAL_TEXT = 'Approve real ENRICH-19A-COL1-PARENT-GV-ID-BACKFILL apply only. Fingerprint: f3cb5ee87c0814783b070401b5bc179b11e5e6a4be56269fc7d700aaa36948aa. Scope: 3 Call of Legends parent card_print gv_id updates using governed COL namespace. Dry-run proof: aa1a903e3ae1c6d965fc363bc89de7c9bad676985b07cca81566ebdb6197c00c == aa1a903e3ae1c6d965fc363bc89de7c9bad676985b07cca81566ebdb6197c00c. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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
    .filter((row) => row.classification === 'ready_for_parent_gv_id_backfill_dry_run')
    .filter((row) => row.set_code === TARGET_SET_CODE)
    .map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      set_name: row.set_name,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      proposed_gv_id: row.proposed_gv_id,
    }));
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
       cp.gv_id
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     order by cp.number_plain nulls last, cp.number nulls last, cp.name nulls last, cp.id`,
    [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id })))],
  );

  return {
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
  const validation = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_code text,
         set_name text,
         number text,
         number_plain text,
         card_name text,
         proposed_gv_id text
       )
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_print_id)::int from target) as distinct_target_count,
       (select count(distinct proposed_gv_id)::int from target) as distinct_proposed_gv_count,
       (select count(*)::int from target where set_code <> $2) as non_target_set_count,
       (select count(*)::int from target where proposed_gv_id is null or btrim(proposed_gv_id) = '') as missing_proposed_gv_count,
       (select count(*)::int from target where proposed_gv_id not like 'GV-PK-COL-%') as non_col_namespace_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int
        from target
        join public.card_prints cp on cp.id = target.card_print_id
        join public.sets s on s.id = cp.set_id
        where cp.set_code <> $2 or s.identity_domain_default not like 'pokemon_eng%') as out_of_scope_parent_count,
       (select count(*)::int from target join public.card_prints cp on cp.id = target.card_print_id where cp.gv_id is not null) as target_already_has_gv_count,
       (select count(*)::int from target join public.card_prints cp on cp.gv_id = target.proposed_gv_id and cp.id <> target.card_print_id) as existing_gv_collision_count,
       (select count(*)::int from (
          select proposed_gv_id
          from target
          group by proposed_gv_id
          having count(*) > 1
        ) dup) as batch_duplicate_gv_count`,
    [JSON.stringify(targets), TARGET_SET_CODE],
  );

  return {
    ...validation.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targets)),
  };
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

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const preflight = await validateScope(client, targets);
    if (
      preflight.target_count !== targets.length ||
      preflight.distinct_target_count !== targets.length ||
      preflight.distinct_proposed_gv_count !== targets.length ||
      preflight.non_target_set_count !== 0 ||
      preflight.missing_proposed_gv_count !== 0 ||
      preflight.non_col_namespace_count !== 0 ||
      preflight.missing_parent_count !== 0 ||
      preflight.out_of_scope_parent_count !== 0 ||
      preflight.target_already_has_gv_count !== 0 ||
      preflight.existing_gv_collision_count !== 0 ||
      preflight.batch_duplicate_gv_count !== 0
    ) {
      throw new Error(`preflight guard failed: ${JSON.stringify(preflight)}`);
    }

    await client.query(
      `create temporary table enrich19a_targets (
         card_print_id uuid primary key,
         set_code text,
         set_name text,
         number text,
         number_plain text,
         card_name text,
         proposed_gv_id text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into enrich19a_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_code text,
         set_name text,
         number text,
         number_plain text,
         card_name text,
         proposed_gv_id text
       )`,
      [JSON.stringify(targets)],
    );

    const updated = await client.query(
      `update public.card_prints cp
       set gv_id = target.proposed_gv_id,
           updated_at = now()
       from enrich19a_targets target
       where cp.id = target.card_print_id
       returning cp.id::text as card_print_id, cp.gv_id`,
    );

    const proof = await client.query(
      `select
         (select count(*)::int from enrich19a_targets) as target_count,
         (select count(*)::int
          from enrich19a_targets target
          join public.card_prints cp on cp.id = target.card_print_id
          where cp.gv_id = target.proposed_gv_id) as matching_gv_count,
         (select count(*)::int from (
            select gv_id
            from public.card_prints
            where gv_id is not null
            group by gv_id
            having count(*) > 1
            limit 1
          ) dup) as duplicate_gv_id_exists`,
    );

    updateProof = {
      updated_rows: updated.rowCount,
      proof: proof.rows[0],
    };

    if (updateProof.updated_rows !== targets.length) throw new Error('updated_row_count_mismatch');
    if (updateProof.proof.matching_gv_count !== targets.length) throw new Error('matching_gv_count_mismatch');
    if (updateProof.proof.duplicate_gv_id_exists !== 0) throw new Error('duplicate_gv_id_after_update');

    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
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
    source_fingerprint_basis: source.fingerprint_basis,
    targets,
  }));

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const dryRunFindings = validateDryRun(dryRun, packageFingerprint);
    const approvalFindings = dryRun.recommended_approval_text === APPROVAL_TEXT ? [] : ['approval_text_mismatch'];
    const stopFindings = [...dryRunFindings, ...approvalFindings];
    let applyResult = null;

    if (stopFindings.length === 0) {
      applyResult = await applyPackage(client, targets);
    }

    const report = {
      version: 'ENRICH19A_COL1_PARENT_GV_ID_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      expected_fingerprint_sha256: EXPECTED_FINGERPRINT,
      expected_dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
      approval_text: APPROVAL_TEXT,
      scope: {
        target_rows: targets.length,
        writes_performed: stopFindings.length === 0 ? ['card_prints.gv_id'] : [],
        forbidden: ['child writes', 'identity writes', 'external mapping writes', 'species writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
        migrations_created: false,
      },
      dry_run_validation_findings: dryRunFindings,
      approval_validation_findings: approvalFindings,
      apply_result: applyResult,
      stop_findings: stopFindings,
      pass: stopFindings.length === 0 && applyResult?.update_proof?.updated_rows === EXPECTED_TARGET_ROWS,
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, [
      '# ENRICH-19A COL1 Parent GV-ID Real Apply V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target rows: ${targets.length}`,
      `- Updated rows: ${applyResult?.update_proof?.updated_rows ?? 0}`,
      `- Matching GV rows: ${applyResult?.update_proof?.proof?.matching_gv_count ?? 0}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      '',
      '## Safety',
      '',
      '- Child writes: false',
      '- Identity writes: false',
      '- External mapping/species writes: false',
      '- Deletes/merges: false',
      '- Migrations created: false',
      '- Image writes: false',
      '',
      '## Stop Findings',
      '',
      report.stop_findings.length ? report.stop_findings.map((finding) => `- ${finding}`).join('\n') : '_None._',
      '',
    ].join('\n'));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: packageFingerprint,
      updated_rows: applyResult?.update_proof?.updated_rows ?? 0,
      stop_findings: stopFindings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
