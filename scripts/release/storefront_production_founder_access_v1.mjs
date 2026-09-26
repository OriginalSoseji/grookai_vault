// Extend only the existing active bootstrap founder grant. No new account/role.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dir,save,read,query} from './storefront_production_live_common_v1.mjs';
assert.equal(process.argv.length,2);assert.ok(!fs.existsSync(dir+'/founder-access-intent.json'));
const before=read('activation-plan.private.json').before.entitlements;
assert.equal(before.length,1);const e=before[0];assert.equal(e.id,'16c600f5-93f1-445f-9983-8e6b9c74a730');assert.equal(e.tier,'founder_admin');assert.equal(e.role,'founder');assert.equal(e.is_active,true);assert.equal(e.source,'bootstrap_migration');
const result=(await query(`begin read only;select to_jsonb(e) as row,(select count(*) from auth.users u where u.id=e.user_id or lower(u.email)=lower(e.email)) as matching_users from user_entitlements e where e.id='${e.id}';rollback;`))[0];assert.deepEqual(result.row,e);assert.equal(result.matching_users,1);
save('founder-access-intent.json',{at:new Date().toISOString(),entitlementId:e.id,addFeatures:['store_app','store_web'],matchingUsers:1,publish:false});
const encoded=JSON.stringify(e.features).replaceAll("'","''");
const updated=await query(`begin;update user_entitlements set features=features||'{"store_app":true,"store_web":true}'::jsonb where id='${e.id}' and is_active and source='bootstrap_migration' and features='${encoded}'::jsonb returning to_jsonb(user_entitlements) as row;commit;`);
assert.equal(updated.length,1);const after=updated[0].row;assert.deepEqual(after.features,{...e.features,store_app:true,store_web:true});
for(const key of Object.keys(e).filter(k=>!['features','updated_at'].includes(k)))assert.deepEqual(after[key],e[key]);
save('founder-access.private.json',{at:new Date().toISOString(),before:e,after});console.log(JSON.stringify({status:'passed',existingFounderGrantExtended:true,accounts:1,autoPublication:false,paymentAccessEnabled:false}));
