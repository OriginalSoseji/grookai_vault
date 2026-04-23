import '../../backend/env.mjs';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runRuntimeHealthChecksV1 } from './runtime_automation_v1.mjs';

export async function runRuntimeHealthV1() {
  return runRuntimeHealthChecksV1();
}

async function main() {
  const result = await runRuntimeHealthV1();
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
