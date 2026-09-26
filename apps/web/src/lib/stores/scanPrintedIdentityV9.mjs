// Preserve V8 evidence, but never let unique artwork override a different promo ID.
import { collectorToken, readPrintedFooter, printedIdentityEvidence as previous } from './scanPrintedIdentityV8.mjs';
export { printedCoordinates, collectorToken, readPrintedFooter } from './scanPrintedIdentityV8.mjs';
export function printedIdentityEvidence(footer, number, coordinates = {}) {
  const result = previous(footer, number, coordinates);
  const expected = collectorToken(number), read = readPrintedFooter(footer);
  const promoConflict = Boolean(expected && !read.fractions.length && read.promos.some(token => token.key !== expected.key));
  return { ...result, promoConflict, numberConflict: result.numberConflict || promoConflict, conflict: result.conflict || promoConflict };
}
