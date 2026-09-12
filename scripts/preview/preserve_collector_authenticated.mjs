import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const branch = git(['branch','--show-current']).trim();
if (branch !== 'preview/collector-authenticated-20260910') throw new Error('Wrong preservation branch.');
const out = `C:/grookai_vault_operator_artifacts/collector_polish/authenticated_20260910/source-${Date.now()}`;
mkdirSync(out, { recursive: true });
const files = [];
for (const relative of [...new Set(git(['ls-files','--modified','--others','--exclude-standard','-z']).split('\0').filter(Boolean))].sort()) {
  if (relative.split('/').some(part => part.startsWith('.env') || part === 'node_modules' || part === '.next' || part === '.vercel')) {
    throw new Error('Unexpected private/generated input.');
  }
  const source = path.resolve(root, relative);
  if (!source.startsWith(path.resolve(root) + path.sep)) throw new Error('Input outside tree.');
  const destination = path.join(out, 'files', relative);
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(source, destination);
  const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
  const hash = sha256(readFileSync(source));
  if (sha256(readFileSync(destination)) !== hash) throw new Error('Preservation readback mismatch.');
  files.push({ path: relative, sha256: hash });
}
git(['diff','HEAD','--binary',`--output=${path.join(out,'tracked.patch')}`]);
const manifest = { createdAt: new Date().toISOString(), branch, baseCommit: git(['rev-parse','HEAD']).trim(),
  note: 'Base commit plus preserved changed/new files represents this uncommitted candidate.', files };
writeFileSync(path.join(out,'manifest.json'), JSON.stringify(manifest,null,2));
console.log(JSON.stringify({ out, files: files.length, verified: true }));
