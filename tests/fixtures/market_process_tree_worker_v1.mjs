import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const [role, marker, scenario] = process.argv.slice(2);
if (role === 'success') {
  console.log('complete');
} else if (role === 'writer') {
  process.on('SIGTERM', () => {});
  setInterval(() => fs.appendFileSync(marker, 'x'), 10);
} else if (role === 'parent') {
  spawn(process.execPath, [fileURLToPath(import.meta.url), 'writer', marker], { stdio: 'ignore' });
  process.on('SIGTERM', () => {});
  if (scenario === 'parent_failure') setTimeout(() => process.exit(2), 250);
  if (scenario === 'buffer_overflow') setTimeout(() => console.log('x'.repeat(20000)), 250);
  setInterval(() => {}, 1000);
} else {
  throw new Error('Unknown process containment fixture role');
}
