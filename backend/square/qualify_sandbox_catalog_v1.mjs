// Explicit operator-only Sandbox transport proof. No Supabase access, seller
// OAuth binding, stock allocation, payment or production provider origin.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import dotenv from 'dotenv';
import {fileURLToPath} from 'node:url';
import {SquareClient} from './client_v1.mjs';
import {planSquareCatalog, squareQrSku, squareManagedProjection, SQUARE_API_VERSION} from './catalog_plan_v1.mjs';

const args=process.argv.slice(2), mode=args.shift();
assert.ok(['--prepare','--apply'].includes(mode));
assert.equal(args.length,4); assert.equal(args[0],'--env-file'); assert.equal(args[2],'--out-dir');
const envFile=path.resolve(args[1]), out=path.resolve(args[3]);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
for(const candidate of [envFile,out]) assert.ok(!path.relative(root,candidate).split(path.sep).every(part=>part!=='..'), 'Private files must be outside the checkout');
const env=dotenv.parse(fs.readFileSync(envFile));
assert.equal(env.SQUARE_ENVIRONMENT,'sandbox'); assert.ok(env.SQUARE_APP_ID?.startsWith('sandbox-'));
assert.ok(env.SQUARE_SANDBOX_ACCESS_TOKEN?.length>30);
const client=new SquareClient({environment:'sandbox',accessToken:env.SQUARE_SANDBOX_ACCESS_TOKEN});
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const write=(name,data)=>fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('REMOTE Square Sandbox only: https://connect.squareupsandbox.com; no database access');
try {
  const merchant=await client.currentMerchant(); await client.merchant(merchant.id);
  const locations=await client.locations(merchant.id);
  const gvvi='GVVI-065CAB28-001441',sku=squareQrSku(gvvi);
  if(mode==='--prepare') {
    assert.equal(fs.existsSync(out),false,'Use a new private output directory');
    assert.equal(locations.length,1,'Choose a location explicitly if the test account has multiple active USD locations');
    const items=await client.itemsForExactSku(sku);
    assert.equal(items.length,0,'Existing same-SKU catalog requires review; never create another');
    const scope={environment:'sandbox',merchantId:merchant.id,locationId:locations[0].id,ownerId:'sandbox-transport-proof'};
    const offer={ownerId:scope.ownerId,gvviId:gvvi,selected:true,publicVendorOffer:true,available:true,
      name:'grookai Sandbox QR Test Aerodactyl',variationName:'Holo - NM',askingPriceAmount:'20.00',currency:'USD'};
    // These fixture booleans qualify only a test-account transport request.
    // They do not establish real owner eligibility or authorize a seller binding.
    const plan=planSquareCatalog({scope,offers:[offer],catalog:{scope,complete:true,items},mappings:[]});
    assert.equal(plan.actions.length,1); assert.equal(plan.actions[0].action,'create');
    const request=plan.actions[0].request;
    assert.ok(request?.idempotency_key);
    fs.mkdirSync(out,{recursive:false,mode:0o700});
    write('prepared.private.json',{scope,sku,request,requestHash:sha(request),apiVersion:SQUARE_API_VERSION,
      appIdHash:sha(env.SQUARE_APP_ID),createdAt:new Date().toISOString(),testOnly:true});
    console.log(JSON.stringify({prepared:true,catalogWrites:0,stockWrites:0,paymentRequests:0}));
  } else {
    const prepared=JSON.parse(fs.readFileSync(path.join(out,'prepared.private.json')));
    assert.equal(prepared.testOnly,true); assert.equal(prepared.scope.environment,'sandbox');
    assert.equal(prepared.scope.merchantId,merchant.id); assert.ok(locations.some(row=>row.id===prepared.scope.locationId));
    assert.equal(prepared.sku,sku); assert.equal(prepared.appIdHash,sha(env.SQUARE_APP_ID));
    assert.equal(prepared.apiVersion,SQUARE_API_VERSION); assert.equal(prepared.requestHash,sha(prepared.request));
    assert.equal(fs.existsSync(path.join(out,'proof.json')),false,'This proof is already complete');
    const prior=await client.itemsForExactSku(sku);
    const started=path.join(out,'sending.private.json');
    if(!fs.existsSync(started)) {assert.equal(prior.length,0,'Catalog changed after preparation'); write('sending.private.json',{requestHash:prepared.requestHash,startedAt:new Date().toISOString()});}
    // If interrupted after provider acceptance, retry only the saved request/key.
    const receipt=await client.upsert(prepared.request,sku);
    const repeated=await client.upsert(prepared.request,sku); assert.deepEqual(repeated,receipt);
    const items=await client.itemsForExactSku(sku); assert.equal(items.length,1); assert.equal(items[0].id,receipt.itemId);
    const variation=items[0].item_data.variations.find(row=>row.id===receipt.variationId);
    assert.equal(variation.item_variation_data.track_inventory,true);
    assert.deepEqual(squareManagedProjection(items[0],variation),squareManagedProjection(prepared.request.object,prepared.request.object.item_data.variations[0]));
    write('receipt.private.json',{...receipt,requestHash:prepared.requestHash,object:items[0]});
    const proof={pass:true,environment:'sandbox',apiVersion:SQUARE_API_VERSION,verifiedAt:new Date().toISOString(),
      unchangedGrookaiQrSku:true,priceCents:2000,uniqueMatchingItems:1,sameRequestRepeatedWithoutDuplicate:true,
      stockQuantityWrites:0,paymentRequests:0,databaseRequests:0,oauthSellerBindingProven:false};
    write('proof.json',proof); console.log(JSON.stringify(proof));
  }
} catch(error) {
  console.error(JSON.stringify({pass:false,code:/^square_[a-z_]+$/.test(error?.code||'')?error.code:'sandbox_proof_incomplete',
    providerStatus:Number.isInteger(error?.status)?error.status:null,uncertain:error?.uncertain===true}));
  process.exitCode=1;
}
