import { NextRequest, NextResponse } from "next/server";
import { vendorPilot, validPilotCode, VENDOR_PILOT_COOKIE, VENDOR_PILOT_ORIGIN } from "@/lib/vendorPilot.mjs";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  if (!vendorPilot) return new NextResponse("Not found", { status: 404 });
  const code = request.nextUrl.searchParams.get("code");
  if (!validPilotCode(code)) return new NextResponse("Use the complete vendor review link.", { status: 400 });
  const response = NextResponse.redirect(new URL("/vendor-preview", VENDOR_PILOT_ORIGIN));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.cookies.set(VENDOR_PILOT_COOKIE, code!, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 14 * 86400 });
  return response;
}
