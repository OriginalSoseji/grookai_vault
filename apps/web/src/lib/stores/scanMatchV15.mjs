// Route visually separated prefixed promo identities through the existing strict
// structural reader before generic OCR. No weaker identity or visual thresholds.
import { galleryRecovery } from './scanMatchV13.mjs';
import { matchScanV12, structuralRecovery } from './scanMatchV12.mjs';
import { scanOrientations } from './scanMatchV11.mjs';
import { rankStructure, structureAdmits } from './scanStructureV12.mjs';

export const SCAN_MATCH_VERSION = 'vendor_scan_evidence_v15';
export function isPrefixedPromo(card) {
  return /^[A-Z]+\d+$/i.test(card?.number ?? '') && !/^(TG|GG)\d+$/i.test(card.number);
}
export async function matchScanV15(bytes, references, catalog) {
  const gallery = await galleryRecovery(bytes, catalog);
  if (gallery.candidates.length) return { ...gallery, version: SCAN_MATCH_VERSION, reader: 'gallery_direct' };
  for (const scan of await scanOrientations(bytes, 1400)) {
    const ranked = rankStructure(scan.descriptor, catalog);
    if (!structureAdmits(ranked) || !isPrefixedPromo(catalog.find(c => c.id === ranked[0].id))) continue;
    const promo = await structuralRecovery(bytes, catalog);
    if (promo.candidates.length) return { ...promo, version: SCAN_MATCH_VERSION, reader: 'prefixed_promo_direct' };
    break;
  }
  return { ...await matchScanV12(bytes, references, catalog), version: SCAN_MATCH_VERSION };
}
