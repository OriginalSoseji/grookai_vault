// Fixed 192xx production-baseline comparison, read-only at both databases.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root,fixture,output,pending,addition,hash,sql,guard} from './vendor_stock_runtime_v1.mjs';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
assert.equal(process.argv.length,2);const state=guard();
assert.equal(fs.readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim(),'ycdxbpibncqcchqiihfz');
fs.mkdirSync(output,{recursive:true});const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-');
const toolNames=['scripts/migration_preflight_strict.ps1','scripts/schema/vendor_stock_runtime_v1.mjs','scripts/schema/audit_vendor_stock_baseline_v1.mjs','scripts/schema/vendor_billing_schema_v1.mjs','scripts/schema/column_order_reconciliation_v1.mjs'];
const toolHashes=Object.fromEntries(toolNames.map(n=>[n,hash(fs.readFileSync(path.join(root,n)))]));
const report={startedAt:new Date().toISOString(),...state,toolHashes,productionWrites:0,localWrites:0,applyAuthorized:false};
try {
 const file=path.join(fixture,`baseline-${stamp}-readonly.sql`);fs.writeFileSync(file,snapshotSql,{flag:'wx'});
 const a=JSON.parse(sql(snapshotSql));
 const raw=execFileSync('supabase',['db','query','--linked','--workdir',root,'--file',file,'--output','json'],{encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:48*1024*1024});
 const b=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)).rows?.[0]?.receipt;
 assert.ok(b);assert.deepEqual(a.LEDGER,b.LEDGER);assert.equal(a.LEDGER.length,396);
 assert.ok(b.sanity.cards>=40000&&b.sanity.sets>=150&&b.sanity.traits>=5000);
 for(const [name,value] of [['local',a],['remote',b]])fs.writeFileSync(path.join(fixture,`baseline-${stamp}-${name}-private.json`),JSON.stringify(value),{flag:'wx'});
 report.comparison=await compareSnapshots(a,b,{reconcile:true,output:path.join(fixture,`baseline-${stamp}-diff`)});
 report.productionSanity=b.sanity;report.pending=[...pending,...(state.sourceHashes[addition]?[addition]:[])].map(n=>n.split('_')[0]);report.snapshotQuerySha256=hash(snapshotSql);
 assert.deepEqual(guard(),state);for(const [name,digest] of Object.entries(toolHashes))assert.equal(hash(fs.readFileSync(path.join(root,name))),digest);
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.message.split('\n')[0];process.exitCode=1;}
report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(output,`baseline-${stamp}.json`),JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({status:report.status,failure:report.failure,comparison:report.comparison,productionWrites:0}));
