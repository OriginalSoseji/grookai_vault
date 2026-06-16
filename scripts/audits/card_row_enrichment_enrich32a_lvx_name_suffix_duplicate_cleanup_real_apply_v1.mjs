import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const DRY_RUN_JSON = path.join(OUTPUT_DIR, 'enrich32a_lvx_name_suffix_duplicate_cleanup_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich32a_lvx_name_suffix_duplicate_cleanup_real_apply_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich32a_lvx_name_suffix_duplicate_cleanup_real_apply_v1.md');

const PACKAGE_ID = 'ENRICH-32A-LVX-NAME-SUFFIX-DUPLICATE-CLEANUP';
const EXPECTED_FINGERPRINT = '75c4be3cbc6677f68a71bcd210a5d339b89fec5c0cdf5fefbd6d34c56defd724';
const EXPECTED_DRY_RUN_PROOF = '8087409fa5f8ba5839c37619e9f31336a190a09ee35afc50e21a4d4e8fe49c50';
const EXPECTED_TARGET_ROWS = 27;

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
  const result = await client.query(`
    with missing as (
      select cp.id target_id, cp.set_code, cp.number, cp.number_plain, cp.name target_name
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      where cp.gv_id is null
        and cp.set_code in ('dp7','pl1','pl2','pl3')
        and coalesce(cp.identity_domain, s.identity_domain_default) = 'pokemon_eng_standard'
        and s.identity_domain_default = 'pokemon_eng_standard'
    ),
    owner as (
      select
        m.*,
        o.id owner_id,
        o.name owner_name,
        o.gv_id owner_gv_id,
        o.printed_identity_modifier owner_printed_identity_modifier
      from missing m
      join public.card_prints o
        on o.set_code = m.set_code
       and o.number_plain = m.number_plain
       and o.gv_id is not null
      where o.printed_identity_modifier in ('level_x', 'name_suffix:g')
    )
    select
      target_id::text,
      owner_id::text,
      set_code,
      number,
      number_plain,
      target_name,
      owner_name,
      owner_gv_id,
      owner_printed_identity_modifier
    from owner
    order by set_code, number_plain, target_name
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
       t.set_code,
       t.number,
       t.number_plain,
       t.name as target_name,
       t.gv_id as target_gv_id,
       o.name as owner_name,
       o.gv_id as owner_gv_id,
       o.printed_identity_modifier as owner_printed_identity_modifier,
       (select count(*)::int from public.card_printings where card_print_id = target.target_id) target_child_rows,
       (select count(*)::int from public.card_print_identity where card_print_id = target.target_id) target_identity_rows,
       (select count(*)::int from public.external_mappings where card_print_id = target.target_id) target_mapping_rows,
       (select count(*)::int from public.card_print_traits where card_print_id = target.target_id) target_trait_rows,
       (select count(*)::int from public.card_print_species where card_print_id = target.target_id) target_species_rows
     from target
     left join public.card_prints t on t.id = target.target_id
     join public.card_prints o on o.id = target.owner_id
     order by t.set_code nulls last, t.number_plain nulls last, t.name nulls last`,
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
       from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_id uuid)
     ),
     target_children as (
       select cpr.id
       from target
       join public.card_printings cpr on cpr.card_print_id = target.target_id
     )
     select
       (select count(*)::int from target) as target_count,
       (select count(distinct target_id)::int from target) as distinct_target_count,
       (select count(distinct owner_id)::int from target) as distinct_owner_count,
       (select count(*)::int from target join public.card_prints t on t.id = target.target_id where t.gv_id is not null) as target_already_has_gv_count,
       (select count(*)::int from target join public.card_prints o on o.id = target.owner_id where o.gv_id is null) as owner_missing_gv_count,
       (select count(*)::int from target join public.card_prints o on o.id = target.owner_id where o.printed_identity_modifier not in ('level_x', 'name_suffix:g')) as owner_modifier_mismatch_count,
       (select count(*)::int
        from target
        join public.card_prints t on t.id = target.target_id
        join public.card_prints o on o.id = target.owner_id
        where t.set_code is distinct from o.set_code or t.number_plain is distinct from o.number_plain) as owner_identity_mismatch_count,
       (select count(*)::int
        from target
        join public.external_mappings tm on tm.card_print_id = target.target_id and tm.active = true
        join public.external_mappings om on om.card_print_id = target.owner_id and om.source = tm.source and om.external_id = tm.external_id and om.active = true) as external_mapping_duplicate_collision_count,
       (select count(*)::int from target join public.card_feed_events e on e.card_print_id = target.target_id) as feed_dependency_count,
       (select count(*)::int from target join public.vault_item_instances v on v.card_print_id = target.target_id) as vault_dependency_count,
       (select count(*)::int from target join public.pricing_watch p on p.card_print_id = target.target_id) as pricing_watch_dependency_count,
       (select count(*)::int from target_children tc join public.external_printing_mappings epm on epm.card_printing_id = tc.id) as child_external_mapping_dependency_count,
       (select count(*)::int from target_children tc join public.vault_item_instances vii on vii.card_printing_id = tc.id) as child_vault_dependency_count`,
    [JSON.stringify(targets)],
  );
  return result.rows[0];
}

function validateGuard(guard, targets) {
  const findings = [];
  if (targets.length !== EXPECTED_TARGET_ROWS) findings.push(`target_rows_mismatch:${targets.length}`);
  for (const [key, value] of Object.entries(guard)) {
    if (key.endsWith('_count') && !['target_count', 'distinct_target_count', 'distinct_owner_count'].includes(key) && Number(value) !== 0) {
      findings.push(`${key}:${value}`);
    }
  }
  if (guard.target_count !== targets.length) findings.push(`guard_target_count:${guard.target_count}`);
  if (guard.distinct_target_count !== targets.length) findings.push(`distinct_target_count:${guard.distinct_target_count}`);
  if (guard.distinct_owner_count !== targets.length) findings.push(`distinct_owner_count:${guard.distinct_owner_count}`);
  return findings;
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

async function applyPackage(client, targets) {
  const beforeSnapshot = await captureSnapshot(client, targets);
  let proof = null;
  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '180s'");
    const guard = await validateScope(client, targets);
    const findings = validateGuard(guard, targets);
    if (findings.length) throw new Error(`preflight guard failed: ${findings.join(', ')}`);

    const mappingUpdate = await client.query(
      `with target as (
         select *
         from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_id uuid)
       )
       update public.external_mappings em
       set card_print_id = target.owner_id
       from target
       where em.card_print_id = target.target_id
         and em.active = true`,
      [JSON.stringify(targets)],
    );
    const identityDelete = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(target_id uuid)) delete from public.card_print_identity cpi using target where cpi.card_print_id = target.target_id`, [JSON.stringify(targets)]);
    const traitDelete = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(target_id uuid)) delete from public.card_print_traits cpt using target where cpt.card_print_id = target.target_id`, [JSON.stringify(targets)]);
    const speciesDelete = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(target_id uuid)) delete from public.card_print_species cps using target where cps.card_print_id = target.target_id`, [JSON.stringify(targets)]);
    const childDelete = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(target_id uuid)) delete from public.card_printings cpr using target where cpr.card_print_id = target.target_id`, [JSON.stringify(targets)]);
    const parentDelete = await client.query(`with target as (select * from jsonb_to_recordset($1::jsonb) as t(target_id uuid)) delete from public.card_prints cp using target where cp.id = target.target_id and cp.gv_id is null`, [JSON.stringify(targets)]);

    const afterCounts = await client.query(
      `with target as (
         select *
         from jsonb_to_recordset($1::jsonb) as t(target_id uuid, owner_id uuid)
       )
       select
         (select count(*)::int from target join public.card_prints cp on cp.id = target.target_id) as target_parents_remaining,
         (select count(*)::int from target join public.external_mappings em on em.card_print_id = target.owner_id and em.source = 'tcgdex' and em.active = true) as owner_tcgdex_mappings,
         (select count(*)::int from target join public.card_prints cp on cp.id = target.owner_id and cp.gv_id is not null) as owners_with_gv`,
      [JSON.stringify(targets)],
    );

    proof = {
      mapping_updates: mappingUpdate.rowCount,
      identity_deletes: identityDelete.rowCount,
      trait_deletes: traitDelete.rowCount,
      species_deletes: speciesDelete.rowCount,
      child_deletes: childDelete.rowCount,
      parent_deletes: parentDelete.rowCount,
      after_counts: afterCounts.rows[0],
    };
    if (proof.mapping_updates !== EXPECTED_TARGET_ROWS || proof.child_deletes !== 28 || proof.parent_deletes !== EXPECTED_TARGET_ROWS || proof.after_counts.target_parents_remaining !== 0) {
      throw new Error(`apply proof failed: ${JSON.stringify(proof)}`);
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
  const afterSnapshot = await captureSnapshot(client, targets);
  return { before_snapshot: beforeSnapshot, apply_proof: proof, after_snapshot: afterSnapshot };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for real apply.');
  const dryRun = await readJson(DRY_RUN_JSON);
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const targets = await loadTargets(client);
    const packageFingerprint = sha256(stableJson({ package_id: PACKAGE_ID, targets }));
    const dryRunFindings = validateDryRun(dryRun, packageFingerprint);
    if (dryRunFindings.length) throw new Error(`dry-run validation failed: ${dryRunFindings.join(', ')}`);
    const execution = await applyPackage(client, targets);
    const report = {
      version: 'ENRICH32A_LVX_NAME_SUFFIX_DUPLICATE_CLEANUP_REAL_APPLY_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      package_fingerprint_sha256: packageFingerprint,
      apply_status: 'committed_and_verified',
      scope: {
        target_rows: targets.length,
        migrations_created: false,
        image_writes_performed: false,
        global_apply: false,
      },
      targets,
      execution,
    };
    await writeJson(OUTPUT_JSON, report);
    const md = [
      '# ENRICH-32A LV.X / Name-Suffix Duplicate Cleanup Real Apply V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      '- Apply status: committed_and_verified',
      `- Mapping transfers: ${execution.apply_proof.mapping_updates}`,
      `- Identity deletes: ${execution.apply_proof.identity_deletes}`,
      `- Trait deletes: ${execution.apply_proof.trait_deletes}`,
      `- Species deletes: ${execution.apply_proof.species_deletes}`,
      `- Child deletes: ${execution.apply_proof.child_deletes}`,
      `- Parent deletes: ${execution.apply_proof.parent_deletes}`,
      '- Migrations created: false',
      '- Image writes performed: false',
      '- Global apply: false',
      '',
      '## Proof',
      '',
      `- Dry-run proof: \`${EXPECTED_DRY_RUN_PROOF}\``,
      `- Before apply hash: \`${execution.before_snapshot.hash_sha256}\``,
      `- After apply hash: \`${execution.after_snapshot.hash_sha256}\``,
      `- Target parents remaining: ${execution.apply_proof.after_counts.target_parents_remaining}`,
      '',
      `Fingerprint: \`${packageFingerprint}\``,
      '',
    ].join('\n');
    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      package_fingerprint_sha256: packageFingerprint,
      apply_status: report.apply_status,
      mapping_updates: execution.apply_proof.mapping_updates,
      child_deletes: execution.apply_proof.child_deletes,
      parent_deletes: execution.apply_proof.parent_deletes,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
