import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich12_residual_source_audit_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich12_residual_source_audit_v1.md');

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

function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
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

async function query(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

function sourcePayloadKeys(externalIds) {
  if (!externalIds || typeof externalIds !== 'object' || Array.isArray(externalIds)) return [];
  return Object.entries(externalIds)
    .filter(([, value]) => !isBlank(value))
    .map(([key]) => key)
    .sort();
}

function hasPokemonLikeTraits(row) {
  return Number(row.national_dex_trait_count ?? 0) > 0
    || Number(row.type_trait_count ?? 0) > 0
    || String(row.trait_supertypes ?? '').toLowerCase().includes('pok');
}

function classifyTraitGap(row) {
  const sources = row.active_external_sources ?? [];
  const payloadKeys = sourcePayloadKeys(row.external_ids);

  if (isBlank(row.set_code) || isBlank(row.number)) return 'blocked_core_identity_missing';
  if (sources.includes('tcgdex') || sources.includes('pokemonapi')) return 'source_mapped_retry_candidate';
  if (sources.length > 0) return 'non_trait_source_mapping_present';
  if (payloadKeys.includes('tcgdex') || payloadKeys.includes('pokemonapi')) return 'external_ids_payload_conversion_candidate';
  if (payloadKeys.length > 0) return 'non_trait_payload_present';
  return 'no_source_reference_available';
}

function classifySpeciesGap(row) {
  const traitValues = String(row.trait_values ?? '').toLowerCase();
  const traitSupertypes = String(row.trait_supertypes ?? '').toLowerCase();
  const cardName = String(row.card_name ?? '').toLowerCase();

  if (isBlank(row.set_code) || isBlank(row.number)) return 'blocked_core_identity_missing';
  if (Number(row.trait_count ?? 0) === 0) return 'blocked_missing_traits';
  if (traitSupertypes.includes('trainer') || traitValues.includes('pokemon:supertype=trainer')) return 'trainer_not_species_applicable';
  if (traitSupertypes.includes('energy') || traitValues.includes('pokemon:supertype=energy')) return 'energy_not_species_applicable';
  if (cardName.includes('fossil') && Number(row.national_dex_trait_count ?? 0) === 0) return 'fossil_object_not_species_applicable';
  if (hasPokemonLikeTraits(row)) return 'species_rule_gap_with_pokemon_traits';
  if (Number(row.stats_trait_count ?? 0) > 0) return 'non_pokemon_trait_shape';
  return 'needs_species_rule_review';
}

function classifyCatalogGap(row) {
  const sources = row.active_external_sources ?? [];
  const payloadKeys = sourcePayloadKeys(row.external_ids);
  if (sources.includes('pokemonapi')) return 'pokemonapi_metadata_retry_candidate';
  if (sources.includes('tcgdex')) return 'tcgdex_metadata_retry_candidate';
  if (payloadKeys.includes('pokemonapi') || payloadKeys.includes('tcgdex')) return 'metadata_payload_conversion_candidate';
  if (sources.length > 0 || payloadKeys.length > 0) return 'non_catalog_source_available';
  return 'no_source_reference_available';
}

function classifyExternalMappingGap(row) {
  const payloadKeys = sourcePayloadKeys(row.external_ids);
  if (isBlank(row.set_code) || isBlank(row.number)) return 'blocked_core_identity_missing';
  if (payloadKeys.includes('pokemonapi') || payloadKeys.includes('tcgdex')) return 'structured_payload_mapping_candidate';
  if (payloadKeys.length > 0) return 'non_primary_payload_mapping_candidate';
  return 'no_external_id_payload';
}

async function loadParentRows(client) {
  return query(client, `
    with active_identity as (
      select card_print_id, count(*) filter (where is_active = true)::int as active_identity_count
      from public.card_print_identity
      group by card_print_id
    ),
    mappings as (
      select
        card_print_id,
        count(*) filter (where active = true)::int as active_external_mapping_count,
        array_remove(array_agg(distinct source order by source) filter (where active = true), null) as active_external_sources
      from public.external_mappings
      group by card_print_id
    ),
    traits as (
      select
        card_print_id,
        count(*)::int as trait_count,
        count(*) filter (where trait_type = 'pokemon:stats')::int as stats_trait_count,
        count(*) filter (where trait_type = 'pokemon:type')::int as type_trait_count,
        count(*) filter (where trait_type = 'pokemon:national_dex')::int as national_dex_trait_count,
        string_agg(distinct trait_type || '=' || trait_value, ', ' order by trait_type || '=' || trait_value) as trait_values,
        string_agg(distinct supertype, ', ' order by supertype) filter (where supertype is not null) as trait_supertypes,
        string_agg(distinct card_category, ', ' order by card_category) filter (where card_category is not null) as trait_categories,
        array_remove(array_agg(distinct source order by source), null) as trait_sources
      from public.card_print_traits
      group by card_print_id
    ),
    species as (
      select card_print_id, count(*) filter (where active = true)::int as species_count
      from public.card_print_species
      group by card_print_id
    ),
    child as (
      select card_print_id, count(*)::int as child_printing_count
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
      cp.printed_identity_modifier,
      cp.variant_key,
      cp.rarity,
      cp.artist,
      cp.regulation_mark,
      cp.variants,
      cp.external_ids,
      coalesce(ai.active_identity_count, 0) as active_identity_count,
      coalesce(m.active_external_mapping_count, 0) as active_external_mapping_count,
      coalesce(m.active_external_sources, array[]::text[]) as active_external_sources,
      coalesce(t.trait_count, 0) as trait_count,
      coalesce(t.stats_trait_count, 0) as stats_trait_count,
      coalesce(t.type_trait_count, 0) as type_trait_count,
      coalesce(t.national_dex_trait_count, 0) as national_dex_trait_count,
      t.trait_values,
      coalesce(t.trait_sources, array[]::text[]) as trait_sources,
      t.trait_supertypes,
      t.trait_categories,
      coalesce(species.species_count, 0) as species_count,
      coalesce(child.child_printing_count, 0) as child_printing_count
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    left join active_identity ai on ai.card_print_id = cp.id
    left join mappings m on m.card_print_id = cp.id
    left join traits t on t.card_print_id = cp.id
    left join species on species.card_print_id = cp.id
    left join child on child.card_print_id = cp.id
    where s.identity_domain_default like 'pokemon_eng%'
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name, cp.id
  `);
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query('set default_transaction_read_only = on');
    const parentRows = await loadParentRows(client);

    const traitGaps = parentRows
      .filter((row) => Number(row.trait_count ?? 0) === 0)
      .map((row) => ({ ...row, classification: classifyTraitGap(row), source_payload_keys: sourcePayloadKeys(row.external_ids) }));

    const speciesGaps = parentRows
      .filter((row) => Number(row.species_count ?? 0) === 0)
      .map((row) => ({ ...row, classification: classifySpeciesGap(row), source_payload_keys: sourcePayloadKeys(row.external_ids) }));

    const catalogMetadataGaps = parentRows
      .filter((row) => isBlank(row.rarity) && isBlank(row.artist) && isBlank(row.regulation_mark) && isBlank(row.variants))
      .map((row) => ({ ...row, classification: classifyCatalogGap(row), source_payload_keys: sourcePayloadKeys(row.external_ids) }));

    const externalMappingGaps = parentRows
      .filter((row) => Number(row.active_external_mapping_count ?? 0) === 0)
      .map((row) => ({ ...row, classification: classifyExternalMappingGap(row), source_payload_keys: sourcePayloadKeys(row.external_ids) }));

    const pokemonApiRetry = traitGaps.filter((row) => row.active_external_sources.includes('pokemonapi'));
    const tcgdexRetry = traitGaps.filter((row) => row.active_external_sources.includes('tcgdex'));
    const payloadConversion = traitGaps.filter((row) => row.classification === 'external_ids_payload_conversion_candidate');
    const speciesReview = speciesGaps.filter((row) => row.classification === 'species_rule_gap_with_pokemon_traits');
    const catalogRetry = catalogMetadataGaps.filter((row) => row.classification.endsWith('_metadata_retry_candidate'));
    const mappingPayload = externalMappingGaps.filter((row) => row.classification === 'structured_payload_mapping_candidate');

    const report = {
      version: 'ENRICH12_RESIDUAL_SOURCE_AUDIT_V1',
      generated_at: new Date().toISOString(),
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      scope: {
        target: 'English physical card_print enrichment residuals',
        skipped: ['deferred child image printing work'],
        forbidden: ['DB writes', 'migrations', 'deletes', 'merges', 'image writes', 'global apply'],
      },
      totals: {
        english_physical_parent_rows: parentRows.length,
        trait_gaps: traitGaps.length,
        species_gaps: speciesGaps.length,
        catalog_metadata_gaps: catalogMetadataGaps.length,
        external_mapping_gaps: externalMappingGaps.length,
      },
      trait_gaps: {
        by_classification: countBy(traitGaps, (row) => row.classification),
        by_set_top_25: Object.fromEntries(Object.entries(countBy(traitGaps, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
        retry_ready: {
          pokemonapi_active_mapping_rows: pokemonApiRetry.length,
          tcgdex_active_mapping_rows: tcgdexRetry.length,
          external_ids_payload_conversion_rows: payloadConversion.length,
        },
        samples: traitGaps.slice(0, 75).map(sampleRow),
      },
      species_gaps: {
        by_classification: countBy(speciesGaps, (row) => row.classification),
        by_set_top_25: Object.fromEntries(Object.entries(countBy(speciesGaps, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
        species_rule_review_rows: speciesReview.length,
        samples: speciesGaps.slice(0, 75).map(sampleRow),
      },
      catalog_metadata_gaps: {
        by_classification: countBy(catalogMetadataGaps, (row) => row.classification),
        by_set_top_25: Object.fromEntries(Object.entries(countBy(catalogMetadataGaps, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
        retry_ready_rows: catalogRetry.length,
        samples: catalogMetadataGaps.slice(0, 75).map(sampleRow),
      },
      external_mapping_gaps: {
        by_classification: countBy(externalMappingGaps, (row) => row.classification),
        by_set_top_25: Object.fromEntries(Object.entries(countBy(externalMappingGaps, (row) => row.set_code ?? 'missing_set_code')).slice(0, 25)),
        structured_payload_mapping_rows: mappingPayload.length,
        samples: externalMappingGaps.slice(0, 75).map(sampleRow),
      },
      recommended_next_packages: [
        {
          package_id: 'ENRICH-12A-RESIDUAL-SOURCE-MAPPED-TRAIT-RETRY',
          status: pokemonApiRetry.length + tcgdexRetry.length > 0 ? 'ready_for_bounded_dry_run' : 'no_active_mapping_trait_retry_rows',
          candidate_parent_rows: pokemonApiRetry.length + tcgdexRetry.length,
          writes_if_later_approved: ['card_print_traits inserts only'],
          notes: 'Retry only active source-mapped trait gaps. Do not infer from payload-only rows.',
        },
        {
          package_id: 'ENRICH-12B-EXTERNAL-ID-PAYLOAD-MAPPING-READINESS',
          status: mappingPayload.length > 0 ? 'needs_readiness_view' : 'no_structured_payload_mapping_rows',
          candidate_parent_rows: mappingPayload.length,
          writes_if_later_approved: ['external_mappings inserts only after exact source validation'],
          notes: 'Convert external_ids payloads to active mappings only after source/external ID ownership checks.',
        },
        {
          package_id: 'ENRICH-12C-CATALOG-METADATA-RETRY',
          status: catalogRetry.length > 0 ? 'ready_for_bounded_dry_run' : 'no_source_mapped_catalog_rows',
          candidate_parent_rows: catalogRetry.length,
          writes_if_later_approved: ['null-only card_prints metadata updates'],
          notes: 'Use source-mapped rows only. No non-null overwrites.',
        },
        {
          package_id: 'ENRICH-12D-SPECIES-RULE-REVIEW',
          status: speciesReview.length > 0 ? 'needs_rule_adjudication' : 'no_species_rule_review_rows',
          candidate_parent_rows: speciesReview.length,
          writes_if_later_approved: ['card_print_species inserts only after deterministic rule exists'],
          notes: 'Existing name-rule worker still has no targets; these rows need rule-level adjudication before apply.',
        },
      ],
    };

    report.fingerprint_sha256 = sha256(stableJson({
      version: report.version,
      totals: report.totals,
      trait_gaps: report.trait_gaps.by_classification,
      species_gaps: report.species_gaps.by_classification,
      catalog_metadata_gaps: report.catalog_metadata_gaps.by_classification,
      external_mapping_gaps: report.external_mapping_gaps.by_classification,
    }));

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-12 Residual Source Audit V1',
      '',
      '## Result',
      '',
      `- Audit only: ${report.audit_only}`,
      `- DB writes performed: ${report.db_writes_performed}`,
      `- Migrations created: ${report.migrations_created}`,
      `- Fingerprint: \`${report.fingerprint_sha256}\``,
      '',
      '## Totals',
      '',
      markdownTable(Object.entries(report.totals).map(([metric, rows]) => ({ metric, rows })), [
        { label: 'metric', value: (row) => row.metric },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Trait Gaps',
      '',
      markdownTable(Object.entries(report.trait_gaps.by_classification).map(([classification, rows]) => ({ classification, rows })), [
        { label: 'classification', value: (row) => row.classification },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Species Gaps',
      '',
      markdownTable(Object.entries(report.species_gaps.by_classification).map(([classification, rows]) => ({ classification, rows })), [
        { label: 'classification', value: (row) => row.classification },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Catalog Metadata Gaps',
      '',
      markdownTable(Object.entries(report.catalog_metadata_gaps.by_classification).map(([classification, rows]) => ({ classification, rows })), [
        { label: 'classification', value: (row) => row.classification },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## External Mapping Gaps',
      '',
      markdownTable(Object.entries(report.external_mapping_gaps.by_classification).map(([classification, rows]) => ({ classification, rows })), [
        { label: 'classification', value: (row) => row.classification },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Recommended Next Packages',
      '',
      markdownTable(report.recommended_next_packages, [
        { label: 'package', value: (row) => row.package_id },
        { label: 'status', value: (row) => row.status },
        { label: 'candidate rows', value: (row) => row.candidate_parent_rows },
        { label: 'writes if approved', value: (row) => row.writes_if_later_approved.join(', ') },
      ]),
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      totals: report.totals,
      recommended_next_packages: report.recommended_next_packages,
    }, null, 2));
  } finally {
    await client.end();
  }
}

function sampleRow(row) {
  return {
    card_print_id: row.card_print_id,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    number_plain: row.number_plain,
    card_name: row.card_name,
    printed_identity_modifier: row.printed_identity_modifier,
    classification: row.classification,
    active_external_sources: row.active_external_sources,
    source_payload_keys: row.source_payload_keys,
    trait_count: Number(row.trait_count ?? 0),
    species_count: Number(row.species_count ?? 0),
    trait_sources: row.trait_sources,
    trait_values: row.trait_values,
    trait_supertypes: row.trait_supertypes,
    trait_categories: row.trait_categories,
  };
}

await main();
