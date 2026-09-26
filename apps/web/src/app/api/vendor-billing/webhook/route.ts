import { vendorBillingHandlers } from "@/lib/billing/vendorBillingRuntime";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const POST=(request:Request)=>vendorBillingHandlers.webhook(request);
