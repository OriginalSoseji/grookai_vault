import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const INPUT_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_no_child_parent_adjudication_v1.json');
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich06c2_source_mapped_active_finish_child_insert_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich06c2_source_mapped_active_finish_child_insert_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich06c2_source_mapped_active_finish_child_insert_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-06C2-SOURCE-MAPPED-ACTIVE-FINISH-CHILD-PRINTING-INSERT';
const TARGET_CLASSIFICATION = 'source_mapped_child_insert_candidate_needs_finish_selection';
const EXPECTED_FINGERPRINT = '6e32357534841a49f65bfd3f10e23f04cd982a6795b5c2e47b2fd50829bec8e7';
const EXPECTED_DRY_RUN_PROOF = '26d63932fb3c14d0fb4aece6970ef3462783891353378a9584a96bf06a980d43';
const EXPECTED_TARGET_PRINTINGS = 13;
const EXPECTED_TARGET_PARENTS = 10;
const APPROVAL_TEXT = 'Approve real ENRICH-06C2-SOURCE-MAPPED-ACTIVE-FINISH-CHILD-PRINTING-INSERT apply only. Fingerprint: 6e32357534841a49f65bfd3f10e23f04cd982a6795b5c2e47b2fd50829bec8e7. Scope: 13 child card_printing inserts across 10 source-mapped childless parents using Master Index finish keys. Finishes: holo=7, normal=3, reverse=3. Dry-run proof: 26d63932fb3c14d0fb4aece6970ef3462783891353378a9584a96bf06a980d43 == 26d63932fb3c14d0fb4aece6970ef3462783891353378a9584a96bf06a980d43. No parent writes. No identity writes. No mapping writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
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

function buildTargets(adjudication) {
  const rows = (adjudication.rows ?? [])
    .filter((row) => row.adjudication_classification === TARGET_CLASSIFICATION);
  return rows.flatMap((row) => (row.master_finish_keys ?? [])
    .filter((finishKey) => finishKey !== 'stamped')
    .map((finishKey) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      finish_key: finishKey,
      provenance_source: 'verified_master_index_v1',
      provenance_ref: `${row.set_code}|${row.number}|${row.card_name}|${finishKey}`,
    })));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select distinct card_print_id
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
     )
     select
       'parent' as row_type,
       cp.id::text as row_id,
       cp.id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       null::text as finish_key
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     union all
     select
       'child' as row_type,
       cpr.id::text as row_id,
       cpr.card_print_id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cpr.finish_key
     from target
     join public.card_printings cpr on cpr.card_print_id = target.card_print_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     order by row_type, set_code, number_plain nulls last, number, card_name, finish_key nulls first`,
    [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      parent_rows: result.rows.filter((row) => row.row_type === 'parent').length,
      child_rows: result.rows.filter((row) => row.row_type === 'child').length,
      total_rows: result.rows.length,
    },
  };
}

async function validateScope(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         finish_key text
       )
     ),
     target_parent as (
       select distinct card_print_id from target
     )
     select
       (select count(*)::int from target) as target_printing_count,
       (select count(distinct card_print_id)::int from target) as target_parent_count,
       (select count(distinct card_print_id::text || '|' || finish_key)::int from target) as distinct_target_printing_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int from target left join public.finish_keys fk on fk.key = target.finish_key and fk.is_active = true where fk.key is null) as inactive_finish_key_count,
       (select count(*)::int from target join public.card_printings cpr on cpr.card_print_id = target.card_print_id and cpr.finish_key = target.finish_key) as existing_child_finish_count,
       (select count(*)::int from target_parent join public.card_printings cpr on cpr.card_print_id = target_parent.card_print_id) as existing_child_any_count,
       (select count(*)::int from target_parent left join public.external_mappings em on em.card_print_id = target_parent.card_print_id and em.active = true where em.id is null) as missing_active_mapping_parent_count`,
    [JSON.stringify(targets.map((row) => ({
      card_print_id: row.card_print_id,
      finish_key: row.finish_key,
    })))],
  );
  return {
    ...result.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targets)),
  };
}

function guardPassed(guard, targetPrintingCount, targetParentCount) {
  return guard.target_printing_count === targetPrintingCount
    && guard.target_parent_count === targetParentCount
    && guard.distinct_target_printing_count === targetPrintingCount
    && guard.missing_parent_count === 0
    && guard.inactive_finish_key_count === 0
    && guard.existing_child_finish_count === 0
    && guard.existing_child_any_count === 0
    && guard.missing_active_mapping_parent_count === 0;
}

function validateDryRun(dryRun, packageFingerprint) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.package_fingerprint_sha256 !== packageFingerprint) findings.push('package_fingerprint_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('expected_fingerprint_mismatch');
  if (dryRun.scope?.target_child_printing_inserts !== EXPECTED_TARGET_PRINTINGS) findings.push('target_printing_count_mismatch');
  if (dryRun.scope?.target_parent_rows !== EXPECTED_TARGET_PARENTS) findings.push('target_parent_count_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_after_hash_mismatch');
  if (dryRun.execution?.dry_run_status !== 'completed_rolled_back_no_durable_change') findings.push('dry_run_status_mismatch');
  if (dryRun.recommended_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (dryRun.execution?.inside_transaction_proof?.inserted_child_rows !== EXPECTED_TARGET_PRINTINGS) findings.push('dry_run_insert_count_mismatch');
  return findings;
}

async function applyPackage(client, targets) {
  const targetParentCount = new Set(targets.map((row) => row.card_print_id)).size;
  const beforeSnapshot = await captureSnapshot(client, targets);
  let insertProof = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const guard = await validateScope(client, targets);
    if (!guardPassed(guard, targets.length, targetParentCount)) {
      throw new Error(`preflight guard failed: ${JSON.stringify(guard)}`);
    }

    await client.query(
      `create temporary table enrich06c2_targets (
         card_print_id uuid not null,
         finish_key text not null,
         provenance_source text not null,
         provenance_ref text not null,
         primary key (card_print_id, finish_key)
       ) on commit drop`,
    );
    await client.query(
      `insert into enrich06c2_targets
       select card_print_id, finish_key, provenance_source, provenance_ref
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         finish_key text,
         provenance_source text,
         provenance_ref text
       )`,
      [JSON.stringify(targets.map((row) => ({
        card_print_id: row.card_print_id,
        finish_key: row.finish_key,
        provenance_source: row.provenance_source,
        provenance_ref: row.provenance_ref,
      })))],
    );

    const inserted = await client.query(
      `insert into public.card_printings (card_print_id, finish_key, provenance_source, provenance_ref, created_by)
       select card_print_id, finish_key, provenance_source, provenance_ref, $1::text
       from enrich06c2_targets
       returning id::text, card_print_id::text, finish_key`,
      [PACKAGE_ID],
    );

    const proof = await client.query(
      `select
         (select count(*)::int from enrich06c2_targets) as target_printing_count,
         (select count(distinct card_print_id)::int from enrich06c2_targets) as target_parent_count,
         (select count(*)::int
          from enrich06c2_targets target
          join public.card_printings cpr
            on cpr.card_print_id = target.card_print_id
           and cpr.finish_key = target.finish_key) as matching_child_count`,
    );

    insertProof = {
      inserted_child_rows: inserted.rowCount,
      proof: proof.rows[0],
      inserted_samples: inserted.rows.slice(0, 25),
    };

    if (insertProof.inserted_child_rows !== targets.length) throw new Error('inserted_child_row_count_mismatch');
    if (insertProof.proof.matching_child_count !== targets.length) throw new Error('matching_child_count_mismatch');
    if (insertProof.proof.target_parent_count !== targetParentCount) throw new Error('target_parent_count_mismatch');

    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    insert_proof: insertProof,
    after_snapshot: afterSnapshot,
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const adjudication = await readJson(INPUT_JSON);
  const dryRun = await readJson(DRY_RUN_JSON);
  const targets = buildTargets(adjudication);
  const targetParentCount = new Set(targets.map((row) => row.card_print_id)).size;
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    target_classification: TARGET_CLASSIFICATION,
    targets,
  }));

  const dryRunFindings = validateDryRun(dryRun, packageFingerprint);
  if (dryRunFindings.length > 0) {
    throw new Error(`DRY_RUN_VALIDATION_FAILED:${dryRunFindings.join(',')}`);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const execution = await applyPackage(client, targets);
    const stopFindings = [];

    if (targets.length !== EXPECTED_TARGET_PRINTINGS) stopFindings.push(`target_printing_count_drift:${targets.length}`);
    if (targetParentCount !== EXPECTED_TARGET_PARENTS) stopFindings.push(`target_parent_count_drift:${targetParentCount}`);
    if (execution.before_snapshot.counts.child_rows !== 0) stopFindings.push('before_child_rows_not_zero');
    if (execution.insert_proof.inserted_child_rows !== targets.length) stopFindings.push('inserted_child_rows_mismatch');
    if (execution.insert_proof.proof.matching_child_count !== targets.length) stopFindings.push('matching_child_count_mismatch');
    if (execution.after_snapshot.counts.child_rows !== targets.length) stopFindings.push('after_child_rows_mismatch');

    const report = {
      version: 'ENRICH06C2_SOURCE_MAPPED_ACTIVE_FINISH_CHILD_INSERT_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      approved_text: APPROVAL_TEXT,
      package_fingerprint_sha256: packageFingerprint,
      dry_run_proof: `${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}`,
      source_file: INPUT_JSON,
      dry_run_file: DRY_RUN_JSON,
      scope: {
        target_parent_rows: targetParentCount,
        target_child_printing_inserts: targets.length,
        writes_performed: ['card_printings inserts'],
        durable_db_writes_performed: true,
        parent_writes: false,
        identity_writes: false,
        mapping_writes: false,
        deletes: false,
        merges: false,
        migrations_created: false,
        image_writes: false,
        global_apply: false,
      },
      by_finish: countBy(targets, (row) => row.finish_key),
      by_set_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.set_code)).slice(0, 25)),
      execution,
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-06C2 Source-Mapped Active Finish Child Insert Real Apply V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target parent rows: ${targetParentCount}`,
      `- Inserted child rows: ${execution.insert_proof.inserted_child_rows}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      `- Dry-run proof: \`${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}\``,
      `- Before child rows in scope: ${execution.before_snapshot.counts.child_rows}`,
      `- After child rows in scope: ${execution.after_snapshot.counts.child_rows}`,
      '',
      '## Safety',
      '',
      '- Durable DB writes performed: true',
      '- Writes performed: `card_printings` inserts only',
      '- Parent writes: false',
      '- Identity writes: false',
      '- Mapping writes: false',
      '- Deletes/merges: false',
      '- Migrations created: false',
      '- Image writes: false',
      '- Global apply: false',
      '',
      '## By Finish',
      '',
      markdownTable(Object.entries(report.by_finish).map(([finish, rows]) => ({ finish, rows })), [
        { label: 'finish', value: (row) => row.finish },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Stop Findings',
      '',
      report.stop_findings.length ? report.stop_findings.map((finding) => `- ${finding}`).join('\n') : '_None._',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: packageFingerprint,
      inserted_child_rows: execution.insert_proof.inserted_child_rows,
      after_child_rows: execution.after_snapshot.counts.child_rows,
      stop_findings: stopFindings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
