import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ebay_oauth_callback:
// Handles eBay OAuth redirect, exchanges code for tokens, and stores them in public.ebay_accounts.
// This function assumes the caller is an authenticated Grookai Vault user and will be invoked after eBay login.

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function getTokenEndpoint(): string {
  const env = (Deno.env.get("EBAY_ENV") ?? "production").toLowerCase();
  return env === "sandbox"
    ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
    : "https://api.ebay.com/identity/v1/oauth2/token";
}

async function exchangeCodeForTokens(code: string) {
  const clientId = Deno.env.get("EBAY_CLIENT_ID");
  const clientSecret = Deno.env.get("EBAY_CLIENT_SECRET");
  const redirectUri = Deno.env.get("EBAY_REDIRECT_URI");
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("EBAY client env vars are missing");
  }
  const tokenUrl = getTokenEndpoint();
  const basic = btoa(`${clientId}:${clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `eBay token exchange failed (${res.status} ${res.statusText}): ${text}`,
    );
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  }>;
}

function computeExpiry(expiresIn?: number): string | null {
  if (!expiresIn || Number.isNaN(expiresIn)) return null;
  const ms = expiresIn * 1000;
  return new Date(Date.now() + ms).toISOString();
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const queryCode = url.searchParams.get("code");
  const queryState = url.searchParams.get("state");
  let bodyCode: string | null = null;
  let bodyState: string | null = null;
  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await req.json().catch(() => ({})) as Record<string, string>;
      bodyCode = data?.code ?? null;
      bodyState = data?.state ?? null;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      bodyCode = (form.get("code") as string) ?? null;
      bodyState = (form.get("state") as string) ?? null;
    }
  }

  const code = bodyCode ?? queryCode;
  const state = bodyState ?? queryState;

  if (!code) {
    return json({ ok: false, reason: "missing_code" }, 400);
  }

  if (!state) {
    console.warn("[ebay-oauth] Missing state parameter (TODO: enforce CSRF validation)");
  }

  const supabaseUrl =
    Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL") ?? "";
  const anonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    "";
  if (!supabaseUrl || !anonKey) {
    return json({ ok: false, reason: "supabase_env_missing" }, 500);
  }

  const authHeader =
    req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader) {
    return json({ ok: false, reason: "missing_auth_header" }, 401);
  }

  const userSupabase = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
  const {
    data: userData,
    error: userError,
  } = await userSupabase.auth.getUser();
  if (userError || !userData?.user?.id) {
    console.warn("[ebay-oauth] Failed to fetch user:", userError);
    return json({ ok: false, reason: "unauthorized" }, 401);
  }
  const userId = userData.user.id;

  const tokenResponse = await exchangeCodeForTokens(code);
  const expiresAt = computeExpiry(tokenResponse.expires_in);
  const marketplaceId =
    Deno.env.get("EBAY_MARKETPLACE_ID") ?? "EBAY_US";
  const nowIso = new Date().toISOString();
  const scopes =
    tokenResponse.scope?.split(/\s+/).filter((s) => s.length > 0) ?? null;

  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? anonKey;
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const existing = await serviceClient
    .from("ebay_accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("marketplace_id", marketplaceId)
    .maybeSingle();

  if (existing.error && existing.error.code !== "PGRST116") {
    console.error("[ebay-oauth] select error:", existing.error);
    return json({ ok: false, reason: "db_select_error" }, 500);
  }

  const payload = {
    user_id: userId,
    marketplace_id: marketplaceId,
    ebay_username: null as string | null, // TODO: fetch via eBay identity API.
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token ?? null,
    access_token_expires_at: expiresAt,
    scopes,
    is_active: true,
    updated_at: nowIso,
  };

  if (existing.data?.id) {
    const { error: updateError } = await serviceClient
      .from("ebay_accounts")
      .update(payload)
      .eq("id", existing.data.id);
    if (updateError) {
      console.error("[ebay-oauth] update error:", updateError);
      return json({ ok: false, reason: "db_update_error" }, 500);
    }
  } else {
    const { error: insertError } = await serviceClient
      .from("ebay_accounts")
      .insert({
        ...payload,
        created_at: nowIso,
      });
    if (insertError) {
      console.error("[ebay-oauth] insert error:", insertError);
      return json({ ok: false, reason: "db_insert_error" }, 500);
    }
  }

  return json({
    ok: true,
    message: "Seller account connected. You may close this window.",
  });
}
