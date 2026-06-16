import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

import { buildCardPrintGvIdV1 } from '../../backend/warehouse/buildCardPrintGvIdV1.mjs';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich31a_physical_gv_id_collision_governance_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich31a_physical_gv_id_collision_governance_v1.md');

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

function clean(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
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

function classifyRow(row, owners) {
  const ownerSetCodes = new Set(owners.map((owner) => owner.owner_set_code).filter(Boolean));
  const ownerModifiers = new Set(owners.map((owner) => owner.owner_printed_identity_modifier).filter(Boolean));
  const ownerNames = new Set(owners.map((owner) => owner.owner_name).filter(Boolean));

  if (row.printed_identity_modifier === 'number_prefix:SV' && row.set_code === 'sm115' && ownerSetCodes.has('sma')) {
    return {
      lane: 'shiny_vault_alias_owner_relocation_needed',
      recommended_action: 'Resolve sm115/sma Hidden Fates Shiny Vault ownership. Do not mint a second GV-ID for the same SV-number identity.',
      write_safe_now: false,
    };
  }

  if (row.printed_identity_modifier?.startsWith('trainer_subject:')) {
    return {
      lane: 'modifier_gv_id_ready_after_policy',
      recommended_action: 'Assign modifier-aware parent GV-ID using governed trainer-subject suffix, then child printing_gv_id can follow.',
      write_safe_now: true,
    };
  }

  if (row.printed_identity_modifier === 'edition:first_edition') {
    return {
      lane: 'first_edition_modifier_gv_id_ready_after_policy',
      recommended_action: 'Assign modifier-aware parent GV-ID using governed first-edition suffix, then child printing_gv_id can follow.',
      write_safe_now: true,
    };
  }

  if (!row.printed_identity_modifier && (row.card_name?.includes('LV.X') || ownerModifiers.has('level_x') || [...ownerNames].some((name) => name?.includes('LV.X')))) {
    return {
      lane: 'level_x_identity_owner_resolution_needed',
      recommended_action: 'Resolve LV.X owner identity before GV-ID. Likely missing printed_identity_modifier=level_x or duplicate owner transfer.',
      write_safe_now: false,
    };
  }

  if (row.printed_identity_modifier) {
    return {
      lane: 'modifier_gv_id_policy_needed',
      recommended_action: 'Create or approve a modifier-to-GV suffix rule before assignment.',
      write_safe_now: false,
    };
  }

  return {
    lane: 'manual_collision_adjudication_needed',
    recommended_action: 'Collision does not match a governed pattern. Review owner and source row manually.',
    write_safe_now: false,
  };
}

async function loadMissingPhysicalParents(client) {
  const result = await client.query(`
    select
      cp.id::text as card_print_id,
      cp.name as card_name,
      cp.set_id::text as set_id,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.variant_key,
      cp.printed_identity_modifier,
      cp.gv_id,
      cp.identity_domain,
      cp.external_ids,
      s.name as set_name,
      s.printed_set_abbrev,
      s.identity_domain_default
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    where cp.gv_id is null
      and coalesce(cp.identity_domain, s.identity_domain_default) = 'pokemon_eng_standard'
      and s.identity_domain_default = 'pokemon_eng_standard'
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name nulls last, cp.id
  `);
  return result.rows;
}

async function loadCollisionOwners(client, rows) {
  const proposedRows = rows.map((row) => ({
    card_print_id: row.card_print_id,
    proposed_base_gv_id: row.proposed_base_gv_id,
    proposed_modifier_gv_id: row.proposed_modifier_gv_id,
  }));
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         proposed_base_gv_id text,
         proposed_modifier_gv_id text
       )
     )
     select
       target.card_print_id::text as source_card_print_id,
       target.proposed_base_gv_id,
       target.proposed_modifier_gv_id,
       owner.id::text as owner_card_print_id,
       owner.set_code as owner_set_code,
       owner.number as owner_number,
       owner.number_plain as owner_number_plain,
       owner.name as owner_name,
       owner.gv_id as owner_gv_id,
       owner.printed_identity_modifier as owner_printed_identity_modifier,
       owner.variant_key as owner_variant_key,
       owner.identity_domain as owner_identity_domain
     from target
     join public.card_prints owner
       on owner.gv_id in (target.proposed_base_gv_id, target.proposed_modifier_gv_id)
      and owner.id <> target.card_print_id
     order by target.card_print_id, owner.gv_id, owner.set_code nulls last, owner.number_plain nulls last, owner.name nulls last`,
    [JSON.stringify(proposedRows)],
  );
  return result.rows;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const missingRows = await loadMissingPhysicalParents(client);
    const projectedRows = missingRows.map((row) => {
      let proposedBaseGvId = null;
      let proposedModifierGvId = null;
      let buildError = null;
      try {
        proposedBaseGvId = buildCardPrintGvIdV1({
          setCode: row.set_code,
          printedSetAbbrev: row.printed_set_abbrev,
          number: row.number,
          numberPlain: row.number_plain,
          variantKey: row.variant_key,
        });
        proposedModifierGvId = buildCardPrintGvIdV1({
          setCode: row.set_code,
          printedSetAbbrev: row.printed_set_abbrev,
          number: row.number,
          numberPlain: row.number_plain,
          variantKey: row.variant_key,
          printedIdentityModifier: row.printed_identity_modifier,
        });
      } catch (error) {
        buildError = error.message;
      }
      return {
        ...row,
        proposed_base_gv_id: proposedBaseGvId,
        proposed_modifier_gv_id: proposedModifierGvId && proposedModifierGvId !== proposedBaseGvId ? proposedModifierGvId : null,
        build_error: buildError,
      };
    });

    const ownerRows = await loadCollisionOwners(client, projectedRows);
    const ownerRowsBySource = new Map();
    for (const owner of ownerRows) {
      const key = owner.source_card_print_id;
      if (!ownerRowsBySource.has(key)) ownerRowsBySource.set(key, []);
      ownerRowsBySource.get(key).push(owner);
    }

    const rows = projectedRows.map((row) => {
      const owners = ownerRowsBySource.get(row.card_print_id) ?? [];
      const classification = classifyRow(row, owners);
      const modifierGvCollision = owners.some((owner) => owner.owner_gv_id === row.proposed_modifier_gv_id);
      return {
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        set_name: row.set_name,
        number: row.number,
        number_plain: row.number_plain,
        card_name: row.card_name,
        variant_key: row.variant_key,
        printed_identity_modifier: row.printed_identity_modifier,
        proposed_base_gv_id: row.proposed_base_gv_id,
        proposed_modifier_gv_id: row.proposed_modifier_gv_id,
        proposed_modifier_gv_id_collision: modifierGvCollision,
        build_error: row.build_error,
        lane: classification.lane,
        recommended_action: classification.recommended_action,
        write_safe_now: classification.write_safe_now && !modifierGvCollision && !!row.proposed_modifier_gv_id,
        collision_owners: owners.map((owner) => ({
          owner_card_print_id: owner.owner_card_print_id,
          set_code: owner.owner_set_code,
          number: owner.owner_number,
          card_name: owner.owner_name,
          gv_id: owner.owner_gv_id,
          printed_identity_modifier: owner.owner_printed_identity_modifier,
          variant_key: owner.owner_variant_key,
        })),
      };
    });

    const writeReadyRows = rows.filter((row) => row.write_safe_now);
    const report = {
      version: 'ENRICH31A_PHYSICAL_GV_ID_COLLISION_GOVERNANCE_V1',
      generated_at: new Date().toISOString(),
      scope: {
        target: 'English physical card_prints with null gv_id',
        db_writes_performed: false,
        migrations_created: false,
        parent_overwrites_performed: false,
        child_writes_performed: false,
        pocket_rows_excluded: true,
      },
      totals: {
        physical_parent_gv_id_gap_rows: rows.length,
        write_safe_modifier_rows: writeReadyRows.length,
        blocked_or_alias_resolution_rows: rows.length - writeReadyRows.length,
      },
      by_lane: countBy(rows, (row) => row.lane),
      by_set: countBy(rows, (row) => row.set_code),
      write_ready_preview: writeReadyRows.map((row) => ({
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        number: row.number,
        card_name: row.card_name,
        printed_identity_modifier: row.printed_identity_modifier,
        proposed_gv_id: row.proposed_modifier_gv_id,
      })),
      rows,
    };
    report.fingerprint_sha256 = sha256(stableJson({
      version: report.version,
      totals: report.totals,
      by_lane: report.by_lane,
      write_ready_preview: report.write_ready_preview,
    }));

    await writeJson(OUTPUT_JSON, report);

    const laneRows = Object.entries(report.by_lane).map(([lane, count]) => ({ lane, count }));
    const setRows = Object.entries(report.by_set).map(([set_code, count]) => ({ set_code, count }));
    const md = [
      '# ENRICH-31A Physical GV-ID Collision Governance V1',
      '',
      'Read-only governance report for remaining English physical parent `gv_id` gaps.',
      '',
      '## Safety',
      '',
      '- DB writes performed: false',
      '- Migrations created: false',
      '- Parent overwrites performed: false',
      '- Child writes performed: false',
      '- Pocket rows excluded: true',
      '',
      '## Summary',
      '',
      `- Physical parent GV-ID gap rows: ${report.totals.physical_parent_gv_id_gap_rows}`,
      `- Write-safe modifier rows after policy: ${report.totals.write_safe_modifier_rows}`,
      `- Blocked or alias-resolution rows: ${report.totals.blocked_or_alias_resolution_rows}`,
      '',
      '## By Lane',
      '',
      markdownTable(laneRows, [
        { label: 'lane', value: (row) => row.lane },
        { label: 'rows', value: (row) => row.count },
      ]),
      '',
      '## By Set',
      '',
      markdownTable(setRows, [
        { label: 'set', value: (row) => row.set_code },
        { label: 'rows', value: (row) => row.count },
      ]),
      '',
      '## Write-Ready Preview',
      '',
      markdownTable(report.write_ready_preview, [
        { label: 'set', value: (row) => row.set_code },
        { label: 'number', value: (row) => row.number },
        { label: 'name', value: (row) => row.card_name },
        { label: 'modifier', value: (row) => row.printed_identity_modifier },
        { label: 'proposed gv_id', value: (row) => row.proposed_gv_id },
      ]),
      '',
      '## Governance Notes',
      '',
      '- `shiny_vault_alias_owner_relocation_needed` rows must not receive new GV-IDs until sm115/sma Hidden Fates Shiny Vault ownership is resolved.',
      '- `level_x_identity_owner_resolution_needed` rows must not receive new GV-IDs until LV.X ownership/modifier state is resolved.',
      '- Trainer-subject and first-edition rows can be completed with modifier-aware GV-ID suffixes after guarded dry-run proof.',
      '',
      `Fingerprint: \`${report.fingerprint_sha256}\``,
      '',
    ].join('\n');
    await writeText(OUTPUT_MD, md);

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      totals: report.totals,
      by_lane: report.by_lane,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
