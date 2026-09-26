// Offline research gate; not wired into the matcher or an identity authority.
// A matched reference can have reprints that retrieval omitted. Scan-side score
// separation is insufficient: compare the reference with its catalog family too.
export const REFERENCE_RISK_VERSION = 'vendor_scan_reference_risk_v18';
const MAX_REFERENCES = 30_000;
const MAX_ART_DISTANCE = .30;

function baseName(name) {
  return String(name).normalize('NFKC').split(' · ')[0].trim().toLowerCase();
}

function artworkFeature(encoded) {
  const pixels = Buffer.from(encoded, 'base64');
  if (pixels.length !== 24 * 32 * 3) throw new Error('Invalid reference descriptor.');
  const gray = [];
  for (let y = 4; y < 16; y++) for (let x = 2; x < 22; x++) {
    const i = (y * 24 + x) * 3;
    gray.push((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
  }
  const mean = gray.reduce((sum, value) => sum + value, 0) / gray.length;
  const sd = Math.sqrt(gray.reduce((sum, value) => sum + (value - mean) ** 2, 0) / gray.length);
  if (sd < 14) return null; // Blank/low-detail artwork cannot establish separation.
  return gray.map(value => (value - mean) / sd);
}

export function prepareReferenceRisk(catalog) {
  if (!Array.isArray(catalog) || !catalog.length || catalog.length > MAX_REFERENCES) {
    throw new Error('Invalid reference catalog.');
  }
  const byId = new Map(), families = new Map();
  for (const reference of catalog) {
    if (!/^[0-9a-f-]{36}$/.test(reference.id) || byId.has(reference.id)
      || !reference.name || !/^[0-9a-f]{64}$/.test(reference.sha256)) {
      throw new Error('Invalid reference metadata.');
    }
    const family = baseName(reference.name);
    if (!family) throw new Error('Invalid reference name.');
    const row = { id: reference.id, family, feature: artworkFeature(reference.descriptor) };
    byId.set(row.id, row);
    if (!families.has(family)) families.set(family, []);
    families.get(family).push(row);
  }
  // The caller must separately pin the complete catalog bytes and revalidate
  // current public visibility. This diagnostic is not cross-name art coverage.
  return id => {
    const row = byId.get(id);
    if (!row?.feature) return { assessed: false, conflicts: [] };
    const conflicts = [];
    for (const other of families.get(row.family)) {
      if (other.id === id) continue;
      if (!other.feature) return { assessed: false, conflicts: [] };
      const distance = row.feature.reduce((sum, value, i) => sum + Math.min(4, (value - other.feature[i]) ** 2), 0) / row.feature.length;
      if (distance <= MAX_ART_DISTANCE) conflicts.push(other.id);
    }
    return { assessed: true, conflicts };
  };
}

export function selectUnambiguousGeometry(candidates, referenceRisk) {
  // Never pick whichever reprint has a slightly better similarity score.
  if (candidates.length !== 1) return { status: candidates.length ? 'manual_review' : 'no_match', candidates: [] };
  const risk = referenceRisk(candidates[0].id);
  if (!risk.assessed || risk.conflicts.length) return { status: 'manual_review', candidates: [] };
  return { status: 'suggestions', candidates };
}
