import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateSquareReleaseInvocationV1,assertSquareReleaseInventoryV1,assertSquareReleaseSourceV1,assertSquareReleaseMarketV1} from '../../scripts/schema/verify_square_price_batch_release_v1.mjs';

const out='C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/bulk-authority-v1/current-main-1055-v1/release-gate-v1-v987654321';
test('release qualification admits only two read-only phases and versioned owned output',()=>{
 for(const phase of ['AuditLinkedSchema','PrePush'])assert.deepEqual(validateSquareReleaseInvocationV1([phase,'--out-dir='+out]),{phase,out});
 for(const args of [['Apply','--out-dir='+out],['PrePush','--out-dir='+out,'--include-all'],['PrePush','--out-dir='+out+'/..'],['PrePush','--out-dir=C:/tmp/release-v1'],['PrePush','--out-dir='+out.replace('current-main-1055-v1','current-main-1050-v1')],['PrePush','--out-dir='+out.replace('current-main-1055-v1','current-main-1046-v1')],['AuditLinkedSchema']])assert.throws(()=>validateSquareReleaseInvocationV1(args));
 assert.equal(fs.existsSync(out),false);
});
test('all historical SQL and exactly six unchanged candidates are required',()=>{
 const binding=JSON.parse(fs.readFileSync(new URL('../../scripts/schema/square_price_batch_candidate_v4.json',import.meta.url)));
 const actual={...binding.history,...binding.candidates};assertSquareReleaseInventoryV1(binding,actual);
 for(const file of [Object.keys(binding.history)[0],Object.keys(binding.candidates)[0]]){const missing={...actual};delete missing[file];assert.throws(()=>assertSquareReleaseInventoryV1(binding,missing));assert.throws(()=>assertSquareReleaseInventoryV1(binding,{...actual,[file]:'0'.repeat(64)}));}
 assert.throws(()=>assertSquareReleaseInventoryV1(binding,{...actual,'20261124235959_other.sql':'0'.repeat(64)}));
});
const head='a'.repeat(40),tree='b'.repeat(40),main='c'.repeat(40);
function source(){return{head,tree,main,normal:Object.fromEntries(['preCommit','prePush'].map(k=>[k,{pass:true,exitCode:0,tree,sha256:'d'.repeat(64)}])),hooks:{preCommit:'18c13d7ab2c2c402a9bdd42e303d5cd2e9967625be7c2c1e5c2e2528475419ff',prePush:'7f9bb8509eb0a6e805d26d35469df9fa8600b64c7c8d7944b81183ffe2aa9347'},hosted:{pass:true,head,tree,runs:Array.from({length:5},(_,i)=>({id:i+1,head_sha:head,status:'completed',conclusion:'success'})),jobs:Array.from({length:11},(_,i)=>({id:i+100,run_id:i%5+1,status:'completed',conclusion:'success'}))},previewDeployed:false};}
test('source release requires matching normal hooks and unique successful hosted runs on the exact tree',()=>{
 assertSquareReleaseSourceV1(source(),{head,tree,main});
 for(const edit of [p=>p.normal.prePush.pass=false,p=>p.normal.preCommit.exitCode=1,p=>p.normal.prePush.tree=main,p=>p.hooks.prePush='0'.repeat(64),p=>p.hosted.tree=main,p=>p.hosted.runs[0].head_sha=main,p=>p.hosted.runs[1].id=1,p=>p.hosted.jobs[0].run_id=999,p=>p.hosted.jobs[0].conclusion='failure',p=>p.hosted.jobs[1].id=100,p=>p.previewDeployed=true]){const p=source();edit(p);assert.throws(()=>assertSquareReleaseSourceV1(p,{head,tree,main}));}
});
const now=Date.parse('2026-11-24T15:30:00Z');
function market(){return{pass:true,project:'ycdxbpibncqcchqiihfz',observedAt:new Date(now-1000).toISOString(),sourceObservedAt:new Date(now-3600000).toISOString(),regular29RepairClosed:true,japaneseCoverageGuardUnchanged:true,acceptedPublicationFresh:true,consumerFreshPriceVerified:true,naturalRefreshVerified:true,knownWrongStampPrices:0,publicationId:'10000000-0000-4000-8000-000000000001',sourceReadbackSha256:'a'.repeat(64)};}
test('upstream repair, unchanged coverage guard, natural refresh and fresh readback cannot be omitted',()=>{
 assertSquareReleaseMarketV1(market(),{now});
 for(const edit of [p=>p.regular29RepairClosed=false,p=>p.japaneseCoverageGuardUnchanged=false,p=>p.consumerFreshPriceVerified=false,p=>p.naturalRefreshVerified=false,p=>p.knownWrongStampPrices=1,p=>p.observedAt=new Date(now-1800001).toISOString(),p=>p.observedAt=new Date(now+1).toISOString(),p=>p.sourceObservedAt=new Date(now-36*3600000-1).toISOString(),p=>p.sourceObservedAt=new Date(now+1).toISOString(),p=>delete p.sourceObservedAt]){const p=market();edit(p);assert.throws(()=>assertSquareReleaseMarketV1(p,{now}));}
});
test('PowerShell fails closed before access for missing IDs, mixed scopes or environment overrides',{skip:process.platform!=='win32'},()=>{
 const script=fileURLToPath(new URL('../../scripts/migration_preflight_strict.ps1',import.meta.url));
 for(const extra of [[],['-ExpectedLocalOnlyIds','20261124230000'],['-SquarePriceBatchBaselineV4'],['-EnvFile','C:/tmp/other.env']]){
  const r=spawnSync('pwsh',['-NoProfile','-File',script,'-Phase','PrePush','-SquarePriceBatchReleaseV1','-AuditOutDir',out,...extra],{encoding:'utf8',windowsHide:true});assert.ifError(r.error);assert.notEqual(r.status,0,r.stdout+r.stderr);
 }
 assert.equal(fs.existsSync(out),false);
});
test('preview block is limited to the prepared candidate branch and retains scheduled pricing',()=>{
 const config=JSON.parse(fs.readFileSync(new URL('../../apps/web/vercel.json',import.meta.url)));
 assert.deepEqual(config.git.deploymentEnabled,{'feat/square-bulk-price-release-main1046-20261124':false,'codex/square-release-main1055-20261125':false});
 assert.ok(config.crons.some(x=>x.path.includes('square')));assert.ok(config.crons.some(x=>x.path.includes('pricing')));
});
