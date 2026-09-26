import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { hashReference, validReferencePath } from './scanReferenceDeliveryV24.mjs';

// Derived solely from the frozen visual artifact. This is identity metadata,
// never a substitute for current anonymous canonical/printing authorization.
export const METADATA_SOURCE_SHA256 = 'af76e51edb06876acb5d795856f1444fc26cda437201d0743b00aa83604e532b';
export const METADATA_SHA256 = '21d2c42c57bd4c9cd4251c79cdcf5ffa70346c871e3c92655e6c057c244c5aa4';
export const METADATA_BYTES = 1515437;
const decodedBytes = 5239200;
const exactKeys = (value, keys) => value && !Array.isArray(value) && typeof value === 'object'
  && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export function validateMetadataEnvelopeV27(value) {
  if (!exactKeys(value, ['version', 'sourceArtifactSha256', 'rows'])
    || value.version !== 'scan_reference_metadata_v27' || value.sourceArtifactSha256 !== METADATA_SOURCE_SHA256
    || !Array.isArray(value.rows) || value.rows.length !== 20079) throw new Error('Invalid reference metadata.');
  const result = new Map();
  for (const row of value.rows) {
    if (!exactKeys(row, ['id', 'gv_id', 'image_path', 'sha256'])
      || typeof row.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row.id)
      || typeof row.gv_id !== 'string' || !/^GV-[A-Za-z0-9-]+$/.test(row.gv_id)
      || typeof row.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(row.sha256)
      || !validReferencePath(row.image_path) || result.has(row.id)) throw new Error('Invalid reference metadata.');
    result.set(row.id, Object.freeze({ ...row }));
  }
  return result;
}

export function loadReferenceMetadataV27(file) {
  if (fs.statSync(file).size !== METADATA_BYTES) throw new Error('Invalid reference metadata artifact.');
  const bytes = fs.readFileSync(file);
  if (bytes.length !== METADATA_BYTES || hashReference(bytes) !== METADATA_SHA256) throw new Error('Invalid reference metadata artifact.');
  const json = gunzipSync(bytes, { maxOutputLength: decodedBytes });
  if (json.length !== decodedBytes) throw new Error('Invalid reference metadata artifact.');
  return validateMetadataEnvelopeV27(JSON.parse(json));
}

let metadata;
export function visualReferenceMetadataV27() {
  metadata ??= loadReferenceMetadataV27(path.join(process.cwd(), 'src/lib/stores/scanExpandedMetadataV27.json.gz'));
  return metadata;
}
