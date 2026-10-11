import { orderMutationBoundary } from "@/lib/orders/orderMutationBoundary";
import { acquisitionHandler } from "@/lib/orders/orderAcquisitionRuntime";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const POST = orderMutationBoundary(acquisitionHandler);
