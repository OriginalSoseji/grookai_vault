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
const PLAN_JSON = path.join(OUTPUT_DIR, 'card_row_enrichment_cleanup_plan_v1.json');
const PLAN_MD = path.join(OUTPUT_DIR, 'card_row_enrichment_cleanup_plan_v1.md');
const PARENT_GV_CANDIDATES_JSON = path.join(OUTPUT_DIR, 'parent_gv_id_backfill_candidates_v1.json');
const CHILD_GV_CANDIDATES_JSON = path.join(OUTPUT_DIR, 'child_printing_gv_id_backfill_candidates_v1.json');
const ACTIVE_IDENTITY_CANDIDATES_JSON = path.join(OUTPUT_DIR, 'active_identity_backfill_candidates_v1.json');

const FINISH_GV_SUFFIX = Object.freeze({
  normal: 'STD',
  holo: 'HOLO',
  reverse: 'RH',
  pokeball: 'PB',
  masterball: 'MB',
  cosmos: 'COSMOS',
  rocket_reverse: 'ROCKET',
});

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
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

function sampleRows(rows, limit = 20) {
  return rows.slice(0, limit).map((row) => ({
    card_print_id: row.card_print_id,
    card_printing_id: row.card_printing_id,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    number_plain: row.number_plain,
    card_name: row.card_name,
    finish_key: row.finish_key,
    classification: row.classification,
    blockers: row.blockers,
  }));
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

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

function classifyParentGv(row, proposedGvId, existingGvIds, proposedCounts, buildError) {
  const blockers = [];
  if (buildError) blockers.push(`gv_id_build_error:${buildError}`);
  if (!clean(row.set_code)) blockers.push('missing_parent_set_code');
  if (!clean(row.number) && !clean(row.number_plain)) blockers.push('missing_printed_number');
  if (proposedGvId && existingGvIds.has(proposedGvId)) blockers.push('proposed_gv_id_existing_collision');
  if (proposedGvId && (proposedCounts.get(proposedGvId) ?? 0) > 1) blockers.push('proposed_gv_id_batch_duplicate');

  return {
    classification: blockers.length === 0 ? 'ready_for_parent_gv_id_backfill_dry_run' : 'blocked_parent_gv_id_backfill',
    blockers,
  };
}

function classifyChildGv(row, proposedPrintingGvId, existingPrintingGvIds, proposedCounts) {
  const blockers = [];
  if (!clean(row.parent_gv_id)) blockers.push('missing_parent_gv_id');
  if (!clean(row.finish_key)) blockers.push('missing_finish_key');
  if (clean(row.finish_key) && !FINISH_GV_SUFFIX[row.finish_key]) blockers.push('finish_suffix_rule_needed');
  if (proposedPrintingGvId && existingPrintingGvIds.has(proposedPrintingGvId)) blockers.push('proposed_printing_gv_id_existing_collision');
  if (proposedPrintingGvId && (proposedCounts.get(proposedPrintingGvId) ?? 0) > 1) blockers.push('proposed_printing_gv_id_batch_duplicate');

  return {
    classification: blockers.length === 0 ? 'ready_for_child_printing_gv_id_backfill_dry_run' : 'blocked_child_printing_gv_id_backfill',
    blockers,
  };
}

function classifyActiveIdentity(row, projectedCounts) {
  const blockers = [];
  const projected = row.projected ?? {};
  if (projected.status !== 'ready') blockers.push(`identity_projection_not_ready:${projected.status ?? 'missing'}`);
  if (!projected.identity_key_hash) blockers.push('missing_projected_identity_key_hash');
  if (Number(row.existing_hash_collision_count ?? 0) > 0) blockers.push('identity_hash_existing_collision');
  if (projected.identity_key_hash && (projectedCounts.get(projected.identity_key_hash) ?? 0) > 1) blockers.push('identity_hash_batch_duplicate');

  return {
    classification: blockers.length === 0 ? 'ready_for_active_identity_backfill_dry_run' : 'blocked_active_identity_backfill',
    blockers,
  };
}

async function loadParentRows(client) {
  return queryRows(client, `
    with active_identity as (
      select card_print_id, count(*)::int as active_identity_count
      from public.card_print_identity
      where is_active = true
      group by card_print_id
    ),
    mappings as (
      select card_print_id, count(*) filter (where active = true)::int as active_external_mapping_count
      from public.external_mappings
      group by card_print_id
    ),
    child as (
      select card_print_id, count(*)::int as child_printing_count
      from public.card_printings
      group by card_print_id
    ),
    prices as (
      select card_print_id, count(*)::int as price_count
      from public.card_print_active_prices
      group by card_print_id
    ),
    traits as (
      select card_print_id, count(*)::int as trait_count
      from public.card_print_traits
      group by card_print_id
    ),
    species as (
      select card_print_id, count(*) filter (where active = true)::int as species_count
      from public.card_print_species
      group by card_print_id
    )
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
      cp.rarity,
      cp.artist,
      cp.regulation_mark,
      cp.variants,
      s.code as sets_code,
      s.name as set_name,
      s.source as set_source,
      s.identity_domain_default,
      s.printed_set_abbrev,
      s.printed_total,
      coalesce(ai.active_identity_count, 0)::int as active_identity_count,
      coalesce(m.active_external_mapping_count, 0)::int as active_external_mapping_count,
      coalesce(child.child_printing_count, 0)::int as child_printing_count,
      coalesce(prices.price_count, 0)::int as price_count,
      coalesce(traits.trait_count, 0)::int as trait_count,
      coalesce(species.species_count, 0)::int as species_count
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    left join active_identity ai on ai.card_print_id = cp.id
    left join mappings m on m.card_print_id = cp.id
    left join child on child.card_print_id = cp.id
    left join prices on prices.card_print_id = cp.id
    left join traits on traits.card_print_id = cp.id
    left join species on species.card_print_id = cp.id
    where s.identity_domain_default like 'pokemon_eng%'
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name nulls last, cp.id
  `);
}

async function buildParentGvCandidates(client, parentRows) {
  const existingGvRows = await queryRows(client, 'select gv_id from public.card_prints where gv_id is not null');
  const existingGvIds = new Set(existingGvRows.map((row) => row.gv_id));

  const rawCandidates = parentRows
    .filter((row) => !clean(row.gv_id))
    .map((row) => {
      let proposedGvId = null;
      let buildError = null;
      try {
        if (clean(row.set_code) && (clean(row.number) || clean(row.number_plain))) {
          proposedGvId = buildCardPrintGvIdV1({
            setCode: row.set_code,
            printedSetAbbrev: row.printed_set_abbrev,
          number: row.number,
          numberPlain: row.number_plain,
          variantKey: row.variant_key,
          printedIdentityModifier: row.printed_identity_modifier,
        });
        }
      } catch (error) {
        buildError = error?.message ?? String(error);
      }

      return {
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        set_name: row.set_name,
        number: row.number,
        number_plain: row.number_plain,
        card_name: row.card_name,
        variant_key: row.variant_key,
        printed_identity_modifier: row.printed_identity_modifier,
        proposed_gv_id: proposedGvId,
        build_error: buildError,
      };
    });

  const proposedCounts = new Map();
  for (const row of rawCandidates) {
    if (row.proposed_gv_id) proposedCounts.set(row.proposed_gv_id, (proposedCounts.get(row.proposed_gv_id) ?? 0) + 1);
  }

  return rawCandidates.map((row) => ({
    ...row,
    ...classifyParentGv(row, row.proposed_gv_id, existingGvIds, proposedCounts, row.build_error),
  }));
}

async function buildChildGvCandidates(client) {
  const rows = await queryRows(client, `
    select
      cpr.id::text as card_printing_id,
      cpr.card_print_id::text as card_print_id,
      cpr.finish_key,
      cpr.printing_gv_id,
      cp.gv_id as parent_gv_id,
      cp.set_code,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      s.name as set_name,
      s.identity_domain_default
    from public.card_printings cpr
    join public.card_prints cp on cp.id = cpr.card_print_id
    join public.sets s on s.id = cp.set_id
    where s.identity_domain_default like 'pokemon_eng%'
      and cpr.printing_gv_id is null
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name nulls last, cpr.finish_key, cpr.id
  `);

  const existingRows = await queryRows(client, 'select printing_gv_id from public.card_printings where printing_gv_id is not null');
  const existingPrintingGvIds = new Set(existingRows.map((row) => row.printing_gv_id));

  const rawCandidates = rows.map((row) => {
    const suffix = FINISH_GV_SUFFIX[row.finish_key] ?? null;
    const proposedPrintingGvId = suffix && row.parent_gv_id ? `${row.parent_gv_id}-${suffix}` : null;
    return {
      ...row,
      suffix,
      proposed_printing_gv_id: proposedPrintingGvId,
    };
  });

  const proposedCounts = new Map();
  for (const row of rawCandidates) {
    if (row.proposed_printing_gv_id) {
      proposedCounts.set(row.proposed_printing_gv_id, (proposedCounts.get(row.proposed_printing_gv_id) ?? 0) + 1);
    }
  }

  return rawCandidates.map((row) => ({
    ...row,
    ...classifyChildGv(row, row.proposed_printing_gv_id, existingPrintingGvIds, proposedCounts),
  }));
}

async function buildActiveIdentityCandidates(client) {
  const rows = await queryRows(client, `
    with active_identity as (
      select card_print_id, count(*)::int as active_identity_count
      from public.card_print_identity
      where is_active = true
      group by card_print_id
    ),
    projected as (
      select
        cp.id::text as card_print_id,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.number_plain,
        cp.name as card_name,
        cp.variant_key,
        cp.printed_identity_modifier,
        public.card_print_identity_backfill_projection_v1(
          s.source,
          cp.set_code,
          s.code,
          cp.number,
          cp.number_plain,
          cp.name,
          cp.variant_key,
          coalesce(cp.printed_total, s.printed_total),
          coalesce(cp.printed_set_abbrev, s.printed_set_abbrev)
        ) as projected
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      left join active_identity ai on ai.card_print_id = cp.id
      where s.identity_domain_default like 'pokemon_eng%'
        and coalesce(ai.active_identity_count, 0) = 0
    )
    select
      projected.*,
      (
        select count(*)::int
        from public.card_print_identity cpi
        where cpi.is_active = true
          and cpi.identity_domain = projected.projected->>'identity_domain'
          and cpi.identity_key_version = projected.projected->>'identity_key_version'
          and cpi.identity_key_hash = projected.projected->>'identity_key_hash'
      ) as existing_hash_collision_count
    from projected
    order by set_code nulls last, number_plain nulls last, number nulls last, card_name nulls last, card_print_id
  `);

  const projectedCounts = new Map();
  for (const row of rows) {
    const hash = row.projected?.identity_key_hash ?? null;
    if (hash) projectedCounts.set(hash, (projectedCounts.get(hash) ?? 0) + 1);
  }

  return rows.map((row) => ({
    ...row,
    ...classifyActiveIdentity(row, projectedCounts),
  }));
}

function classifyExternalMapping(row) {
  if (!isBlank(row.external_ids)) return 'external_ids_available_for_mapping_backfill_review';
  return 'source_acquisition_needed_for_external_mapping';
}

function classifyCoreIdentity(row) {
  const blockers = [];
  if (!clean(row.set_id)) blockers.push('missing_set_id');
  if (!clean(row.set_code)) blockers.push('missing_set_code');
  if (!clean(row.number)) blockers.push('missing_number');
  if (!clean(row.number_plain)) blockers.push('missing_number_plain');
  if (!clean(row.card_name)) blockers.push('missing_name');
  return {
    classification: blockers.length === 0 ? 'core_identity_complete' : 'core_identity_blocked',
    blockers,
  };
}

function buildSummaryRows(title, rows) {
  return {
    title,
    total: rows.length,
    by_classification: countBy(rows, (row) => row.classification),
    by_blocker: countBy(rows.flatMap((row) => row.blockers?.length ? row.blockers : ['none']), (value) => value),
    by_set_top_25: Object.fromEntries(Object.entries(countBy(rows, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
    samples: sampleRows(rows),
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.query('set default_transaction_read_only = on');

  try {
    const parentRows = await loadParentRows(client);
    const parentGvCandidates = await buildParentGvCandidates(client, parentRows);
    const childGvCandidates = await buildChildGvCandidates(client);
    const activeIdentityCandidates = await buildActiveIdentityCandidates(client);

    const coreIdentityGaps = parentRows
      .filter((row) => isBlank(row.card_name) || isBlank(row.set_id) || isBlank(row.set_code) || isBlank(row.number) || isBlank(row.number_plain))
      .map((row) => ({
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        set_name: row.set_name,
        number: row.number,
        number_plain: row.number_plain,
        card_name: row.card_name,
        ...classifyCoreIdentity(row),
      }));

    const externalMappingGaps = parentRows
      .filter((row) => Number(row.active_external_mapping_count ?? 0) === 0)
      .map((row) => ({
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        set_name: row.set_name,
        number: row.number,
        number_plain: row.number_plain,
        card_name: row.card_name,
        classification: classifyExternalMapping(row),
        has_external_ids_payload: !isBlank(row.external_ids),
      }));

    const noChildPrintingParents = parentRows
      .filter((row) => Number(row.child_printing_count ?? 0) === 0)
      .map((row) => ({
        card_print_id: row.card_print_id,
        set_code: row.set_code,
        set_name: row.set_name,
        number: row.number,
        number_plain: row.number_plain,
        card_name: row.card_name,
        classification: 'needs_master_index_or_stale_parent_adjudication',
      }));

    const traitSpeciesMetadata = {
      trait_gaps: parentRows.filter((row) => Number(row.trait_count ?? 0) === 0).length,
      species_gaps: parentRows.filter((row) => Number(row.species_count ?? 0) === 0).length,
      catalog_metadata_gaps: parentRows.filter((row) => isBlank(row.rarity) && isBlank(row.artist) && isBlank(row.regulation_mark) && isBlank(row.variants)).length,
      note: 'These are enrichment lanes, not canonical printing blockers. They need source-specific workers and should run after identity/GV surfaces are stable.',
    };

    const readyParentGv = parentGvCandidates.filter((row) => row.classification === 'ready_for_parent_gv_id_backfill_dry_run');
    const readyChildGv = childGvCandidates.filter((row) => row.classification === 'ready_for_child_printing_gv_id_backfill_dry_run');
    const readyActiveIdentity = activeIdentityCandidates.filter((row) => row.classification === 'ready_for_active_identity_backfill_dry_run');

    const packagePlan = [
      {
        package_id: 'ENRICH-01-PARENT-GV-ID-BACKFILL',
        status: readyParentGv.length > 0 ? 'ready_for_guarded_dry_run_preparation' : 'no_ready_rows',
        scope: 'Backfill missing card_prints.gv_id for English physical parents with complete set/number identity and no GV-ID collisions.',
        candidate_rows: readyParentGv.length,
        writes_if_later_approved: ['card_prints.gv_id'],
        forbidden_in_package: ['child writes', 'identity writes', 'deletes', 'merges', 'migrations', 'image writes'],
      },
      {
        package_id: 'ENRICH-02-CHILD-PRINTING-GV-ID-BACKFILL',
        status: readyChildGv.length > 0 ? 'ready_for_guarded_dry_run_preparation' : 'no_ready_rows',
        scope: 'Backfill missing card_printings.printing_gv_id for English physical child printings with governed finish suffixes.',
        candidate_rows: readyChildGv.length,
        writes_if_later_approved: ['card_printings.printing_gv_id'],
        forbidden_in_package: ['parent writes', 'identity writes', 'deletes', 'merges', 'migrations', 'image writes'],
      },
      {
        package_id: 'ENRICH-03-ACTIVE-IDENTITY-BACKFILL',
        status: readyActiveIdentity.length > 0 ? 'ready_for_guarded_dry_run_preparation' : 'no_ready_rows',
        scope: 'Insert missing active card_print_identity rows using public.card_print_identity_backfill_projection_v1 only.',
        candidate_rows: readyActiveIdentity.length,
        writes_if_later_approved: ['card_print_identity inserts'],
        forbidden_in_package: ['parent writes', 'child writes', 'deletes', 'merges', 'migrations', 'image writes'],
      },
      {
        package_id: 'ENRICH-04-EXTERNAL-MAPPING-BACKFILL-REVIEW',
        status: 'needs_source_specific_plan',
        scope: 'Rows without active external mappings. Some have external_ids payloads that can be converted after source-specific validation.',
        candidate_rows: externalMappingGaps.length,
        writes_if_later_approved: ['external_mappings inserts only after source validation'],
        forbidden_in_package: ['canonical identity changes', 'deletes', 'migrations', 'image writes'],
      },
      {
        package_id: 'ENRICH-05-TRAITS-SPECIES-CATALOG-ENRICHMENT',
        status: 'needs_source_specific_plan',
        scope: 'Catalog metadata, species, and trait enrichment after identity surfaces are stable.',
        candidate_rows: Math.max(traitSpeciesMetadata.trait_gaps, traitSpeciesMetadata.species_gaps, traitSpeciesMetadata.catalog_metadata_gaps),
        writes_if_later_approved: ['card_print_traits/card_print_species/card_prints metadata fields'],
        forbidden_in_package: ['printing canonical changes', 'deletes', 'migrations', 'image writes'],
      },
    ];

    const plan = {
      version: 'CARD_ROW_ENRICHMENT_CLEANUP_PLAN_V1',
      generated_at: new Date().toISOString(),
      scope: {
        target: 'English physical card_prints and card_printings',
        skipped: ['deferred child image printing work'],
        db_writes_performed: false,
        migrations_created: false,
        cleanup_performed: false,
      },
      totals: {
        english_physical_parent_rows: parentRows.length,
        parent_gv_id_candidates: parentGvCandidates.length,
        parent_gv_id_ready: readyParentGv.length,
        child_printing_gv_id_candidates: childGvCandidates.length,
        child_printing_gv_id_ready: readyChildGv.length,
        active_identity_candidates: activeIdentityCandidates.length,
        active_identity_ready: readyActiveIdentity.length,
        core_identity_gap_rows: coreIdentityGaps.length,
        external_mapping_gap_rows: externalMappingGaps.length,
        no_child_printing_parent_rows: noChildPrintingParents.length,
        trait_gaps: traitSpeciesMetadata.trait_gaps,
        species_gaps: traitSpeciesMetadata.species_gaps,
        catalog_metadata_gaps: traitSpeciesMetadata.catalog_metadata_gaps,
      },
      package_plan: packagePlan,
      deterministic_ready_buckets: {
        parent_gv_id: buildSummaryRows('parent_gv_id', parentGvCandidates),
        child_printing_gv_id: buildSummaryRows('child_printing_gv_id', childGvCandidates),
        active_identity: buildSummaryRows('active_identity', activeIdentityCandidates),
      },
      blocked_or_source_needed_buckets: {
        core_identity: buildSummaryRows('core_identity', coreIdentityGaps),
        external_mapping: {
          total: externalMappingGaps.length,
          by_classification: countBy(externalMappingGaps, (row) => row.classification),
          by_set_top_25: Object.fromEntries(Object.entries(countBy(externalMappingGaps, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
          samples: sampleRows(externalMappingGaps),
        },
        no_child_printing_parents: {
          total: noChildPrintingParents.length,
          by_set_top_25: Object.fromEntries(Object.entries(countBy(noChildPrintingParents, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
          samples: sampleRows(noChildPrintingParents),
          note: 'Do not auto-insert or delete. These need Master Index/stale-parent adjudication.',
        },
        trait_species_catalog_metadata: traitSpeciesMetadata,
        deferred_child_images: {
          status: 'explicitly_skipped_by_current_scope',
          note: 'Child image cleanup remains deferred and is not included in write-readiness package planning.',
        },
      },
    };

    plan.fingerprint_sha256 = sha256(stableJson({
      version: plan.version,
      generated_at: plan.generated_at,
      totals: plan.totals,
      package_plan: plan.package_plan,
    }));

    await writeJson(PARENT_GV_CANDIDATES_JSON, {
      generated_at: plan.generated_at,
      fingerprint_basis: plan.fingerprint_sha256,
      rows: parentGvCandidates,
    });
    await writeJson(CHILD_GV_CANDIDATES_JSON, {
      generated_at: plan.generated_at,
      fingerprint_basis: plan.fingerprint_sha256,
      suffix_rules_used: FINISH_GV_SUFFIX,
      rows: childGvCandidates,
    });
    await writeJson(ACTIVE_IDENTITY_CANDIDATES_JSON, {
      generated_at: plan.generated_at,
      fingerprint_basis: plan.fingerprint_sha256,
      projection_function: 'public.card_print_identity_backfill_projection_v1',
      rows: activeIdentityCandidates,
    });
    await writeJson(PLAN_JSON, plan);

    const packageRows = packagePlan.map((row) => ({
      package_id: row.package_id,
      status: row.status,
      candidate_rows: row.candidate_rows,
      writes: row.writes_if_later_approved.join(', '),
    }));

    const md = [
      '# Card Row Enrichment Cleanup Plan V1',
      '',
      'Read-only cleanup plan for English physical card row enrichment gaps.',
      '',
      '## Safety',
      '',
      '- DB writes performed: false',
      '- Migrations created: false',
      '- Cleanup performed: false',
      '- Child image printing cleanup: deferred and excluded',
      '- This report is not apply authority. Each write package still needs guarded dry-run proof and explicit approval.',
      '',
      '## Totals',
      '',
      markdownTable(Object.entries(plan.totals).map(([key, value]) => ({ key, value })), [
        { label: 'metric', value: (row) => row.key },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      '## Recommended Package Plan',
      '',
      markdownTable(packageRows, [
        { label: 'package', value: (row) => row.package_id },
        { label: 'status', value: (row) => row.status },
        { label: 'candidate rows', value: (row) => row.candidate_rows },
        { label: 'later writes if approved', value: (row) => row.writes },
      ]),
      '',
      '## Deterministic Ready Buckets',
      '',
      `- Parent GV-ID backfill ready rows: ${readyParentGv.length}`,
      `- Child printing GV-ID backfill ready rows: ${readyChildGv.length}`,
      `- Active identity backfill ready rows: ${readyActiveIdentity.length}`,
      '',
      '## Blocked Or Source-Needed Buckets',
      '',
      `- Core identity gap rows: ${coreIdentityGaps.length}`,
      `- External mapping gap rows: ${externalMappingGaps.length}`,
      `- Parents with no child printings: ${noChildPrintingParents.length}`,
      `- Trait gaps: ${traitSpeciesMetadata.trait_gaps}`,
      `- Species gaps: ${traitSpeciesMetadata.species_gaps}`,
      `- Catalog metadata gaps: ${traitSpeciesMetadata.catalog_metadata_gaps}`,
      '',
      '## Important Notes',
      '',
      '- `cracked_ice` child rows are not assigned a new `printing_gv_id` suffix in this plan because no existing suffix convention is present in the DB. That must be a governed suffix decision.',
      '- Parent rows with no child printings are not automatically fixed. They may be stale parents or may require Master Index comparison.',
      '- External mappings are source-specific and are not safe to bulk insert from arbitrary payloads without source validation.',
      '',
      `Fingerprint: \`${plan.fingerprint_sha256}\``,
      '',
    ].join('\n');

    await writeText(PLAN_MD, md);

    console.log(JSON.stringify({
      output_json: PLAN_JSON,
      output_md: PLAN_MD,
      fingerprint_sha256: plan.fingerprint_sha256,
      totals: plan.totals,
      next_recommended_package: packagePlan.find((row) => row.status === 'ready_for_guarded_dry_run_preparation')?.package_id ?? null,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
