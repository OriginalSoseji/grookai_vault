import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { freezeMasterMappingAuthority } from '../../backend/pricing/master_index_mapping_authority_v1.mjs';

export async function packageMasterMappingAuthority(args) {
  const options = {};
  for (const token of args) {
    const match = /^--(selected|scopes|out-dir)=(.+)$/.exec(token);
    assert.ok(match && !options[match[1]], `unknown_or_repeated_argument:${token}`);
    options[match[1]] = path.resolve(match[2]);
  }
  for (const name of ['selected', 'scopes', 'out-dir']) assert.ok(options[name], `--${name} is required`);
  const selectedBytes = await fs.readFile(options.selected);
  const selected = selectedBytes.toString('utf8').split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
  const scopeEntries = JSON.parse(await fs.readFile(options.scopes, 'utf8'));
  assert.ok(Array.isArray(scopeEntries) && scopeEntries.length > 0, 'scopes must be a nonempty array');
  const scopes = [];
  for (const entry of scopeEntries) {
    assert.ok(typeof entry.manifest === 'string' && typeof entry.artifact_map === 'string', 'scope paths required');
    const manifestPath = path.resolve(path.dirname(options.scopes), entry.manifest);
    const mapPath = path.resolve(path.dirname(options.scopes), entry.artifact_map);
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const map = JSON.parse(await fs.readFile(mapPath, 'utf8'));
    assert.ok(Array.isArray(map), 'artifact map must be an array');
    const artifacts = new Map();
    for (const artifact of map) {
      assert.ok(typeof artifact.ref === 'string' && artifact.ref.length > 0 && typeof artifact.path === 'string', 'artifact ref/path required');
      assert.ok(!artifacts.has(artifact.ref), 'duplicate artifact ref');
      artifacts.set(artifact.ref, await fs.readFile(path.resolve(path.dirname(mapPath), artifact.path)));
    }
    scopes.push({ manifest, artifacts });
  }
  // Validation uses existing reviews and source bytes; this command never issues reviews.
  const bundle = freezeMasterMappingAuthority(selected, scopes);
  const bytes = `${JSON.stringify(bundle, null, 2)}\n`;
  const hash = value => createHash('sha256').update(value).digest('hex');
  const receipt = {
    version: 'MASTER_INDEX_MAPPING_PACKAGE_RECEIPT_V1',
    authority_fingerprint: bundle.fingerprint, authority_file_sha256: hash(bytes),
    selected_file_sha256: hash(selectedBytes), selected_count: selected.length,
    scope_count: scopes.length, execution_authorized: false, database_writes: 0,
  };
  await fs.mkdir(path.dirname(options['out-dir']), { recursive: true });
  await fs.mkdir(options['out-dir']);
  await fs.writeFile(path.join(options['out-dir'], 'master_authority.json'), bytes, { flag: 'wx' });
  await fs.writeFile(path.join(options['out-dir'], 'selected_candidates.jsonl'), selectedBytes, { flag: 'wx' });
  await fs.writeFile(path.join(options['out-dir'], 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
  return receipt;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  packageMasterMappingAuthority(process.argv.slice(2)).then(receipt => console.log(JSON.stringify(receipt)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
