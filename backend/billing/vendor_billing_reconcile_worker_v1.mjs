// Invoke once from the governed private scheduler. No schedule is registered here.
import '../env.mjs';
import {readBillingWorkerConfig} from './vendor_billing_worker_config_v1.mjs';
import {createReconcileQueue,reconcileVendorBillingOnce} from '../../apps/web/src/lib/billing/vendorBillingReconciliation.ts';
import {createVendorBillingRepository} from '../../apps/web/src/lib/billing/vendorBillingRepository.ts';
import {createVendorBillingService} from '../../apps/web/src/lib/billing/vendorBillingService.ts';
import {readVendorBillingConfig,createVendorStripeClient} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
async function main(){
 const settings=readBillingWorkerConfig(process.env,process.argv.slice(2));
 const {createBackendClient}=await import('../supabase_backend_client.mjs');
 const admin=createBackendClient(),queue=createReconcileQueue(admin,settings.scope);
 if(settings.health){console.log(JSON.stringify({worker:'vendor-billing-v1',health:await queue.health()}));return;}
 const config=readVendorBillingConfig(process.env);if(!config)throw new Error('Billing disabled');
 const service=createVendorBillingService({repo:createVendorBillingRepository(admin),stripe:createVendorStripeClient(config),config,checkoutEnabled:false});
 const result=await reconcileVendorBillingOnce({queue,service});
 console.log(JSON.stringify({worker:'vendor-billing-v1',...result}));if(result.failures)process.exitCode=1;
}
main().catch(()=>{console.error('[vendor-billing-v1] failed; inspect persisted run and account/event status');process.exitCode=1;});
