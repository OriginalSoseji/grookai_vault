// Fingerprint key derivation (V1) per contract fpv1.
// Input: measurements object containing fingerprint.features.{front,back}.{phash,dhash}
// Output: string fingerprint_key or null when no hashes.

export function deriveFingerprintKeyV1(measurements) {
  const fp = measurements?.fingerprint?.features || {};
  const front = fp.front;
  const back = fp.back;

  const normHash = (val) => (typeof val === 'string' ? val.toLowerCase() : null);

  const fPh = normHash(front?.phash);
  const fDh = normHash(front?.dhash);
  const bPh = normHash(back?.phash);
  const bDh = normHash(back?.dhash);

  const hasFront = !!(fPh && fDh);
  const hasBack = !!(bPh && bDh);

  if (hasFront && hasBack) {
    return `fpv1:fb:f=${fPh}.${fDh};b=${bPh}.${bDh}`;
  }
  if (hasFront) {
    return `fpv1:f:${fPh}.${fDh}`;
  }
  if (hasBack) {
    return `fpv1:b:${bPh}.${bDh}`;
  }
  return null;
}
