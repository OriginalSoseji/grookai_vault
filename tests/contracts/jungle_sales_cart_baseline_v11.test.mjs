import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const root=fileURLToPath(new URL('../../',import.meta.url)).replaceAll('\\','/');
const script=fs.readFileSync(root+'scripts/schema/audit_jungle_edition_baseline_v11.mjs','utf8');
const pending=JSON.parse(script.match(/const pending=(\[[^\n]+\]);/)[1].replaceAll("'",'"'));
const cart='20261003100000_vendor_sales_cart_v1.sql';
const names=[...JSON.parse(fs.readFileSync(root+'tests/fixtures/jungle_source_gate_migrations_v1.json')).migrations,cart].sort();
const sha=b=>createHash('sha256').update(b).digest('hex');
const base='/hermetic-cart-replay';
const freeze={sourceHashes:Object.fromEntries(names.filter(n=>!pending.includes(n)).map(n=>[n,sha(fs.readFileSync(root+'supabase/migrations/'+n))]))};
function run({files=names,readFileSync=fs.readFileSync,source=script}={}){
 const segment=source.slice(source.indexOf('const sourceHashes='),source.indexOf('const stagedBytes='));
 return vm.runInNewContext('const pending='+JSON.stringify(pending)+';\n'+segment,{root,base,freeze,sha,assert,fs:{readdirSync:()=>files,readFileSync:p=>readFileSync(String(p).replace(base+'/',root))}});
}
test('combined424 matches the hermetic416 cart baseline',()=>run());
test('historical423 source gate rejects the new416 baseline',()=>assert.throws(()=>run({source:fs.readFileSync(root+'scripts/schema/audit_jungle_edition_baseline_v10.mjs','utf8')})));
test('cart body drift rejects before connection',()=>assert.throws(()=>run({readFileSync:p=>p===root+'supabase/migrations/'+cart?Buffer.from('select 1;'):fs.readFileSync(p)})));
test('missing Jungle migration rejects before connection',()=>assert.throws(()=>run({files:names.filter(n=>n!==pending[0])})));
test('new unreviewed migration rejects before connection',()=>assert.throws(()=>run({files:[...names,'20261003110000_unreviewed.sql'],readFileSync:p=>p.endsWith('unreviewed.sql')?Buffer.from('select 1;'):fs.readFileSync(p)})));
for(const [name,args] of [
 ['PrePush',['-Phase','PrePush']],
 ['cart audit scope',['-Phase','AuditLinkedSchema','-SalesCartBaselineV1']],
 ['cart release scope',['-Phase','AuditLinkedSchema','-SalesCartReleaseV1']],
 ['old Jungle release',['-Phase','AuditLinkedSchema','-JungleReleaseV32']],
 ['custom target',['-Phase','AuditLinkedSchema','-AuditEnvFile','must-not-open']],
 ['custom payload',['-Phase','AuditLinkedSchema','-ExpectedLocalOnlyIds','20261003100000']],
])test('416 baseline rejects '+name+' before connection',()=>{
 const r=spawnSync('pwsh',['-NoProfile','-File',root+'scripts/migration_preflight_strict.ps1','-JungleSalesCartBaselineAudit',...args],{encoding:'utf8',windowsHide:true,timeout:15000});
 assert.ifError(r.error);assert.notEqual(r.status,0);assert.match(r.stdout+r.stderr,/Jungle sales-cart baseline is read-only/);
});
