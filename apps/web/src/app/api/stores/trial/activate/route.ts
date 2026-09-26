import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@/lib/supabase/server";
import { storeTrialEnabled, validStoreTrialCode, storeTrialHeaders, STORE_TRIAL_COOKIE, STORE_TRIAL_ORIGIN } from "@/lib/stores/storeTrial";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  if (!storeTrialEnabled()) return new NextResponse("Not found", { status: 404, headers: storeTrialHeaders });
  if (request.headers.get("origin") !== STORE_TRIAL_ORIGIN) return new NextResponse("Invalid request origin", { status: 403, headers: storeTrialHeaders });
  const code = (await cookies()).get(STORE_TRIAL_COOKIE)?.value;
  if (!validStoreTrialCode(code)) return new NextResponse("Open your complete invitation link first.", { status: 403, headers: storeTrialHeaders });
  const client = await createServerComponentClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=%2Fstore-trial", STORE_TRIAL_ORIGIN), { status: 303, headers: storeTrialHeaders });
  const { error } = await client.rpc("vendor_store_trial_activate_v1", { p_code: code });
  if (error) return new NextResponse("This invitation is unavailable, has expired, or your account already has managed access. Ask for a new invitation or account review.", { status: 403, headers: storeTrialHeaders });
  return NextResponse.redirect(new URL("/account/store", STORE_TRIAL_ORIGIN), { status: 303, headers: storeTrialHeaders });
}
