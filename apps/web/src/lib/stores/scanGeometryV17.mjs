// Offline candidate only. A visual proposal never assigns canonical identity,
// printing, finish, ownership, or price. V16 remains frozen for reproducibility.
import { verifyGeometry, regionCorrelation } from './scanGeometryV16.mjs';
export { prepareGeometryImage } from './scanGeometryV16.mjs';
export const GEOMETRY_VERSION = 'vendor_scan_geometry_v17';

// A broad footer correlation hides a changed set symbol/collector number among
// unchanged copyright and background pixels. Require agreement locally too.
// Coordinates are fixed across the corpus, not chosen from a predicted number.
export function verifyIdentityRegions(reference, scan) {
  if (reference.length !== 640 * 880 || scan.length !== reference.length) return null;
  const tiles = [];
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < 6; column++) {
      const box = [20 + column * 100, 783 + row * 39,
        120 + column * 100, 822 + row * 39];
      // Blank reference background supplies no identity evidence.
      if (regionCorrelation(reference, reference, 640, box) === null) continue;
      const correlation = regionCorrelation(reference, scan, 640, box);
      if (correlation === null || !Number.isFinite(correlation) || correlation < .65) return null;
      tiles.push({ row, column, correlation });
    }
  }
  return tiles.length >= 4 ? tiles : null;
}

export function verifyGeometryV17(cv, reference, scan) {
  const match = verifyGeometry(cv, reference, scan);
  if (!match) return null;
  const objects = [], own = value => (objects.push(value), value);
  try {
    // Reproduce the frozen alignment; do not change V16 or use OCR coordinates.
    const matcher = own(new cv.BFMatcher(cv.NORM_HAMMING, false));
    const pairs = own(new cv.DMatchVectorVector());
    matcher.knnMatch(reference.descriptor, scan.descriptor, pairs, 2);
    const source = [], destination = [];
    for (let i = 0; i < pairs.size(); i++) {
      const pair = pairs.get(i);
      try {
        if (pair.size() !== 2) continue;
        const first = pair.get(0), second = pair.get(1);
        if (first.distance >= .75 * second.distance || first.distance >= 64) continue;
        const a = reference.points.get(first.queryIdx).pt;
        const b = scan.points.get(first.trainIdx).pt;
        source.push(a.x, a.y); destination.push(b.x, b.y);
      } finally { pair.delete(); }
    }
    if (source.length < 80) return null;
    const src = own(cv.matFromArray(source.length / 2, 1, cv.CV_32FC2, source));
    const dst = own(cv.matFromArray(destination.length / 2, 1, cv.CV_32FC2, destination));
    const mask = own(new cv.Mat());
    cv.setRNGSeed(1600);
    const h = own(cv.findHomography(src, dst, cv.RANSAC, 3, mask, 2000, .995));
    if (h.empty()) return null;
    const aligned = own(new cv.Mat());
    cv.warpPerspective(scan.image, aligned, h, new cv.Size(640, 880), cv.INTER_LINEAR | cv.WARP_INVERSE_MAP);
    const identityRegions = verifyIdentityRegions(reference.image.data, aligned.data);
    return identityRegions ? { ...match, identityRegions } : null;
  } finally { for (const object of objects.reverse()) object.delete(); }
}
