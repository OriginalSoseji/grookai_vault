import { NextRequest, NextResponse } from "next/server";
import { storeTrialEnabled, validStoreTrialCode, storeTrialHeaders, STORE_TRIAL_COOKIE, STORE_TRIAL_ORIGIN } from "@/lib/stores/storeTrial";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  if (!storeTrialEnabled()) return new NextResponse("Not found", { status: 404, headers: storeTrialHeaders });
  const code = request.nextUrl.searchParams.get("code");
  if (!validStoreTrialCode(code)) return new NextResponse("Use the complete store invitation link.", { status: 400, headers: storeTrialHeaders });
  const response = NextResponse.redirect(new URL("/store-trial", STORE_TRIAL_ORIGIN), { status: 303, headers: storeTrialHeaders });
  response.cookies.set(STORE_TRIAL_COOKIE, code, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 14 * 86400 });
  return response;
}
