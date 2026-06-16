import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich14b_first_edition_modifier_identity_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich14b_first_edition_modifier_identity_guarded_dry_run_v1.md');

const PACKAGE_ID = 'ENRICH-14B-FIRST-EDITION-MODIFIER-IDENTITY';
const TARGET_CARD_PRINT_ID = 'b82829d7-8deb-4e21-8860-989efe798c70';
const NORMAL_CARD_PRINT_ID = '8277ae6a-03d8-4306-aba4-16ae7e7b4e2b';
const EXPECTED_MODIFIER = 'edition:first_edition';

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

async function loadTarget(client) {
  const rows = await queryRows(client, `
    select
      cp.id::text as card_print_id,
      cp.gv_id,
      cp.set_code,
      s.code as set_code_from_sets,
      s.name as set_name,
      s.source as set_source,
      s.identity_domain_default,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.variant_key,
      cp.printed_identity_modifier,
      coalesce(cp.printed_total, s.printed_total) as printed_total,
      coalesce(cp.printed_set_abbrev, s.printed_set_abbrev) as printed_set_abbrev,
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
      ) as base_projection
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    where cp.id = $1::uuid
  `, [TARGET_CARD_PRINT_ID]);
  if (rows.length !== 1) throw new Error('Expected first-edition target row was not found.');
  return rows[0];
}

async function buildModifierProjection(client, target) {
  const base = target.base_projection;
  const identityPayload = {
    ...(base.identity_payload ?? {}),
    variant_key_current: target.printed_identity_modifier,
  };
  const rows = await queryRows(client, `
    select
      public.card_print_identity_hash_v1($1, $2, $3, $4, $5, $6, $7::jsonb) as identity_key_hash,
      public.card_print_identity_serialize_key_v1($1, $2, $3, $4, $5, $6, $7::jsonb) as serialized_identity_key
  `, [
    base.identity_domain,
    base.identity_key_version,
    base.set_code_identity,
    base.printed_number,
    base.normalized_printed_name,
    base.source_name_raw,
    JSON.stringify(identityPayload),
  ]);

  return {
    status: base.status,
    taxonomy_class: base.taxonomy_class,
    identity_domain: base.identity_domain,
    identity_key_version: base.identity_key_version,
    set_code_identity: base.set_code_identity,
    printed_number: base.printed_number,
    normalized_printed_name: base.normalized_printed_name,
    source_name_raw: base.source_name_raw,
    identity_payload: identityPayload,
    identity_key_hash: rows[0].identity_key_hash,
    serialized_identity_key: rows[0].serialized_identity_key,
    projection_strategy: 'explicit_modifier_dimension_override_using_existing_variant_key_current_hash_dimension',
  };
}

async function captureSnapshot(client) {
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
      cp.variant_key,
      cp.printed_identity_modifier,
      null::text as identity_domain,
      null::text as identity_key_version,
      null::text as identity_key_hash,
      null::jsonb as identity_payload
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
      cp.variant_key,
      cp.printed_identity_modifier,
      cpi.identity_domain,
      cpi.identity_key_version,
      cpi.identity_key_hash,
      cpi.identity_payload
    from public.card_print_identity cpi
    join public.card_prints cp on cp.id = cpi.card_print_id
    where cpi.is_active = true
      and cpi.card_print_id = any($1::uuid[])
    order by row_type, card_print_id, row_id
  `, [[TARGET_CARD_PRINT_ID, NORMAL_CARD_PRINT_ID]]);
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

async function identityGuards(client, projection) {
  const rows = await queryRows(client, `
    select
      (select count(*)::int from (
        select identity_domain, identity_key_version, identity_key_hash
        from public.card_print_identity
        where is_active = true
        group by identity_domain, identity_key_version, identity_key_hash
        having count(*) > 1
      ) dupes) as active_identity_duplicate_groups,
      (select count(*)::int from public.card_print_identity where card_print_id = $1::uuid and is_active = true) as target_active_identity_rows,
      (select count(*)::int from public.card_print_identity where card_print_id = $2::uuid and is_active = true) as normal_active_identity_rows,
      (select count(*)::int
       from public.card_print_identity
       where is_active = true
         and identity_domain = $3
         and identity_key_version = $4
         and identity_key_hash = $5) as projected_hash_collision_count
  `, [
    TARGET_CARD_PRINT_ID,
    NORMAL_CARD_PRINT_ID,
    projection.identity_domain,
    projection.identity_key_version,
    projection.identity_key_hash,
  ]);
  return rows[0];
}

async function runDryRun(client, target, projection) {
  const beforeSnapshot = await captureSnapshot(client);
  const beforeGuards = await identityGuards(client, projection);
  let inTransactionProof = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const preflight = await identityGuards(client, projection);
    if (
      target.printed_identity_modifier !== EXPECTED_MODIFIER
      || projection.status !== 'ready'
      || preflight.target_active_identity_rows !== 0
      || preflight.normal_active_identity_rows !== 1
      || preflight.projected_hash_collision_count !== 0
      || preflight.active_identity_duplicate_groups !== 0
    ) {
      throw new Error(`preflight guard failed: ${JSON.stringify({ target, projection, preflight })}`);
    }

    const insertedRows = await queryRows(client, `
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
      returning id::text, card_print_id::text, identity_domain, identity_key_version, identity_key_hash, identity_payload
    `, [
      TARGET_CARD_PRINT_ID,
      projection.identity_domain,
      projection.set_code_identity,
      projection.printed_number,
      projection.normalized_printed_name,
      projection.source_name_raw,
      JSON.stringify(projection.identity_payload),
      projection.identity_key_version,
      projection.identity_key_hash,
    ]);

    inTransactionProof = {
      inserted_rows: insertedRows,
      snapshot: await captureSnapshot(client),
      guards: await identityGuards(client, projection),
    };
  } finally {
    await client.query('rollback');
  }

  const afterSnapshot = await captureSnapshot(client);
  const afterGuards = await identityGuards(client, projection);
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

function table(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replaceAll('|', '\\|')).join(' | ')} |`),
  ].join('\n');
}

const conn = connectionString();
if (!conn) throw new Error('Missing database connection string.');

const client = new Client({ connectionString: conn });
await client.connect();

let report;
try {
  const target = await loadTarget(client);
  const projection = await buildModifierProjection(client, target);
  const dryRun = await runDryRun(client, target, projection);
  const stopFindings = [];
  if (target.printed_identity_modifier !== EXPECTED_MODIFIER) stopFindings.push('target_modifier_mismatch');
  if (projection.identity_payload?.variant_key_current !== EXPECTED_MODIFIER) stopFindings.push('modifier_not_in_identity_payload');
  if (projection.identity_key_hash === target.base_projection?.identity_key_hash) stopFindings.push('modifier_hash_matches_base_hash');
  if (!dryRun.rollback_restored_original_state) stopFindings.push('rollback_did_not_restore_original_state');
  if (!dryRun.transaction_changed_target_state) stopFindings.push('transaction_did_not_change_target_state');
  if (dryRun.in_transaction_proof?.guards?.active_identity_duplicate_groups !== 0) {
    stopFindings.push('active_identity_duplicate_groups_inside_transaction');
  }

  const reportCore = {
    version: 'ENRICH_14B_FIRST_EDITION_MODIFIER_IDENTITY_GUARDED_DRY_RUN_V1',
    package_id: PACKAGE_ID,
    mode: 'guarded_rollback_dry_run',
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    image_writes_performed: false,
    scope: {
      target_rows: 1,
      target_card_print_id: TARGET_CARD_PRINT_ID,
      normal_card_print_id: NORMAL_CARD_PRINT_ID,
      target_modifier: EXPECTED_MODIFIER,
      writes_if_later_approved: ['card_print_identity insert only'],
    },
    target,
    modifier_projection: projection,
    dry_run: dryRun,
    stop_findings: stopFindings,
  };

  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    target_card_print_id: TARGET_CARD_PRINT_ID,
    target_modifier: EXPECTED_MODIFIER,
    modifier_projection: projection,
    dry_run_proof: {
      before_hash: dryRun.before_snapshot.hash_sha256,
      in_transaction_hash: dryRun.in_transaction_proof?.snapshot?.hash_sha256,
      after_hash: dryRun.after_rollback_snapshot.hash_sha256,
    },
  }));

  report = {
    ...reportCore,
    generated_at: new Date().toISOString(),
    pass: stopFindings.length === 0,
    package_fingerprint_sha256: packageFingerprint,
    required_real_apply_approval_text: stopFindings.length === 0
      ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: 1 modifier-aware active card_print_identity insert for basep/Wizards Black Star Promos Pikachu #1 first-edition parent ${TARGET_CARD_PRINT_ID}; identity payload variant_key_current=${EXPECTED_MODIFIER}; normal parent ${NORMAL_CARD_PRINT_ID} preserved. Dry-run proof: ${dryRun.before_snapshot.hash_sha256} == ${dryRun.after_rollback_snapshot.hash_sha256}. No parent writes. No child writes. No deletes. No merges. No migrations. No image writes. No global apply.`
      : null,
  };
} finally {
  await client.end();
}

const md = `# ENRICH-14B First Edition Modifier Identity Guarded Dry Run V1

Generated: ${report.generated_at}

Mode: guarded rollback dry-run.

## Summary

- Target rows: ${report.scope.target_rows}
- Target card print: \`${report.scope.target_card_print_id}\`
- Modifier: \`${report.scope.target_modifier}\`
- Pass: ${report.pass}
- Fingerprint: \`${report.package_fingerprint_sha256}\`
- DB writes performed: false
- Migrations created: false

## Identity Strategy

The existing \`pokemon_eng_standard:v1\` identity hash law only approves \`variant_key_current\` as a domain dimension. This dry-run keeps the parent row untouched and inserts only an active identity row whose payload carries:

\`\`\`json
${JSON.stringify(report.modifier_projection.identity_payload, null, 2)}
\`\`\`

## Hash Comparison

- Base projection hash: \`${report.target.base_projection?.identity_key_hash}\`
- Modifier-aware hash: \`${report.modifier_projection.identity_key_hash}\`

## Dry-Run Proof

- Before hash: \`${report.dry_run.before_snapshot.hash_sha256}\`
- In-transaction hash: \`${report.dry_run.in_transaction_proof?.snapshot?.hash_sha256}\`
- After rollback hash: \`${report.dry_run.after_rollback_snapshot.hash_sha256}\`
- Rollback restored original state: ${report.dry_run.rollback_restored_original_state}
- Transaction changed target state: ${report.dry_run.transaction_changed_target_state}

## Inserted Row Inside Rolled-Back Transaction

${table(report.dry_run.in_transaction_proof?.inserted_rows ?? [], [
  { label: 'card_print_id', value: (row) => row.card_print_id },
  { label: 'identity_domain', value: (row) => row.identity_domain },
  { label: 'identity_key_version', value: (row) => row.identity_key_version },
  { label: 'identity_key_hash', value: (row) => row.identity_key_hash },
])}

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
  target_rows: report.scope.target_rows,
  stop_findings: report.stop_findings,
}, null, 2));
