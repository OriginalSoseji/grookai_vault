import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { buildLoginHref } from "@/lib/auth/routeAccess";
import { getBinderFeatureFlags } from "@/lib/binders/featureFlags";
import {
  BINDER_INVITE_REVIEW_PATH,
  BINDER_INVITE_TRANSIENT_COOKIE,
  binderInviteCsrfMatches,
  isTrustedBinderInvitePost,
  unsealBinderInviteTransientState,
} from "@/lib/binders/invitationHandoff";
import { BINDER_MUTATION_RPC } from "@/lib/binders/rpcContract";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,200}$/;
const PUBLIC_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REPORT_REASONS = new Set([
  "spam",
  "harassment",
  "scam",
  "inappropriate",
  "other",
]);

type InviteOperation = "accept" | "decline" | "report";
type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function formText(formData: FormData, name: string, maxLength: number) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function localRequestOrigin(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  return hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
    ? request.nextUrl.origin
    : null;
}

function addPrivateHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

function initialRedirect(request: NextRequest) {
  return addPrivateHeaders(
    NextResponse.redirect(
      new URL(
        "/binders?notice=invitation-unavailable&result=error",
        request.url,
      ),
      303,
    ),
  );
}

function setRedirectLocation(
  response: NextResponse,
  request: NextRequest,
  path: string,
) {
  response.headers.set("Location", new URL(path, request.url).toString());
}

function clearTransientCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set(BINDER_INVITE_TRANSIENT_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production" ||
      request.nextUrl.protocol === "https:",
    path: "/binder-invites",
    expires: new Date(0),
    maxAge: 0,
  });
}

function parseOperation(value: string): InviteOperation | null {
  return value === "accept" || value === "decline" || value === "report"
    ? value
    : null;
}

export async function POST(request: NextRequest) {
  if (
    !isTrustedBinderInvitePost({
      origin: request.headers.get("origin"),
      expectedOrigin: getSiteOrigin(),
      localRequestOrigin: localRequestOrigin(request),
      secFetchSite: request.headers.get("sec-fetch-site"),
      contentType: request.headers.get("content-type"),
    })
  ) {
    return addPrivateHeaders(
      new NextResponse("Request unavailable.", { status: 403 }),
    );
  }

  const response = initialRedirect(request);
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    clearTransientCookie(response, request);
    return response;
  }

  const operation = parseOperation(
    formText(formData, "operation", 20),
  );
  const idempotencyKey = formText(formData, "idempotencyKey", 200);
  const csrf = formText(formData, "csrf", 128);
  const transientState = unsealBinderInviteTransientState(
    request.cookies.get(BINDER_INVITE_TRANSIENT_COOKIE)?.value,
  );
  const flags = getBinderFeatureFlags();

  if (
    !flags.schemaRpc ||
    !flags.shared ||
    !operation ||
    !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey) ||
    !transientState ||
    !binderInviteCsrfMatches(transientState.csrf, csrf)
  ) {
    clearTransientCookie(response, request);
    return response;
  }

  let supabase: ReturnType<typeof createRouteHandlerClient>;
  let user: Awaited<
    ReturnType<ReturnType<typeof createRouteHandlerClient>["auth"]["getUser"]>
  >["data"]["user"];
  try {
    supabase = createRouteHandlerClient(request, response);
    const authResult = await supabase.auth.getUser();
    user = authResult.data.user;
  } catch {
    clearTransientCookie(response, request);
    return response;
  }

  if (!user) {
    setRedirectLocation(
      response,
      request,
      buildLoginHref(BINDER_INVITE_REVIEW_PATH),
    );
    return response;
  }

  const reason = formText(formData, "reason", 40);
  const details = formText(formData, "details", 1000) || null;
  const rpcName =
    operation === "accept"
      ? BINDER_MUTATION_RPC.inviteAccept
      : operation === "decline"
        ? BINDER_MUTATION_RPC.inviteDecline
        : BINDER_MUTATION_RPC.invitationReport;
  const args =
    operation === "report"
      ? {
          p_token: transientState.token,
          p_reason: REPORT_REASONS.has(reason) ? reason : "other",
          p_details: details,
          p_idempotency_key: idempotencyKey,
        }
      : {
          p_token: transientState.token,
          p_idempotency_key: idempotencyKey,
        };

  let data: unknown = null;
  let failed = true;
  try {
    const result = await supabase.rpc(rpcName, args);
    data = result.data;
    failed = Boolean(result.error);
  } catch {
    // RPC/network failures are deliberately reduced to the generic redirect.
  }
  const value = record(data);
  const ok = !failed && value.ok !== false;
  const binderPublicId =
    typeof value.binder_public_id === "string" &&
    PUBLIC_ID_PATTERN.test(value.binder_public_id)
      ? value.binder_public_id
      : null;

  clearTransientCookie(response, request);

  if (operation === "report") {
    // Report success and failure intentionally collapse to the same token-free
    // destination so this trust action cannot become an invitation oracle.
    setRedirectLocation(
      response,
      request,
      "/binders?notice=invitation-reported",
    );
    return response;
  }

  if (!ok) {
    return response;
  }

  if (binderPublicId) {
    revalidatePath(`/binders/${encodeURIComponent(binderPublicId)}`);
  }
  revalidatePath("/binders");

  if (operation === "accept" && binderPublicId) {
    setRedirectLocation(
      response,
      request,
      `/binders/${encodeURIComponent(binderPublicId)}`,
    );
  } else if (operation === "decline") {
    setRedirectLocation(
      response,
      request,
      "/binders?notice=invitation-declined",
    );
  }

  return response;
}
