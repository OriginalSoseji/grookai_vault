/**
 * RETIRED PRICING ENTRYPOINT
 *
 * The legacy database-write pricing pipeline is intentionally unreachable.
 * Keep only a database-free health response so old monitors fail safely.
 */

type Json = Record<string, unknown>;

function jsonResponse(body: Json, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "x-grookai-pricing-pipeline": "retired",
    },
  });
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, reason: "method-not-allowed" }, 405);
  }

  const body = await req.json().catch(() => ({})) as Json;
  if (body.mode === "health") {
    return jsonResponse({
      ok: true,
      mode: "health",
      source: "edge",
      pipeline: "retired",
      timestamp: new Date().toISOString(),
    });
  }

  return jsonResponse({
    ok: false,
    reason: "legacy-pricing-pipeline-disabled",
    replacement: "ebay-source-backed-pricing",
  }, 410);
};
