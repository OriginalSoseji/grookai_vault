#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const defaultReportPath = path.resolve(
  '.tmp',
  'scanner_v4_real_device_reports',
  'scanner_v4_real_device_auto_test_report_v1.json',
);
const reportPath = path.resolve(process.argv[2] ?? defaultReportPath);

try {
  const reportText = fs.readFileSync(reportPath, 'utf8').replace(/^\uFEFF/, '');
  const report = JSON.parse(reportText);
  const phases = Array.isArray(report.phases) ? report.phases : [];
  if (phases.length === 0) {
    throw new Error('report has no phases array');
  }

  let hasFail = false;
  const cleanSummaries = [];
  const detailLines = [];
  const displayPhase = (phaseId) =>
    ({
      empty_desk: 'EMPTY_DESK',
      partial_edge: 'PARTIAL_EDGE',
      real_card: 'REAL_CARD',
    })[phaseId] ?? phaseId.toUpperCase();

  for (const phase of phases) {
    const phaseId = String(phase.phase ?? 'unknown');
    const evaluation = phase.evaluation ?? {};
    const summary = phase.summary ?? {};
    const status = String(evaluation.status ?? 'FAIL');
    if (status === 'FAIL') hasFail = true;
    const warnings = Array.isArray(evaluation.warnings)
      ? evaluation.warnings.join(',')
      : '';
    cleanSummaries.push(`${displayPhase(phaseId)}: ${status}`);
    detailLines.push(
      [
        `${phaseId}: ${status}`,
        `total=${summary.total_frames ?? 0}`,
        `native=${summary.native_success_frames ?? 0}`,
        `card_present=${summary.card_present_frames ?? 0}`,
        `identity_allowed=${summary.identity_allowed_frames ?? 0}`,
        `identity_started=${summary.identity_started_frames ?? 0}`,
        `ordering=${evaluation.ordering_check ?? 'unavailable'}`,
        `reason=${evaluation.reason ?? 'unavailable'}`,
        warnings.length > 0 ? `warnings=${warnings}` : null,
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  console.log('[scanner_v4_auto_test] phase_summary');
  for (const line of cleanSummaries) {
    console.log(line);
  }
  console.log('[scanner_v4_auto_test] phase_detail');
  for (const line of detailLines) {
    console.log(line);
  }

  const overall = report.overall_summary ?? {};
  console.log(
    [
      'overall:',
      `total=${overall.total_frames ?? 0}`,
      `native=${overall.native_success_frames ?? 0}`,
      `card_present=${overall.card_present_frames ?? 0}`,
      `identity_allowed=${overall.identity_allowed_frames ?? 0}`,
      `identity_started=${overall.identity_started_frames ?? 0}`,
    ].join(' '),
  );

  process.exit(hasFail ? 1 : 0);
} catch (error) {
  console.error(`scanner_v4_auto_test_report_parse_failed: ${error.message}`);
  process.exit(1);
}
