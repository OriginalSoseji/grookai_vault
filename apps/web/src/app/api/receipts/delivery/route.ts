import { NextRequest, NextResponse } from "next/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { receiptServiceForUser } from "@/lib/receipts/receiptDeliveryServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie, Authorization" };
const failure = (message: string, status: number) => NextResponse.json({ error: message }, { status, headers });

export async function GET(request: NextRequest) {
  try {
    const service = await receiptServiceForUser();
    if (!service) return failure("Sign in required", 401);
    const id = request.nextUrl.searchParams.get("receiptId");
    return NextResponse.json(id ? { deliveries: await service.read(id) } : { capabilities: await service.capabilities() }, { headers });
  } catch { return failure("Receipt delivery is unavailable. Your saved receipts are unchanged.", 503); }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== getSiteOrigin()) || (!origin && !/^Bearer \S+$/i.test(request.headers.get("authorization") ?? ""))) {
    return failure("Invalid request origin", 403);
  }
  try {
    const service = await receiptServiceForUser();
    if (!service) return failure("Sign in required", 401);
    const raw = await request.text();
    if (raw.length > 2048) return failure("Request too large", 413);
    const body = JSON.parse(raw);
    const refreshing = body && Object.keys(body).length === 1 && typeof body.refreshReceiptId === "string";
    const deliveries = refreshing ? await service.read(body.refreshReceiptId, { refresh: true }) : await service.send(body);
    return NextResponse.json({ deliveries }, { headers });
  } catch { return failure("Delivery is unconfirmed. Check the receipt’s delivery status before trying again.", 503); }
}
