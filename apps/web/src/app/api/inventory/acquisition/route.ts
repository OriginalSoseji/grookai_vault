import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" };
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

async function getContext() {
  const client = await createServerComponentClient();
  const { data: { user }, error } = await client.auth.getUser();
  return error || !user ? null : { client, user };
}

export async function GET(request: NextRequest) {
  const context = await getContext();
  if (!context) return json({ error: "Sign in required" }, 401);
  const params = request.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const sort = params.get("sort") ?? "oldest";
  const limit = Number(params.get("limit") ?? "200");
  if (sort !== "oldest" && sort !== "newest" || !Number.isInteger(limit) || limit < 1 || limit > 500) {
    return json({ error: "Invalid inventory filter" }, 400);
  }
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (fromDate && Number.isNaN(fromDate.getTime()) || toDate && Number.isNaN(toDate.getTime())) {
    return json({ error: "Invalid inventory date filter" }, 400);
  }
  if (params.get("action") === "report") {
    const { data, error } = await context.client.rpc("inventory_acquisition_batch_report_v1", {
      p_from: fromDate ? fromDate.toISOString() : null,
      p_to: toDate ? toDate.toISOString() : null,
      p_limit: limit,
    });
    if (error) return json({ error: "Batch profitability could not load" }, 503);
    return json(data);
  }
  const { data, error } = await context.client.rpc("inventory_acquisition_batches_read_v1", {
    p_from: fromDate ? fromDate.toISOString() : null,
    p_to: toDate ? toDate.toISOString() : null,
    p_sort: sort,
    p_limit: limit,
  });
  if (error) return json({ error: "Inventory aging could not load" }, 503);
  return json(data);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== getSiteOrigin()) || (!origin && !/^Bearer\s+\S+$/i.test(request.headers.get("authorization") ?? ""))) {
    return json({ error: "Invalid origin" }, 403);
  }
  const context = await getContext();
  if (!context) return json({ error: "Sign in required" }, 401);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: "Invalid request" }, 400); }
  if (!body || body.action !== "batch" || !uuid(body.id) || !Array.isArray(body.lines)) {
    return json({ error: "Invalid acquisition batch" }, 400);
  }
  const purchasedAt = new Date(body.purchasedAt);
  if (Number.isNaN(purchasedAt.getTime()) || typeof body.totalPaidMinor !== "number" || !Number.isSafeInteger(body.totalPaidMinor)) {
    return json({ error: "Purchase date and total are required" }, 400);
  }
  const { data, error } = await context.client.rpc("inventory_acquisition_batch_save_v1", {
    p_batch_id: body.id,
    p_source_receipt_id: uuid(body.sourceReceiptId) ? body.sourceReceiptId : null,
    p_purchased_at: purchasedAt.toISOString(),
    p_total_paid_minor: body.totalPaidMinor,
    p_allocation_method: body.allocationMethod,
    p_lines: body.lines,
    p_note: typeof body.note === "string" ? body.note.slice(0, 500) : "",
  });
  if (error) {
    const rejected = ["22023", "PT409", "23505", "42501"].includes(error.code ?? "");
    return json({ error: rejected ? error.message : "Acquisition result unconfirmed" }, rejected ? 409 : 503);
  }
  return json({ result: data });
}
