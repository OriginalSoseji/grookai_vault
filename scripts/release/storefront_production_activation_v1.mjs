// Bounded browse-only rollout, with paid controls retained off. No publication.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {root,dir,ref,save,read,query,stateSql} from './storefront_production_live_common_v1.mjs';
import {METADATA_SOURCE_SHA256,METADATA_SHA256} from '../../apps/web/src/lib/stores/scanReferenceMetadataV27.mjs';
import {FEATURE_MANIFEST_PINS} from '../../apps/web/src/lib/stores/scanFeatureManifestV29.mjs';
const mode=process.argv[2];assert.equal(process.argv.length,3);assert.ok(['prepare','activate','readback'].includes(mode));
const current=(await query('begin read only;'+stateSql+'rollback;'))[0].state;
assert.equal(current.migrations,402);
for(const [table,key] of [['seller','onboarding_enabled'],['stock','reservations_enabled'],['orders','orders_enabled']])assert.equal(current[table][key],false);
if(mode==='prepare'){
  for(const key of ['app_enabled','web_enabled','custom_enabled'])assert.equal(current.stores[key],false);
  assert.equal(current.scan.enabled,false);assert.equal(current.batch.enabled,false);assert.equal(current.store_count,0);assert.equal(current.invite_count,0);
  const invites=['review','smoke'].map((name,n)=>({name,id:randomUUID(),code:randomBytes(32).toString('hex'),maxMembers:n?2:10}));
  save('activation-plan.private.json',{at:new Date().toISOString(),target:ref,before:current,invites,expiresAt:new Date(Date.now()+14*86400000).toISOString(),pins:{database_ref:ref,artifact_sha256:METADATA_SOURCE_SHA256,metadata_sha256:METADATA_SHA256,feature_manifest_sha256:FEATURE_MANIFEST_PINS.sha256}});
  console.log(JSON.stringify({status:'prepared',existingEntitlements:current.entitlements.map(e=>({id:e.id,tier:e.tier,role:e.role,source:e.source,features:e.features,userBound:Boolean(e.user_id),active:e.is_active})),stores:current.store_count,invites:invites.map(({name,maxMembers})=>({name,maxMembers})),paymentsEnabled:false}));
}else if(mode==='activate'){
  const p=read('activation-plan.private.json');assert.deepEqual(current,p.before);assert.ok(!fs.existsSync(dir+'/activation-intent.json'));
  const ready=JSON.parse(fs.readFileSync(root+'/.local/integration/production-web-v4/ready.json'));assert.equal(ready.state,'READY');
  const assets=JSON.parse(fs.readFileSync(root+'/docs/audits/storefront_production_20260926/feature-inventory.json'));assert.equal(assets.status,'passed');
  const q=v=>"'"+String(v).replaceAll("'","''")+"'";
  const sql=`begin;set local lock_timeout='5s';set local statement_timeout='30s';
    lock table vendor_store_rollout,vendor_batch_intake_control,vendor_scan_control,vendor_store_trial_invites in exclusive mode;
    update vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true where singleton;
    update vendor_batch_intake_control set enabled=true where singleton;
    update vendor_scan_control set enabled=true,${Object.entries(p.pins).map(([k,v])=>k+'='+q(v)).join(',')} where singleton;
    ${p.invites.map(i=>`insert into vendor_store_trial_invites(id,code_hash,expires_at,max_members) values(${q(i.id)},${q(createHash('sha256').update(i.code).digest('hex'))},${q(p.expiresAt)},${i.maxMembers});`).join('\n')}
    ${stateSql}commit;`;
  save('activation-intent.json',{at:new Date().toISOString(),target:ref,sqlSha256:createHash('sha256').update(sql).digest('hex'),deployment:ready.id,paymentsEnabled:false});
  const result=(await query(sql))[0].state;save('activation-result.private.json',result);assert.deepEqual(result.entitlements,p.before.entitlements);
  console.log(JSON.stringify({status:'activated',trialInvites:2,grantsChanged:0,publicationChanges:0,paymentsEnabled:false}));
}else{
  assert.equal(current.stores.app_enabled,true);assert.equal(current.stores.web_enabled,true);assert.equal(current.stores.custom_enabled,true);assert.equal(current.batch.enabled,true);assert.equal(current.scan.enabled,true);
  const p=read('activation-plan.private.json');for(const[k,v]of Object.entries(p.pins))assert.equal(current.scan[k],v);
  const receipt={at:new Date().toISOString(),status:'passed',target:ref,controls:{stores:current.stores,batch:current.batch,scan:current.scan,seller:current.seller,stock:current.stock,orders:current.orders},noAutomaticPublication:true};
  save('activation-readback.json',receipt);console.log(JSON.stringify(receipt));
}
