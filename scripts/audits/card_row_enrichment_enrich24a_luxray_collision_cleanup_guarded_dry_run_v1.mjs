import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich24a_luxray_collision_cleanup_guarded_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich24a_luxray_collision_cleanup_guarded_dry_run_v1.md');

const PACKAGE_ID = 'ENRICH-24A-LUXRAY-GL-LVX-COLLISION-CLEANUP';
const DUPLICATE_ID = 'c0a6e954-c650-4dd5-a9fd-653ab30369c1';
const OWNER_ID = '039cfe62-71d0-4f13-ab98-d1836026b991';

const SOURCE_EVIDENCE = [
  {
    source: 'official_pokemon',
    source_url: 'https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/pl2/109/',
    evidence_label: 'Official Pokemon card page for series pl2 card 109 shows Luxray [GL] LV.X.',
  },
  {
    source: 'bulbapedia',
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Luxray_GL_LV.X_(Rising_Rivals_109)',
    evidence_label: 'Bulbapedia page identifies Rising Rivals 109 as Luxray GL LV.X.',
  },
  {
    source: 'pricecharting',
    source_url: 'https://www.pricecharting.com/game/pokemon-rising-rivals/luxray-gl-lvx-109',
    evidence_label: 'PriceCharting product page identifies Pokemon Rising Rivals #109 as Luxray GL LV.X.',
  },
];

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

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `select exists (
       select 1
       from information_schema.tables
       where table_schema = 'public'
         and table_name = $1
     ) as exists`,
    [tableName],
  );
  return result.rows[0]?.exists === true;
}

async function columnExists(client, tableName, columnName) {
  const result = await client.query(
    `select exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = $1
         and column_name = $2
     ) as exists`,
    [tableName, columnName],
  );
  return result.rows[0]?.exists === true;
}

async function optionalCount(client, tableName, columnName, values, cast = 'uuid') {
  if (!(await tableExists(client, tableName))) return 0;
  if (!(await columnExists(client, tableName, columnName))) return 0;
  const result = await client.query(
    `select count(*)::int as count from public.${tableName} where ${columnName} = any($1::${cast}[])`,
    [values],
  );
  return result.rows[0]?.count ?? 0;
}

async function captureSnapshot(client) {
  const ids = [DUPLICATE_ID, OWNER_ID];
  const parents = await client.query(
    `select
       cp.id::text,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.name,
       cp.gv_id,
       cp.variant_key,
       cp.printed_identity_modifier,
       cp.identity_domain,
       cp.external_ids,
       count(distinct cpr.id)::int as child_count,
       count(distinct cpi.id) filter (where cpi.is_active)::int as active_identity_count,
       count(distinct em.id) filter (where em.active)::int as active_mapping_count,
       count(distinct cpt.id)::int as trait_count,
       count(distinct cps.id)::int as species_count
     from public.card_prints cp
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     left join public.card_print_identity cpi on cpi.card_print_id = cp.id
     left join public.external_mappings em on em.card_print_id = cp.id
     left join public.card_print_traits cpt on cpt.card_print_id = cp.id
     left join public.card_print_species cps on cps.card_print_id = cp.id
     where cp.id = any($1::uuid[])
     group by cp.id
     order by cp.id`,
    [ids],
  );

  const children = await client.query(
    `select
       cpr.id::text as card_printing_id,
       cpr.card_print_id::text,
       cp.name as parent_name,
       cpr.finish_key,
       cpr.printing_gv_id,
       cpr.image_status,
       cpr.image_url is not null as has_image_url,
       cpr.image_path is not null as has_image_path
     from public.card_printings cpr
     join public.card_prints cp on cp.id = cpr.card_print_id
     where cpr.card_print_id = any($1::uuid[])
     order by cpr.card_print_id, cpr.finish_key, cpr.id`,
    [ids],
  );

  const mappings = await client.query(
    `select id::text, card_print_id::text, source, external_id, active
     from public.external_mappings
     where card_print_id = any($1::uuid[])
     order by card_print_id, source, external_id, id`,
    [ids],
  );

  const identities = await client.query(
    `select
       id::text,
       card_print_id::text,
       is_active,
       identity_domain,
       set_code_identity,
       printed_number,
       normalized_printed_name,
       identity_key_hash,
       identity_payload
     from public.card_print_identity
     where card_print_id = any($1::uuid[])
     order by card_print_id, is_active desc, id`,
    [ids],
  );

  const traits = await client.query(
    `select id::text, card_print_id::text, trait_type, trait_value, source
     from public.card_print_traits
     where card_print_id = any($1::uuid[])
     order by card_print_id, trait_type, trait_value, source, id`,
    [ids],
  );

  const species = await client.query(
    `select id::text, card_print_id::text, species_id::text, role, source, active
     from public.card_print_species
     where card_print_id = any($1::uuid[])
     order by card_print_id, species_id, role, source, id`,
    [ids],
  );

  const globalGuards = await client.query(
    `select
       (select count(*)::int from (
          select identity_domain, identity_key_hash
          from public.card_print_identity
          where is_active = true
          group by identity_domain, identity_key_hash
          having count(*) > 1
        ) dup) as active_identity_duplicate_groups,
       (select count(*)::int from (
          select source, external_id
          from public.external_mappings
          where active = true
          group by source, external_id
          having count(distinct card_print_id) > 1
        ) dup) as active_external_mapping_duplicate_groups`,
  );

  const snapshot = {
    parents: parents.rows,
    children: children.rows,
    mappings: mappings.rows,
    identities: identities.rows,
    traits: traits.rows,
    species: species.rows,
    global_guards: globalGuards.rows[0],
  };

  return {
    captured_at: new Date().toISOString(),
    ...snapshot,
    hash_sha256: sha256(stableJson(snapshot)),
  };
}

async function dependencyGuards(client) {
  const duplicateChildIds = (await client.query(
    `select id::text from public.card_printings where card_print_id = $1::uuid order by id`,
    [DUPLICATE_ID],
  )).rows.map((row) => row.id);

  const childDependencyCounts = {
    external_printing_mappings: await optionalCount(client, 'external_printing_mappings', 'card_printing_id', duplicateChildIds),
    vault_item_instances: await optionalCount(client, 'vault_item_instances', 'card_printing_id', duplicateChildIds),
    canon_warehouse_candidates: await optionalCount(client, 'canon_warehouse_candidates', 'promoted_card_printing_id', duplicateChildIds),
  };

  const allowedParentTables = new Set([
    'card_print_identity',
    'card_print_species',
    'card_print_traits',
    'card_printings',
    'external_mappings',
  ]);

  const fkRows = await client.query(
    `select
       rel_ns.nspname as schema_name,
       rel.relname as table_name,
       att.attname as column_name
     from pg_constraint con
     join pg_class rel on rel.oid = con.conrelid
     join pg_namespace rel_ns on rel_ns.oid = rel.relnamespace
     join pg_class ref on ref.oid = con.confrelid
     join unnest(con.conkey) with ordinality as cols(attnum, ord) on true
     join pg_attribute att on att.attrelid = rel.oid and att.attnum = cols.attnum
     where con.contype = 'f'
       and rel_ns.nspname = 'public'
       and ref.relname = 'card_prints'
     order by rel.relname, att.attname`,
  );

  const disallowedParentRefs = [];
  for (const row of fkRows.rows) {
    if (allowedParentTables.has(row.table_name)) continue;
    const result = await client.query(
      `select count(*)::int as count from public.${row.table_name} where ${row.column_name} = $1::uuid`,
      [DUPLICATE_ID],
    );
    const count = result.rows[0]?.count ?? 0;
    if (count > 0) disallowedParentRefs.push({ ...row, count });
  }

  return {
    duplicate_child_ids: duplicateChildIds,
    child_dependency_counts: childDependencyCounts,
    disallowed_parent_refs: disallowedParentRefs,
  };
}

async function validateCurrentState(client) {
  const findings = [];
  const result = await client.query(
    `select
       duplicate.id::text as duplicate_id,
       duplicate.set_code as duplicate_set_code,
       duplicate.number as duplicate_number,
       duplicate.name as duplicate_name,
       duplicate.external_ids->>'tcgdex' as duplicate_tcgdex_id,
       owner.id::text as owner_id,
       owner.set_code as owner_set_code,
       owner.number as owner_number,
       owner.name as owner_name,
       owner.gv_id as owner_gv_id
     from public.card_prints duplicate
     cross join public.card_prints owner
     where duplicate.id = $1::uuid
       and owner.id = $2::uuid`,
    [DUPLICATE_ID, OWNER_ID],
  );

  const row = result.rows[0];
  if (!row) findings.push('target_parent_rows_missing');
  if (row?.duplicate_set_code !== null) findings.push('duplicate_set_code_not_null');
  if (row?.duplicate_number !== null) findings.push('duplicate_number_not_null');
  if (row?.duplicate_name !== 'Luxray GL') findings.push('duplicate_name_mismatch');
  if (row?.duplicate_tcgdex_id !== 'pl2-109') findings.push('duplicate_tcgdex_id_mismatch');
  if (row?.owner_set_code !== 'pl2') findings.push('owner_set_code_mismatch');
  if (row?.owner_number !== '109') findings.push('owner_number_mismatch');
  if (row?.owner_name !== 'Luxray GL LV.X') findings.push('owner_name_mismatch');
  if (row?.owner_gv_id !== 'GV-PK-RR-109') findings.push('owner_gv_id_mismatch');

  const dependencies = await dependencyGuards(client);
  const childDependencyTotal = Object.values(dependencies.child_dependency_counts).reduce((sum, count) => sum + Number(count ?? 0), 0);
  if (childDependencyTotal !== 0) findings.push('duplicate_child_dependencies_present');
  if (dependencies.disallowed_parent_refs.length !== 0) findings.push('disallowed_duplicate_parent_refs_present');

  return { target_row: row, dependencies, findings };
}

async function runDryRun(client) {
  const beforeSnapshot = await captureSnapshot(client);
  let insideProof = null;

  await client.query('begin');
  try {
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '120s'");

    const validation = await validateCurrentState(client);
    if (validation.findings.length > 0) {
      throw new Error(`preflight_guard_failed:${validation.findings.join(',')}`);
    }

    await client.query(
      `create temporary table enrich24a_target (
         duplicate_card_print_id uuid primary key,
         canonical_owner_card_print_id uuid not null
       ) on commit drop`,
    );

    await client.query(
      `insert into enrich24a_target values ($1::uuid, $2::uuid)`,
      [DUPLICATE_ID, OWNER_ID],
    );

    const duplicateMappingDelete = await client.query(
      `delete from public.external_mappings em
       using enrich24a_target target
       where em.card_print_id = target.duplicate_card_print_id
         and exists (
           select 1
           from public.external_mappings owner_em
           where owner_em.card_print_id = target.canonical_owner_card_print_id
             and owner_em.source = em.source
             and owner_em.external_id = em.external_id
         )`,
    );

    const mappingTransfer = await client.query(
      `update public.external_mappings em
       set card_print_id = target.canonical_owner_card_print_id
       from enrich24a_target target
       where em.card_print_id = target.duplicate_card_print_id`,
    );

    const identityDelete = await client.query(
      `delete from public.card_print_identity cpi
       using enrich24a_target target
       where cpi.card_print_id = target.duplicate_card_print_id`,
    );

    const duplicateTraitDelete = await client.query(
      `delete from public.card_print_traits cpt
       using enrich24a_target target
       where cpt.card_print_id = target.duplicate_card_print_id
         and exists (
           select 1
           from public.card_print_traits owner_trait
           where owner_trait.card_print_id = target.canonical_owner_card_print_id
             and owner_trait.trait_type = cpt.trait_type
             and owner_trait.trait_value = cpt.trait_value
             and owner_trait.source = cpt.source
         )`,
    );

    const traitTransfer = await client.query(
      `update public.card_print_traits cpt
       set card_print_id = target.canonical_owner_card_print_id
       from enrich24a_target target
       where cpt.card_print_id = target.duplicate_card_print_id`,
    );

    const duplicateSpeciesDelete = await client.query(
      `delete from public.card_print_species cps
       using enrich24a_target target
       where cps.card_print_id = target.duplicate_card_print_id
         and exists (
           select 1
           from public.card_print_species owner_species
           where owner_species.card_print_id = target.canonical_owner_card_print_id
             and owner_species.species_id = cps.species_id
             and owner_species.role = cps.role
             and owner_species.source = cps.source
             and owner_species.active = cps.active
         )`,
    );

    const speciesTransfer = await client.query(
      `update public.card_print_species cps
       set card_print_id = target.canonical_owner_card_print_id
       from enrich24a_target target
       where cps.card_print_id = target.duplicate_card_print_id`,
    );

    const childDelete = await client.query(
      `delete from public.card_printings cpr
       using enrich24a_target target
       where cpr.card_print_id = target.duplicate_card_print_id`,
    );

    const parentDelete = await client.query(
      `delete from public.card_prints cp
       using enrich24a_target target
       where cp.id = target.duplicate_card_print_id`,
    );

    const afterInsideSnapshot = await captureSnapshot(client);

    insideProof = {
      duplicate_mapping_deletes: duplicateMappingDelete.rowCount,
      external_mapping_transfers: mappingTransfer.rowCount,
      identity_deletes: identityDelete.rowCount,
      duplicate_trait_deletes: duplicateTraitDelete.rowCount,
      trait_transfers: traitTransfer.rowCount,
      duplicate_species_deletes: duplicateSpeciesDelete.rowCount,
      species_transfers: speciesTransfer.rowCount,
      child_printing_deletes: childDelete.rowCount,
      parent_deletes: parentDelete.rowCount,
      after_inside_snapshot: afterInsideSnapshot,
    };
  } finally {
    await client.query('rollback');
  }

  const afterRollbackSnapshot = await captureSnapshot(client);
  return {
    before_snapshot: beforeSnapshot,
    inside_transaction_proof: insideProof,
    after_rollback_snapshot: afterRollbackSnapshot,
    dry_run_status: 'completed_rolled_back_no_durable_change',
  };
}

function validateExecution(execution) {
  const findings = [];
  const proof = execution.inside_transaction_proof;
  if (proof.external_mapping_transfers !== 1) findings.push('external_mapping_transfer_count_mismatch');
  if (proof.identity_deletes !== 1) findings.push('identity_delete_count_mismatch');
  if (proof.trait_transfers !== 1) findings.push('trait_transfer_count_mismatch');
  if (proof.duplicate_species_deletes !== 1) findings.push('species_dedupe_delete_count_mismatch');
  if (proof.child_printing_deletes !== 2) findings.push('child_printing_delete_count_mismatch');
  if (proof.parent_deletes !== 1) findings.push('parent_delete_count_mismatch');
  if (proof.after_inside_snapshot.parents.some((row) => row.id === DUPLICATE_ID)) findings.push('duplicate_parent_still_present_inside_transaction');
  if (!proof.after_inside_snapshot.parents.some((row) => row.id === OWNER_ID)) findings.push('canonical_owner_missing_inside_transaction');
  if (proof.after_inside_snapshot.global_guards.active_identity_duplicate_groups !== 0) findings.push('active_identity_duplicate_groups_after_dry_run');
  if (proof.after_inside_snapshot.global_guards.active_external_mapping_duplicate_groups !== 0) findings.push('active_external_mapping_duplicate_groups_after_dry_run');
  if (execution.before_snapshot.hash_sha256 !== execution.after_rollback_snapshot.hash_sha256) findings.push('rollback_snapshot_hash_mismatch');
  return findings;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for dry-run.');

  const packageFingerprint = sha256(stableJson({
    package_id: PACKAGE_ID,
    duplicate_card_print_id: DUPLICATE_ID,
    canonical_owner_card_print_id: OWNER_ID,
    source_evidence: SOURCE_EVIDENCE,
    planned_scope: {
      external_mapping_transfers: 1,
      identity_deletes: 1,
      trait_transfers: 1,
      duplicate_species_deletes: 1,
      child_printing_deletes: 2,
      parent_deletes: 1,
    },
  }));

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const preflight = await validateCurrentState(client);
    const execution = await runDryRun(client);
    const stopFindings = [
      ...preflight.findings,
      ...validateExecution(execution),
    ];

    const report = {
      version: 'ENRICH24A_LUXRAY_COLLISION_CLEANUP_GUARDED_DRY_RUN_V1',
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      mode: 'rollback_only_dry_run',
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      package_fingerprint_sha256: packageFingerprint,
      source_evidence: SOURCE_EVIDENCE,
      scope: {
        duplicate_card_print_id: DUPLICATE_ID,
        canonical_owner_card_print_id: OWNER_ID,
        duplicate_row: 'Luxray GL with tcgdex pl2-109',
        canonical_owner_row: 'Luxray GL LV.X pl2 #109',
        writes_simulated_then_rolled_back: [
          'external_mappings.card_print_id transfer',
          'card_print_identity delete for duplicate parent',
          'card_print_traits.card_print_id transfer',
          'duplicate card_print_species delete',
          'duplicate card_printings delete',
          'duplicate card_prints delete',
        ],
        forbidden: [
          'canonical owner parent overwrite',
          'GV-ID writes',
          'image writes',
          'migrations',
          'global apply',
        ],
      },
      preflight,
      execution,
      stop_findings: stopFindings,
      pass: stopFindings.length === 0,
    };

    report.recommended_approval_text = report.pass
      ? `Approve real ${PACKAGE_ID} apply only. Fingerprint: ${packageFingerprint}. Scope: 1 Luxray GL duplicate parent cleanup for tcgdex pl2-109; transfer 1 external mapping to canonical Luxray GL LV.X owner, delete 1 duplicate active identity, transfer 1 trait, delete 1 duplicate species mapping, delete 2 unsupported duplicate child printings, delete 1 duplicate parent. Dry-run proof: ${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}. No canonical owner parent overwrite. No GV-ID writes. No image writes. No migrations. No global apply.`
      : null;

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-24A Luxray Collision Cleanup Guarded Dry-Run V1',
      '',
      `Package: \`${PACKAGE_ID}\``,
      '',
      '## Result',
      '',
      `- Pass: ${report.pass}`,
      `- Package fingerprint: \`${packageFingerprint}\``,
      `- Dry-run proof: \`${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}\``,
      `- Stop findings: ${stopFindings.length}`,
      '',
      '## Evidence',
      '',
      markdownTable(SOURCE_EVIDENCE, [
        { label: 'source', value: (row) => row.source },
        { label: 'url', value: (row) => row.source_url },
        { label: 'label', value: (row) => row.evidence_label },
      ]),
      '',
      '## Simulated Scope',
      '',
      `- External mapping transfers: ${execution.inside_transaction_proof.external_mapping_transfers}`,
      `- Duplicate identity deletes: ${execution.inside_transaction_proof.identity_deletes}`,
      `- Trait transfers: ${execution.inside_transaction_proof.trait_transfers}`,
      `- Duplicate species deletes: ${execution.inside_transaction_proof.duplicate_species_deletes}`,
      `- Duplicate child printing deletes: ${execution.inside_transaction_proof.child_printing_deletes}`,
      `- Duplicate parent deletes: ${execution.inside_transaction_proof.parent_deletes}`,
      '',
      '## Safety',
      '',
      '- Rollback-only dry-run: true',
      '- Durable DB writes performed: false',
      '- Canonical owner parent overwrite: false',
      '- GV-ID writes: false',
      '- Image writes: false',
      '- Migrations created: false',
      '- Global apply: false',
      '',
      '## Stop Findings',
      '',
      stopFindings.length ? stopFindings.map((finding) => `- ${finding}`).join('\n') : '_None._',
      '',
      '## Approval Text If Accepted',
      '',
      report.recommended_approval_text ? `\`\`\`text\n${report.recommended_approval_text}\n\`\`\`` : '_Not available because dry-run failed._',
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      pass: report.pass,
      package_fingerprint_sha256: packageFingerprint,
      dry_run_proof: `${execution.before_snapshot.hash_sha256} == ${execution.after_rollback_snapshot.hash_sha256}`,
      stop_findings: stopFindings,
      recommended_approval_text: report.recommended_approval_text,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
