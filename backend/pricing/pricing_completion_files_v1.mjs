import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export function sha256V1(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

// Input manifests contain data paths only. They cannot name modules or commands.
export function readBoundPricingInputV1(manifestPath) {
  const absolute = path.resolve(manifestPath);
  const root = fs.realpathSync(path.dirname(absolute));
  if (fs.lstatSync(absolute).isSymbolicLink()) throw new Error('manifest_symlink_forbidden');
  if (fs.statSync(absolute).size > 65536) throw new Error('manifest_too_large');
  const manifestBytes = fs.readFileSync(absolute);
  const manifest = JSON.parse(manifestBytes);
  const typed = manifest.schema_version === 'PRICING_COMPLETION_SNAPSHOT_FILES_V1';
  const allowed = typed ? ['schema_version','snapshot'] : ['schema_version', 'report', 'identity_gaps'];
  if ((!typed && manifest.schema_version !== 'PRICING_COMPLETION_FILES_V1')
      || Object.keys(manifest).some(key => !allowed.includes(key))) throw new Error('invalid_input_manifest');
  function read(entry) {
    if (!entry || Object.keys(entry).some(key => !['path', 'sha256'].includes(key))
        || typeof entry.path !== 'string' || path.isAbsolute(entry.path)
        || entry.path.includes(':') || /(^|[\\/])\.\.([\\/]|$)/.test(entry.path)
        || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? '')) throw new Error('invalid_input_path_or_digest');
    const target = path.resolve(root, entry.path);
    const real = fs.realpathSync(target);
    if (!real.startsWith(root + path.sep) || fs.lstatSync(target).isSymbolicLink()) throw new Error('input_outside_root');
    const stat = fs.statSync(real);
    if (!stat.isFile() || stat.size > 256 * 1024 * 1024) throw new Error('invalid_input_size');
    const bytes = fs.readFileSync(real);
    if (sha256V1(bytes) !== entry.sha256) throw new Error('input_digest_mismatch');
    return bytes.toString('utf8');
  }
  if (typed) {
    const snapshotText = read(manifest.snapshot);
    return {kind:'snapshot',snapshot:JSON.parse(snapshotText),snapshotText,
      snapshotDigest:manifest.snapshot.sha256,digest:sha256V1(manifestBytes),root};
  }
  const reportText = read(manifest.report);
  const identityGapsText = read(manifest.identity_gaps);
  const report = JSON.parse(reportText);
  const rows = identityGapsText.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line));
  return { kind:'legacy', report, rows, reportText, identityGapsText, digest: sha256V1(manifestBytes), reportDigest: manifest.report.sha256,
    rowsDigest: manifest.identity_gaps.sha256, root };
}

export function writePricingArtifactV1(directory, name, value) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) throw new Error('invalid_artifact_name');
  const root = path.resolve(directory);
  // Runtime paths must be controller-owned; reject redirected outputs.
  let cursor = path.parse(root).root;
  for (const part of root.slice(cursor.length).split(/[\\/]/).filter(Boolean)) {
    cursor = path.join(cursor,part);
    if (fs.existsSync(cursor)) {
      const stat = fs.lstatSync(cursor);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('output_symlink_forbidden');
    } else fs.mkdirSync(cursor);
  }
  const destination = path.join(root, name);
  if (fs.existsSync(destination) && (!fs.lstatSync(destination).isFile() || fs.lstatSync(destination).isSymbolicLink())) throw new Error('unsafe_output');
  const body = JSON.stringify(value, null, 2) + '\n';
  if (name.startsWith('packet-') && fs.existsSync(destination)) {
    if (fs.readFileSync(destination,'utf8') !== body) throw new Error('immutable_packet_conflict');
    return;
  }
  const temp = path.join(root, `${name}.${randomUUID()}.tmp`);
  const handle = fs.openSync(temp, 'wx', 0o600);
  try { fs.writeFileSync(handle, body); fs.fsyncSync(handle); }
  finally { fs.closeSync(handle); }
  if (name.startsWith('packet-')) {
    // Publish without replacement, including when two workers prepare the same
    // packet concurrently. Linking the flushed temporary file is atomic; a
    // filesystem without this operation fails closed instead of overwriting.
    try { fs.linkSync(temp, destination); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const stat = fs.lstatSync(destination);
      if (!stat.isFile() || stat.isSymbolicLink() || fs.readFileSync(destination,'utf8') !== body) throw new Error('immutable_packet_conflict');
    } finally { fs.unlinkSync(temp); }
  } else fs.renameSync(temp, destination);
}
