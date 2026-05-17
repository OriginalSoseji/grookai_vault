import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const requireFromBackend = createRequire(path.join(ROOT, 'backend', 'package.json'));
const dotenv = requireFromBackend('dotenv');
const pg = requireFromBackend('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false });
}

const OUT_DIR = path.join(ROOT, 'docs', 'plans', 'pokemon_db_remediation_v1');
const INPUT_MATRIX_PATH = path.join(OUT_DIR, 'number_normalization_candidate_evidence_matrix_20260517.json');
const MATRIX_PATH = path.join(OUT_DIR, 'number_normalization_collision_investigation_matrix_20260517.json');
const REPORT_PATH = path.join(OUT_DIR, 'number_normalization_collision_investigation_20260517.md');

const USER_OR_MARKET_REF_TABLES = new Set([
  'vault_items',
  'vault_item_instances',
  'shared_cards',
  'slab_certs',
  'pricing_watch',
  'justtcg_variants',
  'justtcg_variant_prices_latest',
  'justtcg_variant_price_snapshots',
]);

function quoteIdent(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function normalizeName(value = '') {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bpokémon\b/g, 'pokemon')
    .replace(/[’'`]/g, '')
    .replace(/[—–-]/g, ' ')
    .replace(/♀/g, ' f ')
    .replace(/♂/g, ' m ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeNumber(value) {
  let text = cleanText(value);
  if (!text) return null;
  text = text.replace(/^#/, '').replace(/\s+/g, '');
  text = text.split('/')[0].toUpperCase();
  if (/^\d+$/.test(text)) return String(Number(text));
  const prefixed = text.match(/^([A-Z]+)0*([0-9]+)([A-Z]*)$/);
  if (prefixed) return `${prefixed[1]}${Number(prefixed[2])}${prefixed[3]}`;
  return text || null;
}

function sourceTail(value) {
  const text = cleanText(value);
  if (!text || !text.includes('-')) return null;
  return normalizeNumber(text.replace(/^.*-/, ''));
}

function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))));
}

function renderTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${row.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`);
  }
  return lines.join('\n');
}

async function tableExists(client, tableName) {
  const { rows } = await client.query(
    `
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = $1
      limit 1
    `,
    [tableName],
  );
  return rows.length > 0;
}

async function fetchCardRows(client, ids) {
  if (!ids.length) return [];
  const { rows } = await client.query(
    `
      select
        cp.id::text as card_print_id,
        cp.set_id::text as set_id,
        s.code as set_code,
        s.name as set_name,
        cp.name as card_name,
        cp.number,
        cp.number_plain,
        cp.external_ids,
        cp.variant_key,
        cp.variants,
        cp.print_identity_key,
        cp.gv_id,
        cp.updated_at::text as updated_at
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      where cp.id = any($1::uuid[])
    `,
    [ids],
  );
  return rows;
}

async function fetchExternalMappings(client, ids) {
  if (!ids.length) return [];
  const { rows } = await client.query(
    `
      select
        card_print_id::text as card_print_id,
        source,
        external_id,
        active
      from public.external_mappings
      where card_print_id = any($1::uuid[])
      order by card_print_id, source, external_id
    `,
    [ids],
  );
  return rows;
}

async function fetchIdentityRows(client, ids) {
  if (!ids.length) return [];
  const { rows } = await client.query(
    `
      select
        id::text as card_print_identity_id,
        card_print_id::text as card_print_id,
        printed_number,
        is_active
      from public.card_print_identity
      where card_print_id = any($1::uuid[])
      order by card_print_id, is_active desc, id
    `,
    [ids],
  );
  return rows;
}

async function fetchRawImportEvidence(client, externalIds) {
  const ids = [...new Set(externalIds.filter(Boolean))];
  if (!ids.length) return [];
  const exists = await tableExists(client, 'raw_imports');
  if (!exists) return [];
  const { rows: columns } = await client.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'raw_imports'
    `,
  );
  const columnSet = new Set(columns.map((row) => row.column_name));
  if (!columnSet.has('external_id')) return [];
  const { rows } = await client.query(
    `
      select
        source,
        external_id,
        payload ->> 'number' as payload_number,
        payload ->> 'localId' as payload_local_id,
        payload #>> '{card,localId}' as payload_card_local_id,
        payload ->> 'id' as payload_id,
        payload #>> '{card,id}' as payload_card_id
      from public.raw_imports
      where external_id = any($1::text[])
      order by source, external_id
    `,
    [ids],
  );
  return rows;
}

async function fetchCardPrintFkCounts(client, ids) {
  if (!ids.length) return [];
  const { rows: fkColumns } = await client.query(`
    select tc.table_name, kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
     and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and ccu.table_schema = 'public'
      and ccu.table_name = 'card_prints'
      and ccu.column_name = 'id'
      and tc.table_schema = 'public'
    order by tc.table_name, kcu.column_name
  `);

  const all = [];
  for (const fk of fkColumns) {
    const sql = `
      select
        ${quoteIdent(fk.column_name)}::text as card_print_id,
        count(*)::int as reference_rows
      from public.${quoteIdent(fk.table_name)}
      where ${quoteIdent(fk.column_name)} = any($1::uuid[])
      group by ${quoteIdent(fk.column_name)}
    `;
    const { rows } = await client.query(sql, [ids]);
    for (const row of rows) {
      all.push({
        card_print_id: row.card_print_id,
        table_name: fk.table_name,
        column_name: fk.column_name,
        reference_rows: row.reference_rows,
        user_or_market_ref: USER_OR_MARKET_REF_TABLES.has(fk.table_name),
      });
    }
  }
  return all;
}

function externalIdsFromRow(row, mappings) {
  const ids = [];
  const externalIds = row?.external_ids ?? {};
  for (const [source, externalId] of Object.entries(externalIds)) {
    if (cleanText(externalId)) ids.push({ source: `external_ids.${source}`, external_id: externalId, active: true });
  }
  for (const mapping of mappings) {
    if (cleanText(mapping.external_id)) ids.push({ source: `external_mappings.${mapping.source}`, external_id: mapping.external_id, active: Boolean(mapping.active) });
  }
  return ids;
}

function sourceSummary(row, mappings) {
  const entries = externalIdsFromRow(row, mappings);
  const activeMappings = mappings.filter((mapping) => mapping.active);
  const sources = [...new Set(entries.map((entry) => entry.source.replace(/^external_(ids|mappings)\./, '')))].sort();
  const tcgdexIds = entries
    .filter((entry) => entry.source.endsWith('.tcgdex'))
    .map((entry) => entry.external_id);
  return {
    sources,
    entries,
    active_mapping_sources: [...new Set(activeMappings.map((mapping) => mapping.source))].sort(),
    tcgdex_ids: [...new Set(tcgdexIds)].sort(),
    normalized_tails: [...new Set(entries.map((entry) => sourceTail(entry.external_id)).filter(Boolean))].sort(),
  };
}

function classifyCandidate(candidate, collisions, cardById, mappingsById, identityById, fkById) {
  const candidateCard = cardById.get(candidate.card_print_id);
  const candidateMappings = mappingsById.get(candidate.card_print_id) ?? [];
  const candidateSources = sourceSummary(candidateCard, candidateMappings);
  const candidateRefs = fkById.get(candidate.card_print_id) ?? [];
  const candidateUserMarketRefs = candidateRefs.filter((ref) => ref.user_or_market_ref);
  const activeCandidateIdentity = (identityById.get(candidate.card_print_id) ?? []).filter((row) => row.is_active);

  const pairEvidence = collisions.map((collision) => {
    const existingCard = cardById.get(collision.existing_card_print_id);
    const existingMappings = mappingsById.get(collision.existing_card_print_id) ?? [];
    const existingSources = sourceSummary(existingCard, existingMappings);
    const existingRefs = fkById.get(collision.existing_card_print_id) ?? [];
    const existingUserMarketRefs = existingRefs.filter((ref) => ref.user_or_market_ref);
    const candidateNameKey = normalizeName(candidate.card_name);
    const existingNameKey = normalizeName(existingCard?.card_name ?? collision.existing_card_name);
    const sameName = candidateNameKey === existingNameKey;
    const sameTcgdexId = candidateSources.tcgdex_ids.some((id) => existingSources.tcgdex_ids.includes(id));
    const existingNumberKeys = [
      normalizeNumber(existingCard?.number),
      normalizeNumber(existingCard?.number_plain),
    ].filter(Boolean);
    return {
      existing_card_print_id: collision.existing_card_print_id,
      existing_card_name: existingCard?.card_name ?? collision.existing_card_name,
      existing_number: existingCard?.number ?? collision.existing_number,
      existing_number_plain: existingCard?.number_plain ?? collision.existing_number_plain,
      existing_variant_key: existingCard?.variant_key ?? collision.existing_variant_key,
      same_normalized_name: sameName,
      same_tcgdex_external_id: sameTcgdexId,
      candidate_name_key: candidateNameKey,
      existing_name_key: existingNameKey,
      existing_number_keys: existingNumberKeys,
      existing_sources: existingSources,
      existing_fk_references: existingRefs,
      existing_user_or_market_reference_rows: existingUserMarketRefs.reduce((sum, ref) => sum + Number(ref.reference_rows), 0),
    };
  });

  const sameNamePairs = pairEvidence.filter((pair) => pair.same_normalized_name);
  const differentNamePairs = pairEvidence.filter((pair) => !pair.same_normalized_name);
  const sameTcgdexPairs = pairEvidence.filter((pair) => pair.same_tcgdex_external_id);
  const candidateHasOnlyTcgdex = candidateSources.active_mapping_sources.length === 1 && candidateSources.active_mapping_sources[0] === 'tcgdex';
  const existingHasNonTcgdex = pairEvidence.some((pair) => pair.existing_sources.active_mapping_sources.some((source) => source !== 'tcgdex'));
  const candidateUserMarketReferenceRows = candidateUserMarketRefs.reduce((sum, ref) => sum + Number(ref.reference_rows), 0);

  let collision_class = 'AMBIGUOUS_COLLISION_REVIEW_REQUIRED';
  const reasons = [];

  if (sameTcgdexPairs.length > 0) {
    collision_class = 'CRITICAL_DUPLICATE_TCGDEX_OWNERSHIP';
    reasons.push('candidate and existing row share a TCGdex external id');
  } else if (differentNamePairs.length > 0) {
    collision_class = 'SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY';
    reasons.push('proposed number collides with a different normalized card name');
  } else if (sameNamePairs.length === pairEvidence.length && candidateHasOnlyTcgdex && existingHasNonTcgdex) {
    collision_class = 'LIKELY_DUPLICATE_IMPORT_ROW';
    reasons.push('same normalized name and proposed number, candidate is TCGdex-only, existing row has additional source ownership');
  } else if (sameNamePairs.length === pairEvidence.length) {
    collision_class = 'SAME_CARD_NUMBER_DUPLICATE_REVIEW';
    reasons.push('same normalized name and proposed number but source ownership does not prove an automatic winner');
  }

  if (candidateUserMarketReferenceRows > 0) {
    reasons.push('candidate row has user/market references and must not be deleted or merged without a separate ownership plan');
  }
  if (activeCandidateIdentity.length === 0) {
    reasons.push('candidate row has no active identity row in this evidence query');
  }

  return {
    card_print_id: candidate.card_print_id,
    set_code: candidate.set_code,
    set_name: candidate.set_name,
    card_name: candidate.card_name,
    proposed_number: candidate.proposed_number,
    collision_class,
    reasons,
    recommended_next_action:
      collision_class === 'LIKELY_DUPLICATE_IMPORT_ROW'
        ? 'Do not normalize yet. Build a duplicate-row ownership pack before considering any merge, deactivate, or mapping transfer.'
        : 'Do not normalize yet. Manual source-authority review required before this row can enter any write scope.',
    future_number_write_allowed: false,
    candidate_sources: candidateSources,
    candidate_identity_rows: identityById.get(candidate.card_print_id) ?? [],
    candidate_fk_references: candidateRefs,
    candidate_user_or_market_reference_rows: candidateUserMarketReferenceRows,
    collisions: pairEvidence,
  };
}

function setBreakdown(items) {
  return [...groupBy(items, (item) => item.set_code).entries()]
    .map(([setCode, rows]) => ({
      set_code: setCode,
      set_name: rows[0]?.set_name ?? null,
      blocked_candidates: rows.length,
      classes: countBy(rows, (row) => row.collision_class),
      candidate_user_or_market_reference_rows: rows.reduce((sum, row) => sum + Number(row.candidate_user_or_market_reference_rows ?? 0), 0),
    }))
    .sort((a, b) => b.blocked_candidates - a.blocked_candidates || a.set_code.localeCompare(b.set_code));
}

function renderMarkdown(matrix) {
  const lines = [];
  lines.push('# Number Normalization Collision Investigation - 2026-05-17');
  lines.push('');
  lines.push('Status: no-write collision investigation. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, variant changes, or production mutation.');
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push('Investigate the 256 Lane A number-normalization candidates that were blocked because the proposed TCGdex-derived number already collides with an existing `card_prints.number` or `card_prints.number_plain` in the same set.');
  lines.push('');
  lines.push('This is the highest-risk hidden-corruption lane because a naive number update could make duplicate imported rows look legitimate instead of exposing the underlying ownership problem.');
  lines.push('');
  lines.push('## Source Inputs');
  lines.push('');
  for (const source of matrix.generated_from) lines.push(`- \`${source}\``);
  lines.push('- live read-only Supabase queries inside `begin transaction read only`');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(renderTable(
    ['Metric', 'Count'],
    [
      ['Collision-blocked candidates investigated', matrix.summary.collision_blocked_candidates],
      ['Collision pairs investigated', matrix.summary.collision_pairs],
      ['Critical duplicate TCGdex ownership', matrix.summary.class_counts.CRITICAL_DUPLICATE_TCGDEX_OWNERSHIP ?? 0],
      ['Likely duplicate import rows', matrix.summary.class_counts.LIKELY_DUPLICATE_IMPORT_ROW ?? 0],
      ['Same-card duplicate review', matrix.summary.class_counts.SAME_CARD_NUMBER_DUPLICATE_REVIEW ?? 0],
      ['Same-number different-card ambiguity', matrix.summary.class_counts.SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY ?? 0],
      ['Ambiguous collision review required', matrix.summary.class_counts.AMBIGUOUS_COLLISION_REVIEW_REQUIRED ?? 0],
      ['Candidates with user/market references', matrix.summary.candidates_with_user_or_market_references],
      ['Recommended immediate writes', 0],
    ],
  ));
  lines.push('');
  lines.push('Result: all 256 collision-blocked rows remain blocked from number-normalization writes. The collision lane is not a normalization problem first; it is an ownership/integrity investigation lane.');
  lines.push('');
  lines.push('## Set Breakdown');
  lines.push('');
  lines.push(renderTable(
    ['Set', 'Name', 'Blocked candidates', 'Class mix', 'Candidate user/market refs'],
    matrix.set_breakdown.map((row) => [
      `\`${row.set_code}\``,
      row.set_name,
      row.blocked_candidates,
      Object.entries(row.classes).map(([name, count]) => `${name}=${count}`).join('; '),
      row.candidate_user_or_market_reference_rows,
    ]),
  ));
  lines.push('');
  lines.push('## Collision Classes');
  lines.push('');
  lines.push('- `CRITICAL_DUPLICATE_TCGDEX_OWNERSHIP`: candidate and existing row share the same TCGdex external id. Treat as source ownership corruption until proven otherwise.');
  lines.push('- `LIKELY_DUPLICATE_IMPORT_ROW`: same normalized name and proposed number, candidate is TCGdex-only, and existing row has additional source ownership. Still no merge/delete without a separate ownership plan.');
  lines.push('- `SAME_CARD_NUMBER_DUPLICATE_REVIEW`: same normalized name and proposed number, but source ownership does not prove an automatic winner.');
  lines.push('- `SAME_NUMBER_DIFFERENT_CARD_AMBIGUITY`: proposed number collides with a different normalized card name. This needs manual card identity review.');
  lines.push('- `AMBIGUOUS_COLLISION_REVIEW_REQUIRED`: evidence is insufficient to classify more tightly.');
  lines.push('');
  lines.push('## Highest-Risk Rows');
  lines.push('');
  const highRisk = matrix.items
    .filter((item) => item.collision_class !== 'LIKELY_DUPLICATE_IMPORT_ROW' || item.candidate_user_or_market_reference_rows > 0)
    .slice(0, 80);
  if (!highRisk.length) {
    lines.push('_None beyond likely duplicate import rows._');
  } else {
    lines.push(renderTable(
      ['Set', 'Candidate', 'Number', 'Class', 'Refs', 'Colliding existing rows'],
      highRisk.map((item) => [
        `\`${item.set_code}\``,
        item.card_name,
        item.proposed_number,
        item.collision_class,
        item.candidate_user_or_market_reference_rows,
        item.collisions.map((pair) => `${pair.existing_card_name} (${pair.existing_number ?? pair.existing_number_plain ?? 'null'})`).join('; '),
      ]),
    ));
    if (matrix.items.length > highRisk.length) {
      lines.push('');
      lines.push(`Additional rows are in the JSON matrix. High-risk table is capped at ${highRisk.length} rows.`);
    }
  }
  lines.push('');
  lines.push('## Raw Import Evidence');
  lines.push('');
  const rawImportRows = Object.entries(matrix.raw_import_evidence_counts).map(([source, count]) => [source, count]);
  if (rawImportRows.length) {
    lines.push(renderTable(['Source', 'Raw import rows'], rawImportRows));
  } else {
    lines.push('No raw-import rows could be linked by external ID in this schema. The live `raw_imports` table has payload/status timing fields but no row-level `external_id` column, so source ownership conclusions rely on `card_prints.external_ids` and active mapping tables in this pass.');
  }
  lines.push('');
  lines.push('## Conclusions');
  lines.push('');
  lines.push('- Do not include any of the 256 collision-blocked rows in a number-normalization write plan.');
  lines.push('- The 248 clean Lane A rows remain the only possible future number-normalization write-plan lane.');
  lines.push('- Collision rows need a separate duplicate/source-ownership investigation, likely by set, before any merge, deactivation, mapping transfer, or number update is considered.');
  lines.push('- Rows with user, vault, shared, slab, pricing, or variant references need stricter ownership handling because deleting or merging them would have user-facing blast radius.');
  lines.push('- Missing-card backfill must continue to treat these rows as blockers because they may already represent imported checklist coverage under duplicate rows.');
  lines.push('');
  lines.push('## No-Write Confirmation');
  lines.push('');
  lines.push('- No Supabase writes.');
  lines.push('- No migrations.');
  lines.push('- No inserts.');
  lines.push('- No updates.');
  lines.push('- No deletes.');
  lines.push('- No card movement.');
  lines.push('- No set changes.');
  lines.push('- No identity rewrites.');
  lines.push('- No mapping movement.');
  lines.push('- No missing-card backfill.');
  lines.push('- No variant changes.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const inputRaw = await fs.readFile(INPUT_MATRIX_PATH, 'utf8');
  const input = JSON.parse(inputRaw);

  const blockedCandidates = input.candidates.filter((row) => row.blocking_reasons.includes('existing number collision in same set'));
  const blockedIds = blockedCandidates.map((row) => row.card_print_id);
  const collisionRows = input.collisions.filter((row) => blockedIds.includes(row.card_print_id));
  const existingIds = [...new Set(collisionRows.map((row) => row.existing_card_print_id))].sort();
  const allIds = [...new Set([...blockedIds, ...existingIds])].sort();

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const client = new pg.Client({
    connectionString,
    application_name: 'number_normalization_collision_investigation_v1:readonly',
    statement_timeout: 120000,
  });

  let matrix;
  await client.connect();
  try {
    await client.query('begin transaction read only');

    const [cards, mappings, identities, fkCounts] = await Promise.all([
      fetchCardRows(client, allIds),
      fetchExternalMappings(client, allIds),
      fetchIdentityRows(client, allIds),
      fetchCardPrintFkCounts(client, allIds),
    ]);

    const cardById = new Map(cards.map((row) => [row.card_print_id, row]));
    const mappingsById = groupBy(mappings, (row) => row.card_print_id);
    const identityById = groupBy(identities, (row) => row.card_print_id);
    const fkById = groupBy(fkCounts, (row) => row.card_print_id);

    const allExternalIds = [];
    for (const card of cards) {
      const rowMappings = mappingsById.get(card.card_print_id) ?? [];
      allExternalIds.push(...externalIdsFromRow(card, rowMappings).map((entry) => entry.external_id));
    }
    const rawImportEvidence = await fetchRawImportEvidence(client, allExternalIds);

    const collisionsByCandidateId = groupBy(collisionRows, (row) => row.card_print_id);
    const items = blockedCandidates.map((candidate) => {
      return classifyCandidate(
        candidate,
        collisionsByCandidateId.get(candidate.card_print_id) ?? [],
        cardById,
        mappingsById,
        identityById,
        fkById,
      );
    });

    await client.query('rollback');

    const classCounts = countBy(items, (item) => item.collision_class);
    matrix = {
      status: 'NO_WRITE_NUMBER_NORMALIZATION_COLLISION_INVESTIGATION_ONLY',
      generated_at: new Date().toISOString(),
      generated_from: [
        'docs/plans/pokemon_db_remediation_v1/number_normalization_candidate_evidence_20260517.md',
        'docs/plans/pokemon_db_remediation_v1/number_normalization_candidate_evidence_matrix_20260517.json',
        'live_read_only_supabase_evidence_2026-05-17',
      ],
      scope: {
        lane: 'collision-blocked Lane A number-normalization candidates only',
        blocked_candidate_count_from_source_matrix: blockedCandidates.length,
        collision_pair_count_from_source_matrix: collisionRows.length,
      },
      summary: {
        collision_blocked_candidates: items.length,
        collision_pairs: collisionRows.length,
        class_counts: classCounts,
        candidates_with_user_or_market_references: items.filter((item) => item.candidate_user_or_market_reference_rows > 0).length,
        candidate_user_or_market_reference_rows: items.reduce((sum, item) => sum + Number(item.candidate_user_or_market_reference_rows ?? 0), 0),
        raw_import_rows_found: rawImportEvidence.length,
        recommended_immediate_writes: 0,
      },
      raw_import_evidence_counts: countBy(rawImportEvidence, (row) => row.source ?? 'unknown'),
      set_breakdown: setBreakdown(items),
      fk_reference_table_counts: countBy(fkCounts, (row) => `${row.table_name}.${row.column_name}`),
      items,
    };
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original error.
    }
    throw error;
  } finally {
    await client.end();
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
  await fs.writeFile(REPORT_PATH, renderMarkdown(matrix), 'utf8');

  console.log(JSON.stringify(matrix.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
