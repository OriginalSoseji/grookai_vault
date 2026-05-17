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
const COMMITTED_MATRIX_PATH = path.join(OUT_DIR, 'number_normalization_lane_a_248_write_plan_matrix_20260517.json');
const GATE_MATRIX_PATH = path.join(OUT_DIR, 'number_normalization_lane_a_248_preexecution_gate_matrix_20260517.json');
const GATE_REPORT_PATH = path.join(OUT_DIR, 'number_normalization_lane_a_248_preexecution_gate_20260517.md');

const HARD_STOP_CODES = new Set([
  'pgo',
  'swsh10.5',
  'sv04.5',
  'sv4pt5',
  'sv06.5',
  'sv6pt5',
  'sv08.5',
  'sv8pt5',
]);

const REVIEW_STOP_CODES = new Set([
  'bog',
  'bp',
  'tk-ex-latia',
  'tk-ex-latio',
  'tk-ex-m',
  'tk-ex-p',
  'tk1a',
  'tk1b',
  'tk2a',
  'tk2b',
]);

const USER_MARKET_REF_TABLES = [
  ['pricing_watch', 'card_print_id'],
  ['shared_cards', 'card_id'],
  ['slab_certs', 'card_print_id'],
  ['vault_item_instances', 'card_print_id'],
  ['vault_items', 'card_id'],
  ['justtcg_variants', 'card_print_id'],
  ['justtcg_variant_prices_latest', 'card_print_id'],
  ['justtcg_variant_price_snapshots', 'card_print_id'],
];

function quoteIdent(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe identifier: ${identifier}`);
  }
  return `"${identifier}"`;
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

function candidateFromExternalId(value) {
  const source = cleanText(value);
  if (!source || !source.includes('-')) return null;
  return normalizeNumber(source.replace(/^.*-/, ''));
}

function laneForCandidate(row) {
  if (row.in_hard_stop_set) return 'hard_stop_set_blocked';
  if (row.in_review_stop_set) return 'review_stop_set_blocked';
  if (row.distinct_candidate_count !== 1) return 'source_candidate_conflict_or_missing';
  const candidate = row.candidate_numbers[0];
  if (/^\d+$/.test(candidate)) return 'lane_a_numeric_non_hard_stop';
  if (/^[A-Z]+[0-9]+[A-Z]*$/.test(candidate)) return 'prefixed_source_candidate_non_hard_stop';
  return 'complex_source_candidate_non_hard_stop';
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))));
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

function renderTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${row.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`);
  }
  return lines.join('\n');
}

async function tableColumnExists(client, tableName, columnName) {
  const { rows } = await client.query(
    `
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
      limit 1
    `,
    [tableName, columnName],
  );
  return rows.length > 0;
}

async function loadMissingNumberRows(client) {
  const { rows } = await client.query(`
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
      cp.print_identity_key,
      cp.gv_id,
      coalesce(array_agg(distinct em.external_id) filter (where em.external_id is not null), array[]::text[]) as active_tcgdex_mapping_ids
    from public.card_prints cp
    join public.sets s on s.id = cp.set_id
    left join public.external_mappings em
      on em.card_print_id = cp.id
     and em.active = true
     and em.source = 'tcgdex'
    where s.game = 'pokemon'
      and coalesce(s.source->>'domain', '') <> 'tcg_pocket'
      and (cp.number is null or btrim(cp.number) = '')
      and (cp.number_plain is null or btrim(cp.number_plain) = '')
    group by cp.id, cp.set_id, s.code, s.name, cp.name, cp.number, cp.number_plain, cp.external_ids, cp.variant_key, cp.print_identity_key, cp.gv_id
    order by s.code, cp.name, cp.id
  `);

  return rows.map((row) => {
    const sourceEntries = [];
    const tcgdexExternalId = cleanText(row.external_ids?.tcgdex);
    if (tcgdexExternalId) {
      sourceEntries.push({
        carrier: 'external_ids.tcgdex',
        external_id: tcgdexExternalId,
        candidate_number: candidateFromExternalId(tcgdexExternalId),
      });
    }
    for (const externalId of row.active_tcgdex_mapping_ids ?? []) {
      sourceEntries.push({
        carrier: 'external_mappings.tcgdex',
        external_id: externalId,
        candidate_number: candidateFromExternalId(externalId),
      });
    }

    const candidateNumbers = [...new Set(sourceEntries.map((entry) => entry.candidate_number).filter(Boolean))].sort();
    const sourceCarriers = [...new Set(sourceEntries.map((entry) => entry.carrier))].sort();
    const sourceExternalIds = [...new Set(sourceEntries.map((entry) => entry.external_id).filter(Boolean))].sort();
    const enriched = {
      ...row,
      source_entries: sourceEntries,
      source_carriers: sourceCarriers,
      source_external_ids: sourceExternalIds,
      candidate_numbers: candidateNumbers,
      distinct_candidate_count: candidateNumbers.length,
      in_hard_stop_set: HARD_STOP_CODES.has(String(row.set_code)),
      in_review_stop_set: REVIEW_STOP_CODES.has(String(row.set_code)),
      has_external_ids_tcgdex: sourceCarriers.includes('external_ids.tcgdex'),
      has_external_mapping_tcgdex: sourceCarriers.includes('external_mappings.tcgdex'),
    };
    enriched.lane = laneForCandidate(enriched);
    return enriched;
  });
}

async function loadExistingSetRows(client, setIds) {
  if (!setIds.length) return [];
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
        cp.variant_key,
        cp.print_identity_key,
        cp.gv_id
      from public.card_prints cp
      join public.sets s on s.id = cp.set_id
      where cp.set_id = any($1::uuid[])
    `,
    [setIds],
  );
  return rows;
}

async function loadActiveIdentityRows(client, candidateIds) {
  if (!candidateIds.length) return [];
  const { rows } = await client.query(
    `
      select
        id::text as card_print_identity_id,
        card_print_id::text as card_print_id,
        printed_number,
        is_active
      from public.card_print_identity
      where card_print_id = any($1::uuid[])
        and is_active = true
    `,
    [candidateIds],
  );
  return rows;
}

function buildCollisionEvidence(candidates, existingRows) {
  const existingBySet = groupBy(existingRows, (row) => row.set_id);
  const collisions = [];
  for (const candidate of candidates) {
    const rowsForSet = existingBySet.get(candidate.set_id) ?? [];
    for (const existing of rowsForSet) {
      if (existing.card_print_id === candidate.card_print_id) continue;
      if (cleanText(existing.number) === candidate.proposed_number || cleanText(existing.number_plain) === candidate.proposed_number_plain) {
        collisions.push({
          card_print_id: candidate.card_print_id,
          set_code: candidate.set_code,
          card_name: candidate.card_name,
          proposed_number: candidate.proposed_number,
          existing_card_print_id: existing.card_print_id,
          existing_card_name: existing.card_name,
          existing_number: existing.number,
          existing_number_plain: existing.number_plain,
        });
      }
    }
  }
  return collisions;
}

function buildDuplicateCandidateGroups(candidates) {
  return [...groupBy(candidates, (row) => `${row.set_id}|${row.proposed_number}`).values()]
    .filter((rows) => rows.length > 1)
    .map((rows) => ({
      set_code: rows[0].set_code,
      set_name: rows[0].set_name,
      proposed_number: rows[0].proposed_number,
      candidate_count: rows.length,
      candidates: rows.map((row) => ({
        card_print_id: row.card_print_id,
        card_name: row.card_name,
      })),
    }));
}

function buildIdentityConflicts(candidates, identityRows) {
  const byId = new Map(candidates.map((row) => [row.card_print_id, row]));
  return identityRows
    .map((identity) => {
      const candidate = byId.get(identity.card_print_id);
      const normalizedPrintedNumber = normalizeNumber(identity.printed_number);
      return {
        ...identity,
        set_code: candidate?.set_code ?? null,
        card_name: candidate?.card_name ?? null,
        proposed_number: candidate?.proposed_number ?? null,
        normalized_printed_number: normalizedPrintedNumber,
        conflicts: Boolean(candidate && normalizedPrintedNumber && normalizedPrintedNumber !== candidate.proposed_number),
      };
    })
    .filter((row) => row.conflicts);
}

async function loadUserMarketReferences(client, candidateIds) {
  if (!candidateIds.length) return [];
  const inventory = [];
  const perCard = new Map();
  for (const [tableName, columnName] of USER_MARKET_REF_TABLES) {
    const exists = await tableColumnExists(client, tableName, columnName);
    if (!exists) {
      inventory.push({
        table_name: tableName,
        column_name: columnName,
        table_available: false,
        reference_rows: 0,
        referenced_candidate_rows: 0,
      });
      continue;
    }
    const sql = `
      select
        count(*)::int as reference_rows,
        count(distinct ${quoteIdent(columnName)})::int as referenced_candidate_rows
      from public.${quoteIdent(tableName)}
      where ${quoteIdent(columnName)} = any($1::uuid[])
    `;
    const { rows } = await client.query(sql, [candidateIds]);
    inventory.push({
      table_name: tableName,
      column_name: columnName,
      table_available: true,
      reference_rows: rows[0]?.reference_rows ?? 0,
      referenced_candidate_rows: rows[0]?.referenced_candidate_rows ?? 0,
    });

    const detailSql = `
      select
        ${quoteIdent(columnName)}::text as card_print_id,
        count(*)::int as reference_rows
      from public.${quoteIdent(tableName)}
      where ${quoteIdent(columnName)} = any($1::uuid[])
      group by ${quoteIdent(columnName)}
      order by ${quoteIdent(columnName)}
    `;
    const { rows: detailRows } = await client.query(detailSql, [candidateIds]);
    for (const detail of detailRows) {
      if (!perCard.has(detail.card_print_id)) perCard.set(detail.card_print_id, []);
      perCard.get(detail.card_print_id).push({
        table_name: tableName,
        column_name: columnName,
        reference_rows: detail.reference_rows,
      });
    }
  }
  return {
    inventory,
    per_card: [...perCard.entries()]
      .map(([cardPrintId, references]) => ({
        card_print_id: cardPrintId,
        references,
      }))
      .sort((a, b) => a.card_print_id.localeCompare(b.card_print_id)),
  };
}

function buildLiveCandidateMatrix(laneACandidates, collisions, duplicateGroups, identityConflicts) {
  const collisionsByCardId = groupBy(collisions, (row) => row.card_print_id);
  const duplicateIds = new Set(duplicateGroups.flatMap((group) => group.candidates.map((candidate) => candidate.card_print_id)));
  const identityConflictIds = new Set(identityConflicts.map((row) => row.card_print_id));

  return laneACandidates
    .map((candidate) => {
      const sourceCarrierPass = candidate.has_external_ids_tcgdex && candidate.has_external_mapping_tcgdex;
      const blockingReasons = [];
      if (!sourceCarrierPass) blockingReasons.push('missing required TCGdex source carrier pair');
      if (collisionsByCardId.has(candidate.card_print_id)) blockingReasons.push('existing number collision in same set');
      if (duplicateIds.has(candidate.card_print_id)) blockingReasons.push('duplicate proposed number inside candidate lane');
      if (identityConflictIds.has(candidate.card_print_id)) blockingReasons.push('active identity printed_number conflict');

      return {
        card_print_id: candidate.card_print_id,
        set_id: candidate.set_id,
        set_code: candidate.set_code,
        set_name: candidate.set_name,
        card_name: candidate.card_name,
        approved_number: candidate.proposed_number,
        approved_number_plain: candidate.proposed_number_plain,
        source_carriers: candidate.source_carriers,
        source_external_ids: candidate.source_external_ids,
        current_print_identity_key: candidate.print_identity_key,
        current_gv_id: candidate.gv_id,
        status: blockingReasons.length ? 'BLOCKED_FROM_FUTURE_WRITE_PLAN' : 'FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE',
        blocking_reasons: blockingReasons,
      };
    })
    .sort((a, b) =>
      a.set_code.localeCompare(b.set_code) ||
      Number(a.approved_number) - Number(b.approved_number) ||
      a.card_name.localeCompare(b.card_name) ||
      a.card_print_id.localeCompare(b.card_print_id)
    );
}

function buildSetBreakdown(candidates) {
  return Object.values(candidates.reduce((acc, row) => {
    acc[row.set_code] ||= {
      set_code: row.set_code,
      set_name: row.set_name,
      clean_rows: 0,
      min_approved_number: row.approved_number,
      max_approved_number: row.approved_number,
    };
    acc[row.set_code].clean_rows += 1;
    if (Number(row.approved_number) < Number(acc[row.set_code].min_approved_number)) acc[row.set_code].min_approved_number = row.approved_number;
    if (Number(row.approved_number) > Number(acc[row.set_code].max_approved_number)) acc[row.set_code].max_approved_number = row.approved_number;
    return acc;
  }, {})).sort((a, b) => a.set_code.localeCompare(b.set_code));
}

function comparableCandidate(row) {
  return {
    card_print_id: row.card_print_id,
    set_id: row.set_id,
    set_code: row.set_code,
    set_name: row.set_name,
    card_name: row.card_name,
    approved_number: row.approved_number,
    approved_number_plain: row.approved_number_plain,
    source_carriers: [...(row.source_carriers ?? [])].sort(),
    source_external_ids: [...(row.source_external_ids ?? [])].sort(),
    current_print_identity_key: row.current_print_identity_key ?? null,
    current_gv_id: row.current_gv_id ?? null,
  };
}

function compareCommittedToLive(committedCandidates, liveCandidates) {
  const committedById = new Map(committedCandidates.map((row) => [row.card_print_id, comparableCandidate(row)]));
  const liveById = new Map(liveCandidates.map((row) => [row.card_print_id, comparableCandidate(row)]));
  const missingFromLive = [...committedById.keys()].filter((id) => !liveById.has(id)).sort();
  const extraInLive = [...liveById.keys()].filter((id) => !committedById.has(id)).sort();
  const fieldDiffs = [];

  for (const id of [...committedById.keys()].sort()) {
    if (!liveById.has(id)) continue;
    const committed = committedById.get(id);
    const live = liveById.get(id);
    const diffFields = [];
    for (const key of Object.keys(committed)) {
      if (JSON.stringify(committed[key]) !== JSON.stringify(live[key])) {
        diffFields.push({
          field: key,
          committed: committed[key],
          live: live[key],
        });
      }
    }
    if (diffFields.length) {
      fieldDiffs.push({
        card_print_id: id,
        fields: diffFields,
      });
    }
  }

  return {
    missing_from_live: missingFromLive,
    extra_in_live: extraInLive,
    field_diffs: fieldDiffs,
    drift_count: missingFromLive.length + extraInLive.length + fieldDiffs.length,
  };
}

function renderMarkdown(matrix) {
  const lines = [];
  lines.push('# Lane A 248 Pre-Execution Gate - 2026-05-17');
  lines.push('');
  lines.push('Status: no-write pre-execution gate. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, variant changes, or production mutation.');
  lines.push('');
  lines.push('## Result');
  lines.push('');
  lines.push(`Gate status: \`${matrix.status}\``);
  if (matrix.failure_reasons.length) {
    lines.push('');
    lines.push('Failure reasons:');
    lines.push('');
    for (const reason of matrix.failure_reasons) lines.push(`- ${reason}`);
  }
  lines.push('');
  lines.push(renderTable(
    ['Check', 'Result'],
    [
      ['Committed candidate rows', matrix.summary.committed_candidate_rows],
      ['Live clean Lane A rows', matrix.summary.live_clean_candidate_rows],
      ['Committed vs live drift count', matrix.summary.committed_vs_live_drift_count],
      ['Collision rows excluded', matrix.live_counts.collision_blocked_rows],
      ['`me01` duplicate candidates excluded', matrix.live_counts.me01_duplicate_candidates_excluded],
      ['Hard-stop rows excluded', matrix.live_counts.hard_stop_blocked_rows],
      ['Prefixed rows excluded', matrix.live_counts.prefixed_source_candidate_non_hard_stop],
      ['Complex rows excluded', matrix.live_counts.complex_source_candidate_non_hard_stop],
      ['Distinct user/market referenced clean candidates', matrix.live_counts.user_market_referenced_clean_candidates],
      ['User/market reference tables with refs', matrix.live_counts.user_market_reference_tables_with_refs],
      ['Recommended immediate writes', matrix.summary.recommended_immediate_writes],
    ],
  ));
  lines.push('');
  lines.push('## Set Breakdown');
  lines.push('');
  lines.push(renderTable(
    ['Set', 'Name', 'Rows', 'Range'],
    matrix.set_breakdown.map((row) => [
      `\`${row.set_code}\``,
      row.set_name,
      row.clean_rows,
      `${row.min_approved_number}-${row.max_approved_number}`,
    ]),
  ));
  lines.push('');
  lines.push('## Drift Details');
  lines.push('');
  if (matrix.comparison.drift_count === 0) {
    lines.push('No drift found. The live regenerated 248-row matrix exactly matches the committed write-plan matrix.');
  } else {
    lines.push('Drift found. Stop. Do not execute any number-normalization write.');
    lines.push('');
    lines.push(`- Missing from live: ${matrix.comparison.missing_from_live.length}`);
    lines.push(`- Extra in live: ${matrix.comparison.extra_in_live.length}`);
    lines.push(`- Field-diff rows: ${matrix.comparison.field_diffs.length}`);
  }
  lines.push('');
  lines.push('## Reference Gate Details');
  lines.push('');
  if (!matrix.referenced_clean_candidates.length) {
    lines.push('No user, vault, pricing, slab, shared-card, or JustTCG market references were found on the live clean candidate set.');
  } else {
    lines.push('At least one live clean candidate has user/market references. Stop before execution and review this candidate explicitly.');
    lines.push('');
    lines.push(renderTable(
      ['Card print', 'Set', 'Card', 'Approved number', 'Reference tables'],
      matrix.referenced_clean_candidates.map((row) => [
        `\`${row.card_print_id}\``,
        `\`${row.set_code}\``,
        row.card_name,
        row.approved_number,
        row.references.map((ref) => `${ref.table_name}.${ref.column_name}=${ref.reference_rows}`).join(', '),
      ]),
    ));
  }
  lines.push('');
  lines.push('## Eventual Write Boundary');
  lines.push('');
  lines.push('If explicitly authorized later after this gate passes, the write boundary remains:');
  lines.push('');
  lines.push('- update only `card_prints.number` and `card_prints.number_plain` for the 248 approved ids;');
  lines.push('- snapshot before-values first;');
  lines.push('- post-verify exactly 248 rows changed;');
  lines.push('- no mapping rows touched;');
  lines.push('- no raw import rows touched;');
  lines.push('- no set rows touched;');
  lines.push('- no identity rows touched;');
  lines.push('- no partial execution if any gate differs.');
  lines.push('');
  lines.push('## No-Write Confirmation');
  lines.push('');
  lines.push('- No Supabase writes.');
  lines.push('- No migrations.');
  lines.push('- No inserts.');
  lines.push('- No updates.');
  lines.push('- No deletes.');
  lines.push('- No data changes.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const committed = JSON.parse(await fs.readFile(COMMITTED_MATRIX_PATH, 'utf8'));
  const committedCandidates = committed.candidates ?? [];

  const client = new pg.Client({
    connectionString,
    application_name: 'number_normalization_lane_a_248_preexecution_gate_v1:readonly',
    statement_timeout: 120000,
  });

  await client.connect();
  let liveMatrix;
  try {
    await client.query('begin transaction read only');
    const missingRows = await loadMissingNumberRows(client);
    const laneCounts = countBy(missingRows, (row) => row.lane);
    const laneACandidates = missingRows
      .filter((row) => row.lane === 'lane_a_numeric_non_hard_stop')
      .map((row) => ({
        ...row,
        proposed_number: row.candidate_numbers[0],
        proposed_number_plain: row.candidate_numbers[0],
      }));

    const laneASetIds = [...new Set(laneACandidates.map((row) => row.set_id))].sort();
    const laneAIds = laneACandidates.map((row) => row.card_print_id);
    const existingSetRows = await loadExistingSetRows(client, laneASetIds);
    const identityRows = await loadActiveIdentityRows(client, laneAIds);
    const collisions = buildCollisionEvidence(laneACandidates, existingSetRows);
    const duplicateGroups = buildDuplicateCandidateGroups(laneACandidates);
    const identityConflicts = buildIdentityConflicts(laneACandidates, identityRows);
    const liveAllCandidates = buildLiveCandidateMatrix(laneACandidates, collisions, duplicateGroups, identityConflicts);
    const liveCleanCandidates = liveAllCandidates.filter((row) => row.status === 'FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE');
    const userMarketRefs = await loadUserMarketReferences(client, liveCleanCandidates.map((row) => row.card_print_id));
    await client.query('rollback');

    const comparison = compareCommittedToLive(committedCandidates, liveCleanCandidates);
    const referencedById = new Map(userMarketRefs.per_card.map((row) => [row.card_print_id, row.references]));
    const referencedCleanCandidates = liveCleanCandidates
      .filter((row) => referencedById.has(row.card_print_id))
      .map((row) => ({
        ...comparableCandidate(row),
        references: referencedById.get(row.card_print_id),
      }));
    const userMarketReferencedRows = referencedCleanCandidates.length;
    const referenceTablesWithRefs = userMarketRefs.inventory.filter((row) => Number(row.reference_rows || 0) > 0).length;
    const failureReasons = [];
    if (committedCandidates.length !== 248) failureReasons.push(`committed matrix row count is ${committedCandidates.length}, expected 248`);
    if (liveCleanCandidates.length !== 248) failureReasons.push(`live clean matrix row count is ${liveCleanCandidates.length}, expected 248`);
    if (comparison.drift_count !== 0) failureReasons.push(`committed matrix differs from live regenerated matrix in ${comparison.drift_count} row group(s)`);
    if (userMarketReferencedRows !== 0) failureReasons.push(`${userMarketReferencedRows} live clean candidate(s) now carry user/market references and require manual review before execution`);
    const exactMatch =
      committedCandidates.length === 248 &&
      liveCleanCandidates.length === 248 &&
      comparison.drift_count === 0 &&
      userMarketReferencedRows === 0;
    const status = exactMatch
      ? 'PASS_EXACT_MATCH_NO_WRITE'
      : comparison.drift_count > 0
        ? 'FAIL_MATRIX_DRIFT_NO_WRITE'
        : 'FAIL_REFERENCE_GATE_NO_WRITE';

    liveMatrix = {
      status,
      generated_at: new Date().toISOString(),
      committed_matrix_path: 'docs/plans/pokemon_db_remediation_v1/number_normalization_lane_a_248_write_plan_matrix_20260517.json',
      source: 'live Supabase read-only transaction',
      summary: {
        committed_candidate_rows: committedCandidates.length,
        live_clean_candidate_rows: liveCleanCandidates.length,
        committed_vs_live_drift_count: comparison.drift_count,
        recommended_immediate_writes: 0,
        execution_eligible_after_explicit_approval: exactMatch,
      },
      failure_reasons: failureReasons,
      live_counts: {
        missing_number_rows_audited: missingRows.length,
        lane_counts: laneCounts,
        lane_a_numeric_non_hard_stop_candidates: laneACandidates.length,
        collision_blocked_rows: [...new Set(collisions.map((row) => row.card_print_id))].length,
        duplicate_candidate_groups: duplicateGroups.length,
        active_identity_conflict_rows: identityConflicts.length,
        clean_future_write_plan_candidates: liveCleanCandidates.length,
        me01_duplicate_candidates_excluded: liveAllCandidates.filter((row) => row.set_code === 'me01' && row.status !== 'FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE').length,
        hard_stop_blocked_rows: laneCounts.hard_stop_set_blocked ?? 0,
        prefixed_source_candidate_non_hard_stop: laneCounts.prefixed_source_candidate_non_hard_stop ?? 0,
        complex_source_candidate_non_hard_stop: laneCounts.complex_source_candidate_non_hard_stop ?? 0,
        user_market_referenced_clean_candidates: userMarketReferencedRows,
        user_market_reference_tables_with_refs: referenceTablesWithRefs,
      },
      set_breakdown: buildSetBreakdown(liveCleanCandidates),
      user_market_reference_inventory: userMarketRefs.inventory,
      referenced_clean_candidates: referencedCleanCandidates,
      comparison,
      live_candidates: liveCleanCandidates.map(comparableCandidate),
      no_write_confirmation: {
        supabase_writes: false,
        migrations: false,
        inserts: false,
        updates: false,
        deletes: false,
        data_changes: false,
      },
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

  await fs.writeFile(GATE_MATRIX_PATH, JSON.stringify(liveMatrix, null, 2) + '\n');
  await fs.writeFile(GATE_REPORT_PATH, renderMarkdown(liveMatrix));

  console.log(JSON.stringify({
    status: liveMatrix.status,
    committed_candidate_rows: liveMatrix.summary.committed_candidate_rows,
    live_clean_candidate_rows: liveMatrix.summary.live_clean_candidate_rows,
    drift_count: liveMatrix.summary.committed_vs_live_drift_count,
    user_market_referenced_clean_candidates: liveMatrix.live_counts.user_market_referenced_clean_candidates,
  }, null, 2));

  if (liveMatrix.status !== 'PASS_EXACT_MATCH_NO_WRITE') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
