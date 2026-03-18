import "server-only";

const HALF_DAY_MS = 1000 * 60 * 60 * 12;

export function getFeaturedCardRotationBucket(now = Date.now()) {
  return Math.floor(now / HALF_DAY_MS);
}

export function getRotationOffset(totalRows: number, windowSize: number, rotationBucket = getFeaturedCardRotationBucket()) {
  if (totalRows <= 0 || windowSize <= 0 || totalRows <= windowSize) {
    return 0;
  }

  const maxOffset = totalRows - windowSize;
  const windowCount = Math.max(1, Math.ceil(totalRows / windowSize));
  const windowIndex = rotationBucket % windowCount;
  return Math.min(windowIndex * windowSize, maxOffset);
}
