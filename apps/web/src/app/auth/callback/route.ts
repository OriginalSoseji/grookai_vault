import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackServerEvent } from "@/lib/telemetry/trackServerEvent";
import { consumeVendorReferralAttribution } from "@/lib/gvvi/vendorReferralAttribution";
import {
  redactBinderSecretPath,
} from "@/lib/binders/safePath";
import { getSafePostAuthPath } from "@/lib/auth/routeAccess";

const AUTH_NEXT_COOKIE = "grookai-auth-next";

function getSafeNextPath(nextParam?: string | null) {
  return getSafePostAuthPath(nextParam);
}

function clearNextCookie(response: NextResponse) {
  response.cookies.set(AUTH_NEXT_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextCookieValue = request.cookies.get(AUTH_NEXT_COOKIE)?.value ?? null;
  const emailFlow = requestUrl.searchParams.get("flow") === "email";
  const nextPath = getSafeNextPath(emailFlow
    ? requestUrl.searchParams.get("next")
    : nextCookieValue ?? requestUrl.searchParams.get("next"));
  const failureUrl = new URL("/login", requestUrl.origin);
  failureUrl.searchParams.set("error", emailFlow ? "email_confirmation_failed" : "oauth_callback_failed");
  failureUrl.searchParams.set("next", nextPath);

  if (!code) {
    const failureResponse = NextResponse.redirect(failureUrl);
    clearNextCookie(failureResponse);
    return failureResponse;
  }

  const successResponse = NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  const supabase = createClient(request, successResponse);
  let exchangeFailed = false;
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    exchangeFailed = Boolean(error);
  } catch {
    exchangeFailed = true;
  }

  if (exchangeFailed) {
    const failureResponse = NextResponse.redirect(failureUrl);
    clearNextCookie(failureResponse);
    return failureResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    const accountEventResult = await trackServerEvent({
      eventName: "account_created",
      userId: user.id,
      path: redactBinderSecretPath(nextPath),
      metadata: {
        auth_method: emailFlow ? "email_password" : "google_oauth",
      },
    });
    await consumeVendorReferralAttribution({
      request,
      response: successResponse,
      user,
      accountWasCreated: accountEventResult === "inserted",
    });
  }

  clearNextCookie(successResponse);
  return successResponse;
}
