import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const SOURCE_JSON = path.join(OUTPUT_DIR, 'child_printing_gv_id_backfill_candidates_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich19b_col1_child_printing_gv_id_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich19b_col1_child_printing_gv_id_guarded_dry_run_v1.md');
const PACKAGE_ID = 'ENRICH-19B-COL1-CHILD-PRINTING-GV-ID-BACKFILL';
const TARGET_SET_CODE = 'col1';
const EXPECTED_TARGET_ROWS = 6;
const FINISH_GV_SUFFIX = Object.freeze({ holo: 'HOLO', reverse: 'RH' });

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

function buildTargets(source) {
  return (source.rows ?? [])
    .filter((row) => row.classification === 'ready_for_child_printing_gv_id_backfill_dry_run')
    .filter((row) => row.set_code === TARGET_SET_CODE)
    .map((row) => ({
      card_printing_id: row.card_printing_id,
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      set_name: row.set_name,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      parent_gv_id: row.parent_gv_id,
      finish_key: row.finish_key,
      suffix: row.suffix,
      proposed_printing_gv_id: row.proposed_printing_gv_id,
    }));
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
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cp.gv_id as parent_gv_id,
       cpr.finish_key,
       cpr.printing_gv_id
     from target
     join public.card_printings cpr on cpr.id = target.card_printing_id
     join public.card_prints cp on cp.id = cpr.card_print_id
     order by cp.number_plain nulls last, cp.number nulls last, cp.name nulls last, cpr.finish_key, cpr.id`,
    [JSON.stringify(targets.map((row) => ({ card_printing_id: row.card_printing_id })))],
  );

  return {
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
       (select count(*)::int from target where set_code <> $2) as non_target_set_count,
       (select count(*)::int from target where proposed_printing_gv_id is null or btrim(proposed_printing_gv_id) = '') as missing_proposed_printing_gv_count,
       (select count(*)::int from target where parent_gv_id is null or btrim(parent_gv_id) = '') as missing_parent_gv_count,
       (select count(*)::int from target where finish_key not in ('holo', 'reverse')) as unsupported_finish_count,
       (select count(*)::int from target where suffix is distinct from case finish_key when 'holo' then 'HOLO' when 'reverse' then 'RH' end) as suffix_mismatch_count,
       (select count(*)::int from target left join public.card_printings cpr on cpr.id = target.card_printing_id where cpr.id is null) as missing_child_count,
       (select count(*)::int
        from target
        join public.card_printings cpr on cpr.id = target.card_printing_id
        join public.card_prints cp on cp.id = cpr.card_print_id
        join public.sets s on s.id = cp.set_id
        where cp.set_code <> $2
           or s.identity_domain_default not like 'pokemon_eng%'
           or cp.gv_id is null
           or target.parent_gv_id is distinct from cp.gv_id
           or target.finish_key is distinct from cpr.finish_key
           or target.proposed_printing_gv_id is distinct from cp.gv_id || '-' || target.suffix) as out_of_scope_child_count,
       (select count(*)::int from target join public.card_printings cpr on cpr.id = target.card_printing_id where cpr.printing_gv_id is not null) as target_already_has_printing_gv_count,
       (select count(*)::int from target join public.card_printings cpr on cpr.printing_gv_id = target.proposed_printing_gv_id and cpr.id <> target.card_printing_id) as existing_printing_gv_collision_count,
       (select count(*)::int from (
          select proposed_printing_gv_id
          from target
          group by proposed_printing_gv_id
          having count(*) > 1
        ) dup) as batch_duplicate_printing_gv_count`,
    [JSON.stringify(targets), TARGET_SET_CODE],
  );

  return {
    ...validation.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targets)),
  };
}

async function runRollbackDryRun(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let insideProof = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");
    await client.query(
      `create temporary table enrich19b_targets (
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
      `insert into enrich19b_targets
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

    const guard = await validateScope(client, targets);
    if (
      guard.target_count !== targets.length ||
      guard.distinct_target_count !== targets.length ||
      guard.distinct_proposed_printing_gv_count !== targets.length ||
      guard.non_target_set_count !== 0 ||
      guard.missing_proposed_printing_gv_count !== 0 ||
      guard.missing_parent_gv_count !== 0 ||
      guard.unsupported_finish_count !== 0 ||
      guard.suffix_mismatch_count !== 0 ||
      guard.missing_child_count !== 0 ||
      guard.out_of_scope_child_count !== 0 ||
      guard.target_already_has_printing_gv_count !== 0 ||
      guard.existing_printing_gv_collision_count !== 0 ||
      guard.batch_duplicate_printing_gv_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guard)}`);
    }

    const updated = await client.query(
      `update public.card_printings cpr
       set printing_gv_id = target.proposed_printing_gv_id
       from enrich19b_targets target
       where cpr.id = target.card_printing_id
       returning cpr.id::text as card_printing_id, cpr.printing_gv_id`,
    );

    const proof = await client.query(
      `select
         (select count(*)::int from enrich19b_targets) as target_count,
         (select count(*)::int
          from enrich19b_targets target
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

    insideProof = {
      updated_rows: updated.rowCount,
      proof: proof.rows[0],
    };
  } finally {
    await client.query('rollback');
  }

  const afterRollbackSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    inside_transaction_proof: insideProof,
    after_rollback_snapshot: afterRollbackSnapshot,
    dry_run_status: beforeSnapshot.hash_sha256 === afterRollbackSnapshot.hash_sha256
      ? 'completed_rolled_back_no_durable_change'
      : 'failed_rollback_hash_mismatch',
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');

  const source = await readJson(SOURCE_JSON);
  const targets = buildTargets(source);
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    source_fingerprint_basis: source.fingerprint_basis,
    suffix_rules_used: FINISH_GV_SUFFIX,
    targets,
  }));

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const preflight = await validateScope(client, targets);
    const execution = await runRollbackDryRun(client, targets);
    const stop_findings = [];

    if (targets.length !== EXPECTED_TARGET_ROWS) stop_findings.push(`target_count_drift:${targets.length}`);
    if (preflight.target_count !== targets.length) stop_findings.push('preflight_target_count_mismatch');
    if (preflight.distinct_target_count !== targets.length) stop_findings.push('duplicate_target_child_ids');
    if (preflight.distinct_proposed_printing_gv_count !== targets.length) stop_findings.push('duplicate_proposed_printing_gv_ids');
    if (preflight.non_target_set_count !== 0) stop_findings.push('non_target_set_rows');
    if (preflight.missing_proposed_printing_gv_count !== 0) stop_findings.push('missing_proposed_printing_gv_ids');
    if (preflight.missing_parent_gv_count !== 0) stop_findings.push('missing_parent_gv_ids');
    if (preflight.unsupported_finish_count !== 0) stop_findings.push('unsupported_finish_key');
    if (preflight.suffix_mismatch_count !== 0) stop_findings.push('suffix_mismatch');
    if (preflight.missing_child_count !== 0) stop_findings.push('missing_target_child_rows');
    if (preflight.out_of_scope_child_count !== 0) stop_findings.push('out_of_scope_child_rows');
    if (preflight.target_already_has_printing_gv_count !== 0) stop_findings.push('target_already_has_printing_gv_id');
    if (preflight.existing_printing_gv_collision_count !== 0) stop_findings.push('existing_printing_gv_id_collision');
    if (preflight.batch_duplicate_printing_gv_count !== 0) stop_findings.push('batch_duplicate_printing_gv_id');
    if (execution.dry_run_status !== 'completed_rolled_back_no_durable_change') stop_findings.push(execution.dry_run_status);
    if (execution.inside_transaction_proof?.updated_rows !== targets.length) stop_findings.push('updated_row_count_mismatch');
    if (execution.inside_transaction_proof?.proof?.matching_printing_gv_count !== targets.length) stop_findings.push('matching_printing_gv_count_mismatch');
    if (execution.inside_transaction_proof?.proof?.duplicate_printing_gv_id_exists !== 0) stop_findings.push('duplicate_printing_gv_id_after_update');

    const report = {
      version: 'ENRICH19B_COL1_CHILD_PRINTING_GV_ID_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      source_candidate_file: SOURCE_JSON,
      source_fingerprint_basis: source.fingerprint_basis,
      scope: {
        target_set_code: TARGET_SET_CODE,
        target_rows: targets.length,
        writes_simulated_then_rolled_back: ['card_printings.printing_gv_id'],
        forbidden: ['parent writes', 'identity writes', 'external mapping writes', 'species writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
        durable_db_writes_performed: false,
        migrations_created: false,
      },
      suffix_rules_used: FINISH_GV_SUFFIX,
      preflight,
      execution,
      by_finish: countBy(targets, (row) => row.finish_key),
      target_samples: targets,
      stop_findings,
      pass: stop_findings.length === 0,
      recommended_approval_text: stop_findings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} Call of Legends child card_printing printing_gv_id updates using governed finish suffixes holo=HOLO, reverse=RH. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No parent writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, [
      '# ENRICH-19B COL1 Child Printing GV-ID Guarded Dry Run V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target rows: ${targets.length}`,
      `- Updated inside transaction: ${execution.inside_transaction_proof?.updated_rows ?? 0}`,
      `- Dry-run status: ${execution.dry_run_status}`,
      `- Before hash: \`${execution.before_snapshot.hash_sha256}\``,
      `- After rollback hash: \`${execution.after_rollback_snapshot.hash_sha256}\``,
      `- Package fingerprint: \`${packageFingerprint}\``,
      '',
      '## By Finish',
      '',
      markdownTable(Object.entries(report.by_finish).map(([finish_key, rows]) => ({ finish_key, rows })), [
        { label: 'finish_key', value: (row) => row.finish_key },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Targets',
      '',
      markdownTable(targets, [
        { label: 'number', value: (row) => row.number },
        { label: 'card_name', value: (row) => row.card_name },
        { label: 'finish_key', value: (row) => row.finish_key },
        { label: 'proposed_printing_gv_id', value: (row) => row.proposed_printing_gv_id },
      ]),
      '',
      '## Safety',
      '',
      '- Durable DB writes performed: false',
      '- Migrations created: false',
      '- Parent writes: false',
      '- Identity writes: false',
      '- External mapping/species writes: false',
      '- Deletes/merges: false',
      '- Image writes: false',
      '',
      '## Stop Findings',
      '',
      report.stop_findings.length ? report.stop_findings.map((finding) => `- ${finding}`).join('\n') : '_None._',
      '',
      '## Approval Text',
      '',
      report.recommended_approval_text ? `\`${report.recommended_approval_text}\`` : '_Not available; dry-run did not pass._',
      '',
    ].join('\n'));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: packageFingerprint,
      dry_run_proof: `${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}`,
      recommended_approval_text: report.recommended_approval_text,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
