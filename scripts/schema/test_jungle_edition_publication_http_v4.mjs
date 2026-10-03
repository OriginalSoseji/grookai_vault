// Signed-in Auth/PostgREST price readback against the retained local canary only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const fixture=base+'/full-415-v17',project='jungle-edition-full-415-v17-20261001';
assert.equal(process.argv.length,2);
const hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
assert.equal(hash(fs.readFileSync('supabase/migrations/20261001050000_jungle_edition_foundation_v1.sql')),freeze.sourceHashes['20261001050000_jungle_edition_foundation_v1.sql']);
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(createHash('sha256').update(fs.readFileSync('supabase/migrations/'+name)).digest('hex'),digest,name);
const receipts=fs.readdirSync(base).filter(n=>n.startsWith('publication-pipeline-v5-')&&fs.existsSync(base+'/'+n+'/receipt.json'));
assert.equal(receipts.length,1);const proof=JSON.parse(fs.readFileSync(base+'/'+receipts[0]+'/receipt.json'));
assert.equal(proof.project,project);assert.equal(proof.status,'passed');const ids=proof.ids;
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8',windowsHide:true}))[0].Internal,true);
const env={...process.env};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
const config=JSON.parse(execFileSync('supabase',['status','--output','json','--workdir',fixture,'--network-id',project],{encoding:'utf8',windowsHide:true,env,stdio:['ignore','pipe','pipe']}));
assert.equal(config.API_URL,'http://127.0.0.1:64841');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,options),owner=createClient(config.API_URL,config.ANON_KEY,options),anon=createClient(config.API_URL,config.ANON_KEY,options);
const out=base+'/publication-http-v4-'+Date.now();fs.mkdirSync(out);
fs.writeFileSync(out+'/intent.json',JSON.stringify({at:new Date().toISOString(),project,consumed:true,productionWrites:0}),{flag:'wx'});
const tests=[],email=randomUUID()+'@jungle-pricing-test.invalid',password=randomUUID()+'aA!8';
const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(created.error);
const login=await owner.auth.signInWithPassword({email,password});assert.ifError(login.error);assert.equal(login.data.user.id,created.data.user.id);tests.push('genuine_auth_session_created');
try{
 const read=await owner.rpc('get_market_pricing_read_model_v1',{p_card_print_ids:[ids.legacy,ids.first,ids.unlimited],p_card_printing_ids:[ids.firstChild,ids.unlimitedChild]});
 assert.ifError(read.error);assert.equal(read.data.length,5);tests.push('authenticated_batched_parent_child_rpc');
 const legacy=read.data.filter(r=>r.card_print_id===ids.legacy);assert.equal(legacy.length,1);assert.equal(legacy[0].status,'unavailable');assert.equal(legacy[0].market_close,null);tests.push('unconfirmed_legacy_has_no_edition_price_fallback');
 for(const [id,amount,name]of [[ids.first,102,'first_edition'],[ids.unlimited,20,'unlimited']]){
  const rows=read.data.filter(r=>r.card_print_id===id);assert.equal(rows.length,2);
  assert.ok(rows.every(r=>r.status==='available'&&Number(r.market_close)===amount));tests.push(name+'_parent_and_child_exact_quote');
  assert.equal(new Set(rows.map(r=>r.provenance_id)).size,1);tests.push(name+'_parent_child_share_frozen_snapshot_provenance');
 }
 const copies=await admin.from('vault_item_instances').select('id,card_print_id,card_printing_id').eq('user_id',ids.user);
 assert.ifError(copies.error);assert.equal(copies.data.length,5);assert.ok(copies.data.every(r=>r.card_print_id===ids.legacy));tests.push('five_saved_unconfirmed_copies_remain_on_legacy_identity');
 for(const [client,label]of [[anon,'anonymous'],[owner,'authenticated']]){
  const privateRows=await client.from('v_tcgplayer_market_qualification_candidates_v2').select('*');assert.ok(privateRows.error);tests.push(label+'_worker_candidate_view_denied');
  const validator=await client.rpc('jungle_edition_price_row_valid_v1',{row_data:{}});assert.ok(validator.error);tests.push(label+'_internal_validator_denied');
 }
 const attempts=await owner.from('market_price_current_publication').update({run_id:randomUUID()}).eq('singleton',true);assert.ok(attempts.error);tests.push('collector_cannot_change_publication');
 const pointer=await admin.from('market_price_current_publication').select('run_id').single();assert.ifError(pointer.error);assert.equal(pointer.data.run_id,proof.canaryRun);tests.push('verified_test_canary_stays_current');
 const receipt={status:'passed',at:new Date().toISOString(),project,testCount:tests.length,tests,sourceSha256:proof.sourceSha256,scriptSha256:hash(fs.readFileSync(new URL(import.meta.url))),productionWrites:0,ownershipWrites:0,hostedAppProof:false,output:out};
 fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}finally{await owner.auth.signOut();}
