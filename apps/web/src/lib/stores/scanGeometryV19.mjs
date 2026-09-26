// Offline candidate: spatially balanced feature extraction, unchanged visual
// acceptance thresholds. Both feature views must use the same pinned image.
import { prepareGeometryImage as prepareOriginal, verifyGeometry } from './scanGeometryV16.mjs';
export const GEOMETRY_VERSION = 'vendor_scan_geometry_v19';

export function balancedFeatureIndices(points) {
  const buckets = new Map(), chosen = [];
  const ranked = points.map((point, index) => ({ point, index })).filter(({ point }) =>
    Number.isFinite(point.pt?.x) && Number.isFinite(point.pt?.y) && Number.isFinite(point.response)
    && point.pt.x >= 0 && point.pt.x < 640 && point.pt.y >= 0 && point.pt.y < 880)
    .sort((a, b) => b.point.response - a.point.response || a.index - b.index);
  for (const { point, index } of ranked) {
    const cell = Math.floor(point.pt.x / 160) + ':' + Math.min(5, Math.floor(point.pt.y / (880 / 6)));
    const count = buckets.get(cell) ?? 0;
    if (count >= 48) continue;
    buckets.set(cell, count + 1); chosen.push(index);
  }
  return chosen;
}

export async function prepareGeometryImage(cv, bytes) {
  const original = await prepareOriginal(cv, bytes);
  const objects = [], own = object => (objects.push(object), object);
  let points, descriptor;
  try {
    const orb = own(new cv.ORB(5000, 1.2, 8, 15, 0, 2, cv.ORB_HARRIS_SCORE, 31, 12));
    const allPoints = own(new cv.KeyPointVector()), allDescriptors = own(new cv.Mat()), mask = own(new cv.Mat());
    orb.detectAndCompute(original.image, mask, allPoints, allDescriptors);
    const keypoints = Array.from({ length: allPoints.size() }, (_, index) => allPoints.get(index));
    const selected = balancedFeatureIndices(keypoints);
    points = new cv.KeyPointVector();
    descriptor = new cv.Mat(selected.length, 32, cv.CV_8UC1);
    for (let i = 0; i < selected.length; i++) {
      const index = selected[i]; points.push_back(keypoints[index]);
      descriptor.data.set(allDescriptors.data.subarray(index * 32, index * 32 + 32), i * 32);
    }
    return { image: original.image, points, descriptor, baseRotation: original.baseRotation, original,
      dispose() { descriptor.delete(); points.delete(); original.dispose(); } };
  } catch (error) {
    descriptor?.delete(); points?.delete(); original.dispose(); throw error;
  } finally { for (const object of objects.reverse()) object.delete(); }
}

export function verifyGeometryV19(cv, reference, scan) {
  const original = verifyGeometry(cv, reference.original, scan.original);
  if (original) return { ...original, featureView: 'original' };
  const balanced = verifyGeometry(cv, reference, scan);
  return balanced ? { ...balanced, featureView: 'balanced' } : null;
}
