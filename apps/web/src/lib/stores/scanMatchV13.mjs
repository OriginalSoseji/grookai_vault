// Still-scan review suggestions only. Never locks identity, chooses a finish or writes inventory.
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import english from '@tesseract.js-data/eng';
import path from 'node:path';
import { matchScanV12, acceptStructuralIdentity } from './scanMatchV12.mjs';
import { scanOrientations, scanTextEvidence } from './scanMatchV11.mjs';
import { rankStructure, structureAdmits } from './scanStructureV12.mjs';
import { qualifiedFooter } from './scanOcrEvidenceV10.mjs';
import { enclosedInk } from './scanOutlineV13.mjs';

export const SCAN_MATCH_VERSION = 'vendor_scan_evidence_v13';
export async function galleryRecovery(bytes, catalog) {
  const orientations = await scanOrientations(bytes, 1600), candidates = [];
  let worker, timer, expired = false;
  const work = (async () => {
    for (const scan of orientations) {
      const ranked = rankStructure(scan.descriptor, catalog);
      if (!structureAdmits(ranked)) continue;
      const card = catalog.find(c => c.id === ranked[0].id);
      if (!/^(TG|GG)\d+$/i.test(card.number)) continue;
      if (!worker) worker = await createWorker('eng', 1, { langPath: path.join(path.dirname(english.langPath), '4.0.0_best_int'), gzip: true, cacheMethod: 'none', errorHandler: () => {} });
      if (expired) throw new Error('Matching timed out.');
      // Keep the scan's original color conversion for outlined ink. Descriptor
      // normalization above remains unchanged and exclusively controls retrieval.
      const inkBytes = await sharp(bytes, { limitInputPixels: 16_000_000 }).autoOrient().rotate(scan.rotation).resize({ width: 1600 }).png().toBuffer();
      const { width, height } = await sharp(inkBytes).metadata();
      const crop = async (left, top, w, h) => sharp(inkBytes).extract({ left: Math.round(width * left), top: Math.round(height * top), width: Math.floor(width * w), height: Math.floor(height * h) }).grayscale().raw().toBuffer({ resolveWithObject: true });
      await worker.setParameters({ tessedit_pageseg_mode: '7' });
      const name = await crop(.18, .035, .53, .05);
      let title = '';
      for (const threshold of [50, 110]) {
        const png = await sharp(name.data, { raw: name.info }).threshold(threshold).extend({ top: 30, bottom: 30, left: 30, right: 30, background: '#fff' }).png().toBuffer();
        title += '\n' + (await worker.recognize(png)).data.text;
      }
      const reads = [];
      for (const [family, left, top, w, h, outputHeight, psm] of [
        ['full', 0, .88, 1, .12, 300, '6'],
        ['left-wide', .02, .90, .58, .09, 300, '6'],
        ['strip-left', .14, .939, .17, .031, 100, '7'],
      ]) {
        if (expired) throw new Error('Matching timed out.');
        await worker.setParameters({ tessedit_pageseg_mode: psm });
        const { data, info } = await crop(left, top, w, h);
        for (const threshold of [50, 90]) {
          const mask = enclosedInk(data, info.width, info.height, threshold);
          const png = await sharp(mask, { raw: info }).resize({ height: outputHeight }).extend({ top: 20, bottom: 20, left: 20, right: 20, background: '#fff' }).png().toBuffer();
          const { data: reading } = await worker.recognize(png, {}, { blocks: true });
          reads.push({ crop: family, data: reading });
        }
      }
      const footer = qualifiedFooter(reads), evidence = scanTextEvidence(title, footer, card.name, card.number, card.printedCoordinates);
      if (acceptStructuralIdentity(title, footer, card) && evidence.totalMatch) candidates.push({ id: card.id, rotation: scan.rotation, distance: ranked[0].distance, evidence: 'title_gallery_fraction_structure', printedIdentity: evidence });
    }
    return { status: candidates.length > 1 ? 'ambiguous' : candidates.length ? 'suggestions' : 'no_match', candidates };
  })();
  try { return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => { expired = true; reject(new Error('Matching timed out.')); }, 10_000); })]); }
  finally { clearTimeout(timer); if (worker) await worker.terminate(); }
}
export async function matchScanV13(bytes, references, catalog) {
  const prior = await matchScanV12(bytes, references, catalog);
  if (prior.candidates.length || prior.status !== 'no_match') return { ...prior, version: SCAN_MATCH_VERSION };
  return { ...await galleryRecovery(bytes, catalog), version: SCAN_MATCH_VERSION, reader: 'gallery_recovery' };
}
