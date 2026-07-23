import { NextRequest, NextResponse } from "next/server";
import type { NextFetchEvent } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  buildLoginHref,
  isProtectedRoute,
  normalizeNextPath,
} from "./lib/auth/routeAccess";
import { getSupabaseServerConfig } from "./lib/supabase/config";
import {
  isBinderSecretPath,
  redactBinderSecretPath,
} from "./lib/binders/safePath";

const RATE_LIMIT_WINDOW_MS = 60_000;
const CARD_WALK_WINDOW_MS = 10 * 60_000;
const SIGNAL_DEDUPE_WINDOW_MS = 10 * 60_000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
  source: "memory" | "durable";
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

function getDurableRateLimitConfig() {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !token) {
    return null;
  }

  return {
    restUrl,
    token,
    prefix: process.env.GROOKAI_RATE_LIMIT_REDIS_PREFIX ?? "gv:rate-limit:v1",
  };
}

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

async function getActorHash(actorKey: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(actorKey),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
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

function incrementMemoryRateLimit(key: string, now: number) {
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    const next = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
      source: "memory" as const,
    };
    rateLimitBuckets.set(key, next);
    return next;
  }

  current.count += 1;
  return current;
}

function getPipelineNumberResult(
  response: Array<{ result?: unknown; error?: string }> | null,
  index: number,
) {
  const value = response?.[index]?.result;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function runUpstashPipeline(
  commands: Array<Array<string | number>>,
) {
  const config = getDurableRateLimitConfig();
  if (!config) {
    return null;
  }

  try {
    const response = await fetch(`${config.restUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return Array.isArray(data)
      ? (data as Array<{ result?: unknown; error?: string }>)
      : null;
  } catch {
    return null;
  }
}

async function incrementDurableRateLimit(
  lane: AbuseClassification["lane"],
  actorHash: string,
  now: number,
) {
  const config = getDurableRateLimitConfig();
  if (!config || lane === "none") {
    return null;
  }

  const key = `${config.prefix}:${lane}:${actorHash}`;
  const pipeline = await runUpstashPipeline([
    ["INCR", key],
    ["PTTL", key],
  ]);
  const count = getPipelineNumberResult(pipeline, 0);
  let ttlMs = getPipelineNumberResult(pipeline, 1);

  if (count === null) {
    return null;
  }

  if (count === 1 || ttlMs === null || ttlMs < 0) {
    await runUpstashPipeline([["PEXPIRE", key, RATE_LIMIT_WINDOW_MS]]);
    ttlMs = RATE_LIMIT_WINDOW_MS;
  }

  return {
    count,
    resetAt: now + Math.max(1, ttlMs),
    source: "durable" as const,
  };
}

async function incrementClassifiedRateLimit(
  lane: AbuseClassification["lane"],
  actorHash: string,
  now: number,
) {
  const durableBucket = await incrementDurableRateLimit(lane, actorHash, now);
  if (durableBucket) {
    return durableBucket;
  }

  return incrementMemoryRateLimit(`${lane}|${actorHash}`, now);
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
        path: redactBinderSecretPath(request.nextUrl.pathname),
        gvId: getCardIdFromPath(request.nextUrl.pathname),
        metadata,
      }),
    }).catch(() => undefined),
  );
}

function addSecurityHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (
    request.nextUrl.pathname === "/binders" ||
    request.nextUrl.pathname.startsWith("/binders/") ||
    isBinderSecretPath(request.nextUrl.pathname)
  ) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.append("Vary", "Cookie");
  }

  if (isBinderSecretPath(request.nextUrl.pathname)) {
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return response;
}

async function applyAbuseProtection(request: NextRequest, event: NextFetchEvent) {
  const now = Date.now();
  const actorKey = getActorKey(request);
  const actorHash = await getActorHash(actorKey);
  const classification = classifyRequest(request.nextUrl.pathname);
  const userAgent = request.headers.get("user-agent")?.trim() || "";
  const bucket = await incrementClassifiedRateLimit(classification.lane, actorHash, now);
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
        "X-Grookai-Rate-Limit-Source": bucket.source,
      },
    });

    emitAbuseEvent(event, request, "abuse_throttled", {
      lane: classification.lane,
      reason: classification.reason,
      request_count: bucket.count,
      limit: classification.limit,
      rate_limit_source: bucket.source,
      retry_after_seconds: retryAfterSeconds,
      user_agent: userAgent.slice(0, 180),
      ip_hint: getActorIp(request),
    });

    return addSecurityHeaders(response, request);
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
        rate_limit_source: bucket.source,
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
  const abuseResponse = await applyAbuseProtection(request, event);
  if (abuseResponse) {
    return abuseResponse;
  }

  if (isProtectedRoute(request.nextUrl.pathname)) {
    return addSecurityHeaders(await applyProtectedRouteAuth(request), request);
  }

  return addSecurityHeaders(NextResponse.next(), request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
