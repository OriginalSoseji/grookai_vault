// Offline cascade candidate. Preserve reviewed V5 results, including ambiguity;
// attempt V6's finer lettering/layout reader only after a genuine no-match.
import { matchScanV5 } from './scanMatchV5.mjs';
import { matchScanV6 } from './scanMatchV6.mjs';

export const SCAN_MATCH_VERSION = 'vendor_scan_evidence_v7';
export const RECOVERY_START_LIMIT_MS = 6_000;

export async function runEvidenceCascade(primary, recovery, now = () => performance.now()) {
  const started = now();
  const first = await primary();
  // Errors propagate. Neither ambiguity nor a slow first pass licenses retries.
  if (first.status !== 'no_match' || first.candidates.length || now() - started >= RECOVERY_START_LIMIT_MS) {
    return { ...first, version: SCAN_MATCH_VERSION, reader: 'primary' };
  }
  const second = await recovery();
  return { ...second, version: SCAN_MATCH_VERSION, reader: 'recovery' };
}

export function matchScanV7(bytes, references, catalog) {
  return runEvidenceCascade(
    () => matchScanV5(bytes, references, catalog),
    () => matchScanV6(bytes, references, catalog),
  );
}
