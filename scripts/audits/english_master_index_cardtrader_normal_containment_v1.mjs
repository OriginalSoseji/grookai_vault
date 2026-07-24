import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { isMe04PhantomNormalV1 } from './me04_finish_truth_v1.mjs';
import {
  markdownTable,
  normalizeFinishKey,
  normalizeNumber,
  normalizeText,
  uniqueSorted,
} from './verified_master_set_index_v1/shared.mjs';
import {
  isUnqualifiedCardTraderNormalFixtureV1,
} from './verified_master_set_index_v1/source_adapters/human_fixtures.mjs';

const DEFAULT_FIXTURE_DIR = 'docs/audits/verified_master_set_index_v1/source_fixtures/generated_cardtrader_v1';
const DEFAULT_MASTER_PRINTINGS = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_printings_v1.json';
const DEFAULT_ALIAS_REPORT = 'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_set_alias_normalization_v1.json';
const DEFAULT_OUTPUT_DIR = 'docs/audits/verified_master_set_index_v1/cardtrader_normal_containment_v1';
const REPORT_JSON = 'cardtrader_normal_containment_v1.json';
const REPORT_MARKDOWN = 'cardtrader_normal_containment_v1.md';
const CLASSIFIER_PATH = 'scripts/audits/verified_master_set_index_v1/source_adapters/human_fixtures.mjs';

const STRUCTURED_SOURCE_KEYS = new Set([
  'pokemontcg_api',
  'tcgdex',
]);

function parseArgs(argv) {
  const options = {
    fixtureDir: DEFAULT_FIXTURE_DIR,
    masterPrintingsPath: DEFAULT_MASTER_PRINTINGS,
    aliasReportPath: DEFAULT_ALIAS_REPORT,
    outputDir: DEFAULT_OUTPUT_DIR,
    generatedAt: null,
    dryRun: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--fixture-dir') {
      options.fixtureDir = next;
      index += 1;
    } else if (arg === '--master-printings') {
      options.masterPrintingsPath = next;
      index += 1;
    } else if (arg === '--alias-report') {
      options.aliasReportPath = next;
      index += 1;
    } else if (arg === '--output-dir') {
      options.outputDir = next;
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = next;
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function slashPath(value) {
  return String(value).replace(/\\/g, '/');
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function listJsonFilesRecursive(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listJsonFilesRecursive(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function fileFingerprint(file) {
  return sha256(await fs.readFile(file));
}

function addCount(target, key, amount = 1) {
  const normalized = String(key ?? 'unknown').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + amount;
}

function sortedCounts(counts) {
  return Object.fromEntries(
    Object.entries(counts).sort((left, right) => (
      Number(right[1]) - Number(left[1]) || left[0].localeCompare(right[0])
    )),
  );
}

function literalSetKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function buildCanonicalSetAliasMapV1(aliasReport) {
  return new Map((aliasReport?.remaps ?? []).map((row) => [
    normalizeText(row.from_set_key),
    literalSetKey(row.to_set_key),
  ]));
}

export function canonicalSetKeyV1(value, aliasMap) {
  const raw = literalSetKey(value);
  return aliasMap.get(normalizeText(raw)) ?? raw;
}

export function cardTraderNormalFactKeyV1(row, aliasMap = new Map()) {
  return [
    normalizeText(canonicalSetKeyV1(row.set_key, aliasMap)),
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    'normal',
  ].join('|');
}

function isCardTraderSourceKey(value) {
  const key = String(value ?? '').trim();
  return key === 'cardtrader_blueprint_index' || key.startsWith('cardtrader_finish_');
}

function isCardTraderAuthority(value) {
  return /(^|\.)cardtrader\.com$/i.test(String(value ?? '').trim());
}

function projectedStatusAfterDowngrade(row, confirmedFalse) {
  if (confirmedFalse) return 'suppressed_reviewed';
  if (!row) return 'not_in_current_master_index';

  const sources = (row.sources ?? []).filter((source) => !isCardTraderSourceKey(source));
  const authorities = (row.source_authorities ?? []).filter((authority) => !isCardTraderAuthority(authority));
  if (sources.length === 0 || authorities.length === 0) return 'no_qualified_finish_evidence';

  const includesHumanOrChecklist = sources.some((source) => !STRUCTURED_SOURCE_KEYS.has(source));
  if (includesHumanOrChecklist) {
    return authorities.length >= 2 ? 'master_verified' : 'human_source_verified';
  }
  return authorities.length >= 2 ? 'api_agreed' : 'candidate_unconfirmed';
}

function dispositionForProjectedStatus(status) {
  const dispositions = {
    suppressed_reviewed: 'confirmed_false_suppression',
    no_qualified_finish_evidence: 'independent_verification_required',
    candidate_unconfirmed: 'human_checklist_reverification_required',
    api_agreed: 'human_checklist_required',
    human_source_verified: 'second_authority_required',
    master_verified: 'rebuild_review_required',
    not_in_current_master_index: 'source_ledger_review_required',
  };
  return dispositions[status] ?? 'manual_review_required';
}

function compactOccurrence(row) {
  return {
    fixture_file: row.fixture_file,
    record_index: row.record_index,
    raw_set_key: row.raw_set_key,
    source_key: row.source_key,
    source_url: row.source_url,
    evidence_label: row.evidence_label,
    raw_snapshot_ref: row.raw_snapshot_ref,
  };
}

function combinedFixtureFingerprint(fileReports) {
  return sha256(fileReports.map((row) => `${row.path}\0${row.sha256}`).join('\n'));
}

export function buildCardTraderNormalContainmentV1({
  fixtures,
  fixtureFiles,
  masterPrintings,
  aliasReport,
  generatedAt,
  inputs,
}) {
  const aliasMap = buildCanonicalSetAliasMapV1(aliasReport);
  const allRecords = [];
  const finishCounts = {};

  for (const fixtureEntry of fixtures) {
    const fixture = fixtureEntry.payload;
    for (const [recordIndex, record] of (fixture.records ?? []).entries()) {
      const finishKey = normalizeFinishKey(record.finish_key) ?? 'unknown';
      addCount(finishCounts, finishKey);
      const rawSetKey = literalSetKey(record.set_key ?? fixture.set_key);
      allRecords.push({
        fixture,
        record,
        fixture_file: fixtureEntry.path,
        record_index: recordIndex,
        raw_set_key: rawSetKey,
        canonical_set_key: canonicalSetKeyV1(rawSetKey, aliasMap),
        source_key: record.source_key ?? fixture.source_key,
        source_url: record.source_url ?? fixture.source_url,
        evidence_label: record.evidence_text_or_label ?? record.evidence_label ?? null,
        raw_snapshot_ref: record.raw_snapshot_ref ?? fixture.raw_snapshot_ref ?? null,
        finish_key: finishKey,
        unqualified_normal: isUnqualifiedCardTraderNormalFixtureV1(record, fixture),
      });
    }
  }

  const rawNormalRecords = allRecords.filter((row) => row.finish_key === 'normal');
  const unqualifiedNormalRecords = rawNormalRecords.filter((row) => row.unqualified_normal);
  const explicitNormalRecords = rawNormalRecords.filter((row) => !row.unqualified_normal);
  const factsByKey = new Map();

  for (const row of unqualifiedNormalRecords) {
    const factRow = {
      set_key: row.canonical_set_key,
      card_number: row.record.card_number,
      card_name: row.record.card_name,
    };
    const key = cardTraderNormalFactKeyV1(factRow);
    if (!factsByKey.has(key)) factsByKey.set(key, []);
    factsByKey.get(key).push(row);
  }

  const masterByKey = new Map((masterPrintings?.printings ?? [])
    .filter((row) => normalizeFinishKey(row.finish_key) === 'normal')
    .map((row) => [cardTraderNormalFactKeyV1(row, aliasMap), row]));

  const facts = [...factsByKey.entries()].map(([key, occurrences]) => {
    const first = occurrences[0];
    const master = masterByKey.get(key) ?? null;
    const fact = {
      set_key: first.canonical_set_key,
      set_name: master?.set_name ?? first.record.set_name ?? first.fixture.set_name ?? null,
      card_number: master?.card_number ?? first.record.card_number,
      card_name: master?.card_name ?? first.record.card_name,
      finish_key: 'normal',
    };
    const confirmedFalse = isMe04PhantomNormalV1(fact);
    const projectedStatus = projectedStatusAfterDowngrade(master, confirmedFalse);
    const remainingSources = (master?.sources ?? []).filter((source) => !isCardTraderSourceKey(source));
    const remainingAuthorities = (master?.source_authorities ?? [])
      .filter((authority) => !isCardTraderAuthority(authority));

    return {
      fact_key: key,
      ...fact,
      raw_set_keys: uniqueSorted(occurrences.map((row) => row.raw_set_key)),
      fixture_occurrence_count: occurrences.length,
      alias_duplicate_occurrence_count: occurrences.length - 1,
      fixture_occurrences: occurrences.map(compactOccurrence),
      source_finish_classification: {
        raw_finish_key: 'normal',
        explicit_normal_or_non_holo_descriptor: false,
        post_loader_finish_key: null,
        post_loader_evidence_type: 'finish_unknown_unqualified_provider',
        rule: 'Absence of a CardTrader finish token is not Normal finish evidence.',
      },
      current_master_index: master ? {
        matched: true,
        status: master.status,
        source_count: master.source_count,
        sources: master.sources ?? [],
        source_authorities: master.source_authorities ?? [],
        source_kinds: master.source_kinds ?? [],
        evidence_urls: master.evidence_urls ?? [],
      } : {
        matched: false,
        status: null,
        source_count: 0,
        sources: [],
        source_authorities: [],
        source_kinds: [],
        evidence_urls: [],
      },
      containment: {
        confirmed_false_normal: confirmedFalse,
        remaining_qualified_sources: remainingSources,
        remaining_qualified_authorities: remainingAuthorities,
        projected_status_after_rebuild: projectedStatus,
        disposition: dispositionForProjectedStatus(projectedStatus),
        automatic_delete_authorized: false,
        production_write_authorized: false,
      },
    };
  }).sort((left, right) => (
    left.set_key.localeCompare(right.set_key)
    || normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true })
    || normalizeText(left.card_name).localeCompare(normalizeText(right.card_name))
  ));

  const currentStatusCounts = {};
  const projectedStatusCounts = {};
  const dispositionCounts = {};
  const sourceCombinationCounts = {};
  for (const fact of facts) {
    addCount(currentStatusCounts, fact.current_master_index.status ?? 'not_matched');
    addCount(projectedStatusCounts, fact.containment.projected_status_after_rebuild);
    addCount(dispositionCounts, fact.containment.disposition);
    addCount(
      sourceCombinationCounts,
      fact.current_master_index.sources.length
        ? fact.current_master_index.sources.join(' + ')
        : 'not_matched',
    );
  }

  const setsByKey = new Map();
  for (const fact of facts) {
    if (!setsByKey.has(fact.set_key)) {
      setsByKey.set(fact.set_key, {
        set_key: fact.set_key,
        set_name: fact.set_name,
        contaminated_normal_facts: 0,
        fixture_occurrences: 0,
        alias_duplicate_occurrences: 0,
        current_master_matches: 0,
        confirmed_false_normals: 0,
        projected_candidate_unconfirmed: 0,
        projected_human_source_verified: 0,
        projected_no_qualified_finish_evidence: 0,
      });
    }
    const row = setsByKey.get(fact.set_key);
    row.contaminated_normal_facts += 1;
    row.fixture_occurrences += fact.fixture_occurrence_count;
    row.alias_duplicate_occurrences += fact.alias_duplicate_occurrence_count;
    if (fact.current_master_index.matched) row.current_master_matches += 1;
    if (fact.containment.confirmed_false_normal) row.confirmed_false_normals += 1;
    if (fact.containment.projected_status_after_rebuild === 'candidate_unconfirmed') {
      row.projected_candidate_unconfirmed += 1;
    }
    if (fact.containment.projected_status_after_rebuild === 'human_source_verified') {
      row.projected_human_source_verified += 1;
    }
    if (fact.containment.projected_status_after_rebuild === 'no_qualified_finish_evidence') {
      row.projected_no_qualified_finish_evidence += 1;
    }
  }
  const sets = [...setsByKey.values()].sort((left, right) => (
    right.contaminated_normal_facts - left.contaminated_normal_facts
    || left.set_key.localeCompare(right.set_key)
  ));

  const summary = {
    fixture_files_scanned: fixtureFiles.length,
    fixture_records_scanned: allRecords.length,
    fixture_records_by_finish: sortedCounts(finishCounts),
    raw_normal_records: rawNormalRecords.length,
    explicit_normal_or_non_holo_records: explicitNormalRecords.length,
    unqualified_inferred_normal_records: unqualifiedNormalRecords.length,
    canonical_contaminated_normal_facts: facts.length,
    canonical_sets_affected: sets.length,
    alias_duplicate_occurrences_collapsed: unqualifiedNormalRecords.length - facts.length,
    current_master_index_matches: facts.filter((row) => row.current_master_index.matched).length,
    current_master_facts_with_cardtrader_source: facts.filter((row) => (
      row.current_master_index.sources.some(isCardTraderSourceKey)
    )).length,
    current_master_statuses: sortedCounts(currentStatusCounts),
    current_master_source_combinations: sortedCounts(sourceCombinationCounts),
    projected_statuses_after_rebuild: sortedCounts(projectedStatusCounts),
    dispositions: sortedCounts(dispositionCounts),
    confirmed_false_me04_normals: facts.filter((row) => row.containment.confirmed_false_normal).length,
  };

  const invariantChecks = [
    {
      check: 'normal_records_are_partitioned',
      expected: summary.raw_normal_records,
      actual: summary.explicit_normal_or_non_holo_records + summary.unqualified_inferred_normal_records,
    },
    {
      check: 'canonicalization_only_collapses_alias_occurrences',
      expected: summary.unqualified_inferred_normal_records,
      actual: summary.canonical_contaminated_normal_facts + summary.alias_duplicate_occurrences_collapsed,
    },
    {
      check: 'every_unqualified_normal_is_fail_closed_by_loader',
      expected: summary.canonical_contaminated_normal_facts,
      actual: facts.filter((row) => row.source_finish_classification.post_loader_finish_key === null).length,
    },
    {
      check: 'every_contaminated_fact_is_located_in_current_master_index',
      expected: summary.canonical_contaminated_normal_facts,
      actual: summary.current_master_index_matches,
    },
    {
      check: 'every_current_match_carries_cardtrader_evidence',
      expected: summary.current_master_index_matches,
      actual: summary.current_master_facts_with_cardtrader_source,
    },
    {
      check: 'me04_confirmed_false_normal_cohort_is_exact',
      expected: 45,
      actual: summary.confirmed_false_me04_normals,
    },
  ].map((row) => ({ ...row, passed: row.expected === row.actual }));

  return {
    version: 'CARDTRADER_NORMAL_CONTAINMENT_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    automatic_deletes_performed: false,
    overall_status: invariantChecks.every((row) => row.passed)
      ? 'fail_closed_rebuild_and_review_required'
      : 'audit_invariant_failure',
    policy: {
      source_rule: 'CardTrader contributes Normal finish truth only when the blueprint label explicitly says Normal or Non-Holo.',
      loader_behavior: 'Legacy unqualified Normal rows retain card/source identity evidence but load with finish_key=null and evidence_type=finish_unknown_unqualified_provider.',
      repair_boundary: 'This report authorizes no database write or bulk deletion. Rebuild, diff, exact source review, precommit, apply, and readback remain separate gates.',
    },
    inputs,
    summary,
    invariant_checks: invariantChecks,
    affected_sets: sets,
    facts,
  };
}

export function buildCardTraderNormalContainmentMarkdownV1(report) {
  const summaryRows = [
    ['fixture files scanned', report.summary.fixture_files_scanned],
    ['fixture records scanned', report.summary.fixture_records_scanned],
    ['raw Normal records', report.summary.raw_normal_records],
    ['explicit Normal / Non-Holo records', report.summary.explicit_normal_or_non_holo_records],
    ['unqualified inferred Normal records', report.summary.unqualified_inferred_normal_records],
    ['canonical contaminated Normal facts', report.summary.canonical_contaminated_normal_facts],
    ['canonical sets affected', report.summary.canonical_sets_affected],
    ['alias duplicate occurrences collapsed', report.summary.alias_duplicate_occurrences_collapsed],
    ['current Master Index matches', report.summary.current_master_index_matches],
    ['confirmed false ME04 Normals', report.summary.confirmed_false_me04_normals],
  ];
  const sourceRows = Object.entries(report.summary.current_master_source_combinations)
    .map(([sources, count]) => [sources, count]);
  const projectedRows = Object.entries(report.summary.projected_statuses_after_rebuild)
    .map(([status, count]) => [status, count]);
  const dispositionRows = Object.entries(report.summary.dispositions)
    .map(([disposition, count]) => [disposition, count]);
  const invariantRows = report.invariant_checks.map((row) => [
    row.check,
    row.expected,
    row.actual,
    row.passed ? 'PASS' : 'FAIL',
  ]);
  const setRows = report.affected_sets.map((row) => [
    row.set_key,
    row.set_name,
    row.contaminated_normal_facts,
    row.fixture_occurrences,
    row.alias_duplicate_occurrences,
    row.confirmed_false_normals,
    row.projected_candidate_unconfirmed,
    row.projected_human_source_verified,
    row.projected_no_qualified_finish_evidence,
  ]);
  const confirmedFalseRows = report.facts
    .filter((row) => row.containment.confirmed_false_normal)
    .map((row) => [row.set_key, row.card_number, row.card_name, row.finish_key]);
  const independentVerificationRows = report.facts
    .filter((row) => row.containment.disposition === 'independent_verification_required')
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.current_master_index.status,
      row.current_master_index.sources.join(', '),
    ]);

  return [
    '# CardTrader Normal Containment V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    `Status: **${report.overall_status}**`,
    '',
    'Read-only audit. No database writes, migrations, automatic deletions, public hiding, or deployment occurred.',
    '',
    '## Outcome',
    '',
    'The legacy CardTrader fixture corpus contains no explicit Normal or Non-Holo descriptors. Every stored Normal was inferred from an unqualified rarity or product label. The repaired loader now fail-closes those rows to unknown finish, but the checked-in Master Index predates that repair and must be rebuilt and reviewed.',
    '',
    'This audit does not claim that every affected Normal printing is physically false. It proves that CardTrader cannot serve as its finish evidence. ME04 is the bounded confirmed-false cohort; the remaining facts require reclassification or independent evidence.',
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'count'], summaryRows),
    '',
    '## Current Master Source Combinations',
    '',
    markdownTable(['sources', 'facts'], sourceRows),
    '',
    '## Projected Status After Rebuild',
    '',
    markdownTable(['status', 'facts'], projectedRows),
    '',
    '## Required Dispositions',
    '',
    markdownTable(['disposition', 'facts'], dispositionRows),
    '',
    '## Invariant Checks',
    '',
    markdownTable(['check', 'expected', 'actual', 'result'], invariantRows),
    '',
    '## Affected Sets',
    '',
    markdownTable([
      'set_key',
      'set_name',
      'facts',
      'fixture_rows',
      'alias_dupes',
      'confirmed_false',
      'candidate',
      'human_only',
      'no_evidence',
    ], setRows),
    '',
    '## Confirmed False ME04 Normal Facts',
    '',
    markdownTable(['set_key', 'number', 'card', 'finish'], confirmedFalseRows),
    '',
    '## No Remaining Qualified Finish Evidence',
    '',
    independentVerificationRows.length
      ? markdownTable(['set_key', 'number', 'card', 'current_status', 'current_sources'], independentVerificationRows)
      : 'No facts are wholly unsupported after CardTrader removal.',
    '',
    '## Safety Boundary And Next Gate',
    '',
    '1. Rebuild the Master Index in an isolated output directory with the repaired loader.',
    '2. Diff all 1,099 facts by exact canonical identity and projected status.',
    '3. Keep the 45 ME04 false Normals suppressed by reviewed exact-fact governance.',
    '4. Send the remaining facts through set-scoped source replacement; do not bulk-delete them.',
    '5. Produce a precommit plan and live dependency readback before any production mutation.',
    '',
    `The complete ${report.facts.length}-fact ledger, fixture occurrence traceability, evidence URLs, aliases, and dispositions are in ${REPORT_JSON}.`,
    '',
  ].join('\n');
}

async function loadInputs(options) {
  const fixturePaths = await listJsonFilesRecursive(options.fixtureDir);
  const fixtures = [];
  const fixtureFiles = [];
  for (const fixturePath of fixturePaths) {
    const payload = await readJson(fixturePath);
    const relativePath = slashPath(path.relative(process.cwd(), fixturePath));
    const normalRows = (payload.records ?? []).filter((row) => normalizeFinishKey(row.finish_key) === 'normal');
    const unqualifiedRows = normalRows.filter((row) => isUnqualifiedCardTraderNormalFixtureV1(row, payload));
    fixtures.push({ path: relativePath, payload });
    fixtureFiles.push({
      path: relativePath,
      sha256: await fileFingerprint(fixturePath),
      records: (payload.records ?? []).length,
      normal_records: normalRows.length,
      unqualified_normal_records: unqualifiedRows.length,
      explicit_normal_or_non_holo_records: normalRows.length - unqualifiedRows.length,
    });
  }

  const [masterPrintings, aliasReport] = await Promise.all([
    readJson(options.masterPrintingsPath),
    readJson(options.aliasReportPath),
  ]);
  const inputFiles = {
    fixture_directory: slashPath(options.fixtureDir),
    fixture_collection_sha256: combinedFixtureFingerprint(fixtureFiles),
    fixture_files: fixtureFiles,
    master_printings: {
      path: slashPath(options.masterPrintingsPath),
      sha256: await fileFingerprint(options.masterPrintingsPath),
    },
    alias_normalization: {
      path: slashPath(options.aliasReportPath),
      sha256: await fileFingerprint(options.aliasReportPath),
    },
    classifier: {
      path: CLASSIFIER_PATH,
      export: 'isUnqualifiedCardTraderNormalFixtureV1',
      sha256: await fileFingerprint(CLASSIFIER_PATH),
    },
  };

  return { fixtures, fixtureFiles, masterPrintings, aliasReport, inputs: inputFiles };
}

async function main() {
  const options = parseArgs(process.argv);
  const loaded = await loadInputs(options);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const report = buildCardTraderNormalContainmentV1({ ...loaded, generatedAt });
  const failedChecks = report.invariant_checks.filter((row) => !row.passed);
  if (failedChecks.length > 0) {
    throw new Error(`Containment invariant failure: ${failedChecks.map((row) => row.check).join(', ')}`);
  }

  if (!options.dryRun) {
    await fs.mkdir(options.outputDir, { recursive: true });
    await fs.writeFile(path.join(options.outputDir, REPORT_JSON), `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(
      path.join(options.outputDir, REPORT_MARKDOWN),
      buildCardTraderNormalContainmentMarkdownV1(report),
    );
  }

  console.log(JSON.stringify({
    version: report.version,
    overall_status: report.overall_status,
    dry_run: options.dryRun,
    output_dir: slashPath(options.outputDir),
    summary: report.summary,
  }, null, 2));
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  await main();
}
