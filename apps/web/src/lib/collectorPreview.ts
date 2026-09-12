// This flag is frozen at build time. Never enable it on the production project.
export const collectorPreview = process.env.NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY === "true";

export const PREVIEW_READ_RPCS = new Set([
  "get_public_catalog_sets_v2", "get_public_card_printing_options_v1",
  "card_print_public_traits_v1", "get_card_print_image_faces_v1",
  "card_journey_public_counts_v1", "search_card_prints_v1",
  "search_print_identity_v1", "search_game_card_prints_v4",
]);

export function createPreviewReadFetch(url: string, key: string, transport: typeof fetch = fetch): typeof fetch {
  const origin = new URL(url).origin;
  return async (input, init) => {
    const request = new Request(input, init);
    const target = new URL(request.url);
    const rpc = target.pathname.match(/^\/rest\/v1\/rpc\/([a-z0-9_]+)$/)?.[1];
    const read = request.method === "GET" || request.method === "HEAD";
    const allowed = target.origin === origin && (rpc
      ? PREVIEW_READ_RPCS.has(rpc) && (read || request.method === "POST")
      : read && /^\/rest\/v1\/[a-z0-9_]+$/.test(target.pathname));
    if (!allowed) {
      return Response.json({ message: "Read-only design preview", code: "PREVIEW_READ_ONLY" }, { status: 403 });
    }
    const headers = new Headers(request.headers);
    headers.set("apikey", key);
    headers.set("authorization", `Bearer ${key}`);
    headers.delete("cookie");
    // Never follow a redirect or forward a supplied user session to the source.
    return transport(input, { ...init, headers, credentials: "omit", redirect: "error" });
  };
}

export function previewRequestKind(path: string, method: string) {
  const read = method === "GET" || method === "HEAD";
  if (read && (/^\/api\/canon\/cards\/GV-[A-Z0-9-]+\/image$/.test(path) || path === "/api/canon/image")) return "image";
  if (path === "/api/public-set-metadata" && method === "POST") return "read";
  if (!read) return "deny";
  if (path.startsWith("/api/")) return ["/api/search/suggestions", "/api/resolver/search", "/api/public-set-cards"].includes(path) ? "read" : "deny";
  if (/^\/(login|signup|sign-up|register|auth|account|founder|review|submit|vault|wall|binders|following|sealed|saved|binder-invites)(\/|$)/.test(path) || path.startsWith("/network/inbox")) return "account";
  return "read";
}
