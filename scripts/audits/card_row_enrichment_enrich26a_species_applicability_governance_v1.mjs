import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import {
  buildSpeciesLookup,
  classifyCardSpecies,
  loadSpeciesSeed,
  normalizeText,
} from '../../backend/grookai_dex/grookai_dex_common_v1.mjs';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'enrich26a_species_applicability_governance_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'enrich26a_species_applicability_governance_v1.md');

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
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
}

function traitList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function isEnergyName(name) {
  const normalized = normalizeText(name);
  return /\benergy\b/.test(normalized);
}

function hasObjectTrainerName(name) {
  const normalized = normalizeText(name);
  return [
    'trainer',
    'supporter',
    'stadium',
    'tool',
    'item',
    'fossil',
    'professor',
    'pokedex',
    'pokeball',
    'poke ball',
    'potion',
    'switch',
    'search',
    'retrieval',
    'removal',
  ].some((token) => normalized.includes(normalizeText(token)));
}

function primaryTrait(row) {
  return {
    supertype: traitList(row.trait_supertypes)[0] ?? null,
    card_category: traitList(row.trait_categories)[0] ?? null,
  };
}

function classifyApplicability(row, speciesResult) {
  const supertypes = traitList(row.trait_supertypes).map(normalizeText);
  const categories = traitList(row.trait_categories).map(normalizeText);
  const traitValues = normalizeText(row.trait_values);
  const name = normalizeText(row.card_name);
  const traitCount = Number(row.trait_count ?? 0);

  const isTrainerTrait = supertypes.includes('trainer') || categories.includes('trainer') || traitValues.includes('pokemon supertype trainer');
  const isEnergyTrait = supertypes.includes('energy') || categories.includes('energy') || traitValues.includes('pokemon supertype energy');
  const pokemonLikeTrait = Number(row.national_dex_trait_count ?? 0) > 0
    || Number(row.type_trait_count ?? 0) > 0
    || supertypes.some((value) => value.includes('pokemon'))
    || categories.some((value) => value.includes('pokemon'));

  if (speciesResult.status === 'mapped') {
    return {
      classification: 'species_rule_insert_candidate',
      reason: 'name_rule_maps_to_species_and_traits_do_not_block',
      applicability: 'species_applicable',
      write_ready: false,
      notes: 'Unexpected ready-looking row; keep audit-only and route through ENRICH-08A dry-run before any apply.',
    };
  }

  if (speciesResult.status === 'non_completion_candidate') {
    return {
      classification: 'species_not_applicable_trait_blocked_subject_reference',
      reason: speciesResult.reason,
      applicability: 'not_applicable',
      write_ready: false,
      notes: 'Name references a Pokemon, but trainer/energy trait blocks species completion.',
    };
  }

  if (isEnergyTrait || isEnergyName(row.card_name)) {
    return {
      classification: 'species_not_applicable_energy',
      reason: speciesResult.reason,
      applicability: 'not_applicable',
      write_ready: false,
      notes: 'Energy rows should not receive Pokemon species links.',
    };
  }

  if (isTrainerTrait) {
    return {
      classification: 'species_not_applicable_trainer',
      reason: speciesResult.reason,
      applicability: 'not_applicable',
      write_ready: false,
      notes: 'Trainer rows should not receive Pokemon species links.',
    };
  }

  if (traitCount === 0) {
    return {
      classification: 'blocked_missing_traits',
      reason: speciesResult.reason,
      applicability: 'unknown_until_traits_exist',
      write_ready: false,
      notes: 'No trait context exists; species applicability cannot be determined safely.',
    };
  }

  if (!pokemonLikeTrait && hasObjectTrainerName(row.card_name)) {
    return {
      classification: 'species_not_applicable_object_or_trainer_like_name',
      reason: speciesResult.reason,
      applicability: 'not_applicable',
      write_ready: false,
      notes: 'Name and traits indicate a non-Pokemon object/trainer card.',
    };
  }

  if (pokemonLikeTrait) {
    return {
      classification: 'species_rule_or_seed_review_needed',
      reason: speciesResult.reason,
      applicability: 'maybe_applicable',
      write_ready: false,
      notes: 'Pokemon-like traits exist but current species seed/rule does not map the name.',
    };
  }

  if (name.length === 0) {
    return {
      classification: 'blocked_missing_name',
      reason: 'missing_name',
      applicability: 'unknown',
      write_ready: false,
      notes: 'Missing card name prevents species applicability classification.',
    };
  }

  return {
    classification: 'species_not_applicable_non_pokemon_traits',
    reason: speciesResult.reason,
    applicability: 'not_applicable',
    write_ready: false,
    notes: 'Traits do not indicate a Pokemon card and current name rule has no species match.',
  };
}

async function loadMissingSpeciesRows(client) {
  const result = await client.query(`
    with traits as (
      select
        card_print_id,
        count(*)::int as trait_count,
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
      select card_print_id, count(*) filter (where active = true)::int as active_species_count
      from public.card_print_species
      group by card_print_id
    )
    select
      cp.id::text as card_print_id,
      cp.set_code,
      s.name as set_name,
      cp.number,
      cp.number_plain,
      cp.name as card_name,
      cp.printed_identity_modifier,
      cp.variant_key,
      coalesce(t.trait_count, 0) as trait_count,
      coalesce(t.type_trait_count, 0) as type_trait_count,
      coalesce(t.national_dex_trait_count, 0) as national_dex_trait_count,
      t.trait_values,
      t.trait_supertypes,
      t.trait_categories,
      coalesce(t.trait_sources, array[]::text[]) as trait_sources
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    left join traits t on t.card_print_id = cp.id
    left join species sp on sp.card_print_id = cp.id
    where s.identity_domain_default like 'pokemon_eng%'
      and coalesce(sp.active_species_count, 0) = 0
    order by cp.set_code nulls last, cp.number_plain nulls last, cp.number nulls last, cp.name, cp.id
  `);
  return result.rows;
}

function sampleRow(row) {
  return {
    card_print_id: row.card_print_id,
    set_code: row.set_code,
    set_name: row.set_name,
    number: row.number,
    card_name: row.card_name,
    printed_identity_modifier: row.printed_identity_modifier,
    classification: row.classification,
    applicability: row.applicability,
    reason: row.reason,
    trait_count: Number(row.trait_count ?? 0),
    type_trait_count: Number(row.type_trait_count ?? 0),
    national_dex_trait_count: Number(row.national_dex_trait_count ?? 0),
    trait_supertypes: row.trait_supertypes,
    trait_categories: row.trait_categories,
    trait_sources: row.trait_sources,
    notes: row.notes,
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for read-only audit.');

  const [seedBundle, client] = await Promise.all([
    loadSpeciesSeed(),
    Promise.resolve(new Client({ connectionString: dbUrl })),
  ]);
  const tokenEntries = buildSpeciesLookup(seedBundle.species);

  await client.connect();
  try {
    await client.query('set default_transaction_read_only = on');
    const rows = await loadMissingSpeciesRows(client);
    const traitByCardPrintId = new Map(rows.map((row) => [row.card_print_id, primaryTrait(row)]));

    const classifiedRows = rows.map((row) => {
      const speciesResult = classifyCardSpecies({ id: row.card_print_id, name: row.card_name }, tokenEntries, traitByCardPrintId);
      const classification = classifyApplicability(row, speciesResult);
      return {
        ...row,
        ...classification,
        species_rule_status: speciesResult.status,
        species_rule_reason: speciesResult.reason,
        species_rule_mapping_count: speciesResult.mappings.length,
      };
    });

    const report = {
      version: 'ENRICH26A_SPECIES_APPLICABILITY_GOVERNANCE_V1',
      generated_at: new Date().toISOString(),
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      scope: {
        target: 'English physical card_print rows without active card_print_species mappings',
        purpose: 'Separate real species enrichment debt from trainer/energy/non-Pokemon rows where species is not applicable.',
        forbidden: ['DB writes', 'migrations', 'parent writes', 'child writes', 'identity writes', 'external mapping writes', 'species writes', 'deletes', 'merges', 'image writes', 'global apply'],
      },
      totals: {
        missing_species_parent_rows: classifiedRows.length,
        not_applicable_rows: classifiedRows.filter((row) => row.applicability === 'not_applicable').length,
        maybe_applicable_review_rows: classifiedRows.filter((row) => row.applicability === 'maybe_applicable').length,
        unknown_until_traits_rows: classifiedRows.filter((row) => row.applicability === 'unknown_until_traits_exist').length,
        insert_candidate_rows: classifiedRows.filter((row) => row.classification === 'species_rule_insert_candidate').length,
        write_ready_rows: classifiedRows.filter((row) => row.write_ready).length,
      },
      by_classification: countBy(classifiedRows, (row) => row.classification),
      by_applicability: countBy(classifiedRows, (row) => row.applicability),
      by_set_top_50: Object.fromEntries(Object.entries(countBy(classifiedRows, (row) => row.set_code ?? 'missing_set_code')).slice(0, 50)),
      review_samples: classifiedRows
        .filter((row) => !['not_applicable'].includes(row.applicability))
        .slice(0, 100)
        .map(sampleRow),
      not_applicable_samples: classifiedRows
        .filter((row) => row.applicability === 'not_applicable')
        .slice(0, 100)
        .map(sampleRow),
      governance_recommendation: {
        summary: 'Do not treat every missing card_print_species row as enrichment debt. Species applies to Pokemon subjects, not trainer, energy, object, or checklist utility cards.',
        next_action: classifiedRows.some((row) => row.classification === 'species_rule_insert_candidate')
          ? 'Route species_rule_insert_candidate rows through ENRICH-08A guarded dry-run before any apply.'
          : 'No species write package is currently ready. Consider adding a species_applicability status/reporting layer so not-applicable rows stop appearing as unresolved debt.',
        blocked_apply_reasons: [
          'This report is audit-only.',
          'not_applicable rows should not receive species links.',
          'unknown_until_traits rows need trait/source enrichment first.',
          'maybe_applicable rows need deterministic rule or seed adjudication before insert.',
        ],
      },
    };

    report.fingerprint_sha256 = sha256(stableJson({
      version: report.version,
      totals: report.totals,
      by_classification: report.by_classification,
      by_applicability: report.by_applicability,
    }));

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# ENRICH-26A Species Applicability Governance V1',
      '',
      '## Result',
      '',
      `- Audit only: ${report.audit_only}`,
      `- DB writes performed: ${report.db_writes_performed}`,
      `- Migrations created: ${report.migrations_created}`,
      `- Fingerprint: \`${report.fingerprint_sha256}\``,
      '',
      '## What This Means',
      '',
      'A missing `card_print_species` row is not automatically a defect. Trainer, Energy, item, stadium, tool, and other non-Pokemon rows should not receive species links. This report separates true species enrichment candidates from rows where species is not applicable.',
      '',
      '## Totals',
      '',
      markdownTable(Object.entries(report.totals).map(([metric, rows]) => ({ metric, rows })), [
        { label: 'metric', value: (row) => row.metric },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Classification',
      '',
      markdownTable(Object.entries(report.by_classification).map(([classification, rows]) => ({ classification, rows })), [
        { label: 'classification', value: (row) => row.classification },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Applicability',
      '',
      markdownTable(Object.entries(report.by_applicability).map(([applicability, rows]) => ({ applicability, rows })), [
        { label: 'applicability', value: (row) => row.applicability },
        { label: 'rows', value: (row) => row.rows },
      ]),
      '',
      '## Governance Recommendation',
      '',
      `- ${report.governance_recommendation.summary}`,
      `- Next action: ${report.governance_recommendation.next_action}`,
      '',
      '## Review Samples',
      '',
      markdownTable(report.review_samples.slice(0, 25), [
        { label: 'set', value: (row) => row.set_code },
        { label: 'number', value: (row) => row.number },
        { label: 'name', value: (row) => row.card_name },
        { label: 'classification', value: (row) => row.classification },
        { label: 'notes', value: (row) => row.notes },
      ]),
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      totals: report.totals,
      by_classification: report.by_classification,
      next_action: report.governance_recommendation.next_action,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
