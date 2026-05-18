import '../env.mjs';

import pg from 'pg';
import {
  MAPPING_AUDIT_JSON_PATH,
  MAPPING_AUDIT_MD_PATH,
  buildSpeciesLookup,
  classifyCardSpecies,
  countBy,
  loadSpeciesSeed,
  parseArgs,
  validateSpeciesSeed,
  writeJson,
  writeText,
} from './grookai_dex_common_v1.mjs';

const PAGE_SIZE = 1000;
const LOOKUP_CHUNK_SIZE = 500;
const INSERT_CHUNK_SIZE = 100;
const { Client } = pg;

function chunkArray(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function createReadonlyPgClient() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('[grookai-dex:mapping] SUPABASE_DB_URL is required for the read-only dry-run audit.');
  }

  return new Client({
    connectionString,
    application_name: 'grookai_dex_mapping_worker_v1_readonly',
    statement_timeout: 600000,
    ssl: { rejectUnauthorized: false },
  });
}

async function fetchCardPrints(client, limit) {
  const rows = [];
  let from = 0;

  while (true) {
    const pageSize = limit ? Math.min(PAGE_SIZE, Math.max(0, limit - rows.length)) : PAGE_SIZE;
    if (pageSize === 0) {
      break;
    }

    const result = await client.query(
      `
        select id, gv_id, name, set_id, set_code, number, number_plain, rarity, variant_key
        from public.card_prints
        order by id asc
        limit $1 offset $2
      `,
      [pageSize, from],
    );

    rows.push(...result.rows);
    if (result.rows.length < pageSize) {
      break;
    }
    if (limit && rows.length >= limit) {
      break;
    }
    from += pageSize;
  }

  return rows;
}

async function fetchTraitsByCardPrintId(client, cardPrintIds) {
  const traits = new Map();
  for (const chunk of chunkArray(cardPrintIds, LOOKUP_CHUNK_SIZE)) {
    const result = await client.query(
      `
        select card_print_id, national_dex, supertype, card_category, types
        from public.card_print_traits
        where card_print_id = any($1::uuid[])
      `,
      [chunk],
    );

    for (const row of result.rows) {
      if (row.card_print_id) {
        traits.set(row.card_print_id, row);
      }
    }
  }
  return traits;
}

function dedupeMappings(rows) {
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const key = `${row.card_print_id}:${row.species_slug}:${row.role}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(row);
  }
  return out;
}

async function applyMappings(rows) {
  const client = createReadonlyPgClient();
  await client.connect();
  let rowsWritten = 0;

  try {
    await client.query('begin');
    const speciesResult = await client.query('select id, slug from public.pokemon_species where active = true');
    const speciesIdBySlug = new Map(speciesResult.rows.map((row) => [row.slug, row.id]));
    const missingSpecies = [...new Set(rows.map((row) => row.species_slug).filter((slug) => !speciesIdBySlug.has(slug)))];
    if (missingSpecies.length > 0) {
      throw new Error(`[grookai-dex:mapping] missing species rows for slugs: ${missingSpecies.slice(0, 20).join(', ')}`);
    }

    for (const chunk of chunkArray(rows, INSERT_CHUNK_SIZE)) {
      const result = await client.query(
        `
          with incoming as (
            select *
            from unnest(
              $1::uuid[],
              $2::uuid[],
              $3::text[],
              $4::boolean[],
              $5::text[],
              $6::numeric[],
              $7::jsonb[]
            ) as t(card_print_id, species_id, role, counts_for_completion, source, confidence, evidence)
          )
          insert into public.card_print_species (
            card_print_id,
            species_id,
            role,
            counts_for_completion,
            source,
            confidence,
            evidence,
            active
          )
          select
            incoming.card_print_id,
            incoming.species_id,
            incoming.role,
            incoming.counts_for_completion,
            incoming.source,
            incoming.confidence,
            incoming.evidence,
            true
          from incoming
          where not exists (
            select 1
            from public.card_print_species cps
            where cps.card_print_id = incoming.card_print_id
              and cps.species_id = incoming.species_id
              and cps.role = incoming.role
              and cps.active = true
          )
        `,
        [
          chunk.map((row) => row.card_print_id),
          chunk.map((row) => speciesIdBySlug.get(row.species_slug)),
          chunk.map((row) => row.role),
          chunk.map((row) => row.counts_for_completion),
          chunk.map((row) => row.source),
          chunk.map((row) => row.confidence),
          chunk.map((row) => JSON.stringify(row.evidence ?? {})),
        ],
      );
      rowsWritten += result.rowCount ?? 0;
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  return rowsWritten;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# Grookai Dex Mapping Dry Run');
  lines.push('');
  lines.push(`Generated: ${report.generated_at}`);
  lines.push(`Mode: ${report.mode}`);
  lines.push(`Status: ${report.status}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Card prints scanned: ${report.summary.card_prints_scanned}`);
  lines.push(`- Mapping rows proposed: ${report.summary.mapping_rows_proposed}`);
  lines.push(`- Distinct mapped card prints: ${report.summary.distinct_mapped_card_prints}`);
  lines.push(`- Completion mapping rows: ${report.summary.completion_mapping_rows}`);
  lines.push(`- Unmapped card prints: ${report.summary.unmapped_card_prints}`);
  lines.push(`- Non-completion candidates: ${report.summary.non_completion_candidates}`);
  lines.push(`- Multi-subject card prints: ${report.summary.multi_subject_card_prints}`);
  lines.push('');
  lines.push('## Status Counts');
  lines.push('');
  for (const [status, count] of Object.entries(report.status_counts)) {
    lines.push(`- ${status}: ${count}`);
  }
  lines.push('');
  lines.push('## Sample Denominators');
  lines.push('');
  for (const row of report.sample_denominators) {
    lines.push(`- ${row.species_slug}: ${row.total_print_count}`);
  }
  lines.push('');
  lines.push('## Apply Gate');
  lines.push('');
  lines.push(report.apply_allowed ? 'Apply is allowed by this mapping gate.' : 'Apply is blocked by this mapping gate.');
  if (report.errors.length > 0) {
    lines.push('');
    lines.push('## Errors');
    lines.push('');
    for (const error of report.errors) {
      lines.push(`- ${error}`);
    }
  }
  if (report.warnings.length > 0) {
    lines.push('');
    lines.push('## Warnings');
    lines.push('');
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
  }
  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const seedBundle = await loadSpeciesSeed();
  const validation = validateSpeciesSeed(seedBundle);
  const errors = [...validation.errors];
  const warnings = [...validation.warnings];

  const client = createReadonlyPgClient();
  await client.connect();

  let cardPrints;
  let traitByCardPrintId;
  try {
    await client.query('begin read only');
    cardPrints = await fetchCardPrints(client, options.limit);
    traitByCardPrintId = await fetchTraitsByCardPrintId(
      client,
      cardPrints.map((row) => row.id).filter(Boolean),
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  const tokenEntries = buildSpeciesLookup(seedBundle.species);
  const classified = [];
  let proposedMappings = [];

  for (const card of cardPrints) {
    const classification = classifyCardSpecies(card, tokenEntries, traitByCardPrintId);
    classified.push({
      card_print_id: card.id,
      gv_id: card.gv_id,
      name: card.name,
      status: classification.status,
      reason: classification.reason,
      mapping_count: classification.mappings.length,
    });
    proposedMappings.push(...classification.mappings);
  }

  proposedMappings = dedupeMappings(proposedMappings);
  const mappedCardPrintIds = new Set(proposedMappings.map((row) => row.card_print_id));
  const completionMappings = proposedMappings.filter((row) => row.counts_for_completion);
  const completionBySpecies = new Map();
  for (const row of completionMappings) {
    if (!completionBySpecies.has(row.species_slug)) {
      completionBySpecies.set(row.species_slug, new Set());
    }
    completionBySpecies.get(row.species_slug).add(row.card_print_id);
  }

  const sampleSpecies = ['pikachu', 'charizard', 'eevee', 'mew', 'nidoran-m', 'nidoran-f', 'mr-mime', 'ho-oh', 'type-null'];
  const sampleDenominators = sampleSpecies.map((slug) => ({
    species_slug: slug,
    total_print_count: completionBySpecies.get(slug)?.size ?? 0,
  }));

  const multiSubjectCardPrints = new Set(
    proposedMappings
      .filter((row) => row.role === 'multi_subject')
      .map((row) => row.card_print_id),
  );

  if (completionMappings.length === 0) {
    errors.push('no_completion_mappings_proposed');
  }

  let rowsWritten = 0;
  if (options.apply && errors.length === 0) {
    rowsWritten = await applyMappings(proposedMappings);
  }

  const report = {
    contract: 'GROOKAI_DEX_V1',
    generated_at: new Date().toISOString(),
    mode: options.apply ? 'apply' : 'dry-run',
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    apply_allowed: errors.length === 0,
    summary: {
      species_count: seedBundle.species.length,
      rows_written: rowsWritten,
      card_prints_scanned: cardPrints.length,
      mapping_rows_proposed: proposedMappings.length,
      distinct_mapped_card_prints: mappedCardPrintIds.size,
      completion_mapping_rows: completionMappings.length,
      unmapped_card_prints: classified.filter((row) => row.status === 'unmapped').length,
      non_completion_candidates: classified.filter((row) => row.status === 'non_completion_candidate').length,
      multi_subject_card_prints: multiSubjectCardPrints.size,
    },
    status_counts: countBy(classified, (row) => row.status),
    reason_counts: countBy(classified, (row) => row.reason),
    sample_denominators: sampleDenominators,
    warnings,
    errors,
    samples: {
      mapped: classified.filter((row) => row.status === 'mapped').slice(0, 25),
      unmapped: classified.filter((row) => row.status === 'unmapped').slice(0, 25),
      mappings: proposedMappings.slice(0, 50),
    },
  };

  await writeJson(MAPPING_AUDIT_JSON_PATH, report);
  await writeText(MAPPING_AUDIT_MD_PATH, buildMarkdown(report));

  console.log(`[grookai-dex:mapping] status=${report.status}`);
  console.log(`[grookai-dex:mapping] card_prints_scanned=${report.summary.card_prints_scanned}`);
  console.log(`[grookai-dex:mapping] mapping_rows_proposed=${report.summary.mapping_rows_proposed}`);
  console.log(`[grookai-dex:mapping] audit_json=${MAPPING_AUDIT_JSON_PATH}`);
  console.log(`[grookai-dex:mapping] audit_md=${MAPPING_AUDIT_MD_PATH}`);

  if (report.status !== 'PASS') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[grookai-dex:mapping] fatal:', error);
  process.exitCode = 1;
});
