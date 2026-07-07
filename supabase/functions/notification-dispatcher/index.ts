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

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

function normalizeLimit(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 25;
  return Math.max(1, Math.min(100, Math.trunc(value)));
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

async function getFcmAccessToken(serviceAccount: Json): Promise<string> {
  if (
    cachedAccessToken && cachedAccessToken.expiresAtMs > Date.now() + 60_000
  ) {
    return cachedAccessToken.token;
  }

  const assertion = await signJwt(serviceAccount);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
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

  const accessToken = await getFcmAccessToken(serviceAccount);
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

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(message),
    },
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

function messagePreview(payload: Json): string {
  const preview = cleanString(payload.message_preview);
  if (!preview) return "Open Grookai Vault to reply.";
  return preview.length > 140 ? `${preview.slice(0, 137)}...` : preview;
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
  const action = outbox.event_type === "message_received"
    ? "sent you a message"
    : "shared card activity";
  const title = `${card.name} · ${actor} ${action}`;
  const body = outbox.event_type === "message_received"
    ? messagePreview(outbox.payload)
    : "Open Grookai Vault to view the card.";
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

async function rpc(sb: any, name: string, params: Json = {}): Promise<any> {
  const { data, error } = await sb.rpc(name, params);
  if (error) throw new Error(`${name}:${error.message}`);
  return data;
}

async function markFolded(
  sb: any,
  row: OutboxRow,
  formatted: FormattedNotification | null,
  reason: string,
) {
  await rpc(sb, "notification_dispatcher_mark_folded_v1", {
    p_outbox_id: row.id,
    p_title: formatted?.title ?? "Grookai Vault",
    p_body: formatted?.body ?? "Notification folded into your digest.",
    p_deep_link: formatted?.deepLink ?? "grookai://",
    p_reason: reason,
  });
}

async function markSkipped(
  sb: any,
  row: OutboxRow,
  formatted: FormattedNotification | null,
  reason: string,
) {
  await rpc(sb, "notification_dispatcher_log_validation_failure_v1", {
    p_outbox_id: row.id,
    p_reason: reason,
    p_payload: row.payload ?? {},
  });
  await rpc(sb, "notification_dispatcher_mark_skipped_v1", {
    p_outbox_id: row.id,
    p_title: formatted?.title ?? "Grookai Vault",
    p_body: formatted?.body ?? "Notification skipped.",
    p_deep_link: formatted?.deepLink ?? "grookai://",
    p_reason: reason,
  });
}

async function dispatchOne(
  sb: any,
  row: OutboxRow,
  requestBody: DispatchRequest,
) {
  let formatted: FormattedNotification | null = null;

  if (!row.card_print_id) {
    await markSkipped(sb, row, null, "missing_card_anchor");
    return { id: row.id, status: "skipped", reason: "missing_card_anchor" };
  }

  const { data: card, error: cardError } = await sb
    .from("card_prints")
    .select("id, gv_id, name, set_code, number")
    .eq("id", row.card_print_id)
    .maybeSingle();
  if (cardError || !card) {
    await markSkipped(sb, row, null, "card_lookup_failed");
    return { id: row.id, status: "skipped", reason: "card_lookup_failed" };
  }

  const { data: profile } = row.actor_user_id
    ? await sb
      .from("public_profiles")
      .select("display_name, slug")
      .eq("user_id", row.actor_user_id)
      .maybeSingle()
    : { data: null };
  const actorName = cleanString(profile?.display_name) ??
    cleanString(profile?.slug);
  formatted = formatNotification(row, card as CardPrint, actorName);

  const { data: prefsRow } = await sb
    .from("notification_prefs")
    .select(
      "instant_enabled, daily_pulse_enabled, weekly_enabled, quiet_hours_start, quiet_hours_end, timezone",
    )
    .eq("user_id", row.recipient_user_id)
    .maybeSingle();
  const prefs = { ...DEFAULT_PREFS, ...(prefsRow ?? {}) } as Prefs;

  if (row.tier === "instant" && !prefs.instant_enabled) {
    await markFolded(sb, row, formatted, "instant_disabled");
    return { id: row.id, status: "folded", reason: "instant_disabled" };
  }

  if (isInsideQuietHours(new Date(), prefs)) {
    await rpc(sb, "notification_dispatcher_defer_outbox_v1", {
      p_outbox_id: row.id,
      p_available_at: nextQuietEnd(new Date(), prefs).toISOString(),
      p_reason: "quiet_hours",
    });
    return { id: row.id, status: "deferred", reason: "quiet_hours" };
  }

  const { data: mutedWatch } = await sb
    .from("watches")
    .select("id")
    .eq("user_id", row.recipient_user_id)
    .eq("subject_type", "card")
    .eq("subject_id", row.card_print_id)
    .not("muted_at", "is", null)
    .limit(1)
    .maybeSingle();
  if (mutedWatch) {
    await markSkipped(sb, row, formatted, "watch_muted");
    return { id: row.id, status: "skipped", reason: "watch_muted" };
  }

  const { data: tokens, error: tokenError } = await sb
    .from("device_tokens")
    .select("id, user_id, token, platform")
    .eq("user_id", row.recipient_user_id)
    .is("disabled_at", null)
    .order("last_seen_at", { ascending: false });
  if (tokenError || !tokens || tokens.length === 0) {
    await markSkipped(sb, row, formatted, "no_active_device_tokens");
    return { id: row.id, status: "skipped", reason: "no_active_device_tokens" };
  }

  const budgetDate = dateInTimezone(new Date(), prefs.timezone);
  const reserved = await rpc(sb, "notification_dispatcher_reserve_budget_v1", {
    p_user_id: row.recipient_user_id,
    p_budget_date: budgetDate,
  });
  if (!reserved) {
    await markFolded(sb, row, formatted, "daily_budget_exhausted");
    return { id: row.id, status: "folded", reason: "daily_budget_exhausted" };
  }

  await rpc(sb, "notification_dispatcher_mark_send_started_v1", {
    p_outbox_id: row.id,
  });

  const mock = shouldUseMockFcm(requestBody);
  let successToken: DeviceToken | null = null;
  const failures: FcmResult[] = [];
  for (const token of tokens as DeviceToken[]) {
    const result = await sendFcm(
      token,
      formatted,
      requestBody.force_fcm_result,
      mock,
    );
    if (result.kind === "success") {
      successToken = token;
      break;
    }
    failures.push(result);
    if (result.kind === "unregistered") {
      await rpc(sb, "notification_dispatcher_disable_token_v1", {
        p_device_token_id: token.id,
        p_reason: result.reason,
      });
    }
  }

  if (successToken) {
    await rpc(sb, "notification_dispatcher_mark_sent_v1", {
      p_outbox_id: row.id,
      p_notification_id: formatted.notificationId,
      p_device_token_id: successToken.id,
      p_title: formatted.title,
      p_body: formatted.body,
      p_deep_link: formatted.deepLink,
    });
    return {
      id: row.id,
      status: "sent",
      notification_id: formatted.notificationId,
    };
  }

  const hasTransient = failures.some((failure) => failure.kind === "transient");
  const reason = failures
    .map((failure) =>
      failure.kind === "success" ? "unexpected_success" : failure.reason
    )
    .join(";") || "fcm_send_failed";
  if (!hasTransient) {
    await rpc(sb, "notification_dispatcher_mark_skipped_v1", {
      p_outbox_id: row.id,
      p_title: formatted.title,
      p_body: formatted.body,
      p_deep_link: formatted.deepLink,
      p_reason: reason,
    });
    await rpc(sb, "notification_dispatcher_release_budget_v1", {
      p_user_id: row.recipient_user_id,
      p_budget_date: budgetDate,
    });
    return { id: row.id, status: "skipped", reason };
  }

  await rpc(sb, "notification_dispatcher_release_budget_v1", {
    p_user_id: row.recipient_user_id,
    p_budget_date: budgetDate,
  });
  const retryStatus = await rpc(
    sb,
    "notification_dispatcher_mark_retry_or_failed_v1",
    {
      p_outbox_id: row.id,
      p_reason: reason,
      p_next_attempt_at: backoffAfterAttempt(row.attempts).toISOString(),
    },
  );
  return { id: row.id, status: retryStatus, reason };
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

    const requestBody = (await req.json().catch(() => ({}))) as DispatchRequest;
    const sb = createServiceRoleClient();
    const rows = await rpc(sb, "notification_dispatcher_claim_batch_v1", {
      p_limit: normalizeLimit(requestBody.limit),
    }) as OutboxRow[];

    const results = [];
    for (const row of rows) {
      try {
        results.push(await dispatchOne(sb, row, requestBody));
      } catch (error) {
        const reason = String((error as Error)?.message ?? error);
        await rpc(sb, "notification_dispatcher_log_validation_failure_v1", {
          p_outbox_id: row.id,
          p_reason: reason,
          p_payload: row.payload ?? {},
        }).catch(() => null);
        await rpc(sb, "notification_dispatcher_mark_retry_or_failed_v1", {
          p_outbox_id: row.id,
          p_reason: reason,
          p_next_attempt_at: backoffAfterAttempt(row.attempts).toISOString(),
        }).catch(() => null);
        results.push({ id: row.id, status: "error", reason });
      }
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
