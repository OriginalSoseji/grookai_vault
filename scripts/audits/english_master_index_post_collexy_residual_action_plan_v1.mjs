import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const VERSION = 'english_master_index_post_collexy_residual_action_plan_v1';
const REPORT_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const CHECKPOINT_DIR = 'docs/checkpoints/master_index';
const PACKET_PATH = path.join(
  REPORT_DIR,
  'english_master_index_stamped_special_post_collexy_source_packet_v1.json',
);
const CLOSURE_PATH = path.join(REPORT_DIR, 'english_master_index_post_collexy_source_lane_closure_v1.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function increment(target, key) {
  target[key] = (target[key] || 0) + 1;
}

function blockerFor(row) {
  if (row.next_source_family === 'league_marketplace_scan_sources') {
    return {
      blocker_class: 'exact_finish_binding_missing',
      source_state: 'marketplace_title_review_exhausted',
      allowed_next_action:
        'Use only clear scan/listing/checklist evidence that proves set, number, card name, League Stamp, and active finish together.',
      prohibited_action:
        'Do not promote title-only League Stamp or crosshatch wording as exact finish truth.',
    };
  }

  if (row.next_source_family === 'official_prize_pack_or_product_pdf_recheck') {
    return {
      blocker_class: 'official_fixture_preservation_only_or_missing',
      source_state: 'current_fixture_recheck_exhausted',
      allowed_next_action:
        'Acquire exact Prize Pack card-level checklist or product image evidence with finish; preserved rows remain review context only.',
      prohibited_action:
        'Do not infer Prize Pack finish from set-wide pack rules or preserved partial fixtures.',
    };
  }

  if (row.next_source_family === 'individual_event_stamp_sources') {
    return {
      blocker_class: 'individual_event_scan_needed',
      source_state: 'existing_exact_fixtures_already_absorbed_or_unmatched',
      allowed_next_action:
        'Target event-specific pages, scans, or archived product pages that bind exact stamp/event and active finish.',
      prohibited_action:
        'Do not promote event identity without exact active finish evidence.',
    };
  }

  if (row.next_source_family === 'worlds_event_staff_sources') {
    return {
      blocker_class: 'event_staff_exact_finish_missing_or_absorbed',
      source_state: 'event_staff_delta_exhausted',
      allowed_next_action:
        'Use independent event/staff source evidence only when it binds exact card identity, staff/event stamp, and active finish.',
      prohibited_action:
        'Do not rely on event/staff title labels without finish proof.',
    };
  }

  if (row.next_source_family === 'targeted_exact_source_search') {
    if (row.action_bucket === 'professor_program_exact_finish_source') {
      return {
        blocker_class: 'professor_program_taxonomy_or_finish_blocked',
        source_state: 'targeted_professor_program_checked',
        allowed_next_action:
          'Resolve deck-stamp taxonomy and collect exact active-finish evidence for rows not already absorbed.',
        prohibited_action:
          'Do not treat Professor Program identity as a finish or promote deck-stamp taxonomy conflicts.',
      };
    }
    if (row.action_bucket === 'prerelease_exact_finish_source') {
      return {
        blocker_class: 'prerelease_finish_absorbed_or_conflict_blocked',
        source_state: 'targeted_prerelease_checked',
        allowed_next_action:
          'For older prerelease rows, require exact card-level finish evidence from independent source; modern SWSH rows are already absorbed.',
        prohibited_action:
          'Do not infer old prerelease active finish from generic prerelease promo status.',
      };
    }
    return {
      blocker_class: 'second_source_taxonomy_or_absorption_blocked',
      source_state: 'targeted_second_source_checked',
      allowed_next_action:
        'Resolve Holo/Cosmos or finish taxonomy conflicts, then rerun source-delta only when exact evidence changes.',
      prohibited_action:
        'Do not promote a row when exact sources use conflicting finish vocabulary.',
      };
  }

  return {
    blocker_class: 'unclassified_review_required',
    source_state: 'unknown',
    allowed_next_action: 'Manual review required before any future source or dry-run work.',
    prohibited_action: 'Do not promote.',
  };
}

function packetFingerprint(packet) {
  return packet.fingerprint_sha256 || packet.fingerprint || packet.summary?.fingerprint_sha256 || null;
}

function buildRows(packetRows) {
  return packetRows.map((row) => ({
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    action_bucket: row.action_bucket,
    next_source_family: row.next_source_family,
    priority_rank: row.priority_rank,
    evidence_requirement: row.evidence_requirement,
    ...blockerFor(row),
    search_queries: row.search_queries || [],
    write_ready_now: false,
  }));
}

function summarize(rows) {
  const byBlockerClass = {};
  const bySourceFamily = {};
  const byActionBucket = {};
  const bySet = {};
  for (const row of rows) {
    increment(byBlockerClass, row.blocker_class);
    increment(bySourceFamily, row.next_source_family || 'unknown');
    increment(byActionBucket, row.action_bucket || 'unknown');
    increment(bySet, row.set_key || 'unknown');
  }
  return {
    residual_rows: rows.length,
    write_ready_now: 0,
    by_blocker_class: byBlockerClass,
    by_source_family: bySourceFamily,
    by_action_bucket: byActionBucket,
    top_sets: Object.fromEntries(
      Object.entries(bySet)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 20),
    ),
  };
}

function writeMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index Post-Collexy Residual Action Plan V1');
  lines.push('');
  lines.push('No-write row-level action plan for the remaining stamped/special source packet.');
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('| check | value |');
  lines.push('| --- | --- |');
  for (const [key, value] of Object.entries(report.safety)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| metric | value |');
  lines.push('| --- | ---: |');
  lines.push(`| residual_rows | ${report.summary.residual_rows} |`);
  lines.push(`| write_ready_now | ${report.summary.write_ready_now} |`);
  lines.push('');
  lines.push('### By Blocker Class');
  lines.push('');
  lines.push('| blocker class | rows |');
  lines.push('| --- | ---: |');
  for (const [key, count] of Object.entries(report.summary.by_blocker_class)) {
    lines.push(`| ${key} | ${count} |`);
  }
  lines.push('');
  lines.push('### Next Work');
  lines.push('');
  lines.push('1. Work `exact_finish_binding_missing` only with scan/checklist evidence that binds stamp and finish on the same row.');
  lines.push('2. Work `individual_event_scan_needed` only with event-specific pages or clear scans.');
  lines.push('3. Keep taxonomy-conflict rows blocked until finish/variant governance is updated.');
  lines.push('4. Do not prepare dry-run packages from this report; it is an acquisition queue only.');
  lines.push('');
  lines.push('## Row Queue');
  lines.push('');
  lines.push('| set | number | card | stamp | blocker | source state | next action |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const row of report.rows) {
    lines.push(
      `| ${row.set_key} | ${row.card_number} | ${row.card_name} | ${row.stamp_label || row.variant_key || ''} | ${row.blocker_class} | ${row.source_state} | ${row.allowed_next_action} |`,
    );
  }
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  return `${lines.join('\n')}\n`;
}

function appendCheckpointIndex(checkpointFile) {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  const rel = path.basename(checkpointFile);
  const line = `- 2026-06-22: Post-Collexy residual action plan checkpoint V1 — creates a no-write row-level action plan for the remaining 154 stamped/special source rows; write_ready_now remains 0. See docs/checkpoints/master_index/${rel}.`;
  if (!current.includes(rel)) {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

function writeCheckpoint(report) {
  ensureDir(CHECKPOINT_DIR);
  const checkpointFile = path.join(CHECKPOINT_DIR, '20260622_post_collexy_residual_action_plan_checkpoint_v1.md');
  const lines = [];
  lines.push('# Post-Collexy Residual Action Plan Checkpoint V1');
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  lines.push('');
  lines.push('## Outcome');
  lines.push('');
  lines.push(`- Residual rows classified: ${report.summary.residual_rows}`);
  lines.push('- `write_ready_now`: 0');
  lines.push('- This is an acquisition/control report only.');
  lines.push('- No DB writes, migrations, deletes, cleanup, parent inserts, child inserts, or identity inserts occurred.');
  lines.push('');
  lines.push('## Report Files');
  lines.push('');
  lines.push(`- \`${path.join(REPORT_DIR, `${VERSION}.json`)}\``);
  lines.push(`- \`${path.join(REPORT_DIR, `${VERSION}.md`)}\``);
  fs.writeFileSync(checkpointFile, `${lines.join('\n')}\n`);
  appendCheckpointIndex(checkpointFile);
}

function main() {
  ensureDir(REPORT_DIR);
  const packet = readJson(PACKET_PATH);
  const closure = fs.existsSync(CLOSURE_PATH) ? readJson(CLOSURE_PATH) : null;
  const rows = buildRows(packet.rows || []);
  const summary = summarize(rows);
  const seed = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    source_packet_path: PACKET_PATH,
    source_packet_fingerprint: packetFingerprint(packet),
    closure_report_path: CLOSURE_PATH,
    closure_fingerprint: closure?.fingerprint_sha256 || null,
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      apply_executed: false,
      dry_run_package_prepared: false,
    },
    summary,
    rows,
  };
  const fingerprint = stableHash({
    version: seed.version,
    source_packet_fingerprint: seed.source_packet_fingerprint,
    closure_fingerprint: seed.closure_fingerprint,
    summary: seed.summary,
    rows: seed.rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      action_bucket: row.action_bucket,
      next_source_family: row.next_source_family,
      blocker_class: row.blocker_class,
      source_state: row.source_state,
    })),
    safety: seed.safety,
  });
  const report = { ...seed, fingerprint_sha256: fingerprint };
  fs.writeFileSync(path.join(REPORT_DIR, `${VERSION}.json`), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(REPORT_DIR, `${VERSION}.md`), writeMarkdown(report));
  writeCheckpoint(report);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`fingerprint_sha256=${fingerprint}`);
}

main();
