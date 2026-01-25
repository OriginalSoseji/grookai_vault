import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export type AuthEnv = {
  supabaseUrl: string;
  serviceRoleKey: string;
};

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/**
 * Hardened bearer extraction:
 * - tolerates whitespace + wrapping quotes
 * - supports "Bearer <jwt>" case-insensitive
 * - supports raw JWT fallback (a.b.c)
 */
export function extractBearerToken(req: Request): string | null {
  let h =
    req.headers.get("authorization") ??
    req.headers.get("Authorization") ??
    req.headers.get("x-gv-bearer");

  if (!h) return null;

  h = String(h).trim();

  // Strip wrapping quotes: "Bearer xxx" or 'Bearer xxx'
  if (
    (h.startsWith('"') && h.endsWith('"')) ||
    (h.startsWith("'") && h.endsWith("'"))
  ) {
    h = h.slice(1, -1).trim();
  }

  const m = h.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();

  // Raw JWT fallback
  if (/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(h)) return h;

  return null;
}

export function readAuthEnv(): AuthEnv | null {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey };
}

/**
 * Requires a valid user token.
 * Returns { sb, userId } where sb is a service-role Supabase client
 * configured to evaluate RLS via the provided user token.
 */
export async function requireUser(req: Request): Promise<{
  sb: ReturnType<typeof createClient>;
  userId: string;
}> {
  const env = readAuthEnv();
  if (!env) throw Object.assign(new Error("server_misconfigured"), { code: "server_misconfigured" });

  const token = extractBearerToken(req);
  if (!token) throw Object.assign(new Error("missing_bearer_token"), { code: "missing_bearer_token" });

  const sb = createClient(env.supabaseUrl, env.serviceRoleKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData?.user) throw Object.assign(new Error("invalid_jwt"), { code: "invalid_jwt" });

  return { sb, userId: userData.user.id };
}
