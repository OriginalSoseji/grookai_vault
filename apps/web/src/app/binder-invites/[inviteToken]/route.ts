import { NextRequest, NextResponse } from "next/server";
import { getBinderFeatureFlags } from "@/lib/binders/featureFlags";
import {
  BINDER_INVITE_REVIEW_PATH,
  BINDER_INVITE_TRANSIENT_COOKIE,
  BINDER_INVITE_TRANSIENT_TTL_SECONDS,
  sealBinderInviteTransientState,
} from "@/lib/binders/invitationHandoff";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,256}$/;

function secureRedirect(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL(BINDER_INVITE_REVIEW_PATH, request.url),
    303,
  );
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

function clearTransientCookie(response: NextResponse, secure: boolean) {
  response.cookies.set(BINDER_INVITE_TRANSIENT_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/binder-invites",
    expires: new Date(0),
    maxAge: 0,
  });
}

/**
 * The canonical bearer URL terminates here. It is never a React page: a valid
 * token is moved directly into an encrypted HttpOnly transient cookie and the
 * browser is redirected to the fixed, token-free review route.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { inviteToken: string } },
) {
  const response = secureRedirect(request);
  const secure =
    process.env.NODE_ENV === "production" ||
    request.nextUrl.protocol === "https:";
  const flags = getBinderFeatureFlags();

  if (
    !flags.schemaRpc ||
    !flags.shared ||
    !TOKEN_PATTERN.test(params.inviteToken)
  ) {
    clearTransientCookie(response, secure);
    return response;
  }

  try {
    const sealed = sealBinderInviteTransientState(params.inviteToken);
    response.cookies.set(BINDER_INVITE_TRANSIENT_COOKIE, sealed, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/binder-invites",
      maxAge: BINDER_INVITE_TRANSIENT_TTL_SECONDS,
    });
  } catch {
    // Missing/invalid key material fails closed without reflecting the token.
    clearTransientCookie(response, secure);
  }

  return response;
}
