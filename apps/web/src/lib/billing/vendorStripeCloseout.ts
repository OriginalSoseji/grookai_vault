import type Stripe from "stripe";
import {assertVendorStripeAccount} from "./vendorStripeGateway.ts";
import type {VendorBillingConfig} from "./vendorStripeGateway.ts";
import {readVendorCheckoutEvidence} from "./vendorStripeEnrollment.ts";
import type {VendorCheckoutAttempt} from "./vendorStripeEnrollment.ts";
import {referenceId} from "./vendorSubscriptionPolicy.ts";
import {BillingError} from "./vendorBillingRepository.ts";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const terminal=new Set(["canceled","incomplete_expired"]);
const statuses=new Set(["active","past_due","unpaid","trialing","paused","incomplete",...terminal]);
export type VendorCloseoutBinding={
 closeoutId:string;customerId:string;subscriptionId:string|null;pendingCheckout:VendorCheckoutAttempt|null;
 requestedAt:number;paidThrough:number|null;
};
export type CloseoutReviewReason="open_invoices"|"draft_invoices"|"pending_invoice_items"|"customer_balance"|"balance_evidence_missing"|"remaining_paid_period";
function requireCondition(value:unknown,code="billing_closeout_identity_mismatch"):asserts value {if(!value)throw new BillingError(code);}
function validateBinding(binding:VendorCloseoutBinding){
 requireCondition(uuid.test(binding.closeoutId)&&/^cus_[A-Za-z0-9]+$/.test(binding.customerId));
 requireCondition(binding.subscriptionId===null||/^sub_[A-Za-z0-9]+$/.test(binding.subscriptionId));
 requireCondition(Number.isSafeInteger(binding.requestedAt)&&binding.requestedAt>=0&&(binding.paidThrough===null||(Number.isSafeInteger(binding.paidThrough)&&binding.paidThrough>=0)));
 requireCondition(!binding.pendingCheckout||binding.pendingCheckout.customerId===binding.customerId);
}
function bounded<T>(list:{data:T[];has_more:boolean}){requireCondition(Array.isArray(list.data)&&list.data.length<=100&&!list.has_more,"billing_closeout_inventory_incomplete");return list.data;}

// Private operations only: the candidate ID must be reviewed independently, then
// matched against the immutable server-owned attempt under the account lease.
// This never searches by email or trusts metadata supplied by an HTTP caller.
export async function readVendorCustomerRecovery(stripe:Stripe,config:VendorBillingConfig,input:{customerId:string;attemptId:string;attemptCreatedAt:number},now:number){
 requireCondition(/^cus_[A-Za-z0-9]+$/.test(input.customerId)&&uuid.test(input.attemptId));
 requireCondition(Number.isSafeInteger(now)&&Number.isSafeInteger(input.attemptCreatedAt)&&input.attemptCreatedAt>=0&&now>=input.attemptCreatedAt);
 await assertVendorStripeAccount(stripe,config);
 const customer=await stripe.customers.retrieve(input.customerId);
 requireCondition(!customer.deleted);requireCondition(customer.object==="customer"&&customer.id===input.customerId&&customer.livemode===config.scope.livemode);
 requireCondition(customer.metadata.grookai_billing_version==="vendor-billing-v1"&&customer.metadata.grookai_billing_customer_attempt===input.attemptId,"billing_customer_recovery_unverified");
 requireCondition(Number.isSafeInteger(customer.created)&&customer.created>=input.attemptCreatedAt&&customer.created<input.attemptCreatedAt+86400&&customer.created<=now,"billing_customer_recovery_unverified");
 return {customerId:customer.id,attemptId:input.attemptId};
}

export async function inspectVendorCloseout(stripe:Stripe,config:VendorBillingConfig,binding:VendorCloseoutBinding){
 validateBinding(binding);await assertVendorStripeAccount(stripe,config);
 const customer=await stripe.customers.retrieve(binding.customerId,{expand:["cash_balance","invoice_credit_balance"]});
 requireCondition(!customer.deleted);requireCondition(customer.object==="customer"&&customer.id===binding.customerId&&customer.livemode===config.scope.livemode);
 const checkout=binding.pendingCheckout?await readVendorCheckoutEvidence(stripe,config,binding.pendingCheckout):null;
 const known=new Set([binding.subscriptionId,checkout?.subscriptionId].filter((x):x is string=>Boolean(x)));
 const subscriptions=bounded(await stripe.subscriptions.list({customer:binding.customerId,status:"all",limit:100}));
 for(const sub of subscriptions){
  requireCondition(referenceId(sub.customer)===binding.customerId&&sub.livemode===config.scope.livemode&&/^sub_[A-Za-z0-9]+$/.test(sub.id)&&statuses.has(sub.status));
  requireCondition(terminal.has(sub.status)||known.has(sub.id),"billing_closeout_unknown_subscription");
 }
 for(const id of known)requireCondition(subscriptions.some(s=>s.id===id),"billing_closeout_inventory_incomplete");
 const openCheckouts=bounded(await stripe.checkout.sessions.list({customer:binding.customerId,status:"open",limit:100}));
 for(const session of openCheckouts){
  requireCondition(referenceId(session.customer)===binding.customerId&&session.livemode===config.scope.livemode&&session.status==="open");
  requireCondition(session.id===checkout?.sessionId&&checkout.state==="open","billing_closeout_unknown_checkout");
 }
 if(checkout?.state==="open")requireCondition(openCheckouts.length===1,"billing_closeout_inventory_incomplete");
 const reviews:CloseoutReviewReason[]=[];
 const invoiceEvidence:{id:string;status:string|null;currency:string;amountDue:number;amountRemaining:number}[]=[];
 for(const status of ["open","draft"] as const){
  const invoices=bounded(await stripe.invoices.list({customer:binding.customerId,status,limit:100}));
  for(const invoice of invoices)requireCondition(referenceId(invoice.customer)===binding.customerId&&invoice.livemode===config.scope.livemode&&invoice.status===status);
  invoiceEvidence.push(...invoices.map(i=>({id:i.id,status:i.status,currency:i.currency,amountDue:i.amount_due,amountRemaining:i.amount_remaining})));
  if(invoices.length)reviews.push(status==="open"?"open_invoices":"draft_invoices");
 }
 const pendingItems=bounded(await stripe.invoiceItems.list({customer:binding.customerId,pending:true,limit:100}));
 for(const item of pendingItems)requireCondition(referenceId(item.customer)===binding.customerId&&item.livemode===config.scope.livemode);
 if(pendingItems.length)reviews.push("pending_invoice_items");
 const credits=customer.invoice_credit_balance,cash=customer.cash_balance;
 if(cash)requireCondition(cash.object==="cash_balance"&&cash.customer===binding.customerId&&cash.livemode===config.scope.livemode);
 if(!Number.isSafeInteger(customer.balance)||!credits||cash===undefined||(cash&&cash.available===undefined))reviews.push("balance_evidence_missing");
 if(customer.balance!==0||Object.values(credits??{}).some(v=>!Number.isSafeInteger(v)||v!==0)||Object.values(cash?.available??{}).some(v=>!Number.isSafeInteger(v)||v!==0))reviews.push("customer_balance");
 if(binding.paidThrough!==null&&binding.paidThrough>binding.requestedAt)reviews.push("remaining_paid_period");
 return {checkout,subscriptions:subscriptions.filter(s=>known.has(s.id)).map(s=>({id:s.id,status:s.status})),reviews,
  financialEvidence:{balance:customer.balance,credits,cash:cash?.available??null,
   invoices:invoiceEvidence.sort((a,b)=>a.id.localeCompare(b.id)),
   pendingItems:pendingItems.map(i=>({id:i.id,amount:i.amount,currency:i.currency})).sort((a,b)=>a.id.localeCompare(b.id))},
  providerClosed:openCheckouts.length===0&&subscriptions.every(s=>terminal.has(s.status))};
}

// No public route invokes this candidate yet. The caller MUST first freeze the
// durable closeout request and acquire its account lease. The required callback
// must recheck both before each provider mutation and before recording completion.
// This stops renewal but does not authorize deleting Auth, financial records,
// refunding, invoicing, clearing balances, or changing another subscription.
export async function closeVendorBillingAtProvider(stripe:Stripe,config:VendorBillingConfig,binding:VendorCloseoutBinding,assertFrozenLease:()=>Promise<void>){
 await assertFrozenLease();let state=await inspectVendorCloseout(stripe,config,binding);
 if(state.checkout?.state==="open"){
  await assertFrozenLease();
  try{await stripe.checkout.sessions.expire(state.checkout.sessionId,{}, {idempotencyKey:`grookai-vendor-closeout:${binding.closeoutId}:checkout`});}
  catch(error){
   // Checkout may complete while expiry races it, or the response may be lost.
   // Only independently re-read enrolled identity permits the next cancellation.
   const next=await readVendorCheckoutEvidence(stripe,config,binding.pendingCheckout!);
   if(next.state==="open")throw error;
  }
  state=await inspectVendorCloseout(stripe,config,binding);
 }
 for(const sub of state.subscriptions.filter(s=>!terminal.has(s.status))){
  await assertFrozenLease();
  const canceled=await stripe.subscriptions.cancel(sub.id,{invoice_now:false,prorate:false},
   {idempotencyKey:`grookai-vendor-closeout:${binding.closeoutId}:${sub.id}`});
  requireCondition(canceled.id===sub.id&&referenceId(canceled.customer)===binding.customerId&&canceled.livemode===config.scope.livemode&&canceled.status==="canceled");
 }
 const final=await inspectVendorCloseout(stripe,config,binding);await assertFrozenLease();
 requireCondition(final.providerClosed,"billing_closeout_not_terminal");
 return {closeoutId:binding.closeoutId,customerId:binding.customerId,subscriptionIds:final.subscriptions.map(s=>s.id).sort(),
  checkoutId:final.checkout?.sessionId??null,checkout:final.checkout,providerClosed:true as const,reviewReasons:final.reviews};
}
