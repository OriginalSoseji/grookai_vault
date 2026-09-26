// Private support operation. Planning and apply are both read-only at Stripe.
// Apply may only freeze the retained local binding; no financial/Auth deletion.
import '../env.mjs';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {readSellerCloseoutOptions,readSellerCloseoutRequest} from './vendor_seller_closeout_config_v1.mjs';
import {createSellerCloseoutRepository,buildSellerCloseoutPlan,applySellerCloseoutPlan} from '../../apps/web/src/lib/payments/vendorSellerCloseout.ts';
import {sellerReviewHash} from '../../apps/web/src/lib/payments/vendorSellerFinancialReview.ts';
import {readSellerStripeConfig,createSellerStripeClient} from '../../apps/web/src/lib/payments/vendorSellerStripeGateway.ts';
const root=fileURLToPath(new URL('../../',import.meta.url)),sha=v=>createHash('sha256').update(v).digest('hex');
async function json(file){const data=await fs.readFile(file);if(data.length>32768)throw new Error('Bounded JSON required');return JSON.parse(data.toString('utf8').replace(/^\uFEFF/,''));}
async function main(){
 const options=readSellerCloseoutOptions(process.env,process.argv.slice(2)),request=readSellerCloseoutRequest(await json(options.requestFile));
 const sourceFiles=['backend/payments/vendor_seller_closeout_worker_v1.mjs','backend/payments/vendor_seller_closeout_config_v1.mjs',
  'backend/env.mjs','backend/supabase_backend_client.mjs','apps/web/src/lib/payments/vendorSellerCloseout.ts','apps/web/src/lib/payments/vendorSellerFinancialReview.ts',
  'apps/web/src/lib/payments/vendorSellerRepository.ts','apps/web/src/lib/payments/vendorSellerPolicy.ts','apps/web/src/lib/payments/vendorSellerStripeGateway.ts',
  'apps/web/src/lib/billing/vendorStripeGateway.ts','apps/web/src/lib/billing/vendorSubscriptionPolicy.ts','apps/web/package-lock.json','package-lock.json',
  'supabase/migrations/20260919130000_vendor_seller_bindings_v1.sql','supabase/migrations/20260919080000_vendor_stripe_billing_v1.sql'].sort();
 const hashes={};for(const file of sourceFiles)hashes[file]=sha(await fs.readFile(path.join(root,file)));
 // Read-only review remains possible while onboarding/checkout processing is off.
 // This pure config read does not change environment flags or enable any worker.
 const config=readSellerStripeConfig({...process.env,GROOKAI_VENDOR_PAYMENTS_ENABLED:'true'});if(!config)throw new Error('Seller provider configuration required');
 const reviewed=options.apply?await json(options.planFile):null;
 const context={ownerId:request.ownerId,closeoutId:request.closeoutId,ticketHash:sha(request.requestTicket),environment:process.env.SUPABASE_URL,
  implementationHash:sellerReviewHash(hashes),createdAt:reviewed?.createdAt??Math.floor(Date.now()/1000)};
 const output=path.resolve(options.outDir);await fs.mkdir(path.dirname(output),{recursive:true});await fs.mkdir(output);
 const {createBackendClient}=await import('../supabase_backend_client.mjs');const repo=createSellerCloseoutRepository(createBackendClient()),stripe=createSellerStripeClient(config);
 try{
  if(!options.apply){const plan=await buildSellerCloseoutPlan(repo,stripe,config,context);await fs.writeFile(path.join(output,'plan.json'),JSON.stringify(plan,null,2),{flag:'wx'});
   console.log(JSON.stringify({worker:'vendor-seller-closeout-v1',mode:'plan',planSha256:plan.planSha256,decision:plan.decision,deletionPermitted:false}));
  }else{const result=await applySellerCloseoutPlan(repo,stripe,config,context,reviewed,options.expected);
   await fs.writeFile(path.join(output,'result.json'),JSON.stringify({at:new Date().toISOString(),planSha256:reviewed.planSha256,targetFingerprint:reviewed.targetFingerprint,
    ...result,providerMutations:0,authRemoved:false,storageRemoved:false},null,2),{flag:'wx'});
   console.log(JSON.stringify({worker:'vendor-seller-closeout-v1',mode:'apply',...result}));}
 }catch(error){const code=typeof error?.code==='string'&&/^seller_[a-z_]+$/.test(error.code)?error.code:'seller_closeout_operation_failed';
  await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({at:new Date().toISOString(),code,mode:options.apply?'apply':'plan'}),{flag:'wx'});throw new Error(code);}
}
main().catch(()=>{console.error('[vendor-seller-closeout-v1] failed; inspect sanitized artifact and retained binding');process.exitCode=1;});
