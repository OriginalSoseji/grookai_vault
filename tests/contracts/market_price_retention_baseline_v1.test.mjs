import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import test from 'node:test';

const root=new URL('../../',import.meta.url),gate=new URL('scripts/migration_preflight_strict.ps1',root);
for(const [name,args]of Object.entries({
  prePush:['-Phase','PrePush'],
  pending:['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20261124010000'],
  mixed:['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryReleaseV14'],
  noOutput:['-Phase','AuditLinkedSchema'],
}))test(`retained-price baseline rejects ${name} before any database access`,()=>{
  const withOutput=name==='noOutput'?[]:['-AuditOutDir','C:/grookai_vault_operator_artifacts/pricing_visibility_schema_20261123/baseline-gate-negative'];
  const result=spawnSync('pwsh',['-NoProfile','-File',gate.pathname.replace(/^\/(?=[A-Za-z]:)/,''),'-MarketPriceRetentionBaselineV1',...args,...withOutput],{encoding:'utf8',windowsHide:true,timeout:15000});
  assert.ifError(result.error);assert.notEqual(result.status,0);
  assert.match(result.stderr,/Market retention baseline is read-only/);
  assert.doesNotMatch(result.stdout,/REMOTE READ ONLY/);
});

test('baseline pins all 520 immutable historical migration bytes',()=>{
  const binding=JSON.parse(readFileSync(new URL('scripts/schema/market_price_retention_baseline_v1.json',root)));
  assert.equal(binding.project,'ycdxbpibncqcchqiihfz');assert.equal(Object.keys(binding.history).length,520);
  for(const [name,hash]of Object.entries(binding.history))assert.equal(createHash('sha256').update(readFileSync(new URL('supabase/migrations/'+name,root))).digest('hex'),hash,name);
});
