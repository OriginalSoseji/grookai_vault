// Offline serving-candidate guard. Reject ambiguous reference-image bindings;
// do not decide which canonical record is right or mutate catalog quarantine.
import { prepareReferenceRisk } from './scanReferenceRiskV18.mjs';
export { selectUnambiguousGeometry } from './scanReferenceRiskV18.mjs';
export const REFERENCE_RISK_VERSION = 'vendor_scan_reference_risk_v20';

export function prepareReferenceRiskV20(catalog) {
  const familyRisk = prepareReferenceRisk(catalog), byId = new Map(), imageBindings = new Map();
  for (const row of catalog) {
    byId.set(row.id, row);
    if (!imageBindings.has(row.sha256)) imageBindings.set(row.sha256, []);
    imageBindings.get(row.sha256).push(row.id);
  }
  return id => {
    const row = byId.get(id);
    if (!row) return { assessed: false, conflicts: [] };
    const identicalImages = imageBindings.get(row.sha256).filter(otherId => otherId !== id);
    const risk = familyRisk(id);
    return { assessed: risk.assessed, conflicts: [...new Set([...risk.conflicts, ...identicalImages])] };
  };
}
