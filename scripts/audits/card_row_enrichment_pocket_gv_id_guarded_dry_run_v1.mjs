import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

import {
  buildPocketCardPrintGvIdV1,
  buildPocketCardPrintingGvIdV1,
} from '../../backend/warehouse/buildPocketGvIdV1.mjs';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const APPROVED_FINGERPRINT = '75e99091084a71d1e8780136d20eeafb4660ef9af3390fbf601191bf6c7902f7';
const APPROVED_PROOF = '89f59875340da2133a55675c5dcc7efac976a86df3643f30f4e6594dbcf883fc';

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

function groupBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return groups;
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

async function loadPocketRows(client) {
  const result = await client.query(`
    select
      cp.id::text as card_print_id,
      cp.name as card_name,
      coalesce(cp.set_code, s.code) as set_code,
      s.name as set_name,
      cp.number,
      cp.number_plain,
      cp.rarity,
      cp.variant_key,
      cp.gv_id,
      coalesce(cp.external_ids->>'tcgdex', em.external_id) as tcgdex_external_id,
      cpr.id::text as card_printing_id,
      cpr.finish_key,
      cpr.printing_gv_id
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    join public.card_printings cpr on cpr.card_print_id = cp.id
    left join lateral (
      select external_id
      from public.external_mappings
      where card_print_id = cp.id
        and source = 'tcgdex'
        and active is true
      order by external_id
      limit 1
    ) em on true
    where coalesce(cp.identity_domain, s.identity_domain_default) = 'tcg_pocket_excluded'
    order by coalesce(cp.set_code, s.code), cp.number_plain, cp.number, cp.name, cpr.finish_key
  `);
  return result.rows;
}

function buildParentRows(rows) {
  const byParent = new Map();
  for (const row of rows) {
    if (byParent.has(row.card_print_id)) continue;
    const proposedGvId = buildPocketCardPrintGvIdV1({
      setCode: row.set_code,
      number: row.number,
      numberPlain: row.number_plain,
      externalId: row.tcgdex_external_id,
    });
    byParent.set(row.card_print_id, {
      card_print_id: row.card_print_id,
      card_name: row.card_name,
      set_code: row.set_code,
      set_name: row.set_name,
      number: row.number,
      number_plain: row.number_plain,
      rarity: row.rarity,
      variant_key: row.variant_key,
      current_gv_id: row.gv_id,
      tcgdex_external_id: row.tcgdex_external_id,
      proposed_gv_id: proposedGvId,
    });
  }
  return [...byParent.values()];
}

function classifyDuplicateGroups(parentRows) {
  const duplicateGroups = [];
  for (const [proposedGvId, rows] of groupBy(parentRows, (row) => row.proposed_gv_id)) {
    if (rows.length <= 1) continue;
    const numberedRows = rows.filter((row) => row.number || row.number_plain);
    const sourceOnlyRows = rows.filter((row) => !row.number && !row.number_plain && row.tcgdex_external_id);
    const sameName = new Set(rows.map((row) => row.card_name)).size === 1;
    const sameSet = new Set(rows.map((row) => row.set_code)).size === 1;
    const sameRarity = new Set(rows.map((row) => row.rarity ?? '')).size === 1;
    if (!(rows.length === 2 && numberedRows.length === 1 && sourceOnlyRows.length === 1 && sameName && sameSet && sameRarity)) {
      throw new Error(`pocket_duplicate_group_not_deterministic:${proposedGvId}`);
    }
    duplicateGroups.push({
      proposed_gv_id: proposedGvId,
      owner_card_print_id: numberedRows[0].card_print_id,
      duplicate_card_print_id: sourceOnlyRows[0].card_print_id,
      set_code: numberedRows[0].set_code,
      card_name: numberedRows[0].card_name,
    });
  }
  return duplicateGroups;
}

function assertUnique(rows, key, label) {
  const duplicateKeys = [...groupBy(rows, (row) => row[key]).entries()].filter(([, group]) => group.length > 1);
  if (duplicateKeys.length > 0) throw new Error(`${label}_not_unique:${duplicateKeys[0][0]}`);
}

async function main() {
  const realApply = process.argv.includes('--apply');
  const outputJson = path.join(OUTPUT_DIR, realApply
    ? 'pocket_gv_id_real_apply_v1.json'
    : 'pocket_gv_id_guarded_dry_run_v1.json');
  const outputMd = path.join(OUTPUT_DIR, realApply
    ? 'pocket_gv_id_real_apply_v1.md'
    : 'pocket_gv_id_guarded_dry_run_v1.md');
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const rows = await loadPocketRows(client);
    const parentRows = buildParentRows(rows);
    const duplicateGroups = classifyDuplicateGroups(parentRows);
    const duplicateParentIds = new Set(duplicateGroups.map((group) => group.duplicate_card_print_id));
    const survivingParents = parentRows.filter((row) => !duplicateParentIds.has(row.card_print_id));
    const survivingChildren = rows
      .filter((row) => !duplicateParentIds.has(row.card_print_id))
      .map((row) => {
        const parent = survivingParents.find((candidate) => candidate.card_print_id === row.card_print_id);
        return {
          card_printing_id: row.card_printing_id,
          card_print_id: row.card_print_id,
          finish_key: row.finish_key,
          current_printing_gv_id: row.printing_gv_id,
          proposed_printing_gv_id: buildPocketCardPrintingGvIdV1({
            parentGvId: parent.proposed_gv_id,
            finishKey: row.finish_key,
          }),
        };
      });

    if (survivingParents.some((row) => row.current_gv_id)) throw new Error('pocket_parent_non_null_gv_id_present');
    if (survivingChildren.some((row) => row.current_printing_gv_id)) throw new Error('pocket_child_non_null_printing_gv_id_present');
    assertUnique(survivingParents, 'proposed_gv_id', 'pocket_parent_gv_id');
    assertUnique(survivingChildren, 'proposed_printing_gv_id', 'pocket_child_printing_gv_id');

    const fingerprint = sha256(stableJson({
      duplicateGroups,
      parentTargets: survivingParents.map((row) => ({ id: row.card_print_id, gv_id: row.proposed_gv_id })),
      childTargets: survivingChildren.map((row) => ({ id: row.card_printing_id, printing_gv_id: row.proposed_printing_gv_id })),
    }));
    if (realApply && fingerprint !== APPROVED_FINGERPRINT) {
      throw new Error(`approved_fingerprint_mismatch:${fingerprint}`);
    }

    let proof = null;
    await client.query('begin');
    let committed = false;
    try {
      const duplicatePairsJson = JSON.stringify(duplicateGroups);
      const parentTargetsJson = JSON.stringify(survivingParents.map((row) => ({
        id: row.card_print_id,
        gv_id: row.proposed_gv_id,
      })));
      const childTargetsJson = JSON.stringify(survivingChildren.map((row) => ({
        id: row.card_printing_id,
        printing_gv_id: row.proposed_printing_gv_id,
      })));

      const conflictResult = await client.query(`
        with pairs as (
          select * from jsonb_to_recordset($1::jsonb)
          as x(owner_card_print_id uuid, duplicate_card_print_id uuid)
        )
        select count(*)::int as rows
        from public.external_mappings dup
        join pairs p on p.duplicate_card_print_id = dup.card_print_id
        join public.external_mappings owner
          on owner.card_print_id = p.owner_card_print_id
         and owner.source = dup.source
         and owner.external_id = dup.external_id
         and owner.active is true
        where dup.active is true
      `, [duplicatePairsJson]);
      if (conflictResult.rows[0].rows !== 0) throw new Error('pocket_duplicate_external_mapping_conflict');

      const transferredMappings = await client.query(`
        with pairs as (
          select * from jsonb_to_recordset($1::jsonb)
          as x(owner_card_print_id uuid, duplicate_card_print_id uuid)
        )
        update public.external_mappings em
           set card_print_id = p.owner_card_print_id
        from pairs p
        where em.card_print_id = p.duplicate_card_print_id
        returning em.id
      `, [duplicatePairsJson]);

      const deletedPrintingMappings = await client.query(`
        with pairs as (
          select * from jsonb_to_recordset($1::jsonb)
          as x(owner_card_print_id uuid, duplicate_card_print_id uuid)
        ),
        duplicate_children as (
          select cpr.id
          from public.card_printings cpr
          join pairs p on p.duplicate_card_print_id = cpr.card_print_id
        )
        delete from public.external_printing_mappings epm
        using duplicate_children dc
        where epm.card_printing_id = dc.id
        returning epm.id
      `, [duplicatePairsJson]);

      const deletedIdentity = await client.query(`
        with pairs as (
          select * from jsonb_to_recordset($1::jsonb)
          as x(owner_card_print_id uuid, duplicate_card_print_id uuid)
        )
        delete from public.card_print_identity cpi
        using pairs p
        where cpi.card_print_id = p.duplicate_card_print_id
        returning cpi.id
      `, [duplicatePairsJson]);

      const deletedTraits = await client.query(`
        with pairs as (
          select * from jsonb_to_recordset($1::jsonb)
          as x(owner_card_print_id uuid, duplicate_card_print_id uuid)
        )
        delete from public.card_print_traits cpt
        using pairs p
        where cpt.card_print_id = p.duplicate_card_print_id
        returning cpt.id
      `, [duplicatePairsJson]);

      const deletedSpecies = await client.query(`
        with pairs as (
          select * from jsonb_to_recordset($1::jsonb)
          as x(owner_card_print_id uuid, duplicate_card_print_id uuid)
        )
        delete from public.card_print_species cps
        using pairs p
        where cps.card_print_id = p.duplicate_card_print_id
        returning cps.id
      `, [duplicatePairsJson]);

      const deletedChildren = await client.query(`
        with pairs as (
          select * from jsonb_to_recordset($1::jsonb)
          as x(owner_card_print_id uuid, duplicate_card_print_id uuid)
        )
        delete from public.card_printings cpr
        using pairs p
        where cpr.card_print_id = p.duplicate_card_print_id
        returning cpr.id
      `, [duplicatePairsJson]);

      const deletedParents = await client.query(`
        with pairs as (
          select * from jsonb_to_recordset($1::jsonb)
          as x(owner_card_print_id uuid, duplicate_card_print_id uuid)
        )
        delete from public.card_prints cp
        using pairs p
        where cp.id = p.duplicate_card_print_id
        returning cp.id
      `, [duplicatePairsJson]);

      const updatedParents = await client.query(`
        with targets as (
          select * from jsonb_to_recordset($1::jsonb)
          as x(id uuid, gv_id text)
        )
        update public.card_prints cp
           set gv_id = t.gv_id
        from targets t
        where cp.id = t.id
          and cp.gv_id is null
        returning cp.id
      `, [parentTargetsJson]);

      const updatedChildren = await client.query(`
        with targets as (
          select * from jsonb_to_recordset($1::jsonb)
          as x(id uuid, printing_gv_id text)
        )
        update public.card_printings cpr
           set printing_gv_id = t.printing_gv_id
        from targets t
        where cpr.id = t.id
          and cpr.printing_gv_id is null
        returning cpr.id
      `, [childTargetsJson]);

      if (transferredMappings.rowCount !== duplicateGroups.length) throw new Error('pocket_mapping_transfer_count_mismatch');
      if (deletedParents.rowCount !== duplicateGroups.length) throw new Error('pocket_duplicate_parent_delete_count_mismatch');
      if (deletedChildren.rowCount !== duplicateGroups.length * 3) throw new Error('pocket_duplicate_child_delete_count_mismatch');
      if (updatedParents.rowCount !== survivingParents.length) throw new Error('pocket_parent_gv_update_count_mismatch');
      if (updatedChildren.rowCount !== survivingChildren.length) throw new Error('pocket_child_gv_update_count_mismatch');

      proof = {
        duplicate_mappings_transferred: transferredMappings.rowCount,
        duplicate_printing_mappings_deleted: deletedPrintingMappings.rowCount,
        duplicate_identity_rows_deleted: deletedIdentity.rowCount,
        duplicate_trait_rows_deleted: deletedTraits.rowCount,
        duplicate_species_rows_deleted: deletedSpecies.rowCount,
        duplicate_children_deleted: deletedChildren.rowCount,
        duplicate_parents_deleted: deletedParents.rowCount,
        pocket_parent_gv_ids_updated: updatedParents.rowCount,
        pocket_child_printing_gv_ids_updated: updatedChildren.rowCount,
      };
      const proofHash = sha256(stableJson(proof));
      if (realApply && proofHash !== APPROVED_PROOF) {
        throw new Error(`approved_proof_mismatch:${proofHash}`);
      }
      if (realApply) {
        await client.query('commit');
        committed = true;
      }
    } finally {
      if (!committed) await client.query('rollback');
    }

    const proofHash = sha256(stableJson(proof));
    const report = {
      version: realApply ? 'POCKET_GV_ID_REAL_APPLY_V1' : 'POCKET_GV_ID_GUARDED_DRY_RUN_V1',
      generated_at: new Date().toISOString(),
      scope: {
        rollback_only: !realApply,
        db_writes_persisted: realApply,
        migrations_created: false,
        physical_rows_targeted: false,
        target_domain: 'tcg_pocket_excluded',
      },
      fingerprint_sha256: fingerprint,
      proof_sha256: proofHash,
      totals: {
        starting_pocket_parent_rows: parentRows.length,
        source_alias_duplicate_groups: duplicateGroups.length,
        surviving_pocket_parent_targets: survivingParents.length,
        surviving_pocket_child_targets: survivingChildren.length,
      },
      proof,
      sample_duplicate_groups: duplicateGroups.slice(0, 25),
      recommended_approval_phrase: `Approve real POCKET-GVID-01-SOURCE-ALIAS-CLEANUP-AND-GVID-BACKFILL apply only. Fingerprint: ${fingerprint}. Dry-run proof: ${proofHash}. Scope: ${duplicateGroups.length} Pocket source-alias duplicate parent cleanups, ${survivingParents.length} Pocket parent GV-ID updates, ${survivingChildren.length} Pocket child printing GV-ID updates. No physical rows. No migrations. No image writes. No global apply.`,
    };

    await writeJson(outputJson, report);
    const md = [
      realApply ? '# Pocket GV-ID Real Apply V1' : '# Pocket GV-ID Guarded Dry Run V1',
      '',
      realApply
        ? 'Real apply report for resolving deterministic Pocket source-alias duplicates and assigning `GV-TCGP-*` IDs.'
        : 'Rollback-only proof for resolving deterministic Pocket source-alias duplicates and assigning `GV-TCGP-*` IDs.',
      '',
      '## Safety',
      '',
      `- Rollback only: ${!realApply}`,
      `- DB writes persisted: ${realApply}`,
      '- Physical rows targeted: false',
      '- Migrations created: false',
      '',
      '## Totals',
      '',
      markdownTable(Object.entries(report.totals).map(([key, value]) => ({ key, value })), [
        { label: 'metric', value: (row) => row.key },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      '## Proof',
      '',
      markdownTable(Object.entries(proof).map(([key, value]) => ({ key, value })), [
        { label: 'metric', value: (row) => row.key },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      `Fingerprint: \`${fingerprint}\``,
      '',
      `Dry-run proof: \`${proofHash}\``,
      '',
      '## Approval Phrase',
      '',
      `\`${report.recommended_approval_phrase}\``,
      '',
    ].join('\n');
    await writeText(outputMd, md);
    console.log(JSON.stringify({
      output_json: outputJson,
      output_md: outputMd,
      fingerprint_sha256: fingerprint,
      proof_sha256: proofHash,
      totals: report.totals,
      proof,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
