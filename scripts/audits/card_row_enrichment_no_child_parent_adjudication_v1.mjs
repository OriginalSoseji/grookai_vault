import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const RESIDUAL_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_residual_blocker_audit_v1.json');
const MASTER_PRINTINGS_JSON = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_no_child_parent_adjudication_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'card_row_enrichment_no_child_parent_adjudication_v1.md');

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

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function identityKey(row) {
  return [
    String(row.set_code ?? row.set_key ?? '').toLowerCase(),
    String(row.number ?? row.card_number ?? ''),
    normalizeName(row.card_name ?? row.name),
  ].join('|');
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

function buildMasterLookup(masterPrintings) {
  const byCard = new Map();
  for (const printing of masterPrintings.printings ?? []) {
    if (printing.status !== 'master_verified') continue;
    const key = identityKey({
      set_code: printing.set_key,
      number: printing.card_number,
      card_name: printing.card_name,
    });
    if (!byCard.has(key)) {
      byCard.set(key, {
        set_key: printing.set_key,
        card_number: printing.card_number,
        card_name: printing.card_name,
        printing_count: 0,
        finish_keys: new Set(),
        evidence_urls: new Set(),
      });
    }
    const entry = byCard.get(key);
    entry.printing_count += 1;
    entry.finish_keys.add(printing.finish_key);
    for (const url of printing.evidence_urls ?? []) entry.evidence_urls.add(url);
  }
  return byCard;
}

async function loadSiblingOwners(client, noChildRows) {
  if (!noChildRows.length) return new Map();
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
       select card_print_id, count(*)::int as child_count
       from public.card_printings
       group by card_print_id
     )
     select
       target.card_print_id::text as target_card_print_id,
       owner.id::text as owner_card_print_id,
       owner.gv_id as owner_gv_id,
       owner.set_code as owner_set_code,
       owner.number as owner_number,
       owner.number_plain as owner_number_plain,
       owner.name as owner_card_name,
       owner.printed_identity_modifier as owner_printed_identity_modifier,
       coalesce(child.child_count, 0)::int as owner_child_count
     from target
     join public.card_prints owner
       on owner.id <> target.card_print_id
      and owner.set_code is not distinct from target.set_code
      and owner.number is not distinct from target.number
      and lower(owner.name) = lower(target.card_name)
     left join child on child.card_print_id = owner.id
     where coalesce(child.child_count, 0) > 0
        or owner.gv_id is not null
     order by target.card_print_id::text, coalesce(child.child_count, 0) desc, owner.gv_id nulls last`,
    [JSON.stringify(noChildRows.map((row) => ({
      card_print_id: row.card_print_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
    })))],
  );

  const byTarget = new Map();
  for (const row of result.rows) {
    if (!byTarget.has(row.target_card_print_id)) byTarget.set(row.target_card_print_id, []);
    byTarget.get(row.target_card_print_id).push(row);
  }
  return byTarget;
}

async function loadNoChildParents(client) {
  const result = await client.query(`
    with child as (
      select card_print_id, count(*)::int as child_count
      from public.card_printings
      group by card_print_id
    )
    select
      cp.id::text as card_print_id,
      cp.gv_id,
      cp.set_code,
      s.name as set_name,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.variant_key,
      cp.printed_identity_modifier,
      cp.external_ids,
      count(distinct cpi.id) filter (where cpi.is_active = true)::int as active_identity_count,
      count(distinct em.id) filter (where em.active = true)::int as active_mapping_count,
      count(distinct cpt.id)::int as trait_count,
      count(distinct cps.id) filter (where cps.active = true)::int as species_count,
      count(distinct vii.id) filter (where vii.archived_at is null)::int as vault_instance_count
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    left join child on child.card_print_id = cp.id
    left join public.card_print_identity cpi on cpi.card_print_id = cp.id
    left join public.external_mappings em on em.card_print_id = cp.id
    left join public.card_print_traits cpt on cpt.card_print_id = cp.id
    left join public.card_print_species cps on cps.card_print_id = cp.id
    left join public.vault_item_instances vii on vii.card_print_id = cp.id
    where s.identity_domain_default like 'pokemon_eng%'
      and coalesce(child.child_count, 0) = 0
    group by cp.id, s.name
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name
  `);
  return result.rows;
}

function classify(row) {
  if (row.vault_instance_count > 0) return 'vault_referenced_childless_parent_manual_review';
  if (row.in_stale_gv_collision_lane && row.dependency_count === 0) return 'ready_for_empty_duplicate_parent_delete_dry_run_preparation';
  if (row.dependency_count === 0 && row.sibling_owner_count > 0) return 'empty_duplicate_parent_delete_candidate_needs_owner_proof';
  if (row.active_mapping_count > 0 && row.sibling_owner_count > 0) return 'mapping_transfer_or_duplicate_resolution_required';
  if (row.active_mapping_count > 0 && row.master_printing_count > 0) return 'source_mapped_child_insert_candidate_needs_finish_selection';
  if (row.master_printing_count > 0 && row.dependency_count === 0) return 'empty_parent_supported_by_index_needs_child_insert_or_parent_review';
  if (row.dependency_count > 0) return 'dependency_bearing_childless_parent_manual_review';
  return 'unsupported_childless_parent_manual_review';
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const [residual, masterPrintings] = await Promise.all([
    readJson(RESIDUAL_JSON),
    readJson(MASTER_PRINTINGS_JSON),
  ]);

  const staleCollisionIds = new Set((residual.parent_gv_collision?.rows ?? [])
    .filter((row) => row.residual_classification === 'stale_empty_duplicate_parent_candidate')
    .map((row) => row.card_print_id));
  const masterByCard = buildMasterLookup(masterPrintings);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.query('set default_transaction_read_only = on');
  try {
    const noChildRows = await loadNoChildParents(client);
    const siblingOwners = await loadSiblingOwners(client, noChildRows);
    const rows = noChildRows.map((row) => {
      const master = masterByCard.get(identityKey(row)) ?? null;
      const siblings = siblingOwners.get(row.card_print_id) ?? [];
      const dependencyCount = Number(row.active_identity_count ?? 0)
        + Number(row.active_mapping_count ?? 0)
        + Number(row.trait_count ?? 0)
        + Number(row.species_count ?? 0)
        + Number(row.vault_instance_count ?? 0);
      const enriched = {
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        set_code: row.set_code,
        set_name: row.set_name,
        number: row.number,
        number_plain: row.number_plain,
        card_name: row.card_name,
        variant_key: row.variant_key,
        printed_identity_modifier: row.printed_identity_modifier,
        dependency_count: dependencyCount,
        active_identity_count: Number(row.active_identity_count ?? 0),
        active_mapping_count: Number(row.active_mapping_count ?? 0),
        trait_count: Number(row.trait_count ?? 0),
        species_count: Number(row.species_count ?? 0),
        vault_instance_count: Number(row.vault_instance_count ?? 0),
        in_stale_gv_collision_lane: staleCollisionIds.has(row.card_print_id),
        sibling_owner_count: siblings.length,
        sibling_owner_samples: siblings.slice(0, 5),
        master_index_supported: Boolean(master),
        master_printing_count: master?.printing_count ?? 0,
        master_finish_keys: master ? [...master.finish_keys].sort() : [],
        master_evidence_url_samples: master ? [...master.evidence_urls].slice(0, 5) : [],
      };
      return {
        ...enriched,
        adjudication_classification: classify(enriched),
      };
    });

    const summary = {
      total_no_child_parent_rows: rows.length,
      by_adjudication_classification: countBy(rows, (row) => row.adjudication_classification),
      by_set_top_25: Object.fromEntries(Object.entries(countBy(rows, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
      by_dependency_shape: {
        zero_dependency_rows: rows.filter((row) => row.dependency_count === 0).length,
        dependency_bearing_rows: rows.filter((row) => row.dependency_count > 0).length,
        stale_gv_collision_lane_rows: rows.filter((row) => row.in_stale_gv_collision_lane).length,
        sibling_owner_rows: rows.filter((row) => row.sibling_owner_count > 0).length,
        master_index_supported_rows: rows.filter((row) => row.master_index_supported).length,
      },
    };

    const report = {
      version: 'CARD_ROW_ENRICHMENT_NO_CHILD_PARENT_ADJUDICATION_V1',
      generated_at: new Date().toISOString(),
      mode: 'read_only',
      db_writes_performed: false,
      migrations_created: false,
      source_files: {
        residual_audit: RESIDUAL_JSON,
        master_printings: MASTER_PRINTINGS_JSON,
      },
      summary,
      recommended_next_packages: [
        {
          package_id: 'ENRICH-06A-EMPTY-DUPLICATE-PARENT-DELETE-DRY-RUN',
          status: 'ready_for_guarded_dry_run_design',
          candidate_rows: summary.by_adjudication_classification.ready_for_empty_duplicate_parent_delete_dry_run_preparation ?? 0,
          writes_if_later_approved: ['card_prints deletes only after zero-dependency and canonical-owner proof'],
          forbidden: ['child deletes', 'identity deletes', 'mapping deletes', 'merges', 'migrations', 'image writes'],
        },
        {
          package_id: 'ENRICH-06B-MAPPING-TRANSFER-OR-DUPLICATE-RESOLUTION',
          status: 'needs_source_specific_guarded_design',
          candidate_rows: summary.by_adjudication_classification.mapping_transfer_or_duplicate_resolution_required ?? 0,
          writes_if_later_approved: ['external_mappings transfers and/or parent resolution after proof'],
          forbidden: ['blind inserts', 'global apply', 'migrations', 'image writes'],
        },
        {
          package_id: 'ENRICH-06C-SOURCE-MAPPED-CHILD-INSERT-SELECTION',
          status: 'needs_finish_selection_from_master_index',
          candidate_rows: summary.by_adjudication_classification.source_mapped_child_insert_candidate_needs_finish_selection ?? 0,
          writes_if_later_approved: ['card_printings inserts only after exact finish selection'],
          forbidden: ['parent overwrites', 'delete cleanup', 'migrations', 'image writes'],
        },
      ],
      rows,
      samples_by_classification: Object.fromEntries(Object.entries(countBy(rows, (row) => row.adjudication_classification))
        .map(([classification]) => [classification, rows.filter((row) => row.adjudication_classification === classification).slice(0, 25)])),
      fingerprint_sha256: sha256(stableJson({
        version: 'CARD_ROW_ENRICHMENT_NO_CHILD_PARENT_ADJUDICATION_V1',
        rows: rows.map((row) => ({
          card_print_id: row.card_print_id,
          classification: row.adjudication_classification,
          dependency_count: row.dependency_count,
          sibling_owner_count: row.sibling_owner_count,
          master_printing_count: row.master_printing_count,
        })),
      })),
    };

    await writeJson(OUTPUT_JSON, report);

    const classRows = Object.entries(summary.by_adjudication_classification)
      .map(([classification, count]) => ({ classification, count }));
    const packageRows = report.recommended_next_packages;
    const md = [
      '# Card Row Enrichment No-Child Parent Adjudication V1',
      '',
      'Read-only classification of English physical `card_prints` rows that currently have no `card_printings` children.',
      '',
      '## Safety',
      '',
      '- DB writes performed: false',
      '- Migrations created: false',
      '- No deletes, inserts, transfers, merges, or image writes were executed.',
      '- This report is not apply authority.',
      '',
      '## Summary',
      '',
      `- Total no-child parent rows: ${summary.total_no_child_parent_rows}`,
      `- Zero-dependency rows: ${summary.by_dependency_shape.zero_dependency_rows}`,
      `- Dependency-bearing rows: ${summary.by_dependency_shape.dependency_bearing_rows}`,
      `- Stale GV collision lane rows: ${summary.by_dependency_shape.stale_gv_collision_lane_rows}`,
      `- Rows with sibling owners: ${summary.by_dependency_shape.sibling_owner_rows}`,
      `- Master Index supported rows: ${summary.by_dependency_shape.master_index_supported_rows}`,
      '',
      '## Classification Counts',
      '',
      markdownTable(classRows, [
        { label: 'classification', value: (row) => row.classification },
        { label: 'rows', value: (row) => row.count },
      ]),
      '',
      '## Recommended Next Packages',
      '',
      markdownTable(packageRows, [
        { label: 'package', value: (row) => row.package_id },
        { label: 'status', value: (row) => row.status },
        { label: 'candidate rows', value: (row) => row.candidate_rows },
      ]),
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
