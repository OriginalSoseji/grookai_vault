import { orderMutationBoundary } from "@/lib/orders/orderMutationBoundary";
import { cancelOrder } from "@/lib/orders/orderCancellationRuntime";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const POST = orderMutationBoundary(cancelOrder);
