import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const INPUT_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_no_child_parent_adjudication_v1.json');
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich06a2_empty_duplicate_price_parent_delete_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich06a2_empty_duplicate_price_parent_delete_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich06a2_empty_duplicate_price_parent_delete_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-06A2-EMPTY-DUPLICATE-PRICE-PARENT-DELETE';
const TARGET_CLASSIFICATION = 'empty_duplicate_parent_delete_candidate_needs_owner_proof';
const EXPECTED_FINGERPRINT = 'da0c9a329af530b55a168069d81f6501060635250b248fa64bbaa0afef3d23d0';
const EXPECTED_DRY_RUN_PROOF = 'd6e27098cabfb362bf5cbc5579fed4e4f44300b9941a9928a85bb83006fa97e9';
const EXPECTED_TARGET_ROWS = 940;
const APPROVAL_TEXT = 'Approve real ENRICH-06A2-EMPTY-DUPLICATE-PRICE-PARENT-DELETE apply only. Fingerprint: da0c9a329af530b55a168069d81f6501060635250b248fa64bbaa0afef3d23d0. Scope: 940 zero-child empty duplicate parent card_print deletes with sibling owner proof; 940 card_print_active_prices view rows accepted as derived and not directly deleted. Dry-run proof: d6e27098cabfb362bf5cbc5579fed4e4f44300b9941a9928a85bb83006fa97e9 == d6e27098cabfb362bf5cbc5579fed4e4f44300b9941a9928a85bb83006fa97e9. No child deletes. No identity deletes. No mapping deletes. No trait/species deletes. No price table deletes. No cameo deletes. No merges. No migrations. No image writes. No global apply.';

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

function buildTargets(adjudication) {
  return (adjudication.rows ?? [])
    .filter((row) => row.adjudication_classification === TARGET_CLASSIFICATION)
    .map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      number_plain: row.number_plain,
      card_name: row.card_name,
      printed_identity_modifier: row.printed_identity_modifier,
      sibling_owner_count: row.sibling_owner_count,
      sibling_owner_samples: row.sibling_owner_samples,
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
       cp.gv_id,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name as card_name,
       cp.printed_identity_modifier,
       cp.variant_key,
       cp.external_ids
     from target
     join public.card_prints cp on cp.id = target.card_print_id
     order by cp.set_code, cp.number_plain nulls last, cp.number, cp.name, cp.id`,
    [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id })))],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
    row_count: result.rows.length,
  };
}

async function validateScope(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         set_code text,
         number text,
         card_name text
       )
     ),
     child as (
       select card_print_id, count(*)::int as row_count
       from public.card_printings
       group by card_print_id
     ),
     owner_proof as (
       select target.card_print_id, count(*)::int as owner_count
       from target
       join public.card_prints owner
         on owner.id <> target.card_print_id
        and owner.set_code is not distinct from target.set_code
        and owner.number is not distinct from target.number
        and lower(owner.name) = lower(target.card_name)
       left join child owner_child on owner_child.card_print_id = owner.id
       where owner.gv_id is not null
          or coalesce(owner_child.row_count, 0) > 0
       group by target.card_print_id
     ),
     deps as (
       select
         target.card_print_id,
         count(distinct cpr.id)::int as child_count,
         count(distinct cpi.id)::int as identity_count,
         count(distinct em.id)::int as mapping_count,
         count(distinct cpt.id)::int as trait_count,
         count(distinct cps.id)::int as species_count,
         count(distinct cap.card_print_id)::int as active_price_count,
         count(distinct cpc.card_print_id)::int as cameo_count,
         count(distinct vii.id) filter (where vii.archived_at is null)::int as vault_instance_count
       from target
       left join public.card_printings cpr on cpr.card_print_id = target.card_print_id
       left join public.card_print_identity cpi on cpi.card_print_id = target.card_print_id
       left join public.external_mappings em on em.card_print_id = target.card_print_id
       left join public.card_print_traits cpt on cpt.card_print_id = target.card_print_id
       left join public.card_print_species cps on cps.card_print_id = target.card_print_id
       left join public.card_print_active_prices cap on cap.card_print_id = target.card_print_id
       left join public.card_print_cameos cpc on cpc.card_print_id = target.card_print_id
       left join public.vault_item_instances vii on vii.card_print_id = target.card_print_id
       group by target.card_print_id
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct card_print_id)::int from target) as distinct_target_count,
       (select count(*)::int from target left join public.card_prints cp on cp.id = target.card_print_id where cp.id is null) as missing_parent_count,
       (select count(*)::int from target left join owner_proof op on op.card_print_id = target.card_print_id where coalesce(op.owner_count, 0) = 0) as missing_owner_proof_count,
       (select coalesce(sum(child_count), 0)::int from deps) as child_dependency_count,
       (select coalesce(sum(identity_count), 0)::int from deps) as identity_dependency_count,
       (select coalesce(sum(mapping_count), 0)::int from deps) as mapping_dependency_count,
       (select coalesce(sum(trait_count), 0)::int from deps) as trait_dependency_count,
       (select coalesce(sum(species_count), 0)::int from deps) as species_dependency_count,
       (select coalesce(sum(active_price_count), 0)::int from deps) as active_price_dependency_count,
       (select coalesce(sum(cameo_count), 0)::int from deps) as cameo_dependency_count,
       (select coalesce(sum(vault_instance_count), 0)::int from deps) as vault_instance_dependency_count`,
    [JSON.stringify(targets.map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
    })))],
  );
  return {
    ...result.rows[0],
    target_fingerprint_sha256: sha256(stableJson(targets)),
  };
}

function guardPassed(guard, expectedCount) {
  return guard.target_count === expectedCount
    && guard.distinct_target_count === expectedCount
    && guard.missing_parent_count === 0
    && guard.missing_owner_proof_count === 0
    && guard.child_dependency_count === 0
    && guard.identity_dependency_count === 0
    && guard.mapping_dependency_count === 0
    && guard.trait_dependency_count === 0
    && guard.species_dependency_count === 0
    && guard.cameo_dependency_count === 0
    && guard.vault_instance_dependency_count === 0;
}

function validateDryRun(dryRun, packageFingerprint) {
  const findings = [];
  if (dryRun.package_id !== PACKAGE_ID) findings.push('dry_run_package_id_mismatch');
  if (dryRun.pass !== true) findings.push('dry_run_not_passed');
  if (dryRun.package_fingerprint_sha256 !== packageFingerprint) findings.push('package_fingerprint_mismatch');
  if (dryRun.package_fingerprint_sha256 !== EXPECTED_FINGERPRINT) findings.push('expected_fingerprint_mismatch');
  if (dryRun.scope?.target_rows !== EXPECTED_TARGET_ROWS) findings.push('target_rows_mismatch');
  if (dryRun.execution?.before_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_before_hash_mismatch');
  if (dryRun.execution?.after_rollback_snapshot?.hash_sha256 !== EXPECTED_DRY_RUN_PROOF) findings.push('dry_run_after_hash_mismatch');
  if (dryRun.execution?.dry_run_status !== 'completed_rolled_back_no_durable_change') findings.push('dry_run_status_mismatch');
  if (dryRun.recommended_approval_text !== APPROVAL_TEXT) findings.push('approval_text_mismatch');
  if (dryRun.execution?.inside_transaction_proof?.deleted_parent_rows !== EXPECTED_TARGET_ROWS) findings.push('dry_run_delete_count_mismatch');
  if (dryRun.execution?.inside_transaction_proof?.deleted_active_price_rows !== 0) findings.push('dry_run_direct_price_delete_detected');
  return findings;
}

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let deleteProof = null;

  try {
    await client.query('begin');
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const guard = await validateScope(client, targets);
    if (!guardPassed(guard, targets.length)) {
      throw new Error(`preflight guard failed: ${JSON.stringify(guard)}`);
    }

    await client.query(
      `create temporary table enrich06a2_targets (
         card_print_id uuid primary key
       ) on commit drop`,
    );

    await client.query(
      `insert into enrich06a2_targets
       select card_print_id
       from jsonb_to_recordset($1::jsonb) as t(card_print_id uuid)`,
      [JSON.stringify(targets.map((row) => ({ card_print_id: row.card_print_id })))],
    );

    const deleted = await client.query(
      `delete from public.card_prints cp
       using enrich06a2_targets target
       where cp.id = target.card_print_id
       returning cp.id::text as card_print_id, cp.set_code, cp.number, cp.name as card_name`,
    );

    const proof = await client.query(
      `select
         (select count(*)::int from enrich06a2_targets) as target_count,
         (select count(*)::int
          from enrich06a2_targets target
          join public.card_prints cp on cp.id = target.card_print_id) as remaining_parent_count,
         (select count(*)::int
          from public.card_printings cpr
          join enrich06a2_targets target on target.card_print_id = cpr.card_print_id) as remaining_child_count,
         (select count(*)::int
          from public.card_print_identity cpi
          join enrich06a2_targets target on target.card_print_id = cpi.card_print_id) as remaining_identity_count,
         (select count(*)::int
          from public.external_mappings em
          join enrich06a2_targets target on target.card_print_id = em.card_print_id) as remaining_mapping_count,
         (select count(*)::int
          from public.card_print_traits cpt
          join enrich06a2_targets target on target.card_print_id = cpt.card_print_id) as remaining_trait_count,
         (select count(*)::int
          from public.card_print_species cps
          join enrich06a2_targets target on target.card_print_id = cps.card_print_id) as remaining_species_count,
         (select count(*)::int
          from public.card_print_cameos cpc
          join enrich06a2_targets target on target.card_print_id = cpc.card_print_id) as remaining_cameo_count,
         (select count(*)::int
          from public.vault_item_instances vii
          join enrich06a2_targets target on target.card_print_id = vii.card_print_id
          where vii.archived_at is null) as remaining_vault_instance_count`,
    );

    deleteProof = {
      active_price_view_rows_accepted_as_derived: guard.active_price_dependency_count,
      deleted_active_price_rows: 0,
      deleted_parent_rows: deleted.rowCount,
      deleted_samples: deleted.rows.slice(0, 25),
      proof: proof.rows[0],
    };

    if (deleteProof.deleted_parent_rows !== targets.length) throw new Error('deleted_parent_row_count_mismatch');
    if (deleteProof.deleted_active_price_rows !== 0) throw new Error('direct_price_delete_detected');
    if (deleteProof.proof.remaining_parent_count !== 0) throw new Error('remaining_parent_count_after_delete');
    if (deleteProof.proof.remaining_child_count !== 0) throw new Error('remaining_child_count_after_delete');
    if (deleteProof.proof.remaining_identity_count !== 0) throw new Error('remaining_identity_count_after_delete');
    if (deleteProof.proof.remaining_mapping_count !== 0) throw new Error('remaining_mapping_count_after_delete');
    if (deleteProof.proof.remaining_trait_count !== 0) throw new Error('remaining_trait_count_after_delete');
    if (deleteProof.proof.remaining_species_count !== 0) throw new Error('remaining_species_count_after_delete');
    if (deleteProof.proof.remaining_cameo_count !== 0) throw new Error('remaining_cameo_count_after_delete');
    if (deleteProof.proof.remaining_vault_instance_count !== 0) throw new Error('remaining_vault_instance_count_after_delete');

    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    delete_proof: deleteProof,
    after_snapshot: afterSnapshot,
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');

  const adjudication = await readJson(INPUT_JSON);
  const dryRun = await readJson(DRY_RUN_JSON);
  const targets = buildTargets(adjudication);
  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    target_classification: TARGET_CLASSIFICATION,
    targets,
  }));

  const dryRunFindings = validateDryRun(dryRun, packageFingerprint);
  if (dryRunFindings.length > 0) {
    throw new Error(`DRY_RUN_VALIDATION_FAILED:${dryRunFindings.join(',')}`);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const execution = await applyPackage(client, targets);
    const stopFindings = [];

    if (targets.length !== EXPECTED_TARGET_ROWS) stopFindings.push(`target_count_drift:${targets.length}`);
    if (execution.before_snapshot.row_count !== targets.length) stopFindings.push('before_snapshot_row_count_mismatch');
    if (execution.delete_proof.deleted_parent_rows !== targets.length) stopFindings.push('deleted_parent_rows_mismatch');
    if (execution.delete_proof.deleted_active_price_rows !== 0) stopFindings.push('direct_price_delete_detected');
    if (execution.after_snapshot.row_count !== 0) stopFindings.push('target_parent_rows_still_exist_after_apply');
    for (const [key, value] of Object.entries(execution.delete_proof.proof)) {
      if (key.startsWith('remaining_') && value !== 0) stopFindings.push(`${key}_not_zero`);
    }

    const report = {
      version: 'ENRICH06A2_EMPTY_DUPLICATE_PRICE_PARENT_DELETE_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      approved_text: APPROVAL_TEXT,
      package_fingerprint_sha256: packageFingerprint,
      dry_run_proof: `${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}`,
      source_file: INPUT_JSON,
      dry_run_file: DRY_RUN_JSON,
      scope: {
        target_rows: targets.length,
        target_classification: TARGET_CLASSIFICATION,
        writes_performed: ['card_prints deletes'],
        durable_db_writes_performed: true,
        child_deletes: false,
        identity_deletes: false,
        mapping_deletes: false,
        trait_deletes: false,
        species_deletes: false,
        price_table_deletes: false,
        cameo_deletes: false,
        merges: false,
        migrations_created: false,
        image_writes: false,
        global_apply: false,
      },
      by_set_top_25: Object.fromEntries(Object.entries(countBy(targets, (row) => row.set_code)).slice(0, 25)),
      execution,
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-06A2 Empty Duplicate Price Parent Delete Real Apply V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Target rows: ${targets.length}`,
      `- Deleted parent rows: ${execution.delete_proof.deleted_parent_rows}`,
      `- Direct active price deletes: ${execution.delete_proof.deleted_active_price_rows}`,
      `- Active price view rows accepted as derived: ${execution.delete_proof.active_price_view_rows_accepted_as_derived}`,
      `- Remaining target parent rows: ${execution.after_snapshot.row_count}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      `- Dry-run proof: \`${EXPECTED_DRY_RUN_PROOF} == ${EXPECTED_DRY_RUN_PROOF}\``,
      '',
      '## Safety',
      '',
      '- Durable DB writes performed: true',
      '- Writes performed: `card_prints` deletes only',
      '- Child deletes: false',
      '- Identity deletes: false',
      '- Mapping deletes: false',
      '- Trait/species deletes: false',
      '- Price table deletes: false',
      '- Cameo deletes: false',
      '- Merges: false',
      '- Migrations created: false',
      '- Image writes: false',
      '- Global apply: false',
      '',
      '## By Set',
      '',
      markdownTable(Object.entries(report.by_set_top_25).map(([set_code, rows]) => ({ set_code, rows })), [
        { label: 'set_code', value: (row) => row.set_code },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Stop Findings',
      '',
      report.stop_findings.length ? report.stop_findings.map((finding) => `- ${finding}`).join('\n') : '_None._',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: packageFingerprint,
      deleted_parent_rows: execution.delete_proof.deleted_parent_rows,
      remaining_target_parent_rows: execution.after_snapshot.row_count,
      stop_findings: stopFindings,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
