import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeNumber, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');

const LIVE_RESIDUAL_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_live_residual_queue_v1.json');
const NEXT_ACTION_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_next_action_queue_v1.json');
const BULK_GATE_JSON = path.join(ROOT, 'docs', 'checkpoints', 'master_index', '20260621_stamped_special_bulk_ready_real_apply_gate_checkpoint_v2.md');

const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_final_evidence_exhaustion_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_stamped_special_final_evidence_exhaustion_v1.md');

const SOURCE_ATTEMPT_FILES = [
  ['pokumon_candidate_acquisition', path.join(SOURCE_DIR, 'pokumon_stamped_special_candidate_acquisition_v1', 'pokumon_stamped_special_candidate_acquisition_v1.json')],
  ['web_variant_discovery', path.join(SOURCE_DIR, 'stamped_special_web_variant_discovery_v1', 'stamped_special_web_variant_discovery_v1.json')],
  ['tcgcsv_stamped_subtype', path.join(SOURCE_DIR, 'tcgcsv_stamped_subtype_acquisition_v1', 'tcgcsv_stamped_subtype_acquisition_v1.json')],
  ['pricecharting_stamped_active_finish', path.join(SOURCE_DIR, 'pricecharting_stamped_active_finish_acquisition_v1', 'pricecharting_stamped_active_finish_acquisition_v1.json')],
  ['pkg18n_pricecharting_current_stamped_active_finish', path.join(SOURCE_DIR, 'pkg18n_pricecharting_current_stamped_active_finish_acquisition_v1', 'pkg18n_pricecharting_current_stamped_active_finish_acquisition_v1.json')],
  ['cardtrader_stamped_finish', path.join(SOURCE_DIR, 'cardtrader_stamped_finish_acquisition_v1', 'cardtrader_stamped_finish_acquisition_v1.json')],
  ['pokecardvalues_stamped_finish', path.join(SOURCE_DIR, 'pokecardvalues_stamped_finish_acquisition_v1', 'pokecardvalues_stamped_finish_acquisition_v1.json')],
  ['official_pokemon_prize_pack_pdf', path.join(SOURCE_DIR, 'official_pokemon_prize_pack_pdf_acquisition_v1', 'official_pokemon_prize_pack_pdf_acquisition_v1.json')],
  ['justinbasil_prize_pack_finish', path.join(SOURCE_DIR, 'justinbasil_prize_pack_finish_acquisition_v1', 'justinbasil_prize_pack_finish_acquisition_v1.json')],
  ['tcgcsv_prize_pack_title_finish', path.join(SOURCE_DIR, 'tcgcsv_prize_pack_title_finish_acquisition_v1', 'tcgcsv_prize_pack_title_finish_acquisition_v1.json')],
  ['bulbapedia_prize_pack_normal', path.join(SOURCE_DIR, 'bulbapedia_prize_pack_normal_acquisition_v1', 'bulbapedia_prize_pack_normal_acquisition_v1.json')],
  ['bulbapedia_prize_pack_foil_rule', path.join(SOURCE_DIR, 'bulbapedia_prize_pack_foil_rule_review_v1', 'bulbapedia_prize_pack_foil_rule_review_v1.json')],
  ['bulbapedia_prize_pack_foil', path.join(SOURCE_DIR, 'bulbapedia_prize_pack_foil_acquisition_v1', 'bulbapedia_prize_pack_foil_acquisition_v1.json')],
  ['prize_pack_current_gap_cross_source', path.join(SOURCE_DIR, 'prize_pack_current_gap_cross_source_v1', 'prize_pack_current_gap_cross_source_v1.json')],
  ['pkg17i2_stamp_label_source', path.join(SOURCE_DIR, 'pkg17i2_stamp_label_source_acquisition_v1', 'pkg17i2_stamp_label_source_acquisition_v1.json')],
  ['ebay_browse_stamped_finish_review', path.join(SOURCE_DIR, 'ebay_browse_stamped_finish_review_v1', 'ebay_browse_stamped_finish_review_v1.json')],
  ['pkg18ef_stamped_source_acquisition_closure', path.join(AUDIT_DIR, 'english_master_index_pkg18ef_stamped_source_acquisition_closure_v1.json')],
];

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch {
    return null;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function countBy(rows, fn) {
  const out = {};
  for (const row of rows) {
    const key = fn(row) || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function rowKey(row) {
  return [
    row.set_key,
    normalizeNumber(row.card_number),
    normalizeText(row.card_name),
    row.variant_key ?? '',
  ].join('|');
}

function sourceAttemptSummary(name, artifact) {
  const summary = artifact?.summary ?? {};
  return {
    source_lane: name,
    artifact: artifact ? true : false,
    fingerprint_sha256: artifact?.fingerprint_sha256 ?? null,
    target_rows: summary.target_rows ?? artifact?.target_rows ?? null,
    records_generated: summary.records_generated ?? summary.fixture_records_written ?? artifact?.records_generated ?? null,
    write_ready_now: artifact?.write_ready_now ?? artifact?.safety?.write_ready_now ?? summary.write_ready_now ?? 0,
    summary,
  };
}

function buildIndex(rows = []) {
  const map = new Map();
  for (const row of rows) map.set(rowKey(row), row);
  return map;
}

function finalStatus(row, indexes) {
  const key = rowKey(row);
  const web = indexes.web.get(key);
  const officialPrize = indexes.officialPrize.get(key);

  if (row.action_bucket === 'display_metadata_no_write') {
    return {
      final_status: 'display_metadata_only_no_printing_write',
      evidence_state: 'not_a_child_printing_truth_problem',
      next_action: 'Model as display/product metadata later; do not create child printing rows.',
    };
  }
  if (row.action_bucket === 'closed_stale_no_write') {
    return {
      final_status: 'closed_stale_no_write',
      evidence_state: 'already classified stale or non-actionable',
      next_action: 'No write package. Keep as historical queue closure.',
    };
  }
  if (row.action_bucket === 'generic_stamped_suppressed_no_write') {
    return {
      final_status: 'generic_stamp_suppressed_no_write',
      evidence_state: 'generic stamp label cannot become canonical identity',
      next_action: 'Require exact stamp family before any future identity row.',
    };
  }
  if (row.action_bucket === 'base_parent_blocked_no_write') {
    return {
      final_status: 'base_parent_or_base_finish_blocked',
      evidence_state: 'dependency/order blocker',
      next_action: 'Resolve base parent/base finish governance first.',
    };
  }
  if (row.action_bucket === 'manual_conflict_still_blocked') {
    return {
      final_status: 'manual_conflict_taxonomy_blocked',
      evidence_state: 'sources found but finish/event wording remains ambiguous',
      next_action: 'Manual adjudication required before any dry-run package.',
    };
  }
  if (row.action_bucket === 'prize_pack_second_source') {
    const officialStatus = officialPrize?.acquisition_status;
    if (officialStatus === 'useful_second_source_match') {
      return {
        final_status: 'source_found_but_write_blocked',
        evidence_state: 'official source supports one finish but DB/readiness collision prevents new insert',
        next_action: 'Route through existing-parent or multi-finish Prize Pack governance.',
      };
    }
    return {
      final_status: 'source_exhausted_prize_pack_finish_mapping_blocked',
      evidence_state: officialStatus ? `official_pdf:${officialStatus}` : 'no exact independent finish mapping found',
      next_action: 'Do not infer Standard Set/Foil. Needs exact product/checklist finish mapping or multi-finish governance.',
    };
  }
  if (web?.status === 'multi_source_variant_found_finish_unresolved') {
    return {
      final_status: 'multi_source_variant_found_finish_unresolved',
      evidence_state: '2+ sources support variant/card identity but not one exact active finish',
      next_action: 'Do not write. Needs exact active finish binding.',
    };
  }
  if (web?.status === 'variant_found_finish_unresolved') {
    return {
      final_status: 'variant_found_finish_unresolved',
      evidence_state: 'source supports variant/card identity but not one exact active finish',
      next_action: 'Do not write. Needs exact active finish binding.',
    };
  }
  if (row.action_bucket === 'second_source_needed') {
    return {
      final_status: 'source_exhausted_second_source_still_needed',
      evidence_state: 'manual candidates exhausted except V2 dry-run package; remaining rows lack sufficient second source',
      next_action: 'Continue only with new external source family or manual physical proof.',
    };
  }
  if (row.action_bucket === 'league_finish_exact_source') {
    return {
      final_status: 'source_exhausted_league_exact_finish_needed',
      evidence_state: 'league variant evidence exists for many rows but exact finish binding remains unresolved',
      next_action: 'Needs exact League Stamp + active finish source; broad Crosshatch/Holo wording is not enough.',
    };
  }
  if (row.action_bucket === 'event_staff_exact_source') {
    return {
      final_status: 'source_exhausted_event_staff_exact_finish_needed',
      evidence_state: 'event/staff variant evidence exists for many rows but exact finish binding remains unresolved',
      next_action: 'Needs exact event/staff stamp + active finish source.',
    };
  }
  if (row.action_bucket === 'small_custom_stamp_exact_source') {
    return {
      final_status: 'source_exhausted_custom_stamp_exact_finish_needed',
      evidence_state: 'custom stamp variant/source context found, exact finish binding unresolved',
      next_action: 'Needs exact stamp family and active finish source.',
    };
  }
  if (row.action_bucket === 'prerelease_exact_finish_source') {
    return {
      final_status: 'source_exhausted_prerelease_exact_finish_needed',
      evidence_state: 'prerelease source context found, exact active finish unresolved',
      next_action: 'Needs exact prerelease stamp + active finish source.',
    };
  }
  if (row.action_bucket === 'professor_program_exact_finish_source') {
    return {
      final_status: 'source_exhausted_professor_program_exact_finish_needed',
      evidence_state: 'professor program source context found, exact active finish unresolved',
      next_action: 'Needs exact Professor Program stamp + active finish source.',
    };
  }
  if (row.action_bucket === 'halloween_base_parent_or_finish_resolution') {
    return {
      final_status: 'source_exhausted_halloween_base_parent_or_finish_blocked',
      evidence_state: 'Halloween stamp family unresolved at base-parent or finish level',
      next_action: 'Needs exact base parent/finish source before dry-run.',
    };
  }
  return {
    final_status: 'source_exhausted_unclassified_manual_review',
    evidence_state: 'no deterministic lane matched after evidence pass',
    next_action: 'Manual review required.',
  };
}

function renderMarkdown(report) {
  const statusRows = Object.entries(report.summary.by_final_status).map(([status, count]) => [status, count]);
  const sourceRows = report.source_attempts.map((row) => [
    row.source_lane,
    row.target_rows ?? '',
    row.records_generated ?? '',
    row.write_ready_now ?? 0,
    row.fingerprint_sha256 ?? '',
  ]);
  const bucketRows = Object.entries(report.summary.by_action_bucket).map(([bucket, count]) => [bucket, count]);

  return `# English Master Index Stamped/Special Final Evidence Exhaustion V1

Generated: ${report.generated_at}

This is audit-only. It performs no DB writes, no migrations, no apply, no cleanup, and no quarantine.

## Baseline

- live_residual_fingerprint: \`${report.inputs.live_residual_fingerprint_sha256}\`
- next_action_fingerprint: \`${report.inputs.next_action_fingerprint_sha256}\`
- open_rows_classified: ${report.summary.open_rows_classified}
- write_ready_now: ${report.summary.write_ready_now}
- rollback_ready_bulk_gate_exists: ${report.summary.rollback_ready_bulk_gate_exists}

## Final Status Counts

${markdownTable(['final_status', 'count'], statusRows)}

## Action Buckets

${markdownTable(['action_bucket', 'count'], bucketRows)}

## Source Attempts

${markdownTable(['source_lane', 'target_rows', 'records_generated', 'write_ready_now', 'fingerprint'], sourceRows)}

## Rollback-Only Ready Package

The only prepared write path remains the no-write V2 bulk gate:

\`\`\`text
docs/checkpoints/master_index/20260621_stamped_special_bulk_ready_real_apply_gate_checkpoint_v2.md
\`\`\`

It is not applied. It requires explicit operator approval before any DB write.

## Remaining Principle

Rows with variant evidence but unresolved finish binding are not canonical truth. They must stay blocked until the exact active finish is proven.
`;
}

async function main() {
  const liveResidual = await readJson(LIVE_RESIDUAL_JSON);
  const nextAction = await readJson(NEXT_ACTION_JSON);
  const sourceAttempts = [];
  const loaded = {};

  for (const [name, filePath] of SOURCE_ATTEMPT_FILES) {
    const artifact = await readJsonIfExists(filePath);
    loaded[name] = artifact;
    sourceAttempts.push(sourceAttemptSummary(name, artifact));
  }

  const indexes = {
    web: buildIndex(loaded.web_variant_discovery?.rows ?? []),
    officialPrize: buildIndex(loaded.official_pokemon_prize_pack_pdf?.rows ?? []),
  };

  const openRows = nextAction.rows ?? liveResidual.open_rows ?? [];
  const classifiedRows = openRows.map((row) => ({
    ...row,
    ...finalStatus(row, indexes),
  }));

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_stamped_special_final_evidence_exhaustion_v1',
    inputs: {
      live_residual_queue: rel(LIVE_RESIDUAL_JSON),
      live_residual_fingerprint_sha256: liveResidual.fingerprint_sha256,
      next_action_queue: rel(NEXT_ACTION_JSON),
      next_action_fingerprint_sha256: nextAction.fingerprint_sha256,
      bulk_gate_checkpoint_v2: rel(BULK_GATE_JSON),
    },
    safety: {
      db_writes_performed: false,
      durable_db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      quarantine_performed: false,
    },
    source_attempts: sourceAttempts,
    summary: {
      open_rows_classified: classifiedRows.length,
      write_ready_now: 0,
      rollback_ready_bulk_gate_exists: true,
      by_final_status: countBy(classifiedRows, (row) => row.final_status),
      by_action_bucket: countBy(classifiedRows, (row) => row.action_bucket),
      by_variant_family: countBy(classifiedRows, (row) => row.variant_family),
      by_set: countBy(classifiedRows, (row) => row.set_key),
    },
    rows: classifiedRows,
  };

  report.fingerprint_sha256 = sha256(stableJson({
    inputs: report.inputs,
    summary: report.summary,
    rows: classifiedRows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      action_bucket: row.action_bucket,
      final_status: row.final_status,
    })),
  }));

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
