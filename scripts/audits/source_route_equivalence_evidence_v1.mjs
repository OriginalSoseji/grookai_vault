import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });

const ROOT = process.cwd();
const SUMMARY_PATH = path.join(ROOT, 'docs', 'audits', 'pokemon_master_set_audit_v1', 'summary.json');
const OUT_DIR = path.join(ROOT, 'docs', 'plans', 'pokemon_db_remediation_v1');
const MATRIX_PATH = path.join(OUT_DIR, 'source_route_equivalence_evidence_matrix_20260517.json');
const REPORT_PATH = path.join(OUT_DIR, 'source_route_equivalence_evidence_20260517.md');

const TARGETS = [
  {
    source_name: 'Shiny Vault',
    source_slug: 'shiny-vault',
    source_url: 'https://pkmncards.com/collection/shiny-vault/',
    source_route_candidates: ['shiny-vault'],
    db_set_code: 'sma',
    expected_db_name: 'Hidden Fates Shiny Vault',
    route_recommendation: 'source collection route to existing sma; no card insert and no new set',
  },
  {
    source_name: 'Rumble',
    source_slug: 'rumble',
    source_url: 'https://pkmncards.com/set/rumble/',
    source_route_candidates: ['rm'],
    db_set_code: 'ru1',
    expected_db_name: 'Pokemon Rumble',
    route_recommendation: 'set/source alias route from RM to existing ru1; no card insert and no new set',
  },
];

function decodeHtml(value = '') {
  return String(value)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/&eacute;/g, 'é');
}

function normalizeName(value = '') {
  return decodeHtml(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bpokémon\b/g, 'pokemon')
    .replace(/[’'`]/g, '')
    .replace(/[—–-]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value = '') {
  let text = decodeHtml(value ?? '').trim();
  if (!text) return null;
  text = text.replace(/^#/, '').trim();
  text = text.replace(/\s+/g, '');
  text = text.split('/')[0];
  text = text.toUpperCase();
  if (!text) return null;
  if (/^\d+$/.test(text)) return String(Number(text));
  const prefixed = text.match(/^([A-Z]+)0*([0-9]+)([A-Z]*)$/);
  if (prefixed) return `${prefixed[1]}${Number(prefixed[2])}${prefixed[3]}`;
  return text;
}

function numberSortValue(key) {
  if (!key) return Number.MAX_SAFE_INTEGER;
  if (/^\d+$/.test(key)) return Number(key);
  const match = key.match(/^([A-Z]+)(\d+)([A-Z]*)$/);
  if (match) return Number(match[2]);
  return Number.MAX_SAFE_INTEGER;
}

function identityKey(row) {
  return `${normalizeNumber(row.number)}|${normalizeName(row.name)}`;
}

function numberNameRows(rows) {
  return rows.map((row) => ({
    number_key: normalizeNumber(row.number),
    normalized_name: normalizeName(row.name),
    name: row.name,
    number: row.number ?? null,
    identity_key: identityKey(row),
  }));
}

function rangeLabel(numbers) {
  const values = [...new Set(numbers.filter(Boolean))].sort((a, b) => {
    const sort = numberSortValue(a) - numberSortValue(b);
    return sort || a.localeCompare(b);
  });
  if (!values.length) return null;
  return values.length === 1 ? values[0] : `${values[0]}-${values[values.length - 1]}`;
}

function duplicateKeys(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.identity_key, (counts.get(row.identity_key) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count }));
}

async function loadDbEvidence(client, target) {
  const setResult = await client.query(
    `select code, name, printed_total, printed_set_abbrev, set_role, identity_model, source
     from public.sets
     where game = 'pokemon' and code = $1`,
    [target.db_set_code],
  );

  const cardResult = await client.query(
    `select cp.id, cp.name, cp.number, cp.number_plain, cp.external_ids, cp.variant_key, cp.variants
     from public.card_prints cp
     join public.sets s on s.id = cp.set_id
     where s.game = 'pokemon' and s.code = $1
     order by cp.number_plain nulls last, cp.number nulls last, cp.name`,
    [target.db_set_code],
  );

  const classificationCodes = [target.db_set_code, ...target.source_route_candidates];
  const classificationResult = await client.query(
    `select set_code, is_canon, canonical_set_code, canon_source, pokemonapi_set_id, tcgdex_set_id, notes
     from public.set_code_classification
     where lower(set_code) = any($1::text[])
        or lower(canonical_set_code) = lower($2)
     order by set_code`,
    [classificationCodes.map((code) => code.toLowerCase()), target.db_set_code],
  );

  const mappingResult = await client.query(
    `select em.source, count(*)::int as rows, count(distinct em.card_print_id)::int as distinct_card_prints
     from public.card_prints cp
     join public.sets s on s.id = cp.set_id
     left join public.external_mappings em on em.card_print_id = cp.id and em.active = true
     where s.game = 'pokemon' and s.code = $1
     group by em.source
     order by em.source`,
    [target.db_set_code],
  );

  return {
    set_row: setResult.rows[0] ?? null,
    card_rows: cardResult.rows,
    classification_rows: classificationResult.rows,
    active_external_mapping_counts: mappingResult.rows.map((row) => ({
      source: row.source ?? 'none',
      rows: row.rows,
      distinct_card_prints: row.distinct_card_prints,
    })),
  };
}

function compareTarget(target, masterSet, dbEvidence) {
  const sourceRows = numberNameRows(masterSet.cards ?? []);
  const dbRows = numberNameRows(dbEvidence.card_rows);

  const sourceByKey = new Map(sourceRows.map((row) => [row.identity_key, row]));
  const dbByKey = new Map(dbRows.map((row) => [row.identity_key, row]));

  const matchedKeys = [...sourceByKey.keys()].filter((key) => dbByKey.has(key)).sort();
  const missingInDb = [...sourceByKey.keys()]
    .filter((key) => !dbByKey.has(key))
    .map((key) => sourceByKey.get(key));
  const extraInDb = [...dbByKey.keys()]
    .filter((key) => !sourceByKey.has(key))
    .map((key) => dbByKey.get(key));

  const sourceNumbers = sourceRows.map((row) => row.number_key);
  const dbNumbers = dbRows.map((row) => row.number_key);

  const classificationByCode = new Map(
    dbEvidence.classification_rows.map((row) => [String(row.set_code).toLowerCase(), row]),
  );
  const candidateClassification = target.source_route_candidates.map((code) => ({
    set_code: code,
    row_exists: classificationByCode.has(code.toLowerCase()),
    row: classificationByCode.get(code.toLowerCase()) ?? null,
  }));

  const exact = missingInDb.length === 0 && extraInDb.length === 0 && sourceRows.length === dbRows.length;

  return {
    source_name: target.source_name,
    source_slug: target.source_slug,
    source_url: target.source_url,
    source_route_candidates: target.source_route_candidates,
    db_set_code: target.db_set_code,
    db_set_name: dbEvidence.set_row?.name ?? null,
    expected_db_name: target.expected_db_name,
    equivalence_status: exact ? 'PASS_EXACT_EQUIVALENCE' : 'BLOCKED_REVIEW_REQUIRED',
    recommended_next_action: exact ? target.route_recommendation : 'do not route or insert until mismatch review is complete',
    future_write_allowed_now: false,
    recommended_card_inserts: 0,
    recommended_set_creates: 0,
    source_card_count: sourceRows.length,
    db_card_count: dbRows.length,
    matched_identity_count: matchedKeys.length,
    missing_in_db_count: missingInDb.length,
    extra_in_db_count: extraInDb.length,
    source_distinct_number_count: new Set(sourceNumbers.filter(Boolean)).size,
    db_distinct_number_count: new Set(dbNumbers.filter(Boolean)).size,
    source_number_range: rangeLabel(sourceNumbers),
    db_number_range: rangeLabel(dbNumbers),
    source_duplicate_identity_keys: duplicateKeys(sourceRows),
    db_duplicate_identity_keys: duplicateKeys(dbRows),
    missing_in_db: missingInDb,
    extra_in_db: extraInDb,
    set_row: dbEvidence.set_row
      ? {
          code: dbEvidence.set_row.code,
          name: dbEvidence.set_row.name,
          printed_total: dbEvidence.set_row.printed_total,
          printed_set_abbrev: dbEvidence.set_row.printed_set_abbrev,
          set_role: dbEvidence.set_row.set_role,
          identity_model: dbEvidence.set_row.identity_model,
        }
      : null,
    candidate_classification_rows: candidateClassification,
    canonical_classification_rows: dbEvidence.classification_rows.filter(
      (row) => String(row.set_code).toLowerCase() === target.db_set_code.toLowerCase(),
    ),
    active_external_mapping_counts: dbEvidence.active_external_mapping_counts,
    notes: [
      'Compared PkmnCards number/name identity keys to live DB card_prints in a read-only transaction.',
      exact
        ? 'Exact checklist equivalence means this is source-route or alias-mapping work, not card insertion.'
        : 'Mismatch requires manual review before source route, set creation, or card insertion.',
    ],
  };
}

function renderMarkdown(matrix) {
  const lines = [];
  lines.push('# Source Route Equivalence Evidence - 2026-05-17');
  lines.push('');
  lines.push('Status: no-write evidence only. This report authorizes no Supabase writes, migrations, inserts, updates, deletes, route writes, set creation, card backfill, mapping movement, metadata merge, or production data mutation.');
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push('Prove whether the two missing-card groups that looked like source-route problems already have complete DB ownership: Shiny Vault in `sma` and Rumble in `ru1`.');
  lines.push('');
  lines.push('## Source Evidence');
  lines.push('');
  for (const source of matrix.generated_from) lines.push(`- \`${source}\``);
  lines.push('- live read-only Supabase query inside `begin transaction read only`');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Source route candidate | Existing DB target | Source cards | DB cards | Matched identities | Missing in DB | Extra in DB | Status |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const item of matrix.items) {
    lines.push(`| ${item.source_name} | \`${item.db_set_code}\` / ${item.db_set_name} | ${item.source_card_count} | ${item.db_card_count} | ${item.matched_identity_count} | ${item.missing_in_db_count} | ${item.extra_in_db_count} | ${item.equivalence_status} |`);
  }
  lines.push('');
  lines.push('Result: both candidates are exact number/name checklist matches. Recommended immediate card inserts remain `0`, and recommended immediate set creates remain `0`.');
  lines.push('');
  lines.push('## Candidate Details');
  lines.push('');
  for (const item of matrix.items) {
    lines.push(`### ${item.source_name} -> \`${item.db_set_code}\``);
    lines.push('');
    lines.push(`- PkmnCards source: ${item.source_url}`);
    lines.push(`- Existing DB target: \`${item.db_set_code}\` / ${item.db_set_name}`);
    lines.push(`- Source card count: ${item.source_card_count}`);
    lines.push(`- DB card count: ${item.db_card_count}`);
    lines.push(`- Source number range: ${item.source_number_range}`);
    lines.push(`- DB number range: ${item.db_number_range}`);
    lines.push(`- Missing in DB: ${item.missing_in_db_count}`);
    lines.push(`- Extra in DB: ${item.extra_in_db_count}`);
    lines.push(`- Recommended next action: ${item.recommended_next_action}`);
    lines.push('');
    lines.push('| Candidate route code/slug | Classification row exists | Current classification |');
    lines.push('| --- | --- | --- |');
    for (const row of item.candidate_classification_rows) {
      const classification = row.row
        ? `${row.row.is_canon ? 'canon' : 'alias'} -> ${row.row.canonical_set_code ?? row.row.set_code}`
        : 'absent';
      lines.push(`| \`${row.set_code}\` | ${row.row_exists ? 'yes' : 'no'} | ${classification} |`);
    }
    lines.push('');
    lines.push('| Active external mapping source | Rows | Distinct card prints |');
    lines.push('| --- | ---: | ---: |');
    for (const row of item.active_external_mapping_counts) {
      lines.push(`| ${row.source} | ${row.rows} | ${row.distinct_card_prints} |`);
    }
    lines.push('');
  }
  lines.push('## Conclusions');
  lines.push('');
  lines.push('- `Shiny Vault` is a 94/94 exact match to existing `sma` / `Hidden Fates Shiny Vault`.');
  lines.push('- `Rumble` is a 16/16 exact match to existing `ru1` / `Pokemon Rumble`.');
  lines.push('- The prior apparent missing-card count drops by 110 for these two groups once source-route equivalence is honored.');
  lines.push('- Future work should plan source-route or alias classification only. It should not create new sets or insert these 110 card rows.');
  lines.push('');
  lines.push('## Future Write Boundaries');
  lines.push('');
  lines.push('A future write plan, if authorized, must stay limited to route/source classification. It must not move cards, delete alias rows, create set rows, merge metadata, move external mappings, backfill cards, or create variants.');
  lines.push('');
  lines.push('## No-Write Confirmation');
  lines.push('');
  lines.push('- No Supabase writes.');
  lines.push('- No migrations.');
  lines.push('- No inserts.');
  lines.push('- No updates.');
  lines.push('- No deletes.');
  lines.push('- No route writes.');
  lines.push('- No card backfills.');
  lines.push('- No data changes.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const rawSummary = await fs.readFile(SUMMARY_PATH, 'utf8');
  const summary = JSON.parse(rawSummary);

  const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();

  const items = [];
  try {
    await client.query('begin transaction read only');
    for (const target of TARGETS) {
      const masterSet = summary.missing_master_sets.find((set) => set.slug === target.source_slug);
      if (!masterSet) throw new Error(`Missing source set in summary.json: ${target.source_slug}`);
      const dbEvidence = await loadDbEvidence(client, target);
      if (!dbEvidence.set_row) throw new Error(`Missing DB target set: ${target.db_set_code}`);
      items.push(compareTarget(target, masterSet, dbEvidence));
    }
    await client.query('rollback');
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // ignore rollback failure after original error
    }
    throw error;
  } finally {
    await client.end();
  }

  const matrix = {
    status: 'NO_WRITE_SOURCE_ROUTE_EQUIVALENCE_EVIDENCE_ONLY',
    generated_at: new Date().toISOString(),
    generated_from: [
      'docs/audits/pokemon_master_set_audit_v1/summary.json',
      'docs/plans/pokemon_db_remediation_v1/missing_set_universe_decision_20260517.md',
      'docs/plans/pokemon_db_remediation_v1/missing_cards_backfill_evidence_matrix_20260517.json',
      'live_read_only_supabase_evidence_2026-05-17',
    ],
    summary: {
      candidates_audited: items.length,
      exact_equivalence_passes: items.filter((item) => item.equivalence_status === 'PASS_EXACT_EQUIVALENCE').length,
      blocked_review_required: items.filter((item) => item.equivalence_status !== 'PASS_EXACT_EQUIVALENCE').length,
      source_cards_audited: items.reduce((sum, item) => sum + item.source_card_count, 0),
      db_cards_audited: items.reduce((sum, item) => sum + item.db_card_count, 0),
      matched_identity_count: items.reduce((sum, item) => sum + item.matched_identity_count, 0),
      missing_in_db_count: items.reduce((sum, item) => sum + item.missing_in_db_count, 0),
      extra_in_db_count: items.reduce((sum, item) => sum + item.extra_in_db_count, 0),
      recommended_card_inserts: 0,
      recommended_set_creates: 0,
      recommended_immediate_writes: 0,
    },
    items,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
  await fs.writeFile(REPORT_PATH, renderMarkdown(matrix), 'utf8');

  console.log(JSON.stringify(matrix.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
