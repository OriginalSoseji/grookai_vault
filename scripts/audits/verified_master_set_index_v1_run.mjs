#!/usr/bin/env node

import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';
import { collectTcgdexEvidence } from './verified_master_set_index_v1/source_adapters/tcgdex.mjs';
import { collectPokemonTcgApiEvidence } from './verified_master_set_index_v1/source_adapters/pokemontcg_api.mjs';
import { collectHumanFixtureEvidence } from './verified_master_set_index_v1/source_adapters/human_fixtures.mjs';
import { classifyEvidence } from './verified_master_set_index_v1/agreement_engine/classifier.mjs';
import { writeReports } from './verified_master_set_index_v1/report_generators/reports.mjs';
import {
  DEFAULT_OUTPUT_DIR,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
  uniqueSorted,
} from './verified_master_set_index_v1/shared.mjs';
import { resolvePilotSets } from './verified_master_set_index_v1/pilot_sets/defaults.mjs';
import {
  buildStrictGuardrailOptions,
  enforceStrictGuardrails,
} from './verified_master_set_index_v1/guardrails/strict_guardrails.mjs';

dotenv.config({ path: '.env.local', quiet: true });

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    sets: null,
    outputDir: DEFAULT_OUTPUT_DIR,
    sources: ['tcgdex', 'pokemontcg_api', 'human_fixtures'],
    dryRun: false,
    tcgdexBaseUrl: 'https://api.tcgdex.net/v2/en',
    pokemontcgBaseUrl: 'https://api.pokemontcg.io/v2',
    maxCardsPerSet: null,
    strictGuardrails: true,
    failOnUnverifiedPrintings: false,
    expectFinishCounts: null,
  };

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--sets' && args[i + 1]) {
      options.sets = args[i + 1];
      i += 1;
    } else if (token === '--output-dir' && args[i + 1]) {
      options.outputDir = args[i + 1];
      i += 1;
    } else if (token === '--sources' && args[i + 1]) {
      options.sources = args[i + 1].split(',').map((source) => source.trim()).filter(Boolean);
      i += 1;
    } else if (token === '--dry-run') {
      options.dryRun = true;
    } else if (token === '--no-strict-guardrails') {
      options.strictGuardrails = false;
    } else if (token === '--fail-on-unverified-printings') {
      options.failOnUnverifiedPrintings = true;
    } else if (token === '--expect-finish-counts' && args[i + 1]) {
      options.expectFinishCounts = args[i + 1];
      i += 1;
    } else if (token === '--max-cards-per-set' && args[i + 1]) {
      const value = Number(args[i + 1]);
      if (!Number.isFinite(value) || value <= 0) throw new Error('--max-cards-per-set must be positive.');
      options.maxCardsPerSet = Math.trunc(value);
      i += 1;
    } else if (token === '--tcgdex-base-url' && args[i + 1]) {
      options.tcgdexBaseUrl = args[i + 1].replace(/\/$/, '');
      i += 1;
    } else if (token === '--pokemontcg-base-url' && args[i + 1]) {
      options.pokemontcgBaseUrl = args[i + 1].replace(/\/$/, '');
      i += 1;
    }
  }

  return options;
}

async function collectEvidence(setConfigs, options) {
  const records = [];
  const adapterOptions = {
    ...options,
    retrievedAt: options.generatedAt,
    fixtureDir: path.join(options.outputDir, 'source_fixtures'),
  };

  for (const setConfig of setConfigs) {
    console.log(`[verified-master-set-index] collecting ${setConfig.key}`);
    if (options.sources.includes('tcgdex') && setConfig.tcgdex) {
      records.push(...await collectTcgdexEvidence(setConfig, adapterOptions));
    }
    if (options.sources.includes('pokemontcg_api') && setConfig.pokemontcg) {
      records.push(...await collectPokemonTcgApiEvidence(setConfig, adapterOptions));
    }
  }

  if (options.sources.includes('human_fixtures')) {
    records.push(...await collectHumanFixtureEvidence(setConfigs, adapterOptions));
  }

  return records;
}

function buildSourceAvailability(setConfigs) {
  return setConfigs.map((setConfig) => ({
    set_key: setConfig.key,
    set_name: setConfig.set_name ?? setConfig.key,
    source_aliases: setConfig.source_aliases ?? {
      tcgdex: setConfig.tcgdex ?? null,
      pokemontcg_io: setConfig.pokemontcg ?? null,
      official: null,
      bulbapedia: null,
    },
    source_status: setConfig.source_status ?? {
      tcgdex: setConfig.tcgdex ? 'alias_available' : 'unavailable',
      pokemontcg_api: setConfig.pokemontcg ? 'alias_available' : 'unavailable',
      human_fixtures: 'fixture_scan_enabled',
    },
  }));
}

function indexKey(row) {
  return `${normalizeNumber(row.card_number)}|${normalizeFinishKey(row.finish_key)}`;
}

function summarizeRows(rows) {
  const summary = {};
  for (const row of rows) {
    summary[row.status] = (summary[row.status] ?? 0) + 1;
  }
  return summary;
}

function byStatus(rows, status) {
  return rows.filter((row) => row.status === status);
}

function buildVerifiedIndexRows(classified) {
  return classified.printings
    .filter((row) => row.status === 'master_verified')
    .map((row) => ({
      key: indexKey(row),
      card_number: normalizeNumber(row.card_number),
      card_number_display: row.card_number,
      card_name: row.card_name,
      finish_key: normalizeFinishKey(row.finish_key),
      sources: row.sources,
      source_authorities: row.source_authorities ?? [],
      evidence_urls: row.evidence.map((item) => item.source_url).filter(Boolean),
    }));
}

function buildAbsentIndexRows(classified) {
  return (classified.finish_absences ?? []).map((row) => ({
    key: indexKey(row),
    card_number: normalizeNumber(row.card_number),
    card_number_display: row.card_number,
    card_name: row.card_name,
    finish_key: normalizeFinishKey(row.finish_key),
    sources: row.sources,
    evidence_urls: row.evidence.map((item) => item.source_url).filter(Boolean),
  }));
}

function compareGrookaiRows({ setConfig, sets, dbRows, classified, availableFinishKeys = new Set() }) {
  const verifiedIndexRows = buildVerifiedIndexRows(classified);
  const absentIndexRows = buildAbsentIndexRows(classified);
  const verifiedByKey = new Map(verifiedIndexRows.map((row) => [row.key, row]));
  const absentByKey = new Map(absentIndexRows.map((row) => [row.key, row]));
  const dbByKey = new Map();
  const comparisonRows = [];

  for (const row of dbRows) {
    const finishKey = normalizeFinishKey(row.finish_key);
    const cardNumber = normalizeNumber(row.number_plain ?? row.number);
    const key = `${cardNumber}|${finishKey}`;
    if (!dbByKey.has(key)) dbByKey.set(key, []);
    dbByKey.get(key).push(row);
  }

  for (const row of dbRows) {
    const finishKey = normalizeFinishKey(row.finish_key);
    const cardNumber = normalizeNumber(row.number_plain ?? row.number);
    const key = `${cardNumber}|${finishKey}`;
    const indexRow = verifiedByKey.get(key);
    const absentRow = absentByKey.get(key);
    const duplicateCount = dbByKey.get(key)?.length ?? 0;
    const nameMatches = indexRow
      ? normalizeText(indexRow.card_name) === normalizeText(row.name)
      : true;
    let status = 'unsupported_by_index';
    let note = 'Grookai row is not supported by the verified Ascended Heroes index.';
    if (absentRow) {
      status = 'finish_absent_conflict';
      note = 'Grookai row conflicts with source-backed finish absence evidence.';
    } else if (indexRow && !nameMatches) {
      status = 'needs_manual_review';
      note = 'Card number and finish match the index, but card names differ after normalization.';
    } else if (indexRow) {
      status = 'verified_by_index';
      note = 'Grookai row matches a master-verified index printing.';
    }
    if (duplicateCount > 1) {
      status = status === 'verified_by_index' ? 'needs_manual_review' : status;
      note = `${note} Duplicate Grookai rows exist for this card number and finish.`;
    }
    comparisonRows.push({
      status,
      set_key: setConfig.key,
      set_name: setConfig.set_name ?? setConfig.key,
      grookai_set_code: row.set_code,
      grookai_card_print_id: row.card_print_id,
      grookai_printing_id: row.printing_id,
      card_number: row.number_plain ?? row.number,
      normalized_card_number: cardNumber,
      grookai_card_name: row.name,
      index_card_name: indexRow?.card_name ?? absentRow?.card_name ?? null,
      finish_key: finishKey,
      raw_finish_key: row.finish_key,
      grookai_rarity: row.rarity,
      grookai_variant_key: row.variant_key,
      is_provisional: row.is_provisional,
      provenance_source: row.provenance_source,
      dependency_counts: {
        vault_item_instances: Number(row.vault_item_instance_count ?? 0),
        external_printing_mappings: Number(row.external_printing_mapping_count ?? 0),
        canon_warehouse_candidates: Number(row.warehouse_candidate_count ?? 0),
      },
      dependency_total: Number(row.vault_item_instance_count ?? 0)
        + Number(row.external_printing_mapping_count ?? 0)
        + Number(row.warehouse_candidate_count ?? 0),
      apply_blockers: [],
      index_sources: indexRow?.sources ?? absentRow?.sources ?? [],
      index_evidence_urls: indexRow?.evidence_urls ?? absentRow?.evidence_urls ?? [],
      note,
    });
  }

  for (const indexRow of verifiedIndexRows) {
    if (dbByKey.has(indexRow.key)) continue;
    const applyBlockers = availableFinishKeys.has(indexRow.finish_key) ? [] : ['finish_key_missing'];
    comparisonRows.push({
      status: 'missing_from_grookai',
      set_key: setConfig.key,
      set_name: setConfig.set_name ?? setConfig.key,
      grookai_set_code: sets.map((set) => set.set_code).join(', '),
      grookai_card_print_id: null,
      grookai_printing_id: null,
      card_number: indexRow.card_number_display,
      normalized_card_number: indexRow.card_number,
      grookai_card_name: null,
      index_card_name: indexRow.card_name,
      finish_key: indexRow.finish_key,
      raw_finish_key: null,
      grookai_rarity: null,
      grookai_variant_key: null,
      is_provisional: null,
      provenance_source: null,
      dependency_counts: {
        vault_item_instances: 0,
        external_printing_mappings: 0,
        canon_warehouse_candidates: 0,
      },
      dependency_total: 0,
      apply_blockers: applyBlockers,
      index_sources: indexRow.sources,
      index_evidence_urls: indexRow.evidence_urls,
      note: applyBlockers.includes('finish_key_missing')
        ? 'Verified Master Set Index supports this printing, but Grookai has no matching card_printings row and the finish_key is not present locally.'
        : 'Verified Master Set Index supports this printing, but Grookai has no matching card_printings row.',
    });
  }

  return comparisonRows.sort((a, b) => (
    String(a.normalized_card_number).localeCompare(String(b.normalized_card_number), undefined, { numeric: true })
    || String(a.finish_key).localeCompare(String(b.finish_key))
    || String(a.status).localeCompare(String(b.status))
  ));
}

async function compareGrookaiReadOnly(setConfigs, classified) {
  const ascendedOnly = setConfigs.length === 1 && setConfigs[0].key === 'ascended_heroes';
  const statuses = [
    'verified_by_index',
    'api_agreed_only',
    'unsupported_by_index',
    'missing_from_grookai',
    'conflicting_sources',
    'needs_manual_review',
    'set_not_found_in_grookai',
  ];
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || null;
  if (!connectionString) {
    return {
      executed: false,
      statuses,
      rows: [],
      summary: { status: ascendedOnly ? 'set_not_found_in_grookai' : 'not_executed', reason: 'No read-only DB connection string found.' },
    };
  }

  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    const setNames = setConfigs.map((set) => set.set_name ?? set.key);
    const { rows: sets } = await client.query(
      `select id, code as set_code, name
       from public.sets
       where lower(name) = any($1::text[])
          or lower(code) = any($2::text[])`,
      [
        setNames.map((name) => String(name).toLowerCase()),
        setConfigs.flatMap((set) => [set.key, set.tcgdex, set.pokemontcg]).filter(Boolean).map((value) => String(value).toLowerCase()),
      ],
    );
    if (sets.length === 0) {
      return {
        executed: true,
        statuses,
        rows: setConfigs.map((set) => ({
          set_key: set.key,
          set_name: set.set_name ?? set.key,
          status: 'set_not_found_in_grookai',
        })),
        summary: { status: 'set_not_found_in_grookai', matched_sets: 0 },
      };
    }

    if (setConfigs.length === 1 && setConfigs[0].key === 'ascended_heroes') {
      const { rows: finishKeyRows } = await client.query(
        'select key from public.finish_keys order by key',
      );
      const availableFinishKeys = new Set(finishKeyRows.map((row) => normalizeFinishKey(row.key)));
      const { rows: dbRows } = await client.query(
        `select
           cp.id as card_print_id,
           cp.set_code,
           cp.number,
           cp.number_plain,
           cp.name,
           cp.variant_key,
           cp.rarity,
           p.id as printing_id,
           p.finish_key,
           p.is_provisional,
           p.provenance_source,
           p.provenance_ref,
           p.created_by,
           (
             select count(*)::int
             from public.vault_item_instances vii
             where vii.card_printing_id = p.id
           ) as vault_item_instance_count,
           (
             select count(*)::int
             from public.external_printing_mappings epm
             where epm.card_printing_id = p.id
           ) as external_printing_mapping_count,
           (
             select count(*)::int
             from public.canon_warehouse_candidates cwc
             where cwc.promoted_card_printing_id = p.id
           ) as warehouse_candidate_count
         from public.card_prints cp
         left join public.card_printings p on p.card_print_id = cp.id
         where cp.set_id = any($1::uuid[])
            or lower(cp.set_code) = any($2::text[])
         order by cp.number_plain, cp.number, p.finish_key`,
        [
          sets.map((set) => set.id),
          uniqueSorted(setConfigs.flatMap((set) => [set.key, set.tcgdex, set.pokemontcg, 'me02.5', 'me2pt5', 'asc']).filter(Boolean).map((value) => String(value).toLowerCase())),
        ],
      );
      const rows = compareGrookaiRows({
        setConfig: setConfigs[0],
        sets,
        dbRows: dbRows.filter((row) => row.printing_id),
        classified,
        availableFinishKeys,
      });
      const missingFinishKeysForIndex = uniqueSorted(rows
        .filter((row) => row.status === 'missing_from_grookai' && row.apply_blockers?.includes('finish_key_missing'))
        .map((row) => row.finish_key));
      return {
        executed: true,
        statuses: [
          'verified_by_index',
          'missing_from_grookai',
          'unsupported_by_index',
          'finish_absent_conflict',
          'needs_manual_review',
          'set_not_found_in_grookai',
        ],
        rows,
        summary: {
          status: rows.some((row) => ['unsupported_by_index', 'finish_absent_conflict', 'needs_manual_review'].includes(row.status))
            ? 'needs_manual_review'
            : 'verified_by_index',
          matched_sets: sets.length,
          grookai_printing_rows: dbRows.filter((row) => row.printing_id).length,
          index_master_verified_printings: byStatus(classified.printings, 'master_verified').length,
          available_finish_keys: uniqueSorted([...availableFinishKeys]),
          missing_finish_keys_for_index: missingFinishKeysForIndex,
          by_status: summarizeRows(rows),
        },
      };
    }

    return {
      executed: true,
      statuses,
      rows: sets.map((set) => ({
        set_key: set.set_code,
        set_name: set.name,
        status: classified.conflicts.length > 0 ? 'conflicting_sources' : 'needs_manual_review',
        note: 'Set exists; row-level Grookai comparison is intentionally deferred until the Ascended Heroes source index has master-verified printings.',
      })),
      summary: { status: 'needs_manual_review', matched_sets: sets.length },
    };
  } catch (error) {
    return {
      executed: false,
      statuses,
      rows: [],
      summary: { status: 'needs_manual_review', reason: `Read-only Grookai comparison failed: ${error.message}` },
    };
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const options = parseArgs();
  options.generatedAt = new Date().toISOString();
  const setConfigs = resolvePilotSets(options.sets);

  const records = await collectEvidence(setConfigs, options);
  const classified = classifyEvidence(records);
  enforceStrictGuardrails({
    records,
    classified,
    setConfigs,
    options: buildStrictGuardrailOptions(options),
  });
  const sourceAvailability = buildSourceAvailability(setConfigs);
  const grookaiComparison = await compareGrookaiReadOnly(setConfigs, classified);
  const transport = {
    tls_certificate_verification_disabled: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0',
    note:
      process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
        ? 'This local Windows run disabled Node TLS certificate verification to work around local certificate-chain validation. Source URLs are still recorded for review.'
        : 'Node TLS certificate verification was enabled for this run.',
  };

  if (options.dryRun) {
    console.log(JSON.stringify({
      dry_run: true,
      output_dir: options.outputDir,
      evidence_rows: records.length,
      cards: classified.cards.length,
      printings: classified.printings.length,
      conflicts: classified.conflicts.length,
      manual_review: classified.manual_review.length,
    }, null, 2));
    return;
  }

  const payload = await writeReports({
    records,
    classified,
    setConfigs,
    generatedAt: options.generatedAt,
    outputDir: options.outputDir,
    transport,
    sourceAvailability,
    grookaiComparison,
  });

  console.log(JSON.stringify(payload.totals, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
