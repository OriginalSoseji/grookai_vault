import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, copyFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
if (branch !== 'preview/collector-vercel-20260910') throw new Error('Wrong preview branch');
const output = process.argv[2];
if (!output || !path.isAbsolute(output) || existsSync(output)) throw new Error('A new absolute package directory is required');
const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'apps/web', 'scripts/ci/run_next_build_with_system_ca.mjs', 'scripts/generate_public_set_card_counts.mjs'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).split('\0').filter(Boolean))];
const manifest = [];
for (const relative of files) {
  const allowed = relative.startsWith('apps/web/') || ['scripts/ci/run_next_build_with_system_ca.mjs', 'scripts/generate_public_set_card_counts.mjs'].includes(relative);
  const excluded = /(^|\/)(\.env[^/]*|node_modules|\.next|\.vercel|private|tests|test-results|playwright-report|visual-fixtures)(\/|$)|\.(test|spec)\.[cm]?[jt]sx?$/.test(relative);
  if (!allowed || excluded) continue;
  const bytes = readFileSync(path.join(root, relative));
  const destination = path.join(output, relative);
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(path.join(root, relative), destination);
  manifest.push({ path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
writeFileSync(`${output}.manifest.json`, JSON.stringify({ branch, sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), files: manifest }, null, 2));
console.log(JSON.stringify({ output, files: manifest.length, bytes: manifest.reduce((sum, entry) => sum + entry.bytes, 0) }));
