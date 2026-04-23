import '../../backend/env.mjs';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runQuarantineVisibilityReportV1 } from './runtime_automation_v1.mjs';

export async function runQuarantineReportV1() {
  return runQuarantineVisibilityReportV1();
}

async function main() {
  const result = await runQuarantineReportV1();
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
