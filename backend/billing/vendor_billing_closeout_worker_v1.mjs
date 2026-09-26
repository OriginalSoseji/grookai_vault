// Trusted support operations only. Default is a provider/DB read-only plan.
import '../env.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readCloseoutOptions,readCloseoutRequest} from './vendor_billing_closeout_config_v1.mjs';
import {buildVendorCloseoutPlan,applyVendorCloseoutPlan,closeoutPlanHash} from '../../apps/web/src/lib/billing/vendorBillingCloseoutPlan.ts';
import {readVendorBillingConfig,createVendorStripeClient} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
const root=fileURLToPath(new URL('../../',import.meta.url));
const sha=value=>createHash('sha256').update(value).digest('hex');
async function json(file){const data=await fs.readFile(file);if(data.length>32768)throw new Error('Bounded JSON required');return JSON.parse(data.toString('utf8').replace(/^\uFEFF/,''));}
async function main(){
 const options=readCloseoutOptions(process.env,process.argv.slice(2));
 const request=readCloseoutRequest(await json(options.requestFile));
 // Bind the plan to the exact implementation and schema; code edits require review.
 const sourceFiles=['backend/billing/vendor_billing_closeout_worker_v1.mjs','backend/billing/vendor_billing_closeout_config_v1.mjs','backend/billing/vendor_billing_worker_config_v1.mjs',
  'apps/web/src/lib/billing/vendorBillingCloseoutPlan.ts','apps/web/src/lib/billing/vendorBillingCloseoutService.ts','apps/web/src/lib/billing/vendorStripeCloseout.ts',
  'apps/web/src/lib/billing/vendorBillingRepository.ts','apps/web/src/lib/billing/vendorStripeGateway.ts','apps/web/src/lib/billing/vendorStripeEnrollment.ts',
  'apps/web/src/lib/billing/vendorSubscriptionPolicy.ts','apps/web/package-lock.json','supabase/migrations/20260919080000_vendor_stripe_billing_v1.sql'];
 const hashes={};for(const file of sourceFiles)hashes[file]=sha(await fs.readFile(path.join(root,file)));
 // Planning remains available with processing disabled; this never enables a worker.
 const config=readVendorBillingConfig({...process.env,GROOKAI_VENDOR_BILLING_ENABLED:'true'});
 if(!config)throw new Error('Billing configuration required');
 const reviewed=options.apply?await json(options.planFile):null;
 const context={ownerId:request.ownerId,ticketHash:sha(request.requestTicket),environment:process.env.SUPABASE_URL,
  implementationHash:closeoutPlanHash(hashes),createdAt:reviewed?.createdAt??Math.floor(Date.now()/1000)};
 const output=path.resolve(options.outDir);
 // No overwrite: establish the result destination before any provider mutation.
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.mkdir(output);
 const {createBackendClient}=await import('../supabase_backend_client.mjs');
 const admin=createBackendClient(),stripe=createVendorStripeClient(config);
 try{
  if(!options.apply){
   const plan=await buildVendorCloseoutPlan(admin,stripe,config,context);
   await fs.writeFile(path.join(output,'plan.json'),JSON.stringify(plan,null,2),{flag:'wx'});
   console.log(JSON.stringify({worker:'vendor-billing-closeout-v1',mode:'plan',planSha256:plan.planSha256,decision:plan.decision}));
  }else{
   const result=await applyVendorCloseoutPlan(admin,stripe,config,context,reviewed,options.expected,process.env.GROOKAI_VENDOR_BILLING_CLOSEOUT_ACK);
   await fs.writeFile(path.join(output,'result.json'),JSON.stringify({at:new Date().toISOString(),planSha256:reviewed.planSha256,targetFingerprint:reviewed.targetFingerprint,
    state:result.state,reviewReasons:result.reviewReasons,authRemoved:false,storageRemoved:false},null,2),{flag:'wx'});
   console.log(JSON.stringify({worker:'vendor-billing-closeout-v1',mode:'apply',state:result.state,reviewReasons:result.reviewReasons}));
  }
 }catch(error){
  const code=typeof error?.code==='string'&&/^billing_[a-z_]+$/.test(error.code)?error.code:'billing_closeout_operation_failed';
  await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({at:new Date().toISOString(),code,mode:options.apply?'apply':'plan'}),{flag:'wx'});
  throw new Error(code);
 }
}
main().catch(()=>{console.error('[vendor-billing-closeout-v1] failed; inspect the sanitized operations artifact and durable closeout state');process.exitCode=1;});
