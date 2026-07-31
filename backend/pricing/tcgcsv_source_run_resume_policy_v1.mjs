export const TCGCSV_SOURCE_RUN_RESUME_POLICY_V1 =
  "TCGCSV_SOURCE_RUN_RESUME_POLICY_V1";

const SUCCESSFUL_TERMINAL_STATUSES = new Set([
  "completed",
  "skipped_no_change",
]);

export function evaluateTcgcsvSourceRunResumeV1(existingRun, expected) {
  if (!existingRun) {
    return {
      action: "start",
      policy_version: TCGCSV_SOURCE_RUN_RESUME_POLICY_V1,
      mismatches: [],
    };
  }

  const fields = [
    "sync_mode",
    "git_commit_sha",
    "worker_version",
    "parser_version",
    "schema_contract_version",
  ];
  const mismatches = fields
    .filter((field) => existingRun[field] !== expected[field])
    .map((field) => ({
      field,
      existing: existingRun[field] ?? null,
      expected: expected[field] ?? null,
    }));

  if (mismatches.length > 0) {
    return {
      action: "reject",
      policy_version: TCGCSV_SOURCE_RUN_RESUME_POLICY_V1,
      mismatches,
    };
  }

  if (
    SUCCESSFUL_TERMINAL_STATUSES.has(existingRun.status) &&
    Number(existingRun.failed_count ?? 0) === 0
  ) {
    return {
      action: "resume_terminal",
      policy_version: TCGCSV_SOURCE_RUN_RESUME_POLICY_V1,
      mismatches: [],
    };
  }

  return {
    action: "retry",
    policy_version: TCGCSV_SOURCE_RUN_RESUME_POLICY_V1,
    mismatches: [],
  };
}
