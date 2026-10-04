import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

test('trade release gate rejects missing/wrong migrations and combined scopes before database access',()=>{
  for(const extra of [[],['-ExpectedLocalOnlyIds','20261003230000'],['-ExpectedLocalOnlyIds','20261004160000','-SalesDeskProReleaseV1'],['-ExpectedLocalOnlyIds','20261004160000','-SalesTradeBaselineV1']]){
    const result=spawnSync('pwsh',['-NoProfile','-File','scripts/migration_preflight_strict.ps1','-Phase','PrePush','-SalesTradeReleaseV1',...extra],{encoding:'utf8',timeout:30000,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,USERPROFILE:process.env.USERPROFILE}});
    assert.ifError(result.error);assert.notEqual(result.status,0);
    assert.match(result.stdout+result.stderr,/without combined scopes|read-only|cannot|only|parameters/i);
  }
});

test('qualification requires current source and real completed evidence, retaining database controls off',()=>{
  const source=fs.readFileSync('scripts/schema/verify_sales_trade_v1.mjs','utf8');
  for(const fragment of ['vendor_sales_trade_control','native.actualNativeAuth,true','normalHooks,true','runtime.cleanup===true','full-427-v2','allFixtureRowsUnchanged,true','assert.equal(hash(fs.readFileSync(root+p)),h,p)','remote.LEDGER.length,426'])assert.ok(source.includes(fragment),fragment);
  assert.ok(!source.includes('supabase db reset'));
});
