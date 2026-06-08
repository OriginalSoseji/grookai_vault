import fs from 'node:fs/promises';
import path from 'node:path';

import { markdownTable } from './verified_master_set_index_v1/shared.mjs';

const MASTER_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const EXHAUSTION_DIR = 'docs/audits/english_master_index_source_exhaustion_v1';
const OUTPUT_JSON = path.join(MASTER_DIR, 'english_master_index_finish_blocker_adjudication_packet_v1.json');
const OUTPUT_MD = path.join(MASTER_DIR, 'english_master_index_finish_blocker_adjudication_packet_v1.md');

const MANUAL_ADJUDICATIONS = {
  'bw8|94|druddigon|holo': {
    proposed_adjudication: 'requested_finish_not_supported_as_plain_holo',
    confidence: 'high',
    future_write_shape_if_approved: 'Treat the plain holo claim as unsupported. Preserve or model cracked_ice_holo only through a distinct source-backed finish, never by collapsing it into holo.',
    required_before_write: [
      'Confirm Grookai row IDs affected by the plain holo claim.',
      'Confirm cracked_ice_holo is represented separately before any cleanup proposal.',
      'Generate dry-run removal/isolation package with rollback artifact.',
    ],
  },
  "ex9|107|farfetch'd|normal": {
    proposed_adjudication: 'requested_finish_not_supported_as_normal',
    confidence: 'medium_high',
    future_write_shape_if_approved: 'Treat the normal claim as unsupported unless an exact normal source appears. Do not replace it by inference; the supported context points to secret rare/holo context.',
    required_before_write: [
      'Confirm exact Grookai row IDs affected by the normal finish claim.',
      'Confirm whether supported secret rare/holo finish already exists as a distinct printing.',
      'Generate dry-run removal/isolation package with rollback artifact.',
    ],
  },
  'sm8|187|net ball|stamped': {
    proposed_adjudication: 'card_number_alias_or_child_print_required',
    confidence: 'high',
    future_write_shape_if_approved: 'Do not promote stamped #187. Evidence points to #187a/214, so this needs a numbering/alias or child-print plan before any canonical mutation.',
    required_before_write: [
      'Confirm whether Grookai has or needs a separate #187a identity.',
      'Confirm stamped evidence belongs to #187a only.',
      'Generate dry-run alias/child-print package with rollback artifact and post-apply verification.',
    ],
  },
  'sv03.5|146|moltres|normal': {
    proposed_adjudication: 'requested_finish_not_supported_as_normal',
    confidence: 'high',
    future_write_shape_if_approved: 'Treat the normal claim as unsupported unless exact normal evidence appears. Current exact source context supports holo and reverse holo, not normal.',
    required_before_write: [
      'Confirm exact Grookai row IDs affected by the normal finish claim.',
      'Confirm holo and reverse holo are represented separately.',
      'Generate dry-run removal/isolation package with rollback artifact.',
    ],
  },
  "swsh3.5|62|professor's research (professor magnolia)|normal": {
    proposed_adjudication: 'requested_finish_not_supported_as_normal',
    confidence: 'high',
    future_write_shape_if_approved: 'Treat the normal claim as unsupported unless exact normal evidence appears. Current exact source context supports holo and reverse holo, not normal.',
    required_before_write: [
      'Confirm exact Grookai row IDs affected by the normal finish claim.',
      'Confirm holo and reverse holo are represented separately.',
      'Generate dry-run removal/isolation package with rollback artifact.',
    ],
  },
};

function safety() {
  return {
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    mutation_authority: false,
    write_ready_now: 0,
  };
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (fallback !== null && error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

function addCount(target, key, count = 1) {
  const normalized = String(key ?? '').trim() || 'unknown';
  target[normalized] = (target[normalized] ?? 0) + Number(count ?? 0);
}

function blockerKey(row) {
  return [
    row.set_key,
    row.card_number ?? '',
    String(row.card_name ?? '').trim().toLowerCase(),
    row.finish_key ?? '',
  ].join('|');
}

function findOutcome(outcomes, blocker) {
  const key = blockerKey(blocker);
  return (outcomes.rows ?? []).find((row) => blockerKey(row) === key) ?? null;
}

function buildRows(closure, outcomes) {
  return (closure.mapped_blockers ?? []).map((blocker) => {
    const decision = MANUAL_ADJUDICATIONS[blockerKey(blocker)] ?? {
      proposed_adjudication: 'manual_review_required',
      confidence: 'unknown',
      future_write_shape_if_approved: 'Manual source review is required before any future dry-run package.',
      required_before_write: [
        'Confirm exact row IDs.',
        'Confirm exact source-backed finish or numbering rule.',
        'Generate dry-run package with rollback artifact.',
      ],
    };
    const outcome = findOutcome(outcomes, blocker);
    return {
      ...blocker,
      adjudication_status: 'operator_decision_required',
      promotion_safe_now: false,
      write_ready_now: false,
      proposed_adjudication: decision.proposed_adjudication,
      confidence: decision.confidence,
      future_write_shape_if_approved: decision.future_write_shape_if_approved,
      required_before_write: decision.required_before_write,
      source_attempt_classes: outcome?.attempt_classes ?? [],
      source_attempt_recommendation: outcome?.recommendation ?? null,
      acceptance_rule: 'No write may be planned unless exact affected row IDs, rollback artifact, and post-apply verification are present.',
    };
  });
}

function buildReport({ closure, outcomes, generatedAt }) {
  const rows = buildRows(closure, outcomes);
  const byProposedAdjudication = {};
  const byBlockerType = {};
  const byConfidence = {};
  for (const row of rows) {
    addCount(byProposedAdjudication, row.proposed_adjudication);
    addCount(byBlockerType, row.blocker_type);
    addCount(byConfidence, row.confidence);
  }
  return {
    generated_at: generatedAt,
    version: 'ENGLISH_MASTER_INDEX_FINISH_BLOCKER_ADJUDICATION_PACKET_V1',
    ...safety(),
    rule: 'This packet converts the final finish blocker boundary into operator decisions. It is not mutation authority and does not create a write plan.',
    source_reports: [
      path.join(MASTER_DIR, 'english_master_index_finish_blocker_closure_v1.json'),
      path.join(EXHAUSTION_DIR, 'english_master_index_source_attempt_outcomes_v1.json'),
    ],
    summary: {
      total_blockers: rows.length,
      promotion_safe_now: rows.filter((row) => row.promotion_safe_now).length,
      write_ready_now: 0,
      by_proposed_adjudication: byProposedAdjudication,
      by_blocker_type: byBlockerType,
      by_confidence: byConfidence,
    },
    stop_rules_before_write: [
      'Stop if the proposed adjudication is not explicitly approved.',
      'Stop if exact Grookai row IDs are missing.',
      'Stop if rollback artifacts are missing.',
      'Stop if post-apply verification queries are missing.',
      'Stop if evidence supports a different finish or card number than the row under review.',
    ],
    rows,
  };
}

function buildMarkdown(report) {
  const summaryRows = [
    ['total_blockers', report.summary.total_blockers],
    ['promotion_safe_now', report.summary.promotion_safe_now],
    ['write_ready_now', report.summary.write_ready_now],
    ['by_proposed_adjudication', JSON.stringify(report.summary.by_proposed_adjudication)],
    ['by_blocker_type', JSON.stringify(report.summary.by_blocker_type)],
  ];
  const rows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.blocker_type,
    row.proposed_adjudication,
    row.confidence,
    row.future_write_shape_if_approved,
  ]);
  const detailRows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.finish_key,
    row.required_before_write.join('; '),
  ]);
  return [
    '# English Master Index Finish Blocker Adjudication Packet V1',
    '',
    'Audit only. This packet does not authorize DB writes, migrations, cleanup, quarantine, or public hiding.',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '## Safety',
    '',
    markdownTable(['field', 'value'], Object.entries(safety())),
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], summaryRows),
    '',
    '## Proposed Adjudications',
    '',
    markdownTable(['set', 'number', 'name', 'finish', 'blocker', 'proposed_adjudication', 'confidence', 'future_write_shape_if_approved'], rows),
    '',
    '## Required Before Any Future Write',
    '',
    markdownTable(['set', 'number', 'name', 'finish', 'required_before_write'], detailRows),
    '',
    '## Stop Rules',
    '',
    report.stop_rules_before_write.map((rule) => `- ${rule}`).join('\n'),
    '',
  ].join('\n');
}

async function main() {
  const generatedAt = new Date().toISOString();
  const closure = await readJson(path.join(MASTER_DIR, 'english_master_index_finish_blocker_closure_v1.json'));
  const outcomes = await readJson(path.join(EXHAUSTION_DIR, 'english_master_index_source_attempt_outcomes_v1.json'), { rows: [] });
  const report = buildReport({ closure, outcomes, generatedAt });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    summary: report.summary,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[finish-blocker-adjudication] failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
