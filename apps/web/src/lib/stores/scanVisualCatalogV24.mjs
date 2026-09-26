import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { hashReference, validReferencePath } from './scanReferenceDeliveryV24.mjs';
export const VISUAL_ARTIFACT_SHA256 = 'af76e51edb06876acb5d795856f1444fc26cda437201d0743b00aa83604e532b';
export function loadVisualCatalogV24(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.length !== 48529200 || hashReference(bytes) !== VISUAL_ARTIFACT_SHA256) throw new Error('Invalid visual artifact.');
  const catalog = JSON.parse(gunzipSync(bytes, { maxOutputLength: 100 * 1024 * 1024 }));
  if (!Array.isArray(catalog) || catalog.length !== 20079 || new Set(catalog.map(row => row.id)).size !== catalog.length
    || catalog.some(row => !/^[0-9a-f-]{36}$/.test(row.id) || !/^GV-[A-Za-z0-9-]+$/.test(row.gv_id)
      || !/^[0-9a-f]{64}$/.test(row.sha256) || !validReferencePath(row.image_path))) throw new Error('Invalid visual catalog.');
  return catalog;
}
let metadata;
export function visualReferenceMetadataV24(file = path.join(process.cwd(), 'src/lib/stores/scanExpandedCatalogV13.json.gz')) {
  metadata ??= new Map(loadVisualCatalogV24(file).map(({ id, gv_id, image_path, sha256 }) => [id, { id, gv_id, image_path, sha256 }]));
  return metadata;
}
