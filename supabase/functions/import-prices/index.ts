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

function isHealthRequest(body: Json): boolean {
  return body.mode === "health" || body.health === true || body.health === 1 ||
    body.ping === true || body.ping === 1 || body.source === "bridge_health";
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, reason: "method-not-allowed" }, 405);
  }

  const body = await req.json().catch(() => ({})) as Json;
  if (isHealthRequest(body)) {
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
