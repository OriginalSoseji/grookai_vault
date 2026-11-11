// Real local Auth, canonical add/offer writes, HTTP routes and durable backend.
// Provider transport is explicitly synthetic. This never proves a live sale.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHmac,randomUUID,createHash} from 'node:crypto';
const root='C:/grookai_square_sync_20261110',lab='C:/grookai_vault_operator_artifacts/square_sync_20261110/local-fresh-v1';
const require=createRequire(root+'/backend/package.json'),cfg=require('dotenv').parse(fs.readFileSync(root+'/apps/web/.env.local'));
assert.equal(cfg.SUPABASE_URL,'http://127.0.0.1:61841');assert.equal(cfg.SQUARE_APP_ID,'synthetic-fixture-app');
const fixture=JSON.parse(fs.readFileSync(lab+'/runtime-fixture.private.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const originalManifest=JSON.parse(fs.readFileSync(root+'/docs/audits/square_commerce_20261111/release-manifest.json'));
const backendFiles=fs.readdirSync(root+'/backend/square',{recursive:true}).filter(n=>/\.mjs$/.test(n)).map(n=>'backend/square/'+n.replaceAll('\\','/'));
const sourceFiles=[...new Set([...Object.keys(originalManifest.runtimeSources).filter(n=>!n.endsWith('.md')),...backendFiles,
 'backend/supabase_backend_client.mjs','backend/env.mjs','backend/package-lock.json','apps/web/package-lock.json',
 'scripts/schema/square_provider_fixture_v2.mjs','scripts/schema/square_provider_preload_v2.mjs','scripts/schema/qualify_square_http_commerce_v2.mjs'])].sort();
const captureSources=()=>Object.fromEntries(sourceFiles.map(n=>[n,sha(fs.readFileSync(root+'/'+n,'utf8').replaceAll('\r\n','\n'))]));
const sourceHashes=captureSources(),environmentFingerprint=sha(fs.readFileSync(root+'/apps/web/.env.local'));
const resume=process.argv[2];assert.ok(!resume||/^--resume=http-commerce-\d+\.json$/.test(resume));
const prior=resume?JSON.parse(fs.readFileSync(lab+'/'+resume.slice(9))):null;
if(prior){assert.equal(prior.productionWrites,0);assert.equal(prior.pass,false);assert.ok(prior.instanceId&&prior.gvvi&&prior.providerSale);}
const output=lab+'/http-commerce-'+Date.now()+'.json',proof={...(prior??{}),at:new Date().toISOString(),productionWrites:0,provider:'synthetic loopback',stages:prior?.stages??[],resumedFrom:resume?.slice(9),sourceHashes,environmentFingerprint};
delete proof.failure;delete proof.pass;
const save=()=>fs.writeFileSync(output,JSON.stringify(proof,null,2),{mode:0o600});save();
const client=require('@supabase/supabase-js').createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const login=await client.auth.signInWithPassword({email:fixture.owner.email,password:fixture.owner.password});assert.ifError(login.error);
// Native's existing Edge add authenticates with getUser and then invokes this
// service-only authority. Keep that grant boundary; this diagnostic exercises
// its exact SDK authority, while device acceptance must still prove the Edge.
const verified=await client.auth.getUser();assert.ifError(verified.error);assert.equal(verified.data.user.id,fixture.owner.id);
proof.actualLocalAuth=true;
const admin=require('@supabase/supabase-js').createClient(cfg.SUPABASE_URL,cfg.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={Authorization:'Bearer '+login.data.session.access_token,'Content-Type':'application/json'};
const request=async(path,body)=>{
 for(let attempt=0;attempt<40;attempt++){
 const response=await fetch('http://127.0.0.1:61850'+path,{headers,method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(90000)});
 const value=await response.json();
 if(response.status===409&&value.code==='square_connection_busy'&&attempt<39){await new Promise(resolve=>setTimeout(resolve,250));continue;}
 assert.equal(response.status,200,JSON.stringify(value));return value;
 }
};
const action=body=>request('/api/square',{connectionId:fixture.connectionId,...body});
const stage=name=>{proof.stages.push(name);save();console.log('LOCAL HTTP: '+name);};
const inspect=()=>JSON.parse(fs.readFileSync(lab+'/provider-fixture-state-v2.private.json'));
const provider=async(path,body)=>{
 const r=await fetch('http://127.0.0.1:61852/fixture/'+path,{method:'POST',headers:{'Content-Type':'application/json','x-grookai-fixture':'local-only'},body:JSON.stringify(body)});
 const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));return value;
};
try{
 let copy,variation,sale;
 if(!prior){
 const parent=await client.from('vault_item_instances').select('card_print_id,card_printing_id').eq('id',fixture.copies[0].copy_id).single();assert.ifError(parent.error);
 const added=await admin.rpc('vault_add_card_instance_service_v1',{p_actor_user_id:verified.data.user.id,p_card_print_id:parent.data.card_print_id,p_card_printing_id:parent.data.card_printing_id,p_quantity:1,p_condition_label:'NM'});assert.ifError(added.error);
 copy=await client.from('vault_item_instances').select('id,gv_vi_id,intent,archived_at').eq('gv_vi_id',added.data.gv_vi_id).single();assert.ifError(copy.error);
 proof.instanceId=copy.data.id;proof.gvvi=copy.data.gv_vi_id;save();
 assert.notEqual(copy.data.intent,'sell');
 await action({action:'preferences',autoEnroll:true,sellOnSquare:true,confirmed:true});
 await request('/api/square/notify',{instanceId:copy.data.id});
 assert.equal(inspect().catalog.some(item=>item.item_data.variations.some(v=>v.item_variation_data.sku.endsWith('/'+copy.data.gv_vi_id))),false);
 stage('canonical add remains private until For sale');
 const offer=await client.from('vault_item_instances').update({intent:'sell',pricing_mode:'asking',asking_price_amount:19.75,asking_price_currency:'USD'}).eq('id',copy.data.id).select('id').single();assert.ifError(offer.error);
 const racing=await Promise.all(Array.from({length:3},()=>request('/api/square/notify',{instanceId:copy.data.id})));
 proof.concurrentOwnerWakeups=3;
 assert.ok(racing.every(row=>['ready','pending'].includes(row.status)),JSON.stringify(racing));
 const ready=await request('/api/square/notify',{instanceId:copy.data.id});assert.equal(ready.status,'ready',JSON.stringify(ready));
 const sku='https://grookaivault.com/q/'+copy.data.gv_vi_id;
 let state=inspect(),items=state.catalog.filter(item=>item.item_data.variations.some(v=>v.item_variation_data.sku===sku));assert.equal(items.length,1);
 variation=items[0].item_data.variations.find(v=>v.item_variation_data.sku===sku);assert.equal(variation.item_variation_data.price_money.amount,1975);assert.equal(state.counts[variation.id],1);
 await request('/api/square/notify',{instanceId:copy.data.id});
 assert.equal(inspect().catalog.filter(item=>item.item_data.variations.some(v=>v.item_variation_data.sku===sku)).length,1);assert.equal(inspect().counts[variation.id],1);
 stage('three concurrent owner wakeups create one exact QR SKU and one stock unit');
 const denied=await client.from('vault_item_instances').update({archived_at:new Date().toISOString()}).eq('id',copy.data.id);assert.ok(denied.error);assert.equal(denied.error.code,'55000');
 stage('allocated physical copy rejects competing manual disposition');
 const changed=await client.from('vault_item_instances').update({asking_price_amount:18.25}).eq('id',copy.data.id);assert.ifError(changed.error);
 await provider('fail-next-catalog-write',{});
 const review=await request('/api/square/notify',{instanceId:copy.data.id});assert.equal(review.status,'review');
 const diagnostics=await admin.rpc('square_commerce_run_health_v3',{p_environment:'sandbox'});assert.ifError(diagnostics.error);
 const ownerWorkspace=await request('/api/square'),currentTarget=ownerWorkspace.connections.find(c=>c.id===fixture.connectionId).targets.find(t=>t.instanceId===copy.data.id);assert.ok(currentTarget);
 const failed=diagnostics.data.recentRuns.find(run=>run.errorDetail?.targetId===currentTarget.id&&run.status==='failed');assert.ok(failed);
 assert.equal(failed.connectionId,fixture.connectionId);assert.equal(failed.stage,'catalog');assert.equal(failed.errorCode,'square_provider_unavailable');
 assert.equal(inspect().counts[variation.id],1);
 stage('failed price update persists connection, target and stage without changing stock');
 // A different card's wakeup must recover the existing saved request before
 // processing its own focus; recovery cannot depend on reopening the failed card.
 const recovered=await request('/api/square/notify',{instanceId:fixture.copies.find(c=>c.owner_id===fixture.owner.id).copy_id});assert.equal(recovered.status,'ready');
 assert.equal(inspect().catalog.flatMap(i=>i.item_data.variations).find(v=>v.id===variation.id).item_variation_data.price_money.amount,1825);
 const restored=await client.from('vault_item_instances').update({asking_price_amount:19.75}).eq('id',copy.data.id);assert.ifError(restored.error);
 assert.equal((await request('/api/square/notify',{instanceId:copy.data.id})).status,'ready');
 assert.equal(inspect().counts[variation.id],1);
 stage('saved catalog request recovers and later price updates retain one stock unit');
 sale=await provider('complete-sale',{variationId:variation.id,id:randomUUID()});proof.providerSale=sale;save();
 }else{
  copy={data:{id:proof.instanceId,gv_vi_id:proof.gvvi}};sale=proof.providerSale;
  variation=inspect().catalog.flatMap(item=>item.item_data.variations).find(v=>v.item_variation_data.sku==='https://grookaivault.com/q/'+proof.gvvi);assert.ok(variation);
 }
 const event={event_id:'local-'+randomUUID(),merchant_id:'runtime-merchant',type:'payment.updated',data:{object:{payment:{id:sale.paymentId}}}};
 const body=JSON.stringify(event),signature=createHmac('sha256',cfg.SQUARE_WEBHOOK_SIGNATURE_KEY).update(cfg.SQUARE_WEBHOOK_URL).update(body).digest('base64');
 const webhook=signature=>fetch('http://127.0.0.1:61850/api/square/webhook',{method:'POST',headers:{'Content-Type':'application/json','x-square-hmacsha256-signature':signature},body});
 assert.equal((await webhook('forged')).status,403);assert.equal((await webhook(signature)).status,200);
 // after() and explicit reconciliation may overlap; retry only when the actual
 // fenced connection reports busy, never mint a different financial operation.
 for(let attempt=0;attempt<30;attempt++){
  // Active-copy RLS intentionally hides disposed rows; verify the archive as
  // an operator read and verify its owner-visible sale through the workspace.
  const row=await admin.from('vault_item_instances').select('archived_at').eq('id',copy.data.id).eq('user_id',fixture.owner.id).single();assert.ifError(row.error);
  if(row.data.archived_at)break;
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 await action({action:'reconcile'});assert.equal((await webhook(signature)).status,200);
 let workspace=await request('/api/square');let sales=workspace.commerce.connections.find(c=>c.id===fixture.connectionId).recentSales.filter(s=>s.instanceId===copy.data.id);
 assert.equal(sales.length,1);assert.equal(sales[0].saleCents,1975);assert.equal(inspect().counts[variation.id],0);
 const archived=await admin.from('vault_item_instances').select('archived_at').eq('id',copy.data.id).eq('user_id',fixture.owner.id).single();assert.ifError(archived.error);assert.ok(archived.data.archived_at);
 stage('signed webhook and duplicate reconciliation record one canonical sale');
 await provider('omit-order-from-search',{orderId:sale.orderId});
 if(!proof.providerRefund){proof.providerRefund=await provider('refund',{paymentId:sale.paymentId,id:randomUUID()});save();}
 await action({action:'reconcile'});workspace=await request('/api/square');sales=workspace.commerce.connections.find(c=>c.id===fixture.connectionId).recentSales.filter(s=>s.instanceId===copy.data.id);
 assert.equal(sales[0].refundReported,true);assert.equal(inspect().counts[variation.id],0);
 const stillArchived=await admin.from('vault_item_instances').select('archived_at').eq('id',copy.data.id).eq('user_id',fixture.owner.id).single();assert.ifError(stillArchived.error);assert.ok(stillArchived.data.archived_at);
 stage('missed refund webhook is recovered without an updated order; disposition and zero stock remain');
 const returned=await action({action:'return',saleId:sales[0].id,confirmed:true});assert.notEqual(returned.instanceId,copy.data.id);assert.notEqual(returned.gvvi,copy.data.gv_vi_id);
 const repeated=await action({action:'return',saleId:sales[0].id,confirmed:true});assert.equal(repeated.instanceId,returned.instanceId);
 const privateReturn=await client.from('vault_item_instances').select('intent,archived_at').eq('id',returned.instanceId).single();assert.ifError(privateReturn.error);assert.notEqual(privateReturn.data.intent,'sell');assert.equal(privateReturn.data.archived_at,null);
 proof.returnedInstanceId=returned.instanceId;stage('confirmed return creates one new private GVVI and preserves old sale');
 assert.deepEqual(captureSources(),sourceHashes);assert.equal(sha(fs.readFileSync(root+'/apps/web/.env.local')),environmentFingerprint);
 proof.sourceUnchangedSinceRuntimeStart=true;proof.pass=true;save();console.log(JSON.stringify({pass:true,stages:proof.stages.length,frozenSourceFiles:sourceFiles.length,productionWrites:0,output}));
}catch(error){proof.pass=false;proof.failure={name:error.name,code:error.code,message:error.message};save();console.error(error.message);process.exitCode=1;}
