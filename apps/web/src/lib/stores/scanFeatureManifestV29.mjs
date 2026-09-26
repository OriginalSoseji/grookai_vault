import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { featureHashV28, FEATURE_CONTRACT_SHA256, MAX_FEATURE_BYTES } from './scanReferenceFeaturesV28.mjs';
import { METADATA_SOURCE_SHA256 } from './scanReferenceMetadataV27.mjs';
// Filled only by complete offline generation/readback. Pending pins fail closed.
export const FEATURE_MANIFEST_PINS = Object.freeze({"sha256":"df7cbeeef8482cef84e8b519439249121ae650570fcd18efba085a1641579f1f","bytes":2020792,"decodedBytes":4538070});
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
const fail = () => { throw new Error('Invalid feature manifest.'); };
export function validateFeatureManifestV29(value, byId) {
  if (!(byId instanceof Map) || byId.size !== 20079 || !exact(value, ['version', 'sourceSha256', 'contractSha256', 'rows'])
    || value.version !== 'scan_reference_features_v29' || value.sourceSha256 !== METADATA_SOURCE_SHA256
    || value.contractSha256 !== FEATURE_CONTRACT_SHA256 || !Array.isArray(value.rows) || value.rows.length !== byId.size) fail();
  const map = new Map();
  for (const row of value.rows) {
    if (!exact(row, ['id', 'imageSha256', 'artifactSha256', 'bytes']) || typeof row.id !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row.id)
      || typeof row.imageSha256 !== 'string' || typeof row.artifactSha256 !== 'string'
      || !/^[0-9a-f]{64}$/.test(row.imageSha256) || !/^[0-9a-f]{64}$/.test(row.artifactSha256)
      || byId.get(row.id)?.sha256 !== row.imageSha256 || map.has(row.id)
      || !Number.isSafeInteger(row.bytes) || row.bytes < 1 || row.bytes > MAX_FEATURE_BYTES) fail();
    map.set(row.id, Object.freeze({ ...row }));
  }
  return map;
}
export function loadFeatureManifestV29(file, byId) {
  const pin = FEATURE_MANIFEST_PINS;
  if (!/^[0-9a-f]{64}$/.test(pin.sha256) || pin.bytes < 1 || pin.bytes > 4 * 1024 * 1024
    || pin.decodedBytes < 1 || pin.decodedBytes > 8 * 1024 * 1024 || fs.statSync(file).size !== pin.bytes) fail();
  const bytes = fs.readFileSync(file); if (bytes.length !== pin.bytes || featureHashV28(bytes) !== pin.sha256) fail();
  const json = gunzipSync(bytes, { maxOutputLength: pin.decodedBytes }); if (json.length !== pin.decodedBytes) fail();
  return validateFeatureManifestV29(JSON.parse(json), byId);
}
let identity, manifest;
export function featureManifestV29(byId) {
  if (identity !== byId) {
    const next = loadFeatureManifestV29(path.join(process.cwd(), 'src/lib/stores/scanExpandedFeaturesV29.json.gz'), byId);
    identity = byId; manifest = next;
  }
  return manifest;
}
