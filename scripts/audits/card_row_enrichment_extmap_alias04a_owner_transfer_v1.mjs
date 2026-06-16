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
const PLAN_JSON = path.join(OUTPUT_DIR, 'external_mapping_alias_residual_governance_plan_v1.json');
const PACKAGE_ID = 'EXTMAP-ALIAS-04A-POKEMONAPI-SUFFIX-OWNER-TRANSFER';
const REPORT_BASENAME = APPLY
  ? 'external_mapping_alias_04a_pokemonapi_suffix_owner_transfer_real_apply_v1'
  : 'external_mapping_alias_04a_pokemonapi_suffix_owner_transfer_guarded_dry_run_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, `${REPORT_BASENAME}.json`);
const OUTPUT_MD = path.join(OUTPUT_DIR, `${REPORT_BASENAME}.md`);
const EXPECTED_TRANSFER_ROWS = 8;
const EXPECTED_GROUPS_BEFORE = 13;
const EXPECTED_GROUPS_AFTER = 5;

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
  const plan = JSON.parse(await fs.readFile(PLAN_JSON, 'utf8'));
  const targets = [];
  for (const group of plan.blocked_groups ?? []) {
    if (group.actionability !== 'blocked_pending_owner_transfer_design') continue;
    for (const externalId of group.transfer_candidate_external_ids ?? []) {
      const owner = (group.owner_facts ?? []).find((fact) => (
        fact.external_id === externalId
        && fact.owner_card_print_id
        && fact.owner_card_print_id !== group.card_print_id
      ));
      if (!owner) continue;
      targets.push({
        source: group.source,
        external_id: externalId,
        from_card_print_id: group.card_print_id,
        to_card_print_id: owner.owner_card_print_id,
        from_gv_id: group.gv_id,
        to_gv_id: owner.owner_gv_id,
        set_code: group.set_code,
        from_number: group.number,
        to_number: owner.number,
        card_name: group.card_name,
        to_name: owner.name,
        governance_fingerprint_sha256: plan.fingerprint_sha256,
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
      ) groups) as source_external_duplicate_groups
  `);
  return result.rows[0];
}

async function validateTargets(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         source text,
         external_id text,
         from_card_print_id uuid,
         to_card_print_id uuid
       )
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct source || '|' || external_id)::int from target) as distinct_source_external_count,
       (select count(*)::int from target where source <> 'pokemonapi') as non_pokemonapi_count,
       (select count(*)::int from target where from_card_print_id = to_card_print_id) as same_owner_count,
       (select count(*)::int from target t left join public.external_mappings em on em.card_print_id = t.from_card_print_id and em.source = t.source and em.external_id = t.external_id and em.active = true where em.id is null) as missing_source_mapping_count,
       (select count(*)::int from target t join public.external_mappings em on em.card_print_id = t.to_card_print_id and em.source = t.source and em.external_id = t.external_id and em.active = true) as owner_collision_count,
       (select count(*)::int from target t left join public.card_prints cp on cp.id = t.to_card_print_id where cp.id is null) as missing_owner_count,
       (select count(*)::int from target t left join public.card_prints cp on cp.id = t.from_card_print_id where cp.id is null) as missing_source_parent_count
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
         source text,
         external_id text,
         from_card_print_id uuid,
         to_card_print_id uuid
       )
     ),
     rows as (
       select
         'transfer_mapping' as row_type,
         em.id::text as row_id,
         em.card_print_id::text as card_print_id,
         em.source,
         em.external_id,
         em.active::text as active,
         em.meta
       from target t
       join public.external_mappings em on em.source = t.source and em.external_id = t.external_id
      union all
       select
         'from_parent' as row_type,
         cp.id::text as row_id,
         cp.id::text as card_print_id,
         null::text as source,
         cp.gv_id as external_id,
         null::text as active,
         null::jsonb as meta
       from target t
       join public.card_prints cp on cp.id = t.from_card_print_id
      union all
       select
         'to_parent' as row_type,
         cp.id::text as row_id,
         cp.id::text as card_print_id,
         null::text as source,
         cp.gv_id as external_id,
         null::text as active,
         null::jsonb as meta
       from target t
       join public.card_prints cp on cp.id = t.to_card_print_id
     )
     select *
     from rows
     order by row_type, source nulls last, external_id, row_id`,
    [JSON.stringify(targets)],
  );

  return {
    row_count: result.rows.length,
    counts: countBy(result.rows, (row) => row.row_type),
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function executeTransfer(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         source text,
         external_id text,
         from_card_print_id uuid,
         to_card_print_id uuid,
         from_gv_id text,
         to_gv_id text,
         set_code text,
         from_number text,
         to_number text,
         governance_fingerprint_sha256 text
       )
     ),
     updated as (
       update public.external_mappings em
          set card_print_id = t.to_card_print_id,
              meta = coalesce(em.meta, '{}'::jsonb) || jsonb_build_object(
                'owner_transfer_package', $2::text,
                'previous_card_print_id', t.from_card_print_id::text,
                'new_card_print_id', t.to_card_print_id::text,
                'previous_gv_id', t.from_gv_id,
                'new_gv_id', t.to_gv_id,
                'previous_number', t.from_number,
                'new_number', t.to_number,
                'governance_fingerprint_sha256', t.governance_fingerprint_sha256
              )
       from target t
       where em.card_print_id = t.from_card_print_id
         and em.source = t.source
         and em.external_id = t.external_id
         and em.active = true
       returning em.id, em.card_print_id
     )
     select count(*)::int as transferred_rows, count(distinct id)::int as distinct_transferred_rows
     from updated`,
    [JSON.stringify(targets), PACKAGE_ID],
  );
  return result.rows[0];
}

function stopFindings({ targets, preflight, beforeCounts, insideCounts, afterCounts, execution, beforeSnapshot, afterSnapshot }) {
  const findings = [];
  if (targets.length !== EXPECTED_TRANSFER_ROWS) findings.push('target_count_not_expected_8');
  if (preflight.target_count !== targets.length) findings.push('preflight_target_count_mismatch');
  if (preflight.distinct_source_external_count !== targets.length) findings.push('duplicate_source_external_targets');
  if (preflight.non_pokemonapi_count !== 0) findings.push('non_pokemonapi_target');
  if (preflight.same_owner_count !== 0) findings.push('same_owner_target');
  if (preflight.missing_source_mapping_count !== 0) findings.push('missing_source_mapping');
  if (preflight.owner_collision_count !== 0) findings.push('owner_collision');
  if (preflight.missing_owner_count !== 0) findings.push('missing_owner');
  if (preflight.missing_source_parent_count !== 0) findings.push('missing_source_parent');
  if (beforeCounts.source_card_duplicate_groups !== EXPECTED_GROUPS_BEFORE) findings.push('unexpected_before_duplicate_groups');
  if (beforeCounts.source_external_duplicate_groups !== 0) findings.push('source_external_duplicates_before');
  if (execution.transferred_rows !== targets.length) findings.push('transferred_row_count_mismatch');
  if (execution.distinct_transferred_rows !== targets.length) findings.push('distinct_transfer_count_mismatch');
  if (insideCounts.source_card_duplicate_groups !== EXPECTED_GROUPS_AFTER) findings.push('unexpected_inside_duplicate_groups');
  if (insideCounts.source_external_duplicate_groups !== 0) findings.push('source_external_duplicates_inside');
  if (!APPLY && beforeSnapshot.hash_sha256 !== afterSnapshot.hash_sha256) findings.push('rollback_snapshot_hash_mismatch');
  if (APPLY && afterCounts.source_card_duplicate_groups !== EXPECTED_GROUPS_AFTER) findings.push('unexpected_after_duplicate_groups');
  return findings;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for owner transfer.');

  const targets = await loadTargets();
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
    const execution = await executeTransfer(client, targets);
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
        ? 'EXTERNAL_MAPPING_ALIAS_04A_POKEMONAPI_SUFFIX_OWNER_TRANSFER_REAL_APPLY_V1'
        : 'EXTERNAL_MAPPING_ALIAS_04A_POKEMONAPI_SUFFIX_OWNER_TRANSFER_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: APPLY ? 'real_apply' : 'rollback_only_dry_run',
      package_fingerprint_sha256: packageFingerprint,
      scope: {
        target_transfer_rows: targets.length,
        table_written: ['public.external_mappings.card_print_id', 'public.external_mappings.meta'],
        forbidden: ['card_prints writes', 'card_printings writes', 'identity writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
        rows_deleted: 0,
        migrations_created: false,
      },
      preflight,
      before_counts: beforeCounts,
      inside_counts: insideCounts,
      after_counts: afterCounts,
      execution: { transaction_status: transactionStatus, ...execution },
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot,
      targets,
      stop_findings: findings,
      pass: findings.length === 0,
      recommended_approval_text: !APPLY && findings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} PokemonAPI external_mapping owner transfers to suffix/base owner parents. Dry-run proof: ${beforeSnapshot.hash_sha256} == ${afterSnapshot.hash_sha256}; duplicate groups inside transaction ${beforeCounts.source_card_duplicate_groups} -> ${insideCounts.source_card_duplicate_groups}. No card_prints writes. No child writes. No identity writes. No deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };

    await writeJson(OUTPUT_JSON, report);
    const md = [
      `# ${APPLY ? 'External Mapping Alias 04A PokemonAPI Suffix Owner Transfer Real Apply V1' : 'External Mapping Alias 04A PokemonAPI Suffix Owner Transfer Guarded Dry Run V1'}`,
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Mode: ${report.mode}`,
      `- Transfer rows: ${targets.length}`,
      `- Transferred rows: ${execution.transferred_rows}`,
      `- Transaction status: ${transactionStatus}`,
      `- Duplicate groups before: ${beforeCounts.source_card_duplicate_groups}`,
      `- Duplicate groups inside transaction: ${insideCounts.source_card_duplicate_groups}`,
      `- Duplicate groups after: ${afterCounts.source_card_duplicate_groups}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      `- Before hash: \`${beforeSnapshot.hash_sha256}\``,
      `- After hash: \`${afterSnapshot.hash_sha256}\``,
      '',
      '## Transfers',
      '',
      markdownTable(targets, [
        { label: 'source', value: (row) => row.source },
        { label: 'external_id', value: (row) => row.external_id },
        { label: 'from', value: (row) => row.from_gv_id },
        { label: 'to', value: (row) => row.to_gv_id },
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
      transfer_rows: targets.length,
      transferred_rows: execution.transferred_rows,
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
