import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import {
  normalizePrintedName,
  parseExternalId,
  parseRawNumber,
} from './parsePrintedIdentity.mjs';

const OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'identity_audit_results_v1.json',
);

const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const EXCLUDED_IDENTITY_DOMAINS = new Set(['tcg_pocket_excluded']);
const EXTERNAL_ID_PROVENANCE_SOURCES = new Set(['tcgdex']);

function ensureOutputDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function normalizeOptionalText(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function stripNullishEntries(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== null && value !== undefined),
  );
}

function buildIdentityPayload(entry) {
  return stripNullishEntries({
    variant_key_current: normalizeOptionalText(entry.variant_key),
    printed_total:
      Number.isInteger(entry.printed_total) && entry.printed_total > 0
        ? entry.printed_total
        : null,
    printed_set_abbrev: normalizeOptionalText(entry.printed_set_abbrev),
  });
}

function makeCandidateKey(candidate) {
  return JSON.stringify([
    candidate.source,
    candidate.mapping_source ?? null,
    candidate.raw_source ?? null,
    candidate.external_mapping_id ?? null,
    candidate.raw_import_id ?? null,
    candidate.printed_identity,
    candidate.number_plain,
    candidate.number_suffix,
  ]);
}

async function loadSurfaceRows(client) {
  const sql = `
    select
      cp.id as card_print_id,
      cp.name as name_raw,
      cp.variant_key,
      cp.identity_domain,
      s.code as set_code_identity,
      s.game as set_game,
      s.printed_total,
      s.printed_set_abbrev,
      em.id as external_mapping_id,
      em.source as mapping_source,
      em.external_id,
      ri.id as raw_import_id,
      ri.source as raw_source,
      ri.payload->>'number' as raw_number
    from public.card_prints cp
    join public.sets s
      on s.id = cp.set_id
    join public.external_mappings em
      on em.card_print_id = cp.id
     and em.active = true
    left join public.raw_imports ri
      on ri.payload->>'_external_id' = em.external_id
    where cp.set_code is null
      and cp.number is null
    order by cp.id, em.source, em.external_id, ri.source nulls last, ri.id nulls last
  `;

  const { rows } = await client.query(sql);
  return rows;
}

async function loadExistingActiveIdentityCounts(client, cardPrintIds) {
  if (cardPrintIds.length === 0) {
    return new Map();
  }

  const sql = `
    select
      card_print_id,
      count(*)::int as active_identity_count
    from public.card_print_identity
    where is_active = true
      and card_print_id = any($1::uuid[])
    group by card_print_id
  `;

  const { rows } = await client.query(sql, [cardPrintIds]);
  return new Map(
    rows.map((row) => [row.card_print_id, Number(row.active_identity_count) || 0]),
  );
}

function classifyEntry(entry) {
  const uniquePrintedIdentities = Array.from(
    new Set(entry.candidates.map((candidate) => candidate.printed_identity)),
  );

  const stopReasons = [];
  let classificationStatus = 'READY';

  if (!entry.identity_domain) {
    classificationStatus = 'BLOCKED_MISSING_IDENTITY_DOMAIN';
    stopReasons.push('MISSING_IDENTITY_DOMAIN');
  } else if (entry.identity_domain !== TARGET_IDENTITY_DOMAIN) {
    classificationStatus = 'EXCLUDED_NON_TARGET_DOMAIN';
    stopReasons.push(`NON_TARGET_IDENTITY_DOMAIN:${entry.identity_domain}`);
  } else if (entry.candidates.length === 0) {
    classificationStatus = 'BLOCKED_NO_PARSED_IDENTITY';
    stopReasons.push('NO_PARSED_IDENTITY');
  } else if (uniquePrintedIdentities.length > 1) {
    classificationStatus = 'BLOCKED_CONFLICTING_PARSED_IDENTITY';
    stopReasons.push('CONFLICTING_PARSED_IDENTITY');
  } else if (!entry.set_code_identity) {
    classificationStatus = 'BLOCKED_MISSING_SET_CODE_IDENTITY';
    stopReasons.push('MISSING_SET_CODE_IDENTITY');
  } else if (!entry.normalized_printed_name) {
    classificationStatus = 'BLOCKED_MISSING_NORMALIZED_PRINTED_NAME';
    stopReasons.push('MISSING_NORMALIZED_PRINTED_NAME');
  } else if (entry.existing_active_identity_count > 0) {
    classificationStatus = 'SKIP_EXISTING_ACTIVE_IDENTITY';
    stopReasons.push('EXISTING_ACTIVE_IDENTITY_PRESENT');
  }

  const parsedIdentity =
    uniquePrintedIdentities.length === 1
      ? entry.candidates.find(
          (candidate) => candidate.printed_identity === uniquePrintedIdentities[0],
        )
      : null;

  return {
    classification_status: classificationStatus,
    stop_reasons: stopReasons,
    parsed_identity: parsedIdentity,
  };
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'identity_audit_v1',
  });

  await client.connect();

  try {
    const rows = await loadSurfaceRows(client);
    const byCardPrint = new Map();

    for (const row of rows) {
      const cardPrintId = row.card_print_id;
      if (!byCardPrint.has(cardPrintId)) {
        byCardPrint.set(cardPrintId, {
          card_print_id: cardPrintId,
          name_raw: row.name_raw,
          normalized_printed_name: normalizePrintedName(row.name_raw),
          variant_key: row.variant_key,
          identity_domain: normalizeOptionalText(row.identity_domain),
          set_code_identity: row.set_code_identity,
          set_game: row.set_game,
          printed_total:
            row.printed_total === null || row.printed_total === undefined
              ? null
              : Number(row.printed_total),
          printed_set_abbrev: normalizeOptionalText(row.printed_set_abbrev),
          existing_active_identity_count: 0,
          candidates: [],
        });
      }

      const entry = byCardPrint.get(cardPrintId);
      const candidateIndex = new Map(
        entry.candidates.map((candidate) => [makeCandidateKey(candidate), candidate]),
      );

      if (EXTERNAL_ID_PROVENANCE_SOURCES.has(row.mapping_source)) {
        const parsedExternalId = parseExternalId(row.external_id);
        if (parsedExternalId) {
          const candidate = {
            ...parsedExternalId,
            external_mapping_id: row.external_mapping_id,
            mapping_source: row.mapping_source,
            raw_import_id: null,
            raw_source: null,
            carrier_value: row.external_id,
            carrier_field: 'external_mappings.external_id',
          };
          const key = makeCandidateKey(candidate);
          if (!candidateIndex.has(key)) {
            candidateIndex.set(key, candidate);
          }
        }
      }

      const parsedRawNumber = parseRawNumber(row.raw_number);
      if (parsedRawNumber) {
        const candidate = {
          ...parsedRawNumber,
          external_mapping_id: row.external_mapping_id,
          mapping_source: row.mapping_source,
          raw_import_id: row.raw_import_id,
          raw_source: row.raw_source,
          carrier_value: row.raw_number,
          carrier_field: 'raw_imports.payload.number',
        };
        const key = makeCandidateKey(candidate);
        if (!candidateIndex.has(key)) {
          candidateIndex.set(key, candidate);
        }
      }

      entry.candidates = Array.from(candidateIndex.values());
    }

    const existingIdentityCounts = await loadExistingActiveIdentityCounts(
      client,
      Array.from(byCardPrint.keys()),
    );

    for (const entry of byCardPrint.values()) {
      entry.existing_active_identity_count =
        existingIdentityCounts.get(entry.card_print_id) ?? 0;
    }

    const results = [];
    const summary = {
      generated_at: new Date().toISOString(),
      scope: 'legacy_null_parent_surface_with_materialized_baseline_domain',
      external_id_provenance_sources: Array.from(EXTERNAL_ID_PROVENANCE_SOURCES),
      target_identity_domain: TARGET_IDENTITY_DOMAIN,
      excluded_identity_domains: Array.from(EXCLUDED_IDENTITY_DOMAINS),
      total_source_rows: rows.length,
      total_null_parent_rows: byCardPrint.size,
      audited_rows: 0,
      parsed_rows: 0,
      parsed_from_external_id: 0,
      parsed_from_raw_number: 0,
      conflicting_rows: 0,
      unparsed_rows: 0,
      excluded_non_target_rows: 0,
      existing_active_identity_rows: 0,
      missing_identity_domain_rows: 0,
      ready_for_dry_run_rows: 0,
    };

    for (const entry of byCardPrint.values()) {
      const classification = classifyEntry(entry);
      const hasExternalParsedCandidate = entry.candidates.some(
        (candidate) => candidate.source === 'external_id',
      );
      const hasRawParsedCandidate = entry.candidates.some(
        (candidate) => candidate.source === 'raw_number',
      );
      const uniquePrintedIdentityCount = new Set(
        entry.candidates.map((candidate) => candidate.printed_identity),
      ).size;
      const eligibleShapeForProposal =
        entry.identity_domain === TARGET_IDENTITY_DOMAIN &&
        uniquePrintedIdentityCount === 1 &&
        Boolean(entry.set_code_identity) &&
        Boolean(entry.normalized_printed_name) &&
        Boolean(classification.parsed_identity);

      const rowResult = {
        card_print_id: entry.card_print_id,
        name_raw: entry.name_raw,
        normalized_printed_name: entry.normalized_printed_name,
        identity_domain: entry.identity_domain,
        set_code_identity: entry.set_code_identity,
        set_game: entry.set_game,
        printed_total: entry.printed_total,
        printed_set_abbrev: entry.printed_set_abbrev,
        existing_active_identity_count: entry.existing_active_identity_count,
        classification_status: classification.classification_status,
        stop_reasons: classification.stop_reasons,
        parsed_candidates: entry.candidates,
        unique_printed_identity_count: uniquePrintedIdentityCount,
        proposed_identity_row: eligibleShapeForProposal
          ? {
              card_print_id: entry.card_print_id,
              identity_domain: entry.identity_domain,
              identity_key_version: 'pokemon_eng_standard:v1',
              set_code_identity: entry.set_code_identity,
              printed_number: classification.parsed_identity.printed_identity,
              normalized_printed_name: entry.normalized_printed_name,
              source_name_raw: null,
              identity_payload: buildIdentityPayload(entry),
              is_active: true,
            }
          : null,
      };

      results.push(rowResult);

      if (!entry.identity_domain) {
        summary.missing_identity_domain_rows += 1;
      }

      if (entry.identity_domain !== TARGET_IDENTITY_DOMAIN) {
        summary.excluded_non_target_rows += 1;
        continue;
      }

      summary.audited_rows += 1;

      if (entry.candidates.length > 0) {
        summary.parsed_rows += 1;
      } else {
        summary.unparsed_rows += 1;
      }

      if (hasExternalParsedCandidate) {
        summary.parsed_from_external_id += 1;
      }
      if (hasRawParsedCandidate) {
        summary.parsed_from_raw_number += 1;
      }

      switch (classification.classification_status) {
        case 'READY':
          summary.ready_for_dry_run_rows += 1;
          break;
        case 'BLOCKED_CONFLICTING_PARSED_IDENTITY':
          summary.conflicting_rows += 1;
          break;
        case 'SKIP_EXISTING_ACTIVE_IDENTITY':
          summary.existing_active_identity_rows += 1;
          break;
        default:
          break;
      }
    }

    const output = {
      summary,
      rows: results,
    };

    ensureOutputDir(OUTPUT_PATH);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log('Audit complete:', summary);

    if (summary.missing_identity_domain_rows > 0) {
      throw new Error(
        `IDENTITY_AUDIT_STOPPED:MISSING_IDENTITY_DOMAIN:${summary.missing_identity_domain_rows}`,
      );
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
