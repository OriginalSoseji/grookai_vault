import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackServerEvent } from "@/lib/telemetry/trackServerEvent";

const AUTH_NEXT_COOKIE = "grookai-auth-next";
const TEMP_LOG_PREFIX = "[TEMP OAuth callback]";

function getSafeNextPath(nextParam?: string | null) {
  return nextParam && nextParam.startsWith("/") ? nextParam : "/vault";
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

  console.log(`${TEMP_LOG_PREFIX} start`, {
    hasCode: Boolean(code),
    nextCookieExists: Boolean(nextCookieValue),
    nextPath,
  });

  if (!code) {
    console.log(`${TEMP_LOG_PREFIX} missing code`);
    const failureResponse = NextResponse.redirect(new URL("/login?error=oauth_callback_failed", requestUrl.origin));
    clearNextCookie(failureResponse);
    return failureResponse;
  }

  const successResponse = NextResponse.redirect(new URL(nextPath, requestUrl.origin));
  const supabase = createClient(request, successResponse);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  console.log(`${TEMP_LOG_PREFIX} exchange result`, {
    hasError: Boolean(error),
    errorName: error?.name ?? null,
    errorMessage: error?.message ?? null,
    errorStatus: "status" in (error ?? {}) ? (error as { status?: number }).status ?? null : null,
  });

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
      path: nextPath,
      metadata: {
        auth_method: "google_oauth",
      },
    });
  }

  clearNextCookie(successResponse);
  return successResponse;
}
