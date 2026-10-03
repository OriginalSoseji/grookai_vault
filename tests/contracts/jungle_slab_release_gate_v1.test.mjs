import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';import test from 'node:test';
const root='C:/gv_jungle_edition_20261001/';
const script=fs.readFileSync(root+'scripts/schema/audit_jungle_edition_baseline_v9.mjs','utf8');
// Run the actual pre-network source gate with a read-only filesystem adapter.
// No fixture file is edited, and none of the production-query code is evaluated.
const prefix=script.slice(script.indexOf('const base='),script.indexOf('const directory='));
const receiptMigration='20261002220000_vendor_receipt_cloud_v1.sql';
const historicalReadDir=p=>fs.readdirSync(p).filter(n=>n!==receiptMigration);
const run=overrides=>vm.runInNewContext(prefix,{root,fs:{...fs,readdirSync:historicalReadDir,...overrides},assert,
 createHash,process:{argv:['node','audit'],execArgv:['--use-system-ca']}});
test('qualified historical422 source passes its actual pre-network gate',()=>run({}));
test('historical422 gate rejects integrated423 source before any connection',()=>assert.throws(()=>run({readdirSync:fs.readdirSync}),/20261002220000_vendor_receipt_cloud_v1/));
test('qualified integrated423 source passes the receipt-baseline pre-network gate',()=>{
 const current=fs.readFileSync(root+'scripts/schema/audit_jungle_edition_baseline_v10.mjs','utf8');
 vm.runInNewContext(current.slice(current.indexOf('const base='),current.indexOf('const directory=')),{root,fs,assert,createHash,process:{argv:['node','audit'],execArgv:['--use-system-ca']}});
});
test('extra pending migration rejects before any connection',()=>assert.throws(()=>run({readdirSync:p=>[...historicalReadDir(p),'20261002020000_unreviewed.sql'],readFileSync:p=>String(p).endsWith('unreviewed.sql')?Buffer.from('select 1;'):fs.readFileSync(p)})));
test('duplicate migration version rejects before any connection',()=>assert.throws(()=>run({readdirSync:p=>[...historicalReadDir(p),'20261002010000_duplicate.sql'],readFileSync:p=>String(p).endsWith('duplicate.sql')?Buffer.from('select 1;'):fs.readFileSync(p)})));
test('changed frozen slab SQL rejects before any connection',()=>assert.throws(()=>run({readFileSync:p=>String(p)===root+'supabase/migrations/20261002010000_jungle_slab_atomic_intake_v1.sql'?Buffer.concat([fs.readFileSync(p),Buffer.from('\n-- changed')]):fs.readFileSync(p)})));
test('missing expected slab SQL rejects before any connection',()=>assert.throws(()=>run({readdirSync:p=>historicalReadDir(p).filter(n=>!n.startsWith('20261002010000_'))})));
for(const [name,args]of [
 ['PrePush',['-Phase','PrePush','-JungleSlabBaselineAudit']],
 ['mixed scopes',['-Phase','AuditLinkedSchema','-JungleSlabBaselineAudit','-JungleEditionSearchBaselineAudit']],
 ['custom inspection',['-Phase','AuditLinkedSchema','-JungleSlabBaselineAudit','-InspectionDeps','C:/not-used']],
 ['custom pending set',['-Phase','AuditLinkedSchema','-JungleSlabBaselineAudit','-ExpectedLocalOnlyIds','20261002010000']],
])test(name+' cannot grant apply authority or override the target',()=>{
 const r=spawnSync('pwsh',['-NoProfile','-File',root+'scripts/migration_preflight_strict.ps1',...args],{encoding:'utf8',windowsHide:true,timeout:15000});
 assert.ifError(r.error);assert.notEqual(r.status,0);assert.match(r.stderr+r.stdout,/Jungle slab baseline is read-only/);
});
test('historical seven-file route still rejects the eighth migration',()=>{
 const r=spawnSync(process.execPath,['--use-system-ca',root+'scripts/schema/audit_jungle_edition_baseline_v8.mjs'],{encoding:'utf8',windowsHide:true,timeout:15000});
 assert.ifError(r.error);assert.notEqual(r.status,0);assert.match(r.stderr+r.stdout,/AssertionError/);
});
