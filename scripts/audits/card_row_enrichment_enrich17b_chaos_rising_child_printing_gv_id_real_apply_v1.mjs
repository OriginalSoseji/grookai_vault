import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich17b_chaos_rising_child_printing_gv_id_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich17b_chaos_rising_child_printing_gv_id_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich17b_chaos_rising_child_printing_gv_id_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-17B-CHAOS-RISING-CHILD-PRINTING-GV-ID-BACKFILL';
const TARGET_SET_CODE = 'me04';
const TARGET_SET_NAME = 'Chaos Rising';
const EXPECTED_FINGERPRINT = '942f94c9c3ca8e7c5c4169339aa36b8f4957c382cf63ba2d166b3a41ab96deba';
const EXPECTED_DRY_RUN_PROOF = 'cef570572f3dec9b1ee3745f2b04fd835a234d5f41616834894f1fe8928e6001';
const EXPECTED_TARGET_ROWS = 247;
const APPROVAL_TEXT = 'Approve real ENRICH-17B-CHAOS-RISING-CHILD-PRINTING-GV-ID-BACKFILL apply only. Fingerprint: 942f94c9c3ca8e7c5c4169339aa36b8f4957c382cf63ba2d166b3a41ab96deba. Scope: 247 Chaos Rising child card_printing printing_gv_id updates using governed finish suffixes normal=STD, holo=HOLO, reverse=RH. Dry-run proof: cef570572f3dec9b1ee3745f2b04fd835a234d5f41616834894f1fe8928e6001 == cef570572f3dec9b1ee3745f2b04fd835a234d5f41616834894f1fe8928e6001. No parent writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.';
const FINISH_GV_SUFFIX = Object.freeze({
  normal: 'STD',
  holo: 'HOLO',
  reverse: 'RH',
});

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

async function loadTargets(client) {
  const result = await client.query(
    `select
       cpr.id::text as card_printing_id,
       cpr.card_print_id::text as card_print_id,
       cp.set_code,
       s.name as set_name,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cp.gv_id as parent_gv_id,
       cpr.finish_key,
       cpr.printing_gv_id
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     join public.sets s on s.id = cp.set_id
     where cp.set_code = $1
       and s.name = $2
       and s.identity_domain_default = 'pokemon_eng_standard'
       and cpr.printing_gv_id is null
     order by cp.number_plain nulls last, cp.number nulls last, cp.name nulls last, cpr.finish_key, cpr.id`,
    [TARGET_SET_CODE, TARGET_SET_NAME],
  );

  return result.rows.map((row) => {
    const suffix = FINISH_GV_SUFFIX[row.finish_key] ?? null;
    return {
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      set_name: row.set_name,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      parent_gv_id: row.parent_gv_id,
      finish_key: row.finish_key,
      suffix,
      proposed_printing_gv_id: suffix && row.parent_gv_id ? `${row.parent_gv_id}-${suffix}` : null,
    };
  });
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_printing_id uuid)
     )
     select
       cpr.id::text as card_printing_id,
       cpr.card_print_id::text as card_print_id,
       cp.set_code,
       s.name as set_name,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cp.gv_id as parent_gv_id,
       cpr.finish_key,
       cpr.printing_gv_id
     from target
     join public.card_printings cpr on cpr.id = target.card_printing_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     join public.sets s on s.id = cp.set_id
     order by cp.number_plain nulls last, cp.number nulls last, cp.name nulls last, cpr.finish_key, cpr.id`,
    [JSON.stringify(targets.map((row) => ({ card_printing_id: row.card_printing_id })))],
  );

  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      target_rows: targets.length,
      captured_rows: result.rows.length,
      rows_with_printing_gv_id: result.rows.filter((row) => row.printing_gv_id).length,
      rows_without_printing_gv_id: result.rows.filter((row) => !row.printing_gv_id).length,
    },
  };
}

async function validateScope(client, targets) {
  const validation = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_printing_id uuid,
         card_print_id uuid,
         set_code text,
         set_name text,
         number text,
         number_plain text,
         card_name text,
         parent_gv_id text,
         finish_key text,
         suffix text,
         proposed_printing_gv_id text
       )
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_printing_id)::int from target) as distinct_target_count,
       (select count(distinct proposed_printing_gv_id)::int from target) as distinct_proposed_printing_gv_count,
       (select count(*)::int from target where proposed_printing_gv_id is null or btrim(proposed_printing_gv_id) = '') as missing_proposed_printing_gv_count,
       (select count(*)::int from target where parent_gv_id is null or btrim(parent_gv_id) = '') as missing_parent_gv_count,
       (select count(*)::int from target where finish_key not in ('normal', 'holo', 'reverse')) as unsupported_finish_count,
       (select count(*)::int from target where set_code <> $2 or set_name <> $3) as non_target_set_count,
       (select count(*)::int from target left join public.card_printings cpr on cpr.id = target.card_printing_id where cpr.id is null) as missing_child_count,
       (select count(*)::int
        from target
        join public.card_printings cpr on cpr.id = target.card_printing_id
        join public.card_prints cp on cp.id = cpr.card_print_id
        join public.sets s on s.id = cp.set_id
        where cp.set_code <> $2
           or s.name <> $3
           or s.identity_domain_default is distinct from 'pokemon_eng_standard'
           or cp.gv_id is null
           or target.parent_gv_id is distinct from cp.gv_id
           or target.finish_key is distinct from cpr.finish_key) as out_of_scope_child_count,
       (select count(*)::int from target join public.card_printings cpr on cpr.id = target.card_printing_id where cpr.printing_gv_id is not null) as target_already_has_printing_gv_count,
       (select count(*)::int from target join public.card_printings cpr on cpr.printing_gv_id = target.proposed_printing_gv_id and cpr.id <> target.card_printing_id) as existing_printing_gv_collision_count,
       (select count(*)::int from (
          select proposed_printing_gv_id
          from target
          group by proposed_printing_gv_id
          having count(*) > 1
        ) dup) as batch_duplicate_printing_gv_count`,
    [JSON.stringify(targets), TARGET_SET_CODE, TARGET_SET_NAME],
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
      preflight.distinct_proposed_printing_gv_count !== targets.length ||
      preflight.missing_proposed_printing_gv_count !== 0 ||
      preflight.missing_parent_gv_count !== 0 ||
      preflight.unsupported_finish_count !== 0 ||
      preflight.non_target_set_count !== 0 ||
      preflight.missing_child_count !== 0 ||
      preflight.out_of_scope_child_count !== 0 ||
      preflight.target_already_has_printing_gv_count !== 0 ||
      preflight.existing_printing_gv_collision_count !== 0 ||
      preflight.batch_duplicate_printing_gv_count !== 0
    ) {
      throw new Error(`preflight guard failed: ${JSON.stringify(preflight)}`);
    }

    await client.query(
      `create temporary table enrich17b_targets (
         card_printing_id uuid primary key,
         card_print_id uuid,
         set_code text,
         set_name text,
         number text,
         number_plain text,
         card_name text,
         parent_gv_id text,
         finish_key text,
         suffix text,
         proposed_printing_gv_id text not null
       ) on commit drop`,
    );
    await client.query(
      `insert into enrich17b_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_printing_id uuid,
         card_print_id uuid,
         set_code text,
         set_name text,
         number text,
         number_plain text,
         card_name text,
         parent_gv_id text,
         finish_key text,
         suffix text,
         proposed_printing_gv_id text
       )`,
      [JSON.stringify(targets)],
    );

    const updated = await client.query(
      `update public.card_printings cpr
       set printing_gv_id = target.proposed_printing_gv_id
       from enrich17b_targets target
       where cpr.id = target.card_printing_id
       returning cpr.id::text as card_printing_id, cpr.printing_gv_id`,
    );

    const proof = await client.query(
      `select
         (select count(*)::int from enrich17b_targets) as target_count,
         (select count(*)::int
          from enrich17b_targets target
          join public.card_printings cpr on cpr.id = target.card_printing_id
          where cpr.printing_gv_id = target.proposed_printing_gv_id) as matching_printing_gv_count,
         (select count(*)::int from (
            select printing_gv_id
            from public.card_printings
            where printing_gv_id is not null
            group by printing_gv_id
            having count(*) > 1
            limit 1
          ) dup) as duplicate_printing_gv_id_exists`,
    );

    updateProof = {
      updated_rows: updated.rowCount,
      proof: proof.rows[0],
    };

    if (updateProof.updated_rows !== targets.length) throw new Error('updated_row_count_mismatch');
    if (updateProof.proof.matching_printing_gv_count !== targets.length) throw new Error('matching_printing_gv_count_mismatch');
    if (updateProof.proof.duplicate_printing_gv_id_exists !== 0) throw new Error('duplicate_printing_gv_id_after_update');

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

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const dryRun = await readJson(DRY_RUN_JSON);
    const targets = await loadTargets(client);
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      target_set_code: TARGET_SET_CODE,
      target_set_name: TARGET_SET_NAME,
      suffix_rules_used: FINISH_GV_SUFFIX,
      targets,
    }));
    const dryRunFindings = validateDryRun(dryRun, packageFingerprint);
    const approvalFindings = dryRun.recommended_approval_text === APPROVAL_TEXT ? [] : ['approval_text_mismatch'];
    const stopFindings = [...dryRunFindings, ...approvalFindings];

    let applyResult = null;
    if (stopFindings.length === 0) {
      applyResult = await applyPackage(client, targets);
    }

    const report = {
      version: 'ENRICH17B_CHAOS_RISING_CHILD_PRINTING_GV_ID_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      expected_fingerprint_sha256: EXPECTED_FINGERPRINT,
      expected_dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
      approval_text: APPROVAL_TEXT,
      scope: {
        target_set_code: TARGET_SET_CODE,
        target_set_name: TARGET_SET_NAME,
        target_rows: targets.length,
        writes_performed: stopFindings.length === 0 ? ['card_printings.printing_gv_id'] : [],
        forbidden: ['parent writes', 'identity writes', 'external mapping writes', 'species writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
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
      '# ENRICH-17B Chaos Rising Child Printing GV-ID Real Apply V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target rows: ${targets.length}`,
      `- Updated rows: ${applyResult?.update_proof?.updated_rows ?? 0}`,
      `- Matching printing GV rows: ${applyResult?.update_proof?.proof?.matching_printing_gv_count ?? 0}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      '',
      '## Safety',
      '',
      '- Parent writes: false',
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
