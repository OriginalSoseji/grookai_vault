import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const INPUT_JSON = path.join(OUTPUT_DIR, 'enrich07_external_mapping_payload_guarded_dry_run_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich07_external_mapping_collision_adjudication_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich07_external_mapping_collision_adjudication_v1.md');

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

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+([0-9])/, '$1');
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

function loadTargets(dryRun) {
  const targets = dryRun.target_samples ?? [];
  if (!targets.length) {
    return (dryRun.execution?.before_snapshot?.rows ?? [])
      .filter((row) => row.row_type === 'parent')
      .map((row) => ({
        card_print_id: row.card_print_id,
        source: row.source,
        external_id: row.external_id,
        set_code: row.set_code,
        number: row.number,
        number_plain: row.number_plain,
        card_name: row.card_name,
      }));
  }
  return targets.map((row) => ({
    card_print_id: row.card_print_id,
    source: row.source,
    external_id: row.external_id,
    set_code: row.set_code,
    number: row.number,
    number_plain: row.number_plain,
    card_name: row.card_name,
  }));
}

async function loadCollisionRows(client, targets) {
  const result = await client.query(
    `with target as (
       select *
       from jsonb_to_recordset($1::jsonb) as t(
         card_print_id uuid,
         source text,
         external_id text,
         set_code text,
         number text,
         number_plain text,
         card_name text
       )
     ),
     owner_map as (
       select
         target.*,
         em.id::text as owner_mapping_id,
         em.card_print_id as owner_card_print_id,
         em.meta as owner_mapping_meta,
         em.synced_at as owner_mapping_synced_at
       from target
       join public.external_mappings em
         on em.source = target.source
        and em.external_id = target.external_id
        and em.active = true
     ),
     cp_counts as (
       select
         cp.id as card_print_id,
         count(distinct cpr.id)::int as child_count,
         coalesce(jsonb_agg(distinct cpr.finish_key) filter (where cpr.id is not null), '[]'::jsonb) as child_finishes,
         count(distinct cpr.id) filter (where nullif(cpr.printing_gv_id, '') is not null)::int as child_printing_gv_id_count,
         count(distinct cpr.id) filter (where nullif(cpr.image_path, '') is not null or nullif(cpr.image_url, '') is not null)::int as child_image_count,
         count(distinct cpi.id) filter (where cpi.is_active = true)::int as active_identity_count,
         count(distinct em.id) filter (where em.active = true)::int as active_mapping_count,
         count(distinct cpt.id)::int as trait_count,
         count(distinct cps.id) filter (where cps.active = true)::int as species_count,
         count(distinct cap.card_print_id)::int as active_price_count,
         count(distinct cpc.id) filter (where cpc.active = true)::int as active_cameo_count,
         count(distinct vii_direct.id) filter (where vii_direct.archived_at is null)::int as direct_vault_instance_count,
         count(distinct vii_child.id) filter (where vii_child.archived_at is null)::int as child_vault_instance_count
       from (
         select card_print_id as id from target
         union
         select owner_card_print_id as id from owner_map
       ) ids
       join public.card_prints cp on cp.id = ids.id
       left join public.card_printings cpr on cpr.card_print_id = cp.id
       left join public.card_print_identity cpi on cpi.card_print_id = cp.id
       left join public.external_mappings em on em.card_print_id = cp.id
       left join public.card_print_traits cpt on cpt.card_print_id = cp.id
       left join public.card_print_species cps on cps.card_print_id = cp.id
       left join public.card_print_active_prices cap on cap.card_print_id = cp.id
       left join public.card_print_cameos cpc on cpc.card_print_id = cp.id
       left join public.vault_item_instances vii_direct on vii_direct.card_print_id = cp.id
       left join public.vault_item_instances vii_child on vii_child.card_printing_id = cpr.id
       group by cp.id
     )
     select
       owner_map.card_print_id::text as target_card_print_id,
       target_cp.gv_id as target_gv_id,
       target_cp.set_code as target_set_code,
       target_set.name as target_set_name,
       target_cp.number as target_number,
       target_cp.number_plain as target_number_plain,
       target_cp.name as target_card_name,
       target_cp.printed_identity_modifier as target_printed_identity_modifier,
       target_cp.variant_key as target_variant_key,
       target_cp.external_ids as target_external_ids,
       owner_map.source,
       owner_map.external_id,
       owner_map.owner_mapping_id,
       owner_map.owner_mapping_meta,
       owner_map.owner_mapping_synced_at,
       owner_map.owner_card_print_id::text as owner_card_print_id,
       owner_cp.gv_id as owner_gv_id,
       owner_cp.set_code as owner_set_code,
       owner_set.name as owner_set_name,
       owner_cp.number as owner_number,
       owner_cp.number_plain as owner_number_plain,
       owner_cp.name as owner_card_name,
       owner_cp.printed_identity_modifier as owner_printed_identity_modifier,
       owner_cp.variant_key as owner_variant_key,
       owner_cp.external_ids as owner_external_ids,
       row_to_json(target_counts)::jsonb as target_counts,
       row_to_json(owner_counts)::jsonb as owner_counts
     from owner_map
     join public.card_prints target_cp on target_cp.id = owner_map.card_print_id
     left join public.sets target_set on target_set.id = target_cp.set_id
     join public.card_prints owner_cp on owner_cp.id = owner_map.owner_card_print_id
     left join public.sets owner_set on owner_set.id = owner_cp.set_id
     left join cp_counts target_counts on target_counts.card_print_id = target_cp.id
     left join cp_counts owner_counts on owner_counts.card_print_id = owner_cp.id
     order by owner_map.source, owner_map.external_id, target_cp.set_code nulls last, target_cp.number_plain nulls last, target_cp.number nulls last`,
    [JSON.stringify(targets)],
  );
  return result.rows;
}

function dependencyTotal(counts) {
  return Number(counts?.child_count ?? 0)
    + Number(counts?.active_identity_count ?? 0)
    + Number(counts?.active_mapping_count ?? 0)
    + Number(counts?.trait_count ?? 0)
    + Number(counts?.species_count ?? 0)
    + Number(counts?.active_price_count ?? 0)
    + Number(counts?.active_cameo_count ?? 0)
    + Number(counts?.direct_vault_instance_count ?? 0)
    + Number(counts?.child_vault_instance_count ?? 0);
}

function isSameCoreIdentity(row) {
  return String(row.target_set_code ?? '').toLowerCase() === String(row.owner_set_code ?? '').toLowerCase()
    && normalizeNumber(row.target_number) === normalizeNumber(row.owner_number)
    && normalizeName(row.target_card_name) === normalizeName(row.owner_card_name);
}

function isSameModifier(row) {
  return String(row.target_printed_identity_modifier ?? '') === String(row.owner_printed_identity_modifier ?? '')
    && String(row.target_variant_key ?? '') === String(row.owner_variant_key ?? '');
}

function classify(row) {
  const sameCore = isSameCoreIdentity(row);
  const sameModifier = isSameModifier(row);
  const targetDeps = dependencyTotal(row.target_counts);
  const ownerDeps = dependencyTotal(row.owner_counts);
  const targetHasVault = Number(row.target_counts?.direct_vault_instance_count ?? 0) > 0
    || Number(row.target_counts?.child_vault_instance_count ?? 0) > 0;

  if (!sameCore) return 'external_id_conflicts_with_different_card_manual_review';
  if (!sameModifier) return 'external_id_shared_across_modifier_or_variant_manual_review';
  if (targetHasVault) return 'dependency_bearing_collision_vault_manual_review';
  if (targetDeps === 0 && ownerDeps > 0) return 'safe_noop_existing_owner_already_mapped_target_empty_duplicate';
  if (targetDeps > 0 && ownerDeps > 0) return 'same_identity_duplicate_parent_needs_dependency_transfer_or_merge_plan';
  if (targetDeps > 0 && ownerDeps === 0) return 'target_may_be_better_owner_mapping_transfer_review';
  return 'same_identity_collision_unresolved_manual_review';
}

function recommendationFor(classification) {
  switch (classification) {
    case 'safe_noop_existing_owner_already_mapped_target_empty_duplicate':
      return 'Do not insert mapping. Later duplicate-parent cleanup may delete target if dependency guards still pass.';
    case 'same_identity_duplicate_parent_needs_dependency_transfer_or_merge_plan':
      return 'Do not insert duplicate mapping. Build a dependency-transfer or merge package only after owner proof.';
    case 'target_may_be_better_owner_mapping_transfer_review':
      return 'Review whether active mapping should transfer from owner to target; no automatic transfer.';
    case 'external_id_shared_across_modifier_or_variant_manual_review':
      return 'Source external ID is not variant-specific enough for blind mapping. Leave blocked unless a variant-aware rule exists.';
    case 'external_id_conflicts_with_different_card_manual_review':
      return 'Treat as source conflict. Do not write.';
    case 'dependency_bearing_collision_vault_manual_review':
      return 'Vault-bearing row. Manual review only.';
    default:
      return 'Manual review.';
  }
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const dryRun = await readJson(INPUT_JSON);
  const targets = loadTargets(dryRun);
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.query('set default_transaction_read_only = on');

  try {
    const rawRows = await loadCollisionRows(client, targets);
    const rows = rawRows.map((row) => {
      const classification = classify(row);
      return {
        ...row,
        same_core_identity: isSameCoreIdentity(row),
        same_modifier_identity: isSameModifier(row),
        target_dependency_total: dependencyTotal(row.target_counts),
        owner_dependency_total: dependencyTotal(row.owner_counts),
        adjudication_classification: classification,
        recommended_next_action: recommendationFor(classification),
      };
    });

    const summary = {
      input_package_id: dryRun.package_id,
      input_package_pass: dryRun.pass,
      input_package_fingerprint_sha256: dryRun.package_fingerprint_sha256,
      target_rows: targets.length,
      collision_rows: rows.length,
      by_source: countBy(rows, (row) => row.source),
      by_adjudication_classification: countBy(rows, (row) => row.adjudication_classification),
      same_core_identity_rows: rows.filter((row) => row.same_core_identity).length,
      same_modifier_identity_rows: rows.filter((row) => row.same_modifier_identity).length,
      target_empty_rows: rows.filter((row) => row.target_dependency_total === 0).length,
      target_dependency_bearing_rows: rows.filter((row) => row.target_dependency_total > 0).length,
      owner_dependency_bearing_rows: rows.filter((row) => row.owner_dependency_total > 0).length,
    };

    const report = {
      version: 'ENRICH07_EXTERNAL_MAPPING_COLLISION_ADJUDICATION_V1',
      generated_at: new Date().toISOString(),
      mode: 'read_only',
      source_file: INPUT_JSON,
      db_writes_performed: false,
      migrations_created: false,
      scope: {
        target_rows: targets.length,
        collision_rows: rows.length,
        writes_performed: [],
        forbidden: ['external_mappings inserts', 'external_mappings transfers', 'parent writes', 'child writes', 'identity writes', 'deletes', 'merges', 'migrations', 'image writes', 'global apply'],
      },
      summary,
      rows,
      next_recommended_package: null,
      stop_findings: [
        'enrich07_payload_insert_remains_blocked_by_existing_source_external_collisions',
      ],
      fingerprint_sha256: sha256(stableJson({
        version: 'ENRICH07_EXTERNAL_MAPPING_COLLISION_ADJUDICATION_V1',
        rows: rows.map((row) => ({
          target_card_print_id: row.target_card_print_id,
          owner_card_print_id: row.owner_card_print_id,
          source: row.source,
          external_id: row.external_id,
          classification: row.adjudication_classification,
          target_dependency_total: row.target_dependency_total,
          owner_dependency_total: row.owner_dependency_total,
        })),
      })),
    };

    await writeJson(OUTPUT_JSON, report);

    const classRows = Object.entries(summary.by_adjudication_classification)
      .map(([classification, count]) => ({ classification, count }));
    const rowTable = rows.map((row) => ({
      source: row.source,
      external_id: row.external_id,
      target: `${row.target_set_code} ${row.target_number} ${row.target_card_name}`,
      owner: `${row.owner_set_code} ${row.owner_number} ${row.owner_card_name}`,
      target_deps: row.target_dependency_total,
      owner_deps: row.owner_dependency_total,
      classification: row.adjudication_classification,
    }));

    const md = [
      '# ENRICH-07 External Mapping Collision Adjudication V1',
      '',
      'Read-only adjudication of the external mapping payload backfill rows blocked by active source/external-id collisions.',
      '',
      '## Safety',
      '',
      '- DB writes performed: false',
      '- Migrations created: false',
      '- No mapping inserts, transfers, parent writes, child writes, deletes, merges, or image writes were executed.',
      '- This report is not apply authority.',
      '',
      '## Summary',
      '',
      `- Input package: \`${summary.input_package_id}\``,
      `- Input package passed: ${summary.input_package_pass}`,
      `- Input package fingerprint: \`${summary.input_package_fingerprint_sha256}\``,
      `- Target rows: ${summary.target_rows}`,
      `- Collision rows: ${summary.collision_rows}`,
      `- Same core identity rows: ${summary.same_core_identity_rows}`,
      `- Same modifier identity rows: ${summary.same_modifier_identity_rows}`,
      `- Target empty rows: ${summary.target_empty_rows}`,
      `- Target dependency-bearing rows: ${summary.target_dependency_bearing_rows}`,
      '',
      '## Classification Counts',
      '',
      markdownTable(classRows, [
        { label: 'classification', value: (row) => row.classification },
        { label: 'rows', value: (row) => row.count },
      ]),
      '',
      '## Collision Rows',
      '',
      markdownTable(rowTable, [
        { label: 'source', value: (row) => row.source },
        { label: 'external_id', value: (row) => row.external_id },
        { label: 'target', value: (row) => row.target },
        { label: 'owner', value: (row) => row.owner },
        { label: 'target deps', value: (row) => row.target_deps },
        { label: 'owner deps', value: (row) => row.owner_deps },
        { label: 'classification', value: (row) => row.classification },
      ]),
      '',
      '## Decision',
      '',
      'ENRICH-07 remains blocked. These rows cannot be fixed by inserting new `external_mappings` rows because the active source/external IDs already belong to existing owners.',
      '',
      `Fingerprint: \`${report.fingerprint_sha256}\``,
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      summary,
      fingerprint_sha256: report.fingerprint_sha256,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
