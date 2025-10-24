import { serve } from "https://deno.land/std/http/server.ts";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
  };
}

async function parseBody(req: Request): Promise<Record<string, unknown>> {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) {
    try { return await req.json(); } catch {}
  }
  if (ct.includes("application/x-www-form-urlencoded")) {
    const txt = await req.text();
    const params = new URLSearchParams(txt);
    const obj: Record<string, string> = {};
    for (const [k, v] of params.entries()) obj[k] = v;
    return obj;
  }
  try { return await req.json(); } catch { return {}; }
}

function pick<T = string>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = obj[k] ?? obj[k.toLowerCase()] ?? obj[k.replace(/[A-Z]/g, (c) => c.toLowerCase())];
    if (typeof v === "string" && v.length) return v as unknown as T;
  }
  return undefined;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });
  if (req.method === "HEAD")    return new Response(null, { status: 200, headers: cors() });

  let payload: Record<string, unknown> = {};
  try {
    if (req.method === "GET") {
      const obj: Record<string, string> = {};
      url.searchParams.forEach((v, k) => { obj[k] = v; });
      payload = obj;
    } else if (req.method === "POST") {
      payload = await parseBody(req);
    } else {
      return new Response("Method Not Allowed", { status: 405, headers: cors() });
    }
  } catch {
    return new Response("Bad Request: invalid body", { status: 400, headers: cors() });
  }

  console.log("[eBay Notify] Raw:", JSON.stringify(payload));

  const challenge = pick<string>(payload, "challenge_code", "challengeCode", "challengecode");
  if (challenge) {
    const endpoint = Deno.env.get("EBAY_ENDPOINT") ?? `https://${url.host}${url.pathname}`;
    const verifyToken = Deno.env.get("EBAY_VERIFY_TOKEN") ?? pick<string>(payload, "verificationToken") ?? "grookaivault-verification-token-2025-se";
    const toHash = String(challenge) + String(verifyToken) + endpoint;
    const responseHash = await sha256Hex(toHash);

    if (url.searchParams.get('debug') === '1') {
      const dbg = {
        endpoint,
        challenge,
        tokenLen: verifyToken?.length ?? 0,
        responseHash,
      };
      return new Response(JSON.stringify(dbg), { status: 200, headers: { ...cors(), "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ challengeResponse: responseHash }), {
      status: 200,
      headers: { ...cors(), "Content-Type": "application/json" },
    });
  }

  const type   = pick<string>(payload, "eventType", "type", "action") ?? "UNKNOWN";
  const userId = pick<string>(payload, "userId", "accountId", "user_id", "account_id");
  console.log("[eBay Notify] Normalized:", { type, userId: userId ?? null });

  return new Response("Notification received", { status: 200, headers: cors() });
});


