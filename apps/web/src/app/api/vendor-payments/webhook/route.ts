import { vendorSellerHandlers } from "@/lib/payments/vendorSellerRuntime";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const POST = (request: Request) => vendorSellerHandlers.webhook(request);
