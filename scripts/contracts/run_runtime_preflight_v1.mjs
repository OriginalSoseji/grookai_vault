import '../../backend/env.mjs';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runDriftAuditV1 } from './run_drift_audit_v1.mjs';
import {
  runRuntimeHealthChecksV1,
  summarizeAutomationPreflightV1,
} from './runtime_automation_v1.mjs';

export async function runRuntimePreflightV1() {
  const [driftAudit, runtimeHealth] = await Promise.all([
    runDriftAuditV1(),
    runRuntimeHealthChecksV1(),
  ]);

  return summarizeAutomationPreflightV1({
    driftAudit,
    runtimeHealth,
  });
}

async function main() {
  const result = await runRuntimePreflightV1();
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'FAIL') {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
