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
  const action = params.get("action");
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
  if (action === "card-pnl") {
    const incomeTaxBps = Number(params.get("incomeTaxBps") ?? "2500");
    const salesTaxMode = params.get("salesTaxMode") ?? "pass_through";
    const dateBasis = params.get("dateBasis") ?? "acquired";
    if (!Number.isInteger(incomeTaxBps) || incomeTaxBps < 0 || incomeTaxBps > 10000 || !["pass_through", "include_in_offer"].includes(salesTaxMode) || !["acquired", "sold"].includes(dateBasis)) {
      return json({ error: "Invalid card profitability filter" }, 400);
    }
    const { data, error } = await context.client.rpc("inventory_card_profitability_read_v2", {
      p_from: fromDate ? fromDate.toISOString() : null,
      p_to: toDate ? toDate.toISOString() : null,
      p_date_basis: dateBasis,
      p_income_tax_bps: incomeTaxBps,
      p_sales_tax_mode: salesTaxMode,
      p_limit: limit,
    });
    if (error) return json({ error: "Card profitability could not load" }, 503);
    return json(data);
  }
  if (action === "settings") {
    const { data, error } = await context.client.rpc("inventory_profit_settings_read_v1");
    if (error) return json({ error: "Profit settings could not load" }, 503);
    return json(data);
  }
  if (action === "report") {
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
  if (body?.action === "sold-cog-backfill") {
    const paidAt = new Date(body.paidAt);
    if (!uuid(body.instanceId) || typeof body.gvviId !== "string" || typeof body.paidAt !== "string" || !body.paidAt.trim() || Number.isNaN(paidAt.getTime()) || !Number.isSafeInteger(body.costMinor) || body.costMinor < 0 || body.costMinor > 100000000000) {
      return json({ error: "A valid sold copy, paid date, and exact cost are required" }, 400);
    }
    const { data, error } = await context.client.rpc("inventory_sold_cog_backfill_v1", {
      p_instance_id: body.instanceId,
      p_gvvi_id: body.gvviId,
      p_paid_at: paidAt.toISOString(),
      p_cost_minor: body.costMinor,
    });
    if (error) {
      const rejected = ["22023", "PT409", "42501"].includes(error.code ?? "");
      return json({ error: rejected ? error.message : "Sold COG backfill could not be saved" }, rejected ? 409 : 503);
    }
    return json(data);
  }
  if (body?.action === "sold-cog-batch") {
    const paidAt = new Date(body.paidAt);
    const lines = body.lines;
    if (!uuid(body.id) || typeof body.paidAt !== "string" || !body.paidAt.trim() || Number.isNaN(paidAt.getTime()) || !Number.isSafeInteger(body.totalPaidMinor) || body.totalPaidMinor < 0 || body.totalPaidMinor > 100000000000 || !Array.isArray(lines) || lines.length < 1 || lines.length > 1000) {
      return json({ error: "A valid sold COG batch, paid date, total, and exact copies are required" }, 400);
    }
    const { data, error } = await context.client.rpc("inventory_sold_cog_batch_backfill_v1", {
      p_batch_id: body.id,
      p_paid_at: paidAt.toISOString(),
      p_total_paid_minor: body.totalPaidMinor,
      p_lines: lines,
    });
    if (error) {
      const rejected = ["22023", "PT409", "42501", "23505"].includes(error.code ?? "");
      return json({ error: rejected ? error.message : "Sold COG bulk backfill could not be saved" }, rejected ? 409 : 503);
    }
    return json(data);
  }
  if (body?.action === "backfill-selling-fee") {
    const sellingFeeBps = body.sellingFeeBps;
    const sellingFeeFixedMinor = body.sellingFeeFixedMinor;
    if (!uuid(body.requestId) || !Number.isInteger(sellingFeeBps) || sellingFeeBps < 0 || sellingFeeBps > 10000 || !Number.isSafeInteger(sellingFeeFixedMinor) || sellingFeeFixedMinor < 0 || sellingFeeFixedMinor > 1000000) {
      return json({ error: "A valid sale request and fee assumption are required" }, 400);
    }
    const { data, error } = await context.client.rpc("inventory_sale_fee_snapshot_backfill_v1", { p_request_id: body.requestId, p_selling_fee_bps: sellingFeeBps, p_selling_fee_fixed_minor: sellingFeeFixedMinor });
    if (error) return json({ error: "Selling fee snapshot could not be saved" }, 503);
    return json(data);
  }
  if (body?.action === "settings") {
    const incomeTaxBps = body.incomeTaxBps;
    const salesTaxMode = body.salesTaxMode;
    const salesTaxRateBps = body.salesTaxRateBps;
    const hasSellingFeeFields = Object.prototype.hasOwnProperty.call(body, "sellingFeeBps") || Object.prototype.hasOwnProperty.call(body, "sellingFeeFixedMinor");
    if (!hasSellingFeeFields) {
      if (!Number.isInteger(incomeTaxBps) || incomeTaxBps < 0 || incomeTaxBps > 10000 || !["pass_through", "include_in_offer"].includes(salesTaxMode) || !Number.isInteger(salesTaxRateBps) || salesTaxRateBps < 0 || salesTaxRateBps > 10000) {
        return json({ error: "Invalid profit settings" }, 400);
      }
      const { data, error } = await context.client.rpc("inventory_profit_settings_save_v1", { p_income_tax_bps: incomeTaxBps, p_sales_tax_mode: salesTaxMode, p_sales_tax_rate_bps: salesTaxRateBps });
      if (error) return json({ error: "Profit settings could not save" }, 503);
      return json(data);
    }
    const sellingFeeBps = body.sellingFeeBps ?? 0;
    const sellingFeeFixedMinor = body.sellingFeeFixedMinor ?? 0;
    if (!Number.isInteger(incomeTaxBps) || incomeTaxBps < 0 || incomeTaxBps > 10000 || !["pass_through", "include_in_offer"].includes(salesTaxMode) || !Number.isInteger(salesTaxRateBps) || salesTaxRateBps < 0 || salesTaxRateBps > 10000 || !Number.isInteger(sellingFeeBps) || sellingFeeBps < 0 || sellingFeeBps > 10000 || !Number.isSafeInteger(sellingFeeFixedMinor) || sellingFeeFixedMinor < 0 || sellingFeeFixedMinor > 1000000) {
      return json({ error: "Invalid profit settings" }, 400);
    }
    const { data, error } = await context.client.rpc("inventory_profit_settings_save_v2", {
      p_income_tax_bps: incomeTaxBps,
      p_sales_tax_mode: salesTaxMode,
      p_sales_tax_rate_bps: salesTaxRateBps,
      p_selling_fee_bps: sellingFeeBps,
      p_selling_fee_fixed_minor: sellingFeeFixedMinor,
    });
    if (error) return json({ error: "Profit settings could not save" }, 503);
    return json(data);
  }
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
