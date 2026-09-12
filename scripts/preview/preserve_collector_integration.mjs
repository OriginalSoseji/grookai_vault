import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const branch = git('branch', '--show-current').trim();
if (branch !== 'design/collector-real-local') throw new Error('Wrong preservation branch.');
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const output = path.join('C:/grookai_vault_operator_artifacts/collector_polish', `${stamp}_real_integration`);
mkdirSync(output, { recursive: true });
const paths = [...new Set(git('ls-files', '--modified', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean))].sort();
const files = [];
for (const relative of paths) {
  if (/(^|\/)\.env(?:\.|$)|node_modules|\.next\//.test(relative)) throw new Error(`Unexpected preservation input: ${relative}`);
  const source = path.resolve(root, relative);
  if (!source.startsWith(root + path.sep)) throw new Error('Source path escape.');
  const bytes = readFileSync(source);
  const target = path.join(output, 'files', relative);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(source, target);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (createHash('sha256').update(readFileSync(target)).digest('hex') !== hash) throw new Error('Preservation readback mismatch.');
  files.push({ path: relative, bytes: bytes.length, sha256: hash });
}
const baselineRoutes = git('ls-tree', '-r', '--name-only', 'HEAD', 'apps/web/src/app').split('\n').filter(file => /\/(page\.tsx|route\.ts)$/.test(file));
const missingRoutes = baselineRoutes.filter(file => { try { readFileSync(path.join(root, file)); return false; } catch { return true; } });
const changedAuthorityFiles = paths.filter(file => /^(backend\/|supabase\/|apps\/web\/src\/app\/api\/)/.test(file));
const changedReaderFiles = paths.filter(file => /^apps\/web\/src\/lib\//.test(file) && !/\.test\./.test(file));
const patch = git('diff', '--binary', 'HEAD');
writeFileSync(path.join(output, 'tracked.patch'), patch);
const manifest = {
  createdAt: new Date().toISOString(), branch, baseCommit: git('rev-parse', 'HEAD').trim(),
  pushed: false, deployed: false, files, baselineRouteCount: baselineRoutes.length,
  missingRoutes, changedAuthorityFiles, changedReaderFiles,
  patchSha256: createHash('sha256').update(patch).digest('hex'),
  restore: 'Use a fresh worktree at baseCommit, then copy files/ preserving relative paths. Do not overwrite a dirty worktree.',
};
writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ output, fileCount: files.length, baselineRouteCount: baselineRoutes.length, missingRoutes, changedAuthorityFiles, changedReaderFiles }, null, 2));
if (missingRoutes.length || changedAuthorityFiles.length || changedReaderFiles.length) process.exitCode = 1;
