// Supabase Edge Function: wall_feed (public, fixed-shape, read-only)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getServiceRoleKey } from "../_shared/key_resolver.ts";

const SELECT_COLUMNS = [
  "listing_id",
  "owner_id",
  "card_id",
  "title",
  "price_cents",
  "currency",
  "condition",
  "status",
  "created_at",
  "thumb_url",
].join(",");

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  vary: "Origin",
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const RATE_LIMIT_STATE = new Map<
  string,
  { windowStartedAt: number; requestCount: number }
>();

type WallFeedDependencies = {
  fetchImpl?: typeof fetch;
  supabaseUrl?: string;
  secretKey?: string;
  logger?: Pick<Console, "error" | "log">;
  nowMs?: () => number;
  rateLimitState?: Map<
    string,
    { windowStartedAt: number; requestCount: number }
  >;
};

function json(
  status: number,
  body: unknown,
  additionalHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? "public, max-age=30" : "no-store",
      ...Object.fromEntries(new Headers(additionalHeaders)),
    },
  });
}

function clientRateLimitKey(req: Request): string {
  return req.headers.get("cf-connecting-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown-client";
}

function consumeRateLimit(
  key: string,
  now: number,
  state: Map<string, { windowStartedAt: number; requestCount: number }>,
): { allowed: boolean; retryAfterSeconds: number } {
  const current = state.get(key);
  if (!current || now - current.windowStartedAt >= RATE_LIMIT_WINDOW_MS) {
    state.set(key, { windowStartedAt: now, requestCount: 1 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.requestCount >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(
          (RATE_LIMIT_WINDOW_MS - (now - current.windowStartedAt)) / 1000,
        ),
      ),
    };
  }

  current.requestCount += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function boundedInteger(
  raw: string | null,
  fallback: number,
  maximum: number,
): number {
  if (raw === null || !/^\d+$/.test(raw)) return fallback;
  return Math.min(maximum, Number(raw));
}

function quotedPostgrestValue(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function escapedIlikePattern(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_")
    .replaceAll("*", "\\*");
}

function parseCount(contentRange: string | null, fallback: number): number {
  const total = contentRange?.split("/").at(-1);
  if (!total || total === "*") return fallback;
  const parsed = Number(total);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function safeUpstreamError(body: string): {
  upstream_code: string | null;
  upstream_message: string | null;
} {
  try {
    const parsed = JSON.parse(body) as {
      code?: unknown;
      message?: unknown;
    };
    return {
      upstream_code: typeof parsed.code === "string" ? parsed.code : null,
      upstream_message: typeof parsed.message === "string"
        ? parsed.message.slice(0, 300)
        : null,
    };
  } catch {
    return { upstream_code: null, upstream_message: null };
  }
}

export async function handleWallFeed(
  req: Request,
  dependencies: WallFeedDependencies = {},
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }
  if (req.method !== "GET") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  const supabaseUrl = dependencies.supabaseUrl ??
    Deno.env.get("SUPABASE_URL");
  const secretKey = dependencies.secretKey ?? getServiceRoleKey();
  if (!supabaseUrl || !secretKey) {
    return json(500, { ok: false, error: "server_misconfigured" });
  }

  const rateLimit = consumeRateLimit(
    clientRateLimitKey(req),
    (dependencies.nowMs ?? Date.now)(),
    dependencies.rateLimitState ?? RATE_LIMIT_STATE,
  );
  if (!rateLimit.allowed) {
    return json(
      429,
      { ok: false, error: "rate_limit_exceeded" },
      { "retry-after": String(rateLimit.retryAfterSeconds) },
    );
  }

  const requestUrl = new URL(req.url);
  const limit = boundedInteger(requestUrl.searchParams.get("limit"), 50, 100);
  const offset = boundedInteger(
    requestUrl.searchParams.get("offset"),
    0,
    100_000,
  );
  const q = requestUrl.searchParams.get("q")?.trim().slice(0, 120) ?? "";
  const conditions = [
    ...new Set(
      [
        ...requestUrl.searchParams.getAll("condition").flatMap((value) =>
          value.split(",")
        ),
        ...(requestUrl.searchParams.get("conditions") ?? "").split(","),
      ].map((value) => value.trim()).filter(Boolean),
    ),
  ].slice(0, 10);
  const minPrice = requestUrl.searchParams.get("min_price_cents");
  const maxPrice = requestUrl.searchParams.get("max_price_cents");

  const restUrl = new URL("/rest/v1/wall_feed_view", supabaseUrl);
  restUrl.searchParams.set("select", SELECT_COLUMNS);
  restUrl.searchParams.set("order", "created_at.desc");
  restUrl.searchParams.set("limit", String(limit));
  restUrl.searchParams.set("offset", String(offset));
  if (q) {
    restUrl.searchParams.append("title", `ilike.*${escapedIlikePattern(q)}*`);
  }
  if (conditions.length > 0) {
    restUrl.searchParams.append(
      "condition",
      `in.(${conditions.map(quotedPostgrestValue).join(",")})`,
    );
  }
  if (minPrice && /^\d+$/.test(minPrice)) {
    restUrl.searchParams.append("price_cents", `gte.${Number(minPrice)}`);
  }
  if (maxPrice && /^\d+$/.test(maxPrice)) {
    restUrl.searchParams.append("price_cents", `lte.${Number(maxPrice)}`);
  }

  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const logger = dependencies.logger ?? console;
  let upstream: Response;
  try {
    upstream = await fetchImpl(restUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        apikey: secretKey,
        prefer: "count=planned",
      },
    });
  } catch (error) {
    logger.error("wall_feed transport failure", error);
    return json(502, { ok: false, error: "wall_feed_upstream_unavailable" });
  }

  let upstreamBody: string;
  try {
    upstreamBody = await upstream.text();
  } catch (error) {
    logger.error("wall_feed response body read failure", error);
    return json(502, { ok: false, error: "wall_feed_upstream_unavailable" });
  }
  if (!upstream.ok) {
    const safeError = safeUpstreamError(upstreamBody);
    // The bounded GET is the only upstream operation. PostgREST may omit its
    // JSON error body for an unsatisfiable offset, so status 416 is sufficient
    // evidence that pagination reached the end of the feed.
    if (upstream.status === 416) {
      const count = parseCount(upstream.headers.get("content-range"), 0);
      logger.log("wall_feed query completed beyond available range", {
        count,
        returned: 0,
        limit,
        offset,
      });
      return json(200, { items: [], count });
    }
    logger.error("wall_feed query failure", {
      status: upstream.status,
      ...safeError,
    });
    return json(502, {
      ok: false,
      error: "wall_feed_query_failed",
      upstream_status: upstream.status,
      upstream_code: safeError.upstream_code,
    });
  }

  let rows: unknown;
  try {
    rows = JSON.parse(upstreamBody);
  } catch {
    logger.error("wall_feed returned invalid JSON");
    return json(502, { ok: false, error: "wall_feed_invalid_response" });
  }
  if (!Array.isArray(rows)) {
    logger.error("wall_feed returned a non-array payload");
    return json(502, { ok: false, error: "wall_feed_invalid_response" });
  }

  const count = parseCount(upstream.headers.get("content-range"), rows.length);
  logger.log("wall_feed query completed", {
    count,
    returned: rows.length,
    limit,
    offset,
    filtered: Boolean(q || conditions.length || minPrice || maxPrice),
  });
  return json(200, { items: rows, count });
}

if (import.meta.main) {
  serve((req) => handleWallFeed(req));
}
