import { readFileSync, copyFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = 'C:/grookai_vault_collector_release';
const snapshot = 'C:/grookai_vault_operator_artifacts/collector_polish/authenticated_20260910/source-1789184474742';
const out = 'C:/grookai_vault_operator_artifacts/collector_polish/production_release_20260912';
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
assert.equal(git(['branch', '--show-current']), 'release/collector-web-production-20260912');
assert.equal(git(['rev-parse', 'HEAD']), '31372a7c69c221adbfa6ac8c9505d929fe3ec08c');
assert.equal(git(['diff', 'bcbf8bab754528bd78f65e983bb270c27de48579', 'HEAD', '--', 'apps/web', 'supabase/functions']), '');
mkdirSync(out, { recursive: true });
const support = process.argv.includes('--test-support');
const receiptName = support ? 'test-support-import.json' : 'source-import.json';
assert.ok(!existsSync(`${out}/${receiptName}`), 'Import already completed; do not overwrite subsequent repairs.');
const manifest = JSON.parse(readFileSync(`${snapshot}/manifest.json`));
const allowed = name => (name.startsWith('apps/web/src/') && !name.startsWith('apps/web/src/app/visual-fixtures/')) ||
  name === 'apps/web/next.config.mjs' ||
  /^tests\/contracts\/(collector_|pulse_discover_presentation|pulse_navigation_copy_contract)/.test(name);
const files = manifest.files.filter(file => support
  ? /^(apps\/web\/(scripts|tests)\/|scripts\/preview\/|docs\/contracts\/COLLECTOR_)/.test(file.path)
  : allowed(file.path));
for (const file of files) {
  const destination = path.resolve(root, file.path);
  assert.ok(destination.startsWith(path.resolve(root) + path.sep));
  const source = `${snapshot}/files/${file.path}`;
  const hash = createHash('sha256').update(readFileSync(source)).digest('hex');
  assert.equal(hash, file.sha256);
  assert.ok(!support || !existsSync(destination), `Do not overwrite test support: ${file.path}`);
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(source, destination);
  assert.equal(createHash('sha256').update(readFileSync(destination)).digest('hex'), hash);
}
const receipt = { snapshot, liveBase: git(['rev-parse','HEAD']), imported: files, deletedFiles: [], backendChanges: false, databaseChanges: false };
writeFileSync(`${out}/${receiptName}`, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ imported: files.length, liveWebParity: true, out }));
