import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

export const DETERMINISTIC_ARTIFACT_VERSION = 'JPN-MASTER-INDEX-ARTIFACT-V1';

function canonicalize(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function stableJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function contentFingerprint(content) {
  return sha256(stableJson(content));
}

export function buildArtifact({
  packageId,
  generatedAt,
  retrieval,
  content,
}) {
  return {
    package_id: packageId,
    artifact_version: DETERMINISTIC_ARTIFACT_VERSION,
    generated_at: generatedAt,
    retrieval,
    content_fingerprint_sha256: contentFingerprint(content),
    content,
  };
}

export async function writeJsonArtifact(outputPath, artifact) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const serialized = stableJson(artifact);
  const output = outputPath.endsWith('.gz')
    ? zlib.gzipSync(Buffer.from(serialized, 'utf8'), {
      level: zlib.constants.Z_BEST_COMPRESSION,
      mtime: 0,
    })
    : Buffer.from(serialized, 'utf8');
  await fs.writeFile(outputPath, output);
  return {
    path: outputPath.replaceAll('\\', '/'),
    bytes: output.byteLength,
    sha256: sha256(output),
    content_fingerprint_sha256: artifact.content_fingerprint_sha256,
  };
}
