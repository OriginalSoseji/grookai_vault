import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const CATALOG_COMPONENTS = Object.freeze(['japanese-master-index', 'one-piece-expansion', 'cross-tcg-sealed']);
export const CATALOG_EVIDENCE_VERSION = 'BACKGROUND_CATALOG_SUPERVISION_V1';
export const CATALOG_SCOPE = 'durable_catalog_integrity_and_coverage';
export const catalogHash = bytes => createHash('sha256').update(bytes).digest('hex');

export function classifyCatalogEvidence(receipt, report, {
  component, expectedCommit, timerState, serviceResult, now = new Date(), maxAgeMinutes = 420,
} = {}) {
  const result = (status, reason) => ({ status, reason, observed_at: receipt?.completed_at ?? null });
  if (!CATALOG_COMPONENTS.includes(component) || receipt?.schema_version !== CATALOG_EVIDENCE_VERSION ||
      receipt.component !== component || !/^[a-f0-9]{40}$/.test(expectedCommit ?? '') ||
      receipt.producer_commit_sha !== expectedCommit) return result('failed', 'Catalog supervision evidence does not match the component and pinned runtime.');
  if (timerState !== 'active' || serviceResult !== 'success') return result('failed', 'Catalog supervisor timer is inactive or its service failed.');
  if (receipt.status === 'failed') return result('failed', 'Latest catalog audit failed; its failure receipt is preserved.');
  if (receipt.status !== 'completed') return result('degraded', 'Catalog audit has not completed successfully; inspect its saved attempt.');
  const start = Date.parse(receipt.started_at), end = Date.parse(receipt.completed_at), observed = Date.parse(report?.observed_at);
  const age = (now.getTime() - end) / 60_000;
  if (![start, end, observed, age].every(Number.isFinite) || end < start || observed < start || observed > end || age < -1) {
    return result('failed', 'Catalog supervision evidence has invalid timestamps.');
  }
  if (age > maxAgeMinutes) return result('stale', 'Catalog supervisor evidence is older than seven hours.');
  const launchAge = start - Date.parse(receipt.preflight?.launch_observed_at);
  if (receipt.preflight?.launch_status !== 'healthy' || receipt.preflight?.free_bytes < 15_000_000_000 ||
      !Number.isFinite(receipt.preflight?.free_bytes) || !Number.isFinite(launchAge) || launchAge < -60_000 || launchAge > 45 * 60_000) {
    return result('failed', 'Catalog audit lacks valid capacity and launch-health evidence.');
  }
  if (report.component !== component || report.schema_version !== CATALOG_EVIDENCE_VERSION || report.scope !== CATALOG_SCOPE ||
      report.database_writes !== 0 || report.transaction_read_only !== true || report.tls_verified !== true ||
      report.catalog_completeness_proven !== false || !Array.isArray(report.findings) ||
      !Number.isSafeInteger(report.catalog_rows) || report.catalog_rows <= 0) {
    return result('failed', 'Catalog audit does not prove its read-only scope and catalog presence.');
  }
  if (report.findings.length) return result('degraded', `Catalog audit found ${report.findings.length} integrity issue(s); see the saved report.`);
  return result('healthy', 'Fresh read-only catalog supervision passed integrity checks; coverage gaps remain explicit in its report.');
}

export async function readCatalogEvidence(root, options) {
  const read = async file => {
    if ((await fs.stat(file)).size > 2_000_000) throw new Error('Oversized catalog evidence');
    return fs.readFile(file);
  };
  const latest = await read(path.join(root, 'latest.json'));
  const receipt = JSON.parse(latest);
  if (!/^[0-9TZ-]+-[a-f0-9-]{36}$/.test(receipt.run_id ?? '')) throw new Error('Invalid catalog run identifier');
  const base = await fs.realpath(root), run = await fs.realpath(path.join(root, 'runs', receipt.run_id));
  if (!run.startsWith(base + path.sep)) throw new Error('Catalog run escapes its evidence directory');
  const inRun = async name => {
    const resolved = await fs.realpath(path.join(run, name));
    if (path.dirname(resolved) !== run) throw new Error('Catalog artifact escapes its run directory');
    return read(resolved);
  };
  let report = null;
  if (receipt.status !== 'running') {
    if (!latest.equals(await inRun('receipt.json'))) throw new Error('Catalog latest pointer differs from its immutable receipt');
  }
  if (receipt.status === 'completed') {
    const bytes = await inRun('report.json');
    if (catalogHash(bytes) !== receipt.report_sha256) throw new Error('Catalog report hash mismatch');
    report = JSON.parse(bytes);
  }
  return { ...classifyCatalogEvidence(receipt, report, options), evidence: {
    run_id: receipt.run_id, producer_commit_sha: receipt.producer_commit_sha,
    report_sha256: receipt.report_sha256 ?? null, scope: report?.scope ?? null,
    started_at: receipt.started_at, completed_at: receipt.completed_at ?? null,
    catalog_completeness_proven: false, metrics: report?.metrics ?? null,
    coverage: report?.coverage ?? null, findings: report?.findings ?? null,
    trigger: receipt.trigger, preflight: receipt.preflight ?? null,
  } };
}
