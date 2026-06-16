import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich13b1_tcg_pocket_domain_reclassification_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich13b1_tcg_pocket_domain_reclassification_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich13b1_tcg_pocket_domain_reclassification_real_apply_v1.md');
const PACKAGE_ID = 'ENRICH-13B1-TCG-POCKET-DOMAIN-RECLASSIFICATION';
const TARGET_SET_CODES = ['A3a', 'P-A'];
const TARGET_DOMAIN = 'tcg_pocket_excluded';
const TARGET_SOURCE_DOMAIN = 'tcg_pocket';
const EXPECTED_FINGERPRINT = '5f5ebd12c51c5f7da47a7ccf0b98c55c377af8dc5adcb194357d51c419ac6ed0';
const EXPECTED_DRY_RUN_PROOF = '048e669ed8f2e5fb15d472e51dba77c92505374038181b90ac53ace8a5b38f41';
const EXPECTED_SET_ROWS = 2;
const EXPECTED_PARENT_ROWS = 203;
const EXPECTED_CHILD_ROWS = 609;
const EXPECTED_ACTIVE_IDENTITY_ROWS = 203;
const EXPECTED_ACTIVE_MAPPING_ROWS = 203;
const APPROVAL_TEXT = 'Approve real ENRICH-13B1-TCG-POCKET-DOMAIN-RECLASSIFICATION apply only. Fingerprint: 5f5ebd12c51c5f7da47a7ccf0b98c55c377af8dc5adcb194357d51c419ac6ed0. Scope: 2 Pocket-like set domain reclassifications for A3a/Extradimensional Crisis and P-A/Promos-A; updates sets.source.domain, sets.identity_domain_default, 203 card_prints.identity_domain rows, and deactivates 203 active card_print_identity rows because excluded Pocket rows cannot remain active physical identities. Dry-run proof: 048e669ed8f2e5fb15d472e51dba77c92505374038181b90ac53ace8a5b38f41 == 048e669ed8f2e5fb15d472e51dba77c92505374038181b90ac53ace8a5b38f41. No child writes. No GV-ID writes. No external mapping writes. No species writes. No trait writes. No deletes. No merges. No migrations. No image writes. No global apply.';

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

async function loadTargets(client) {
  const result = await client.query(
    `select
       s.id::text as set_id,
       s.code as set_code,
       s.name as set_name,
       s.identity_domain_default,
       s.source,
       coalesce(s.source->>'domain', '') as source_domain,
       s.source->'tcgdex'->>'id' as tcgdex_id,
       count(distinct cp.id)::int as parent_rows,
       count(distinct cpr.id)::int as child_rows,
       count(distinct cpi.id) filter (where cpi.is_active = true)::int as active_identity_rows,
       count(distinct em.id) filter (where em.active = true)::int as active_mapping_rows,
       count(distinct vii.id) filter (where vii.archived_at is null)::int as vault_reference_rows
     from public.sets s
     left join public.card_prints cp on cp.set_id = s.id
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     left join public.card_print_identity cpi on cpi.card_print_id = cp.id
     left join public.external_mappings em on em.card_print_id = cp.id
     left join public.vault_item_instances vii on vii.card_print_id = cp.id
     where s.code = any($1::text[])
     group by s.id
     order by s.code`,
    [TARGET_SET_CODES],
  );
  return result.rows;
}

async function captureSnapshot(client) {
  const result = await client.query(
    `with target_sets as (
       select id
       from public.sets
       where code = any($1::text[])
     )
     select
       'set' as row_type,
       s.id::text as row_id,
       s.code as set_code,
       s.name as set_name,
       s.identity_domain_default,
       coalesce(s.source->>'domain', '') as source_domain,
       null::text as card_print_id,
       null::text as card_print_identity_id,
       null::text as card_print_identity_domain,
       null::text as identity_key_version,
       null::text as identity_key_hash,
       null::boolean as is_active
     from public.sets s
     join target_sets ts on ts.id = s.id
     union all
     select
       'card_print' as row_type,
       cp.id::text as row_id,
       s.code as set_code,
       s.name as set_name,
       cp.identity_domain as identity_domain_default,
       null::text as source_domain,
       cp.id::text as card_print_id,
       null::text as card_print_identity_id,
       null::text as card_print_identity_domain,
       null::text as identity_key_version,
       null::text as identity_key_hash,
       null::boolean as is_active
     from public.card_prints cp
     join public.sets s on s.id = cp.set_id
     join target_sets ts on ts.id = s.id
     union all
     select
       'identity' as row_type,
       cpi.id::text as row_id,
       s.code as set_code,
       s.name as set_name,
       null::text as identity_domain_default,
       null::text as source_domain,
       cp.id::text as card_print_id,
       cpi.id::text as card_print_identity_id,
       cpi.identity_domain as card_print_identity_domain,
       cpi.identity_key_version,
       cpi.identity_key_hash,
       cpi.is_active
     from public.card_print_identity cpi
     join public.card_prints cp on cp.id = cpi.card_print_id
     join public.sets s on s.id = cp.set_id
     join target_sets ts on ts.id = s.id
     order by row_type, set_code, row_id`,
    [TARGET_SET_CODES],
  );

  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    counts: {
      total_rows: result.rows.length,
      set_rows: result.rows.filter((row) => row.row_type === 'set').length,
      parent_rows: result.rows.filter((row) => row.row_type === 'card_print').length,
      identity_rows: result.rows.filter((row) => row.row_type === 'identity').length,
      active_identity_rows: result.rows.filter((row) => row.row_type === 'identity' && row.is_active === true).length,
    },
  };
}

async function validateScope(client) {
  const validation = await client.query(
    `with target_sets as (
       select *
       from public.sets
       where code = any($1::text[])
     ),
     target_parents as (
       select cp.*
       from public.card_prints cp
       join target_sets s on s.id = cp.set_id
     ),
     target_identities as (
       select cpi.*
       from public.card_print_identity cpi
       join target_parents cp on cp.id = cpi.card_print_id
       where cpi.is_active = true
     )
     select
       (select count(*)::int from target_sets) as set_rows,
       (select count(*)::int from target_sets where code = any($1::text[])) as target_set_code_rows,
       (select count(*)::int from target_sets where identity_domain_default is distinct from 'pokemon_eng_standard') as non_standard_set_domain_rows,
       (select count(*)::int from target_sets where coalesce(source->>'domain', '') <> '') as nonblank_source_domain_rows,
       (select count(*)::int from target_sets where source->'tcgdex'->>'id' is distinct from code) as tcgdex_id_mismatch_rows,
       (select count(*)::int from target_parents) as parent_rows,
       (select count(*)::int from target_parents where identity_domain is distinct from 'pokemon_eng_standard') as non_standard_parent_domain_rows,
       (select count(*)::int from public.card_printings cpr join target_parents cp on cp.id = cpr.card_print_id) as child_rows,
       (select count(*)::int from target_identities) as active_identity_rows,
       (select count(*)::int from target_identities where identity_domain is distinct from 'pokemon_eng_standard' or identity_key_version is distinct from 'pokemon_eng_standard:v1') as non_standard_active_identity_rows,
       (select count(*)::int from public.external_mappings em join target_parents cp on cp.id = em.card_print_id where em.active = true) as active_mapping_rows,
       (select count(*)::int from public.vault_item_instances vii join target_parents cp on cp.id = vii.card_print_id where vii.archived_at is null) as vault_reference_rows,
       (select count(*)::int from (
          select cpi.identity_domain, cpi.identity_key_version, cpi.identity_key_hash
          from public.card_print_identity cpi
          where cpi.is_active = true
          group by cpi.identity_domain, cpi.identity_key_version, cpi.identity_key_hash
          having count(*) > 1
          limit 1
        ) dup) as existing_active_identity_duplicate_groups`,
    [TARGET_SET_CODES],
  );

  return validation.rows[0];
}

function validateDryRun(dryRun, packageFingerprint) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.package_fingerprint_sha256 !== packageFingerprint) findings.push('package_fingerprint_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('expected_fingerprint_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_after_hash_mismatch');
  if (dryRun.execution?.dry_run_status !== 'completed_rolled_back_no_durable_change') findings.push('dry_run_status_mismatch');
  return findings;
}

async function applyPackage(client) {
  const beforeSnapshot = await captureSnapshot(client);
  let updateProof = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");

    const guard = await validateScope(client);
    if (
      guard.set_rows !== EXPECTED_SET_ROWS ||
      guard.target_set_code_rows !== EXPECTED_SET_ROWS ||
      guard.non_standard_set_domain_rows !== 0 ||
      guard.nonblank_source_domain_rows !== 0 ||
      guard.tcgdex_id_mismatch_rows !== 0 ||
      guard.parent_rows !== EXPECTED_PARENT_ROWS ||
      guard.non_standard_parent_domain_rows !== 0 ||
      guard.child_rows !== EXPECTED_CHILD_ROWS ||
      guard.active_identity_rows !== EXPECTED_ACTIVE_IDENTITY_ROWS ||
      guard.non_standard_active_identity_rows !== 0 ||
      guard.active_mapping_rows !== EXPECTED_ACTIVE_MAPPING_ROWS ||
      guard.vault_reference_rows !== 0 ||
      guard.existing_active_identity_duplicate_groups !== 0
    ) {
      throw new Error(`preflight guard failed: ${JSON.stringify(guard)}`);
    }

    const updatedSets = await client.query(
      `update public.sets s
       set
         identity_domain_default = $2,
         source = jsonb_set(coalesce(s.source, '{}'::jsonb), '{domain}', to_jsonb($3::text), true)
       where s.code = any($1::text[])
       returning s.id::text, s.code, s.identity_domain_default, s.source->>'domain' as source_domain`,
      [TARGET_SET_CODES, TARGET_DOMAIN, TARGET_SOURCE_DOMAIN],
    );

    const updatedParents = await client.query(
      `update public.card_prints cp
       set identity_domain = $2
       from public.sets s
       where s.id = cp.set_id
         and s.code = any($1::text[])
       returning cp.id::text`,
      [TARGET_SET_CODES, TARGET_DOMAIN],
    );

    const deactivatedIdentities = await client.query(
      `update public.card_print_identity cpi
       set
         is_active = false,
         updated_at = now()
       from public.card_prints cp
       join public.sets s on s.id = cp.set_id
       where cpi.card_print_id = cp.id
         and cpi.is_active = true
         and s.code = any($1::text[])
       returning cpi.id::text, cpi.card_print_id::text`,
      [TARGET_SET_CODES],
    );

    const proof = await client.query(
      `with target_sets as (
         select id from public.sets where code = any($1::text[])
       ),
       target_parents as (
         select cp.*
         from public.card_prints cp
         join target_sets s on s.id = cp.set_id
       ),
       target_identities as (
         select cpi.*
         from public.card_print_identity cpi
         join target_parents cp on cp.id = cpi.card_print_id
         where cpi.is_active = true
       )
       select
         (select count(*)::int from public.sets where code = any($1::text[]) and identity_domain_default = $2 and source->>'domain' = $3) as matching_set_domain_rows,
         (select count(*)::int from target_parents where identity_domain = $2) as matching_parent_domain_rows,
         (select count(*)::int from target_identities) as remaining_active_identity_rows,
         (select count(*)::int from (
            select identity_domain, identity_key_version, identity_key_hash
            from public.card_print_identity
            where is_active = true
            group by identity_domain, identity_key_version, identity_key_hash
            having count(*) > 1
            limit 1
          ) dup) as duplicate_active_identity_group_exists,
         (select count(*)::int from public.vault_item_instances vii join target_parents cp on cp.id = vii.card_print_id where vii.archived_at is null) as vault_reference_rows`,
      [TARGET_SET_CODES, TARGET_DOMAIN, TARGET_SOURCE_DOMAIN],
    );

    updateProof = {
      updated_sets: updatedSets.rowCount,
      updated_parents: updatedParents.rowCount,
      deactivated_active_identities: deactivatedIdentities.rowCount,
      proof: proof.rows[0],
    };

    if (updateProof.updated_sets !== EXPECTED_SET_ROWS) throw new Error('updated_set_count_mismatch');
    if (updateProof.updated_parents !== EXPECTED_PARENT_ROWS) throw new Error('updated_parent_count_mismatch');
    if (updateProof.deactivated_active_identities !== EXPECTED_ACTIVE_IDENTITY_ROWS) throw new Error('deactivated_active_identity_count_mismatch');
    if (updateProof.proof.matching_set_domain_rows !== EXPECTED_SET_ROWS) throw new Error('matching_set_domain_count_mismatch');
    if (updateProof.proof.matching_parent_domain_rows !== EXPECTED_PARENT_ROWS) throw new Error('matching_parent_domain_count_mismatch');
    if (updateProof.proof.remaining_active_identity_rows !== 0) throw new Error('remaining_active_identity_rows_after_reclassification');
    if (updateProof.proof.duplicate_active_identity_group_exists !== 0) throw new Error('duplicate_active_identity_after_reclassification');
    if (updateProof.proof.vault_reference_rows !== 0) throw new Error('vault_reference_rows_after_reclassification');

    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client);
  return {
    before_snapshot: beforeSnapshot,
    update_proof: updateProof,
    after_snapshot: afterSnapshot,
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const dryRun = await readJson(DRY_RUN_JSON);
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const targets = await loadTargets(client);
    const packageFingerprint = sha256(stableJson({
      package_id: PACKAGE_ID,
      target_set_codes: TARGET_SET_CODES,
      target_domain: TARGET_DOMAIN,
      target_source_domain: TARGET_SOURCE_DOMAIN,
      targets,
    }));
    const dryRunFindings = validateDryRun(dryRun, packageFingerprint);
    const approvalFindings = dryRun.recommended_approval_text === APPROVAL_TEXT ? [] : ['approval_text_mismatch'];
    const stopFindings = [...dryRunFindings, ...approvalFindings];
    let applyResult = null;

    if (stopFindings.length === 0) {
      applyResult = await applyPackage(client);
    }

    const report = {
      version: 'ENRICH13B1_TCG_POCKET_DOMAIN_RECLASSIFICATION_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      expected_fingerprint_sha256: EXPECTED_FINGERPRINT,
      expected_dry_run_proof_sha256: EXPECTED_DRY_RUN_PROOF,
      approval_text: APPROVAL_TEXT,
      scope: {
        target_set_codes: TARGET_SET_CODES,
        writes_performed: stopFindings.length === 0
          ? ['sets.source.domain', 'sets.identity_domain_default', 'card_prints.identity_domain', 'card_print_identity.is_active']
          : [],
        forbidden: ['child writes', 'gv_id writes', 'external mapping writes', 'species writes', 'trait writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
        migrations_created: false,
      },
      dry_run_validation_findings: dryRunFindings,
      approval_validation_findings: approvalFindings,
      apply_result: applyResult,
      target_sets: targets,
      by_set: countBy(targets, (row) => row.set_code),
      stop_findings: stopFindings,
      pass: stopFindings.length === 0
        && applyResult?.update_proof?.updated_sets === EXPECTED_SET_ROWS
        && applyResult?.update_proof?.updated_parents === EXPECTED_PARENT_ROWS
        && applyResult?.update_proof?.deactivated_active_identities === EXPECTED_ACTIVE_IDENTITY_ROWS,
    };

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, [
      '# ENRICH-13B1 TCG Pocket Domain Reclassification Real Apply V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Updated sets: ${applyResult?.update_proof?.updated_sets ?? 0}`,
      `- Updated parents: ${applyResult?.update_proof?.updated_parents ?? 0}`,
      `- Deactivated active identities: ${applyResult?.update_proof?.deactivated_active_identities ?? 0}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      '',
      '## Target Sets',
      '',
      markdownTable(targets, [
        { label: 'set_code', value: (row) => row.set_code },
        { label: 'set_name', value: (row) => row.set_name },
        { label: 'parents', value: (row) => row.parent_rows },
        { label: 'children', value: (row) => row.child_rows },
        { label: 'active identities before apply', value: (row) => row.active_identity_rows },
      ]),
      '',
      '## Safety',
      '',
      '- Child writes: false',
      '- GV-ID writes: false',
      '- External mapping/species/trait writes: false',
      '- Deletes/merges: false',
      '- Migrations created: false',
      '- Image writes: false',
      '- Global apply: false',
      '',
      '## Stop Findings',
      '',
      report.stop_findings.length ? report.stop_findings.map((finding) => `- ${finding}`).join('\n') : '_None._',
      '',
    ].join('\n'));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: packageFingerprint,
      updated_sets: applyResult?.update_proof?.updated_sets ?? 0,
      updated_parents: applyResult?.update_proof?.updated_parents ?? 0,
      deactivated_active_identities: applyResult?.update_proof?.deactivated_active_identities ?? 0,
      stop_findings: stopFindings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
