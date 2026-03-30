import fs from 'fs/promises';
import path from 'path';

function summarizeFailure(caseResult, reason) {
  return {
    test: caseResult.id,
    reason,
  };
}

export function createReport({ mode, selectedCaseIds, schemaPath }) {
  return {
    version: 'V1',
    mode,
    selected_case_ids: selectedCaseIds,
    schema_path: schemaPath,
    generated_at: new Date().toISOString(),
    total: 0,
    passed: 0,
    failed: 0,
    failures: [],
    determinism_failures: [],
    schema_violations: [],
    semantic_violations: [],
    replay_failures: [],
    confidence_warnings: [],
    set_metrics: {
      set_correct: 0,
      set_unresolved_honest: 0,
      set_wrong: 0,
      set_ambiguous: 0,
    },
    cases: [],
  };
}

export function appendCaseReport(report, caseResult) {
  report.total += 1;
  if (caseResult.ok) {
    report.passed += 1;
  } else {
    report.failed += 1;
  }

  report.cases.push(caseResult);

  for (const failure of caseResult.failures) {
    report.failures.push(summarizeFailure(caseResult, failure));
  }
  for (const failure of caseResult.determinism_failures) {
    report.determinism_failures.push(summarizeFailure(caseResult, failure));
  }
  for (const failure of caseResult.schema_violations) {
    report.schema_violations.push(summarizeFailure(caseResult, failure));
  }
  for (const failure of caseResult.semantic_violations) {
    report.semantic_violations.push(summarizeFailure(caseResult, failure));
  }
  for (const failure of caseResult.replay_failures) {
    report.replay_failures.push(summarizeFailure(caseResult, failure));
  }
  for (const warning of caseResult.confidence_warnings) {
    report.confidence_warnings.push({
      test: caseResult.id,
      warning,
    });
  }

  if (caseResult.set_outcome && caseResult.set_outcome in report.set_metrics) {
    report.set_metrics[caseResult.set_outcome] += 1;
  }
}

export async function writeReport(report, outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

export function printReport(report, outputPath) {
  console.log('Extraction audit summary');
  console.log(`total=${report.total} passed=${report.passed} failed=${report.failed}`);
  console.log(
    `set_metrics=${JSON.stringify(report.set_metrics)}`,
  );

  if (report.determinism_failures.length > 0) {
    console.log('determinism failures:');
    for (const entry of report.determinism_failures) {
      console.log(`- ${entry.test}: ${entry.reason}`);
    }
  }

  if (report.schema_violations.length > 0) {
    console.log('schema violations:');
    for (const entry of report.schema_violations) {
      console.log(`- ${entry.test}: ${entry.reason}`);
    }
  }

  if (report.semantic_violations.length > 0) {
    console.log('semantic violations:');
    for (const entry of report.semantic_violations) {
      console.log(`- ${entry.test}: ${entry.reason}`);
    }
  }

  if (report.replay_failures.length > 0) {
    console.log('replay failures:');
    for (const entry of report.replay_failures) {
      console.log(`- ${entry.test}: ${entry.reason}`);
    }
  }

  console.log(`json_report=${outputPath}`);
  console.log(
    JSON.stringify(
      {
        total: report.total,
        passed: report.passed,
        failed: report.failed,
        set_metrics: report.set_metrics,
        failures: report.failures,
      },
      null,
      2,
    ),
  );
}
