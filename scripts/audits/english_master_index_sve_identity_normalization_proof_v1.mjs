import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

const FINAL_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const DEFAULT_STAGING_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1_guarded_staging/2026-05-29T02-27-55-907Z';
const OUTPUT_JSON = path.join(FINAL_DIR, 'english_master_index_sve_identity_normalization_proof_v1.json');
const OUTPUT_MD = path.join(FINAL_DIR, 'english_master_index_sve_identity_normalization_proof_v1.md');

function parseArgs(argv) {
  const options = {
    stagingDir: DEFAULT_STAGING_DIR,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--staging-dir') {
      options.stagingDir = next;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

function metricSummary(payload) {
  return {
    generated_at: payload.generated_at,
    sets: payload.summary?.sets ?? 0,
    evidence_rows: payload.summary?.evidence_rows ?? 0,
    cards_by_status: payload.summary?.cards_by_status ?? {},
    printings_by_status: payload.summary?.printings_by_status ?? {},
    conflicts: payload.summary?.conflicts ?? 0,
  };
}

function byKey(rows) {
  return new Map(rows.map((row) => [row.key, row]));
}

function compareRows({ baselineRows, stagedRows }) {
  const baselineMap = byKey(baselineRows);
  const stagedMap = byKey(stagedRows);
  const removed = [];
  const added = [];

  for (const [key, row] of baselineMap.entries()) {
    if (!stagedMap.has(key)) removed.push(row);
  }
  for (const [key, row] of stagedMap.entries()) {
    if (!baselineMap.has(key)) added.push(row);
  }

  return { removed, added };
}

function groupCount(rows, field) {
  const counts = {};
  for (const row of rows) {
    const key = row[field] ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function statusCounts(rows) {
  return groupCount(rows, 'status');
}

function compactRow(row) {
  return {
    key: row.key,
    status: row.status,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    finish_key: row.finish_key ?? null,
    sources: row.sources ?? [],
  };
}

function firstRows(rows, limit = 40) {
  return rows.slice(0, limit).map(compactRow);
}

async function main() {
  const options = parseArgs(process.argv);
  const generatedAt = new Date().toISOString();

  const baselineIndex = await readJson(path.join(FINAL_DIR, 'english_master_index_v1.json'));
  const stagedIndex = await readJson(path.join(options.stagingDir, 'english_master_index_v1.json'));
  const baselineCards = (await readJson(path.join(FINAL_DIR, 'english_master_index_cards_v1.json'))).cards ?? [];
  const stagedCards = (await readJson(path.join(options.stagingDir, 'english_master_index_cards_v1.json'))).cards ?? [];
  const baselinePrintings = (await readJson(path.join(FINAL_DIR, 'english_master_index_printings_v1.json'))).printings ?? [];
  const stagedPrintings = (await readJson(path.join(options.stagingDir, 'english_master_index_printings_v1.json'))).printings ?? [];

  const cardDelta = compareRows({ baselineRows: baselineCards, stagedRows: stagedCards });
  const printingDelta = compareRows({ baselineRows: baselinePrintings, stagedRows: stagedPrintings });
  const nonSveCardChanges = [...cardDelta.removed, ...cardDelta.added].filter((row) => row.set_key !== 'sve');
  const nonSvePrintingChanges = [...printingDelta.removed, ...printingDelta.added].filter((row) => row.set_key !== 'sve');
  const baselineSveCards = baselineCards.filter((row) => row.set_key === 'sve');
  const stagedSveCards = stagedCards.filter((row) => row.set_key === 'sve');
  const baselineSvePrintings = baselinePrintings.filter((row) => row.set_key === 'sve');
  const stagedSvePrintings = stagedPrintings.filter((row) => row.set_key === 'sve');

  const output = {
    version: 'ENGLISH_MASTER_INDEX_SVE_IDENTITY_NORMALIZATION_PROOF_V1',
    generated_at: generatedAt,
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    staging_dir: options.stagingDir,
    rule: 'Scarlet & Violet Energies may collapse Basic Energy and non-Basic Energy labels into one canonical card identity only for set_key sve.',
    conclusion: nonSveCardChanges.length === 0
      && nonSvePrintingChanges.length === 0
      && stagedIndex.summary?.conflicts === 0
      ? 'safe_to_guard_promote_with_explicit_sve_dedupe_threshold'
      : 'stop_manual_review_required',
    baseline: metricSummary(baselineIndex),
    staged: metricSummary(stagedIndex),
    delta: {
      removed_cards: cardDelta.removed.length,
      added_cards: cardDelta.added.length,
      removed_printings: printingDelta.removed.length,
      added_printings: printingDelta.added.length,
      removed_cards_by_set: groupCount(cardDelta.removed, 'set_key'),
      added_cards_by_set: groupCount(cardDelta.added, 'set_key'),
      removed_printings_by_set: groupCount(printingDelta.removed, 'set_key'),
      added_printings_by_set: groupCount(printingDelta.added, 'set_key'),
      non_sve_removed_cards: cardDelta.removed.filter((row) => row.set_key !== 'sve').length,
      non_sve_added_cards: cardDelta.added.filter((row) => row.set_key !== 'sve').length,
      non_sve_removed_printings: printingDelta.removed.filter((row) => row.set_key !== 'sve').length,
      non_sve_added_printings: printingDelta.added.filter((row) => row.set_key !== 'sve').length,
    },
    sve: {
      baseline_cards: baselineSveCards.length,
      staged_cards: stagedSveCards.length,
      baseline_printings: baselineSvePrintings.length,
      staged_printings: stagedSvePrintings.length,
      baseline_cards_by_status: statusCounts(baselineSveCards),
      staged_cards_by_status: statusCounts(stagedSveCards),
      baseline_printings_by_status: statusCounts(baselineSvePrintings),
      staged_printings_by_status: statusCounts(stagedSvePrintings),
      removed_card_examples: firstRows(cardDelta.removed.filter((row) => row.set_key === 'sve')),
      added_card_examples: firstRows(cardDelta.added.filter((row) => row.set_key === 'sve')),
      removed_printing_examples: firstRows(printingDelta.removed.filter((row) => row.set_key === 'sve')),
      added_printing_examples: firstRows(printingDelta.added.filter((row) => row.set_key === 'sve')),
    },
    promotion_guard: {
      min_master_verified_printings: stagedIndex.summary?.printings_by_status?.master_verified ?? null,
      min_master_verified_cards: stagedIndex.summary?.cards_by_status?.master_verified ?? null,
      max_candidate_printings: stagedIndex.summary?.printings_by_status?.candidate_unconfirmed ?? null,
      max_conflicts: 0,
      required_non_sve_card_changes: 0,
      required_non_sve_printing_changes: 0,
    },
  };

  await fs.mkdir(FINAL_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(output, null, 2)}\n`);

  const md = [
    '# English Master Index SVE Identity Normalization Proof V1',
    '',
    'Audit-only proof for the Scarlet & Violet Energies identity normalization guard.',
    '',
    '## Conclusion',
    '',
    output.conclusion,
    '',
    '## Global Metrics',
    '',
    markdownTable(
      ['Metric', 'Baseline', 'Staged'],
      [
        ['generated_at', output.baseline.generated_at, output.staged.generated_at],
        ['master_verified_cards', output.baseline.cards_by_status.master_verified ?? 0, output.staged.cards_by_status.master_verified ?? 0],
        ['master_verified_printings', output.baseline.printings_by_status.master_verified ?? 0, output.staged.printings_by_status.master_verified ?? 0],
        ['candidate_printings', output.baseline.printings_by_status.candidate_unconfirmed ?? 0, output.staged.printings_by_status.candidate_unconfirmed ?? 0],
        ['human_source_verified_printings', output.baseline.printings_by_status.human_source_verified ?? 0, output.staged.printings_by_status.human_source_verified ?? 0],
        ['conflicts', output.baseline.conflicts, output.staged.conflicts],
        ['evidence_rows', output.baseline.evidence_rows, output.staged.evidence_rows],
      ],
    ),
    '',
    '## Delta Scope',
    '',
    markdownTable(
      ['Metric', 'Value'],
      Object.entries(output.delta).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value]),
    ),
    '',
    '## SVE Status',
    '',
    markdownTable(
      ['Metric', 'Baseline', 'Staged'],
      [
        ['cards', output.sve.baseline_cards, output.sve.staged_cards],
        ['printings', output.sve.baseline_printings, output.sve.staged_printings],
        ['cards_by_status', JSON.stringify(output.sve.baseline_cards_by_status), JSON.stringify(output.sve.staged_cards_by_status)],
        ['printings_by_status', JSON.stringify(output.sve.baseline_printings_by_status), JSON.stringify(output.sve.staged_printings_by_status)],
      ],
    ),
    '',
    '## Safety Confirmation',
    '',
    '```json',
    JSON.stringify({
      audit_only: output.audit_only,
      db_writes_performed: output.db_writes_performed,
      migrations_created: output.migrations_created,
      cleanup_performed: output.cleanup_performed,
      quarantine_performed: output.quarantine_performed,
      non_sve_card_changes: nonSveCardChanges.length,
      non_sve_printing_changes: nonSvePrintingChanges.length,
      conflicts: output.staged.conflicts,
    }, null, 2),
    '```',
    '',
    '## Guard For Promotion',
    '',
    '```json',
    JSON.stringify(output.promotion_guard, null, 2),
    '```',
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_MD, md);
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    conclusion: output.conclusion,
    promotion_guard: output.promotion_guard,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
