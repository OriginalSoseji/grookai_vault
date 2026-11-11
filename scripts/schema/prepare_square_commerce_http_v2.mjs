// Only the existing task's synthetic local environment and owner canary.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const root='C:/grookai_square_sync_20261110',lab='C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1';
const require=createRequire(root+'/backend/package.json'),file=root+'/apps/web/.env.local',cfg=require('dotenv').parse(fs.readFileSync(file));
assert.equal(cfg.SUPABASE_URL,'http://127.0.0.1:61841');assert.equal(cfg.SQUARE_APP_ID,'synthetic-fixture-app');
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);assert.equal(JSON.parse(fs.readFileSync(lab+'/commerce-upgrade-result-v2.json')).pass,true);
assert.equal(fs.existsSync(lab+'/commerce-http-enabled-v2.json'),false,'Do not duplicate a consumed canary setup');
const fixture=JSON.parse(fs.readFileSync(lab+'/runtime-fixture.private.json'));
const client=require('@supabase/supabase-js').createClient(cfg.SUPABASE_URL,cfg.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const first=await client.rpc('square_controls_set_v1',{p_expected_revision:2,p_linking:true,p_catalog:true,p_owners:[fixture.owner.id]});assert.ifError(first.error);assert.equal(first.data,3);
const second=await client.rpc('square_commerce_controls_set_v2',{p_expected_revision:0,p_enabled:true,p_owners:[fixture.owner.id]});assert.ifError(second.error);assert.equal(second.data,1);
for(const [key,value]of Object.entries({GROOKAI_SQUARE_COMMERCE_ENABLED:'true',SQUARE_WEBHOOK_SIGNATURE_KEY:'synthetic-square-webhook-fixture-key-v2',SQUARE_WEBHOOK_URL:'https://example.invalid/api/square/webhook'})){
 if(cfg[key]!==undefined)assert.equal(cfg[key],value);else fs.appendFileSync(file,key+'='+value+'\n');
}
fs.writeFileSync(lab+'/commerce-http-enabled-v2.json',JSON.stringify({pass:true,target:'LOCAL http://127.0.0.1:61841',catalogRevision:3,commerceRevision:1,syntheticOwnerCanary:true,productionWrites:0,at:new Date().toISOString()},null,2),{flag:'wx'});
console.log(JSON.stringify({pass:true,target:'LOCAL http://127.0.0.1:61841',catalogRevision:3,commerceRevision:1,productionWrites:0}));
