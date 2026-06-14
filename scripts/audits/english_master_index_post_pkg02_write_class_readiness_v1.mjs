import fs from 'node:fs/promises';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;

const OUTPUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'english_master_index_post_pkg02_write_class_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'english_master_index_post_pkg02_write_class_readiness_v1.md');

function addCount(target, key, count = 1) {
  const normalized = String(key ?? '').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + Number(count ?? 0);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))]
    .sort((left, right) => left.localeCompare(right));
}

function topEntries(object, limit = 30) {
  return Object.entries(object ?? {})
    .sort((left, right) => Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

async function readJson(fileName) {
  return JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, fileName), 'utf8'));
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeMarkdown(filePath, data) {
  await fs.writeFile(filePath, data);
}

function aliasValuesForSet(set) {
  return uniqueSorted([
    set.key,
    set.set_name,
    ...(set.manual_aliases ?? []),
    set.source_aliases?.pokemontcg_api,
    set.source_aliases?.tcgdex,
    set.source_aliases?.official_checklist_pdf,
    set.source_aliases?.official_pokemon_checklist,
    set.source_aliases?.thepricedex,
    set.source_aliases?.thepricedex_price_list,
    set.source_aliases?.pkmncards,
    set.source_aliases?.bulbapedia,
    set.source_aliases?.bulbapedia_set_list,
  ].map(normalizeText));
}

function makeAliasMap(sets) {
  const map = new Map();
  for (const set of sets) {
    for (const alias of aliasValuesForSet(set)) {
      if (alias) map.set(alias, set.key);
    }
  }
  return map;
}

function exactKey({ setKey, number, name, finishKey }) {
  return [
    normalizeText(setKey),
    normalizeNumber(number),
    normalizeText(name),
    normalizeFinishKey(finishKey),
  ].join('|');
}

function setNumberFinishKey({ setKey, number, finishKey }) {
  return [
    normalizeText(setKey),
    normalizeNumber(number),
    normalizeFinishKey(finishKey),
  ].join('|');
}

function buildIndexLookups({ sets, printings, finishAbsences }) {
  const aliasesBySetKey = new Map(sets.map((set) => [set.key, aliasValuesForSet(set)]));
  const byExact = new Map();
  const bySetNumberFinish = new Map();
  const absenceByExact = new Map();
  const canonicalExactKeys = new Set();

  for (const row of printings) {
    canonicalExactKeys.add(exactKey({
      setKey: row.set_key,
      number: row.card_number,
      name: row.card_name,
      finishKey: row.finish_key,
    }));
    for (const alias of aliasesBySetKey.get(row.set_key) ?? [normalizeText(row.set_key)]) {
      const exact = exactKey({ setKey: alias, number: row.card_number, name: row.card_name, finishKey: row.finish_key });
      const loose = setNumberFinishKey({ setKey: alias, number: row.card_number, finishKey: row.finish_key });
      byExact.set(exact, row);
      if (!bySetNumberFinish.has(loose)) bySetNumberFinish.set(loose, []);
      bySetNumberFinish.get(loose).push(row);
    }
  }

  for (const row of finishAbsences) {
    for (const alias of aliasesBySetKey.get(row.set_key) ?? [normalizeText(row.set_key)]) {
      absenceByExact.set(
        exactKey({ setKey: alias, number: row.card_number, name: row.card_name, finishKey: row.finish_key }),
        row,
      );
    }
  }

  return { byExact, bySetNumberFinish, absenceByExact, canonicalExactKeys };
}

function mapIndexStatusToLiveStatus(status) {
  if (status === 'master_verified') return 'master_verified_by_index';
  if (status === 'api_agreed') return 'api_agreed_by_index';
  if (status === 'human_source_verified') return 'human_source_verified_by_index';
  if (status === 'candidate_unconfirmed') return 'candidate_unconfirmed_by_index';
  return 'needs_manual_review';
}

async function readLivePrintings() {
  const conn = connectionString();
  if (!conn) {
    return {
      available: false,
      reason: 'SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL not available in environment.',
      rows: [],
    };
  }
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    await client.query('begin read only');
    await client.query('set transaction read only');
    const result = await client.query(
      `select
         cp.id::text as card_print_id,
         cp.set_code,
         cp.number,
         cp.number_plain,
         cp.name as card_name,
         cp.printed_identity_modifier,
         cpr.id::text as card_printing_id,
         cpr.finish_key
       from public.card_printings cpr
       join public.card_prints cp on cp.id = cpr.card_print_id`,
    );
    await client.query('rollback');
    return { available: true, reason: null, rows: result.rows };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    return { available: false, reason: `Read-only live printing read failed: ${error.message}`, rows: [] };
  } finally {
    await client.end().catch(() => {});
  }
}

function classifyLiveRows({ liveRows, aliasMap, indexLookups }) {
  const rows = [];
  const grookaiCanonicalFacts = new Set();

  for (const row of liveRows) {
    const rawSetCode = normalizeText(row.set_code);
    const setKey = aliasMap.get(rawSetCode);
    const number = row.number;
    const finishKey = normalizeFinishKey(row.finish_key);
    if (!setKey) {
      rows.push({
        status: 'set_unmapped',
        set_code: row.set_code,
        card_number: number,
        grookai_card_name: row.card_name,
        finish_key: finishKey,
        grookai_card_print_id: row.card_print_id,
        grookai_printing_id: row.card_printing_id,
        note: 'Live set_code is not mapped to the English Master Index.',
      });
      continue;
    }

    const exact = exactKey({ setKey, number, name: row.card_name, finishKey });
    grookaiCanonicalFacts.add(exact);
    const indexRow = indexLookups.byExact.get(exact);
    if (indexRow) {
      rows.push({
        status: mapIndexStatusToLiveStatus(indexRow.status),
        set_key: setKey,
        set_code: row.set_code,
        card_number: number,
        grookai_card_name: row.card_name,
        index_card_name: indexRow.card_name,
        finish_key: finishKey,
        index_status: indexRow.status,
        grookai_card_print_id: row.card_print_id,
        grookai_printing_id: row.card_printing_id,
        note: 'Exact live printing matches the current Master Index.',
      });
      continue;
    }

    const absenceRow = indexLookups.absenceByExact.get(exact);
    if (absenceRow) {
      rows.push({
        status: 'unsupported_source_backed_absence_candidate',
        set_key: setKey,
        set_code: row.set_code,
        card_number: number,
        grookai_card_name: row.card_name,
        index_card_name: absenceRow.card_name,
        finish_key: finishKey,
        absence_sources: absenceRow.sources,
        absence_evidence_urls: absenceRow.evidence_urls,
        grookai_card_print_id: row.card_print_id,
        grookai_printing_id: row.card_printing_id,
        note: 'The Master Index has explicit source-backed absence evidence for this exact finish.',
      });
      continue;
    }

    const looseMatches = indexLookups.bySetNumberFinish.get(setNumberFinishKey({ setKey, number, finishKey })) ?? [];
    if (looseMatches.length) {
      rows.push({
        status: 'name_mismatch_needs_review',
        set_key: setKey,
        set_code: row.set_code,
        card_number: number,
        grookai_card_name: row.card_name,
        index_card_name: uniqueSorted(looseMatches.map((item) => item.card_name)).join('; '),
        finish_key: finishKey,
        grookai_card_print_id: row.card_print_id,
        grookai_printing_id: row.card_printing_id,
        note: 'Set, number, and finish match the index, but name does not match exactly.',
      });
      continue;
    }

    rows.push({
      status: 'unsupported_by_current_index',
      set_key: setKey,
      set_code: row.set_code,
      card_number: number,
      grookai_card_name: row.card_name,
      finish_key: finishKey,
      grookai_card_print_id: row.card_print_id,
      grookai_printing_id: row.card_printing_id,
      note: 'No exact printing fact exists in the current Master Index. This is not deletion authority.',
    });
  }

  return { rows, grookaiCanonicalFacts };
}

function buildMissingRows({ printings, grookaiCanonicalFacts }) {
  return printings
    .filter((row) => row.status === 'master_verified')
    .filter((row) => !grookaiCanonicalFacts.has(exactKey({
      setKey: row.set_key,
      number: row.card_number,
      name: row.card_name,
      finishKey: row.finish_key,
    })))
    .map((row) => ({
      status: 'missing_master_verified_from_grookai',
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      source_count: row.source_count,
      sources: row.sources,
      evidence_urls: row.evidence_urls,
      note: 'Master Index has this master_verified printing, but no exact live Grookai printing matched it.',
    }));
}

function summarizeRows(rows) {
  const byStatus = {};
  const byStatusAndSet = {};
  const byStatusAndFinish = {};
  for (const row of rows) {
    addCount(byStatus, row.status);
    addCount(byStatusAndSet, `${row.status}|${row.set_key ?? row.set_code ?? 'unknown'}`);
    addCount(byStatusAndFinish, `${row.status}|${row.finish_key ?? ''}`);
  }
  return { byStatus, byStatusAndSet, byStatusAndFinish };
}

function buildClassReadiness({ liveClassifiedRows, missingRows, live }) {
  const liveSummary = summarizeRows(liveClassifiedRows);
  const missingSummary = summarizeRows(missingRows);
  const absenceCandidates = liveClassifiedRows.filter((row) => row.status === 'unsupported_source_backed_absence_candidate');
  const unsupportedBroad = liveClassifiedRows.filter((row) => row.status === 'unsupported_by_current_index');
  const nameMismatches = liveClassifiedRows.filter((row) => row.status === 'name_mismatch_needs_review');
  const setUnmapped = liveClassifiedRows.filter((row) => row.status === 'set_unmapped');

  const chaosMissing = missingRows.filter((row) => row.set_key === 'me04' || normalizeText(row.set_name).includes('chaos rising'));
  const fullSetMissing = topEntries(missingSummary.byStatusAndSet, 50)
    .filter(([key]) => key.startsWith('missing_master_verified_from_grookai|'))
    .map(([key, count]) => ({ set_key: key.split('|')[1], missing_printings: count }));

  const ranked = [
    {
      package_id: 'PKG-03A',
      class_name: 'Source-backed absence cleanup pilot',
      readiness: absenceCandidates.length ? 'pilot_candidate_requires_guarded_dry_run' : 'no_current_exact_absence_candidates',
      candidate_rows: absenceCandidates.length,
      reason: absenceCandidates.length
        ? 'Exact live Grookai rows conflict with explicit finish_absence facts.'
        : 'No live rows currently match explicit finish_absence facts.',
      write_allowed_now: false,
    },
    {
      package_id: 'PKG-04A',
      class_name: 'Missing master-verified insertion pilot',
      readiness: missingRows.length ? 'planning_candidate_requires_parent_child_insert_design' : 'no_missing_master_verified_rows',
      candidate_rows: missingRows.length,
      reason: chaosMissing.length
        ? 'Chaos Rising has master-verified printings missing from Grookai and may be a bounded insertion pilot after standard ingestion design.'
        : 'Missing master-verified rows exist, but insertion requires duplicate identity, parent/child, rollback, and provenance design.',
      write_allowed_now: false,
    },
    {
      package_id: 'PKG-05A',
      class_name: 'Name mismatch governance',
      readiness: nameMismatches.length ? 'manual_governance_candidate' : 'no_name_mismatch_rows',
      candidate_rows: nameMismatches.length,
      reason: 'Name mismatch is not identity mutation authority; it needs alias/display-name adjudication.',
      write_allowed_now: false,
    },
    {
      package_id: 'PKG-06A',
      class_name: 'Unmapped set scope/provenance',
      readiness: setUnmapped.length ? 'scope_and_provenance_required' : 'no_unmapped_rows',
      candidate_rows: setUnmapped.length,
      reason: 'Unmapped rows require product scope or set-code provenance decisions before mutation.',
      write_allowed_now: false,
    },
    {
      package_id: 'PKG-03B',
      class_name: 'Broad unsupported cleanup',
      readiness: unsupportedBroad.length ? 'blocked_not_deletion_authority' : 'no_broad_unsupported_rows',
      candidate_rows: unsupportedBroad.length,
      reason: 'Unsupported by current index is not deletion authority without exact source-backed absence or set-level proof loop.',
      write_allowed_now: false,
    },
  ];

  return {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_post_pkg02_write_class_readiness_v1',
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_paths_executed: false,
    report_status: live.available ? 'post_pkg02_write_class_readiness_ready_no_write' : 'blocked_live_db_read_unavailable',
    rule: 'This report selects the next write-planning class only. It does not authorize writes.',
    live_snapshot: {
      available: live.available,
      reason: live.reason,
      live_printing_rows: live.rows.length,
    },
    summary: {
      live_printing_rows: live.rows.length,
      live_by_status: liveSummary.byStatus,
      missing_master_verified_from_grookai: missingRows.length,
      missing_by_set_top: fullSetMissing.slice(0, 30),
      unsupported_source_backed_absence_candidates: absenceCandidates.length,
      broad_unsupported_rows: unsupportedBroad.length,
      name_mismatch_rows: nameMismatches.length,
      set_unmapped_rows: setUnmapped.length,
      chaos_rising_missing_printings: chaosMissing.length,
      write_ready_now: 0,
    },
    ranked_write_planning_classes: ranked,
    samples: {
      unsupported_source_backed_absence_candidates: absenceCandidates.slice(0, 50),
      missing_master_verified_from_grookai: missingRows.slice(0, 50),
      chaos_rising_missing: chaosMissing.slice(0, 50),
      name_mismatches: nameMismatches.slice(0, 50),
      set_unmapped: setUnmapped.slice(0, 50),
      broad_unsupported: unsupportedBroad.slice(0, 50),
    },
    stop_rules: [
      'Do not delete rows based on unsupported_by_current_index.',
      'Do not insert missing rows without parent/child/provenance/rollback design.',
      'Do not mutate names without alias governance.',
      'Do not apply anything from this report directly.',
    ],
  };
}

function buildMarkdown(report) {
  const statusRows = Object.entries(report.summary.live_by_status).map(([status, count]) => [status, count]);
  const classRows = report.ranked_write_planning_classes.map((row) => [
    row.package_id,
    row.class_name,
    row.readiness,
    row.candidate_rows,
    row.reason,
  ]);
  const missingSetRows = report.summary.missing_by_set_top.map((row) => [row.set_key, row.missing_printings]);
  const absenceRows = report.samples.unsupported_source_backed_absence_candidates.map((row) => [
    row.set_key,
    row.card_number,
    row.grookai_card_name,
    row.finish_key,
    row.grookai_printing_id,
  ]);

  return `# Post-PKG-02 Write Class Readiness V1

This is a read-only post-apply control report. It selects the next planning class but does not authorize DB writes.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- quarantine_performed: ${report.quarantine_performed}
- apply_paths_executed: ${report.apply_paths_executed}
- write_ready_now: ${report.summary.write_ready_now}

## Summary

- report_status: ${report.report_status}
- live_printing_rows: ${report.summary.live_printing_rows}
- missing_master_verified_from_grookai: ${report.summary.missing_master_verified_from_grookai}
- unsupported_source_backed_absence_candidates: ${report.summary.unsupported_source_backed_absence_candidates}
- broad_unsupported_rows: ${report.summary.broad_unsupported_rows}
- name_mismatch_rows: ${report.summary.name_mismatch_rows}
- set_unmapped_rows: ${report.summary.set_unmapped_rows}
- chaos_rising_missing_printings: ${report.summary.chaos_rising_missing_printings}

## Live Status Counts

${markdownTable(['status', 'rows'], statusRows)}

## Ranked Write-Planning Classes

${markdownTable(['package', 'class', 'readiness', 'candidate_rows', 'reason'], classRows)}

## Top Missing Sets

${markdownTable(['set_key', 'missing_printings'], missingSetRows)}

## Source-Backed Absence Candidate Sample

${markdownTable(['set', 'number', 'card', 'finish', 'printing_id'], absenceRows)}

## Stop Rules

${report.stop_rules.map((item) => `- ${item}`).join('\n')}
`;
}

async function main() {
  const setsArtifact = await readJson('english_master_index_sets_v1.json');
  const printingsArtifact = await readJson('english_master_index_printings_v1.json');
  const live = await readLivePrintings();
  const sets = setsArtifact.sets ?? [];
  const printings = printingsArtifact.printings ?? [];
  const finishAbsences = printingsArtifact.finish_absences ?? [];
  const aliasMap = makeAliasMap(sets);
  const indexLookups = buildIndexLookups({ sets, printings, finishAbsences });
  const { rows: liveClassifiedRows, grookaiCanonicalFacts } = classifyLiveRows({
    liveRows: live.rows,
    aliasMap,
    indexLookups,
  });
  const missingRows = buildMissingRows({ printings, grookaiCanonicalFacts });
  const report = buildClassReadiness({ liveClassifiedRows, missingRows, live });
  await writeJson(OUTPUT_JSON, report);
  await writeMarkdown(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    generated_files: [
      path.relative(process.cwd(), OUTPUT_JSON).replaceAll('\\', '/'),
      path.relative(process.cwd(), OUTPUT_MD).replaceAll('\\', '/'),
    ],
    report_status: report.report_status,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
