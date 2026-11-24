// Operator-only Square Sandbox protocol qualification. No database, seller
// linking, inventory writes or payments. Requires this probe's retained Sandbox
// fixture. Every attempted request and result is saved before any assertion.
// A rejected request never proves that no members changed: read back all items.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';
import {SquareClient} from './client_v1.mjs';
import {squareQrSku, squareManagedProjection, SQUARE_API_VERSION} from './catalog_plan_v1.mjs';
import {planSquarePriceBatches, inspectSquarePriceBatchReceipt} from './catalog_price_batch_plan_v1.mjs';

const args=process.argv.slice(2);
assert.deepEqual([args[0],args[2],args[4]],['--env-file','--fixture-dir','--out-dir']);assert.equal(args.length,6);
const envFile=path.resolve(args[1]),fixture=path.resolve(args[3]),out=path.resolve(args[5]);
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
for(const file of [envFile,fixture,out])assert.ok(path.relative(repo,file).startsWith('..'+path.sep),'Private files must stay outside checkout');
const env=dotenv.parse(fs.readFileSync(envFile));assert.equal(env.SQUARE_ENVIRONMENT,'sandbox');
assert.ok(env.SQUARE_APP_ID?.startsWith('sandbox-'));assert.ok(env.SQUARE_SANDBOX_ACCESS_TOKEN?.length>10);
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const read=(directory,name)=>JSON.parse(fs.readFileSync(path.join(directory,name),'utf8'));
assert.equal(fs.existsSync(out),false,'Use a new output directory; retain interrupted requests for explicit recovery');
fs.mkdirSync(out,{recursive:false,mode:0o700});
const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
const sources=Object.fromEntries(['client_v1.mjs','catalog_plan_v1.mjs','catalog_price_batch_plan_v1.mjs','qualify_sandbox_price_batch_v2.mjs']
  .map(name=>[name,createHash('sha256').update(fs.readFileSync(new URL(name,import.meta.url))).digest('hex')]));
let stage='read-only-fixture-identity',mutations=0,requests=0;
const client=new SquareClient({environment:'sandbox',accessToken:env.SQUARE_SANDBOX_ACCESS_TOKEN,fetchImpl:async(url,init)=>{
  assert.equal(url.origin,'https://connect.squareupsandbox.com');requests++;return fetch(url,init);
}});
try {
  const prepared=read(fixture,'prepared.private.json'),{scope,offers}=prepared;
  assert.equal(prepared.testOnly,true);assert.equal(scope.environment,'sandbox');assert.equal(prepared.appIdHash,sha(env.SQUARE_APP_ID));
  assert.equal(scope.ownerId,'sandbox-operator-fixture');assert.equal(offers.length,25);
  for(let i=0;i<offers.length;i++){
    assert.equal(offers[i].gvviId,'GVVI-BULKLAB23-'+String(i+1).padStart(6,'0'));
    assert.equal(offers[i].name,'grookai Sandbox batch probe '+(i+1));assert.equal(offers[i].ownerId,scope.ownerId);
  }
  assert.equal((await client.currentMerchant()).id,scope.merchantId);await client.merchant(scope.merchantId);
  assert.ok((await client.locations(scope.merchantId)).some(l=>l.id===scope.locationId));
  const ids=offers.map((_,i)=>read(fixture,'create-'+i+'-receipt.private.json').itemId);assert.equal(new Set(ids).size,25);
  const retrieve=async()=>{
    const result=await client.sandboxCatalogTestRequest('retrieve',{object_ids:ids,include_related_objects:false});
    assert.equal(result.objects?.length,25);assert.deepEqual(new Set(result.objects.map(o=>o.id)),new Set(ids));return result;
  };
  const initial=await retrieve();
  for(const offer of offers){
    const matches=initial.objects.filter(o=>o.item_data.variations.some(v=>v.item_variation_data.sku===squareQrSku(offer.gvviId)));
    assert.equal(matches.length,1);assert.equal(matches[0].item_data.name,offer.name);
    assert.equal(matches[0].item_data.description,'Keep this Sandbox seller note during price updates');
  }
  write('prepared.private.json',{scope,offers,ids,sources,initial,apiVersion:SQUARE_API_VERSION,testOnly:true});
  stage='complete-sku-set';
  const skus=new Set(offers.map(o=>squareQrSku(o.gvviId))),found=[],seen=new Set();let cursor;
  for(let page=0;page<5;page++){
    const result=await client.sandboxCatalogTestRequest('search',{object_types:['ITEM_VARIATION'],include_deleted_objects:false,
      include_related_objects:true,limit:10,query:{set_query:{attribute_name:'sku',attribute_values:[...skus]}},...(cursor?{cursor}:{})});
    write('sku-page-'+page+'.private.json',result);assert.ok(Array.isArray(result.objects));found.push(...result.objects);
    if(!result.cursor)break;assert.equal(typeof result.cursor,'string');assert.ok(!seen.has(result.cursor));seen.add(result.cursor);cursor=result.cursor;
    assert.ok(page<4,'Incomplete SKU query');
  }
  assert.equal(found.length,25);assert.deepEqual(new Set(found.map(o=>o.item_variation_data.sku)),skus);
  assert.deepEqual(new Set(found.map(o=>o.item_variation_data.item_id)),new Set(ids));
  stage='bounded-client-lookup';const lookupStart=requests;
  const lookedUp=await client.itemsForExactSkus([...skus]);const lookupRequests=requests-lookupStart;
  assert.equal(lookupRequests,2);
  const sorted=objects=>objects.toSorted((a,b)=>a.id.localeCompare(b.id,'en'));
  assert.deepEqual(sorted(lookedUp),sorted(initial.objects));write('bounded-lookup.private.json',{requests:lookupRequests,objects:lookedUp});
  const summary=[];
  const prices=result=>Object.fromEntries(result.objects.map(o=>[o.id,o.item_data.variations[0].item_variation_data.price_money.amount]));
  async function attempt(name,request,{drop=false}={}){
    stage=name;write(name+'-request.private.json',request);write(name+'-sending.json',{requestHash:sha(request),at:new Date().toISOString()});mutations++;
    let result=null,error=null;
    const sender=drop?new SquareClient({environment:'sandbox',accessToken:env.SQUARE_SANDBOX_ACCESS_TOKEN,fetchImpl:async(url,init)=>{
      assert.equal(url.origin,'https://connect.squareupsandbox.com');assert.equal(url.pathname,'/v2/catalog/batch-upsert');
      assert.equal(sha(JSON.parse(init.body)),sha(request));const response=await fetch(url,init),body=await response.text();
      write(name+'-intercepted.private.json',{status:response.status,body:JSON.parse(body)});
      if(response.ok&&!JSON.parse(body).errors?.length)throw Error('Operator-injected response loss after provider completion');
      return new Response(body,{status:response.status,headers:response.headers});
    }}):client;
    try{result=await sender.sandboxCatalogTestRequest('upsert',request);write(name+'-response.private.json',result);}
    catch(e){error={code:e.code??'transport_error',status:e.status??null,uncertain:e.uncertain===true};write(name+'-error.json',error);}
    const after=await retrieve();write(name+'-readback.private.json',after);
    summary.push({name,error,acceptedResponse:result!==null,requestHash:sha(request)});
    return {result,error,after};
  }
  function changedRequest(objects,amount,name){
    const copies=structuredClone(objects);for(const o of copies)o.item_data.variations[0].item_variation_data.price_money.amount=amount;
    return {idempotency_key:'gk-batch-probe-'+name+'-'+sha(copies),batches:[{objects:copies}]};
  }
  // Parent-only stale acceptance remains a retained counterexample. Probe the
  // child separately; neither response status nor a parent guard is a receipt.
  const stale=changedRequest(initial.objects,400,'stale-child');
  const original=read(fixture,'batch.private.json');
  stale.batches[0].objects[0].item_data.variations[0].version=original.members.find(m=>m.itemId===stale.batches[0].objects[0].id).variationVersion;
  const child=await attempt('stale-child',stale);
  const childPricesUnchanged=sha(prices(child.after))===sha(prices(initial));
  const invalid=changedRequest(child.after.objects,500,'invalid-member');invalid.batches[0].objects[0].item_data.variations[0].item_variation_data.price_money.amount=-1;
  const rejection=await attempt('invalid-member',invalid);
  const invalidPricesUnchanged=sha(prices(rejection.after))===sha(prices(child.after));
  // Deliberately lose a normal planned batch response. Save the whole original
  // body/key and source/membership first, then inspect every member on readback.
  const current=rejection.after,mappings=offers.map(offer=>{
    const item=current.objects.find(o=>o.item_data.variations[0].item_variation_data.sku===squareQrSku(offer.gvviId));
    return {scope,gvviId:offer.gvviId,itemId:item.id,variationId:item.item_data.variations[0].id,lastSyncedProjection:squareManagedProjection(item,item.item_data.variations[0])};
  });
  const desiredCents=Math.max(...Object.values(prices(current)))+100;
  assert.ok(Number.isSafeInteger(desiredCents)&&desiredCents>0&&desiredCents<100000);
  const askingPriceAmount=(desiredCents/100).toFixed(2);
  const plan=planSquarePriceBatches({scope,offers:offers.map(o=>({...o,askingPriceAmount})),catalog:{scope,complete:true,items:current.objects},mappings});
  assert.equal(plan.batches.length,1);const batch=plan.batches[0];assert.equal(batch.members.length,25);write('planned-batch.private.json',batch);
  const lost=await attempt('accepted-response-loss',batch.request,{drop:true});
  assert.equal(lost.error?.code,'square_provider_unavailable');assert.equal(lost.error?.uncertain,true);
  inspectSquarePriceBatchReceipt(batch,lost.after);
  const replay=await attempt('exact-key-replay',batch.request);assert.equal(replay.error,null);
  const receipt=inspectSquarePriceBatchReceipt(batch,replay.result);write('validated-receipt.private.json',receipt);
  assert.deepEqual(replay.after,lost.after);
  for(const item of replay.after.objects){
    const prior=initial.objects.find(o=>o.id===item.id);assert.equal(item.item_data.description,prior.item_data.description);
    assert.equal(item.item_data.abbreviation,prior.item_data.abbreviation);assert.equal(item.item_data.variations[0].item_variation_data.track_inventory,true);
  }
  const proof={pass:true,at:new Date().toISOString(),environment:'sandbox',apiVersion:SQUARE_API_VERSION,sources,summary,
    members:25,atomicBatches:1,nestedObjectCount:50,requestBytes:batch.requestBytes,completePagedSkuSet:true,lookupRequests,desiredCents,
    staleParentGuardQualified:false,staleChildRejected:child.error!==null,staleChildPricesUnchanged:childPricesUnchanged,
    invalidMemberRejected:rejection.error!==null,invalidMemberPricesUnchanged:invalidPricesUnchanged,
    acceptedLostResponseReconciled:true,identicalKeyReplayNoDuplicate:true,sellerNotesPreserved:true,
    productionRequests:0,databaseRequests:0,stockWrites:0,paymentRequests:0,catalogMutationAttempts:mutations,
    productionDurabilityQualified:false,capacityQualified:false};
  assert.equal(proof.staleChildRejected,true);assert.equal(proof.staleChildPricesUnchanged,true);
  assert.equal(proof.invalidMemberRejected,true);assert.equal(proof.invalidMemberPricesUnchanged,true);
  write('proof.json',proof);console.log(JSON.stringify(proof));
}catch(error){
  const failure={pass:false,at:new Date().toISOString(),stage,code:/^square_[a-z_]+$/.test(error.code??'')?error.code:'sandbox_batch_proof_incomplete',
    status:error.status??null,uncertain:error.uncertain===true,catalogMutationAttempts:mutations,productionRequests:0,databaseRequests:0};
  write('failure.json',failure);console.error(JSON.stringify(failure));process.exitCode=1;
}
