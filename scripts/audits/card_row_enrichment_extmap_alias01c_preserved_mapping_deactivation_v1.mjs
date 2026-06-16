import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const APPLY = process.argv.includes('--apply');
const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const PACKAGE_ID = 'EXTMAP-ALIAS-01C-PRESERVED-MAPPING-DEACTIVATION';
const REPORT_BASENAME = APPLY
  ? 'external_mapping_alias_01c_preserved_mapping_deactivation_real_apply_v1'
  : 'external_mapping_alias_01c_preserved_mapping_deactivation_guarded_dry_run_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, `${REPORT_BASENAME}.json`);
const OUTPUT_MD = path.join(OUTPUT_DIR, `${REPORT_BASENAME}.md`);
const EXPECTED_TARGET_ROWS = 214;
const EXPECTED_BEFORE_SOURCE_CARD_DUPLICATE_GROUPS = 169;
const EXPECTED_AFTER_SOURCE_CARD_DUPLICATE_GROUPS = 70;

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
  const result = await client.query(`
    select
      a.id::text as alias_row_id,
      a.canonical_card_print_id::text,
      a.canonical_external_mapping_id::text,
      a.source,
      a.alias_external_id,
      a.alias_kind,
      a.alias_status,
      a.preserved_from_mapping_id::text,
      a.metadata,
      em.active as preserved_mapping_active
    from public.external_mapping_aliases a
    join public.external_mappings em on em.id = a.preserved_from_mapping_id
    where a.active = true
      and a.created_from_audit = 'external_mapping_alias_sidecar_readiness_v1'
    order by a.source, a.alias_external_id, a.preserved_from_mapping_id
  `);

  return result.rows.map((row) => ({
    alias_row_id: row.alias_row_id,
    canonical_card_print_id: row.canonical_card_print_id,
    canonical_external_mapping_id: Number(row.canonical_external_mapping_id),
    source: row.source,
    alias_external_id: row.alias_external_id,
    alias_kind: row.alias_kind,
    alias_status: row.alias_status,
    preserved_from_mapping_id: Number(row.preserved_from_mapping_id),
    metadata: row.metadata,
    preserved_mapping_active: row.preserved_mapping_active,
  }));
}

async function duplicateGroupCounts(client) {
  const result = await client.query(`
    select
      (select count(*)::int from (
        select card_print_id, source, count(*)
        from public.external_mappings
        where active = true
        group by card_print_id, source
        having count(*) > 1
      ) groups) as source_card_duplicate_groups,
      (select count(*)::int from (
        select source, external_id, count(*)
        from public.external_mappings
        where active = true
        group by source, external_id
        having count(*) > 1
      ) groups) as source_external_duplicate_groups,
      (select count(*)::int from public.external_mappings where active = true) as active_external_mappings,
      (select count(*)::int from public.external_mapping_aliases where active = true) as active_alias_rows
  `);
  return result.rows[0];
}

async function validateTargets(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         canonical_card_print_id uuid,
         canonical_external_mapping_id bigint,
         source text,
         alias_external_id text,
         preserved_from_mapping_id bigint
       )
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct preserved_from_mapping_id)::int from target) as distinct_preserved_mapping_count,
       (select count(distinct source || '|' || alias_external_id)::int from target) as distinct_source_alias_count,
       (select count(*)::int from target where preserved_from_mapping_id = canonical_external_mapping_id) as target_is_canonical_count,
       (select count(*)::int from target t left join public.external_mapping_aliases a on a.preserved_from_mapping_id = t.preserved_from_mapping_id and a.active = true where a.id is null) as missing_active_alias_sidecar_count,
       (select count(*)::int from target t join public.external_mappings em on em.id = t.preserved_from_mapping_id where em.active is not true) as inactive_target_mapping_count,
       (select count(*)::int from target t join public.external_mappings em on em.id = t.preserved_from_mapping_id where em.card_print_id <> t.canonical_card_print_id) as wrong_parent_count,
       (select count(*)::int from target t join public.external_mappings em on em.id = t.preserved_from_mapping_id where em.source <> t.source) as wrong_source_count,
       (select count(*)::int from target t join public.external_mappings em on em.id = t.preserved_from_mapping_id where em.external_id <> t.alias_external_id) as wrong_external_id_count,
       (select count(*)::int from target t left join public.external_mappings em on em.id = t.canonical_external_mapping_id and em.active = true where em.id is null) as missing_active_canonical_mapping_count
    `,
    [JSON.stringify(targets)],
  );
  return result.rows[0];
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         alias_row_id uuid,
         canonical_card_print_id uuid,
         canonical_external_mapping_id bigint,
         source text,
         alias_external_id text,
         preserved_from_mapping_id bigint
       )
     ),
     rows as (
       select
         'sidecar_alias' as row_type,
         a.id::text as row_id,
         a.canonical_card_print_id::text as card_print_id,
         a.source,
         a.alias_external_id as external_id,
         a.canonical_external_mapping_id::text as canonical_external_mapping_id,
         a.preserved_from_mapping_id::text as preserved_from_mapping_id,
         a.active::text as active
       from target t
       join public.external_mapping_aliases a on a.id = t.alias_row_id
      union all
       select
         'preserved_external_mapping' as row_type,
         em.id::text as row_id,
         em.card_print_id::text as card_print_id,
         em.source,
         em.external_id,
         null::text as canonical_external_mapping_id,
         em.id::text as preserved_from_mapping_id,
         em.active::text as active
       from target t
       join public.external_mappings em on em.id = t.preserved_from_mapping_id
      union all
       select
         'canonical_external_mapping' as row_type,
         em.id::text as row_id,
         em.card_print_id::text as card_print_id,
         em.source,
         em.external_id,
         em.id::text as canonical_external_mapping_id,
         null::text as preserved_from_mapping_id,
         em.active::text as active
       from target t
       join public.external_mappings em on em.id = t.canonical_external_mapping_id
     )
     select *
     from rows
     order by row_type, source, external_id, row_id`,
    [JSON.stringify(targets)],
  );

  return {
    captured_at: new Date().toISOString(),
    row_count: result.rows.length,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

async function deactivateTargets(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(preserved_from_mapping_id bigint)
     ),
     updated as (
       update public.external_mappings em
          set active = false
       from target t
       where em.id = t.preserved_from_mapping_id
         and em.active = true
       returning em.id, em.source, em.external_id, em.card_print_id
     )
     select
       count(*)::int as deactivated_rows,
       count(distinct id)::int as distinct_deactivated_rows,
       count(distinct source || '|' || external_id)::int as distinct_source_external_rows
     from updated`,
    [JSON.stringify(targets.map((row) => ({ preserved_from_mapping_id: row.preserved_from_mapping_id })))],
  );
  return result.rows[0];
}

function stopFindings({ targets, preflight, beforeCounts, afterCounts, execution, beforeSnapshot, afterSnapshot }) {
  const findings = [];
  if (targets.length !== EXPECTED_TARGET_ROWS) findings.push('target_count_not_expected_214');
  if (preflight.target_count !== targets.length) findings.push('preflight_target_count_mismatch');
  if (preflight.distinct_preserved_mapping_count !== targets.length) findings.push('duplicate_preserved_mapping_targets');
  if (preflight.distinct_source_alias_count !== targets.length) findings.push('duplicate_source_alias_targets');
  if (preflight.target_is_canonical_count !== 0) findings.push('target_attempts_to_deactivate_canonical_mapping');
  if (preflight.missing_active_alias_sidecar_count !== 0) findings.push('missing_active_alias_sidecar');
  if (preflight.inactive_target_mapping_count !== 0) findings.push('inactive_target_mapping');
  if (preflight.wrong_parent_count !== 0) findings.push('wrong_parent_target');
  if (preflight.wrong_source_count !== 0) findings.push('wrong_source_target');
  if (preflight.wrong_external_id_count !== 0) findings.push('wrong_external_id_target');
  if (preflight.missing_active_canonical_mapping_count !== 0) findings.push('missing_active_canonical_mapping');
  if (beforeCounts.source_card_duplicate_groups !== EXPECTED_BEFORE_SOURCE_CARD_DUPLICATE_GROUPS) findings.push('unexpected_before_source_card_duplicate_groups');
  if (beforeCounts.source_external_duplicate_groups !== 0) findings.push('source_external_duplicates_exist_before');
  if (execution?.deactivated_rows !== targets.length) findings.push('deactivated_row_count_mismatch');
  if (execution?.distinct_deactivated_rows !== targets.length) findings.push('distinct_deactivated_row_count_mismatch');
  if (afterCounts.source_card_duplicate_groups !== EXPECTED_AFTER_SOURCE_CARD_DUPLICATE_GROUPS) findings.push('unexpected_after_source_card_duplicate_groups');
  if (afterCounts.source_external_duplicate_groups !== 0) findings.push('source_external_duplicates_exist_after');
  if (!APPLY && beforeSnapshot.hash_sha256 !== afterSnapshot.hash_sha256) findings.push('rollback_snapshot_hash_mismatch');
  if (APPLY && beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256) findings.push('apply_snapshot_did_not_change');
  return findings;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for external mapping deactivation.');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let transactionStatus = 'not_started';

  try {
    const targets = await loadTargets(client);
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      targets: targets.map((row) => ({
        alias_row_id: row.alias_row_id,
        canonical_card_print_id: row.canonical_card_print_id,
        canonical_external_mapping_id: row.canonical_external_mapping_id,
        source: row.source,
        alias_external_id: row.alias_external_id,
        preserved_from_mapping_id: row.preserved_from_mapping_id,
      })),
    }));

    const preflight = await validateTargets(client, targets);
    const beforeCounts = await duplicateGroupCounts(client);
    const beforeSnapshot = await captureSnapshot(client, targets);

    await client.query('begin');
    transactionStatus = APPLY ? 'started_apply_transaction' : 'started_rollback_only_transaction';
    const execution = await deactivateTargets(client, targets);
    const insideCounts = await duplicateGroupCounts(client);

    if (APPLY) {
      await client.query('commit');
      transactionStatus = 'committed';
    } else {
      await client.query('rollback');
      transactionStatus = 'rolled_back';
    }

    const afterCounts = await duplicateGroupCounts(client);
    const afterSnapshot = await captureSnapshot(client, targets);

    const findings = stopFindings({
      targets,
      preflight,
      beforeCounts,
      afterCounts: APPLY ? afterCounts : insideCounts,
      execution,
      beforeSnapshot,
      afterSnapshot,
    });

    const report = {
      version: APPLY
        ? 'EXTERNAL_MAPPING_ALIAS_01C_PRESERVED_MAPPING_DEACTIVATION_REAL_APPLY_V1'
        : 'EXTERNAL_MAPPING_ALIAS_01C_PRESERVED_MAPPING_DEACTIVATION_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: APPLY ? 'real_apply' : 'rollback_only_dry_run',
      package_fingerprint_sha256: packageFingerprint,
      scope: {
        target_external_mapping_deactivations: targets.length,
        table_written: ['public.external_mappings.active'],
        prerequisite_sidecar_rows: targets.length,
        forbidden: [
          'card_prints writes',
          'card_printings writes',
          'card_print_identity writes',
          'external_mapping_aliases writes',
          'deletes',
          'merges',
          'migrations',
          'image writes',
          'global apply',
        ],
        rows_deleted: 0,
        migrations_created: false,
      },
      preflight,
      before_counts: beforeCounts,
      inside_transaction_counts: insideCounts,
      after_counts: afterCounts,
      execution: {
        transaction_status: transactionStatus,
        ...execution,
      },
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      by_alias_kind: countBy(targets, (row) => row.alias_kind),
      target_samples: targets.slice(0, 30),
      stop_findings: findings,
      pass: findings.length === 0,
      recommended_next_step: APPLY
        ? 'Regenerate card row enrichment status and run preflight to confirm external_mappings_source_card_duplicates dropped to the blocked-only residual.'
        : 'If pass is true, run this script with --apply to deactivate the preserved duplicate external_mappings rows.',
      recommended_approval_text: !APPLY && findings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} preserved duplicate external_mappings active=false updates protected by 214 sidecar alias rows. Dry-run proof: ${beforeSnapshot.hash_sha256} == ${afterSnapshot.hash_sha256}; duplicate groups inside transaction ${beforeCounts.source_card_duplicate_groups} -> ${insideCounts.source_card_duplicate_groups}. No card_prints writes. No child writes. No identity writes. No alias sidecar writes. No deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      `# ${APPLY ? 'External Mapping Alias 01C Preserved Mapping Deactivation Real Apply V1' : 'External Mapping Alias 01C Preserved Mapping Deactivation Guarded Dry Run V1'}`,
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Mode: ${report.mode}`,
      `- Target deactivations: ${targets.length}`,
      `- Deactivated rows: ${execution.deactivated_rows}`,
      `- Transaction status: ${transactionStatus}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      `- Before hash: \`${beforeSnapshot.hash_sha256}\``,
      `- After hash: \`${afterSnapshot.hash_sha256}\``,
      `- Source/card duplicate groups before: ${beforeCounts.source_card_duplicate_groups}`,
      `- Source/card duplicate groups inside transaction: ${insideCounts.source_card_duplicate_groups}`,
      `- Source/card duplicate groups after: ${afterCounts.source_card_duplicate_groups}`,
      '',
      '## Alias Kinds',
      '',
      markdownTable(Object.entries(report.by_alias_kind).map(([alias_kind, rows]) => ({ alias_kind, rows })), [
        { label: 'alias_kind', value: (row) => row.alias_kind },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Safety',
      '',
      `- Durable DB writes performed: ${APPLY && report.pass}`,
      '- Migrations created: false',
      '- Rows deleted: 0',
      '- Card parent writes: false',
      '- Child printing writes: false',
      '- Identity writes: false',
      '- Alias sidecar writes: false',
      '- Image writes: false',
      '',
      '## Stop Findings',
      '',
      findings.length ? findings.map((finding) => `- ${finding}`).join('\n') : '_None._',
      '',
      '## Recommended Next Step',
      '',
      report.recommended_next_step,
      '',
      '## Approval Text',
      '',
      report.recommended_approval_text ? `\`${report.recommended_approval_text}\`` : '_Not applicable for this report._',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      mode: report.mode,
      package_fingerprint_sha256: packageFingerprint,
      target_deactivations: targets.length,
      deactivated_rows: execution.deactivated_rows,
      transaction_status: transactionStatus,
      proof: `${beforeSnapshot.hash_sha256} == ${afterSnapshot.hash_sha256}`,
      duplicate_groups: {
        before: beforeCounts.source_card_duplicate_groups,
        inside_transaction: insideCounts.source_card_duplicate_groups,
        after: afterCounts.source_card_duplicate_groups,
      },
      recommended_approval_text: report.recommended_approval_text,
      stop_findings: findings,
    }, null, 2));
  } catch (error) {
    if (transactionStatus === 'started_apply_transaction' || transactionStatus === 'started_rollback_only_transaction') {
      try {
        await client.query('rollback');
      } catch {
        // Preserve original failure.
      }
    }
    throw error;
  } finally {
    await client.end();
  }
}

await main();
