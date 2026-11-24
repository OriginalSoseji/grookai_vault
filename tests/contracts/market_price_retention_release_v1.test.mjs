import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
import {validatePriceReleaseInvocationV1,assertPriceReleaseInventoryV1,assertPriceReleaseHostedV1} from '../../scripts/schema/verify_market_price_retention_release_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),out='C:/grookai_vault_operator_artifacts/pricing_retention_release_523_20261123/release-gate-v1-contract-negative';
const candidate={'20261124010000_market_price_retention_display_v1.sql':'bf85f532b45f88abf181f4e943c82493c440d4d7a034154b4a9f13df6139d03e'};
test('final price inventory requires all523 original hashes plus the unchanged sole candidate',()=>{
 const b=JSON.parse(fs.readFileSync(root+'/scripts/schema/best_of_game_discovery_candidate_v17.json')),history={...b.history,...b.candidates},actual=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(f=>/^\d+.*\.sql$/.test(f)).map(f=>[f,createHash('sha256').update(fs.readFileSync(root+'/supabase/migrations/'+f)).digest('hex')]));
 assertPriceReleaseInventoryV1(history,candidate,actual);
 for(const file of [Object.keys(history)[0],...Object.keys(b.candidates),...Object.keys(candidate)]){const missing={...actual};delete missing[file];assert.throws(()=>assertPriceReleaseInventoryV1(history,candidate,missing));assert.throws(()=>assertPriceReleaseInventoryV1(history,candidate,{...actual,[file]:'0'.repeat(64)}));}
 assert.throws(()=>assertPriceReleaseInventoryV1(history,candidate,{...actual,'20261124050000_unreviewed.sql':'0'.repeat(64)}));assert.throws(()=>assertPriceReleaseInventoryV1(history,{},actual));
});
test('hosted proof requires matching source and every distinct successful job/run',()=>{
 const runs=Array.from({length:5},(_,i)=>({id:i+1,status:'completed',conclusion:'success'})),jobs=Array.from({length:11},(_,i)=>({id:i+100,run_id:i%5+1,status:'completed',conclusion:'success'}));
 const proof={head:'head',tree:'tree',pass:true,runs,jobs,vercel:{statuses:[{context:'Vercel',state:'success'}]}};assertPriceReleaseHostedV1(proof,'head','tree');
 for(const change of [p=>p.head='other',p=>p.tree='other',p=>p.pass=false,p=>p.jobs.pop(),p=>p.jobs[0].conclusion='failure',p=>p.jobs[0]=p.jobs[1],p=>p.runs[0]=p.runs[1],p=>p.jobs[0].run_id=999,p=>p.vercel.statuses[0].state='pending']){const bad=structuredClone(proof);change(bad);assert.throws(()=>assertPriceReleaseHostedV1(bad,'head','tree'));}
});
test('release parser has no apply, arbitrary target, nested output or extra-flag path',()=>{
 for(const phase of ['AuditLinkedSchema','PrePush'])assert.deepEqual(validatePriceReleaseInvocationV1([phase,'--out-dir='+out]),{phase,out});
 for(const args of [[],['Apply','--out-dir='+out],['PrePush','--out-dir='+out,'--include-all'],['PrePush','--out-dir='+out+'/../escape'],['AuditLinkedSchema','--out-dir=C:/elsewhere']])assert.throws(()=>validatePriceReleaseInvocationV1(args));
 const p=spawnSync(process.execPath,[root+'/scripts/schema/verify_market_price_retention_release_v1.mjs','PrePush','--out-dir='+out,'--include-all'],{encoding:'utf8',windowsHide:true,timeout:15000});assert.ifError(p.error);assert.notEqual(p.status,0);assert.match(p.stderr,/AssertionError/);assert.doesNotMatch(p.stdout,/REMOTE READ ONLY/);assert.equal(fs.existsSync(out),false);
});
for(const[label,args]of Object.entries({missingId:['-Phase','PrePush'],wrongId:['-Phase','PrePush','-ExpectedLocalOnlyIds','20261124040000'],extraId:['-Phase','PrePush','-ExpectedLocalOnlyIds','20261124010000,20261124040000'],mixedBaseline:['-Phase','AuditLinkedSchema','-MarketPriceRetentionBaselineV1'],mixedCatalog:['-Phase','AuditLinkedSchema','-BestOfGameDiscoveryReleaseV17'],targetOverride:['-Phase','AuditLinkedSchema','-AuditEnvFile','C:/unreviewed.env'],noOutput:['-Phase','AuditLinkedSchema']}))test('price release scope rejects '+label+' before artifacts/credentials/DB',()=>{
 const extra=label==='noOutput'?[]:['-AuditOutDir',out];const p=spawnSync('pwsh',['-NoProfile','-File',root+'/scripts/migration_preflight_strict.ps1','-MarketPriceRetentionReleaseV1',...args,...extra],{encoding:'utf8',windowsHide:true,timeout:15000});assert.ifError(p.error);assert.notEqual(p.status,0);assert.match(p.stderr,/Market price retention release V1 requires only ID20261124010000/);assert.doesNotMatch(p.stdout,/REMOTE READ ONLY/);assert.equal(fs.existsSync(out),false);
});
