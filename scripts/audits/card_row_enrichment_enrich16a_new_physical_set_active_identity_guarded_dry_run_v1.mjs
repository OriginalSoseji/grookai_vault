import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich16a_new_physical_set_active_identity_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich16a_new_physical_set_active_identity_guarded_dry_run_v1.md');
const PACKAGE_ID = 'ENRICH-16A-NEW-PHYSICAL-SET-ACTIVE-IDENTITY-BACKFILL';
const TARGET_SET_CODES = ['2023sv', '2024sv', 'me03', 'me04', 'mee', 'mfb'];
const EXPECTED_TARGET_ROWS = 320;

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
    `with projected as (
       select
         cp.id::text as card_print_id,
         s.code as set_code,
         cp.number,
         cp.number_plain,
         cp.name as card_name,
         public.card_print_identity_backfill_projection_v1(
           s.source,
           cp.set_code,
           s.code,
           cp.number,
           cp.number_plain,
           cp.name,
           cp.variant_key,
           coalesce(cp.printed_total, s.printed_total),
           coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
         ) as projected
       from public.card_prints cp
       join public.sets s on s.id = cp.set_id
       where s.code = any($1::text[])
         and s.identity_domain_default = 'pokemon_eng_standard'
         and not exists (
           select 1
           from public.card_print_identity cpi
           where cpi.card_print_id = cp.id
             and cpi.is_active = true
         )
     )
     select *
     from projected
     order by set_code, number_plain nulls last, number nulls last, card_name nulls last, card_print_id`,
    [TARGET_SET_CODES],
  );
  return result.rows;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
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
       null::text as identity_domain,
       null::text as identity_key_version,
       null::text as identity_key_hash
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     union all
     select
       'active_identity' as row_type,
       cpi.id::text as row_id,
       cpi.card_print_id::text as card_print_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cpi.identity_domain,
       cpi.identity_key_version,
       cpi.identity_key_hash
     from target
     join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id and cpi.is_active = true
     join public.card_prints cp on cp.id = cpi.card_print_id
     order by row_type, set_code nulls last, number_plain nulls last, number nulls last, card_name nulls last, row_id`,
    [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id })))],
  );

  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      target_rows: targets.length,
      parent_rows: result.rows.filter((row) => row.row_type === 'parent').length,
      active_identity_rows: result.rows.filter((row) => row.row_type === 'active_identity').length,
      total_rows: result.rows.length,
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
         number text,
         number_plain text,
         card_name text,
         projected jsonb
       )
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_print_id)::int from target) as distinct_target_count,
       (select count(distinct projected->>'identity_key_hash')::int from target) as distinct_identity_hash_count,
       (select count(*)::int from target where projected->>'status' <> 'ready') as projection_not_ready_count,
       (select count(*)::int from target where nullif(projected->>'identity_key_hash', '') is null) as missing_identity_hash_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int from target join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id and cpi.is_active = true) as target_active_identity_collision_count,
       (select count(*)::int
        from target
        join public.card_print_identity cpi
          on cpi.is_active = true
         and cpi.identity_domain = target.projected->>'identity_domain'
         and cpi.identity_key_version = target.projected->>'identity_key_version'
         and cpi.identity_key_hash = target.projected->>'identity_key_hash') as existing_identity_hash_collision_count,
       (select count(*)::int from (
          select projected->>'identity_key_hash' as identity_key_hash
          from target
          group by projected->>'identity_key_hash'
          having count(*) > 1
        ) dup) as batch_duplicate_identity_hash_count,
       (select count(*)::int
        from target
        join public.card_prints cp on cp.id = target.card_print_id
        join public.sets s on s.id = cp.set_id
        where s.code <> all($2::text[])
           or s.identity_domain_default is distinct from 'pokemon_eng_standard') as out_of_scope_parent_count`,
    [JSON.stringify(targets), TARGET_SET_CODES],
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
    await client.query("set local statement_timeout = '180s'");
    await client.query(
      `create temporary table enrich16a_targets (
         card_print_id uuid primary key,
         set_code text,
         number text,
         number_plain text,
         card_name text,
         projected jsonb not null
       ) on commit drop`,
    );
    await client.query(
      `insert into enrich16a_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_code text,
         number text,
         number_plain text,
         card_name text,
         projected jsonb
       )`,
      [JSON.stringify(targets)],
    );

    const guard = await validateScope(client, targets);
    if (
      guard.target_count !== targets.length ||
      guard.distinct_target_count !== targets.length ||
      guard.distinct_identity_hash_count !== targets.length ||
      guard.projection_not_ready_count !== 0 ||
      guard.missing_identity_hash_count !== 0 ||
      guard.missing_parent_count !== 0 ||
      guard.target_active_identity_collision_count !== 0 ||
      guard.existing_identity_hash_collision_count !== 0 ||
      guard.batch_duplicate_identity_hash_count !== 0 ||
      guard.out_of_scope_parent_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guard)}`);
    }

    const inserted = await client.query(
      `insert into public.card_print_identity (
         card_print_id,
         identity_domain,
         set_code_identity,
         printed_number,
         normalized_printed_name,
         source_name_raw,
         identity_payload,
         identity_key_version,
         identity_key_hash,
         is_active
       )
       select
         target.card_print_id,
         target.projected->>'identity_domain',
         target.projected->>'set_code_identity',
         target.projected->>'printed_number',
         nullif(target.projected->>'normalized_printed_name', ''),
         nullif(target.projected->>'source_name_raw', ''),
         coalesce(target.projected->'identity_payload', '{}'::jsonb),
         target.projected->>'identity_key_version',
         target.projected->>'identity_key_hash',
         true
       from enrich16a_targets target
       returning card_print_id::text, identity_key_hash`,
    );

    const proof = await client.query(
      `select
         (select count(*)::int from enrich16a_targets) as target_count,
         (select count(*)::int
          from enrich16a_targets target
          join public.card_print_identity cpi
            on cpi.card_print_id = target.card_print_id
           and cpi.is_active = true
           and cpi.identity_key_hash = target.projected->>'identity_key_hash') as matching_active_identity_count,
         (select count(*)::int from (
            select identity_domain, identity_key_version, identity_key_hash
            from public.card_print_identity
            where is_active = true
            group by identity_domain, identity_key_version, identity_key_hash
            having count(*) > 1
            limit 1
          ) dup) as duplicate_active_identity_hash_exists`,
    );

    insideProof = {
      inserted_rows: inserted.rowCount,
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

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const targets = await loadTargets(client);
    const preflight = await validateScope(client, targets);
    const execution = await runRollbackDryRun(client, targets);
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      target_set_codes: TARGET_SET_CODES,
      targets,
      target_fingerprint_sha256: preflight.target_fingerprint_sha256,
    }));
    const stop_findings = [];

    if (targets.length !== EXPECTED_TARGET_ROWS) stop_findings.push(`target_count_drift:${targets.length}`);
    if (preflight.target_count !== targets.length) stop_findings.push('preflight_target_count_mismatch');
    if (preflight.distinct_target_count !== targets.length) stop_findings.push('duplicate_target_parent_ids');
    if (preflight.distinct_identity_hash_count !== targets.length) stop_findings.push('duplicate_projected_identity_hashes');
    if (preflight.projection_not_ready_count !== 0) stop_findings.push('projection_not_ready');
    if (preflight.missing_identity_hash_count !== 0) stop_findings.push('missing_projected_identity_hash');
    if (preflight.missing_parent_count !== 0) stop_findings.push('missing_target_parent_rows');
    if (preflight.target_active_identity_collision_count !== 0) stop_findings.push('target_already_has_active_identity');
    if (preflight.existing_identity_hash_collision_count !== 0) stop_findings.push('existing_identity_hash_collision');
    if (preflight.batch_duplicate_identity_hash_count !== 0) stop_findings.push('batch_duplicate_identity_hash');
    if (preflight.out_of_scope_parent_count !== 0) stop_findings.push('out_of_scope_parent');
    if (execution.dry_run_status !== 'completed_rolled_back_no_durable_change') stop_findings.push(execution.dry_run_status);
    if (execution.inside_transaction_proof?.inserted_rows !== targets.length) stop_findings.push('inserted_row_count_mismatch');
    if (execution.inside_transaction_proof?.proof?.matching_active_identity_count !== targets.length) stop_findings.push('matching_active_identity_count_mismatch');
    if (execution.inside_transaction_proof?.proof?.duplicate_active_identity_hash_exists !== 0) stop_findings.push('duplicate_active_identity_hash_after_insert');

    const report = {
      version: 'ENRICH16A_NEW_PHYSICAL_SET_ACTIVE_IDENTITY_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      projection_function: 'public.card_print_identity_backfill_projection_v1',
      target_set_codes: TARGET_SET_CODES,
      scope: {
        target_rows: targets.length,
        writes_simulated_then_rolled_back: ['card_print_identity inserts'],
        forbidden: ['parent writes', 'child writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
        durable_db_writes_performed: false,
        migrations_created: false,
      },
      preflight,
      execution,
      by_set: countBy(targets, (row) => row.set_code),
      target_samples: targets.slice(0, 20).map((row) => ({
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        number: row.number,
        card_name: row.card_name,
        identity_key_hash: row.projected?.identity_key_hash ?? null,
      })),
      stop_findings,
      pass: stop_findings.length === 0,
      recommended_approval_text: stop_findings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} active card_print_identity inserts across newly classified English physical sets ${TARGET_SET_CODES.join(', ')} from public.card_print_identity_backfill_projection_v1. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No parent writes. No child writes. No deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-16A New Physical Set Active Identity Guarded Dry Run V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target rows: ${targets.length}`,
      `- Inserted inside transaction: ${execution.inside_transaction_proof?.inserted_rows ?? 0}`,
      `- Dry-run status: ${execution.dry_run_status}`,
      `- Before hash: \`${execution.before_snapshot.hash_sha256}\``,
      `- After rollback hash: \`${execution.after_rollback_snapshot.hash_sha256}\``,
      `- Package fingerprint: \`${packageFingerprint}\``,
      '',
      '## Safety',
      '',
      '- Durable DB writes performed: false',
      '- Migrations created: false',
      '- Parent writes: false',
      '- Child writes: false',
      '- Deletes/merges: false',
      '- Image writes: false',
      '',
      '## By Set',
      '',
      markdownTable(Object.entries(report.by_set).map(([set_code, rows]) => ({ set_code, rows })), [
        { label: 'set_code', value: (row) => row.set_code },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Stop Findings',
      '',
      report.stop_findings.length ? report.stop_findings.map((finding) => `- ${finding}`).join('\n') : '_None._',
      '',
      '## Approval Text',
      '',
      report.recommended_approval_text ? `\`${report.recommended_approval_text}\`` : '_Not available; dry-run did not pass._',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);

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
