// Private identity recovery. Provider calls are retrievals only, including apply.
import '../env.mjs';
import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {readBillingOperatorOptions,readRecoveryRequest} from './vendor_billing_closeout_config_v1.mjs';
import {buildVendorRecoveryPlan,applyVendorRecoveryPlan} from '../../apps/web/src/lib/billing/vendorBillingRecovery.ts';
import {closeoutPlanHash} from '../../apps/web/src/lib/billing/vendorBillingCloseoutPlan.ts';
import {readVendorBillingConfig,createVendorStripeClient} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
const root=fileURLToPath(new URL('../../',import.meta.url)),sha=value=>createHash('sha256').update(value).digest('hex');
async function json(file){const data=await fs.readFile(file);if(data.length>32768)throw new Error('Bounded JSON required');return JSON.parse(data.toString('utf8').replace(/^\uFEFF/,''));}
async function main(){
 const options=readBillingOperatorOptions(process.env,process.argv.slice(2),'RECOVERY');
 const request=readRecoveryRequest(await json(options.requestFile));
 const billingDir='apps/web/src/lib/billing';
 const sourceFiles=[...(await fs.readdir(path.join(root,billingDir))).filter(x=>x.endsWith('.ts')).map(x=>billingDir+'/'+x),
  'backend/billing/vendor_billing_recovery_worker_v1.mjs','backend/billing/vendor_billing_closeout_config_v1.mjs','backend/billing/vendor_billing_worker_config_v1.mjs',
  'backend/env.mjs','backend/supabase_backend_client.mjs','apps/web/package-lock.json','package-lock.json','supabase/migrations/20260919080000_vendor_stripe_billing_v1.sql'].sort();
 const hashes={};for(const file of sourceFiles)hashes[file]=sha(await fs.readFile(path.join(root,file)));
 const config=readVendorBillingConfig({...process.env,GROOKAI_VENDOR_BILLING_ENABLED:'true'});if(!config)throw new Error('Billing configuration required');
 const reviewed=options.apply?await json(options.planFile):null;
 const context={ownerId:request.ownerId,ticketHash:sha(request.requestTicket),kind:request.kind,resourceId:request.resourceId,environment:process.env.SUPABASE_URL,
  implementationHash:closeoutPlanHash(hashes),createdAt:reviewed?.createdAt??Math.floor(Date.now()/1000)};
 const output=path.resolve(options.outDir);await fs.mkdir(path.dirname(output),{recursive:true});await fs.mkdir(output);
 const {createBackendClient}=await import('../supabase_backend_client.mjs');const admin=createBackendClient(),stripe=createVendorStripeClient(config);
 try{
  if(!options.apply){const plan=await buildVendorRecoveryPlan(admin,stripe,config,context);
   await fs.writeFile(path.join(output,'plan.json'),JSON.stringify(plan,null,2),{flag:'wx'});
   console.log(JSON.stringify({worker:'vendor-billing-recovery-v1',mode:'plan',planSha256:plan.planSha256,decision:plan.decision}));
  }else{const result=await applyVendorRecoveryPlan(admin,stripe,config,context,reviewed,options.expected,process.env.GROOKAI_VENDOR_BILLING_RECOVERY_ACK);
   await fs.writeFile(path.join(output,'result.json'),JSON.stringify({at:new Date().toISOString(),planSha256:reviewed.planSha256,targetFingerprint:reviewed.targetFingerprint,...result},null,2),{flag:'wx'});
   console.log(JSON.stringify({worker:'vendor-billing-recovery-v1',mode:'apply',...result}));}
 }catch(error){const code=typeof error?.code==='string'&&/^billing_[a-z_]+$/.test(error.code)?error.code:'billing_recovery_operation_failed';
  await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({at:new Date().toISOString(),code,mode:options.apply?'apply':'plan'}),{flag:'wx'});throw new Error(code);}
}
main().catch(()=>{console.error('[vendor-billing-recovery-v1] failed; inspect the sanitized artifact and durable attempt');process.exitCode=1;});
