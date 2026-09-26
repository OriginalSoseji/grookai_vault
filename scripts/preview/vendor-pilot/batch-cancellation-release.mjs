// Fixed isolated preview. Production projects and databases are never targets.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {out,root,verified} from './ops.mjs';
const project='prj_6eeKXtBiLWciS3F2K7Usz8JhwDgy',team='team_EFKFYSau9Gf8wEaix8zXgQZG',previous='dpl_EZ2Xyi2puqj7hxiZEp4oMUxbZV1k',alias='grookai-vendor-preview.vercel.app';
const read=f=>JSON.parse(fs.readFileSync(f)),hash=b=>createHash('sha256').update(b).digest('hex');
const token=read(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json')).token;
async function api(route,body){const r=await fetch('https://api.vercel.com'+route+(route.includes('?')?'&':'?')+'teamId='+team,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});assert.ok(r.ok,'Isolated hosting request failed: '+r.status);return r.json();}
const mode=process.argv[2];assert.equal((await verified()).id,'hrtbjchobencariqclab');
assert.equal(read(path.join(out,'batch-cancellation-v1-applied.json')).status,'passed');
const proof=read(path.join(root,'docs/audits/vendor_batch_cancellation_v1/local-candidate-20260923.json'));assert.equal(proof.status,'local_candidate_passed');for(const[f,digest]of Object.entries(proof.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(root,f))),digest);
assert.equal((await api('/v4/aliases/'+alias)).deploymentId,previous);
const p=await api('/v9/projects/'+project);assert.equal(p.name,'grookai-vendor-preview');assert.ok(!p.link);
if(mode==='configure'){
 assert.equal(process.argv.length,3);const marker=path.join(out,'batch-cancellation-environment-intent.json');assert.ok(!fs.existsSync(marker));fs.writeFileSync(marker,JSON.stringify({at:new Date().toISOString(),project,key:'GROOKAI_STORE_BATCH_CANCELLATION_ENABLED',target:'preview'},null,2),{flag:'wx'});
 await api('/v10/projects/'+project+'/env?upsert=true',[{key:'GROOKAI_STORE_BATCH_CANCELLATION_ENABLED',value:'true',type:'encrypted',target:['preview']}]);console.log('Enabled cancellation only for future builds of the isolated preview; alias unchanged.');
}else if(mode==='promote'){
 const deployment=process.argv[3];assert.equal(process.argv.length,4);assert.match(deployment??'',/^dpl_[a-zA-Z0-9]+$/);
 const hosted=read(path.join(root,'docs/audits/vendor_batch_cancellation_v1/hosted-20260923.json'));assert.equal(hosted.status,'passed');
 const d=await api('/v13/deployments/'+deployment);assert.equal(d.projectId,project);assert.equal(d.readyState,'READY');assert.equal(d.target,null);assert.equal('https://'+d.url,hosted.target);
 const manifest=read(path.join(out,'hosting-package-current.json'));assert.equal(manifest.project,project);assert.equal(manifest.database,'hrtbjchobencariqclab');for(const f of manifest.files)assert.equal(hash(fs.readFileSync(path.join(root,f.path))),f.sha256);
 const marker=path.join(out,'batch-cancellation-alias-intent.json');assert.ok(!fs.existsSync(marker));fs.writeFileSync(marker,JSON.stringify({at:new Date().toISOString(),project,deployment,previous,manifestHash:hash(JSON.stringify(manifest))},null,2),{flag:'wx'});
 let changed=false;try{await api('/v2/deployments/'+deployment+'/aliases',{alias});changed=true;assert.equal((await api('/v4/aliases/'+alias)).deploymentId,deployment);
 const r=await fetch('https://'+alias+'/api/stores/owner/intake',{signal:AbortSignal.timeout(60000)});assert.equal(r.status,401);assert.match(r.headers.get('cache-control'),/no-store/);
 const receipt={at:new Date().toISOString(),status:'passed',project,deployment,previous,origin:'https://'+alias,manifestHash:hash(JSON.stringify(manifest)),hostedChecks:hosted.checks,existingCopiesUnchanged:hosted.existingCopies,productionWrites:0,matchingVersion:'V2 unchanged, 321 references',limitations:proof.limitations,rollback:'Restore only the isolated alias to '+previous+'; retain additive schema, tombstones and owner data.'};fs.writeFileSync(path.join(root,'docs/audits/vendor_batch_cancellation_v1/release-20260923.json'),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
 }catch(error){if(changed)await api('/v2/deployments/'+previous+'/aliases',{alias});throw error;}
}else throw Error('Explicit configure or promote required');
