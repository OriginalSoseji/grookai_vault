import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { normalizePricingCompletionOperatorReadbackV1 } from '../../backend/pricing/pricing_completion_operator_readback_v1.mjs';

function assert(ok, code) { if (!ok) throw new Error(code); }
function checkAncestors(directory) {
  const root = path.parse(directory).root;
  let cursor = root;
  for (const part of directory.slice(root.length).split(/[\\/]/).filter(Boolean)) {
    cursor = path.join(cursor, part);
    const stat = fs.lstatSync(cursor);
    assert(stat.isDirectory() && !stat.isSymbolicLink(), 'directory_redirection_forbidden');
  }
}
function digest(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function write(directory, name, value) {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  const fd = fs.openSync(path.join(directory, name), 'wx', 0o600);
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  return digest(bytes);
}
export async function runPricingCompletionOperatorReadbackCliV1(argv, now = Date.now()) {
  const args = new Map();
  const allowed = ['input', 'expected-file-sha256', 'expected-sql-sha256', 'out-dir'];
  for (const arg of argv) {
    const match = /^--([a-z0-9-]+)=(.+)$/.exec(arg);
    assert(match && allowed.includes(match[1]) && !args.has(match[1]), 'unknown_or_duplicate_option');
    args.set(match[1], match[2]);
  }
  assert(allowed.every(key => args.has(key)), 'missing_required_option');
  const input = args.get('input'), output = args.get('out-dir');
  assert(path.isAbsolute(input) && path.isAbsolute(output), 'absolute_paths_required');
  const inputPath = path.resolve(input), outputPath = path.resolve(output);
  checkAncestors(path.dirname(inputPath)); checkAncestors(path.dirname(outputPath));
  const compare = value => process.platform === 'win32' ? value.toLowerCase() : value;
  const inputRoot = compare(path.dirname(inputPath)), out = compare(outputPath);
  assert(out !== inputRoot && !out.startsWith(inputRoot + path.sep) && !inputRoot.startsWith(out + path.sep), 'input_output_must_be_disjoint');
  assert(!fs.existsSync(outputPath), 'output_directory_must_be_new');
  const stat = fs.lstatSync(inputPath);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.size <= 256 * 1024 * 1024, 'invalid_input_file');
  const result = await normalizePricingCompletionOperatorReadbackV1({ readbackBytes: fs.readFileSync(inputPath),
    expectedReadbackSha256: args.get('expected-file-sha256'), expectedSqlSha256: args.get('expected-sql-sha256'), now });
  fs.mkdirSync(outputPath, { mode: 0o700 });
  const hashes = {};
  hashes['snapshot.json'] = write(outputPath, 'snapshot.json', result.snapshot);
  hashes['receipt.json'] = write(outputPath, 'receipt.json', result.receipt);
  write(outputPath, 'artifact_hashes.json', hashes);
  // The acceptance manifest is written last; incomplete directories are not input.
  write(outputPath, 'input_manifest.json', { schema_version: 'PRICING_COMPLETION_SNAPSHOT_FILES_V1',
    snapshot: { path: 'snapshot.json', sha256: hashes['snapshot.json'] } });
  return { transport: 'fixed_operator_readback', liveDatabaseAccess: false, databaseWrites: 0,
    sourceRows: result.snapshot.observations.length, sourceRunId: result.snapshot.sourceRunId,
    sourceFreshness: result.normalized.freshness, masterCoverage: 'unknown' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runPricingCompletionOperatorReadbackCliV1(process.argv.slice(2)).then(result => {
    process.stdout.write(JSON.stringify(result) + '\n');
  }).catch(() => {
    process.stderr.write('Offline operator readback validation failed; no accepted input manifest was produced.\n');
    process.exitCode = 1;
  });
}
