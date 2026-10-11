import { orderMutationBoundary } from "@/lib/orders/orderMutationBoundary";
import { handleOrderResolution } from "@/lib/orders/orderResolutionsRuntime";
export const dynamic = "force-dynamic";
export const POST = orderMutationBoundary(handleOrderResolution);
