import { NextRequest, NextResponse } from "next/server";
import type { NextFetchEvent } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  buildLoginHref,
  isProtectedRoute,
  normalizeNextPath,
} from "./lib/auth/routeAccess";
import { getSupabaseServerConfig } from "./lib/supabase/config";

const RATE_LIMIT_WINDOW_MS = 60_000;
const CARD_WALK_WINDOW_MS = 10 * 60_000;
const SIGNAL_DEDUPE_WINDOW_MS = 10 * 60_000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type CardWalkBucket = {
  firstSeenAt: number;
  lastSignalAt: number;
  cardIds: Set<string>;
};

type AbuseClassification = {
  lane: "retired_registry" | "api" | "search" | "card" | "none";
  limit: number;
  enforce: boolean;
  reason: string;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();
const cardWalkBuckets = new Map<string, CardWalkBucket>();
const recentSignalKeys = new Map<string, number>();

function getActorIp(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

function getActorKey(request: NextRequest) {
  const ip = getActorIp(request);
  const userAgent = request.headers.get("user-agent")?.trim().slice(0, 120) || "missing-ua";
  return `${ip}|${userAgent}`;
}

function classifyRequest(pathname: string): AbuseClassification {
  if (pathname === "/ids" || pathname.startsWith("/ids/")) {
    return {
      lane: "retired_registry",
      limit: 10,
      enforce: true,
      reason: "retired_id_registry_probe",
    };
  }

  if (pathname.startsWith("/api/") && pathname !== "/api/telemetry") {
    return {
      lane: "api",
      limit: 120,
      enforce: true,
      reason: "api_request_volume",
    };
  }

  if (pathname === "/search" || pathname === "/api/resolver/search") {
    return {
      lane: "search",
      limit: 80,
      enforce: true,
      reason: "search_request_volume",
    };
  }

  if (pathname.startsWith("/card/GV-")) {
    return {
      lane: "card",
      limit: 900,
      enforce: false,
      reason: "card_page_volume",
    };
  }

  return {
    lane: "none",
    limit: Number.POSITIVE_INFINITY,
    enforce: false,
    reason: "none",
  };
}

function incrementRateLimit(key: string, now: number) {
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitBuckets.set(key, next);
    return next;
  }

  current.count += 1;
  return current;
}

function getCardIdFromPath(pathname: string) {
  const match = pathname.match(/^\/card\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function observeCardWalking(actorKey: string, cardId: string, now: number) {
  const current = cardWalkBuckets.get(actorKey);
  const bucket =
    current && current.firstSeenAt + CARD_WALK_WINDOW_MS > now
      ? current
      : { firstSeenAt: now, lastSignalAt: 0, cardIds: new Set<string>() };

  bucket.cardIds.add(cardId);
  cardWalkBuckets.set(actorKey, bucket);

  if (bucket.cardIds.size >= 120 && bucket.lastSignalAt + SIGNAL_DEDUPE_WINDOW_MS < now) {
    bucket.lastSignalAt = now;
    return true;
  }

  return false;
}

function shouldEmitSignal(signalKey: string, now: number) {
  const lastSeenAt = recentSignalKeys.get(signalKey) ?? 0;
  if (lastSeenAt + SIGNAL_DEDUPE_WINDOW_MS > now) {
    return false;
  }

  recentSignalKeys.set(signalKey, now);
  return true;
}

function emitAbuseEvent(
  event: NextFetchEvent,
  request: NextRequest,
  eventName: "abuse_signal" | "abuse_throttled",
  metadata: Record<string, unknown>,
) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const url = new URL("/api/telemetry", request.url);
  event.waitUntil(
    fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        eventName,
        path: request.nextUrl.pathname,
        gvId: getCardIdFromPath(request.nextUrl.pathname),
        metadata,
      }),
    }).catch(() => undefined),
  );
}

function addSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

function applyAbuseProtection(request: NextRequest, event: NextFetchEvent) {
  const now = Date.now();
  const actorKey = getActorKey(request);
  const classification = classifyRequest(request.nextUrl.pathname);
  const userAgent = request.headers.get("user-agent")?.trim() || "";
  const rateLimitKey = `${classification.lane}|${actorKey}`;
  const bucket = incrementRateLimit(rateLimitKey, now);
  const isMissingUserAgent = userAgent.length === 0;
  const isRetiredRegistryHit = classification.lane === "retired_registry";
  const isApiProbe = classification.lane === "api";
  const isSearchBurst = classification.lane === "search" && bucket.count > Math.floor(classification.limit * 0.7);
  const cardId = getCardIdFromPath(request.nextUrl.pathname);
  const isCardWalking = classification.lane === "card" && cardId ? observeCardWalking(actorKey, cardId, now) : false;
  const shouldThrottle = classification.enforce && bucket.count > classification.limit;

  if (shouldThrottle) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    const response = new NextResponse("Too many requests.", {
      status: 429,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "private, no-store",
      },
    });

    emitAbuseEvent(event, request, "abuse_throttled", {
      lane: classification.lane,
      reason: classification.reason,
      request_count: bucket.count,
      limit: classification.limit,
      retry_after_seconds: retryAfterSeconds,
      user_agent: userAgent.slice(0, 180),
      ip_hint: getActorIp(request),
    });

    return addSecurityHeaders(response);
  }

  if (isRetiredRegistryHit || isApiProbe || isSearchBurst || isMissingUserAgent || isCardWalking) {
    const reason = isCardWalking
      ? "possible_card_id_walking"
      : isMissingUserAgent
        ? "missing_user_agent"
        : classification.reason;
    const signalKey = `${classification.lane}|${reason}|${actorKey}`;

    if (shouldEmitSignal(signalKey, now)) {
      emitAbuseEvent(event, request, "abuse_signal", {
        lane: classification.lane,
        reason,
        request_count: bucket.count,
        limit: classification.limit,
        user_agent: userAgent.slice(0, 180),
        ip_hint: getActorIp(request),
        observed_only: !classification.enforce || isCardWalking,
      });
    }
  }

  return null;
}

async function applyProtectedRouteAuth(request: NextRequest) {
  const { url, publishableKey } = getSupabaseServerConfig();
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const nextPath = normalizeNextPath(
      request.nextUrl.pathname,
      request.nextUrl.search,
    );
    return NextResponse.redirect(
      new URL(buildLoginHref(nextPath), request.url),
    );
  }

  return response;
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const abuseResponse = applyAbuseProtection(request, event);
  if (abuseResponse) {
    return abuseResponse;
  }

  if (isProtectedRoute(request.nextUrl.pathname)) {
    return addSecurityHeaders(await applyProtectedRouteAuth(request));
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
