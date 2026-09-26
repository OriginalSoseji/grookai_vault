"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { VendorBillingStatus } from "@/lib/billing/vendorBillingTypes";
import type { VendorPlan } from "@/lib/billing/vendorSubscriptionPolicy";
import s from "./StoreManager.module.css";
const endpoint="/api/vendor-billing/owner";
async function request<T>(body?:unknown):Promise<T>{
 const response=await fetch(endpoint,{method:body?"POST":"GET",credentials:"same-origin",cache:"no-store",
  ...(body?{headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok)throw new Error(data.error??"Billing could not be loaded.");return data;
}
export default function VendorBillingManager(){
 const [status,setStatus]=useState<VendorBillingStatus|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 useEffect(()=>{let active=true;async function load(){try{
   const current=await request<VendorBillingStatus>();if(active)setStatus(current);
   if(current.enabled&&new URLSearchParams(window.location.search).get("checkout")==="returned"){
    if(active){setBusy(true);setNotice("Checking your payment. Store access changes only after verification.");}
    const next=await request<{status:VendorBillingStatus}>({action:"refresh"});if(active){setStatus(next.status);setNotice("Subscription status refreshed.");}
   }
  }catch(e){if(active)setError(e instanceof Error?e.message:"Billing could not be loaded.");}finally{if(active)setBusy(false);}}
  void load();return()=>{active=false;};},[]);
 async function act(action:"checkout"|"refresh"|"portal",plan?:VendorPlan){
  setBusy(true);setError("");setNotice("");
  try{
   const result=await request<{url?:string|null;state?:string;status?:VendorBillingStatus}>(action==="checkout"?{action,plan}:{action});
   if(result.url){const url=new URL(result.url);if(!["https://checkout.stripe.com","https://billing.stripe.com"].includes(url.origin)||url.username||url.password)throw new Error("Unexpected billing destination.");window.location.assign(url.toString());return;}
   setStatus(result.status??await request<VendorBillingStatus>());
   setNotice(result.state==="pending"?"Payment verification is pending. Use Check payment to refresh access.":result.state==="expired"?"That checkout expired. You can start a new checkout.":"Subscription status refreshed.");
  }catch(e){setError(e instanceof Error?e.message:"Billing could not be updated.");}finally{setBusy(false);}
 }
 const blocked=busy||!status?.checkoutEnabled||Boolean(status.hasSubscription||status.eligibilityIssue||status.recoveryRequired||status.closeoutPending||status.checkoutState==="completed");
 return <div className={s.workspace}>
  <header className={s.header}><div><span className={s.eyebrow}>Vendor workspace</span><h1>Store subscription</h1><p className={s.muted}>Choose where customers can browse your store. Manage either package from your computer.</p></div><Link className={s.linkButton} href="/account/store">Back to your store</Link></header>
  {error&&<div className={`${s.notice} ${s.error}`} role="alert">{error}</div>}{notice&&<div className={s.notice} role="status">{notice}</div>}
  {!status?<section className={s.panel}><p role="status">{error?"Your billing status is unavailable.":"Loading your subscription…"}</p><button disabled={busy} onClick={()=>{setError("");void request<VendorBillingStatus>().then(setStatus).catch(e=>setError(e.message));}}>Retry</button></section>:
   !status.enabled?<section className={s.panel}><h2>Subscriptions are not available yet</h2><p>Your existing Vendor Mode access is unchanged. Store subscriptions will appear here when available.</p></section>:<div className={s.stack} aria-busy={busy}>
    {status.environment==="test"&&<div className={s.notice}>Test billing — use Stripe test payment details only.</div>}
    <section className={s.panel}><h2>Your subscription</h2><p>{status.subscriptionStatus==="none"?"No subscription yet.":`Status: ${status.subscriptionStatus?.replaceAll("_"," ")}.`}</p>
     {status.plan&&<p>{status.plan==="store_web"?"App + web store":"App store"}{status.paidThrough&&` · Verified access through ${new Date(status.paidThrough).toLocaleString()}`}</p>}
     {status.cancelAtPeriodEnd&&<p>Your subscription is scheduled to end after the current paid period.</p>}
     <p>App store: {status.access?.store_app?"available":"not included in current access"}. Public web store: {status.access?.store_web?"available":"not included in current access"}.</p>
     {status.eligibilityIssue&&<p role="status">{status.eligibilityIssue==="suspended"?"This account is suspended. You can still manage existing payments.":"Your account needs an access review before subscribing. Contact Grookai support."}</p>}
     {status.recoveryRequired&&<p role="status">Your earlier checkout needs review before another attempt. Contact Grookai support.</p>}
     {status.closeoutPending&&<p role="status">Your account closure is being processed. Contact Grookai support for billing assistance.</p>}
     {status.checkoutState&&!status.recoveryRequired&&<p>Checkout: {status.checkoutState==="completed"?"awaiting payment verification":status.checkoutState}. Resume the same package or check your payment.</p>}
     <div className={s.actions}><button disabled={busy||status.closeoutPending} onClick={()=>void act("refresh")}>Check payment</button>{status.canManagePayment&&!status.closeoutPending&&<button disabled={busy} onClick={()=>void act("portal")}>Manage billing & receipts</button>}</div>
    </section>
    {!status.checkoutEnabled&&<p className={s.notice}>New subscriptions are paused. Existing billing management remains available.</p>}
    <section className={s.panel}><h2>Store packages</h2><div className={s.billingPackages}>
     {([{plan:"store_app",name:"App store",price:30,description:"Desktop and app management, branding, selected inventory, private web preview, and a store customers can browse in the app."},{plan:"store_web",name:"App + web store",price:50,description:"Everything in App store, plus a public grookaivault.com/store address that customers can browse from any browser."}] as const).map(p=><article className={s.panel} key={p.plan}><h3>{p.name}</h3><p><strong>${p.price}/month</strong></p><p>{p.description}</p><button className={s.primary} disabled={blocked||!(p.plan==="store_web"?status.webAvailable:status.appAvailable)||Boolean(status.pendingPlan&&status.pendingPlan!==p.plan)} onClick={()=>void act("checkout",p.plan)}>{status.pendingPlan===p.plan?"Resume checkout":`Choose ${p.name}`}</button></article>)}
    </div><p className={s.muted}>Monthly subscriptions renew until canceled. No free trial or unpaid grace period. Manage plan changes, cancellation, payment methods, and receipts through Stripe. Subscription access does not publish your store automatically.</p></section>
   </div>}
 </div>;
}
