import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@/lib/supabase/server";
import { vendorPilot, validPilotCode, VENDOR_PILOT_COOKIE, VENDOR_PILOT_ORIGIN } from "@/lib/vendorPilot.mjs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  if (!vendorPilot) return new NextResponse("Not found", { status: 404, headers });
  if (request.headers.get("origin") !== VENDOR_PILOT_ORIGIN) return new NextResponse("Invalid request origin", { status: 403, headers });
  const code = (await cookies()).get(VENDOR_PILOT_COOKIE)?.value;
  if (!validPilotCode(code)) return new NextResponse("Open your complete review link first.", { status: 403, headers });
  const client = await createServerComponentClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=%2Fvendor-preview", VENDOR_PILOT_ORIGIN), { status: 303, headers });
  const { error } = await client.rpc("vendor_pilot_activate_v1", { p_invite: code });
  if (error) return new NextResponse("This review invitation is unavailable or has expired. Ask for a new review link.", { status: 403, headers });
  return NextResponse.redirect(new URL("/account/store", VENDOR_PILOT_ORIGIN), { status: 303, headers });
}
