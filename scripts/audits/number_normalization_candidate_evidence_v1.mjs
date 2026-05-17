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
const MATRIX_PATH = path.join(OUT_DIR, 'number_normalization_candidate_evidence_matrix_20260517.json');
const REPORT_PATH = path.join(OUT_DIR, 'number_normalization_candidate_evidence_20260517.md');

const HARD_STOP_CODES = new Set([
  'sv04.5',
  'sv4pt5',
  'pgo',
  'swsh10.5',
  'sv08.5',
  'sv8pt5',
  'sv06.5',
  'sv6pt5',
]);

const REVIEW_STOP_CODES = new Set([
  'bog',
  'bp',
  'tk-ex-m',
  'tk2b',
  'tk-ex-p',
  'tk2a',
  'tk-ex-latia',
  'tk1a',
  'tk-ex-latio',
  'tk1b',
]);

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
  const tail = source.replace(/^.*-/, '');
  return normalizeNumber(tail);
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

function gate(status, evidence) {
  return { status, evidence };
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
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

function sortedSetBreakdown(candidates, blockersByCardId) {
  const groups = groupBy(candidates, (row) => row.set_code);
  return [...groups.entries()]
    .map(([setCode, rows]) => {
      const setName = rows[0]?.set_name ?? null;
      const blockerRows = rows.filter((row) => (blockersByCardId.get(row.card_print_id) ?? []).length > 0);
      const numbers = rows
        .map((row) => Number(row.proposed_number))
        .filter((value) => Number.isFinite(value))
        .sort((a, b) => a - b);
      return {
        set_code: setCode,
        set_name: setName,
        candidate_rows: rows.length,
        blocked_rows: blockerRows.length,
        clean_rows: rows.length - blockerRows.length,
        min_candidate_number: numbers.length ? String(numbers[0]) : null,
        max_candidate_number: numbers.length ? String(numbers[numbers.length - 1]) : null,
      };
    })
    .sort((a, b) => b.candidate_rows - a.candidate_rows || a.set_code.localeCompare(b.set_code));
}

async function discoverCardPrintFkInventory(client, candidateIds) {
  if (!candidateIds.length) return [];

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

  const inventory = [];
  for (const fk of fkColumns) {
    const sql = `
      select
        count(*)::int as reference_rows,
        count(distinct ${quoteIdent(fk.column_name)})::int as referenced_candidate_rows
      from public.${quoteIdent(fk.table_name)}
      where ${quoteIdent(fk.column_name)} = any($1::uuid[])
    `;
    const { rows } = await client.query(sql, [candidateIds]);
    inventory.push({
      table_name: fk.table_name,
      column_name: fk.column_name,
      reference_rows: rows[0]?.reference_rows ?? 0,
      referenced_candidate_rows: rows[0]?.referenced_candidate_rows ?? 0,
      safety_note: 'ID-stable number update would not move this FK; inventory is blast-radius evidence only.',
    });
  }
  return inventory;
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
      cp.updated_at::text as updated_at,
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
    group by cp.id, cp.set_id, s.code, s.name, cp.name, cp.number, cp.number_plain, cp.external_ids, cp.variant_key, cp.print_identity_key, cp.gv_id, cp.updated_at
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
    const inHardStopSet = HARD_STOP_CODES.has(String(row.set_code));
    const inReviewStopSet = REVIEW_STOP_CODES.has(String(row.set_code));

    const enriched = {
      ...row,
      source_entries: sourceEntries,
      source_carriers: sourceCarriers,
      source_external_ids: sourceExternalIds,
      candidate_numbers: candidateNumbers,
      distinct_candidate_count: candidateNumbers.length,
      in_hard_stop_set: inHardStopSet,
      in_review_stop_set: inReviewStopSet,
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
    const existingRowsForSet = existingBySet.get(candidate.set_id) ?? [];
    for (const existing of existingRowsForSet) {
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
          existing_variant_key: existing.variant_key,
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
    }))
    .sort((a, b) => a.set_code.localeCompare(b.set_code) || Number(a.proposed_number) - Number(b.proposed_number));
}

function buildIdentityConflictEvidence(candidates, identityRows) {
  const candidateById = new Map(candidates.map((row) => [row.card_print_id, row]));
  return identityRows
    .map((identity) => {
      const candidate = candidateById.get(identity.card_print_id);
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

function buildCandidateMatrix(candidates, collisions, duplicateGroups, identityConflicts, fkInventory) {
  const collisionsByCardId = groupBy(collisions, (row) => row.card_print_id);
  const duplicateKeys = new Set(duplicateGroups.flatMap((group) => group.candidates.map((candidate) => candidate.card_print_id)));
  const identityConflictsByCardId = groupBy(identityConflicts, (row) => row.card_print_id);
  const fkByCardId = new Map();
  for (const fk of fkInventory) {
    if (!fk.reference_rows) continue;
    // Table-level inventory is enough for this dry run. Per-row FK lookup would add volume without changing the safety gate.
  }

  return candidates.map((candidate) => {
    const blockingReasons = [];
    const sourceCarrierPass = candidate.has_external_ids_tcgdex && candidate.has_external_mapping_tcgdex;
    if (!sourceCarrierPass) blockingReasons.push('missing required TCGdex source carrier pair');
    if (collisionsByCardId.has(candidate.card_print_id)) blockingReasons.push('existing number collision in same set');
    if (duplicateKeys.has(candidate.card_print_id)) blockingReasons.push('duplicate proposed number inside candidate lane');
    if (identityConflictsByCardId.has(candidate.card_print_id)) blockingReasons.push('active identity printed_number conflict');

    const gates = {
      hard_stop_excluded: gate(candidate.in_hard_stop_set ? 'FAIL' : 'PASS', candidate.in_hard_stop_set ? 'candidate is in hard-stop set' : 'candidate set is outside hard-stop list'),
      review_stop_excluded: gate(candidate.in_review_stop_set ? 'FAIL' : 'PASS', candidate.in_review_stop_set ? 'candidate is in review-stop set' : 'candidate set is outside review-stop list'),
      missing_direct_number: gate(!cleanText(candidate.number) && !cleanText(candidate.number_plain) ? 'PASS' : 'FAIL', 'candidate still has null/blank number and number_plain'),
      single_source_candidate: gate(candidate.distinct_candidate_count === 1 ? 'PASS' : 'FAIL', `${candidate.distinct_candidate_count} distinct source-derived candidate number(s)`),
      numeric_candidate: gate(/^\d+$/.test(candidate.proposed_number) ? 'PASS' : 'FAIL', `proposed_number=${candidate.proposed_number}`),
      source_carrier_pair: gate(sourceCarrierPass ? 'PASS' : 'FAIL', `carriers=${candidate.source_carriers.join(', ') || 'none'}`),
      existing_number_collision: gate(collisionsByCardId.has(candidate.card_print_id) ? 'FAIL' : 'PASS', collisionsByCardId.has(candidate.card_print_id) ? `${collisionsByCardId.get(candidate.card_print_id).length} collision row(s)` : 'no same-set direct number or number_plain collision'),
      duplicate_candidate_number: gate(duplicateKeys.has(candidate.card_print_id) ? 'FAIL' : 'PASS', duplicateKeys.has(candidate.card_print_id) ? 'another candidate in the same set proposes this number' : 'unique proposed number inside candidate lane'),
      active_identity_conflict: gate(identityConflictsByCardId.has(candidate.card_print_id) ? 'FAIL' : 'PASS', identityConflictsByCardId.has(candidate.card_print_id) ? 'active identity printed_number conflicts with proposed number' : 'no active identity printed_number conflict'),
      fk_safety: gate('PASS', 'future number update is ID-stable; FK inventory is table-level blast-radius evidence only'),
    };

    return {
      card_print_id: candidate.card_print_id,
      set_id: candidate.set_id,
      set_code: candidate.set_code,
      set_name: candidate.set_name,
      card_name: candidate.card_name,
      proposed_number: candidate.proposed_number,
      proposed_number_plain: candidate.proposed_number_plain,
      source_carriers: candidate.source_carriers,
      source_external_ids: candidate.source_external_ids,
      variant_key: candidate.variant_key,
      print_identity_key: candidate.print_identity_key,
      gv_id: candidate.gv_id,
      gates,
      blocking_reasons: blockingReasons,
      status: blockingReasons.length ? 'BLOCKED_FROM_FUTURE_WRITE_PLAN' : 'FUTURE_WRITE_PLAN_CANDIDATE_NO_WRITE',
      fk_reference_summary: fkByCardId.get(candidate.card_print_id) ?? [],
    };
  });
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

function renderMarkdown(matrix) {
  const lines = [];
  const cleanCandidateCount = matrix.summary.clean_future_write_plan_candidates;
  const blockedCandidateCount = matrix.summary.blocked_lane_a_candidates;

  lines.push('# Number Normalization Candidate Evidence - 2026-05-17');
  lines.push('');
  lines.push('Status: no-write candidate evidence. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, card movement, set changes, identity rewrites, mapping movement, missing-card backfill, variant changes, or production mutation.');
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push('Convert the earlier broad number-normalization evidence into a row-level Lane A safety matrix for numeric, non-hard-stop, missing-number rows. This is the last proof step before any future write-plan draft can be considered.');
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
      ['Missing-number rows audited', matrix.summary.missing_number_rows_audited],
      ['Hard-stop blocked rows', matrix.summary.hard_stop_blocked_rows],
      ['Review-stop blocked rows', matrix.summary.review_stop_blocked_rows],
      ['Lane A numeric non-hard-stop candidates', matrix.summary.lane_a_numeric_non_hard_stop_candidates],
      ['Clean future write-plan candidates', cleanCandidateCount],
      ['Blocked Lane A candidates', blockedCandidateCount],
      ['Existing number collision rows', matrix.summary.existing_number_collision_rows],
      ['Duplicate candidate groups', matrix.summary.duplicate_candidate_groups],
      ['Active identity conflict rows', matrix.summary.active_identity_conflict_rows],
      ['Missing required TCGdex carrier pair rows', matrix.summary.missing_required_source_carrier_rows],
      ['Recommended immediate writes', 0],
    ],
  ));
  lines.push('');
  lines.push(`Result: ${cleanCandidateCount} Lane A rows are clean enough to become a future write-plan candidate set, but this artifact still approves zero writes. ${blockedCandidateCount} Lane A rows remain blocked from any future bulk write plan.`);
  lines.push('');
  lines.push('## Lane Counts');
  lines.push('');
  lines.push(renderTable(
    ['Lane', 'Rows'],
    Object.entries(matrix.summary.lane_counts).map(([lane, count]) => [lane, count]),
  ));
  lines.push('');
  lines.push('## Set Breakdown');
  lines.push('');
  lines.push(renderTable(
    ['Set', 'Name', 'Candidates', 'Clean', 'Blocked', 'Candidate range'],
    matrix.set_breakdown.map((row) => [
      `\`${row.set_code}\``,
      row.set_name,
      row.candidate_rows,
      row.clean_rows,
      row.blocked_rows,
      row.min_candidate_number && row.max_candidate_number ? `${row.min_candidate_number}-${row.max_candidate_number}` : '',
    ]),
  ));
  lines.push('');
  lines.push('## Safety Gates');
  lines.push('');
  lines.push('- Hard-stop and review-stop codes are excluded from Lane A.');
  lines.push('- Candidate rows must still have both `card_prints.number` and `card_prints.number_plain` null or blank.');
  lines.push('- Candidate rows must have exactly one source-derived TCGdex local number.');
  lines.push('- Candidate rows must be numeric only; prefixed and complex suffix rows remain policy/manual review.');
  lines.push('- Candidate rows must have both `external_ids.tcgdex` and an active `external_mappings` TCGdex carrier.');
  lines.push('- Candidate rows must not collide with an existing same-set `number` or `number_plain`.');
  lines.push('- Candidate rows must not duplicate another Lane A candidate in the same set.');
  lines.push('- Candidate rows must not conflict with an active `card_print_identity.printed_number`.');
  lines.push('- FK references are inventoried only; a future number update must remain ID-stable.');
  lines.push('');
  lines.push('## Blocker Queues');
  lines.push('');
  if (!matrix.blockers.length) {
    lines.push('_No Lane A blockers._');
  } else {
    lines.push(renderTable(
      ['Card print', 'Set', 'Card', 'Proposed number', 'Blockers'],
      matrix.blockers.slice(0, 80).map((row) => [
        `\`${row.card_print_id}\``,
        `\`${row.set_code}\``,
        row.card_name,
        row.proposed_number,
        row.blocking_reasons.join('; '),
      ]),
    ));
    if (matrix.blockers.length > 80) lines.push(`\nAdditional blockers omitted from Markdown: ${matrix.blockers.length - 80}. See JSON matrix.`);
  }
  lines.push('');
  lines.push('## FK Blast-Radius Inventory');
  lines.push('');
  lines.push(renderTable(
    ['Table.column', 'Reference rows', 'Referenced candidate rows', 'Safety note'],
    matrix.fk_dependency_inventory
      .filter((row) => row.reference_rows > 0)
      .map((row) => [
        `\`${row.table_name}.${row.column_name}\``,
        row.reference_rows,
        row.referenced_candidate_rows,
        row.safety_note,
      ]),
  ));
  if (!matrix.fk_dependency_inventory.some((row) => row.reference_rows > 0)) {
    lines.push('');
    lines.push('_No FK references found for Lane A candidates._');
  }
  lines.push('');
  lines.push('## Candidate Sample');
  lines.push('');
  lines.push(renderTable(
    ['Set', 'Card', 'Proposed number', 'Source carriers', 'Status'],
    matrix.candidates.slice(0, 60).map((row) => [
      `\`${row.set_code}\``,
      row.card_name,
      row.proposed_number,
      row.source_carriers.join(', '),
      row.status,
    ]),
  ));
  if (matrix.candidates.length > 60) lines.push(`\nAdditional candidates omitted from Markdown: ${matrix.candidates.length - 60}. See JSON matrix.`);
  lines.push('');
  lines.push('## Conclusion');
  lines.push('');
  if (blockedCandidateCount === 0) {
    lines.push('The Lane A candidate set is clean at the current evidence level. The next artifact may be a no-write future write-plan draft for exactly these clean candidates, with guard clauses, rollback shape, and post-write audit queries. It still must not execute without explicit approval and a fresh preflight.');
  } else {
    lines.push('The Lane A candidate set is not clean enough for a bulk future write-plan draft. Resolve or exclude blockers first, then regenerate this evidence.');
  }
  lines.push('');
  lines.push('No prefixed, complex, hard-stop, review-stop, existing-number conflict, missing-card, or variant work is authorized by this evidence pack.');
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
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const client = new pg.Client({
    connectionString,
    application_name: 'number_normalization_candidate_evidence_v1:readonly',
    statement_timeout: 120000,
  });

  await client.connect();
  let matrix;
  try {
    await client.query('begin transaction read only');

    const missingRows = await loadMissingNumberRows(client);
    const laneCounts = Object.fromEntries([...countBy(missingRows, (row) => row.lane).entries()].sort());
    const laneACandidates = missingRows
      .filter((row) => row.lane === 'lane_a_numeric_non_hard_stop')
      .map((row) => ({
        ...row,
        proposed_number: row.candidate_numbers[0],
        proposed_number_plain: row.candidate_numbers[0],
      }));

    const laneASetIds = [...new Set(laneACandidates.map((row) => row.set_id))].sort();
    const laneACandidateIds = laneACandidates.map((row) => row.card_print_id);
    const existingSetRows = await loadExistingSetRows(client, laneASetIds);
    const activeIdentityRows = await loadActiveIdentityRows(client, laneACandidateIds);
    const fkInventory = await discoverCardPrintFkInventory(client, laneACandidateIds);

    const collisions = buildCollisionEvidence(laneACandidates, existingSetRows);
    const duplicateGroups = buildDuplicateCandidateGroups(laneACandidates);
    const identityConflicts = buildIdentityConflictEvidence(laneACandidates, activeIdentityRows);
    const candidateMatrix = buildCandidateMatrix(laneACandidates, collisions, duplicateGroups, identityConflicts, fkInventory);
    const blockers = candidateMatrix.filter((row) => row.blocking_reasons.length > 0);
    const blockersByCardId = new Map(blockers.map((row) => [row.card_print_id, row.blocking_reasons]));
    const missingCarrierRows = candidateMatrix.filter((row) => row.gates.source_carrier_pair.status === 'FAIL');

    matrix = {
      status: 'NO_WRITE_NUMBER_NORMALIZATION_CANDIDATE_EVIDENCE_ONLY',
      generated_at: new Date().toISOString(),
      generated_from: [
        'docs/plans/pokemon_db_remediation_v1/number_normalization_evidence_20260517.md',
        'docs/plans/pokemon_db_remediation_v1/number_normalization_evidence_matrix_20260517.json',
        'docs/plans/pokemon_db_remediation_v1/number_normalization_dry_run_implementation_plan_20260517.md',
        'docs/plans/pokemon_db_remediation_v1/pokemon_db_remediation_v1_checkpoint_20260517.md',
      ],
      scope: {
        db_filter: "sets.game = 'pokemon' and coalesce(sets.source->>'domain', '') <> 'tcg_pocket'",
        lane: 'Lane A numeric non-hard-stop missing-number candidates only',
        hard_stop_codes: [...HARD_STOP_CODES].sort(),
        review_stop_codes: [...REVIEW_STOP_CODES].sort(),
      },
      summary: {
        missing_number_rows_audited: missingRows.length,
        lane_counts: laneCounts,
        hard_stop_blocked_rows: laneCounts.hard_stop_set_blocked ?? 0,
        review_stop_blocked_rows: laneCounts.review_stop_set_blocked ?? 0,
        lane_a_numeric_non_hard_stop_candidates: laneACandidates.length,
        clean_future_write_plan_candidates: candidateMatrix.length - blockers.length,
        blocked_lane_a_candidates: blockers.length,
        existing_number_collision_rows: collisions.length,
        duplicate_candidate_groups: duplicateGroups.length,
        active_identity_conflict_rows: identityConflicts.length,
        missing_required_source_carrier_rows: missingCarrierRows.length,
        active_identity_rows_on_candidates: activeIdentityRows.length,
        fk_tables_with_candidate_references: fkInventory.filter((row) => row.reference_rows > 0).length,
        recommended_immediate_writes: 0,
      },
      set_breakdown: sortedSetBreakdown(laneACandidates, blockersByCardId),
      blockers,
      collisions,
      duplicate_candidate_groups: duplicateGroups,
      identity_conflicts: identityConflicts,
      fk_dependency_inventory: fkInventory,
      candidates: candidateMatrix,
    };

    await client.query('rollback');
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
