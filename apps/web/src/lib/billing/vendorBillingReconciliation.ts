import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingScope } from "./vendorSubscriptionPolicy.ts";
import { BillingError } from "./vendorBillingRepository.ts";
import type { BillingEventReference } from "./vendorBillingRepository.ts";

export type ReconcileTask = {owner_id:string;event_id?:string;event_type?:string;customer_id?:string;subscription_id?:string;provider_created_at?:string};
export type ReconcileSummary = {processed:number;deferred:number;busy:number;failures:number};
export interface ReconcileQueue {
 start(id:string):Promise<void>;
 finish(id:string,summary:ReconcileSummary,code:"item_failure"|"worker_failed"|null):Promise<void>;
 due(lane:"events"|"accounts"):Promise<ReconcileTask[]>;
 health():Promise<Record<string,unknown>>;
}
export function createReconcileQueue(admin:SupabaseClient,scope:BillingScope):ReconcileQueue {
 const params={p_stripe_account_id:scope.accountId,p_livemode:scope.livemode};
 async function rpc<T>(name:string,args:Record<string,unknown>):Promise<T>{const {data,error}=await admin.rpc(name,args);if(error)throw new BillingError("billing_queue_unavailable");return data as T;}
 return {
  start:id=>rpc("vendor_billing_start_run_v1",{...params,p_id:id}),
  finish:(id,s,code)=>rpc("vendor_billing_finish_run_v1",{p_id:id,p_processed:s.processed,p_deferred:s.deferred,p_busy:s.busy,p_failures:s.failures,p_error_code:code}),
  due:lane=>rpc("vendor_billing_due_v1",{...params,p_lane:lane,p_limit:25}),
  health:()=>rpc("vendor_billing_reconcile_health_v1",params),
 };
}

// One bounded pass, no loop/scheduler activation. Scheduled dispatch and manual
// recovery use the same lease and verified projection as the webhook service.
export async function reconcileVendorBillingOnce(input:{queue:ReconcileQueue;service:{reconcile(owner:string,event?:BillingEventReference):Promise<void>};now?:()=>number;runId?:string}) {
 const now=input.now??Date.now,started=now(),runId=input.runId??randomUUID(),summary:ReconcileSummary={processed:0,deferred:0,busy:0,failures:0};
 await input.queue.start(runId);const owners=new Set<string>();
 try {
  for(const lane of ["events","accounts"] as const){
   if(now()-started>=60000)break;
   const tasks=await input.queue.due(lane);if(!Array.isArray(tasks)||tasks.length>25)throw new BillingError("billing_queue_bounds");
   for(const task of tasks){
    if(now()-started>=60000)break;
    if(owners.has(task.owner_id))continue;owners.add(task.owner_id);
    try {
     let event:BillingEventReference|undefined;
     if(lane==="events"){
      const created=Date.parse(task.provider_created_at??"")/1000;
      if(!task.event_id||!task.event_type||!task.customer_id||!task.subscription_id||!Number.isSafeInteger(created))throw new BillingError("billing_queue_event_invalid");
      event={id:task.event_id,type:task.event_type,customerId:task.customer_id,subscriptionId:task.subscription_id,created};
     }
     await input.service.reconcile(task.owner_id,event);summary.processed++;
    }catch(error){
     if(error instanceof BillingError&&error.code==="billing_busy")summary.busy++;
     else if(error instanceof BillingError&&error.code==="billing_checkout_pending")summary.deferred++;
     else summary.failures++;
    }
   }
  }
 }catch{
  // If the database is unreachable the started row remains visible; after 15m
  // health flags it stale and a later run records worker_abandoned.
  await input.queue.finish(runId,summary,"worker_failed");throw new BillingError("billing_worker_failed");
 }
 await input.queue.finish(runId,summary,summary.failures?"item_failure":null);
 return {runId,...summary};
}
