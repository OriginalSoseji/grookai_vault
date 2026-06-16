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
const READINESS_JSON = path.join(OUTPUT_DIR, 'external_mapping_alias_sidecar_readiness_v1.json');
const PACKAGE_ID = 'EXTMAP-ALIAS-01B-PRODUCT-ALIAS-PRESERVATION';
const REPORT_BASENAME = APPLY
  ? 'external_mapping_alias_01b_product_alias_preservation_real_apply_v1'
  : 'external_mapping_alias_01b_product_alias_preservation_guarded_dry_run_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, `${REPORT_BASENAME}.json`);
const OUTPUT_MD = path.join(OUTPUT_DIR, `${REPORT_BASENAME}.md`);
const EXPECTED_TARGET_ROWS = 214;
const ALLOWED_ALIAS_KINDS = new Set([
  'battle_academy_alias',
  'league_alias',
  'prerelease_alias',
  'prize_pack_alias',
  'product_alias',
]);

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

async function loadTargets() {
  const raw = await fs.readFile(READINESS_JSON, 'utf8');
  const readiness = JSON.parse(raw);
  const rows = readiness.projected_alias_rows ?? [];

  return rows.map((row) => ({
    canonical_card_print_id: row.canonical_card_print_id,
    source: row.source,
    alias_external_id: row.alias_external_id,
    alias_kind: row.alias_kind,
    alias_status: row.alias_status,
    source_domain: row.source_domain,
    evidence_reason: row.evidence_reason,
    preserved_from_mapping_id: Number(row.preserved_from_mapping_id),
    created_from_audit: row.created_from_audit,
    canonical_external_id_to_keep: row.canonical_external_id_to_keep,
    metadata: {
      canonical_gv_id: row.canonical_gv_id,
      set_code: row.set_code,
      card_name: row.card_name,
      card_number: row.card_number,
      canonical_external_id_to_keep: row.canonical_external_id_to_keep,
      readiness_fingerprint_sha256: readiness.fingerprint_sha256,
    },
  }));
}

async function validateTargets(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         canonical_card_print_id uuid,
         source text,
         alias_external_id text,
         alias_kind text,
         alias_status text,
         source_domain text,
         evidence_reason text,
         preserved_from_mapping_id bigint,
         created_from_audit text,
         canonical_external_id_to_keep text,
         metadata jsonb
       )
     ),
     canonical_mapping as (
       select t.*, em.id as canonical_external_mapping_id, em.active as canonical_active
       from target t
       left join public.external_mappings em
         on em.card_print_id = t.canonical_card_print_id
        and em.source = t.source
        and em.external_id = t.canonical_external_id_to_keep
        and em.active = true
     ),
     alias_mapping as (
       select t.*, em.id as alias_mapping_id, em.card_print_id as alias_card_print_id, em.source as alias_source, em.external_id as alias_external_id_found, em.active as alias_active
       from target t
       left join public.external_mappings em on em.id = t.preserved_from_mapping_id
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct source || '|' || alias_external_id)::int from target) as distinct_source_alias_count,
       (select count(distinct preserved_from_mapping_id)::int from target) as distinct_preserved_mapping_count,
       (select count(*)::int from target where source <> 'justtcg') as non_justtcg_count,
       (select count(*)::int from target where alias_kind <> all($2::text[])) as disallowed_alias_kind_count,
       (select count(*)::int from target where alias_status is null or btrim(alias_status) = '') as blank_alias_status_count,
       (select count(*)::int from target where evidence_reason is null or btrim(evidence_reason) = '') as blank_evidence_reason_count,
       (select count(*)::int from target where created_from_audit <> 'external_mapping_alias_sidecar_readiness_v1') as unexpected_audit_source_count,
       (select count(*)::int from canonical_mapping where canonical_external_mapping_id is null) as missing_canonical_mapping_count,
       (select count(*)::int from alias_mapping where alias_mapping_id is null) as missing_preserved_mapping_count,
       (select count(*)::int from alias_mapping where alias_mapping_id is not null and alias_card_print_id <> canonical_card_print_id) as preserved_mapping_wrong_parent_count,
       (select count(*)::int from alias_mapping where alias_mapping_id is not null and alias_source <> source) as preserved_mapping_wrong_source_count,
       (select count(*)::int from alias_mapping where alias_mapping_id is not null and alias_external_id_found <> alias_external_id) as preserved_mapping_wrong_external_id_count,
       (select count(*)::int from alias_mapping where alias_mapping_id is not null and alias_active is not true) as preserved_mapping_inactive_count,
       (select count(*)::int from target where alias_external_id = canonical_external_id_to_keep) as alias_equals_canonical_count,
       (select count(*)::int from target t join public.external_mapping_aliases a on a.source = t.source and a.alias_external_id = t.alias_external_id and a.active = true) as existing_active_alias_count
    `,
    [JSON.stringify(targets), [...ALLOWED_ALIAS_KINDS]],
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
         preserved_from_mapping_id bigint,
         canonical_external_id_to_keep text
       )
     ),
     rows as (
       select
         'external_mapping_aliases' as row_type,
         a.id::text as row_id,
         a.canonical_card_print_id::text as card_print_id,
         a.canonical_external_mapping_id::text as canonical_external_mapping_id,
         a.source,
         a.alias_external_id,
         a.alias_kind,
         a.alias_status,
         a.preserved_from_mapping_id::text as preserved_from_mapping_id,
         a.active::text as active
       from target t
       join public.external_mapping_aliases a
         on a.source = t.source
        and a.alias_external_id = t.alias_external_id
      union all
       select
         'canonical_external_mappings' as row_type,
         em.id::text as row_id,
         em.card_print_id::text as card_print_id,
         em.id::text as canonical_external_mapping_id,
         em.source,
         em.external_id as alias_external_id,
         null::text as alias_kind,
         null::text as alias_status,
         null::text as preserved_from_mapping_id,
         em.active::text as active
       from target t
       join public.external_mappings em
         on em.card_print_id = t.canonical_card_print_id
        and em.source = t.source
        and em.external_id = t.canonical_external_id_to_keep
      union all
       select
         'preserved_external_mappings' as row_type,
         em.id::text as row_id,
         em.card_print_id::text as card_print_id,
         null::text as canonical_external_mapping_id,
         em.source,
         em.external_id as alias_external_id,
         null::text as alias_kind,
         null::text as alias_status,
         em.id::text as preserved_from_mapping_id,
         em.active::text as active
       from target t
       join public.external_mappings em on em.id = t.preserved_from_mapping_id
     )
     select *
     from rows
     order by row_type, source, alias_external_id, row_id`,
    [JSON.stringify(targets)],
  );

  return {
    captured_at: new Date().toISOString(),
    row_count: result.rows.length,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: countBy(result.rows, (row) => row.row_type),
  };
}

async function insertAliases(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         canonical_card_print_id uuid,
         source text,
         alias_external_id text,
         alias_kind text,
         alias_status text,
         source_domain text,
         evidence_reason text,
         preserved_from_mapping_id bigint,
         created_from_audit text,
         canonical_external_id_to_keep text,
         metadata jsonb
       )
     ),
     resolved as (
       select
         t.*,
         em.id as canonical_external_mapping_id
       from target t
       join public.external_mappings em
         on em.card_print_id = t.canonical_card_print_id
        and em.source = t.source
        and em.external_id = t.canonical_external_id_to_keep
        and em.active = true
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
       returning *
     )
     select
       (select count(*)::int from inserted) as inserted_rows,
       (select count(distinct source || '|' || alias_external_id)::int from inserted) as distinct_source_alias_rows,
       (select count(distinct preserved_from_mapping_id)::int from inserted) as distinct_preserved_mapping_rows,
       coalesce((
         select jsonb_object_agg(alias_kind, rows order by alias_kind)
         from (
           select alias_kind, count(*)::int as rows
           from inserted
           group by alias_kind
         ) grouped
       ), '{}'::jsonb) as inserted_by_alias_kind`,
    [JSON.stringify(targets)],
  );

  return result.rows[0];
}

function stopFindings(preflight, execution, targets) {
  const findings = [];
  if (targets.length !== EXPECTED_TARGET_ROWS) findings.push('target_count_not_expected_214');
  if (preflight.target_count !== targets.length) findings.push('preflight_target_count_mismatch');
  if (preflight.distinct_source_alias_count !== targets.length) findings.push('duplicate_source_alias_in_targets');
  if (preflight.distinct_preserved_mapping_count !== targets.length) findings.push('duplicate_preserved_mapping_in_targets');
  if (preflight.non_justtcg_count !== 0) findings.push('unexpected_non_justtcg_source');
  if (preflight.disallowed_alias_kind_count !== 0) findings.push('disallowed_alias_kind');
  if (preflight.blank_alias_status_count !== 0) findings.push('blank_alias_status');
  if (preflight.blank_evidence_reason_count !== 0) findings.push('blank_evidence_reason');
  if (preflight.unexpected_audit_source_count !== 0) findings.push('unexpected_audit_source');
  if (preflight.missing_canonical_mapping_count !== 0) findings.push('missing_canonical_mapping');
  if (preflight.missing_preserved_mapping_count !== 0) findings.push('missing_preserved_mapping');
  if (preflight.preserved_mapping_wrong_parent_count !== 0) findings.push('preserved_mapping_wrong_parent');
  if (preflight.preserved_mapping_wrong_source_count !== 0) findings.push('preserved_mapping_wrong_source');
  if (preflight.preserved_mapping_wrong_external_id_count !== 0) findings.push('preserved_mapping_wrong_external_id');
  if (preflight.preserved_mapping_inactive_count !== 0) findings.push('preserved_mapping_inactive');
  if (preflight.alias_equals_canonical_count !== 0) findings.push('alias_equals_canonical');
  if (preflight.existing_active_alias_count !== 0) findings.push('existing_active_alias_rows');
  if (execution?.inserted_rows !== targets.length) findings.push('inserted_row_count_mismatch');
  if (execution?.distinct_source_alias_rows !== targets.length) findings.push('inserted_distinct_source_alias_mismatch');
  if (execution?.distinct_preserved_mapping_rows !== targets.length) findings.push('inserted_distinct_preserved_mapping_mismatch');
  return findings;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for external mapping alias preservation.');

  const targets = await loadTargets();
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    targets,
  }));

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let beforeSnapshot;
  let afterSnapshot;
  let preflight;
  let execution = null;
  let transactionStatus = 'not_started';

  try {
    preflight = await validateTargets(client, targets);
    const preflightFindings = stopFindings(preflight, { inserted_rows: targets.length, distinct_source_alias_rows: targets.length, distinct_preserved_mapping_rows: targets.length }, targets);

    beforeSnapshot = await captureSnapshot(client, targets);

    if (preflightFindings.length === 0) {
      await client.query('begin');
      transactionStatus = APPLY ? 'started_apply_transaction' : 'started_rollback_only_transaction';
      execution = await insertAliases(client, targets);
      if (APPLY) {
        await client.query('commit');
        transactionStatus = 'committed';
      } else {
        await client.query('rollback');
        transactionStatus = 'rolled_back';
      }
    } else {
      transactionStatus = 'blocked_before_transaction';
      execution = {
        inserted_rows: 0,
        distinct_source_alias_rows: 0,
        distinct_preserved_mapping_rows: 0,
        inserted_by_alias_kind: {},
      };
    }

    afterSnapshot = await captureSnapshot(client, targets);

    const findings = stopFindings(preflight, execution, targets);
    if (!APPLY && beforeSnapshot.hash_sha256 !== afterSnapshot.hash_sha256) findings.push('rollback_snapshot_hash_mismatch');
    if (APPLY && afterSnapshot.counts.external_mapping_aliases !== targets.length) findings.push('post_apply_alias_snapshot_count_mismatch');

    const report = {
      version: APPLY
        ? 'EXTERNAL_MAPPING_ALIAS_01B_PRODUCT_ALIAS_PRESERVATION_REAL_APPLY_V1'
        : 'EXTERNAL_MAPPING_ALIAS_01B_PRODUCT_ALIAS_PRESERVATION_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: APPLY ? 'real_apply' : 'rollback_only_dry_run',
      package_fingerprint_sha256: packageFingerprint,
      scope: {
        target_alias_rows: targets.length,
        table_written: preflightFindings.length === 0 ? ['public.external_mapping_aliases'] : [],
        forbidden: [
          'card_prints writes',
          'card_printings writes',
          'card_print_identity writes',
          'external_mappings writes',
          'external_mappings deactivation',
          'deletes',
          'merges',
          'migrations',
          'image writes',
          'global apply',
        ],
        external_mappings_deactivated: 0,
        migrations_created: false,
      },
      preflight,
      execution: {
        transaction_status: transactionStatus,
        ...execution,
      },
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      by_alias_kind: countBy(targets, (row) => row.alias_kind),
      by_source: countBy(targets, (row) => row.source),
      target_samples: targets.slice(0, 30),
      stop_findings: findings,
      pass: findings.length === 0,
      recommended_next_step: APPLY
        ? 'Prepare guarded dry-run for deactivating the preserved duplicate external_mappings rows now that aliases exist in the sidecar.'
        : 'If pass is true, run this script with --apply to preserve aliases in public.external_mapping_aliases.',
      recommended_approval_text: !APPLY && findings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} external_mapping_aliases inserts preserving product/source aliases before duplicate mapping deactivation. Dry-run proof: ${beforeSnapshot.hash_sha256} == ${afterSnapshot.hash_sha256}. No card_prints writes. No child writes. No identity writes. No external_mappings deactivation. No deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      `# ${APPLY ? 'External Mapping Alias 01B Product Alias Preservation Real Apply V1' : 'External Mapping Alias 01B Product Alias Preservation Guarded Dry Run V1'}`,
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Mode: ${report.mode}`,
      `- Target alias rows: ${targets.length}`,
      `- Inserted rows: ${execution?.inserted_rows ?? 0}`,
      `- Transaction status: ${transactionStatus}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      `- Before hash: \`${beforeSnapshot.hash_sha256}\``,
      `- After hash: \`${afterSnapshot.hash_sha256}\``,
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
      '- `external_mappings` deactivated: 0',
      '- Card parent writes: false',
      '- Child printing writes: false',
      '- Identity writes: false',
      '- Deletes/merges: false',
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
      target_alias_rows: targets.length,
      inserted_rows: execution?.inserted_rows ?? 0,
      transaction_status: transactionStatus,
      proof: `${beforeSnapshot.hash_sha256} == ${afterSnapshot.hash_sha256}`,
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
