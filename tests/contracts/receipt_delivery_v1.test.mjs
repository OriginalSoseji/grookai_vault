import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {assertCollectorReleaseEnvironment} from '../../apps/web/src/lib/collectorRelease.mjs';
import {receiptSender,receiptDeliveryInput,receiptDeliveryService} from '../../backend/receipts/delivery_v1.mjs';
import {receiptDeliveryTransport,receiptDeliveryLabel} from '../../apps/web/src/lib/receipts/receiptDelivery.mjs';
import {createReceipt} from '../../apps/web/src/lib/receipts/receiptBook.mjs';
const ownerId=randomUUID(),receiptId=randomUUID();
const receipt=createReceipt({storeName:'Synthetic <Shop>',confirmed:true,method:'Cash',customer:{name:'Buyer',email:'',phone:'',wants:'',notes:''},items:[{description:'Card <one>',quantity:'1',price:'12.34'}],discount:'0',tax:'0',note:''},receiptId,'2026-10-05T12:00:00.000Z');
const job=(channel='email')=>({id:randomUUID(),owner_id:ownerId,claim_token:randomUUID(),receipt_id:receiptId,receipt,template_version:1,channel,destination:channel==='email'?'buyer@fixture.invalid':'+15555550123',status:'sending'});
const input=()=>({requestId:randomUUID(),receiptId,channel:'email',destination:'buyer@fixture.invalid',confirmed:true});
const env={GROOKAI_RECEIPT_DELIVERY_ENABLED:'true',RECEIPT_RESEND_API_KEY:'synthetic',RECEIPT_EMAIL_FROM:'receipts@fixture.invalid',RECEIPT_TWILIO_ACCOUNT_SID:'AC'+'1'.repeat(32),RECEIPT_TWILIO_AUTH_TOKEN:'synthetic',RECEIPT_TWILIO_MESSAGING_SERVICE_SID:'MG'+'2'.repeat(32)};

test('request accepts only an explicit saved receipt, channel, recipient and confirmation',()=>{
  assert.equal(receiptDeliveryInput({...input(),destination:' buyer@fixture.invalid '}).destination,'buyer@fixture.invalid');
  for(const patch of [{confirmed:false},{receiptId:'bad'},{ownerId},{body:'unsaved content'},{destination:'a@b.invalid\r\nBcc: victim@fixture.invalid'},{channel:'marketing'},{channel:'sms',destination:'5555550123'}])assert.throws(()=>receiptDeliveryInput({...input(),...patch}));
});
test('configuration defaults closed and never contacts a provider',async()=>{
  let calls=0;const sender=receiptSender({env:{...env,GROOKAI_RECEIPT_DELIVERY_ENABLED:'false'},fetchImpl:async()=>{calls++;throw Error('forbidden');}});
  assert.deepEqual(sender.capabilities,{email:false,sms:false});await assert.rejects(()=>sender.send(job()));assert.equal(calls,0);
  assert.equal(receiptSender({env:{...env,RECEIPT_TWILIO_ACCOUNT_SID:'../../elsewhere'}}).capabilities.sms,false);
  assert.deepEqual(receiptSender({env:{...env,NEXT_PUBLIC_COLLECTOR_STAGING:'true'}}).capabilities,{email:false,sms:false});
});
test('receipt proof mode accepts only the isolated local API and production rejects the flag',()=>{
  const base={};for(const [k,v]of Object.entries(process.env))if(!/SUPABASE|NEXT_PUBLIC_|VERCEL|GROOKAI/.test(k))base[k]=v;
  const module=new URL('../../apps/web/src/lib/collectorStaging.mjs',import.meta.url).href;
  const check=(url,extra={})=>spawnSync(process.execPath,['--input-type=module','-e',`import {assertCollectorStagingTarget} from ${JSON.stringify(module)};assertCollectorStagingTarget(${JSON.stringify(url)});`],{env:{...base,NEXT_PUBLIC_RECEIPT_DELIVERY_LOCAL_TEST:'true',...extra},encoding:'utf8'}).status;
  assert.equal(check('http://127.0.0.1:65401'),0);
  for(const url of ['http://127.0.0.1:65301','http://127.0.0.1:65421','https://ycdxbpibncqcchqiihfz.supabase.co','http://localhost:65401','http://127.0.0.1:65401/path'])assert.notEqual(check(url),0);
  assert.notEqual(check('http://127.0.0.1:65401',{NEXT_PUBLIC_SALES_TRADE_LOCAL_TEST:'true'}),0);
  assert.throws(()=>assertCollectorReleaseEnvironment({GROOKAI_COLLECTOR_RELEASE_V1:'true',NEXT_PUBLIC_RECEIPT_DELIVERY_LOCAL_TEST:'true'}),/test modes/);
});
test('email uses a fixed endpoint, one recipient, escaped HTML and stable idempotency key',async()=>{
  const j=job(),providerId=randomUUID();let calls=0;
  const sender=receiptSender({env,fetchImpl:async(url,options)=>{
    calls++;assert.equal(url,'https://api.resend.com/emails');assert.equal(options.redirect,'error');assert.equal(options.headers['Idempotency-Key'],'receipt-v1/'+j.id);
    const body=JSON.parse(options.body);assert.deepEqual(body.to,[j.destination]);assert.equal(body.from,env.RECEIPT_EMAIL_FROM);assert.match(body.html,/&lt;Shop&gt;/);assert.match(body.text,/12\.34/);assert.match(body.text,/not a Grookai-processed payment/);assert.ok(!Object.hasOwn(body,'bcc'));return Response.json({id:providerId});
  }});
  assert.deepEqual(await sender.send(j),{status:'accepted',providerId});assert.equal(calls,1);
});
test('SMS uses configured messaging service and complete receipt; oversized receipt is not truncated or sent',async()=>{
  let calls=0;const sender=receiptSender({env,fetchImpl:async(url,options)=>{
    calls++;assert.equal(url,`https://api.twilio.com/2010-04-01/Accounts/${env.RECEIPT_TWILIO_ACCOUNT_SID}/Messages.json`);const body=new URLSearchParams(options.body);assert.equal(body.get('MessagingServiceSid'),env.RECEIPT_TWILIO_MESSAGING_SERVICE_SID);assert.match(body.get('Body'),/12\.34/);return Response.json({sid:'SM'+'3'.repeat(32)});
  }});
  assert.equal((await sender.send(job('sms'))).status,'accepted');
  assert.deepEqual(await sender.send({...job('sms'),receipt:{...receipt,note:'x'.repeat(2000)}}),{status:'failed',failureCode:'receipt_too_long_for_sms'});assert.equal(calls,1);
});
test('timeouts, redirects, server errors and malformed success responses never claim delivery or safe failure',async()=>{
  for(const result of [()=>{throw Error('timeout secret details');},()=>new Response('',{status:503}),()=>new Response('bad json',{status:200}),()=>Response.json({id:'bad'})]) {
    const sender=receiptSender({env,fetchImpl:async()=>result()});const outcome=await sender.send(job());assert.equal(outcome.status,'uncertain');assert.ok(!JSON.stringify(outcome).includes('secret'));
  }
  const sender=receiptSender({env,fetchImpl:async()=>new Response('',{status:422})});assert.equal((await sender.send(job())).status,'failed');
});
test('accepted is distinct from delivered; provider lookup validates ID and recipient',async()=>{
  const j={...job(),status:'accepted',provider_id:randomUUID()};
  for(const [data,want] of [[{id:j.provider_id,to:[j.destination],last_event:'sent'},null],[{id:j.provider_id,to:[j.destination],last_event:'delivered'},'delivered'],[{id:j.provider_id,to:['foreign@fixture.invalid'],last_event:'delivered'},null],[{id:randomUUID(),to:[j.destination],last_event:'delivered'},null],[{id:j.provider_id,to:[j.destination],last_event:'bounced'},'failed']]) {
    const sender=receiptSender({env,fetchImpl:async()=>Response.json(data)});assert.equal(await sender.status(j),want);
  }
  assert.match(receiptDeliveryLabel('accepted'),/not yet confirmed/);assert.match(receiptDeliveryLabel('uncertain'),/do not resend/);
});
test('SMS status rejects a different account and uses provider delivery, not queued/sent',async()=>{
  const j={...job('sms'),status:'accepted',provider_id:'SM'+'3'.repeat(32)};
  for(const [status,account,want] of [['sent',env.RECEIPT_TWILIO_ACCOUNT_SID,null],['delivered',env.RECEIPT_TWILIO_ACCOUNT_SID,'delivered'],['delivered','AC'+'9'.repeat(32),null],['undelivered',env.RECEIPT_TWILIO_ACCOUNT_SID,'failed']]) {
    const sender=receiptSender({env,fetchImpl:async()=>Response.json({sid:j.provider_id,to:j.destination,account_sid:account,status})});assert.equal(await sender.status(j),want);
  }
});
function stateful({lostFinish=false,foreign=false}={}) {
  const j=job();j.status='queued';let sends=0;
  const owner={rpc:async(name)=>({data:name.endsWith('request_v1')?{id:j.id}:name.endsWith('capabilities_v1')?{email:true,sms:true}:foreign?[]:[{id:j.id,status:j.status}],error:null})};
  const admin={rpc:async(name,p)=>{
    if(name.endsWith('claim_v1')){assert.equal(p.p_owner_id,ownerId);if(j.status!=='queued')return {data:null};j.status='sending';return {data:{...j}};}
    if(name.endsWith('finish_v1')){if(lostFinish)return {error:{message:'transport failed'}};j.status=p.p_status;return {data:null};}
    throw Error('Unexpected privileged call');
  }};
  const sender={capabilities:{email:true,sms:true},send:async()=>{sends++;await new Promise(r=>setTimeout(r,5));return {status:'accepted',providerId:randomUUID()};},status:async()=>{throw Error('No foreign lookup');}};
  return {service:()=>receiptDeliveryService({owner,admin,ownerId,sender}),sends:()=>sends,state:()=>j.status};
}
test('concurrent sends and new process retries consume one durable claim',async()=>{
  const fixture=stateful();await Promise.all([fixture.service().send(input()),fixture.service().send(input())]);await fixture.service().send(input());assert.equal(fixture.sends(),1);assert.equal(fixture.state(),'accepted');
});
test('lost outcome write never causes a second provider attempt',async()=>{
  const fixture=stateful({lostFinish:true});await assert.rejects(()=>fixture.service().send(input()));await fixture.service().send(input());assert.equal(fixture.sends(),1);assert.equal(fixture.state(),'sending');
});
test('foreign receipt read cannot invoke privileged lookup or provider status',async()=>{
  const fixture=stateful({foreign:true});assert.deepEqual(await fixture.service().read(receiptId,{refresh:true}),[]);
});
test('delivery UI transport binds the account before and after HTTP and omits cached private responses',async()=>{
  let actor=ownerId,calls=0;const client={auth:{getSession:async()=>({data:{session:actor?{user:{id:actor},access_token:'synthetic'}:null}})}};
  const transport=receiptDeliveryTransport(client,async(_,options)=>{calls++;assert.equal(options.cache,'no-store');return Response.json({deliveries:[]});});
  await transport(undefined,receiptId);actor=randomUUID();await assert.rejects(()=>transport(input()));assert.equal(calls,1);
  actor=ownerId;const changed=receiptDeliveryTransport(client,async()=>{actor=randomUUID();return Response.json({deliveries:[]});});await assert.rejects(()=>changed(input()),/changed/);
});
