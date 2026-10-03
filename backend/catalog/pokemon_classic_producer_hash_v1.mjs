import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

// Hash every stdout byte with bounded memory. Never truncate a producer diff or
// serialize it into receipts; generated Master reports may exceed128MiB.
export function hashClassicCommandOutput(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const stdout = createHash('sha256'), stderr = createHash('sha256');
    let bytes = 0;
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    child.stdout.on('data', chunk => { stdout.update(chunk); bytes += chunk.length; });
    child.stderr.on('data', chunk => stderr.update(chunk));
    child.on('error', reject);
    child.stdout.on('error', reject); child.stderr.on('error', reject);
    child.on('close', (code, signal) => {
      if (code !== 0) reject(new Error(`producer_command_failed:exit=${code}:signal=${signal}:stderr_sha256=${stderr.digest('hex')}`));
      else resolve({ sha256: stdout.digest('hex'), bytes });
    });
  });
}