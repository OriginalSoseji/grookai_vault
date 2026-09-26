// Read-only proof that private staging did not move the shared reviewer alias.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { root } from './ops.mjs';
const project = 'prj_6eeKXtBiLWciS3F2K7Usz8JhwDgy', team = 'team_EFKFYSau9Gf8wEaix8zXgQZG';
const alias = 'grookai-vendor-preview.vercel.app', expected = 'dpl_F9id47NjSDscTwE2wx1F1gWpgGRR';
const token = JSON.parse(fs.readFileSync(path.join(process.env.APPDATA, 'com.vercel.cli/Data/auth.json'))).token;
async function get(route) {
  const response = await fetch('https://api.vercel.com' + route + '?teamId=' + team, { headers: { Authorization: 'Bearer ' + token }, redirect: 'error', signal: AbortSignal.timeout(30000) });
  assert.ok(response.ok, 'Hosting readback failed'); return response.json();
}
const [p, a] = await Promise.all([get('/v9/projects/' + project), get('/v4/aliases/' + alias)]);
assert.equal(p.id, project); assert.equal(p.name, 'grookai-vendor-preview'); assert.equal(a.deploymentId, expected);
const d = await get('/v13/deployments/' + expected); assert.equal(d.projectId, project); assert.equal(d.readyState, 'READY');
const proof = { at: new Date().toISOString(), project, alias, deployment: d.id, ready: true, aliasUnchanged: true, actions: 'GET only; no deployment or setting change' };
const output = path.join(root, '.local/integration/vendor-scan-storage-v30/hosting-readback.private.json');
fs.writeFileSync(output, JSON.stringify(proof, null, 2), { flag: 'wx' }); console.log(JSON.stringify(proof));
