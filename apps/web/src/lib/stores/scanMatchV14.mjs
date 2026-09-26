// Route strongly separated gallery artwork directly to the stricter gallery
// reader. Avoid three generic OCR passes before an already-qualified TG/GG read.
// Still only review suggestions; exact printing selection remains human-owned.
import { galleryRecovery } from './scanMatchV13.mjs';
import { matchScanV12 } from './scanMatchV12.mjs';
export const SCAN_MATCH_VERSION = 'vendor_scan_evidence_v14';
export async function matchScanV14(bytes, references, catalog) {
  const gallery = await galleryRecovery(bytes, catalog);
  if (gallery.candidates.length) return { ...gallery, version: SCAN_MATCH_VERSION, reader: 'gallery_direct' };
  return { ...await matchScanV12(bytes, references, catalog), version: SCAN_MATCH_VERSION };
}
