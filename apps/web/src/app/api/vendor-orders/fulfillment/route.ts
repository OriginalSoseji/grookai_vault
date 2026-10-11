import { orderMutationBoundary } from "@/lib/orders/orderMutationBoundary";
import { recordOrderFulfillment } from "@/lib/orders/orderFulfillmentRuntime";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const POST = orderMutationBoundary(recordOrderFulfillment);
