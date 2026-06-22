import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REPORT_ROOT = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1');
const OUTPUT_DIR = path.join(REPORT_ROOT, 'stamped_special_overnight_closure_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'stamped_special_overnight_closure_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'stamped_special_overnight_closure_v1.md');
const CHECKPOINT_DIR = path.join(ROOT, 'docs', 'checkpoints', 'master_index');
const CHECKPOINT_FILE = path.join(CHECKPOINT_DIR, '20260622_stamped_special_overnight_closure_checkpoint_v1.md');

const INPUT_REPORTS = [
  {
    key: 'individual_event_scan_source_acquisition_v2',
    path: path.join(REPORT_ROOT, 'individual_event_scan_source_acquisition_v2', 'individual_event_scan_source_acquisition_v2.json'),
  },
  {
    key: 'exact_finish_binding_consolidation_v1',
    path: path.join(REPORT_ROOT, 'exact_finish_binding_consolidation_v1', 'exact_finish_binding_consolidation_v1.json'),
  },
  {
    key: 'exact_finish_binding_manual_web_pass_v1',
    path: path.join(REPORT_ROOT, 'exact_finish_binding_manual_web_pass_v1', 'exact_finish_binding_manual_web_pass_v1.json'),
  },
  {
    key: 'prize_pack_second_source_consolidation_v1',
    path: path.join(REPORT_ROOT, 'prize_pack_second_source_consolidation_v1', 'prize_pack_second_source_consolidation_v1.json'),
  },
  {
    key: 'event_staff_exact_source_consolidation_v1',
    path: path.join(REPORT_ROOT, 'event_staff_exact_source_consolidation_v1', 'event_staff_exact_source_consolidation_v1.json'),
  },
  {
    key: 'prerelease_professor_exact_source_consolidation_v1',
    path: path.join(REPORT_ROOT, 'prerelease_professor_exact_source_consolidation_v1', 'prerelease_professor_exact_source_consolidation_v1.json'),
  },
  {
    key: 'second_source_taxonomy_consolidation_v1',
    path: path.join(REPORT_ROOT, 'second_source_taxonomy_consolidation_v1', 'second_source_taxonomy_consolidation_v1.json'),
  },
];

const DELTA_REPORTS = [
  'individual_event_scan_source_acquisition_v2_source_delta_audit_v1.json',
  'pkmngg_stamped_finish_source_delta_audit_v1.json',
  'cardtrader_stamped_finish_source_delta_audit_v1.json',
  'pokecardvalues_stamped_finish_source_delta_audit_v1.json',
  'tcgcsv_prize_pack_title_finish_source_delta_audit_v1.json',
  'bulbapedia_prize_pack_normal_source_delta_audit_v1.json',
  'bulbapedia_prize_pack_foil_source_delta_audit_v1.json',
  'event_staff_exact_source_evidence_v1_source_delta_audit_v1.json',
  'brilliant_stars_prerelease_finish_evidence_v1_source_delta_audit_v1.json',
  'astral_radiance_prerelease_finish_evidence_v1_source_delta_audit_v1.json',
  'professor_program_finish_evidence_v1_source_delta_audit_v1.json',
  'pokumon_stamped_special_candidate_acquisition_v1_source_delta_audit_v1.json',
].map((file) => path.join(REPORT_ROOT, 'source_delta_audit_v1', file));

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
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

function mergeCounts(target, source = {}) {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + Number(value ?? 0);
  }
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function loadReports() {
  return INPUT_REPORTS.map((entry) => {
    const json = readJson(entry.path);
    return {
      key: entry.key,
      path: rel(entry.path),
      fingerprint_sha256: json.fingerprint_sha256 ?? null,
      summary: json.summary ?? {},
      safety: json.safety ?? {},
      row_count: Array.isArray(json.rows) ? json.rows.length : 0,
    };
  });
}

function loadDeltaReports() {
  return DELTA_REPORTS.filter((file) => fs.existsSync(file)).map((file) => {
    const json = readJson(file);
    return {
      path: rel(file),
      summary: json.summary ?? {},
    };
  });
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Stamped / Special Overnight Closure V1');
  lines.push('');
  lines.push('Audit-only closure report for the stamped/special source-exhaustion pass.');
  lines.push('');
  lines.push('- DB writes performed: false');
  lines.push('- Migrations created: false');
  lines.push('- Apply executed: false');
  lines.push('- Cleanup performed: false');
  lines.push('- Quarantine performed: false');
  lines.push('- Dry-run packages created: false');
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`- Reports consolidated: ${report.summary.reports_consolidated}`);
  lines.push(`- Target rows reviewed across reports: ${report.summary.target_rows_reviewed}`);
  lines.push(`- Preserved fixture records considered: ${report.summary.preserved_fixture_records_considered}`);
  lines.push(`- Fixture records created during acquisition: ${report.summary.fixture_records_created}`);
  lines.push(`- Write-ready rows/packages created: ${report.summary.write_ready_created}`);
  lines.push(`- Delta reports checked: ${report.summary.delta_reports_checked}`);
  lines.push(`- Useful gap-closing delta matches: ${report.summary.useful_delta_matches}`);
  lines.push('');
  lines.push('## Consolidated Status Counts');
  lines.push('');
  for (const [status, count] of Object.entries(report.summary.by_status)) {
    lines.push(`- ${status}: ${count}`);
  }
  lines.push('');
  lines.push('## Delta Outcome Counts');
  lines.push('');
  lines.push(`- Already in current index: ${report.summary.delta_already_in_current_index}`);
  lines.push(`- Useful candidate matches: ${report.summary.useful_delta_matches}`);
  lines.push(`- Unmatched candidate records: ${report.summary.delta_unmatched_candidate_records}`);
  lines.push('');
  lines.push('## Individual Reports');
  lines.push('');
  lines.push('| Report | Target Rows | Write-Ready | Path |');
  lines.push('| --- | ---: | ---: | --- |');
  for (const item of report.reports) {
    lines.push(`| ${item.key} | ${item.summary.target_rows ?? item.summary.rows_attempted ?? item.row_count ?? 0} | ${item.summary.write_ready_created ?? 0} | ${item.path} |`);
  }
  lines.push('');
  lines.push('## Operational Conclusion');
  lines.push('');
  lines.push('The overnight stamped/special pass did not create mutation authority. Candidate evidence was either already absorbed by the current Master Index, structured-only, conflicting, or still missing exact proof. Remaining rows should stay blocked until a future source provides exact set + card number + card name + stamp/variant + active finish + URL.');
  lines.push('');
  lines.push('## Next Safe Actions');
  lines.push('');
  lines.push('- Do not run a global apply from these reports.');
  lines.push('- Use the closure report as the handoff for future targeted source acquisition.');
  lines.push('- If new source evidence appears, run source-delta first and only prepare a guarded dry-run package if it is useful against the current gap file.');
  lines.push('- Keep generic stamped wording out of finish truth.');
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  return `${lines.join('\n')}\n`;
}

function appendCheckpointIndex() {
  const indexPath = path.join(CHECKPOINT_DIR, 'CHECKPOINT_INDEX.md');
  const current = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '# Master Index Checkpoints\n';
  const relFile = path.basename(CHECKPOINT_FILE);
  const line = `- 2026-06-22: Stamped/special overnight closure checkpoint — consolidates exhausted blocker reports with no DB writes. See docs/checkpoints/master_index/${relFile}.`;
  if (!current.includes(relFile)) writeText(indexPath, `${current.trimEnd()}\n${line}\n`);
}

function writeCheckpoint(report) {
  const lines = [];
  lines.push('# Stamped / Special Overnight Closure Checkpoint V1');
  lines.push('');
  lines.push('- Date: 2026-06-22');
  lines.push('- Mode: audit only');
  lines.push('- DB writes performed: false');
  lines.push('- Migrations created: false');
  lines.push('- Apply executed: false');
  lines.push('- Cleanup performed: false');
  lines.push('- Quarantine performed: false');
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  lines.push(`- Reports consolidated: ${report.summary.reports_consolidated}`);
  lines.push(`- Target rows reviewed: ${report.summary.target_rows_reviewed}`);
  lines.push(`- Write-ready rows/packages created: ${report.summary.write_ready_created}`);
  lines.push(`- Useful gap-closing delta matches: ${report.summary.useful_delta_matches}`);
  lines.push('');
  lines.push('## Artifacts');
  lines.push('');
  lines.push(`- Report: ${rel(OUTPUT_MD)}`);
  lines.push(`- JSON: ${rel(OUTPUT_JSON)}`);
  lines.push('');
  lines.push(`Fingerprint: \`${report.fingerprint_sha256}\``);
  writeText(CHECKPOINT_FILE, `${lines.join('\n')}\n`);
  appendCheckpointIndex();
}

function main() {
  const reports = loadReports();
  const deltaReports = loadDeltaReports();
  const byStatus = {};
  let targetRows = 0;
  let preservedFixtureRecords = 0;
  let fixtureRecordsCreated = 0;
  let writeReady = 0;
  for (const item of reports) {
    const summary = item.summary;
    targetRows += Number(summary.target_rows ?? summary.rows_attempted ?? 0);
    preservedFixtureRecords += Number(summary.preserved_fixture_records_considered ?? 0);
    fixtureRecordsCreated += Number(summary.fixture_records ?? 0);
    writeReady += Number(summary.write_ready_created ?? 0);
    mergeCounts(byStatus, summary.by_status);
  }
  let usefulDeltaMatches = 0;
  let deltaAlreadyInCurrentIndex = 0;
  let deltaUnmatchedCandidateRecords = 0;
  for (const item of deltaReports) {
    const summary = item.summary;
    usefulDeltaMatches += Number(summary.useful_candidate_matches ?? 0);
    deltaAlreadyInCurrentIndex += Number(summary.already_in_current_index ?? 0);
    deltaUnmatchedCandidateRecords += Number(summary.unmatched_candidate_records ?? 0);
  }
  const seed = {
    version: 'stamped_special_overnight_closure_v1',
    generated_at: new Date().toISOString(),
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      dry_run_package_prepared: false,
      cleanup_performed: false,
      quarantine_performed: false,
      apply_executed: false,
    },
    summary: {
      reports_consolidated: reports.length,
      target_rows_reviewed: targetRows,
      preserved_fixture_records_considered: preservedFixtureRecords,
      fixture_records_created: fixtureRecordsCreated,
      write_ready_created: writeReady,
      delta_reports_checked: deltaReports.length,
      useful_delta_matches: usefulDeltaMatches,
      delta_already_in_current_index: deltaAlreadyInCurrentIndex,
      delta_unmatched_candidate_records: deltaUnmatchedCandidateRecords,
      by_status: Object.fromEntries(Object.entries(byStatus).sort((left, right) => (
        Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
      ))),
    },
    reports,
    delta_reports: deltaReports,
  };
  const report = { ...seed, fingerprint_sha256: sha256(stableJson(seed)) };
  writeJson(OUTPUT_JSON, report);
  writeText(OUTPUT_MD, renderMarkdown(report));
  writeCheckpoint(report);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`fingerprint_sha256=${report.fingerprint_sha256}`);
}

main();
