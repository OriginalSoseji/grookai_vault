import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const VERSION = 'english_master_index_post_collexy_source_acquisition_queue_v1';
const REPORT_DIR = 'docs/audits/verified_master_set_index_v1/english_master_index_v1';
const CHECKPOINT_DIR = 'docs/checkpoints/master_index';
const ACTION_PLAN_PATH = path.join(REPORT_DIR, 'english_master_index_post_collexy_residual_action_plan_v1.json');

const SOURCE_TARGETS = [
  { key: 'google_general', label: 'General web', urlFor: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { key: 'google_images', label: 'Image search', urlFor: (q) => `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}` },
  { key: 'ebay_active', label: 'eBay active', urlFor: (q) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}` },
  { key: 'ebay_sold', label: 'eBay sold UI', urlFor: (q) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Sold=1&LH_Complete=1` },
  { key: 'worthpoint', label: 'Worthpoint', urlFor: (q) => `https://www.worthpoint.com/inventory/search?query=${encodeURIComponent(q)}` },
  { key: 'tcgplayer', label: 'TCGplayer', urlFor: (q) => `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeURIComponent(q)}` },
  { key: 'pricecharting', label: 'PriceCharting', urlFor: (q) => `https://www.pricecharting.com/search-products?q=${encodeURIComponent(q)}&type=prices` },
];

const BLOCKER_ORDER = [
  'individual_event_scan_needed',
  'exact_finish_binding_missing',
  'official_fixture_preservation_only_or_missing',
  'event_staff_exact_finish_missing_or_absorbed',
  'second_source_taxonomy_or_absorption_blocked',
  'prerelease_finish_absorbed_or_conflict_blocked',
  'professor_program_taxonomy_or_finish_blocked',
];

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function baseQuery(row) {
  return [
    row.card_name,
    row.card_number,
    row.set_name || row.set_key,
    row.stamp_label || row.variant_key,
    'Pokemon card',
  ]
    .filter(Boolean)
    .map((part) => `"${part}"`)
    .join(' ');
}

function finishQuery(row) {
  return `${baseQuery(row)} finish holo reverse normal cosmos`;
}

function stampScanQuery(row) {
  return `${baseQuery(row)} scan front`;
}

function sourceUrls(row) {
  const query = row.blocker_class === 'exact_finish_binding_missing' ? finishQuery(row) : stampScanQuery(row);
  return SOURCE_TARGETS.map((target) => ({
    source_target: target.key,
    label: target.label,
    query,
    url: target.urlFor(query),
  }));
}

function priorityScore(row) {
  const blockerWeight = BLOCKER_ORDER.indexOf(row.blocker_class);
  const normalizedBlockerWeight = blockerWeight === -1 ? 99 : blockerWeight;
  const sourceWeight = Number(row.priority_rank || 50);
  return normalizedBlockerWeight * 1000 + sourceWeight;
}

function buildRows(rows) {
  return [...rows]
    .sort((a, b) => priorityScore(a) - priorityScore(b) || a.set_key.localeCompare(b.set_key) || a.card_number.localeCompare(b.card_number))
    .map((row, index) => ({
      queue_rank: index + 1,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      blocker_class: row.blocker_class,
      source_state: row.source_state,
      evidence_requirement: row.evidence_requirement,
      accepted_evidence_rule:
        'Accept only if one source proves set + card number + card name + exact stamp/variant + active finish on the same listing/page/scan.',
      rejected_evidence_rule:
        'Reject title-only, generic stamp-family, set-wide, era-wide, or finish-inferred evidence.',
      search_urls: sourceUrls(row),
      write_ready_now: false,
    }));
}

function summarize(rows) {
  const byBlocker = {};
  const bySet = {};
  for (const row of rows) {
    byBlocker[row.blocker_class] = (byBlocker[row.blocker_class] || 0) + 1;
    bySet[row.set_key] = (bySet[row.set_key] || 0) + 1;
  }
  return {
    acquisition_rows: rows.length,
    source_targets_per_row: SOURCE_TARGETS.length,
    total_source_urls: rows.length * SOURCE_TARGETS.length,
    write_ready_now: 0,
    by_blocker_class: byBlocker,
    top_sets: Object.fromEntries(
      Object.entries(bySet)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 20),
    ),
  };
}

function writeCsv(rows, csvPath) {
  const headers = [
    'queue_rank',
    'set_key',
    'set_name',
    'card_number',
    'card_name',
    'stamp_label',
    'variant_key',
    'blocker_class',
    'source_state',
    'accepted_evidence_rule',
    'rejected_evidence_rule',
    'general_web_url',
    'image_search_url',
    'ebay_active_url',
    'ebay_sold_url',
    'worthpoint_url',
    'tcgplayer_url',
    'pricecharting_url',
  ];
  const lines = [headers.join(',')];
  for (const row of rows) {
    const urlByKey = Object.fromEntries(row.search_urls.map((item) => [item.source_target, item.url]));
    lines.push(
      [
        row.queue_rank,
        row.set_key,
        row.set_name,
        row.card_number,
        row.card_name,
        row.stamp_label,
        row.variant_key,
        row.blocker_class,
        row.source_state,
        row.accepted_evidence_rule,
        row.rejected_evidence_rule,
        urlByKey.google_general,
        urlByKey.google_images,
        urlByKey.ebay_active,
        urlByKey.ebay_sold,
        urlByKey.worthpoint,
        urlByKey.tcgplayer,
        urlByKey.pricecharting,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  fs.writeFileSync(csvPath, `${lines.join('\n')}\n`);
}

function writeMarkdown(report) {
  const lines = [];
  lines.push('# English Master Index Post-Collexy Source Acquisition Queue V1');
  lines.push('');
  lines.push('No-write acquisition queue for the remaining stamped/special rows.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| metric | value |');
  lines.push('| --- | ---: |');
  for (const [key, value] of Object.entries(report.summary)) {
    if (typeof value !== 'object') lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- No DB writes.');
  lines.push('- No migrations.');
  lines.push('- No apply, cleanup, delete, parent insert, child insert, or identity insert.');
  lines.push('- This queue is for source acquisition only.');
  lines.push('');
  lines.push('## Acceptance Rule');
  lines.push('');
  lines.push('Accept evidence only when one source proves set + card number + card name + exact stamp/variant + active finish on the same listing, page, checklist, or scan.');
  lines.push('');
  lines.push('## First 40 Rows');
  lines.push('');
  lines.push('| rank | set | number | card | stamp | blocker |');
  lines.push('| ---: | --- | --- | --- | --- | --- |');
  for (const row of report.rows.slice(0, 40)) {
    lines.push(`| ${row.queue_rank} | ${row.set_key} | ${row.card_number} | ${row.card_name} | ${row.stamp_label || row.variant_key || ''} | ${row.blocker_class} |`);
  }
  lines.push('');
  lines.push(`CSV: \`${report.csv_path}\``);
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  return `${lines.join('\n')}\n`;
}

function appendCheckpointIndex(checkpointFile) {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  const rel = path.basename(checkpointFile);
  const line = `- 2026-06-22: Post-Collexy source acquisition queue checkpoint V1 — exports 154 residual stamped/special rows into a no-write source acquisition CSV/JSON/Markdown queue with exact-evidence rules. See docs/checkpoints/master_index/${rel}.`;
  if (!current.includes(rel)) {
    fs.writeFileSync(indexPath, `${current.trimEnd()}\n${line}\n`);
  }
}

function writeCheckpoint(report) {
  ensureDir(CHECKPOINT_DIR);
  const checkpointFile = path.join(CHECKPOINT_DIR, '20260622_post_collexy_source_acquisition_queue_checkpoint_v1.md');
  const lines = [];
  lines.push('# Post-Collexy Source Acquisition Queue Checkpoint V1');
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  lines.push('');
  lines.push('## Outcome');
  lines.push('');
  lines.push(`- Acquisition rows exported: ${report.summary.acquisition_rows}`);
  lines.push(`- Source URLs generated: ${report.summary.total_source_urls}`);
  lines.push('- `write_ready_now`: 0');
  lines.push('- No DB writes, migrations, applies, cleanup, or dry-run package preparation occurred.');
  lines.push('');
  lines.push('## Artifacts');
  lines.push('');
  lines.push(`- JSON: \`${path.join(REPORT_DIR, `${VERSION}.json`)}\``);
  lines.push(`- Markdown: \`${path.join(REPORT_DIR, `${VERSION}.md`)}\``);
  lines.push(`- CSV: \`${report.csv_path}\``);
  fs.writeFileSync(checkpointFile, `${lines.join('\n')}\n`);
  appendCheckpointIndex(checkpointFile);
}

function main() {
  ensureDir(REPORT_DIR);
  const actionPlan = JSON.parse(fs.readFileSync(ACTION_PLAN_PATH, 'utf8'));
  const rows = buildRows(actionPlan.rows || []);
  const summary = summarize(rows);
  const csvPath = path.join(REPORT_DIR, `${VERSION}.csv`);
  const seed = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    action_plan_path: ACTION_PLAN_PATH,
    action_plan_fingerprint: actionPlan.fingerprint_sha256,
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      apply_executed: false,
      dry_run_package_prepared: false,
    },
    summary,
    csv_path: csvPath,
    source_targets: SOURCE_TARGETS.map(({ key, label }) => ({ key, label })),
    rows,
  };
  const fingerprint = stableHash({
    version: seed.version,
    action_plan_fingerprint: seed.action_plan_fingerprint,
    summary: seed.summary,
    source_targets: seed.source_targets,
    rows: seed.rows.map((row) => ({
      queue_rank: row.queue_rank,
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      blocker_class: row.blocker_class,
    })),
    safety: seed.safety,
  });
  const report = { ...seed, fingerprint_sha256: fingerprint };
  writeCsv(rows, csvPath);
  fs.writeFileSync(path.join(REPORT_DIR, `${VERSION}.json`), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(REPORT_DIR, `${VERSION}.md`), writeMarkdown(report));
  writeCheckpoint(report);
  console.log(JSON.stringify(summary, null, 2));
  console.log(`fingerprint_sha256=${fingerprint}`);
}

main();
