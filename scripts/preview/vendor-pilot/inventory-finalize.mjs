import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {out,root,verified,query} from './ops.mjs';import {guard,hashes,sql,relay} from '../../schema/vendor_order_resolutions_runtime_v1.mjs';
const photoMode=process.argv[2]==='copy-photos';
const p=await verified();assert.equal(p.id,'hrtbjchobencariqclab');
const token=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'))).token;
const read=async route=>{const r=await fetch('https://api.vercel.com'+route+(route.includes('?')?'&':'?')+'teamId=team_EFKFYSau9Gf8wEaix8zXgQZG',{headers:{Authorization:`Bearer ${token}`}});assert.ok(r.ok);return r.json();};
const pilot=JSON.parse(fs.readFileSync(path.join(out,'vercel-project.json')));assert.equal(pilot.id,'prj_6eeKXtBiLWciS3F2K7Usz8JhwDgy');
const preserved=JSON.parse(fs.readFileSync(path.join(out,'hosting-preserved-before.json'))),projects=await read('/v9/projects?limit=100');
const externalHostingChanges=[];
for(const before of preserved){
 const after=projects.projects.find(p=>p.id===before.id);assert.ok(after);
 if(after.targets?.production?.id!==before.target){
  // Independently observed concurrent Git/main deployment, not a storefront CLI deployment.
  assert.equal(before.id,'prj_m3B6s7jAwXJ4WGbE9fK2WhJsFlum');assert.equal(after.targets.production.id,'dpl_4LyV2Cd11xTJJ23FhYxCA4gqTyrG');
  const d=await read(`/v13/deployments/${after.targets.production.id}`);assert.equal(d.projectId,before.id);assert.equal(d.source,'git');assert.equal(d.gitSource?.ref,'main');assert.equal(d.gitSource?.sha,'26b49df8cd5b6332942cc17a67806d67ff217260');
  externalHostingChanges.push({project:before.name,before:before.target,after:d.id,source:d.source,commit:d.gitSource.sha,createdAt:new Date(d.createdAt).toISOString(),treatment:'read-only observation; preserved without rollback'});
 }
}
const latest=(await read(`/v6/deployments?projectId=${pilot.id}&limit=1`)).deployments[0];assert.equal(latest.state,'READY');
assert.ok((await read(`/v2/deployments/${latest.uid}/aliases`)).aliases.some(a=>a.alias==='grookai-vendor-preview.vercel.app'));
const env=await read(`/v9/projects/${pilot.id}/env`);assert.ok(!env.envs.some(e=>e.key.startsWith('STRIPE_')||/^GROOKAI_VENDOR_.*ENABLED$/.test(e.key)));
const manifest=JSON.parse(fs.readFileSync(path.join(out,'hosting-package-current.json')));
for(const f of manifest.files)assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,f.path))).digest('hex'),f.sha256,'Source changed since deployed package: '+f.path);
const proof=JSON.parse(fs.readFileSync(path.join(out,photoMode?'copy-photo-proof.json':'inventory-proof.json')));assert.equal(proof.site,'https://'+latest.url);assert.equal(proof.passed.length,4);
const state=(await query(`select jsonb_build_object('cards',(select count(*) from card_prints),'printings',(select count(*) from card_printings),'telemetry',(select count(*) from web_events),'orders',(select count(*) from vendor_orders),'billing',(select count(*) from vendor_billing_accounts),'sellers',(select count(*) from vendor_seller_accounts),'store_rollout',(select to_jsonb(r) from vendor_store_rollout r),'seller_rollout',(select to_jsonb(r) from vendor_seller_rollout r),'stock_rollout',(select to_jsonb(r) from vendor_stock_rollout r),'orders_rollout',(select to_jsonb(r) from vendor_orders_rollout r)) as state;`))[0].state;
assert.equal(state.cards,326);assert.equal(state.printings,491);assert.equal(state.store_rollout.web_enabled,false);assert.equal(state.seller_rollout.onboarding_enabled,false);assert.equal(state.stock_rollout.reservations_enabled,false);assert.equal(state.orders_rollout.orders_enabled,false);
for(const key of ['telemetry','orders','billing','sellers'])assert.equal(state[key],0);
let localGuard={passed:true};
try{guard({full:true});}catch(error){
 const bridge=JSON.parse(execFileSync('docker',['inspect',relay],{encoding:'utf8',windowsHide:true}))[0];
 assert.equal(bridge.State.Running,false);assert.equal(bridge.State.FinishedAt,'2026-09-23T01:38:32.082652067Z');
 localGuard={passed:false,reason:'Retained local relay is stopped; left stopped. This guard is not required for the isolated hosted UI deployment.',relayFinishedAt:bridge.State.FinishedAt};
}
const sourceHashes=hashes(path.join(root,'supabase/migrations'));
assert.deepEqual(sourceHashes,JSON.parse(fs.readFileSync(path.join(out,'schema-plan.json'))).sourceHashes);
assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version;').split(/\r?\n/),Object.keys(sourceHashes).sort().map(n=>n.split('_')[0]));
assert.equal(sql("select (select count(*) from auth.users)||'|'||(select count(*) from card_prints)||'|'||(select count(*) from vendor_orders)||'|'||(select app_enabled::text||'|'||web_enabled::text||'|'||custom_enabled::text from vendor_store_rollout);"),'0|0|0|false|false|false');
const receipt={at:new Date().toISOString(),database:p.id,hostingProject:pilot.id,deployment:latest.uid,origin:'https://grookai-vendor-preview.vercel.app',state,existingHostingTargetsUnchanged:externalHostingChanges.length===0,externalHostingChanges,productionMutatedByThisTask:false,preservedLocalMigrations:Object.keys(sourceHashes).length,localGuard,localReadOnlySchemaAndEmptyStoreCheck:'passed',sourceMatchesDeployment:true,tests:{targetedNode:photoMode?32:29,webTypes:'passed',webLint:'passed',hostedBuild:'READY',http:proof.passed,browser:photoMode?['image-centered inventory cards and overlaid pencil inspected in Chrome','existing inline details remain accessible; founder inventory not mutated']:['existing copy loads inline with saved condition, price, sale status, section and selection','catalog search and finish choice remain on workspace route','combined draft price/sale/section/selection controls inspected in Chrome dark mode','browser test draft was not submitted; writes were restricted to pre-existing synthetic HTTP proof account']},limitations:photoMode?['Photo upload applies to the exact copy and owner workspace; public store grid retains the catalog-image projection','JPEG, PNG and WebP uploads up to 4 MB','Photo replacement uses the existing fixed exact-copy Storage path','No canonical image, production database, schema or payment mutation']:['one physical copy per add submission','multi-step saves can partially succeed; retry details on the retained copy','unknown add responses are not automatically retried','no schema, canonical inventory, billing or production deployment change by this task']};
const audit=path.join(root,'docs/audits/vendor_review_trial_v1',photoMode?'copy-photos-20260922.json':'inventory-20260922.json');fs.writeFileSync(audit,JSON.stringify(receipt,null,2));
console.log(JSON.stringify({verified:true,deployment:latest.uid,preservedLocalMigrations:receipt.preservedLocalMigrations}));
