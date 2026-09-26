import { vendorBillingHandlers } from "@/lib/billing/vendorBillingRuntime";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const GET=()=>vendorBillingHandlers.ownerGET();
export const POST=(request:Request)=>vendorBillingHandlers.ownerPOST(request);
