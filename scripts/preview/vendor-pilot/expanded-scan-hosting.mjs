// Configure only future preview builds; the shared reviewer alias stays pinned.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{verified}from'./ops.mjs';
const dir='.local/integration/vendor-scan-release-20260924',project='prj_6eeKXtBiLWciS3F2K7Usz8JhwDgy',team='team_EFKFYSau9Gf8wEaix8zXgQZG',alias='grookai-vendor-preview.vercel.app',previous='dpl_51kcAzAJggMdURgDoXkEordUerUH';
const hash=b=>createHash('sha256').update(b).digest('hex'),token=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'))).token;
async function api(route,body){const r=await fetch('https://api.vercel.com'+route+(route.includes('?')?'&':'?')+'teamId='+team,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});assert.ok(r.ok,'Isolated hosting request failed: '+r.status);return r.json();}
assert.equal((await verified()).id,'hrtbjchobencariqclab');assert.equal((await api('/v4/aliases/'+alias)).deploymentId,previous);const p=await api('/v9/projects/'+project);assert.equal(p.name,'grookai-vendor-preview');assert.ok(!p.link);
if(process.argv[2]==='configure'){
 assert.ok(!fs.existsSync(dir+'/hosting-configured.json'));
 const regression=JSON.parse(fs.readFileSync('.local/integration/vendor-scan-expansion-v13/regression-2026-09-24T07-37-38-326Z.private.json'));assert.ok(regression.finishedAt);assert.equal(regression.summary.scans,305);assert.equal(regression.summary.wrong,0);assert.equal(regression.summary.correct,207);assert.equal(regression.matcherSha256,hash(fs.readFileSync('apps/web/src/lib/stores/scanMatchV13.mjs')));
 fs.writeFileSync(dir+'/hosting-configure-intent.json',JSON.stringify({at:new Date().toISOString(),project,previous,flag:'GROOKAI_STORE_SCAN_MATCH_V13_ENABLED',scope:'future preview builds; alias unchanged'},null,2),{flag:'wx'});
 await api('/v10/projects/'+project+'/env?upsert=true',[{key:'GROOKAI_STORE_SCAN_MATCH_V13_ENABLED',value:'true',type:'encrypted',target:['preview']}]);
 fs.writeFileSync(dir+'/hosting-configured.json',JSON.stringify({at:new Date().toISOString(),project,previous,previewFlag:true,aliasUnchanged:true,paymentsUnchanged:true},null,2),{flag:'wx'});console.log(JSON.stringify({configuredFuturePreview:true,aliasUnchanged:true}));
}else if(process.argv[2]==='configure-v14-candidate'){
 assert.ok(fs.existsSync(dir+'/isolated-package-proof.json'));assert.ok(!fs.existsSync(dir+'/hosting-v14-configured.json'));
 // Unshared engineering preview only. Promotion still requires completed V14
 // regression, hosted/device proof and the full image-copy receipt.
 await api('/v10/projects/'+project+'/env?upsert=true',[{key:'GROOKAI_STORE_SCAN_MATCH_V14_ENABLED',value:'true',type:'encrypted',target:['preview']}]);
 fs.writeFileSync(dir+'/hosting-v14-configured.json',JSON.stringify({at:new Date().toISOString(),project,previous,sourceSha256:hash(fs.readFileSync('apps/web/src/lib/stores/scanMatchV14.mjs')),scope:'unshared candidate; not release approval',aliasUnchanged:true},null,2),{flag:'wx'});console.log(JSON.stringify({configuredV14Candidate:true,aliasUnchanged:true}));
}else if(process.argv[2]==='configure-search-recovery'){
 // Restore usable manual search first. Expanded recognition remains unqualified;
 // only the already released V2 flag can enable recognition in this preview.
 assert.ok(!fs.existsSync(dir+'/hosting-search-recovery-configured.json'));
 await api('/v10/projects/'+project+'/env?upsert=true',['V13','V14'].map(v=>({key:'GROOKAI_STORE_SCAN_MATCH_'+v+'_ENABLED',value:'false',type:'encrypted',target:['preview']})));
 fs.writeFileSync(dir+'/hosting-search-recovery-configured.json',JSON.stringify({at:new Date().toISOString(),project,previous,expandedMatching:false,scope:'unshared search recovery candidate; alias unchanged'},null,2),{flag:'wx'});
 console.log(JSON.stringify({searchRecoveryCandidate:true,expandedMatching:false,aliasUnchanged:true}));
}else if(process.argv[2]==='status'){
 const list=await api('/v6/deployments?projectId='+project+'&limit=2');console.log(JSON.stringify(list.deployments.map(d=>({id:d.uid,url:d.url,state:d.state}))));
}else throw Error('Explicit configure/status required');
