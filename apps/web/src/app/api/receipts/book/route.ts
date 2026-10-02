import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { CLOUD_BOOK_LIMIT, parseCloudWrite } from "@/lib/receipts/receiptCloud.mjs";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" };
const reply = (message: string, status: number) => NextResponse.json({message}, {status, headers});
const available = () => process.env.GROOKAI_RECEIPT_CLOUD_ENABLED === "true";

export async function GET() {
  if (!available()) return reply("Account receipts are unavailable", 503);
  const client = await createServerComponentClient();
  const { data:{user} } = await client.auth.getUser();
  if (!user) return reply("Sign in required", 401);
  const {data,error} = await client.rpc("vendor_receipt_book_read_v1");
  if (error) return reply("Account receipts are unavailable", 503);
  return NextResponse.json(data, {headers});
}

export async function PUT(request: NextRequest) {
  if (!available()) return reply("Account receipts are unavailable", 503);
  // Cookie-authenticated writes must originate from the actual application.
  if (request.headers.get("origin") !== getSiteOrigin() ||
      request.headers.get("sec-fetch-site") === "cross-site" ||
      !request.headers.get("content-type")?.startsWith("application/json")) return reply("Invalid request origin", 403);
  const client = await createServerComponentClient();
  const { data:{user} } = await client.auth.getUser();
  if (!user) return reply("Sign in required", 401);
  let input;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply("Missing receipt book", 400);
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      const {done,value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > CLOUD_BOOK_LIMIT) { await reader.cancel(); return reply("Receipt book is too large", 413); }
      chunks.push(value);
    }
    input = parseCloudWrite(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch { return reply("Invalid receipt book", 400); }
  const {data,error} = await client.rpc("vendor_receipt_book_save_v1", {
    p_revision:input.revision, p_request_id:input.requestId, p_book:input.book,
  });
  if (error) return reply(error.code === "PT409" ? "Receipt book changed" : "Receipt could not be saved",
    error.code === "PT409" ? 409 : error.code === "22023" ? 400 : 503);
  return NextResponse.json(data, {headers});
}
