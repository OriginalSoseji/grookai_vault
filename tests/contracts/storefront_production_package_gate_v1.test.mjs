import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
for(const [label,ids,extra] of [
  ['missing package','',[]],['arbitrary ID','20260926180000',[]],
  ['extra ID','20260926190000,20260926180000',[]],
  ['combined exception','20260926190000',['-ReconciledReplayAudit']],
  ['external output override','20260926190000',['-AuditOutDir','C:/unexpected']]
])test(`production package rejects ${label} before access`,()=>{
  const result=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-Phase','PrePush','-StorefrontProductionReleaseV1',...(ids?['-ExpectedLocalOnlyIds',ids]:[]),...extra],{encoding:'utf8',windowsHide:true});
  assert.equal(result.status,1);assert.match(result.stdout+result.stderr,/single exact package/);
  assert.doesNotMatch(result.stdout+result.stderr,/step 1 start|Connecting to remote|Initialising login|supabase migration list/);
});
test('consolidation preserves all nineteen original files and the exact replayed release',()=>{
  const dir='docs/audits/storefront_production_package_v1';
  const plan=JSON.parse(fs.readFileSync(dir+'/consolidation.json'));
  const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  assert.equal(plan.inputs.length,19);
  for(const entry of plan.inputs){assert.equal(digest(dir+'/historical_migrations/'+entry.name),entry.sha256);assert.ok(!fs.existsSync('supabase/migrations/'+entry.name));}
  assert.equal(digest('supabase/migrations/'+plan.output.name),plan.output.sha256);
  const replay=JSON.parse(fs.readFileSync(dir+'/replay.json'));assert.equal(replay.status,'passed');assert.equal(replay.comparison.rawBytes,0);assert.equal(replay.comparison.securityObjects,1062);
});
