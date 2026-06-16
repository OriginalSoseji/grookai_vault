import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import { buildCardPrintGvIdV1 } from '../../backend/warehouse/buildCardPrintGvIdV1.mjs';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich17a_chaos_rising_parent_gv_id_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich17a_chaos_rising_parent_gv_id_guarded_dry_run_v1.md');

const PACKAGE_ID = 'ENRICH-17A-CHAOS-RISING-PARENT-GV-ID-BACKFILL';
const TARGET_SET_CODE = 'me04';
const TARGET_SET_NAME = 'Chaos Rising';
const SOURCE_OFFICIAL_ABBREV = 'CRI';
const EXPECTED_TARGET_ROWS = 122;

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
    `select
       cp.id::text as card_print_id,
       s.code as set_code,
       s.name as set_name,
       s.identity_domain_default,
       s.printed_set_abbrev,
       s.source #>> '{tcgdex,raw,abbreviation,official}' as source_official_abbrev,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cp.gv_id
     from public.card_prints cp
     join public.sets s on s.id = cp.set_id
     where s.code = $1
       and s.identity_domain_default = 'pokemon_eng_standard'
       and cp.gv_id is null
     order by cp.number_plain nulls last, cp.number nulls last, cp.name nulls last, cp.id`,
    [TARGET_SET_CODE],
  );

  return result.rows.map((row) => ({
    card_print_id: row.card_print_id,
    set_code: row.set_code,
    set_name: row.set_name,
    identity_domain_default: row.identity_domain_default,
    source_official_abbrev: row.source_official_abbrev,
    number: row.number,
    number_plain: row.number_plain,
    card_name: row.card_name,
    variant_key: row.variant_key,
    printed_identity_modifier: row.printed_identity_modifier,
    proposed_gv_id: buildCardPrintGvIdV1({
      setCode: row.set_code,
      printedSetAbbrev: SOURCE_OFFICIAL_ABBREV,
      number: row.number,
      numberPlain: row.number_plain,
      variantKey: row.variant_key,
    }),
  }));
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)
     )
     select
       cp.id::text as card_print_id,
       s.code as set_code,
       s.name as set_name,
       s.source #>> '{tcgdex,raw,abbreviation,official}' as source_official_abbrev,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cp.variant_key,
       cp.printed_identity_modifier,
       cp.gv_id
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     join public.sets s on s.id = cp.set_id
     order by cp.number_plain nulls last, cp.number nulls last, cp.name nulls last, cp.id`,
    [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id })))],
  );

  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      target_rows: targets.length,
      captured_rows: result.rows.length,
      rows_with_gv_id: result.rows.filter((row) => row.gv_id).length,
      rows_without_gv_id: result.rows.filter((row) => !row.gv_id).length,
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
         set_name text,
         identity_domain_default text,
         source_official_abbrev text,
         number text,
         number_plain text,
         card_name text,
         variant_key text,
         printed_identity_modifier text,
         proposed_gv_id text
       )
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_print_id)::int from target) as distinct_target_count,
       (select count(distinct proposed_gv_id)::int from target) as distinct_proposed_gv_count,
       (select count(*)::int from target where proposed_gv_id is null or btrim(proposed_gv_id) = '') as missing_proposed_gv_count,
       (select count(*)::int from target where set_code <> $2) as non_target_set_count,
       (select count(*)::int from target where source_official_abbrev <> $3) as source_abbrev_mismatch_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int
        from target
        join public.card_prints cp on cp.id = target.card_print_id
        join public.sets s on s.id = cp.set_id
        where s.code <> $2
           or s.name <> $4
           or s.identity_domain_default is distinct from 'pokemon_eng_standard'
           or s.source #>> '{tcgdex,raw,abbreviation,official}' is distinct from $3) as out_of_scope_parent_count,
       (select count(*)::int from target join public.card_prints cp on cp.id = target.card_print_id where cp.gv_id is not null) as target_already_has_gv_count,
       (select count(*)::int from target join public.card_prints cp on cp.gv_id = target.proposed_gv_id and cp.id <> target.card_print_id) as existing_gv_collision_count,
       (select count(*)::int from (
          select proposed_gv_id
          from target
          group by proposed_gv_id
          having count(*) > 1
        ) dup) as batch_duplicate_gv_count`,
    [JSON.stringify(targets), TARGET_SET_CODE, SOURCE_OFFICIAL_ABBREV, TARGET_SET_NAME],
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
      `create temporary table enrich17a_targets (
         card_print_id uuid primary key,
         set_code text,
         set_name text,
         identity_domain_default text,
         source_official_abbrev text,
         number text,
         number_plain text,
         card_name text,
         variant_key text,
         printed_identity_modifier text,
         proposed_gv_id text not null
       ) on commit drop`,
    );

    await client.query(
      `insert into enrich17a_targets
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_code text,
         set_name text,
         identity_domain_default text,
         source_official_abbrev text,
         number text,
         number_plain text,
         card_name text,
         variant_key text,
         printed_identity_modifier text,
         proposed_gv_id text
       )`,
      [JSON.stringify(targets)],
    );

    const guard = await validateScope(client, targets);
    if (
      guard.target_count !== targets.length ||
      guard.distinct_target_count !== targets.length ||
      guard.distinct_proposed_gv_count !== targets.length ||
      guard.missing_proposed_gv_count !== 0 ||
      guard.non_target_set_count !== 0 ||
      guard.source_abbrev_mismatch_count !== 0 ||
      guard.missing_parent_count !== 0 ||
      guard.out_of_scope_parent_count !== 0 ||
      guard.target_already_has_gv_count !== 0 ||
      guard.existing_gv_collision_count !== 0 ||
      guard.batch_duplicate_gv_count !== 0
    ) {
      throw new Error(`guard failed: ${JSON.stringify(guard)}`);
    }

    const updated = await client.query(
      `update public.card_prints cp
       set gv_id = target.proposed_gv_id,
           updated_at = now()
       from enrich17a_targets target
       where cp.id = target.card_print_id
       returning cp.id::text as card_print_id, cp.gv_id`,
    );

    const proof = await client.query(
      `select
         (select count(*)::int from enrich17a_targets) as target_count,
         (select count(*)::int
          from enrich17a_targets target
          join public.card_prints cp on cp.id = target.card_print_id
          where cp.gv_id = target.proposed_gv_id) as matching_gv_count,
         (select count(*)::int from (
            select gv_id
            from public.card_prints
            where gv_id is not null
            group by gv_id
            having count(*) > 1
            limit 1
          ) dup) as duplicate_gv_id_exists`,
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

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const targets = await loadTargets(client);
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      target_set_code: TARGET_SET_CODE,
      target_set_name: TARGET_SET_NAME,
      namespace_evidence: {
        source_key: 'tcgdex',
        source_path: 'sets.source.tcgdex.raw.abbreviation.official',
        value: SOURCE_OFFICIAL_ABBREV,
      },
      targets,
    }));
    const preflight = await validateScope(client, targets);
    const execution = await runRollbackDryRun(client, targets);
    const stop_findings = [];

    if (targets.length !== EXPECTED_TARGET_ROWS) stop_findings.push(`target_count_drift:${targets.length}`);
    if (preflight.target_count !== targets.length) stop_findings.push('preflight_target_count_mismatch');
    if (preflight.distinct_target_count !== targets.length) stop_findings.push('duplicate_target_parent_ids');
    if (preflight.distinct_proposed_gv_count !== targets.length) stop_findings.push('duplicate_proposed_gv_ids');
    if (preflight.missing_proposed_gv_count !== 0) stop_findings.push('missing_proposed_gv_ids');
    if (preflight.non_target_set_count !== 0) stop_findings.push('non_target_set_rows');
    if (preflight.source_abbrev_mismatch_count !== 0) stop_findings.push('source_abbrev_mismatch');
    if (preflight.missing_parent_count !== 0) stop_findings.push('missing_target_parents');
    if (preflight.out_of_scope_parent_count !== 0) stop_findings.push('out_of_scope_parent_rows');
    if (preflight.target_already_has_gv_count !== 0) stop_findings.push('target_already_has_gv_id');
    if (preflight.existing_gv_collision_count !== 0) stop_findings.push('existing_gv_id_collision');
    if (preflight.batch_duplicate_gv_count !== 0) stop_findings.push('batch_duplicate_gv_id');
    if (execution.dry_run_status !== 'completed_rolled_back_no_durable_change') stop_findings.push(execution.dry_run_status);
    if (execution.inside_transaction_proof?.updated_rows !== targets.length) stop_findings.push('updated_row_count_mismatch');
    if (execution.inside_transaction_proof?.proof?.matching_gv_count !== targets.length) stop_findings.push('matching_gv_count_mismatch');
    if (execution.inside_transaction_proof?.proof?.duplicate_gv_id_exists !== 0) stop_findings.push('duplicate_gv_id_after_update');

    const report = {
      version: 'ENRICH17A_CHAOS_RISING_PARENT_GV_ID_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      scope: {
        target_set_code: TARGET_SET_CODE,
        target_set_name: TARGET_SET_NAME,
        target_rows: targets.length,
        writes_simulated_then_rolled_back: ['card_prints.gv_id'],
        forbidden: ['child writes', 'identity writes', 'external mapping writes', 'species writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
        durable_db_writes_performed: false,
        migrations_created: false,
      },
      namespace_evidence: {
        source_key: 'tcgdex',
        source_kind: 'preserved_structured_source_payload',
        source_path: 'public.sets.source.tcgdex.raw.abbreviation.official',
        value: SOURCE_OFFICIAL_ABBREV,
        governance_note: 'Chaos Rising parent GV IDs use the preserved official TCGdex abbreviation instead of defaulting to set_code me04.',
      },
      preflight,
      execution,
      by_set: countBy(targets, (row) => row.set_code),
      proposed_gv_samples: targets.slice(0, 20).map((row) => ({
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        number: row.number,
        card_name: row.card_name,
        proposed_gv_id: row.proposed_gv_id,
      })),
      stop_findings,
      pass: stop_findings.length === 0,
      recommended_approval_text: stop_findings.length === 0
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: ${targets.length} Chaos Rising parent card_print gv_id updates using source-backed CRI namespace. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No child writes. No identity writes. No external mapping writes. No species writes. No deletes. No merges. No migrations. No image writes. No global apply.`
        : null,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-17A Chaos Rising Parent GV-ID Guarded Dry Run V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target set: ${TARGET_SET_CODE} / ${TARGET_SET_NAME}`,
      `- Target rows: ${targets.length}`,
      `- Updated inside transaction: ${execution.inside_transaction_proof?.updated_rows ?? 0}`,
      `- Dry-run status: ${execution.dry_run_status}`,
      `- Before hash: \`${execution.before_snapshot.hash_sha256}\``,
      `- After rollback hash: \`${execution.after_rollback_snapshot.hash_sha256}\``,
      `- Package fingerprint: \`${packageFingerprint}\``,
      '',
      '## Namespace Evidence',
      '',
      `- Source: \`public.sets.source.tcgdex.raw.abbreviation.official\``,
      `- Value: \`${SOURCE_OFFICIAL_ABBREV}\``,
      '- Governance: uses source-backed `CRI`, not default `me04`.',
      '',
      '## Safety',
      '',
      '- Durable DB writes performed: false',
      '- Migrations created: false',
      '- Child writes: false',
      '- Identity writes: false',
      '- External mapping/species writes: false',
      '- Deletes/merges: false',
      '- Image writes: false',
      '',
      '## Proposed GV-ID Samples',
      '',
      markdownTable(report.proposed_gv_samples, [
        { label: 'number', value: (row) => row.number },
        { label: 'card_name', value: (row) => row.card_name },
        { label: 'proposed_gv_id', value: (row) => row.proposed_gv_id },
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
