// Shared HTTP boundary, kept independent of Next so the actual handler policy can
// be exercised with Request/Response and synthetic dependencies.
import { BillingError } from "./vendorBillingRepository.ts";
export const BILLING_NO_STORE = {"Cache-Control":"private, no-store", "Vary":"Cookie, Authorization"};
export function checkBillingOrigin(request: Request, origin: string): boolean {
  const supplied=request.headers.get("origin");
  return supplied ? supplied===origin : /^Bearer \S+$/i.test(request.headers.get("authorization")??"");
}
export async function readBillingBody(request: Request, limit: number): Promise<string> {
  const length=request.headers.get("content-length");
  if(length && (!/^\d+$/.test(length)||Number(length)>limit))throw new BillingError("billing_body_too_large");
  if(!request.body)return "";
  const reader=request.body.getReader(),chunks:Uint8Array[]=[];let total=0;
  try {for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;
    if(total>limit){await reader.cancel();throw new BillingError("billing_body_too_large");}chunks.push(value);
  }} finally {reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return new TextDecoder("utf-8",{fatal:true}).decode(bytes);}catch{throw new BillingError("billing_body_invalid");}
}
export function parseBillingAction(body: string): {action:"checkout";plan:"store_app"|"store_web"}|{action:"refresh"|"portal"} {
  let value;try{value=JSON.parse(body);}catch{throw new BillingError("billing_body_invalid");}
  if(!value||typeof value!=="object"||Array.isArray(value))throw new BillingError("billing_body_invalid");
  if(value.action==="checkout"&&["store_app","store_web"].includes(value.plan)&&Object.keys(value).sort().join(',')==='action,plan')return value;
  if(["refresh","portal"].includes(value.action)&&Object.keys(value).length===1)return value;
  throw new BillingError("billing_body_invalid");
}
export function billingErrorResponse(error: unknown): Response {
  const code=error instanceof BillingError?error.code:"billing_unavailable";
  const cases:Record<string,[number,string]>={
    billing_body_too_large:[413,"Request is too large."],billing_body_invalid:[400,"Invalid billing request."],billing_plan_invalid:[400,"Choose a listed package."],
    billing_busy:[409,"Another billing update is running. Try again shortly."],
    billing_account_closing:[409,"Account closure is being processed. Contact Grookai support for billing assistance."],
    billing_entitlement_binding_required:[409,"Your account needs an access review before subscribing. Contact Grookai support."],
    billing_entitlement_inactive:[409,"Subscriptions are unavailable while this account is suspended."],
    billing_existing_subscription:[409,"Use Manage billing to change your existing subscription."],
    billing_checkout_already_pending:[409,"Resume your pending checkout before choosing a different package."],
    billing_checkout_pending:[409,"Payment verification is pending. Check again shortly."],
    billing_recovery_required:[409,"Your earlier checkout needs review before another attempt. Contact Grookai support."],
    billing_checkout_disabled:[503,"New subscriptions are not available right now."],
    billing_store_unavailable:[503,"This store package is not available yet."],
  };
  const [status,message]=cases[code]??[503,"Billing is temporarily unavailable. Please try again."];
  return Response.json({error:message},{status,headers:BILLING_NO_STORE});
}
