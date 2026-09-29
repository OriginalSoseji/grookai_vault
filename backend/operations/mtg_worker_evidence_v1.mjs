import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const MTG_WORKER_SCHEMA_V1 = 'MTG_CATALOG_WORKER_EVIDENCE_V1';
export const MTG_WORKER_MANIFEST_SHA_V1 = '1240b4ab9aa71c118d022d23e393e8c06397346c61d778e223d0b3b549f8c3e1';
export const MTG_WORKER_RUNNER_SHA_V1 = '7e9f2bb92f56335a6a352f655e12000b344a63a4';
export const mtgEvidenceHashV1 = bytes => createHash('sha256').update(bytes).digest('hex');

export function classifyMtgWorkerEvidenceV1(receipt, summary, plan, readback, {
  now = new Date(), expectedCommit, maxAgeMinutes = 45, timerState = 'active', serviceResult = 'success',
} = {}) {
  const result = (status, reason) => ({ status, reason, observed_at: receipt?.completed_at ?? null });
  if (!receipt || receipt.schema_version !== MTG_WORKER_SCHEMA_V1 ||
      !/^[a-f0-9]{40}$/.test(expectedCommit ?? '') || receipt.producer_commit_sha !== expectedCommit) {
    return result('failed', 'MTG worker evidence is missing or belongs to a different runtime.');
  }
  if (timerState !== 'active' || !['success', null].includes(serviceResult)) {
    return result('failed', 'MTG worker timer is inactive or its latest service failed.');
  }
  const finished = Date.parse(receipt.completed_at);
  const started = Date.parse(receipt.started_at);
  const age = (now.getTime() - finished) / 60000;
  if (!Number.isFinite(age) || !Number.isFinite(started) || finished < started || age < -1) {
    return result('failed', 'MTG worker evidence has invalid timestamps.');
  }
  if (receipt.status !== 'completed') return result('failed', 'Latest MTG worker audit failed; its failure receipt is preserved.');
  if (age > maxAgeMinutes) return result('stale', `MTG worker evidence exceeds the ${maxAgeMinutes}-minute freshness window.`);
  if (!summary || !plan || summary.dispatched !== false || summary.shadow_only !== true ||
      summary.target_commit_sha !== MTG_WORKER_RUNNER_SHA_V1 ||
      summary.repository !== 'OriginalSoseji/grookai_vault' || summary.findings?.length !== 0 ||
      plan.manifest_sha256 !== MTG_WORKER_MANIFEST_SHA_V1 || plan.dispatch_requested !== false ||
      plan.shadow_only !== true || plan.target_commit_sha !== MTG_WORKER_RUNNER_SHA_V1) {
    return result('failed', 'MTG worker evidence does not satisfy the frozen read-only authority.');
  }
  const writes = ['database_writes', 'release_control_writes', 'image_or_storage_writes',
    'pricing_or_publication_writes', 'app_visibility_activation'];
  if (writes.some(key => summary.boundaries?.[key] !== false || plan.boundaries?.[key] !== false)) {
    return result('failed', 'MTG worker evidence does not prove its write boundaries.');
  }
  if (summary.active_run_count > 0) return result('degraded', 'Catalog writer is active; worker deferred its catalog audit.');
  const artifactTimes = [summary.completed_at, plan.recorded_at, readback?.recorded_at].map(Date.parse);
  if (artifactTimes.some(time => !Number.isFinite(time) || time < started || time > finished) ||
      summary.active_run_count !== 0) return result('failed', 'MTG artifact timestamps or writer state do not match this audit.');
  const complete = ['eligible_catalog_complete_public_no_dispatch', 'eligible_catalog_complete_signed_in_no_dispatch',
    'eligible_catalog_complete_no_dispatch'];
  if (!complete.includes(summary.status) || !readback || readback.transaction_read_only !== true ||
      readback.tls_verified !== true || summary.catalog?.absent_count !== 0 ||
      summary.catalog?.partial_or_drifted_count !== 0 || !Number.isInteger(summary.catalog?.eligible_set_count) || summary.catalog.eligible_set_count <= 0 ||
      summary.catalog?.complete_exact_count !== summary.catalog?.eligible_set_count) {
    return result('degraded', 'MTG worker audit did not prove complete eligible catalog coverage.');
  }
  return result('healthy', 'Scheduled worker read-only audit proved fresh, exact MTG catalog coverage.');
}

export async function readMtgWorkerEvidenceV1(root, options = {}) {
  const receipt = JSON.parse(await fs.readFile(path.join(root, 'latest.json'), 'utf8'));
  if (!/^[0-9TZ-]+-[a-f0-9-]{36}$/.test(receipt.run_id ?? '')) throw new Error('Invalid MTG worker run identifier');
  const runDir = path.join(root, 'runs', receipt.run_id);
  const actualRoot = await fs.realpath(root);
  const actualRun = await fs.realpath(runDir);
  if (!actualRun.startsWith(actualRoot + path.sep)) throw new Error('MTG worker evidence escapes its artifact directory');
  const artifacts = {};
  for (const name of ['summary.json', 'run_plan.json', 'catalog_readback.json']) {
    const expected = receipt.artifact_hashes?.[name];
    if (!expected) continue;
    const file = await fs.realpath(path.join(runDir, name));
    if (path.dirname(file) !== actualRun) throw new Error('MTG worker artifact escapes its run directory');
    const bytes = await fs.readFile(file);
    if (mtgEvidenceHashV1(bytes) !== expected) throw new Error(`MTG worker artifact hash mismatch: ${name}`);
    artifacts[name] = JSON.parse(bytes);
  }
  return { ...classifyMtgWorkerEvidenceV1(receipt, artifacts['summary.json'], artifacts['run_plan.json'],
    artifacts['catalog_readback.json'], options), evidence: { run_id: receipt.run_id,
    producer_commit_sha: receipt.producer_commit_sha, artifact_hashes: receipt.artifact_hashes,
    catalog: artifacts['summary.json']?.catalog ?? null, trigger: receipt.trigger } };
}
