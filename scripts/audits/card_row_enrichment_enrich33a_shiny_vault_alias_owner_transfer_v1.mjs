import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const PACKAGE_ID = 'ENRICH-33A-SHINY-VAULT-ALIAS-OWNER-TRANSFER';
const EXPECTED_TARGET_ROWS = 94;

const APPLY = process.argv.includes('--apply');
const OUTPUT_JSON = path.join(OUTPUT_DIR, APPLY
  ? 'enrich33a_shiny_vault_alias_owner_transfer_real_apply_v1.json'
  : 'enrich33a_shiny_vault_alias_owner_transfer_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, APPLY
  ? 'enrich33a_shiny_vault_alias_owner_transfer_real_apply_v1.md'
  : 'enrich33a_shiny_vault_alias_owner_transfer_guarded_dry_run_v1.md');

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
      target.id::text as target_id,
      owner.id::text as owner_id,
      target.number,
      target.number_plain,
      target.name as target_name,
      owner.name as owner_name,
      owner.gv_id as owner_gv_id
    from public.card_prints target
    join public.card_prints owner
      on owner.gv_id = concat('GV-PK-HIF-', target.number)
    where target.set_code = 'sm115'
      and target.gv_id is null
      and target.printed_identity_modifier = 'number_prefix:SV'
      and owner.set_code = 'sma'
    order by target.number_plain, target.number
  `);
  return result.rows;
}

async function captureSnapshot(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_id uuid)
     )
     select
       target.target_id::text,
       target.owner_id::text,
       t.set_code as target_set_code,
       t.number as target_number,
       t.name as target_name,
       t.gv_id as target_gv_id,
       o.set_code as owner_set_code,
       o.number as owner_number,
       o.name as owner_name,
       o.gv_id as owner_gv_id,
       (select count(*)::int from public.card_printings where card_print_id = target.target_id) as target_child_rows,
       (select count(*)::int from public.card_printings where card_print_id = target.owner_id) as owner_child_rows,
       (select count(*)::int from public.card_printings where card_print_id = target.target_id and printing_gv_id is not null) as target_child_gv_rows,
       (select count(*)::int from public.external_mappings where card_print_id = target.target_id and active = true) as target_mapping_rows,
       (select count(*)::int from public.external_mappings where card_print_id = target.owner_id and active = true) as owner_mapping_rows,
       (select count(*)::int from public.card_print_traits where card_print_id = target.target_id) as target_trait_rows,
       (select count(*)::int from public.card_print_traits where card_print_id = target.owner_id) as owner_trait_rows,
       (select count(*)::int from public.card_print_species where card_print_id = target.target_id) as target_species_rows,
       (select count(*)::int from public.card_print_species where card_print_id = target.owner_id) as owner_species_rows
     from target
     left join public.card_prints t on t.id = target.target_id
     left join public.card_prints o on o.id = target.owner_id
     order by t.number_plain nulls last, t.number nulls last`,
    [JSON.stringify(targets)],
  );
  return {
    captured_at: new Date().toISOString(),
    rows: result.rows,
    hash_sha256: sha256(stableJson(result.rows)),
  };
}

async function validateScope(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_id uuid, owner_gv_id text)
     ),
     owner_children as (
       select cpr.id
       from target
       join public.card_printings cpr on cpr.card_print_id = target.owner_id
     )
     select
       (select count(*)::int from target) target_count,
       (select count(distinct target_id)::int from target) distinct_target_count,
       (select count(distinct owner_id)::int from target) distinct_owner_count,
       (select count(distinct owner_gv_id)::int from target) distinct_owner_gv_count,
       (select count(*)::int from target join public.card_prints t on t.id = target.target_id where t.gv_id is not null) target_already_has_gv_count,
       (select count(*)::int from target join public.card_prints o on o.id = target.owner_id where o.gv_id is distinct from target.owner_gv_id) owner_gv_mismatch_count,
       (select count(*)::int from target join public.card_prints t on t.id = target.target_id where t.set_code <> 'sm115' or t.printed_identity_modifier <> 'number_prefix:SV') target_identity_mismatch_count,
       (select count(*)::int from target join public.card_prints o on o.id = target.owner_id where o.set_code <> 'sma') owner_identity_mismatch_count,
       (select count(*)::int from target join public.external_mappings tm on tm.card_print_id = target.target_id and tm.active = true join public.external_mappings om on om.card_print_id = target.owner_id and om.source = tm.source and om.external_id = tm.external_id and om.active = true) external_mapping_duplicate_collision_count,
       (select count(*)::int from target join public.card_feed_events e on e.card_print_id = target.owner_id) owner_feed_dependency_count,
       (select count(*)::int from target join public.vault_item_instances v on v.card_print_id = target.owner_id) owner_vault_dependency_count,
       (select count(*)::int from target join public.pricing_watch p on p.card_print_id = target.owner_id) owner_pricing_watch_dependency_count,
       (select count(*)::int from owner_children oc join public.external_printing_mappings epm on epm.card_printing_id = oc.id) owner_child_external_mapping_dependency_count,
       (select count(*)::int from owner_children oc join public.vault_item_instances vii on vii.card_printing_id = oc.id) owner_child_vault_dependency_count,
       (select count(*)::int from target join public.card_print_price_curves own on own.card_print_id = target.owner_id join public.card_print_price_curves tgt on tgt.card_print_id = target.target_id) price_curve_target_conflict_count,
       (select count(*)::int from target join public.ebay_active_price_snapshots own on own.card_print_id = target.owner_id join public.ebay_active_price_snapshots tgt on tgt.card_print_id = target.target_id and tgt.source = own.source and tgt.captured_at = own.captured_at) ebay_snapshot_target_conflict_count,
       (select count(*)::int from target join public.ebay_active_prices_latest own on own.card_print_id = target.owner_id join public.ebay_active_prices_latest tgt on tgt.card_print_id = target.target_id and tgt.source = own.source) ebay_latest_target_conflict_count,
       (select count(*)::int from target join public.pricing_jobs own on own.card_print_id = target.owner_id join public.pricing_jobs tgt on tgt.card_print_id = target.target_id) pricing_job_target_conflict_count`,
    [JSON.stringify(targets)],
  );
  return result.rows[0];
}

function guardFindings(guard, targets) {
  const findings = [];
  if (targets.length !== EXPECTED_TARGET_ROWS) findings.push(`target_rows_mismatch:${targets.length}`);
  for (const [key, value] of Object.entries(guard)) {
    if (key.endsWith('_count') && !['target_count', 'distinct_target_count', 'distinct_owner_count', 'distinct_owner_gv_count'].includes(key) && Number(value) !== 0) {
      findings.push(`${key}:${value}`);
    }
  }
  if (guard.target_count !== targets.length) findings.push(`guard_target_count:${guard.target_count}`);
  if (guard.distinct_target_count !== targets.length) findings.push(`distinct_target_count:${guard.distinct_target_count}`);
  if (guard.distinct_owner_count !== targets.length) findings.push(`distinct_owner_count:${guard.distinct_owner_count}`);
  if (guard.distinct_owner_gv_count !== targets.length) findings.push(`distinct_owner_gv_count:${guard.distinct_owner_gv_count}`);
  return findings;
}

async function executePackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let proof = null;

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '240s'");

    const guard = await validateScope(client, targets);
    const findings = guardFindings(guard, targets);
    if (findings.length) throw new Error(`guard failed: ${findings.join(', ')}`);

    const priceCurves = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_id uuid)) update public.card_print_price_curves p set card_print_id = target.target_id from target where p.card_print_id = target.owner_id`, [JSON.stringify(targets)]);
    const ebaySnapshots = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_id uuid)) update public.ebay_active_price_snapshots p set card_print_id = target.target_id from target where p.card_print_id = target.owner_id`, [JSON.stringify(targets)]);
    const ebayLatest = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_id uuid)) update public.ebay_active_prices_latest p set card_print_id = target.target_id from target where p.card_print_id = target.owner_id`, [JSON.stringify(targets)]);
    const pricingJobs = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_id uuid)) update public.pricing_jobs p set card_print_id = target.target_id from target where p.card_print_id = target.owner_id`, [JSON.stringify(targets)]);
    const mappingUpdate = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_id uuid)) update public.external_mappings em set card_print_id = target.target_id from target where em.card_print_id = target.owner_id and em.active = true`, [JSON.stringify(targets)]);
    const traitUpdate = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_id uuid)) update public.card_print_traits tr set card_print_id = target.target_id from target where tr.card_print_id = target.owner_id`, [JSON.stringify(targets)]);
    const ownerSpeciesDelete = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(owner_id uuid)) delete from public.card_print_species sp using target where sp.card_print_id = target.owner_id`, [JSON.stringify(targets)]);
    const ownerIdentityDelete = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(owner_id uuid)) delete from public.card_print_identity i using target where i.card_print_id = target.owner_id`, [JSON.stringify(targets)]);
    const ownerChildDelete = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(owner_id uuid)) delete from public.card_printings cpr using target where cpr.card_print_id = target.owner_id`, [JSON.stringify(targets)]);
    const ownerGvClear = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(owner_id uuid)) update public.card_prints cp set gv_id = null from target where cp.id = target.owner_id`, [JSON.stringify(targets)]);
    const targetGvUpdate = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_gv_id text)) update public.card_prints cp set gv_id = target.owner_gv_id, updated_at = now() from target where cp.id = target.target_id and cp.gv_id is null`, [JSON.stringify(targets)]);
    const targetChildGvUpdate = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_gv_id text)) update public.card_printings cpr set printing_gv_id = concat(target.owner_gv_id, '-HOLO') from target where cpr.card_print_id = target.target_id and cpr.finish_key = 'holo' and cpr.printing_gv_id is null`, [JSON.stringify(targets)]);
    const ownerParentDelete = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(owner_id uuid)) delete from public.card_prints cp using target where cp.id = target.owner_id and cp.gv_id is null`, [JSON.stringify(targets)]);

    const afterCounts = await client.query(
      `with target as (
         select *
         from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_id uuid, owner_gv_id text)
       )
       select
         (select count(*)::int from target join public.card_prints cp on cp.id = target.owner_id) owner_parents_remaining,
         (select count(*)::int from target join public.card_prints cp on cp.id = target.target_id and cp.gv_id = target.owner_gv_id) targets_with_expected_gv,
         (select count(*)::int from target join public.card_printings cpr on cpr.card_print_id = target.target_id and cpr.printing_gv_id = concat(target.owner_gv_id, '-HOLO')) target_children_with_expected_printing_gv,
         (select count(*)::int from (select gv_id from public.card_prints where gv_id is not null group by gv_id having count(*) > 1) dup) duplicate_parent_gv_groups,
         (select count(*)::int from (select printing_gv_id from public.card_printings where printing_gv_id is not null group by printing_gv_id having count(*) > 1) dup) duplicate_child_gv_groups`,
      [JSON.stringify(targets)],
    );

    proof = {
      price_curve_updates: priceCurves.rowCount,
      ebay_snapshot_updates: ebaySnapshots.rowCount,
      ebay_latest_updates: ebayLatest.rowCount,
      pricing_job_updates: pricingJobs.rowCount,
      mapping_updates: mappingUpdate.rowCount,
      trait_updates: traitUpdate.rowCount,
      owner_species_deletes: ownerSpeciesDelete.rowCount,
      owner_identity_deletes: ownerIdentityDelete.rowCount,
      owner_child_deletes: ownerChildDelete.rowCount,
      owner_gv_clears: ownerGvClear.rowCount,
      target_gv_updates: targetGvUpdate.rowCount,
      target_child_gv_updates: targetChildGvUpdate.rowCount,
      owner_parent_deletes: ownerParentDelete.rowCount,
      after_counts: afterCounts.rows[0],
    };

    const proofFindings = [];
    if (proof.mapping_updates !== EXPECTED_TARGET_ROWS) proofFindings.push(`mapping_updates:${proof.mapping_updates}`);
    if (proof.trait_updates !== EXPECTED_TARGET_ROWS) proofFindings.push(`trait_updates:${proof.trait_updates}`);
    if (proof.owner_child_deletes !== EXPECTED_TARGET_ROWS * 2) proofFindings.push(`owner_child_deletes:${proof.owner_child_deletes}`);
    if (proof.owner_gv_clears !== EXPECTED_TARGET_ROWS) proofFindings.push(`owner_gv_clears:${proof.owner_gv_clears}`);
    if (proof.target_gv_updates !== EXPECTED_TARGET_ROWS) proofFindings.push(`target_gv_updates:${proof.target_gv_updates}`);
    if (proof.target_child_gv_updates !== EXPECTED_TARGET_ROWS) proofFindings.push(`target_child_gv_updates:${proof.target_child_gv_updates}`);
    if (proof.owner_parent_deletes !== EXPECTED_TARGET_ROWS) proofFindings.push(`owner_parent_deletes:${proof.owner_parent_deletes}`);
    if (proof.after_counts.owner_parents_remaining !== 0) proofFindings.push(`owner_parents_remaining:${proof.after_counts.owner_parents_remaining}`);
    if (proof.after_counts.targets_with_expected_gv !== EXPECTED_TARGET_ROWS) proofFindings.push(`targets_with_expected_gv:${proof.after_counts.targets_with_expected_gv}`);
    if (proof.after_counts.target_children_with_expected_printing_gv !== EXPECTED_TARGET_ROWS) proofFindings.push(`target_children_with_expected_printing_gv:${proof.after_counts.target_children_with_expected_printing_gv}`);
    if (proof.after_counts.duplicate_parent_gv_groups !== 0) proofFindings.push(`duplicate_parent_gv_groups:${proof.after_counts.duplicate_parent_gv_groups}`);
    if (proof.after_counts.duplicate_child_gv_groups !== 0) proofFindings.push(`duplicate_child_gv_groups:${proof.after_counts.duplicate_child_gv_groups}`);
    if (proofFindings.length) throw new Error(`proof failed: ${proofFindings.join(', ')}`);

    if (APPLY) {
      await client.query('commit');
    } else {
      await client.query('rollback');
    }
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Ignore rollback-after-commit errors; the proof path commits only after all checks pass.
    }
    throw error;
  }

  const afterSnapshot = await captureSnapshot(client, targets);
  return {
    before_snapshot: beforeSnapshot,
    proof,
    after_snapshot: afterSnapshot,
    execution_status: APPLY
      ? 'committed_and_verified'
      : beforeSnapshot.hash_sha256 === afterSnapshot.hash_sha256
        ? 'completed_rolled_back_no_durable_change'
        : 'failed_rollback_hash_mismatch',
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const targets = await loadTargets(client);
    const packageFingerprint = sha256(stableJson({ package_id: PACKAGE_ID, targets }));
    const execution = await executePackage(client, targets);
    const pass = APPLY
      ? execution.execution_status === 'committed_and_verified'
      : execution.execution_status === 'completed_rolled_back_no_durable_change';
    const report = {
      version: APPLY
        ? 'ENRICH33A_SHINY_VAULT_ALIAS_OWNER_TRANSFER_REAL_APPLY_V1'
        : 'ENRICH33A_SHINY_VAULT_ALIAS_OWNER_TRANSFER_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      pass,
      apply: APPLY,
      scope: {
        target_rows: targets.length,
        migrations_created: false,
        image_writes_performed: false,
        global_apply: false,
      },
      targets,
      execution,
      required_real_apply_approval_text: !APPLY && pass
        ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: 94 Hidden Fates Shiny Vault alias owner transfers from legacy sma to canonical sm115; target parent GV updates=94; target child printing GV updates=94; legacy owner parent deletes=94; legacy owner child deletes=188; TCGdex mappings transferred=94; traits transferred=94; pricing/ebay/job rows transferred where present. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_snapshot.hash_sha256}. No global apply. No migrations. No image writes.`
        : null,
    };
    await writeJson(OUTPUT_JSON, report);
    const md = [
      `# ENRICH-33A Shiny Vault Alias Owner Transfer ${APPLY ? 'Real Apply' : 'Guarded Dry-Run'} V1`,
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${pass}`,
      `- Execution status: ${execution.execution_status}`,
      `- Target rows: ${targets.length}`,
      `- Target GV updates: ${execution.proof.target_gv_updates}`,
      `- Target child GV updates: ${execution.proof.target_child_gv_updates}`,
      `- Legacy owner child deletes: ${execution.proof.owner_child_deletes}`,
      `- Legacy owner parent deletes: ${execution.proof.owner_parent_deletes}`,
      '- Migrations created: false',
      '- Image writes performed: false',
      '- Global apply: false',
      '',
      '## Sample Scope',
      '',
      markdownTable(targets.slice(0, 20), [
        { label: 'number', value: (row) => row.number },
        { label: 'target', value: (row) => row.target_name },
        { label: 'legacy owner', value: (row) => row.owner_name },
        { label: 'gv_id', value: (row) => row.owner_gv_id },
      ]),
      '',
      !APPLY && report.required_real_apply_approval_text ? `## Real Apply Approval Text\n\n${report.required_real_apply_approval_text}\n` : '',
      `Fingerprint: \`${packageFingerprint}\``,
      '',
    ].join('\n');
    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      package_fingerprint_sha256: packageFingerprint,
      pass,
      apply: APPLY,
      execution_status: execution.execution_status,
      target_rows: targets.length,
      dry_run_proof: execution.before_snapshot.hash_sha256,
      required_real_apply_approval_text: report.required_real_apply_approval_text,
    }, null, 2));
    if (!pass) process.exitCode = 1;
  } finally {
    await client.end();
  }
}

await main();
