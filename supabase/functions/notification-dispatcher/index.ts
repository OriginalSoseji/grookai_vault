import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createServiceRoleClient } from "../_shared/auth.ts";
import { corsHeaders, corsJson } from "../_shared/cors.ts";

type Json = Record<string, unknown>;

type DispatchRequest = {
  limit?: number;
  mock_fcm?: boolean;
  force_fcm_result?: "success" | "transient" | "unregistered" | "not_found";
};

type OutboxRow = {
  id: string;
  recipient_user_id: string;
  event_type: string;
  tier: string;
  card_print_id: string | null;
  actor_user_id: string | null;
  payload: Json;
  attempts: number;
};

type DeviceToken = {
  id: string;
  user_id: string;
  token: string;
  platform: "android" | "ios";
};

type Prefs = {
  instant_enabled: boolean;
  daily_pulse_enabled: boolean;
  weekly_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string | null;
};

type CardPrint = {
  id: string;
  gv_id: string | null;
  name: string;
  set_code: string | null;
  number: string | null;
};

type FormattedNotification = {
  notificationId: string;
  title: string;
  body: string;
  deepLink: string;
  webUrl: string;
};

type FcmResult =
  | { kind: "success"; providerMessageId?: string }
  | { kind: "unregistered"; reason: string }
  | { kind: "permanent"; reason: string }
  | { kind: "transient"; reason: string };

const DEFAULT_PREFS: Prefs = {
  instant_enabled: true,
  daily_pulse_enabled: true,
  weekly_enabled: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: null,
};

const MAX_DISPATCH_BATCH = 8;
const DISPATCH_CONCURRENCY = 2;
const MAX_DEVICE_TOKENS_PER_RECIPIENT = 3;
const MAX_FCM_ATTEMPTS_PER_ROW = 2;
const EXTERNAL_REQUEST_TIMEOUT_MS = 8_000;
const INVOCATION_DEADLINE_MS = 50_000;
const INVOCATION_CLEANUP_RESERVE_MS = 5_000;
const ROW_DISPATCH_DEADLINE_MS = 9_000;
const MIN_FCM_ATTEMPT_BUDGET_MS = 500;

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;
let pendingAccessToken: Promise<string> | null = null;

function normalizeLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return MAX_DISPATCH_BATCH;
  }
  return Math.max(1, Math.min(MAX_DISPATCH_BATCH, Math.trunc(value)));
}

function remainingTimeMs(deadlineAtMs: number): number {
  return Math.max(0, deadlineAtMs - Date.now());
}

function deadlineSignal(deadlineAtMs: number): AbortSignal {
  return AbortSignal.timeout(Math.max(1, remainingTimeMs(deadlineAtMs)));
}

function deadlineError(reason = "dispatch_deadline_exhausted"): Error {
  return new Error(reason);
}

function assertDeadline(deadlineAtMs: number): void {
  if (remainingTimeMs(deadlineAtMs) <= 0) throw deadlineError();
}

async function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit,
  timeoutMs = EXTERNAL_REQUEST_TIMEOUT_MS,
  deadlineAtMs?: number,
): Promise<Response> {
  if (deadlineAtMs !== undefined) assertDeadline(deadlineAtMs);
  const remaining = deadlineAtMs === undefined
    ? timeoutMs
    : remainingTimeMs(deadlineAtMs);
  const effectiveTimeoutMs = Math.max(1, Math.min(timeoutMs, remaining));
  const deadlineLimited = deadlineAtMs !== undefined && remaining <= timeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeoutMs);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw deadlineLimited
        ? deadlineError()
        : new Error(`external_request_timeout:${effectiveTimeoutMs}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getSharedSecret(): string | null {
  return cleanString(Deno.env.get("NOTIFICATION_DISPATCHER_SHARED_SECRET"));
}

function isDevUnauthenticatedAllowed(): boolean {
  return Deno.env.get("NOTIFICATION_DISPATCHER_ALLOW_UNAUTHENTICATED_DEV") ===
    "true";
}

function authorizeDispatcher(req: Request): Response | null {
  const sharedSecret = getSharedSecret();
  if (!sharedSecret) {
    return isDevUnauthenticatedAllowed()
      ? null
      : corsJson(500, { error: "dispatcher_secret_not_configured" });
  }

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    .trim();
  if (bearer !== sharedSecret) {
    return corsJson(401, { error: "unauthorized" });
  }

  return null;
}

function base64Url(input: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : input instanceof Uint8Array
    ? input
    : new Uint8Array(input);

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(
    /=+$/g,
    "",
  );
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function signJwt(serviceAccount: Json): Promise<string> {
  const clientEmail = cleanString(serviceAccount.client_email);
  const privateKey = cleanString(serviceAccount.private_key)?.replace(
    /\\n/g,
    "\n",
  );
  if (!clientEmail || !privateKey) {
    throw new Error("invalid_fcm_service_account");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };
  const signingInput = `${base64Url(JSON.stringify(header))}.${
    base64Url(JSON.stringify(claim))
  }`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64Url(signature)}`;
}

async function getFcmAccessToken(
  serviceAccount: Json,
  deadlineAtMs: number,
): Promise<string> {
  if (
    cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now() + 60_000
  ) {
    return cachedAccessToken.token;
  }

  if (!pendingAccessToken) {
    pendingAccessToken = (async () => {
      const assertion = await signJwt(serviceAccount);
      const res = await fetchWithTimeout(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion,
          }),
        },
        EXTERNAL_REQUEST_TIMEOUT_MS,
        deadlineAtMs,
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok || typeof body.access_token !== "string") {
        throw new Error(`fcm_oauth_failed:${res.status}`);
      }

      cachedAccessToken = {
        token: body.access_token,
        expiresAtMs: Date.now() +
          Math.max(60, Number(body.expires_in ?? 3600) - 60) * 1000,
      };
      return cachedAccessToken.token;
    })();
  }

  const request = pendingAccessToken;
  try {
    return await request;
  } finally {
    if (pendingAccessToken === request) pendingAccessToken = null;
  }
}

function readFcmServiceAccount(): Json | null {
  const raw = cleanString(Deno.env.get("FCM_SERVICE_ACCOUNT_JSON"));
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Json;
  if (!cleanString(parsed.project_id)) {
    throw new Error("invalid_fcm_service_account_project");
  }
  return parsed;
}

function shouldUseMockFcm(body: DispatchRequest): boolean {
  if (body.mock_fcm === true) return true;
  return Deno.env.get("NOTIFICATION_DISPATCHER_FCM_MODE") === "mock";
}

async function sendFcm(
  token: DeviceToken,
  formatted: FormattedNotification,
  force: DispatchRequest["force_fcm_result"],
  mock: boolean,
  deadlineAtMs: number,
): Promise<FcmResult> {
  if (force === "success") {
    return { kind: "success", providerMessageId: "forced-success" };
  }
  if (force === "transient") {
    return { kind: "transient", reason: "forced_transient" };
  }
  if (force === "unregistered") {
    return { kind: "unregistered", reason: "forced_unregistered" };
  }
  if (force === "not_found") {
    return { kind: "unregistered", reason: "forced_not_found" };
  }
  if (mock) return { kind: "success", providerMessageId: "mock-success" };

  const serviceAccount = readFcmServiceAccount();
  if (!serviceAccount) {
    return { kind: "transient", reason: "fcm_service_account_missing" };
  }

  const projectId = cleanString(serviceAccount.project_id);
  if (!projectId) return { kind: "permanent", reason: "fcm_project_missing" };

  const accessToken = await getFcmAccessToken(serviceAccount, deadlineAtMs);
  const message = {
    message: {
      token: token.token,
      notification: {
        title: formatted.title,
        body: formatted.body,
      },
      data: {
        deep_link: formatted.deepLink,
        web_url: formatted.webUrl,
        notification_id: formatted.notificationId,
        source: "grookai_notification_dispatcher_v1",
      },
      android: {
        priority: "HIGH",
        notification: {
          channel_id: "grookai_card_activity",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: formatted.title,
              body: formatted.body,
            },
            sound: "default",
          },
        },
      },
    },
  };

  const res = await fetchWithTimeout(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(message),
    },
    EXTERNAL_REQUEST_TIMEOUT_MS,
    deadlineAtMs,
  );
  const responseText = await res.text();
  if (res.ok) {
    const parsed = JSON.parse(responseText || "{}") as { name?: string };
    return { kind: "success", providerMessageId: parsed.name };
  }

  const normalized = responseText.toUpperCase();
  if (
    res.status === 404 || normalized.includes("UNREGISTERED") ||
    normalized.includes("NOT_FOUND")
  ) {
    return { kind: "unregistered", reason: `fcm_unregistered:${res.status}` };
  }
  if (res.status >= 500 || res.status === 429) {
    return { kind: "transient", reason: `fcm_transient:${res.status}` };
  }
  return { kind: "permanent", reason: `fcm_permanent:${res.status}` };
}

function dateInTimezone(date: Date, timezone: string | null): string {
  const tz = timezone || "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function localMinutes(date: Date, timezone: string | null): number {
  const tz = timezone || "UTC";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return Number(values.hour) * 60 + Number(values.minute);
  } catch {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }
}

function parseTimeMinutes(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isInsideQuietHours(now: Date, prefs: Prefs): boolean {
  const start = parseTimeMinutes(prefs.quiet_hours_start);
  const end = parseTimeMinutes(prefs.quiet_hours_end);
  if (start === null || end === null || start === end) return false;
  const minutes = localMinutes(now, prefs.timezone);
  return start < end
    ? minutes >= start && minutes < end
    : minutes >= start || minutes < end;
}

function nextQuietEnd(now: Date, prefs: Prefs): Date {
  const end = parseTimeMinutes(prefs.quiet_hours_end);
  if (end === null) return new Date(now.getTime() + 60 * 60 * 1000);
  const current = localMinutes(now, prefs.timezone);
  let deltaMinutes = end - current;
  if (deltaMinutes <= 0) deltaMinutes += 24 * 60;
  return new Date(now.getTime() + deltaMinutes * 60 * 1000);
}

function backoffAfterAttempt(attempts: number): Date {
  const seconds = attempts <= 1 ? 60 : attempts === 2 ? 5 * 60 : 30 * 60;
  return new Date(Date.now() + seconds * 1000);
}

function disabledPreferenceReason(
  tier: OutboxRow["tier"],
  prefs: Prefs,
): string | null {
  if (tier === "instant" && !prefs.instant_enabled) return "instant_disabled";
  if (tier === "daily_pulse" && !prefs.daily_pulse_enabled) {
    return "daily_pulse_disabled";
  }
  if (tier === "weekly" && !prefs.weekly_enabled) return "weekly_disabled";
  return null;
}

function messagePreview(payload: Json): string {
  const preview = cleanString(payload.message_preview);
  if (!preview) return "Open Grookai Vault to reply.";
  return preview.length > 140 ? `${preview.slice(0, 137)}...` : preview;
}

function formatBucket(value: unknown): string {
  const bucket = cleanString(value);
  if (bucket === "same_region") return "same region";
  if (bucket === "nearby") return "nearby";
  return "nearby";
}

function formatMatchCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.trunc(count) : 1;
}

function formatNotification(
  outbox: OutboxRow,
  card: CardPrint,
  actorName: string | null,
): FormattedNotification {
  if (!outbox.card_print_id) throw new Error("missing_card_print_id");
  if (!cleanString(card.gv_id)) throw new Error("missing_card_gv_id");

  const notificationId = crypto.randomUUID();
  const actor = actorName || "A collector";
  let title: string;
  let body: string;
  if (outbox.event_type === "message_received") {
    title = `${card.name} · ${actor} sent you a message`;
    body = messagePreview(outbox.payload);
  } else if (outbox.event_type === "want_match_available") {
    const bucket = formatBucket(outbox.payload.distance_bucket);
    title = `${card.name} · ${actor} (${bucket}) has this available for trade`;
    body = "Open Grookai Vault to view the match.";
  } else if (outbox.event_type === "want_match_digest") {
    const count = formatMatchCount(outbox.payload.match_count);
    const label = count === 1 ? "want-list match" : "want-list matches";
    title = `${card.name} · ${count} ${label}`;
    body = "Open Grookai Vault to review today's matches.";
  } else if (outbox.event_type === "pulse_daily") {
    const count = formatMatchCount(outbox.payload.item_count);
    const label = count === 1 ? "thing" : "things";
    title = `${count} ${label} happened around your collection`;
    body = cleanString(outbox.payload.top_card_name) ??
      `${card.name} and more are waiting in Pulse.`;
  } else {
    title = `${card.name} · ${actor} shared card activity`;
    body = "Open Grookai Vault to view the card.";
  }
  if (outbox.event_type === "pulse_daily") {
    const deepLink =
      `grookai://feed?segment=pulse&source=notification&notification_id=${notificationId}`;
    const webUrl = "https://grookaivault.com/feed?segment=pulse";
    return { notificationId, title, body, deepLink, webUrl };
  }

  const owner = outbox.actor_user_id
    ? `&owner=${encodeURIComponent(outbox.actor_user_id)}`
    : "";
  const deepLink = `grookai://card/${
    encodeURIComponent(card.gv_id!)
  }?source=notification&notification_id=${notificationId}${owner}`;
  const webUrl = `https://grookaivault.com/card/${
    encodeURIComponent(card.gv_id!)
  }`;
  return { notificationId, title, body, deepLink, webUrl };
}

async function rpc(
  sb: any,
  name: string,
  params: Json = {},
  signal?: AbortSignal,
): Promise<any> {
  if (signal?.aborted) throw deadlineError();
  const request = sb.rpc(name, params);
  const { data, error } =
    await (signal ? request.abortSignal(signal) : request);
  if (error) throw new Error(`${name}:${error.message}`);
  return data;
}

async function markFolded(
  sb: any,
  row: OutboxRow,
  formatted: FormattedNotification | null,
  reason: string,
  signal?: AbortSignal,
) {
  if (
    (row.event_type === "want_match_digest" ||
      row.event_type === "pulse_daily") &&
    reason === "daily_budget_exhausted"
  ) {
    await rpc(sb, "notification_dispatcher_reschedule_digest_fold_v1", {
      p_outbox_id: row.id,
      p_reason: reason,
    }, signal);
    return;
  }

  await rpc(sb, "notification_dispatcher_mark_folded_v1", {
    p_outbox_id: row.id,
    p_title: formatted?.title ?? "Grookai Vault",
    p_body: formatted?.body ?? "Notification folded into your digest.",
    p_deep_link: formatted?.deepLink ?? "grookai://",
    p_reason: reason,
  }, signal);
}

async function markSkipped(
  sb: any,
  row: OutboxRow,
  formatted: FormattedNotification | null,
  reason: string,
  signal?: AbortSignal,
) {
  await rpc(sb, "notification_dispatcher_log_validation_failure_v1", {
    p_outbox_id: row.id,
    p_reason: reason,
    p_payload: row.payload ?? {},
  }, signal);
  await rpc(sb, "notification_dispatcher_mark_skipped_v1", {
    p_outbox_id: row.id,
    p_title: formatted?.title ?? "Grookai Vault",
    p_body: formatted?.body ?? "Notification skipped.",
    p_deep_link: formatted?.deepLink ?? "grookai://",
    p_reason: reason,
  }, signal);
}

async function dispatchOne(
  sb: any,
  row: OutboxRow,
  requestBody: DispatchRequest,
  workDeadlineAtMs: number,
  invocationSignal: AbortSignal,
) {
  let formatted: FormattedNotification | null = null;
  const rowDeadlineAtMs = Math.min(
    workDeadlineAtMs,
    Date.now() + ROW_DISPATCH_DEADLINE_MS,
  );
  assertDeadline(rowDeadlineAtMs);
  const rowSignal = deadlineSignal(rowDeadlineAtMs);

  if (!row.card_print_id) {
    await markSkipped(sb, row, null, "missing_card_anchor", rowSignal);
    return { id: row.id, status: "skipped", reason: "missing_card_anchor" };
  }

  const cardQuery = sb
    .from("card_prints")
    .select("id, gv_id, name, set_code, number")
    .eq("id", row.card_print_id)
    .maybeSingle()
    .abortSignal(rowSignal);
  const profileQuery = row.actor_user_id
    ? sb
      .from("public_profiles")
      .select("display_name, slug")
      .eq("user_id", row.actor_user_id)
      .maybeSingle()
      .abortSignal(rowSignal)
    : Promise.resolve({ data: null, error: null });
  const prefsQuery = sb
    .from("notification_prefs")
    .select(
      "instant_enabled, daily_pulse_enabled, weekly_enabled, quiet_hours_start, quiet_hours_end, timezone",
    )
    .eq("user_id", row.recipient_user_id)
    .maybeSingle()
    .abortSignal(rowSignal);

  const [cardResult, profileResult, prefsResult] = await Promise.all([
    cardQuery,
    profileQuery,
    prefsQuery,
  ]);

  const { data: card, error: cardError } = cardResult;
  if (cardError || !card) {
    await markSkipped(sb, row, null, "card_lookup_failed", rowSignal);
    return { id: row.id, status: "skipped", reason: "card_lookup_failed" };
  }

  if (profileResult.error) {
    throw new Error(`profile_lookup_failed:${profileResult.error.message}`);
  }
  if (prefsResult.error) {
    throw new Error(`prefs_lookup_failed:${prefsResult.error.message}`);
  }

  const profile = profileResult.data;
  const actorName = cleanString(profile?.display_name) ??
    cleanString(profile?.slug);
  formatted = formatNotification(row, card as CardPrint, actorName);

  const prefsRow = prefsResult.data;
  const prefs = { ...DEFAULT_PREFS, ...(prefsRow ?? {}) } as Prefs;

  const preferenceDisabled = disabledPreferenceReason(row.tier, prefs);
  if (preferenceDisabled) {
    await markFolded(sb, row, formatted, preferenceDisabled, rowSignal);
    return { id: row.id, status: "folded", reason: preferenceDisabled };
  }

  const now = new Date();
  if (isInsideQuietHours(now, prefs)) {
    await rpc(sb, "notification_dispatcher_defer_outbox_v1", {
      p_outbox_id: row.id,
      p_available_at: nextQuietEnd(now, prefs).toISOString(),
      p_reason: "quiet_hours",
    }, rowSignal);
    return { id: row.id, status: "deferred", reason: "quiet_hours" };
  }

  const mutedWatchResult = await sb
    .from("watches")
    .select("id")
    .eq("user_id", row.recipient_user_id)
    .eq("subject_type", "card")
    .eq("subject_id", row.card_print_id)
    .not("muted_at", "is", null)
    .limit(1)
    .maybeSingle()
    .abortSignal(rowSignal);
  if (mutedWatchResult.error) {
    throw new Error(`watch_lookup_failed:${mutedWatchResult.error.message}`);
  }

  const mutedWatch = mutedWatchResult.data;
  if (mutedWatch) {
    await markSkipped(sb, row, formatted, "watch_muted", rowSignal);
    return { id: row.id, status: "skipped", reason: "watch_muted" };
  }

  const tokenResult = await sb
    .from("device_tokens")
    .select("id, user_id, token, platform")
    .eq("user_id", row.recipient_user_id)
    .is("disabled_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(MAX_DEVICE_TOKENS_PER_RECIPIENT)
    .abortSignal(rowSignal);
  if (tokenResult.error) {
    throw new Error(`device_token_lookup_failed:${tokenResult.error.message}`);
  }

  const tokens = tokenResult.data;
  if (!tokens || tokens.length === 0) {
    await markSkipped(
      sb,
      row,
      formatted,
      "no_active_device_tokens",
      rowSignal,
    );
    return { id: row.id, status: "skipped", reason: "no_active_device_tokens" };
  }

  const budgetDate = dateInTimezone(new Date(), prefs.timezone);
  const reserved = await rpc(sb, "notification_dispatcher_reserve_budget_v1", {
    p_user_id: row.recipient_user_id,
    p_budget_date: budgetDate,
  }, rowSignal);
  if (!reserved) {
    await markFolded(
      sb,
      row,
      formatted,
      "daily_budget_exhausted",
      rowSignal,
    );
    return { id: row.id, status: "folded", reason: "daily_budget_exhausted" };
  }

  let successToken: DeviceToken | null = null;
  const failures: FcmResult[] = [];
  let hasDeferredFallback = false;
  try {
    await rpc(sb, "notification_dispatcher_mark_send_started_v1", {
      p_outbox_id: row.id,
    }, rowSignal);

    const mock = shouldUseMockFcm(requestBody);
    const availableTokens = tokens as DeviceToken[];
    const tokenOffset = ((Math.max(1, row.attempts) - 1) *
      MAX_FCM_ATTEMPTS_PER_ROW) % availableTokens.length;
    const attemptTokens = Array.from(
      { length: Math.min(MAX_FCM_ATTEMPTS_PER_ROW, availableTokens.length) },
      (_, index) =>
        availableTokens[(tokenOffset + index) % availableTokens.length],
    );
    hasDeferredFallback = availableTokens.length > attemptTokens.length;

    for (const token of attemptTokens) {
      if (remainingTimeMs(rowDeadlineAtMs) < MIN_FCM_ATTEMPT_BUDGET_MS) {
        failures.push({
          kind: "transient",
          reason: "dispatch_row_deadline_exhausted",
        });
        break;
      }

      let result: FcmResult;
      try {
        result = await sendFcm(
          token,
          formatted,
          requestBody.force_fcm_result,
          mock,
          rowDeadlineAtMs,
        );
      } catch (error) {
        result = {
          kind: "transient",
          reason: String((error as Error)?.message ?? error),
        };
      }
      if (result.kind === "success") {
        successToken = token;
        break;
      }
      failures.push(result);
      if (result.kind === "unregistered") {
        await rpc(sb, "notification_dispatcher_disable_token_v1", {
          p_device_token_id: token.id,
          p_reason: result.reason,
        }, rowSignal).catch(() => null);
      }
    }
  } catch (error) {
    await rpc(sb, "notification_dispatcher_release_budget_v1", {
      p_user_id: row.recipient_user_id,
      p_budget_date: budgetDate,
    }, invocationSignal).catch(() => null);
    throw error;
  }

  if (successToken) {
    await rpc(sb, "notification_dispatcher_mark_sent_v1", {
      p_outbox_id: row.id,
      p_notification_id: formatted.notificationId,
      p_device_token_id: successToken.id,
      p_title: formatted.title,
      p_body: formatted.body,
      p_deep_link: formatted.deepLink,
    }, invocationSignal);
    return {
      id: row.id,
      status: "sent",
      notification_id: formatted.notificationId,
    };
  }

  const hasTransient = hasDeferredFallback ||
    failures.some((failure) => failure.kind === "transient");
  const failureReasons = failures
    .map((failure) =>
      failure.kind === "success" ? "unexpected_success" : failure.reason
    )
    .filter((reason) => reason.length > 0);
  if (hasDeferredFallback) failureReasons.push("fcm_fallback_deferred");
  const reason = failureReasons.join(";") || "fcm_send_failed";

  await rpc(sb, "notification_dispatcher_release_budget_v1", {
    p_user_id: row.recipient_user_id,
    p_budget_date: budgetDate,
  }, invocationSignal);

  if (!hasTransient) {
    await rpc(sb, "notification_dispatcher_mark_skipped_v1", {
      p_outbox_id: row.id,
      p_title: formatted.title,
      p_body: formatted.body,
      p_deep_link: formatted.deepLink,
      p_reason: reason,
    }, invocationSignal);
    return { id: row.id, status: "skipped", reason };
  }

  const retryStatus = await rpc(
    sb,
    "notification_dispatcher_mark_retry_or_failed_v1",
    {
      p_outbox_id: row.id,
      p_reason: reason,
      p_next_attempt_at: backoffAfterAttempt(row.attempts).toISOString(),
    },
    invocationSignal,
  );
  return { id: row.id, status: retryStatus, reason };
}

async function releaseUnstartedRow(
  sb: any,
  row: OutboxRow,
  signal: AbortSignal,
) {
  const reason = "invocation_work_deadline_exhausted";
  try {
    const retryStatus = await rpc(
      sb,
      "notification_dispatcher_mark_retry_or_failed_v1",
      {
        p_outbox_id: row.id,
        p_reason: reason,
        p_next_attempt_at: backoffAfterAttempt(row.attempts).toISOString(),
      },
      signal,
    );
    return { id: row.id, status: retryStatus, reason };
  } catch {
    return { id: row.id, status: "lease_retained", reason };
  }
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return corsJson(405, { error: "method_not_allowed" });
    }

    const authFailure = authorizeDispatcher(req);
    if (authFailure) return authFailure;

    const invocationDeadlineAtMs = Date.now() + INVOCATION_DEADLINE_MS;
    const workDeadlineAtMs = invocationDeadlineAtMs -
      INVOCATION_CLEANUP_RESERVE_MS;
    const invocationSignal = deadlineSignal(invocationDeadlineAtMs);
    const requestBody = (await req.json().catch(() => ({}))) as DispatchRequest;
    const sb = createServiceRoleClient();
    const rows = await rpc(sb, "notification_dispatcher_claim_batch_v1", {
      p_limit: normalizeLimit(requestBody.limit),
    }, invocationSignal) as OutboxRow[];

    const results = [];
    for (let offset = 0; offset < rows.length; offset += DISPATCH_CONCURRENCY) {
      if (remainingTimeMs(workDeadlineAtMs) <= 0) {
        const unstartedRows = rows.slice(offset);
        results.push(
          ...await Promise.all(
            unstartedRows.map((row) =>
              releaseUnstartedRow(sb, row, invocationSignal)
            ),
          ),
        );
        break;
      }

      const chunk = rows.slice(offset, offset + DISPATCH_CONCURRENCY);
      const chunkResults = await Promise.all(chunk.map(async (row) => {
        try {
          return await dispatchOne(
            sb,
            row,
            requestBody,
            workDeadlineAtMs,
            invocationSignal,
          );
        } catch (error) {
          const reason = String((error as Error)?.message ?? error);
          await Promise.allSettled([
            rpc(sb, "notification_dispatcher_log_validation_failure_v1", {
              p_outbox_id: row.id,
              p_reason: reason,
              p_payload: row.payload ?? {},
            }, invocationSignal),
            rpc(sb, "notification_dispatcher_mark_retry_or_failed_v1", {
              p_outbox_id: row.id,
              p_reason: reason,
              p_next_attempt_at: backoffAfterAttempt(row.attempts)
                .toISOString(),
            }, invocationSignal),
          ]);
          return { id: row.id, status: "error", reason };
        }
      }));
      results.push(...chunkResults);
    }

    return corsJson(200, {
      ok: true,
      claimed: rows.length,
      results,
      fcm_mode: shouldUseMockFcm(requestBody) ? "mock" : "real",
    });
  } catch (error) {
    return corsJson(500, {
      ok: false,
      error: "notification_dispatcher_failed",
      detail: String((error as Error)?.message ?? error),
    });
  }
});
