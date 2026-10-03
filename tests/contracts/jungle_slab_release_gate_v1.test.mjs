import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';import test from 'node:test';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)).replaceAll('\\','/');
const script=fs.readFileSync(root+'scripts/schema/audit_jungle_edition_baseline_v9.mjs','utf8');
// Exercise the actual source-comparison section with hermetic baseline fixtures.
// Private operator replay receipts are tested by the separate release gate,
// never fabricated here or required from a hosted CI filesystem.
const sourceGate=s=>s.slice(s.indexOf('const sourceHashes='),Math.min(...['const stagedBytes=','const local='].map(marker=>s.indexOf(marker)).filter(index=>index>=0)));
const pending=JSON.parse(script.match(/const pending=(\[[^\n]+\]);/)[1].replaceAll("'",'"'));
const fixtureNames=JSON.parse(fs.readFileSync(root+'tests/fixtures/jungle_source_gate_migrations_v1.json','utf8')).migrations;
assert.equal(fixtureNames.length,423);
assert.equal(new Set(fixtureNames).size,423);
const fixtureReadDir=()=>[...fixtureNames];
const receiptMigration='20261002220000_vendor_receipt_cloud_v1.sql';
const historicalReadDir=()=>fixtureReadDir().filter(n=>n!==receiptMigration);
const sha=b=>createHash('sha256').update(b).digest('hex');
const execute=(source,integrated,overrides={},expectedPending=pending)=>{
 const base='/synthetic-jungle-baseline';
 const names=fixtureReadDir().filter(n=>!pending.includes(n)&&(integrated||n!==receiptMigration));
 const freeze={sourceHashes:Object.fromEntries(names.map(n=>[n,sha(fs.readFileSync(root+'supabase/migrations/'+n))]))};
 const readFileSync=p=>(overrides.readFileSync??fs.readFileSync)(String(p).replace(base+'/',root));
 return vm.runInNewContext('const pending='+JSON.stringify(expectedPending)+';\n'+sourceGate(source),{root,base,freeze,sha,assert,fs:{readdirSync:overrides.readdirSync??(integrated?fixtureReadDir:historicalReadDir),readFileSync}});
};
const run=overrides=>execute(script,false,overrides);
test('historical422 source matches a hermetic414 baseline fixture',()=>run({}));
test('historical422 gate rejects integrated423 source before any connection',()=>assert.throws(()=>run({readdirSync:fixtureReadDir}),/20261002220000_vendor_receipt_cloud_v1/));
test('integrated423 source matches a hermetic415 baseline fixture',()=>{
 const current=fs.readFileSync(root+'scripts/schema/audit_jungle_edition_baseline_v10.mjs','utf8');
 execute(current,true);
});
test('extra pending migration rejects before any connection',()=>assert.throws(()=>run({readdirSync:p=>[...historicalReadDir(p),'20261002020000_unreviewed.sql'],readFileSync:p=>String(p).endsWith('unreviewed.sql')?Buffer.from('select 1;'):fs.readFileSync(p)})));
test('duplicate migration version rejects before any connection',()=>assert.throws(()=>run({readdirSync:p=>[...historicalReadDir(p),'20261002010000_duplicate.sql'],readFileSync:p=>String(p).endsWith('duplicate.sql')?Buffer.from('select 1;'):fs.readFileSync(p)})));
test('changed pinned artifact-date SQL rejects before any connection',()=>assert.throws(()=>run({readFileSync:p=>String(p)===root+'supabase/migrations/'+pending[2]?Buffer.concat([fs.readFileSync(p),Buffer.from('\n-- changed')]):fs.readFileSync(String(p).replace('/synthetic-jungle-baseline/',root))}),/Renumbered unapplied migration body changed/));
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
 const historical=fs.readFileSync(root+'scripts/schema/audit_jungle_edition_baseline_v8.mjs','utf8');
 const seven=JSON.parse(historical.match(/const pending=(\[[^\n]+\]);/)[1].replaceAll("'",'"'));
 assert.equal(seven.length,7);
 assert.throws(()=>execute(historical,false,{},seven),/20261002010000_jungle_slab_atomic_intake_v1/);
});
