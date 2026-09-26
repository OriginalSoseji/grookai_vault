import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createHash}from'node:crypto';import{query,verified,out}from'./ops.mjs';
const dir='.local/integration/vendor-scan-release-20260924',read=f=>JSON.parse(fs.readFileSync(dir+'/'+f)),hash=b=>createHash('sha256').update(b).digest('hex');
const previous='dpl_51kcAzAJggMdURgDoXkEordUerUH',deployment='dpl_F9id47NjSDscTwE2wx1F1gWpgGRR',project='prj_6eeKXtBiLWciS3F2K7Usz8JhwDgy',team='team_EFKFYSau9Gf8wEaix8zXgQZG',alias='grookai-vendor-preview.vercel.app';
assert.equal((await verified()).id,'hrtbjchobencariqclab');
const proofPath='docs/audits/vendor_scan_expansion_v13/SEARCH_RECOVERY_20260924.json';
if(process.argv[2]==='prove'){
 const hosted=read('search-recovery-hosted-1790240031997.json'),browser=read('browser-1790239890804.json');assert.equal(hosted.status,'passed');assert.ok(hosted.origin.includes('dmy1g9h0h'));assert.equal(browser.syntheticCopiesArchived,true);assert.equal(browser.inventoryWrites,2);
 const body=fs.readFileSync(dir+'/browser-1790239890804-failure.private.txt','utf8');
 // The run failed its final exact-name locator because the governed display name
 // is "Roserade · Trainer Gallery". Preserve the failure and independently check
 // its captured DOM plus DB readback; do not relabel the failed harness as passed.
 for(const text of ['2 matching copies','Roserade · Trainer Gallery','Flapple','USD 6.50','USD 7.25',...browser.copies.map(c=>c.gv_vi_id)])assert.ok(body.includes(text));
 const ids=browser.retainedQaInstances;assert.equal(ids.length,2);for(const id of ids)assert.match(id,/^[a-f0-9-]{36}$/);
 const after=(await query("begin read only;select jsonb_build_object('copies',(select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),'profiles',(select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),'grants',(select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),'batch',(select enabled from vendor_batch_intake_control),'orders',(select count(*) from vendor_orders),'telemetry',(select count(*) from web_events)) as state;rollback;"))[0].state;
 const qa=after.copies.filter(c=>ids.includes(c.id));assert.equal(qa.length,2);
 for(const copy of qa){assert.ok(copy.archived_at);assert.equal(copy.intent,'hold');assert.equal(copy.image_source,'user_photo');assert.equal(copy.condition_label,'LP');const original=browser.copies.find(c=>c.id===copy.id);assert.equal(copy.asking_price_amount,original.asking_price_amount);assert.equal(copy.card_printing_id,original.card_printing_id);}
 const retained={...after,copies:after.copies.filter(c=>!ids.includes(c.id))};assert.deepEqual(retained,read('catalog-apply-intent.private.json').before);
 assert.equal(read('images-applied.json').verified,20079);
 const pkg=JSON.parse(fs.readFileSync(path.join(out,'hosting-package-current.json')));assert.equal(pkg.project,project);
 for(const f of pkg.files)assert.equal(hash(fs.readFileSync(path.join(pkg.dest,f.path))),f.sha256);
 const receipt={at:new Date().toISOString(),status:'passed',scope:'search recovery only; expanded matcher NOT released',deployment,previous,project,hosted:hosted.checks,searchResults:hosted.results,legacyMatch:hosted.legacyMatch,browser:{upload:'two original HEIC scans',matching:'manual recovery; automatic expanded HEIC matching is not qualified',reviewAndReload:true,privateCopiesAdded:2,prices:[6.5,7.25],condition:'LP',sectionsVerified:true,photosRendered:true,inventoryDomVerified:true,harnessFinalLocatorFailed:true,failureReconciled:'Captured DOM contains governed Roserade display name, Flapple and both exact GVVIs; screenshot visually inspected; backend metadata checked.',qaCopiesArchived:true},originalSevenCopiesAndProfilesStoresGrantsUnchanged:true,imagesVerified:20079,productionWrites:0,paymentsEnabled:false,physicalPhoneProof:false,packageSha256:hash(fs.readFileSync(path.join(out,'hosting-package-current.json'))),evidenceHashes:Object.fromEntries(['search-recovery-hosted-1790240031997.json','browser-1790239890804.json','browser-1790239890804-failure.private.txt','browser-1790239890804-failure.png','images-applied.json'].map(f=>[f,hash(fs.readFileSync(dir+'/'+f))]))};
 fs.writeFileSync(proofPath,JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify({proof:proofPath,status:receipt.status}));
}else if(process.argv[2]==='alias'){
 const proof=JSON.parse(fs.readFileSync(proofPath));assert.equal(proof.status,'passed');assert.equal(proof.deployment,deployment);assert.equal(proof.packageSha256,hash(fs.readFileSync(path.join(out,'hosting-package-current.json'))));
 const token=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'))).token;
 async function api(route,body){const r=await fetch('https://api.vercel.com'+route+'?teamId='+team,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});assert.ok(r.ok,'Pilot hosting request failed '+r.status);return r.json();}
 assert.equal((await api('/v4/aliases/'+alias)).deploymentId,previous);const detail=await api('/v13/deployments/'+deployment);assert.equal(detail.projectId,project);assert.equal(detail.readyState,'READY');assert.equal(detail.url,'grookai-vendor-preview-dmy1g9h0h-sosejis-projects.vercel.app');
 await api('/v2/deployments/'+deployment+'/aliases',{alias});assert.equal((await api('/v4/aliases/'+alias)).deploymentId,deployment);
 fs.writeFileSync(dir+'/search-recovery-alias.json',JSON.stringify({at:new Date().toISOString(),previous,deployment,alias,expandedMatching:false},null,2),{flag:'wx'});console.log(JSON.stringify({alias,deployment,expandedMatching:false}));
}else throw Error('Explicit prove/alias required');
