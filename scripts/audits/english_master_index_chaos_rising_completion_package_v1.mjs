import '../../backend/env.mjs';

import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

import {
  markdownTable,
  normalizeNumber,
  normalizeText,
  uniqueSorted,
} from './verified_master_set_index_v1/shared.mjs';
import {
  applyMe04FinishTruthV1,
  assertMe04FinishTruthV1,
  ME04_EXPECTED_PARENT_COUNT_V1,
  ME04_EXPECTED_PRINTING_COUNT_V1,
} from './me04_finish_truth_v1.mjs';

const MASTER_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const OUTPUT_DIR = 'docs/audits/verified_master_set_index_v1/chaos_rising';
const SET_KEY = 'me04';
const SET_ALIASES = ['me04', 'me4'];
const SET_NAME = 'Chaos Rising';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'chaos_rising_completion_package_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'chaos_rising_completion_package_v1.md');

function safety() {
  return {
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    mutation_authority: false,
    write_ready_now: 0,
  };
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function addCount(target, key, count = 1) {
  const normalized = String(key ?? '').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + Number(count ?? 0);
}

function cardKey(row) {
  return [
    normalizeNumber(row.card_number),
    normalizeText(row.card_name ?? row.index_card_name),
  ].join('|');
}

function printingKey(number, name, finishKey) {
  return [
    normalizeNumber(number),
    normalizeText(name),
    String(finishKey ?? '').trim(),
  ].join('|');
}

function buildIndexRows({ cardsArtifact, printingsArtifact, grookaiAudit }) {
  const cards = (cardsArtifact.cards ?? [])
    .filter((row) => row.set_key === SET_KEY)
    .sort((left, right) => normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true }));
  const rawPrintings = (printingsArtifact.printings ?? [])
    .filter((row) => row.set_key === SET_KEY);
  const { retained: governedPrintings } = applyMe04FinishTruthV1(rawPrintings);
  assertMe04FinishTruthV1(governedPrintings, 'Chaos Rising completion-package Master Index');
  const printings = governedPrintings
    .sort((left, right) => (
      normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true })
      || String(left.finish_key).localeCompare(String(right.finish_key))
    ));
  const auditRows = (grookaiAudit.rows ?? [])
    .filter((row) => row.set_key === SET_KEY);

  const cardsByKey = new Map(cards.map((row) => [cardKey(row), row]));
  return {
    cards,
    printings,
    auditRows,
    plannedParents: cards.map((row) => ({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      source_count: row.source_count,
      sources: row.sources ?? [],
      evidence_urls: row.evidence_urls ?? (row.evidence ?? []).map((entry) => entry.source_url).filter(Boolean),
    })),
    plannedPrintings: printings.map((row) => {
      const parent = cardsByKey.get(cardKey(row));
      return {
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: row.finish_key,
        source_count: row.source_count,
        sources: row.sources ?? [],
        source_kinds: row.source_kinds ?? [],
        evidence_urls: row.evidence_urls ?? (row.evidence ?? []).map((entry) => entry.source_url).filter(Boolean),
        parent_card_master_verified: parent?.status === 'master_verified',
      };
    }),
  };
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function liveDiscovery() {
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    return {
      connection_available: false,
      blocker: 'DB_CONNECTION_STRING_MISSING',
    };
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const setRows = await queryRows(
      client,
      `select id, game, code, name, release_date, printed_total, printed_set_abbrev, identity_model, source
       from public.sets
       where game = 'pokemon'
         and (
           lower(coalesce(code, '')) = any($1::text[])
           or lower(coalesce(name, '')) = lower($2)
           or source->'tcgdex'->>'id' = any($1::text[])
           or source->'pokemontcg'->>'id' = any($1::text[])
         )
       order by code nulls last, name nulls last`,
      [SET_ALIASES, SET_NAME],
    );
    const parentRows = await queryRows(
      client,
      `select id, set_id, set_code, number, number_plain, name, gv_id, print_identity_key, identity_domain, set_identity_model
       from public.card_prints
       where lower(coalesce(set_code, '')) = any($1::text[])
       order by number_plain nulls last, number nulls last, name`,
      [SET_ALIASES],
    );
    const printingRows = await queryRows(
      client,
      `select p.id, p.card_print_id, cp.set_code, cp.number, cp.number_plain, cp.name, p.finish_key, p.printing_gv_id
       from public.card_printings p
       join public.card_prints cp on cp.id = p.card_print_id
       where lower(coalesce(cp.set_code, '')) = any($1::text[])
       order by cp.number_plain nulls last, cp.number nulls last, cp.name, p.finish_key`,
      [SET_ALIASES],
    );
    const rawImports = await queryRows(
      client,
      `select payload->>'_kind' as kind, status, count(*)::int as count
       from public.raw_imports
       where source = 'tcgdex'
         and (
           payload->>'_external_id' like 'me04%'
           or payload->>'_external_id' like 'me4%'
           or payload->>'_set_external_id' = any($1::text[])
           or payload->>'set_external_id' = any($1::text[])
         )
       group by 1, 2
       order by 1, 2`,
      [SET_ALIASES],
    );
    const finishKeys = await queryRows(
      client,
      `select key, label, is_active
       from public.finish_keys
       where key = any($1::text[])
       order by key`,
      [['normal', 'holo', 'reverse']],
    );
    const gameRows = await queryRows(
      client,
      `select id, slug, name
       from public.games
       where lower(slug) = 'pokemon' or lower(name) = 'pokemon'
       order by slug
       limit 5`,
    );

    return {
      connection_available: true,
      sets: setRows,
      card_prints: parentRows,
      card_printings: printingRows,
      raw_imports: rawImports,
      finish_keys: finishKeys,
      games: gameRows,
    };
  } finally {
    await client.end().catch(() => {});
  }
}

function summarize({ indexRows, live }) {
  const byFinish = {};
  const byAuditStatus = {};
  const bySource = {};
  for (const row of indexRows.plannedPrintings) {
    addCount(byFinish, row.finish_key);
    for (const source of row.sources ?? []) addCount(bySource, source);
  }
  for (const row of indexRows.auditRows) addCount(byAuditStatus, row.status);
  return {
    set_key: SET_KEY,
    set_name: SET_NAME,
    master_index_cards: indexRows.cards.length,
    master_index_printings: indexRows.printings.length,
    master_index_printings_by_finish: byFinish,
    master_index_printing_sources: bySource,
    grookai_audit_status: byAuditStatus,
    live_set_rows: live.sets?.length ?? 0,
    live_card_print_rows: live.card_prints?.length ?? 0,
    live_card_printing_rows: live.card_printings?.length ?? 0,
    tcgdex_raw_import_rows: (live.raw_imports ?? []).reduce((total, row) => total + Number(row.count ?? 0), 0),
    required_finish_keys_present: ['normal', 'holo', 'reverse'].every((key) => (live.finish_keys ?? []).some((row) => row.key === key && row.is_active === true)),
    write_ready_now: 0,
  };
}

function exactLiveComparison({ indexRows, live }) {
  const expected = new Map();
  for (const row of indexRows.plannedPrintings) {
    expected.set(printingKey(row.card_number, row.card_name, row.finish_key), row);
  }

  const liveRows = live.card_printings ?? [];
  const actual = new Map();
  for (const row of liveRows) {
    actual.set(printingKey(row.number_plain ?? row.number, row.name, row.finish_key), row);
  }

  const missing = [];
  const verified = [];
  for (const [key, row] of expected.entries()) {
    if (actual.has(key)) verified.push(row);
    else missing.push(row);
  }

  const unsupported = [];
  for (const [key, row] of actual.entries()) {
    if (!expected.has(key)) unsupported.push(row);
  }

  return {
    verified_by_index: verified.length,
    missing_from_grookai: missing.length,
    unsupported_by_current_index: unsupported.length,
    expected_printings: expected.size,
    live_printings: actual.size,
    missing_rows: missing,
    unsupported_rows: unsupported,
  };
}

function blockers(summary, live) {
  const rows = [];
  if (!live.connection_available) rows.push({ blocker: live.blocker, severity: 'hard', required_resolution: 'Provide read-only DB connection before any dry-run package can be verified.' });
  if (summary.live_set_rows === 0) rows.push({ blocker: 'target_set_missing_from_grookai', severity: 'hard', required_resolution: 'Standard ingestion must create the set before card_print parents can be inserted.' });
  if (summary.live_card_print_rows === 0) rows.push({ blocker: 'target_parent_card_prints_missing_from_grookai', severity: 'hard', required_resolution: 'Standard ingestion must create 122 parent card_print rows before child printings can exist.' });
  if (summary.tcgdex_raw_import_rows === 0) rows.push({ blocker: 'tcgdex_raw_imports_missing', severity: 'hard', required_resolution: 'Run TCGdex import for set me04/me4 before normalize/apply.' });
  if (!summary.required_finish_keys_present) rows.push({ blocker: 'required_finish_keys_missing_or_inactive', severity: 'hard', required_resolution: 'Finish keys normal, holo, and reverse must exist and be active before child printing insertions.' });
  return rows;
}

function buildReport({ indexRows, live }) {
  const generatedAt = new Date().toISOString();
  const summary = summarize({ indexRows, live });
  const comparison = exactLiveComparison({ indexRows, live });
  const blockerRows = blockers(summary, live);
  const masterIndexComplete = (
    summary.master_index_cards === ME04_EXPECTED_PARENT_COUNT_V1
    && summary.master_index_printings === ME04_EXPECTED_PRINTING_COUNT_V1
  );
  const liveMatchesMasterIndex = (
    summary.live_set_rows === 1
    && summary.live_card_print_rows === summary.master_index_cards
    && summary.live_card_printing_rows === summary.master_index_printings
    && comparison.verified_by_index === summary.master_index_printings
    && comparison.missing_from_grookai === 0
    && comparison.unsupported_by_current_index === 0
  );
  return {
    version: 'CHAOS_RISING_COMPLETION_PACKAGE_V1',
    generated_at: generatedAt,
    ...safety(),
    conclusion: {
      master_index_complete: masterIndexComplete,
      grookai_complete: liveMatchesMasterIndex,
      live_matches_master_index: liveMatchesMasterIndex,
      ready_for_write_package: !liveMatchesMasterIndex,
      reason: liveMatchesMasterIndex
        ? 'Chaos Rising live Grookai rows match the Verified Master Index counts for this set.'
        : 'Chaos Rising is master-verified in the index, but Grookai live rows do not yet match this set.',
    },
    summary,
    live_master_index_comparison: comparison,
    standard_ingestion_path: {
      intended_source: 'tcgdex',
      set_aliases: SET_ALIASES,
      required_order: [
        'TCGdex set import for me04/me4',
        'TCGdex card import for me04/me4 with detail payloads',
        'TCGdex normalize dry-run scoped to imported raw rows',
        'Strict preflight and operator approval',
        'Standard ingestion apply through maintenance boundary',
        `Post-apply Master Index comparison for me04 must reach ${ME04_EXPECTED_PRINTING_COUNT_V1}/${ME04_EXPECTED_PRINTING_COUNT_V1} verified_by_index`,
      ],
      no_bespoke_writer_recommended: true,
    },
    blockers: blockerRows,
    live_discovery: live,
    planned_master_index_payload: {
      parent_cards: indexRows.plannedParents,
      printings: indexRows.plannedPrintings,
    },
    post_apply_verification_requirements: [
      `Grookai comparison for me04 has ${ME04_EXPECTED_PRINTING_COUNT_V1} verified_by_index rows.`,
      'Grookai comparison for me04 has 0 missing_from_grookai rows.',
      'Grookai comparison for me04 has 0 unsupported_by_current_index rows.',
      'Grookai comparison for me04 has 0 name_mismatch_needs_review rows.',
      `card_prints for set_code me04 or me4 resolve to ${ME04_EXPECTED_PARENT_COUNT_V1} parent rows.`,
      `card_printings joined through those parent rows resolve to ${ME04_EXPECTED_PRINTING_COUNT_V1} child printing rows.`,
    ],
  };
}

function buildMarkdown(report) {
  const finishRows = Object.entries(report.summary.master_index_printings_by_finish ?? {}).map(([finish, count]) => [finish, count]);
  const sourceRows = Object.entries(report.summary.master_index_printing_sources ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .map(([source, count]) => [source, count]);
  const blockerRows = report.blockers.map((row) => [row.blocker, row.severity, row.required_resolution]);
  const samplePrintings = report.planned_master_index_payload.printings.slice(0, 30).map((row) => [
    row.card_number,
    row.card_name,
    row.finish_key,
    row.source_count,
    (row.sources ?? []).join(', '),
  ]);
  return [
    '# Chaos Rising Completion Package V1',
    '',
    'Audit only. This package does not write to Grookai, create migrations, cleanup, quarantine, or execute an apply path.',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Conclusion',
    '',
    markdownTable(['field', 'value'], Object.entries(report.conclusion)),
    '',
    '## Safety',
    '',
    markdownTable(['field', 'value'], Object.entries(safety())),
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], Object.entries(report.summary).map(([key, value]) => [
      key,
      Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : value,
    ])),
    '',
    '## Live Master Index Comparison',
    '',
    markdownTable(
      ['metric', 'value'],
      Object.entries(report.live_master_index_comparison)
        .filter(([key]) => !['missing_rows', 'unsupported_rows'].includes(key))
        .map(([key, value]) => [
          key,
          Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : value,
        ]),
    ),
    '',
    '## Master Index Printings By Finish',
    '',
    markdownTable(['finish', 'count'], finishRows),
    '',
    '## Master Index Source Counts',
    '',
    markdownTable(['source', 'count'], sourceRows),
    '',
    '## Blockers Before Any Write',
    '',
    blockerRows.length ? markdownTable(['blocker', 'severity', 'required_resolution'], blockerRows) : 'No blockers.',
    '',
    '## Standard Ingestion Path',
    '',
    report.standard_ingestion_path.required_order.map((step, index) => `${index + 1}. ${step}`).join('\n'),
    '',
    '## Sample Planned Printings',
    '',
    markdownTable(['number', 'name', 'finish', 'source_count', 'sources'], samplePrintings),
    '',
    '## Post-Apply Verification Requirements',
    '',
    report.post_apply_verification_requirements.map((item) => `- ${item}`).join('\n'),
    '',
  ].join('\n');
}

async function main() {
  const [cardsArtifact, printingsArtifact, grookaiAudit] = await Promise.all([
    readJson(path.join(MASTER_DIR, 'english_master_index_cards_v1.json')),
    readJson(path.join(MASTER_DIR, 'english_master_index_printings_v1.json')),
    readJson(path.join(MASTER_DIR, 'english_master_index_grookai_audit_v1.json')),
  ]);
  const indexRows = buildIndexRows({ cardsArtifact, printingsArtifact, grookaiAudit });
  const live = await liveDiscovery();
  const report = buildReport({ indexRows, live });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    summary: report.summary,
    blockers: report.blockers.map((row) => row.blocker),
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[chaos-rising-completion] failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
