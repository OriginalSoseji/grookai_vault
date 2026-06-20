import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_OUTPUT_DIR, markdownTable } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const SOURCE_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_overnight_source_pass_v1.json');
const OUTPUT_MD = path.join(AUDIT_DIR, 'english_master_index_stamped_special_overnight_source_pass_v1.md');

const ARTIFACTS = {
  checkpoint: path.join(ROOT, 'docs', 'checkpoints', 'master_index', 'STAMPED_SPECIAL_OVERNIGHT_SOURCE_ACQUISITION_CHECKPOINT_20260619.md'),
  current_queue: path.join(AUDIT_DIR, 'english_master_index_pkg17a_stamped_remaining_action_queue_v1.json'),
  execution_queue: path.join(AUDIT_DIR, 'english_master_index_pkg18x_stamped_post_governance_execution_queue_v1.json'),
  completion_rollup: path.join(AUDIT_DIR, 'english_master_index_pkg18z_stamped_completion_rollup_v1.json'),
  active_finish_acquisition: path.join(AUDIT_DIR, 'english_master_index_pkg17b_stamped_active_finish_source_acquisition_v1.json'),
  stamp_label_pricecharting: path.join(SOURCE_DIR, 'pkg17i3_pricecharting_stamp_label_acquisition_v1', 'pkg17i3_pricecharting_stamp_label_acquisition_v1.json'),
  stamp_label_readiness: path.join(AUDIT_DIR, 'english_master_index_pkg17i4_pricecharting_stamp_label_readiness_v1.json'),
  variant_family_plan: path.join(AUDIT_DIR, 'english_master_index_pkg17k_stamped_active_finish_variant_family_plan_v1.json'),
  league_preserved: path.join(AUDIT_DIR, 'english_master_index_pkg17o_league_preserved_evidence_absorption_v1.json'),
  league_pokemonflashfire: path.join(AUDIT_DIR, 'english_master_index_pkg17p_pokemonflashfire_league_reverse_source_v1.json'),
  league_second_source: path.join(AUDIT_DIR, 'english_master_index_pkg17s_league_reverse_second_source_v1.json'),
  league_readiness: path.join(AUDIT_DIR, 'english_master_index_pkg17q_league_reverse_bulk_readiness_v1.json'),
  halloween_pricecharting: path.join(SOURCE_DIR, 'pkg18h_pricecharting_halloween_active_finish_acquisition_v1', 'pkg18h_pricecharting_halloween_active_finish_acquisition_v1.json'),
  halloween_readiness: path.join(AUDIT_DIR, 'english_master_index_pkg18i_halloween_active_finish_readiness_v1.json'),
  current_pricecharting_stamped_finish: path.join(SOURCE_DIR, 'pkg18n_pricecharting_current_stamped_active_finish_acquisition_v1', 'pkg18n_pricecharting_current_stamped_active_finish_acquisition_v1.json'),
  prize_pack_pricecharting: path.join(SOURCE_DIR, 'pkg18k_pricecharting_prize_pack_finish_corroboration_v1', 'pkg18k_pricecharting_prize_pack_finish_corroboration_v1.json'),
  prize_pack_readiness: path.join(AUDIT_DIR, 'english_master_index_pkg18l_prize_pack_active_finish_readiness_v1.json'),
  sv03_bulbapedia: path.join(SOURCE_DIR, 'sv03_bulbapedia_additional_stamped_active_finish_v1', 'sv03_bulbapedia_additional_stamped_active_finish_v1.json'),
  sv03_product_family: path.join(SOURCE_DIR, 'sv03_product_family_stamped_finish_review_v1', 'sv03_product_family_stamped_finish_review_v1.json'),
  sv03_readiness: path.join(AUDIT_DIR, 'english_master_index_sv03_stamped_parent_active_finish_readiness_queue_v1.json'),
  sv03_closure: path.join(AUDIT_DIR, 'english_master_index_sv03_stamped_lane_closure_v1.json'),
  source_closure: path.join(AUDIT_DIR, 'english_master_index_pkg18ef_stamped_source_acquisition_closure_v1.json'),
};

const DISCOVERED_SOURCES = [
  {
    source_name: 'Pokumon crosshatch category',
    source_url: 'https://pokumon.com/holofoil/crosshatch/',
    source_kind: 'collector_reference',
    attempted: true,
    result: 'review_only',
    reason: 'Static category text exposes names/counts and category families, but not enough exact set + number + active finish detail for direct fixture promotion.',
  },
  {
    source_name: 'JudgeBall Play! Pokemon promo cards',
    source_url: 'https://www.judgeball.com/archives/professor-promo-cards/',
    source_kind: 'collector_reference',
    attempted: true,
    result: 'identity_only',
    reason: 'Page gives useful Professor Program identity context but does not prove exact child finish for active-finish rows.',
  },
  {
    source_name: 'PikaStocks Professor Program Promos',
    source_url: 'https://www.pikastocks.com/sets/115-professor-program-promos',
    source_kind: 'collector_reference',
    attempted: true,
    result: 'identity_or_market_context_only',
    reason: 'Accessible, but current pass did not find direct exact finish proof usable for child-printing promotion.',
  },
  {
    source_name: 'Bulbapedia Prerelease cards',
    source_url: 'https://bulbapedia.bulbagarden.net/wiki/Prerelease_cards_(TCG)',
    source_kind: 'human_readable_checklist',
    attempted: true,
    result: 'identity_context_only',
    reason: 'Useful for prerelease card identity and history. Finish still requires exact row-level evidence before child printing promotion.',
  },
  {
    source_name: 'Enhanced Cardmarket prerelease list',
    source_url: 'https://enhanced-cardmarket.mave.me/prerelease',
    source_kind: 'marketplace_checklist',
    attempted: true,
    result: 'not_static_parseable_for_targets',
    reason: 'The static HTML did not expose target rows in a way that safely maps to current queue rows.',
  },
];

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
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

function summaryOf(artifact) {
  if (!artifact) return null;
  return artifact.summary ?? null;
}

function metric(summary, key, fallback = 0) {
  return Number(summary?.[key] ?? fallback);
}

function renderMarkdown(report) {
  const artifactRows = Object.entries(report.source_attempts).map(([key, attempt]) => [
    key,
    attempt.status,
    attempt.notable_result,
    attempt.artifact ? `\`${attempt.artifact}\`` : '',
  ]);
  const sourceRows = report.discovered_sources.map((source) => [
    source.source_name,
    source.result,
    source.reason,
    source.source_url,
  ]);
  return `# Stamped/Special Overnight Source Pass V1

Audit-only overnight-style pass for the remaining stamped/special queue.

## Safety

- audit_only: ${report.audit_only}
- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- apply_performed: ${report.apply_performed}
- cleanup_performed: ${report.cleanup_performed}
- write_ready_now: ${report.write_ready_now}

## Queue Result

${markdownTable(['metric', 'value'], [
    ['starting_remaining_rows', report.baseline.starting_remaining_rows],
    ['current_remaining_rows', report.current.current_remaining_rows],
    ['current_no_write_or_governance_rows', report.current.current_no_write_or_governance_rows],
    ['current_source_required_rows', report.current.current_source_required_rows],
    ['current_manual_conflict_rows', report.current.current_manual_conflict_rows],
    ['write_ready_now', report.write_ready_now],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Source Attempts

${markdownTable(['lane', 'status', 'notable result', 'artifact'], artifactRows)}

## Additional Online Source Discovery

${markdownTable(['source', 'result', 'reason', 'url'], sourceRows)}

## Conclusion

No DB write package is authorized by this report. Rows remain fail-closed unless exact source evidence proves set, number, name, stamp/variant, and finish where applicable.
`;
}

async function main() {
  const jsonArtifacts = Object.entries(ARTIFACTS).filter(([key]) => key !== 'checkpoint');
  const loaded = Object.fromEntries(await Promise.all(
    jsonArtifacts.map(async ([key, filePath]) => [key, await readJsonIfExists(filePath)]),
  ));
  const checkpointExists = await fileExists(ARTIFACTS.checkpoint);
  const executionSummary = summaryOf(loaded.execution_queue) ?? {};
  const queueSummary = summaryOf(loaded.current_queue) ?? {};
  const rollupSummary = summaryOf(loaded.completion_rollup) ?? {};

  const sourceAttempts = {
    active_finish_bulk: {
      artifact: rel(ARTIFACTS.active_finish_acquisition),
      status: 'completed',
      notable_result: `${metric(summaryOf(loaded.active_finish_acquisition), 'useful_current_gap_matches')} useful unabsorbed matches; ${metric(summaryOf(loaded.active_finish_acquisition), 'accepted_delta_records')} accepted delta records`,
      summary: summaryOf(loaded.active_finish_acquisition),
    },
    pricecharting_stamp_labels: {
      artifact: rel(ARTIFACTS.stamp_label_pricecharting),
      status: 'review_only',
      notable_result: `${metric(summaryOf(loaded.stamp_label_pricecharting), 'candidate_rows')} label candidates; readiness still blocked by active finish/base parent`,
      summary: summaryOf(loaded.stamp_label_pricecharting),
    },
    league_sources: {
      artifact: rel(ARTIFACTS.league_pokemonflashfire),
      status: 'completed',
      notable_result: `${metric(summaryOf(loaded.league_pokemonflashfire), 'current_queue_matches')} PokemonFlashfire matches; readiness has ${metric(summaryOf(loaded.league_readiness), 'future_guarded_parent_identity_insert_candidates')} insert candidates`,
      summary: {
        pokemonflashfire: summaryOf(loaded.league_pokemonflashfire),
        preserved: summaryOf(loaded.league_preserved),
        readiness: summaryOf(loaded.league_readiness),
      },
    },
    halloween_sources: {
      artifact: rel(ARTIFACTS.halloween_pricecharting),
      status: 'blocked_after_readiness',
      notable_result: `${metric(summaryOf(loaded.halloween_pricecharting), 'candidate_rows')} candidates; ${metric(summaryOf(loaded.halloween_readiness), 'future_guarded_parent_identity_insert_candidates')} insert candidates after readiness`,
      summary: {
        acquisition: summaryOf(loaded.halloween_pricecharting),
        readiness: summaryOf(loaded.halloween_readiness),
      },
    },
    prize_pack_sources: {
      artifact: rel(ARTIFACTS.prize_pack_pricecharting),
      status: 'blocked',
      notable_result: `${metric(summaryOf(loaded.prize_pack_pricecharting), 'ready_second_source_pricecharting_corroborated')} second-source ready; ${metric(summaryOf(loaded.prize_pack_pricecharting), 'review_pricecharting_single_source_only')} single-source review rows`,
      summary: {
        pricecharting: summaryOf(loaded.prize_pack_pricecharting),
        readiness: summaryOf(loaded.prize_pack_readiness),
      },
    },
    sv03_sources: {
      artifact: rel(ARTIFACTS.sv03_readiness),
      status: 'review_only',
      notable_result: `${metric(summaryOf(loaded.sv03_readiness), 'review_ready_rows')} review-ready rows; ${metric(summaryOf(loaded.sv03_readiness), 'write_ready_now')} write-ready now`,
      summary: {
        bulbapedia: summaryOf(loaded.sv03_bulbapedia),
        product_family: summaryOf(loaded.sv03_product_family),
        readiness: summaryOf(loaded.sv03_readiness),
        closure: summaryOf(loaded.sv03_closure),
      },
    },
    source_closure: {
      artifact: rel(ARTIFACTS.source_closure),
      status: 'completed',
      notable_result: `${metric(summaryOf(loaded.source_closure), 'blocked_rows')} blocked rows; ${metric(summaryOf(loaded.source_closure), 'write_ready_rows')} write-ready rows`,
      summary: summaryOf(loaded.source_closure),
    },
  };

  const reportPayload = {
    execution_fingerprint: loaded.execution_queue?.fingerprint_sha256,
    rollup_fingerprint: loaded.completion_rollup?.fingerprint_sha256,
    sourceAttempts,
    discovered_sources: DISCOVERED_SOURCES,
  };

  const report = {
    generated_at: new Date().toISOString(),
    version: 'english_master_index_stamped_special_overnight_source_pass_v1',
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    apply_performed: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_artifacts: Object.fromEntries(Object.entries(ARTIFACTS).map(([key, filePath]) => [key, rel(filePath)])),
    fingerprint_sha256: sha256(stableJson(reportPayload)),
    baseline: {
      checkpoint: rel(ARTIFACTS.checkpoint),
      checkpoint_exists: checkpointExists,
      starting_remaining_rows: 567,
      starting_no_write_or_governance_rows: 301,
      starting_source_required_rows: 263,
      starting_manual_conflict_rows: 3,
    },
    current: {
      current_remaining_rows: metric(executionSummary, 'remaining_rows', metric(queueSummary, 'queue_rows')),
      current_no_write_or_governance_rows: metric(executionSummary, 'no_db_write_expected_rows'),
      current_source_required_rows: metric(executionSummary, 'future_guarded_write_possible_rows'),
      current_manual_conflict_rows: metric(executionSummary, 'blocked_no_write_rows'),
      rollup_closed_or_classified_rows: metric(rollupSummary, 'closed_or_classified_rows'),
      rollup_source_acquisition_rows_blocked: metric(rollupSummary, 'source_acquisition_rows_blocked'),
    },
    source_attempts: sourceAttempts,
    discovered_sources: DISCOVERED_SOURCES,
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));
  console.log(JSON.stringify({
    output_json: rel(OUTPUT_JSON),
    output_md: rel(OUTPUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    write_ready_now: report.write_ready_now,
    current: report.current,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
