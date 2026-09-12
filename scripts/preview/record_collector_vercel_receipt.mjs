import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';

const out = 'C:/grookai_vault_operator_artifacts/collector_polish/vercel_preview_20260910';
const token = JSON.parse(readFileSync(path.join(process.env.APPDATA, 'com.vercel.cli/Data/auth.json'), 'utf8')).token;
const team = 'team_EFKFYSau9Gf8wEaix8zXgQZG';
const projectId = 'prj_uFWwtWB8nhubCGyl6EqkFKVc35eN';
const productionBefore = 'dpl_5SbKvFwrWXEBFaMYYGXium56FTg2';
async function get(route) {
  const response = await fetch(`https://api.vercel.com${route}?teamId=${team}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Vercel readback failed: ${response.status}`);
  return response.json();
}
const project = await get(`/v9/projects/${projectId}`);
const deployment = await get('/v13/deployments/dpl_Fq34VrWUfJg5REwfPBTPop3eG3Ys');
const production = await get('/v9/projects/prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum');
const env = await get(`/v9/projects/${projectId}/env`);
const domains = await get(`/v9/projects/${projectId}/domains`);
assert.equal(deployment.readyState, 'READY');
assert.equal(deployment.target, 'staging');
assert.equal(production.targets.production.id, productionBefore);
assert.equal(project.ssoProtection.deploymentType, 'all_except_custom_domains');
assert.equal(project.autoAssignCustomDomains, false);
assert.equal(Object.keys(project.protectionBypass || {}).length, 0);
assert.equal(domains.domains.filter(domain => !domain.name.endsWith('.vercel.app')).length, 0);
assert.deepEqual(env.envs.map(entry => entry.key).sort(), ['NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_URL']);
const manifestBytes = readFileSync(`${out}/package_v2.manifest.json`);
const manifest = JSON.parse(manifestBytes);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
for (const file of manifest.files) assert.equal(sha(readFileSync(path.join(out, 'package_v2', file.path))), file.sha256);
const patch = execFileSync('git', ['diff', '--binary', 'HEAD'], { maxBuffer: 32 * 1024 * 1024 });
writeFileSync(`${out}/preview-source.patch`, patch);
const receipt = {
  recordedAt: new Date().toISOString(), branch: 'preview/collector-vercel-20260910',
  sourceBaseCommit: manifest.sourceCommit, newCommitCreated: false,
  packageManifestSha256: sha(manifestBytes), sourcePatchSha256: sha(patch), packagedFiles: manifest.files.length,
  preview: { projectId, deploymentId: deployment.id, url: `https://${deployment.url}`, state: deployment.readyState, target: deployment.target },
  protection: project.ssoProtection, temporaryTestAccessRemaining: 0,
  envKeys: env.envs.map(entry => entry.key), customDomains: [],
  productionBefore, productionAfter: production.targets.production.id, productionUnchanged: true,
  databaseWrites: false, storageWrites: false, gitPush: false,
  hostedSmoke: JSON.parse(readFileSync(`${out}/hosted/smoke.json`, 'utf8')),
};
writeFileSync(`${out}/deployment_receipt.json`, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ receipt: `${out}/deployment_receipt.json`, preview: receipt.preview, productionUnchanged: true, temporaryTestAccessRemaining: 0 }));
