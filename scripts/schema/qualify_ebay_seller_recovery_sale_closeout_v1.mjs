// Signed owner SDK qualification of atomic canonical sale closeout. Provider
// ended-sale evidence is a declared local SQL fixture, not a live eBay sale.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { localSupabaseStatusSecret } from '../lib/local_supabase_cli_status_v1.mjs';
const root='C:/gv_ebay_integrated_20261028',base='C:/gv_intake_recovery_private_20261027/ebay-seller-labs-v1';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const project='ebay-seller-fresh-481-20261028',out=base+'/recovery-sale-closeout-sdk-v1';
assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);
const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres',
  '-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',timeout:60000}).trim();
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'481');
const frozen=JSON.parse(fs.readFileSync(base+'/candidate-frozen-recovery-v1.json'));
assert.equal(createHash('sha256').update(fs.readFileSync(root+'/supabase/migrations/'+frozen.migration)).digest('hex'),frozen.sha256);
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>!/SUPABASE|DATABASE_URL|POSTGRES_URL|SECRET|TOKEN|API_KEY|PASSWORD|VERCEL|BRIDGE_IMPORT/.test(key)));
const credentials=JSON.parse(execFileSync('supabase',['status','--output','json','--workdir',base+'/fresh-481',
  '--network-id',project],{env,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
assert.match(credentials.API_URL,/127\.0\.0\.1:60761/);
for(const key of Object.keys(process.env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete process.env[key];
process.env.SUPABASE_URL='http://127.0.0.1:60761';process.env.SUPABASE_SECRET_KEY=localSupabaseStatusSecret(credentials);
const {createBackendClient}=await import('../../backend/supabase_backend_client.mjs');const admin=createBackendClient();
const ok=result=>{if(result.error)throw Error(result.error.message);return result.data;};
const saved=JSON.parse(fs.readFileSync(base+'/recovery-runtime-qualification-v1/accounts-private.json')),users=[];
for(const user of saved.users){const client=createClient(process.env.SUPABASE_URL,credentials.ANON_KEY,
  {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  ok(await client.auth.signInWithPassword({email:user.email,password:saved.password}));
  assert.equal(ok(await client.auth.getUser()).user.id,user.id);users.push({...user,client});}
const [owner,peer]=users;
const account=ok(await admin.from('ebay_accounts').select('id').eq('user_id',owner.id).eq('provider_user_id','LOCAL-481-SELLER').single());
const printing=ok(await admin.from('card_printings').select('id,card_print_id').order('id').limit(1))[0];
const made=ok(await admin.rpc('admin_vault_instance_create_v1',{p_user_id:owner.id,
  p_card_print_id:printing.card_print_id,p_card_printing_id:printing.id}));
const copy=(Array.isArray(made)?made[0]:made).id,draft=randomUUID(),request=randomUUID();
for(const id of [owner.id,peer.id,account.id,copy,draft,request])assert.match(id,/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/);
save('intent.json',{at:new Date().toISOString(),project,copy,draft,request,candidateSha256:frozen.sha256,
  evidence:'local fixture of a qualified ended listing with sold quantity one',productionWrites:0});
sql(`begin;
insert into public.ebay_seller_drafts_v1(id,user_id,instance_id,account_id,state,copy_identity,
  prepared_snapshot,review_hash,prepared_revision,fee_quote,offer_id,listing_id)
select '${draft}','${owner.id}','${copy}','${account.id}','sale_reported',public.ebay_seller_copy_identity_v1(i),
  '{}',repeat('a',64),1,'{}','closeout-offer-${draft}','closeout-listing-${draft}' from public.vault_item_instances i where id='${copy}';
with operation as (insert into public.ebay_seller_operations_v1(request_id,draft_id,user_id,account_id,kind,status,
  expected_revision,lease_until,stage,snapshot) values(gen_random_uuid(),'${draft}','${owner.id}','${account.id}',
  'publish','uncertain',1,clock_timestamp()-interval '1 minute','publish_started','{}') returning id)
insert into public.ebay_seller_reservations_v1(draft_id,user_id,instance_id,publication_operation_id)
select '${draft}','${owner.id}','${copy}',id from operation;
insert into public.ebay_seller_operations_v1(request_id,draft_id,user_id,account_id,kind,status,
  expected_revision,lease_until,stage,snapshot,receipts)
values(gen_random_uuid(),'${draft}','${owner.id}','${account.id}','reconcile','succeeded',1,clock_timestamp(),'completed','{}',
jsonb_build_array(jsonb_build_object('stage','completed','evidence',jsonb_build_object('sku','gv-${draft}',
  'offerId','closeout-offer-${draft}','listingId','closeout-listing-${draft}','state','sale_reported',
  'providerEnded',true,'providerStatus','ENDED','soldQuantity',1,'releasesReservation',false))));commit;`);
const args={p_draft_id:draft,p_request_id:request,p_expected_revision:1,p_sale_price_cents:1234,p_confirmed:true};
assert.ok((await peer.client.rpc('ebay_seller_record_sale_v1',args)).error);
assert.ok((await owner.client.rpc('ebay_seller_record_sale_v1',{...args,p_confirmed:false})).error);
const results=await Promise.all(Array.from({length:4},async()=>ok(await owner.client.rpc('ebay_seller_record_sale_v1',args))));
assert.ok(results.every(v=>v.state==='sold'));
for(const result of results)assert.deepEqual(result.result,results[0].result);
assert.ok((await owner.client.rpc('ebay_seller_record_sale_v1',{...args,p_sale_price_cents:1235})).error);
const dispositions=ok(await admin.from('vault_item_instance_dispositions').select('id,sale_price_amount,sale_price_currency')
  .eq('vault_item_instance_id',copy));assert.equal(dispositions.length,1);
assert.equal(Number(dispositions[0].sale_price_amount),12.34);assert.equal(dispositions[0].sale_price_currency,'USD');
assert.ok(ok(await admin.from('vault_item_instances').select('archived_at').eq('id',copy).single()).archived_at);
assert.equal(ok(await admin.from('ebay_seller_reservations_v1').select('id').eq('draft_id',draft).is('released_at',null)).length,0);
assert.equal(sql("select linking_enabled::text||':'||preparation_enabled::text||':'||publication_enabled::text||':'||cardinality(canary_actor_ids)::text from public.ebay_seller_controls_v1 where singleton"),'false:false:false:0');
save('result.json',{at:new Date().toISOString(),pass:true,candidateSha256:frozen.sha256,actualOwnerAuth:true,
  concurrentRequests:4,dispositions:1,actualCanonicalWriter:true,ownerConfirmationRequired:true,
  peerDenied:true,conflictingReplayDenied:true,reservationReleased:true,controlsOffAfter:true,
  actualProviderSale:false,productionWrites:0});console.log(JSON.stringify({pass:true,concurrentRequests:4,dispositions:1,productionWrites:0}));
