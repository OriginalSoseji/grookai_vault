import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import { json, requireUser } from "../_shared/auth.ts";
import { getServiceRoleKey } from "../_shared/key_resolver.ts";

console.log("[pricing-live-request] version=2025-11-26");

type LivePriceRequestBody = {
  card_print_id?: unknown;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const HOT_VALUE_THRESHOLD = 100;
const HOT_VAULT_COUNT_THRESHOLD = 10;
const HOT_LISTING_THRESHOLD = 10;
const NORMAL_VALUE_THRESHOLD = 25;
const NORMAL_VAULT_COUNT_THRESHOLD = 3;
const NORMAL_LISTING_THRESHOLD = 25;

type CanonicalRawPriceMetadataRow = {
  card_print_id: string | null;
  listing_count: number | null;
  confidence: number | null;
  updated_at: string | null;
  last_snapshot_at: string | null;
};

type CanonicalRawPriceRow = {
  card_id: string | null;
  base_market: number | null;
  base_source: string | null;
  base_ts: string | null;
};

type PricingJobRow = {
  id: string | null;
  requested_at: string | null;
  next_eligible_at: string | null;
  last_meaningful_attempt_at: string | null;
  priority: string | null;
  last_outcome: string | null;
};

type SlabCertRow = {
  id: string | null;
};

type FreshnessTier = "hot" | "normal" | "long_tail" | "cold_catalog";

function parseTimestamp(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function determineFreshnessTier(input: {
  listingCount: number;
  vaultCount: number;
  grookaiValue: number | null;
}): { tier: FreshnessTier; ttlMs: number } {
  if (
    (input.listingCount > 0 && input.listingCount <= HOT_LISTING_THRESHOLD) ||
    input.vaultCount >= HOT_VAULT_COUNT_THRESHOLD ||
    (input.grookaiValue !== null && input.grookaiValue >= HOT_VALUE_THRESHOLD)
  ) {
    return { tier: "hot", ttlMs: 6 * HOUR_MS };
  }

  if (
    (input.listingCount > HOT_LISTING_THRESHOLD && input.listingCount <= NORMAL_LISTING_THRESHOLD) ||
    input.vaultCount >= NORMAL_VAULT_COUNT_THRESHOLD ||
    (input.grookaiValue !== null && input.grookaiValue >= NORMAL_VALUE_THRESHOLD)
  ) {
    return { tier: "normal", ttlMs: 24 * HOUR_MS };
  }

  if (input.listingCount > NORMAL_LISTING_THRESHOLD || input.vaultCount > 0 || input.grookaiValue !== null) {
    return { tier: "long_tail", ttlMs: 72 * HOUR_MS };
  }

  return { tier: "cold_catalog", ttlMs: 7 * DAY_MS };
}

const handler = async (req: Request): Promise<Response> => {
  const requestId = crypto.randomUUID();

  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed", detail: "POST required" });
  }

  let userId = "";
  try {
    const auth = await requireUser(req);
    userId = auth.userId;
  } catch (err) {
    const code = (typeof err === "object" && err !== null && "code" in err)
      ? String((err as { code?: unknown }).code ?? "unknown")
      : "unknown";
    const detail = code === "missing_bearer_token"
      ? "Missing bearer token"
      : code === "invalid_jwt"
      ? "Invalid JWT"
      : "Authentication failed";

    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        outcome: "rejected_auth",
        detail,
      }),
    );

    if (code === "missing_bearer_token" || code === "invalid_jwt") {
      return json(401, { error: "auth_required", detail });
    }
    if (code === "server_misconfigured") {
      return json(500, { error: "server_misconfigured", detail: "Auth environment missing" });
    }
    return json(401, { error: "auth_required", detail });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL") ?? "";
  const serviceRole = getServiceRoleKey() ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRole) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        outcome: "rejected_server_config",
      }),
    );
    return json(500, { error: "server_misconfigured", detail: "Supabase configuration missing" });
  }

  let body: LivePriceRequestBody = {};
  try {
    body = (await req.json()) as LivePriceRequestBody;
  } catch {
    body = {};
  }

  const fields: Record<string, string> = {};
  const cardPrintId = typeof body.card_print_id === "string" ? body.card_print_id.trim() : "";
  if (!cardPrintId) {
    fields.card_print_id = "required";
  } else if (!isUuid(cardPrintId)) {
    fields.card_print_id = "must_be_uuid";
  }

  if (Object.keys(fields).length > 0) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId || null,
        outcome: "rejected_invalid_request",
        fields,
      }),
    );
    return json(400, {
      error: "invalid_request",
      detail: "Invalid request payload",
      fields,
    });
  }

  const client = createClient(supabaseUrl, serviceRole);

  // Phase 1 canonical raw read seam:
  // - v_best_prices_all_gv_v1 provides raw price/source/timestamp
  // - card_print_active_prices provides optional freshness metadata
  const [activePriceResult, compatibilityPriceResult, rawInstanceCountResult, slabCertResult] = await Promise.all([
    client
      .from("card_print_active_prices")
      .select("card_print_id,listing_count,confidence,updated_at,last_snapshot_at")
      .eq("card_print_id", cardPrintId)
      .maybeSingle(),
    client
      .from("v_best_prices_all_gv_v1")
      .select("card_id,base_market,base_source,base_ts")
      .eq("card_id", cardPrintId)
      .maybeSingle(),
    client
      .from("vault_item_instances")
      .select("id", { count: "exact", head: true })
      .eq("card_print_id", cardPrintId)
      .is("archived_at", null),
    client
      .from("slab_certs")
      .select("id")
      .eq("card_print_id", cardPrintId),
  ]);

  if (activePriceResult.error) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId,
        outcome: "freshness_lookup_failed",
        detail: activePriceResult.error.message,
      }),
    );
    return json(500, { error: "freshness_lookup_failed", detail: "Failed to read active pricing state" });
  }

  if (compatibilityPriceResult.error) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId,
        outcome: "compatibility_lookup_failed",
        detail: compatibilityPriceResult.error.message,
      }),
    );
    return json(500, { error: "compatibility_lookup_failed", detail: "Failed to read pricing compatibility state" });
  }

  if (rawInstanceCountResult.error) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId,
        outcome: "instance_count_lookup_failed",
        detail: rawInstanceCountResult.error.message,
      }),
    );
    return json(500, { error: "instance_count_lookup_failed", detail: "Failed to read canonical ownership activity state" });
  }

  if (slabCertResult.error) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId,
        outcome: "slab_cert_lookup_failed",
        detail: slabCertResult.error.message,
      }),
    );
    return json(500, { error: "slab_cert_lookup_failed", detail: "Failed to read slab ownership compatibility state" });
  }

  const slabCertIds = ((slabCertResult.data ?? []) as SlabCertRow[])
    .map((row) => row.id)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const slabInstanceCountResult = slabCertIds.length > 0
    ? await client
        .from("vault_item_instances")
        .select("id", { count: "exact", head: true })
        .in("slab_cert_id", slabCertIds)
        .is("archived_at", null)
    : { count: 0, error: null };

  if (slabInstanceCountResult.error) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId,
        outcome: "instance_count_lookup_failed",
        detail: slabInstanceCountResult.error.message,
      }),
    );
    return json(500, { error: "instance_count_lookup_failed", detail: "Failed to read canonical ownership activity state" });
  }

  const activePrice = activePriceResult.data as CanonicalRawPriceMetadataRow | null;
  const compatibilityPrice = compatibilityPriceResult.data as CanonicalRawPriceRow | null;
  const vaultCount = (rawInstanceCountResult.count ?? 0) + (slabInstanceCountResult.count ?? 0);
  const listingCount = typeof activePrice?.listing_count === "number" ? activePrice.listing_count : 0;
  const grookaiValueNm = typeof compatibilityPrice?.base_market === "number" ? compatibilityPrice.base_market : null;
  const freshnessTs =
    parseTimestamp(compatibilityPrice?.base_ts) ??
    parseTimestamp(activePrice?.updated_at) ??
    parseTimestamp(activePrice?.last_snapshot_at);
  const freshnessTier = determineFreshnessTier({
    listingCount,
    vaultCount,
    grookaiValue: grookaiValueNm,
  });
  const now = Date.now();
  const ageMs = freshnessTs === null ? null : Math.max(0, now - freshnessTs);

  if (freshnessTs !== null && ageMs !== null && ageMs < freshnessTier.ttlMs) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId,
        outcome: "fresh",
        freshness_tier: freshnessTier.tier,
        age_ms: ageMs,
        ttl_ms: freshnessTier.ttlMs,
      }),
    );
    return json(200, {
      status: "fresh",
      card_print_id: cardPrintId,
      freshness_tier: freshnessTier.tier,
      ttl_hours: Math.round(freshnessTier.ttlMs / HOUR_MS),
      age_minutes: Math.floor(ageMs / (60 * 1000)),
    });
  }

  const { data: openJob, error: openJobError } = await client
    .from("pricing_jobs")
    .select("id,requested_at")
    .eq("card_print_id", cardPrintId)
    .in("status", ["pending", "running"])
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openJobError) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId,
        outcome: "open_job_lookup_failed",
        detail: openJobError.message,
      }),
    );
    return json(500, { error: "open_job_lookup_failed", detail: "Failed to inspect pricing queue state" });
  }

  if (openJob?.id) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId,
        outcome: "already_queued",
        pricing_job_id: openJob.id,
      }),
    );
    return json(200, {
      status: "already_queued",
      request_id: openJob.id,
      card_print_id: cardPrintId,
    });
  }

  const { data: recentJob, error: recentJobError } = await client
    .from("pricing_jobs")
    .select("id,requested_at,next_eligible_at,last_meaningful_attempt_at,priority,last_outcome")
    .eq("card_print_id", cardPrintId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentJobError) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId,
        outcome: "cooldown_lookup_failed",
        detail: recentJobError.message,
      }),
    );
    return json(500, { error: "cooldown_lookup_failed", detail: "Failed to inspect recent pricing requests" });
  }

  const recentJobNextEligibleAt = parseTimestamp((recentJob as PricingJobRow | null)?.next_eligible_at);
  if (recentJobNextEligibleAt !== null && recentJobNextEligibleAt > now) {
    const cooldownHours = Math.max(1, Math.ceil((recentJobNextEligibleAt - now) / HOUR_MS));
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId,
        outcome: "cooldown",
        recent_job_id: (recentJob as PricingJobRow | null)?.id ?? null,
        next_eligible_at: (recentJob as PricingJobRow | null)?.next_eligible_at ?? null,
        last_outcome: (recentJob as PricingJobRow | null)?.last_outcome ?? null,
        queue_priority: (recentJob as PricingJobRow | null)?.priority ?? null,
      }),
    );
    return json(200, {
      status: "cooldown",
      request_id: (recentJob as PricingJobRow | null)?.id ?? null,
      card_print_id: cardPrintId,
      cooldown_hours: cooldownHours,
      next_eligible_at: (recentJob as PricingJobRow | null)?.next_eligible_at ?? null,
    });
  }

  const initialPriority = vaultCount > 0 ? "vault" : "user";

  const { data, error } = await client
    .from("pricing_jobs")
    .insert({
      card_print_id: cardPrintId,
      requester_user_id: userId,
      priority: initialPriority,
      reason: "live_price_request",
      status: "pending",
      next_eligible_at: new Date().toISOString(),
    })
    .select("id, status, card_print_id")
    .maybeSingle();

  if (error) {
    console.log(
      JSON.stringify({
        route: "pricing-live-request",
        request_id: requestId,
        user_id: userId,
        card_print_id: cardPrintId,
        outcome: "enqueue_failed",
        detail: error.message,
      }),
    );
    return json(500, { error: "enqueue_failed", detail: "Failed to queue pricing request" });
  }

  console.log(
    JSON.stringify({
      route: "pricing-live-request",
      request_id: requestId,
      user_id: userId,
      card_print_id: cardPrintId,
      outcome: "enqueued",
      pricing_job_id: data?.id ?? null,
      queue_priority: initialPriority,
    }),
  );

  return json(201, {
    status: "queued",
    request_id: data?.id,
    card_print_id: data?.card_print_id,
    freshness_tier: freshnessTier.tier,
    queue_priority: initialPriority,
  });
};

if (import.meta.main) {
  Deno.serve(handler);
}

export default handler;
