import { vendorOrderHandlers } from "@/lib/payments/vendorOrderRuntime";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;
export const POST = (request: Request) => vendorOrderHandlers.webhook(request);
