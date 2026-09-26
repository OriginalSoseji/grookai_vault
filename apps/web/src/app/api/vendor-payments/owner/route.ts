import { vendorSellerHandlers } from "@/lib/payments/vendorSellerRuntime";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = () => vendorSellerHandlers.ownerGET();
export const POST = (request: Request) => vendorSellerHandlers.ownerPOST(request);
