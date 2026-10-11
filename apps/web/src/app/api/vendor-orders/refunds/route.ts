import { orderMutationBoundary } from "@/lib/orders/orderMutationBoundary";
import { handleOrderRefund } from "@/lib/orders/orderRefundsRuntime";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const POST = orderMutationBoundary(handleOrderRefund);
