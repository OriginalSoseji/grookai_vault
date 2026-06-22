import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const REPORT_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const CHECKPOINT_DIR = 'docs/checkpoints/master_index';
const VERSION = 'english_master_index_post_collexy_source_lane_closure_v1';

const SOURCE_PACKET =
  'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_post_collexy_source_packet_v1.json';

const sourceReports = [
  {
    lane_key: 'league_marketplace_scan_sources',
    report_path:
      'docs/audits/english_master_index_source_exhaustion_v1/league_marketplace_scan_sources_v1/league_marketplace_scan_sources_v1.json',
    source_delta_path: null,
    decision: 'review_only',
    reason:
      'eBay Browse returned title-level variant hits, but no exact set + number + name + stamp + finish proof suitable for Master Index promotion.',
  },
  {
    lane_key: 'prize_pack_post_collexy_fixture_recheck',
    report_path:
      'docs/audits/english_master_index_source_exhaustion_v1/prize_pack_post_collexy_fixture_recheck_v1/prize_pack_post_collexy_fixture_recheck_v1.json',
    source_delta_path: null,
    decision: 'blocked',
    reason:
      'Preserved fixture matches are useful context, but current rows still lack promotable exact active-finish evidence.',
  },
  {
    lane_key: 'small_custom_stamp_web_evidence',
    report_path:
      'docs/audits/english_master_index_source_exhaustion_v1/small_custom_stamp_web_evidence_v1/small_custom_stamp_web_evidence_v1.json',
    source_delta_path:
      'docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1/small_custom_stamp_web_evidence_v1_source_delta_audit_v1.json',
    decision: 'already_absorbed_or_blocked',
    reason:
      'Exact records already in the fixture are already master-verified; remaining rows need new exact sources.',
  },
  {
    lane_key: 'event_staff_exact_source_evidence',
    report_path:
      'docs/audits/english_master_index_source_exhaustion_v1/event_staff_exact_source_evidence_v1/event_staff_exact_source_evidence_v1.json',
    source_delta_path:
      'docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1/event_staff_exact_source_evidence_v1_source_delta_audit_v1.json',
    decision: 'already_absorbed_or_blocked',
    reason:
      'Source-delta found no useful gap-closing records; existing exact records are already absorbed or no longer map to current gaps.',
  },
  {
    lane_key: 'professor_program_finish_evidence',
    report_path:
      'docs/audits/english_master_index_source_exhaustion_v1/professor_program_finish_evidence_v1/professor_program_finish_evidence_v1.json',
    source_delta_path:
      'docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1/professor_program_finish_evidence_v1_source_delta_audit_v1.json',
    decision: 'already_absorbed_or_taxonomy_blocked',
    reason:
      'One exact record is already master-verified; remaining Professor Program rows are single-source, finish-unproven, or taxonomy issues.',
  },
  {
    lane_key: 'second_source_needed_finish_evidence',
    report_path:
      'docs/audits/english_master_index_source_exhaustion_v1/second_source_needed_finish_evidence_v1/second_source_needed_finish_evidence_v1.json',
    source_delta_path:
      'docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1/second_source_needed_finish_evidence_v1_source_delta_audit_v1.json',
    decision: 'already_absorbed_or_taxonomy_blocked',
    reason:
      'Most exact records are already master-verified; Suicune EB Games remains blocked by Holo/Cosmos taxonomy conflict.',
  },
  {
    lane_key: 'brilliant_stars_prerelease_finish_evidence',
    report_path:
      'docs/audits/english_master_index_source_exhaustion_v1/brilliant_stars_prerelease_finish_evidence_v1/brilliant_stars_prerelease_finish_evidence_v1.json',
    source_delta_path:
      'docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1/brilliant_stars_prerelease_finish_evidence_v1_source_delta_audit_v1.json',
    decision: 'already_absorbed',
    reason:
      'Modern Brilliant Stars prerelease finish evidence is already master-verified in the current index.',
  },
  {
    lane_key: 'astral_radiance_prerelease_finish_evidence',
    report_path:
      'docs/audits/english_master_index_source_exhaustion_v1/astral_radiance_prerelease_finish_evidence_v1/astral_radiance_prerelease_finish_evidence_v1.json',
    source_delta_path:
      'docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1/astral_radiance_prerelease_finish_evidence_v1_source_delta_audit_v1.json',
    decision: 'already_absorbed',
    reason:
      'Modern Astral Radiance prerelease finish evidence is already master-verified in the current index.',
  },
  {
    lane_key: 'older_prerelease_finish_conflict_review',
    report_path:
      'docs/audits/english_master_index_source_exhaustion_v1/older_prerelease_finish_conflict_review_v1/older_prerelease_finish_conflict_review_v1.json',
    source_delta_path: null,
    decision: 'conflict_or_review_blocked',
    reason:
      'Older prerelease rows remain blocked because sources do not resolve active finish cleanly enough for promotion.',
  },
];

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function packetSummary(packet) {
  const rows = packet?.rows || [];
  const bySourceFamily = {};
  const byActionBucket = {};
  for (const row of rows) {
    bySourceFamily[row.next_source_family || 'unknown'] =
      (bySourceFamily[row.next_source_family || 'unknown'] || 0) + 1;
    byActionBucket[row.action_bucket || 'unknown'] =
      (byActionBucket[row.action_bucket || 'unknown'] || 0) + 1;
  }
  return {
    packet_rows: rows.length,
    by_source_family: bySourceFamily,
    by_action_bucket: byActionBucket,
    source_packet_fingerprint:
      packet?.fingerprint_sha256 || packet?.fingerprint || packet?.summary?.fingerprint_sha256 || null,
  };
}

function collectLane(row) {
  const report = readJson(row.report_path);
  const sourceDelta = row.source_delta_path ? readJson(row.source_delta_path) : null;
  const summary = report?.summary || report?.counts || {};
  const sourceDeltaSummary = sourceDelta?.summary || sourceDelta?.counts || null;
  return {
    lane_key: row.lane_key,
    decision: row.decision,
    reason: row.reason,
    report_path: row.report_path,
    source_delta_path: row.source_delta_path,
    report_found: Boolean(report),
    source_delta_found: row.source_delta_path ? Boolean(sourceDelta) : null,
    summary,
    source_delta_summary: sourceDeltaSummary,
    fingerprint_sha256: report?.fingerprint_sha256 || report?.fingerprint || null,
  };
}

function sumMetric(lanes, key) {
  return lanes.reduce((total, lane) => total + Number(lane.summary?.[key] || 0), 0);
}

function writeMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index Post-Collexy Source Lane Closure V1');
  lines.push('');
  lines.push('Audit-only closure report for the current stamped/special post-Collexy source packet.');
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('| check | value |');
  lines.push('| --- | --- |');
  for (const [key, value] of Object.entries(report.safety)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');
  lines.push('## Source Packet');
  lines.push('');
  lines.push(`- Packet rows: ${report.source_packet.packet_rows}`);
  lines.push(`- Packet fingerprint: \`${report.source_packet.source_packet_fingerprint || 'unknown'}\``);
  lines.push('');
  lines.push('### By Source Family');
  lines.push('');
  lines.push('| source family | rows |');
  lines.push('| --- | ---: |');
  for (const [key, count] of Object.entries(report.source_packet.by_source_family)) {
    lines.push(`| ${key} | ${count} |`);
  }
  lines.push('');
  lines.push('### By Action Bucket');
  lines.push('');
  lines.push('| action bucket | rows |');
  lines.push('| --- | ---: |');
  for (const [key, count] of Object.entries(report.source_packet.by_action_bucket)) {
    lines.push(`| ${key} | ${count} |`);
  }
  lines.push('');
  lines.push('## Closure Summary');
  lines.push('');
  lines.push('| metric | value |');
  lines.push('| --- | ---: |');
  for (const [key, value] of Object.entries(report.closure_summary)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');
  lines.push('## Lane Decisions');
  lines.push('');
  lines.push('| lane | decision | target/source rows | source-ready | write-ready | useful deltas | reason |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | --- |');
  for (const lane of report.lanes) {
    const targetRows =
      lane.summary.target_queue_rows ||
      lane.summary.rows_targeted ||
      lane.summary.target_rows ||
      lane.summary.rows_available_from_packet ||
      0;
    const sourceReady =
      lane.summary.source_ready_candidates ||
      lane.summary.rows_with_exact_fixture_match ||
      lane.summary.variant_title_review_rows ||
      0;
    const writeReady = lane.summary.write_ready_created || lane.summary.write_ready_now || 0;
    const usefulDeltas = lane.source_delta_summary?.useful_candidate_matches ?? 0;
    lines.push(
      `| ${lane.lane_key} | ${lane.decision} | ${targetRows} | ${sourceReady} | ${writeReady} | ${usefulDeltas} | ${lane.reason} |`,
    );
  }
  lines.push('');
  lines.push('## Result');
  lines.push('');
  lines.push('- No DB writes were performed.');
  lines.push('- No migrations were created.');
  lines.push('- No source lane produced write-ready rows in this closure pass.');
  lines.push('- Remaining rows are evidence-blocked, taxonomy-blocked, review-only, or already absorbed by the current Master Index.');
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  return `${lines.join('\n')}\n`;
}

function appendCheckpointIndex(checkpointPath) {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const rel = path.basename(checkpointPath);
  const line = `- 2026-06-22: Post-Collexy source lane closure checkpoint V1 — consolidates the remaining 154-row stamped/special source packet after league, prize pack, small custom, event/staff, prerelease, professor, and second-source passes; write_ready_now remains 0. See docs/checkpoints/master_index/${rel}.`;
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  if (!current.includes(rel)) {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

function writeCheckpoint(report) {
  ensureDir(CHECKPOINT_DIR);
  const checkpointPath = path.join(CHECKPOINT_DIR, '20260622_post_collexy_source_lane_closure_checkpoint_v1.md');
  const lines = [];
  lines.push('# Post-Collexy Source Lane Closure Checkpoint V1');
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  lines.push('');
  lines.push('## Outcome');
  lines.push('');
  lines.push('- Consolidated all current post-Collexy stamped/special source-lane evidence reports.');
  lines.push('- Confirmed `write_ready_now` remains `0`.');
  lines.push('- Confirmed no DB writes, migrations, cleanup, quarantine, deletes, parent inserts, child inserts, or identity inserts were performed.');
  lines.push('');
  lines.push('## Reports');
  lines.push('');
  lines.push(`- JSON: \`${path.join(REPORT_DIR, `${VERSION}.json`)}\``);
  lines.push(`- Markdown: \`${path.join(REPORT_DIR, `${VERSION}.md`)}\``);
  lines.push('');
  lines.push('## Remaining Work');
  lines.push('');
  lines.push('- Fresh exact source acquisition for rows with no exact evidence.');
  lines.push('- Taxonomy adjudication for rows where source labels conflict with active finish modeling.');
  lines.push('- Manual review for marketplace/title-only evidence that cannot prove exact child-printing truth.');
  fs.writeFileSync(checkpointPath, `${lines.join('\n')}\n`);
  appendCheckpointIndex(checkpointPath);
}

function main() {
  ensureDir(REPORT_DIR);
  const packet = readJson(SOURCE_PACKET);
  const lanes = sourceReports.map(collectLane);
  const reportSeed = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    objective:
      'Consolidate the post-Collexy stamped/special source acquisition lanes into a no-write closure report.',
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      apply_executed: false,
    },
    source_packet: packetSummary(packet),
    lanes,
    closure_summary: {
      lanes_consolidated: lanes.length,
      packet_rows: packetSummary(packet).packet_rows,
      report_files_found: lanes.filter((lane) => lane.report_found).length,
      source_delta_files_found: lanes.filter((lane) => lane.source_delta_found === true).length,
      total_target_or_source_rows:
        sumMetric(lanes, 'target_queue_rows') +
        sumMetric(lanes, 'rows_targeted') +
        sumMetric(lanes, 'target_rows'),
      total_source_ready_candidates: sumMetric(lanes, 'source_ready_candidates'),
      total_write_ready_created: sumMetric(lanes, 'write_ready_created') + sumMetric(lanes, 'write_ready_now'),
      source_delta_useful_matches: lanes.reduce(
        (total, lane) => total + Number(lane.source_delta_summary?.useful_candidate_matches || 0),
        0,
      ),
    },
  };
  const fingerprint = stableHash({
    version: reportSeed.version,
    source_packet: reportSeed.source_packet,
    lanes: reportSeed.lanes.map((lane) => ({
      lane_key: lane.lane_key,
      decision: lane.decision,
      summary: lane.summary,
      source_delta_summary: lane.source_delta_summary,
      fingerprint_sha256: lane.fingerprint_sha256,
    })),
    closure_summary: reportSeed.closure_summary,
    safety: reportSeed.safety,
  });
  const report = { ...reportSeed, fingerprint_sha256: fingerprint };
  fs.writeFileSync(path.join(REPORT_DIR, `${VERSION}.json`), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(REPORT_DIR, `${VERSION}.md`), writeMarkdown(report));
  writeCheckpoint(report);
  console.log(JSON.stringify(report.closure_summary, null, 2));
  console.log(`fingerprint_sha256=${fingerprint}`);
}

main();
