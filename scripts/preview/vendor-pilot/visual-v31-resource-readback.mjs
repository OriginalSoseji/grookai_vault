// Deployment-specific configuration readback. Platform configuration is distinct
// from a measured cgroup limit and from build-machine memory.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const variant = process.argv[2]; assert.ok(['baseline', 'features'].includes(variant));
const dir = '.local/integration/vendor-scan-hosted-v31-' + variant, ready = JSON.parse(fs.readFileSync(dir + '/ready.json'));
const token = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA, 'com.vercel.cli/Data/auth.json'))).token;
const response = await fetch('https://api.vercel.com/v13/deployments/' + ready.id + '?teamId=team_EFKFYSau9Gf8wEaix8zXgQZG', {
  headers: { Authorization: 'Bearer ' + token }, redirect: 'error', signal: AbortSignal.timeout(30000),
});
assert.ok(response.ok); const d = await response.json();
assert.equal(d.id, ready.id); assert.equal(d.projectId, 'prj_6eeKXtBiLWciS3F2K7Usz8JhwDgy'); assert.equal(d.readyState, 'READY');
const config = d.config; assert.ok(config); assert.equal(config.functionMemoryType, 'standard'); assert.equal(config.functionType, 'fluid');
const result = { at: new Date().toISOString(), deployment: d.id, origin: ready.url,
  configurationSnapshot: { functionMemoryType: config.functionMemoryType, functionType: config.functionType, functionTimeout: config.functionTimeout, isUsingActiveCPU: config.isUsingActiveCPU },
  documentedAllocation: { memoryGB: 2, vCPU: 1, basis: 'Deployment configuration snapshot standard/fluid mapped to the current Vercel memory documentation; not a cgroup measurement' },
  references: ['https://vercel.com/docs/rest-api/deployments/get-a-deployment-by-id-or-url', 'https://vercel.com/docs/functions/configuring-functions/memory',
    'https://github.com/vercel/sdk/blob/main/src/models/getdeploymentgitsourcedeploymentsresponse200applicationjsonresponsebody219type.ts'],
  projectSettingsChanged: false };
fs.writeFileSync(dir + '/resource-configuration.private.json', JSON.stringify(result, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ deployment: d.id, functionMemoryType: config.functionMemoryType, functionType: config.functionType, documentedMemoryGB: 2, documentedVCPU: 1 }));
