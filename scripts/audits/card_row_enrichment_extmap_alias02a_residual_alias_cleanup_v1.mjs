import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const APPLY = process.argv.includes('--apply');
const FINAL_SUFFIX_PASS = process.argv.includes('--final-suffix-pass');
const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const PLAN_JSON = path.join(OUTPUT_DIR, 'external_mapping_alias_residual_governance_plan_v1.json');
const PACKAGE_ID = FINAL_SUFFIX_PASS
  ? 'EXTMAP-ALIAS-03A-RESIDUAL-POKEMONAPI-SUFFIX-ALIAS-CLEANUP'
  : 'EXTMAP-ALIAS-02A-RESIDUAL-ALIAS-PRESERVATION-CLEANUP';
const REPORT_BASENAME = APPLY
  ? (FINAL_SUFFIX_PASS
    ? 'external_mapping_alias_03a_residual_pokemonapi_suffix_alias_cleanup_real_apply_v1'
    : 'external_mapping_alias_02a_residual_alias_cleanup_real_apply_v1')
  : (FINAL_SUFFIX_PASS
    ? 'external_mapping_alias_03a_residual_pokemonapi_suffix_alias_cleanup_guarded_dry_run_v1'
    : 'external_mapping_alias_02a_residual_alias_cleanup_guarded_dry_run_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, `${REPORT_BASENAME}.json`);
const OUTPUT_MD = path.join(OUTPUT_DIR, `${REPORT_BASENAME}.md`);
const EXPECTED_ALIAS_ROWS = FINAL_SUFFIX_PASS ? 3 : 55;
const EXPECTED_GROUPS_BEFORE = FINAL_SUFFIX_PASS ? 16 : 70;
const EXPECTED_GROUPS_AFTER = FINAL_SUFFIX_PASS ? 13 : 16;

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

async function loadPlanTargets() {
  const plan = JSON.parse(await fs.readFile(PLAN_JSON, 'utf8'));
  const targets = [];
  for (const group of plan.candidate_groups ?? []) {
    const canonicalExternalId = group.exact_external_id_to_keep?.[0];
    for (const aliasExternalId of group.alias_external_ids ?? []) {
      targets.push({
        canonical_card_print_id: group.card_print_id,
        source: group.source,
        alias_external_id: aliasExternalId,
        canonical_external_id_to_keep: canonicalExternalId,
        alias_kind: group.proposed_alias_kind,
        alias_status: 'active',
        source_domain: group.identity_domain,
        evidence_reason: group.reason,
        created_from_audit: 'external_mapping_alias_residual_governance_plan_v1',
        metadata: {
          set_code: group.set_code,
          set_name: group.set_name,
          card_name: group.card_name,
          card_number: group.number,
          canonical_gv_id: group.gv_id,
          proposed_rule: group.proposed_rule,
          governance_fingerprint_sha256: plan.fingerprint_sha256,
        },
      });
    }
  }
  return targets;
}

async function duplicateCounts(client) {
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
         source text,
         alias_external_id text,
         canonical_external_id_to_keep text,
         alias_kind text
       )
     )
     select
       (select count(*)::int from target) as target_alias_rows,
       (select count(distinct source || '|' || alias_external_id)::int from target) as distinct_source_alias_rows,
       (select count(*)::int from target where canonical_external_id_to_keep is null or btrim(canonical_external_id_to_keep) = '') as missing_canonical_external_id_count,
       (select count(*)::int from target where alias_external_id = canonical_external_id_to_keep) as alias_equals_canonical_count,
       (select count(*)::int from target t left join public.external_mappings em on em.card_print_id = t.canonical_card_print_id and em.source = t.source and em.external_id = t.canonical_external_id_to_keep and em.active = true where em.id is null) as missing_active_canonical_mapping_count,
       (select count(*)::int from target t left join public.external_mappings em on em.card_print_id = t.canonical_card_print_id and em.source = t.source and em.external_id = t.alias_external_id and em.active = true where em.id is null) as missing_active_alias_mapping_count,
       (select count(*)::int from target t join public.external_mapping_aliases a on a.source = t.source and a.alias_external_id = t.alias_external_id and a.active = true) as existing_active_alias_count
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
         canonical_card_print_id uuid,
         source text,
         alias_external_id text,
         canonical_external_id_to_keep text
       )
     ),
     rows as (
       select
         'sidecar_alias' as row_type,
         a.id::text as row_id,
         a.canonical_card_print_id::text as card_print_id,
         a.source,
         a.alias_external_id as external_id,
         a.alias_kind,
         a.preserved_from_mapping_id::text,
         a.active::text as active
       from target t
       join public.external_mapping_aliases a on a.source = t.source and a.alias_external_id = t.alias_external_id
      union all
       select
         'alias_external_mapping' as row_type,
         em.id::text as row_id,
         em.card_print_id::text as card_print_id,
         em.source,
         em.external_id,
         null::text as alias_kind,
         em.id::text as preserved_from_mapping_id,
         em.active::text as active
       from target t
       join public.external_mappings em on em.card_print_id = t.canonical_card_print_id and em.source = t.source and em.external_id = t.alias_external_id
      union all
       select
         'canonical_external_mapping' as row_type,
         em.id::text as row_id,
         em.card_print_id::text as card_print_id,
         em.source,
         em.external_id,
         null::text as alias_kind,
         null::text as preserved_from_mapping_id,
         em.active::text as active
       from target t
       join public.external_mappings em on em.card_print_id = t.canonical_card_print_id and em.source = t.source and em.external_id = t.canonical_external_id_to_keep
     )
     select *
     from rows
     order by row_type, source, external_id, row_id`,
    [JSON.stringify(targets)],
  );

  return {
    row_count: result.rows.length,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

async function executePackage(client, targets) {
  const insertResult = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         canonical_card_print_id uuid,
         source text,
         alias_external_id text,
         canonical_external_id_to_keep text,
         alias_kind text,
         alias_status text,
         source_domain text,
         evidence_reason text,
         created_from_audit text,
         metadata jsonb
       )
     ),
     resolved as (
       select
         t.*,
         canonical.id as canonical_external_mapping_id,
         alias.id as preserved_from_mapping_id
       from target t
       join public.external_mappings canonical
         on canonical.card_print_id = t.canonical_card_print_id
        and canonical.source = t.source
        and canonical.external_id = t.canonical_external_id_to_keep
        and canonical.active = true
       join public.external_mappings alias
         on alias.card_print_id = t.canonical_card_print_id
        and alias.source = t.source
        and alias.external_id = t.alias_external_id
        and alias.active = true
     ),
     inserted as (
       insert into public.external_mapping_aliases (
         canonical_card_print_id,
         canonical_external_mapping_id,
         source,
         alias_external_id,
         alias_kind,
         alias_status,
         source_domain,
         evidence_reason,
         preserved_from_mapping_id,
         created_from_audit,
         metadata,
         active
       )
       select
         canonical_card_print_id,
         canonical_external_mapping_id,
         source,
         alias_external_id,
         alias_kind,
         alias_status,
         source_domain,
         evidence_reason,
         preserved_from_mapping_id,
         created_from_audit,
         metadata,
         true
       from resolved
       returning preserved_from_mapping_id
     )
     select count(*)::int as inserted_alias_rows, count(distinct preserved_from_mapping_id)::int as distinct_preserved_mapping_rows
     from inserted`,
    [JSON.stringify(targets)],
  );

  const deactivateResult = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         canonical_card_print_id uuid,
         source text,
         alias_external_id text
       )
     ),
     alias_rows as (
       select a.preserved_from_mapping_id
       from target t
       join public.external_mapping_aliases a
         on a.canonical_card_print_id = t.canonical_card_print_id
        and a.source = t.source
        and a.alias_external_id = t.alias_external_id
        and a.active = true
     ),
     updated as (
       update public.external_mappings em
          set active = false
       from alias_rows a
       where em.id = a.preserved_from_mapping_id
         and em.active = true
       returning em.id
     )
     select count(*)::int as deactivated_mapping_rows
     from updated`,
    [JSON.stringify(targets)],
  );

  return {
    ...insertResult.rows[0],
    ...deactivateResult.rows[0],
  };
}

function stopFindings({ targets, preflight, beforeCounts, insideCounts, afterCounts, execution, beforeSnapshot, afterSnapshot }) {
  const findings = [];
  if (targets.length !== EXPECTED_ALIAS_ROWS) findings.push('target_alias_rows_not_expected_55');
  if (preflight.target_alias_rows !== targets.length) findings.push('preflight_target_count_mismatch');
  if (preflight.distinct_source_alias_rows !== targets.length) findings.push('duplicate_source_alias_targets');
  if (preflight.missing_canonical_external_id_count !== 0) findings.push('missing_canonical_external_id');
  if (preflight.alias_equals_canonical_count !== 0) findings.push('alias_equals_canonical');
  if (preflight.missing_active_canonical_mapping_count !== 0) findings.push('missing_active_canonical_mapping');
  if (preflight.missing_active_alias_mapping_count !== 0) findings.push('missing_active_alias_mapping');
  if (preflight.existing_active_alias_count !== 0) findings.push('existing_active_alias');
  if (beforeCounts.source_card_duplicate_groups !== EXPECTED_GROUPS_BEFORE) findings.push('unexpected_before_duplicate_groups');
  if (beforeCounts.source_external_duplicate_groups !== 0) findings.push('source_external_duplicates_before');
  if (execution.inserted_alias_rows !== targets.length) findings.push('inserted_alias_count_mismatch');
  if (execution.distinct_preserved_mapping_rows !== targets.length) findings.push('distinct_preserved_count_mismatch');
  if (execution.deactivated_mapping_rows !== targets.length) findings.push('deactivated_count_mismatch');
  if (insideCounts.source_card_duplicate_groups !== EXPECTED_GROUPS_AFTER) findings.push('unexpected_inside_duplicate_groups');
  if (insideCounts.source_external_duplicate_groups !== 0) findings.push('source_external_duplicates_inside');
  if (!APPLY && beforeSnapshot.hash_sha256 !== afterSnapshot.hash_sha256) findings.push('rollback_snapshot_hash_mismatch');
  if (APPLY && afterCounts.source_card_duplicate_groups !== EXPECTED_GROUPS_AFTER) findings.push('unexpected_after_duplicate_groups');
  return findings;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for residual alias cleanup.');

  const targets = await loadPlanTargets();
  const packageFingerprint = sha256(stableJson({ package_id: PACKAGE_ID, targets }));

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let transactionStatus = 'not_started';

  try {
    const preflight = await validateTargets(client, targets);
    const beforeCounts = await duplicateCounts(client);
    const beforeSnapshot = await captureSnapshot(client, targets);

    await client.query('begin');
    transactionStatus = APPLY ? 'started_apply_transaction' : 'started_rollback_only_transaction';
    const execution = await executePackage(client, targets);
    const insideCounts = await duplicateCounts(client);
    if (APPLY) {
      await client.query('commit');
      transactionStatus = 'committed';
    } else {
      await client.query('rollback');
      transactionStatus = 'rolled_back';
    }

    const afterCounts = await duplicateCounts(client);
    const afterSnapshot = await captureSnapshot(client, targets);
    const findings = stopFindings({ targets, preflight, beforeCounts, insideCounts, afterCounts, execution, beforeSnapshot, afterSnapshot });

    const report = {
      version: APPLY
        ? 'EXTERNAL_MAPPING_ALIAS_02A_RESIDUAL_ALIAS_CLEANUP_REAL_APPLY_V1'
        : 'EXTERNAL_MAPPING_ALIAS_02A_RESIDUAL_ALIAS_CLEANUP_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: APPLY ? 'real_apply' : 'rollback_only_dry_run',
      package_fingerprint_sha256: packageFingerprint,
      scope: {
        target_alias_rows: targets.length,
        target_mapping_deactivations: targets.length,
        tables_written: ['public.external_mapping_aliases', 'public.external_mappings.active'],
        forbidden: ['card_prints writes', 'card_printings writes', 'identity writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
        migrations_created: false,
        rows_deleted: 0,
      },
      preflight,
      before_counts: beforeCounts,
      inside_counts: insideCounts,
      after_counts: afterCounts,
      execution: { transaction_status: transactionStatus, ...execution },
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      by_alias_kind: countBy(targets, (row) => row.alias_kind),
      by_source: countBy(targets, (row) => row.source),
      target_samples: targets.slice(0, 30),
      stop_findings: findings,
      pass: findings.length === 0,
      recommended_next_step: APPLY
        ? 'Regenerate external mapping duplicate triage/readiness and preflight. Remaining duplicate groups should be blocked-only residuals.'
        : 'If pass is true, run this script with --apply.',
      recommended_approval_text: !APPLY && findings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} residual alias sidecar inserts and ${targets.length} preserved duplicate external_mappings active=false updates. Dry-run proof: ${beforeSnapshot.hash_sha256} == ${afterSnapshot.hash_sha256}; duplicate groups inside transaction ${beforeCounts.source_card_duplicate_groups} -> ${insideCounts.source_card_duplicate_groups}. No card_prints writes. No child writes. No identity writes. No deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      `# ${APPLY ? 'External Mapping Alias 02A Residual Alias Cleanup Real Apply V1' : 'External Mapping Alias 02A Residual Alias Cleanup Guarded Dry Run V1'}`,
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Mode: ${report.mode}`,
      `- Alias rows: ${targets.length}`,
      `- Inserted aliases: ${execution.inserted_alias_rows}`,
      `- Deactivated mappings: ${execution.deactivated_mapping_rows}`,
      `- Transaction status: ${transactionStatus}`,
      `- Duplicate groups before: ${beforeCounts.source_card_duplicate_groups}`,
      `- Duplicate groups inside transaction: ${insideCounts.source_card_duplicate_groups}`,
      `- Duplicate groups after: ${afterCounts.source_card_duplicate_groups}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      `- Before hash: \`${beforeSnapshot.hash_sha256}\``,
      `- After hash: \`${afterSnapshot.hash_sha256}\``,
      '',
      '## By Alias Kind',
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
      '- Image writes: false',
      '',
      '## Stop Findings',
      '',
      findings.length ? findings.map((finding) => `- ${finding}`).join('\n') : '_None._',
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
      alias_rows: targets.length,
      inserted_alias_rows: execution.inserted_alias_rows,
      deactivated_mapping_rows: execution.deactivated_mapping_rows,
      duplicate_groups: {
        before: beforeCounts.source_card_duplicate_groups,
        inside: insideCounts.source_card_duplicate_groups,
        after: afterCounts.source_card_duplicate_groups,
      },
      proof: `${beforeSnapshot.hash_sha256} == ${afterSnapshot.hash_sha256}`,
      recommended_approval_text: report.recommended_approval_text,
      stop_findings: findings,
    }, null, 2));
  } catch (error) {
    if (transactionStatus === 'started_apply_transaction' || transactionStatus === 'started_rollback_only_transaction') {
      try {
        await client.query('rollback');
      } catch {
        // Preserve original error.
      }
    }
    throw error;
  } finally {
    await client.end();
  }
}

await main();
