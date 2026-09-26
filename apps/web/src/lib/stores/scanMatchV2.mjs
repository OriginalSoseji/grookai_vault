// Local, bounded OCR + visual retrieval. Never resolves a finish or creates inventory.
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import english from '@tesseract.js-data/eng';
import path from 'node:path';
import { MAX_SCAN_BYTES, scanDescriptor, scoreVisualScan } from './visualMatchCore.mjs';

export const SCAN_MATCH_VERSION = 'vendor_scan_evidence_v2';
export const MATCH_TIMEOUT_MS = 18_000;
const textKey = text => String(text ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function scanTextEvidence(title, footer, name, number) {
  // Require complete name tokens, not a substring (e.g. Mew must not match Mewtwo).
  // Stylized ex/V/GX marks are often not text-readable and never establish finish.
  const normalizedName = textKey(name).replace(/\s+(ex|gx|v|vmax|vstar)$/, '');
  const nameMatch = (` ${textKey(title)} `).includes(` ${normalizedName} `);
  const fractions = [...String(footer).matchAll(/(?:^|[^0-9])(\d{1,3})\s*\/\s*(\d{2,3})(?!\d)/g)]
    .map(m => ({ number: Number(m[1]), total: Number(m[2]) })).filter(p => p.total >= 50 && p.total <= 500 && p.number <= p.total * 2);
  const expected = /^\d+$/.test(String(number)) ? Number(number) : null;
  return { nameMatch, numberMatch: expected !== null && fractions.some(p => p.number === expected),
    numberConflict: expected !== null && fractions.length > 0 && fractions.every(p => p.number !== expected) };
}

export function chooseEvidenceMatches(observations, catalog) {
  const candidates = [];
  for (const observation of observations) {
    for (const scored of observation.ranked) {
      const card = catalog.find(c => c.id === scored.id);
      if (!card || scored.distance > .9) continue;
      const evidence = scanTextEvidence(observation.title, observation.footer, card.name, card.number);
      // Independent printed identity is required for looser visual retrieval.
      // Very close artwork may survive unreadable text, but never a legible conflicting number.
      const gap = observation.ranked.find(c => c.id !== scored.id)?.distance - scored.distance;
      const printed = evidence.nameMatch && evidence.numberMatch && scored.distance <= .9;
      const namedVisual = evidence.nameMatch && scored.distance <= .18 && !evidence.numberConflict;
      const closeVisual = scored.distance <= .12 && gap >= .08 && !evidence.numberConflict;
      const numberedVisual = evidence.numberMatch && scored.distance <= .18;
      const namedArtwork = evidence.nameMatch && scored.artDistance <= .32 && scored.artGap >= .30 && !evidence.numberConflict;
      if (!printed && !namedVisual && !closeVisual && !numberedVisual && !namedArtwork) continue;
      candidates.push({ id: card.id, distance: scored.distance, rotation: observation.rotation,
        evidence: printed ? 'name_number_artwork' : namedVisual || namedArtwork ? 'name_artwork' : numberedVisual ? 'number_artwork' : 'close_artwork' });
    }
  }
  const deduplicated = [...new Set(candidates.map(c => c.id))].map(id => candidates.filter(c => c.id === id).sort((a, b) => a.distance - b.distance)[0])
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id)).slice(0, 5);
  return { version: SCAN_MATCH_VERSION, status: deduplicated.length > 1 ? 'ambiguous' : deduplicated.length ? 'suggestions' : 'no_match', candidates: deduplicated };
}

function artworkFeature(descriptor) {
  const pixels = Buffer.from(descriptor, 'base64'), gray = [];
  for (let y = 4; y < 16; y++) for (let x = 2; x < 22; x++) {
    const i = (y * 24 + x) * 3;
    gray.push((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
  }
  const mean = gray.reduce((sum, n) => sum + n, 0) / gray.length;
  const sd = Math.sqrt(gray.reduce((sum, n) => sum + (n - mean) ** 2, 0) / gray.length);
  return gray.map(n => (n - mean) / Math.max(14, sd));
}

export function evidenceVisualScores(descriptor, references) {
  const feature = artworkFeature(descriptor);
  const art = references.map(r => {
    const candidate = artworkFeature(r.descriptor);
    return { id: r.id, distance: feature.reduce((sum, n, i) => sum + Math.min(4, (n - candidate[i]) ** 2), 0) / feature.length };
  }).sort((a, b) => a.distance - b.distance);
  return scoreVisualScan(descriptor, references).map(scored => {
    const own = art.find(a => a.id === scored.id);
    return { ...scored, artDistance: own.distance, artGap: art.find(a => a.id !== scored.id).distance - own.distance };
  });
}

export async function scanOrientations(bytes) {
  if (!bytes.length || bytes.length > MAX_SCAN_BYTES) throw new Error('Scan must be at most 4 MB.');
  const input = sharp(bytes, { limitInputPixels: 16_000_000, failOn: 'warning' });
  const metadata = await input.metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1) throw new Error('Use one JPEG, PNG or WebP scan.');
  const upright = await input.autoOrient().removeAlpha().toColourspace('srgb').toBuffer();
  const { width, height } = await sharp(upright).metadata();
  const short = Math.min(width, height), long = Math.max(width, height);
  if (short < 180 || long < 240 || short / long < .60 || short / long > .80) throw new Error('Use a tightly cropped scan of one card front.');
  const turns = width < height ? [0, 180] : [90, 270];
  const results = [];
  for (const rotation of turns) {
    const oriented = await sharp(upright).rotate(rotation).resize({ width: 1000, withoutEnlargement: false }).png().toBuffer();
    results.push({ rotation, bytes: oriented, descriptor: await scanDescriptor(oriented) });
  }
  return results;
}

export async function matchScanV2(bytes, references, catalog) {
  const oriented = await scanOrientations(bytes);
  let worker, expired = false, timer;
  const work = (async () => {
    // Bundled language bytes; no CDN access and no original/text/derivative disk cache.
    worker = await createWorker('eng', 1, { langPath: path.join(path.dirname(english.langPath), '4.0.0_best_int'), gzip: true, cacheMethod: 'none', errorHandler: () => {} });
    if (expired) { await worker.terminate(); throw new Error('Matching timed out.'); }
    const observations = [];
    for (const scan of oriented) {
      if (expired) throw new Error('Matching timed out.');
      const { width, height } = await sharp(scan.bytes).metadata();
      await worker.setParameters({ tessedit_pageseg_mode: '6' });
      const titleBytes = await sharp(scan.bytes).extract({ left: 0, top: 0, width, height: Math.round(height * .16) }).grayscale().normalize().png().toBuffer();
      const footerBytes = await sharp(scan.bytes).extract({ left: 0, top: Math.round(height * .88), width, height: Math.floor(height * .12) }).grayscale().normalize().png().toBuffer();
      const title = (await worker.recognize(titleBytes)).data.text;
      const footer = (await worker.recognize(footerBytes)).data.text;
      const observation = { rotation: scan.rotation, ranked: evidenceVisualScores(scan.descriptor, references), title, footer };
      // Dark lettering can disappear into foil textures in automatic thresholding.
      // Two fixed contrast passes read the complete name line, with white padding.
      if (!chooseEvidenceMatches([observation], catalog).candidates.length) {
        const large = await sharp(scan.bytes).resize({ width: 1400 }).png().toBuffer();
        const largeHeight = (await sharp(large).metadata()).height;
        const nameCrop = await sharp(large).extract({ left: 168, top: Math.round(largeHeight * .01), width: 1008, height: Math.floor(largeHeight * .12) }).grayscale().normalize().png().toBuffer();
        const numberCrop = await sharp(large).extract({ left: 28, top: Math.round(largeHeight * .90), width: 812, height: Math.floor(largeHeight * .09) }).grayscale().normalize().png().toBuffer();
        observation.title += '\n' + (await worker.recognize(nameCrop)).data.text;
        observation.footer += '\n' + (await worker.recognize(numberCrop)).data.text;
        await worker.setParameters({ tessedit_pageseg_mode: '7' });
        for (const threshold of [60, 80]) {
          const line = await sharp(large).extract({ left: 42, top: Math.round(largeHeight * .03), width: 1148, height: Math.floor(largeHeight * .08) })
            .grayscale().threshold(threshold).extend({ top: 20, bottom: 20, left: 20, right: 20, background: '#fff' }).png().toBuffer();
          observation.title += '\n' + (await worker.recognize(line)).data.text;
        }
        await worker.setParameters({ tessedit_pageseg_mode: '11' });
        const full = (await worker.recognize(scan.bytes)).data.text;
        // Body mentions of other Pokemon are never treated as title evidence.
        observation.footer += '\n' + full;
      }
      observations.push(observation);
    }
    return chooseEvidenceMatches(observations, catalog);
  })();
  try {
    return await Promise.race([work, new Promise((_, reject) => { timer = setTimeout(() => { expired = true; reject(new Error('Matching timed out.')); }, MATCH_TIMEOUT_MS); })]);
  } finally { clearTimeout(timer); if (worker) await worker.terminate(); }
}
