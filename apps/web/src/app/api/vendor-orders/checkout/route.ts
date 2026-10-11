import { orderMutationBoundary } from "@/lib/orders/orderMutationBoundary";
import { vendorOrderHandlers } from "@/lib/payments/vendorOrderRuntime";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;
export const POST = orderMutationBoundary((request: Request) => vendorOrderHandlers.checkout(request));
