import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackServerEvent } from "@/lib/telemetry/trackServerEvent";
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
  const nextPath = getSafeNextPath(nextCookieValue ?? requestUrl.searchParams.get("next"));

  if (!code) {
    const failureResponse = NextResponse.redirect(new URL("/login?error=oauth_callback_failed", requestUrl.origin));
    clearNextCookie(failureResponse);
    return failureResponse;
  }

  const successResponse = NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  const supabase = createClient(request, successResponse);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failureResponse = NextResponse.redirect(new URL("/login?error=oauth_callback_failed", requestUrl.origin));
    clearNextCookie(failureResponse);
    return failureResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    await trackServerEvent({
      eventName: "account_created",
      userId: user.id,
      path: redactBinderSecretPath(nextPath),
      metadata: {
        auth_method: "google_oauth",
      },
    });
  }

  clearNextCookie(successResponse);
  return successResponse;
}
