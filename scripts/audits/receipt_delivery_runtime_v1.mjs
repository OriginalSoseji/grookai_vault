// Real Auth/RPC proof on one fixed isolated local lab. Provider I/O is always mocked.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {receiptSender,receiptDeliveryService} from '../../backend/receipts/delivery_v1.mjs';
import {createReceipt,emptyBook} from '../../apps/web/src/lib/receipts/receiptBook.mjs';
const root=process.cwd().replaceAll('\\','/');assert.equal(root,'C:/gv_receipt_delivery_20261005');
const base='C:/grookai_vault_operator_artifacts/receipt_delivery_20261005',lab=base+'/full-429-v1',project='receipt-delivery-full-429-v1-20261005';
const proof=JSON.parse(fs.readFileSync(lab+'/replay-result.json'));assert.equal(proof.status,'passed');assert.equal(proof.migrations,429);
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
const db=JSON.parse(docker('inspect','supabase_db_'+project))[0];assert.equal(db.State.Running,true);assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const sql=q=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe'],maxBuffer:8*1024*1024}).trim();
assert.equal(sql("select current_setting('max_worker_processes')"),'0');assert.equal(sql('select count(*) from auth.users'),'0');
const status=JSON.parse(execFileSync('supabase',['status','-o','json','--workdir',lab],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
assert.equal(new URL(status.API_URL).hostname,'127.0.0.1');assert.equal(new URL(status.API_URL).port,'32701');
const create=key=>createClient(status.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}}),admin=create(status.SECRET_KEY),guest=create(status.PUBLISHABLE_KEY),users=[],checks=[];
const out=base+'/runtime-'+Date.now();fs.mkdirSync(out);const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
const rpc=async(c,n,p)=>{const r=await c.rpc(n,p);assert.equal(r.error,null,JSON.stringify(r.error));return r.data;};
const denied=async(c,n,p)=>{const r=await c.rpc(n,p);assert.ok(r.error,n+' unexpectedly allowed');return r.error;};
const receiptId=randomUUID(),recipient='receipt@fixture.invalid';
const receipt=createReceipt({storeName:'Synthetic receipt shop',confirmed:true,method:'Cash',customer:{name:'Synthetic buyer',email:'',phone:'',wants:'',notes:''},items:[{description:'Synthetic card',quantity:'1',price:'42'}],discount:'0',tax:'0',note:''},receiptId,'2026-10-05T12:00:00.000Z');
let sends=0,lookups=0,cleanup=false;
try {
  for(let i=0;i<2;i++) {
    const email=randomUUID()+'@receipt-proof.invalid',password=randomUUID()+'Aa1!';
    const made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(made.error,null);users.push({id:made.data.user.id});
    const client=create(status.PUBLISHABLE_KEY);assert.equal((await client.auth.signInWithPassword({email,password})).error,null);users[i].client=client;
  }
  save('fixture-ids.json',{users:users.map(u=>u.id),receiptId,project});
  sql('update vendor_receipt_cloud_control set enabled=true;');
  const book={...emptyBook(),storeName:receipt.storeName,receipts:[{receipt,customerId:null}]};
  await rpc(users[0].client,'vendor_receipt_book_save_v1',{p_revision:0,p_request_id:randomUUID(),p_book:book});
  const params={p_request_id:randomUUID(),p_receipt_id:receiptId,p_channel:'email',p_destination:recipient};
  await denied(users[0].client,'vendor_receipt_delivery_request_v1',params);checks.push('default-off');
  sql('update vendor_receipt_delivery_control set email_enabled=true,sms_enabled=true;');
  for(const c of [guest,users[1].client])await denied(c,'vendor_receipt_delivery_request_v1',params);
  assert.deepEqual(await rpc(users[1].client,'vendor_receipt_delivery_read_v1',{p_receipt_id:receiptId}),[]);
  for(const c of [guest,...users.map(u=>u.client)]) {
    assert.ok((await c.from('vendor_receipt_deliveries').select('*')).error);
    await denied(c,'vendor_receipt_delivery_claim_v1',{p_owner_id:users[0].id,p_id:randomUUID()});
    await denied(c,'vendor_receipt_delivery_finish_v1',{p_id:randomUUID(),p_claim_token:randomUUID(),p_status:'delivered'});
    await denied(c,'vendor_receipt_delivery_poll_v1',{p_owner_id:users[0].id,p_id:randomUUID()});
  }
  checks.push('anonymous/foreign-owner/base-table/service-RPC-isolation');
  for(const extra of [{p_channel:'marketing'},{p_channel:'sms',p_destination:'5555550123'},{p_destination:'bad\r\nrecipient@fixture.invalid'}]) {
    const invalid=await denied(users[0].client,'vendor_receipt_delivery_request_v1',{...params,...extra});assert.equal(invalid.code,'22023');
  }
  checks.push('direct-RPC-recipient-and-channel-validation');
  const results=await Promise.all(Array.from({length:8},()=>rpc(users[0].client,'vendor_receipt_delivery_request_v1',{...params,p_request_id:randomUUID()})));
  assert.equal(new Set(results.map(r=>r.id)).size,1);assert.equal(sql('select count(*) from vendor_receipt_deliveries'),'1');
  const storedRequest=sql('select request_id from vendor_receipt_deliveries');
  const conflict=await denied(users[0].client,'vendor_receipt_delivery_request_v1',{...params,p_request_id:storedRequest,p_destination:'different@fixture.invalid'});assert.equal(conflict.code,'PT409');
  checks.push('concurrent-request-deduplication-and-payload-conflict');
  const providerId=randomUUID();
  const sender=receiptSender({env:{GROOKAI_RECEIPT_DELIVERY_ENABLED:'true',RECEIPT_RESEND_API_KEY:'synthetic',RECEIPT_EMAIL_FROM:'receipts@fixture.invalid'},fetchImpl:async(url,options)=>{
    assert.ok(url.startsWith('https://api.resend.com/emails')); // Mock only: no real fetch is delegated.
    if(options.method==='POST'){sends++;assert.equal(JSON.parse(options.body).to[0],recipient);return Response.json({id:providerId});}
    lookups++;return Response.json({id:providerId,to:[recipient],last_event:'delivered'});
  }});
  const service=receiptDeliveryService({owner:users[0].client,admin,ownerId:users[0].id,sender});
  const request={requestId:randomUUID(),receiptId,channel:'email',destination:recipient,confirmed:true};
  await Promise.all(Array.from({length:8},()=>service.send(request)));assert.equal(sends,1);
  const accepted=await service.read(receiptId);assert.equal(accepted[0].status,'accepted');assert.equal('receipt' in accepted[0],false);assert.equal('claim_token' in accepted[0],false);
  await Promise.all(Array.from({length:8},()=>service.read(receiptId,{refresh:true})));assert.equal(lookups,1);assert.equal((await service.read(receiptId))[0].status,'delivered');
  await rpc(admin,'vendor_receipt_delivery_settle_v1',{p_owner_id:users[0].id,p_id:accepted[0].id,p_provider_id:providerId,p_status:'failed'});assert.equal((await service.read(receiptId))[0].status,'delivered');
  checks.push('one-provider-attempt-and-monotonic-delivery-with-throttled-poll');
  let uncertainAttempts=0;
  const uncertain=receiptDeliveryService({owner:users[0].client,admin,ownerId:users[0].id,sender:{capabilities:{email:true},send:async()=>{uncertainAttempts++;throw Error('lost response');},status:async()=>null}});
  const uncertainRequest={...request,requestId:randomUUID(),destination:'uncertain@fixture.invalid'};
  await uncertain.send(uncertainRequest);await uncertain.send(uncertainRequest);assert.equal(uncertainAttempts,1);
  assert.equal((await service.read(receiptId)).find(r=>r.destination===uncertainRequest.destination).status,'uncertain');
  const queued=await rpc(users[0].client,'vendor_receipt_delivery_request_v1',{...params,p_request_id:randomUUID(),p_destination:'interrupted@fixture.invalid'});
  await rpc(admin,'vendor_receipt_delivery_claim_v1',{p_owner_id:users[0].id,p_id:queued.id});
  sql(`update vendor_receipt_deliveries set attempted_at=now()-interval '3 minutes' where id='${queued.id}'`);
  assert.equal((await service.read(receiptId)).find(r=>r.id===queued.id).status,'uncertain');assert.equal(await rpc(admin,'vendor_receipt_delivery_claim_v1',{p_owner_id:users[0].id,p_id:queued.id}),null);
  checks.push('lost-response-and-expired-claim-never-resend');
  const pending=await rpc(users[0].client,'vendor_receipt_delivery_request_v1',{...params,p_request_id:randomUUID(),p_destination:'disabled@fixture.invalid'});
  sql('update vendor_receipt_delivery_control set email_enabled=false,sms_enabled=false;');
  assert.equal(await rpc(admin,'vendor_receipt_delivery_claim_v1',{p_owner_id:users[0].id,p_id:pending.id}),null);
  await denied(users[0].client,'vendor_receipt_delivery_request_v1',{...params,p_request_id:randomUUID(),p_destination:'new@fixture.invalid'});
  assert.deepEqual((await rpc(users[0].client,'vendor_receipt_book_read_v1')).book,book);assert.equal(sql('select count(*) from vault_item_instances'),'0');checks.push('disable-before-dispatch-and-receipt/inventory-unchanged');
  sql('update vendor_receipt_delivery_control set email_enabled=true;');
  await rpc(users[1].client,'vendor_receipt_book_save_v1',{p_revision:0,p_request_id:randomUUID(),p_book:book});
  sql(`insert into vendor_receipt_deliveries(owner_id,request_id,receipt_id,channel,destination,receipt)
    select '${users[1].id}'::uuid,gen_random_uuid(),'${receiptId}'::uuid,'email',n::text||'@quota.invalid',book->'receipts'->0->'receipt'
    from vendor_receipt_books cross join generate_series(1,100) n where owner_id='${users[1].id}'::uuid;`);
  const limited=await denied(users[1].client,'vendor_receipt_delivery_request_v1',{...params,p_request_id:randomUUID()});assert.equal(limited.code,'PT429');checks.push('hourly-send-quota');
  save('rows.private.json',JSON.parse(sql("select coalesce(json_agg(to_jsonb(d)-'claim_token'),'[]') from vendor_receipt_deliveries d")));
} finally {
  for(const user of users)assert.equal((await admin.auth.admin.deleteUser(user.id)).error,null);
  sql('update vendor_receipt_delivery_control set email_enabled=false,sms_enabled=false;update vendor_receipt_cloud_control set enabled=false;');
  const state=JSON.parse(sql("select json_build_object('users',(select count(*) from auth.users),'deliveries',(select count(*) from vendor_receipt_deliveries),'books',(select count(*) from vendor_receipt_books),'cloud',(select enabled from vendor_receipt_cloud_control),'email',(select email_enabled from vendor_receipt_delivery_control),'sms',(select sms_enabled from vendor_receipt_delivery_control))"));
  assert.deepEqual(state,{users:0,deliveries:0,books:0,cloud:false,email:false,sms:false});save('cleanup.json',state);cleanup=true;
}
const files=['supabase/migrations/20261005150000_vendor_receipt_delivery_v1.sql','backend/receipts/delivery_v1.mjs','apps/web/src/lib/receipts/receiptDelivery.mjs','apps/web/src/lib/receipts/receiptDesk.mjs'];
save('receipt.json',{at:new Date().toISOString(),status:'passed',project,actualAuth:true,actualRPC:true,providerMocked:true,sends,lookups,checks,cleanup,productionWrites:0,sourceHashes:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(root+'/'+f)).digest('hex')]))});
console.log(JSON.stringify({status:'passed',checks:checks.length,productionWrites:0,providerMocked:true,out}));
