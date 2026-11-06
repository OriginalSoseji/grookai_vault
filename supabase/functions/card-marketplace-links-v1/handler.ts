import { corsHeaders, corsJson } from "../_shared/cors.ts";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const finishes: Record<string, string> = {
  normal: "Normal",
  holo: "Holofoil",
  reverse: "Reverse Holofoil",
};
export const marketplaceConditions = [
  { code: "NM", label: "Near Mint" },
  { code: "LP", label: "Lightly Played" },
  { code: "MP", label: "Moderately Played" },
  { code: "HP", label: "Heavily Played" },
  { code: "DMG", label: "Damaged" },
] as const;

// This is a navigation projection of already-qualified publication truth.
// It does not qualify mappings, infer finishes, or calculate prices.
export async function resolveMarketplaceLinks(
  client: any,
  cardPrintId: string,
  cardPrintingId: string,
) {
  const { data: rows, error } = await client.from("v_market_price_current_v1")
    .select("card_print_id,card_printing_id,finish_key,provenance_id")
    .eq("card_print_id", cardPrintId).eq("card_printing_id", cardPrintingId)
    .limit(2);
  if (error) throw new Error("marketplace_read_failed");
  const current = rows?.length === 1 ? rows[0] : null;
  if (!current || !finishes[current.finish_key]) return null;
  const { data: snapshots, error: snapshotError } = await client.from(
    "market_price_publication_snapshots",
  )
    .select(
      "card_print_id,card_printing_id,source_product_id,source_subtype_name,source_name",
    )
    .eq("provenance_id", current.provenance_id)
    .eq("card_print_id", cardPrintId).eq("card_printing_id", cardPrintingId)
    .limit(2);
  if (snapshotError) throw new Error("marketplace_read_failed");
  const snapshot = snapshots?.length === 1 ? snapshots[0] : null;
  const productId = snapshot?.source_product_id;
  if (
    snapshot?.source_name !== "tcgplayer" || !Number.isSafeInteger(productId) ||
    productId <= 0
  ) return null;
  const printing = finishes[current.finish_key];
  if (snapshot.source_subtype_name !== printing) return null;
  return {
    card_print_id: cardPrintId,
    card_printing_id: cardPrintingId,
    product_id: productId,
    finish: printing,
    language: "English",
    conditions: marketplaceConditions.map((condition) => {
      const url = new URL(`https://www.tcgplayer.com/product/${productId}`);
      url.searchParams.set("Condition", condition.label);
      url.searchParams.set("Printing", printing);
      url.searchParams.set("Language", "English");
      return { ...condition, url: url.toString() };
    }),
  };
}

export function createMarketplaceLinksHandler(createClient: () => any) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return corsJson(405, { error: "method_not_allowed" });
    }
    if (Number(req.headers.get("content-length") ?? 0) > 1024) {
      return corsJson(413, { error: "request_too_large" });
    }
    let body;
    try {
      const reader = req.body?.getReader();
      if (!reader) return corsJson(400, { error: "invalid_json" });
      const parts: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 1024) {
          await reader.cancel();
          return corsJson(413, { error: "request_too_large" });
        }
        parts.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const part of parts) {
        bytes.set(part, offset);
        offset += part.byteLength;
      }
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return corsJson(400, { error: "invalid_json" });
    }
    if (
      !uuid.test(body?.card_print_id ?? "") ||
      !uuid.test(body?.card_printing_id ?? "")
    ) {
      return corsJson(400, { error: "exact_printing_required" });
    }
    try {
      const link = await resolveMarketplaceLinks(
        createClient(),
        body.card_print_id,
        body.card_printing_id,
      );
      return corsJson(200, {
        link,
        unavailable_reason: link
          ? null
          : "No qualified exact TCGplayer link for this printing.",
      });
    } catch {
      return corsJson(503, {
        error: "Marketplace links could not be loaded. Try again.",
      });
    }
  };
}
