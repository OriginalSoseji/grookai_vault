import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich14a_residual_active_identity_split_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich14a_residual_active_identity_split_guarded_dry_run_v1.md');

const PACKAGE_ID = 'ENRICH-14A-RESIDUAL-ACTIVE-IDENTITY-SPLIT';
const NORMAL_PIKACHU_ID = '8277ae6a-03d8-4306-aba4-16ae7e7b4e2b';
const FIRST_EDITION_PIKACHU_ID = 'b82829d7-8deb-4e21-8860-989efe798c70';

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

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

function table(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replaceAll('|', '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function loadRows(client) {
  return queryRows(client, `
    with active_identity as (
      select card_print_id, count(*)::int as active_identity_count
      from public.card_print_identity
      where is_active = true
      group by card_print_id
    )
    select
      cp.id::text as card_print_id,
      cp.gv_id,
      cp.set_code,
      s.code as set_code_from_sets,
      s.name as set_name,
      s.identity_domain_default,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.variant_key,
      cp.printed_identity_modifier,
      coalesce(ai.active_identity_count, 0)::int as active_identity_count,
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
    left join active_identity ai on ai.card_print_id = cp.id
    where cp.id = any($1::uuid[])
    order by cp.printed_identity_modifier nulls first, cp.id
  `, [[NORMAL_PIKACHU_ID, FIRST_EDITION_PIKACHU_ID]]);
}

async function captureSnapshot(client, targetIds) {
  const rows = await queryRows(client, `
    select
      'parent' as row_type,
      cp.id::text as row_id,
      cp.id::text as card_print_id,
      cp.gv_id,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.printed_identity_modifier,
      null::text as identity_domain,
      null::text as identity_key_version,
      null::text as identity_key_hash
    from public.card_prints cp
    where cp.id = any($1::uuid[])
    union all
    select
      'active_identity' as row_type,
      cpi.id::text as row_id,
      cpi.card_print_id::text as card_print_id,
      cp.gv_id,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.printed_identity_modifier,
      cpi.identity_domain,
      cpi.identity_key_version,
      cpi.identity_key_hash
    from public.card_print_identity cpi
    join public.card_prints cp on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cpi.card_print_id = any($1::uuid[])
    order by row_type, printed_identity_modifier nulls first, card_print_id, row_id
  `, [targetIds]);
  return {
    captured_at: new Date().toISOString(),
    rows,
    hash_sha256: sha256(stableJson(rows)),
    counts: {
      total_rows: rows.length,
      parent_rows: rows.filter((row) => row.row_type === 'parent').length,
      active_identity_rows: rows.filter((row) => row.row_type === 'active_identity').length,
    },
  };
}

async function globalIdentityGuards(client) {
  const rows = await queryRows(client, `
    select
      (select count(*)::int from (
        select identity_domain, identity_key_version, identity_key_hash
        from public.card_print_identity
        where is_active = true
        group by identity_domain, identity_key_version, identity_key_hash
        having count(*) > 1
      ) dupes) as active_identity_duplicate_groups,
      (select count(*)::int from public.card_print_identity where card_print_id = $1::uuid and is_active = true) as normal_active_identity_rows,
      (select count(*)::int from public.card_print_identity where card_print_id = $2::uuid and is_active = true) as first_edition_active_identity_rows
  `, [NORMAL_PIKACHU_ID, FIRST_EDITION_PIKACHU_ID]);
  return rows[0];
}

async function runDryRun(client, target) {
  const targetIds = [NORMAL_PIKACHU_ID, FIRST_EDITION_PIKACHU_ID];
  const beforeSnapshot = await captureSnapshot(client, targetIds);
  const beforeGuards = await globalIdentityGuards(client);
  let inTransactionProof = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const projected = target.projected;
    const preflight = await queryRows(client, `
      select
        (select count(*)::int from public.card_prints where id = $1::uuid) as target_parent_count,
        (select count(*)::int from public.card_print_identity where card_print_id = $1::uuid and is_active = true) as target_active_identity_count,
        (select count(*)::int
         from public.card_print_identity
         where is_active = true
           and identity_domain = $2
           and identity_key_version = $3
           and identity_key_hash = $4) as projected_hash_collision_count
    `, [
      target.card_print_id,
      projected.identity_domain,
      projected.identity_key_version,
      projected.identity_key_hash,
    ]);

    const guard = preflight[0];
    if (
      guard.target_parent_count !== 1
      || guard.target_active_identity_count !== 0
      || guard.projected_hash_collision_count !== 0
      || projected.status !== 'ready'
    ) {
      throw new Error(`preflight guard failed: ${JSON.stringify({ guard, projected })}`);
    }

    const inserted = await queryRows(client, `
      insert into public.card_print_identity (
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
      ) values (
        $1::uuid,
        $2,
        $3,
        $4,
        nullif($5, ''),
        nullif($6, ''),
        $7::jsonb,
        $8,
        $9,
        true
      )
      returning id::text, card_print_id::text, identity_domain, identity_key_version, identity_key_hash
    `, [
      target.card_print_id,
      projected.identity_domain,
      projected.set_code_identity,
      projected.printed_number,
      projected.normalized_printed_name,
      projected.source_name_raw,
      JSON.stringify(projected.identity_payload ?? {}),
      projected.identity_key_version,
      projected.identity_key_hash,
    ]);

    const inTransactionSnapshot = await captureSnapshot(client, targetIds);
    const inTransactionGuards = await globalIdentityGuards(client);
    inTransactionProof = {
      inserted_rows: inserted,
      snapshot: inTransactionSnapshot,
      guards: inTransactionGuards,
    };
  } finally {
    await client.query('rollback');
  }

  const afterSnapshot = await captureSnapshot(client, targetIds);
  const afterGuards = await globalIdentityGuards(client);
  return {
    before_snapshot: beforeSnapshot,
    before_guards: beforeGuards,
    in_transaction_proof: inTransactionProof,
    after_rollback_snapshot: afterSnapshot,
    after_rollback_guards: afterGuards,
    rollback_restored_original_state: beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256
      && stableJson(beforeGuards) === stableJson(afterGuards),
    transaction_changed_target_state: beforeSnapshot.hash_sha256 !== inTransactionProof?.snapshot?.hash_sha256,
  };
}

const conn = connectionString();
if (!conn) throw new Error('Missing database connection string.');

const client = new Client({ connectionString: conn });
await client.connect();

let report;
try {
  const rows = await loadRows(client);
  const normalRow = rows.find((row) => row.card_print_id === NORMAL_PIKACHU_ID);
  const firstEditionRow = rows.find((row) => row.card_print_id === FIRST_EDITION_PIKACHU_ID);

  if (!normalRow || !firstEditionRow) {
    throw new Error('Expected residual active identity rows were not found.');
  }

  const sharedProjectionHash = normalRow.projected?.identity_key_hash === firstEditionRow.projected?.identity_key_hash;
  const target = normalRow.printed_identity_modifier === null && normalRow.projected?.status === 'ready'
    ? normalRow
    : null;

  const blockedRows = [
    {
      card_print_id: firstEditionRow.card_print_id,
      set_code: firstEditionRow.set_code,
      number: firstEditionRow.number,
      card_name: firstEditionRow.card_name,
      printed_identity_modifier: firstEditionRow.printed_identity_modifier,
      projected_identity_key_hash: firstEditionRow.projected?.identity_key_hash ?? null,
      status: 'blocked_modifier_aware_identity_projection_required',
      reason: 'Current projection omits printed_identity_modifier, so first-edition identity would collide with the normal parent.',
    },
  ];

  const dryRun = target ? await runDryRun(client, target) : null;
  const stopFindings = [];
  if (!target) stopFindings.push('normal_target_not_ready');
  if (!sharedProjectionHash) stopFindings.push('expected_projection_collision_not_observed');
  if (dryRun && !dryRun.rollback_restored_original_state) stopFindings.push('rollback_did_not_restore_original_state');
  if (dryRun && !dryRun.transaction_changed_target_state) stopFindings.push('transaction_did_not_change_target_state');
  if (dryRun?.in_transaction_proof?.guards?.active_identity_duplicate_groups !== 0) {
    stopFindings.push('active_identity_duplicate_groups_inside_transaction');
  }

  const reportCore = {
    version: 'ENRICH_14A_RESIDUAL_ACTIVE_IDENTITY_SPLIT_GUARDED_DRY_RUN_V1',
    package_id: PACKAGE_ID,
    mode: 'guarded_rollback_dry_run',
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    image_writes_performed: false,
    scope: {
      dry_run_target_rows: target ? 1 : 0,
      blocked_rows: blockedRows.length,
      target_card_print_id: target?.card_print_id ?? null,
      blocked_card_print_ids: blockedRows.map((row) => row.card_print_id),
    },
    candidate_rows: rows.map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      gv_id: row.gv_id,
      printed_identity_modifier: row.printed_identity_modifier,
      active_identity_count: row.active_identity_count,
      projected: row.projected,
    })),
    dry_run: dryRun,
    blocked_rows: blockedRows,
    stop_findings: stopFindings,
  };

  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    target: reportCore.candidate_rows.find((row) => row.card_print_id === target?.card_print_id),
    blocked_rows: reportCore.blocked_rows,
    dry_run_proof: {
      before_hash: dryRun?.before_snapshot?.hash_sha256,
      after_hash: dryRun?.after_rollback_snapshot?.hash_sha256,
      in_transaction_hash: dryRun?.in_transaction_proof?.snapshot?.hash_sha256,
    },
  }));

  const approvalText = stopFindings.length === 0
    ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: 1 active card_print_identity insert for basep/Wizards Black Star Promos Pikachu #1 normal parent ${NORMAL_PIKACHU_ID}; first-edition modifier row ${FIRST_EDITION_PIKACHU_ID} remains blocked pending modifier-aware identity projection. Dry-run proof: ${dryRun.before_snapshot.hash_sha256} == ${dryRun.after_rollback_snapshot.hash_sha256}. No parent writes. No child writes. No deletes. No merges. No migrations. No image writes. No global apply.`
    : null;

  report = {
    ...reportCore,
    generated_at: new Date().toISOString(),
    package_fingerprint_sha256: packageFingerprint,
    pass: stopFindings.length === 0,
    required_real_apply_approval_text: approvalText,
  };
} finally {
  await client.end();
}

const md = `# ENRICH-14A Residual Active Identity Split Guarded Dry Run V1

Generated: ${report.generated_at}

Mode: guarded rollback dry-run.

## Summary

- Dry-run target rows: ${report.scope.dry_run_target_rows}
- Blocked rows: ${report.scope.blocked_rows}
- Pass: ${report.pass}
- Fingerprint: \`${report.package_fingerprint_sha256}\`
- DB writes performed: false
- Migrations created: false

## Target Row

${table(report.candidate_rows.filter((row) => row.card_print_id === report.scope.target_card_print_id), [
  { label: 'card_print_id', value: (row) => row.card_print_id },
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'name', value: (row) => row.card_name },
  { label: 'modifier', value: (row) => row.printed_identity_modifier ?? '' },
  { label: 'projected_hash', value: (row) => row.projected?.identity_key_hash },
])}

## Blocked Row

${table(report.blocked_rows, [
  { label: 'card_print_id', value: (row) => row.card_print_id },
  { label: 'set', value: (row) => row.set_code },
  { label: 'number', value: (row) => row.number },
  { label: 'name', value: (row) => row.card_name },
  { label: 'modifier', value: (row) => row.printed_identity_modifier },
  { label: 'status', value: (row) => row.status },
  { label: 'reason', value: (row) => row.reason },
])}

## Dry-Run Proof

- Before hash: \`${report.dry_run?.before_snapshot?.hash_sha256 ?? ''}\`
- In-transaction hash: \`${report.dry_run?.in_transaction_proof?.snapshot?.hash_sha256 ?? ''}\`
- After rollback hash: \`${report.dry_run?.after_rollback_snapshot?.hash_sha256 ?? ''}\`
- Rollback restored original state: ${report.dry_run?.rollback_restored_original_state}
- Transaction changed target state: ${report.dry_run?.transaction_changed_target_state}

## Stop Findings

${report.stop_findings.length === 0 ? 'None.' : report.stop_findings.map((finding) => `- ${finding}`).join('\n')}

## Approval Text

\`\`\`text
${report.required_real_apply_approval_text ?? 'Not available because dry-run did not pass.'}
\`\`\`
`;

await writeJson(OUTPUT_JSON, report);
await writeText(OUTPUT_MD, md);

console.log(JSON.stringify({
  output_json: OUTPUT_JSON,
  output_md: OUTPUT_MD,
  pass: report.pass,
  package_fingerprint_sha256: report.package_fingerprint_sha256,
  dry_run_target_rows: report.scope.dry_run_target_rows,
  blocked_rows: report.scope.blocked_rows,
  stop_findings: report.stop_findings,
}, null, 2));
