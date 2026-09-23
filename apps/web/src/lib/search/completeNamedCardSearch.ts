import type { SupabaseClient } from "@supabase/supabase-js";

type NamedRow = { id: string; gv_id?: string | null; name?: string | null };
const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Once the residual text identifies an actual card name, use the existing
// release-aware name RPC. Broad ILIKE predicates on the RLS table cannot use
// the same candidate-first plan and time out even for Wurmple + reverse holo.
export async function fetchCompleteNamedCardRows(
  client: Pick<SupabaseClient, "rpc">,
  options: { textQuery?: string; gameScope: string; languageScope?: string; exactSetCode?: string },
): Promise<NamedRow[] | null> {
  const name = (options.textQuery ?? "")
    .replace(/\b(?:(?:hyper|ultra|secret|double|special illustration|illustration)\s+rare|uncommon|common|rare(?!\s+candy))\b/gi, " ")
    .replace(/(?<![\p{L}\p{N}])#?\d+(?:\/\d+)?(?![\p{L}\p{N}])/gu, " ")
    .replace(/\s+/g, " ").trim();
  if (!name) return null;
  const prefix = options.gameScope === "pokemon" ? "GV-PK-" : options.gameScope === "mtg" ? "GV-MTG-" : "GV-OP-";
  const rows: NamedRow[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < 10000; offset += 64) {
    const { data, error } = await client.rpc("search_game_card_prints_v4", {
      game_code_in: options.gameScope, q: name,
      set_code_in: options.exactSetCode ?? null, number_in: null,
      illustrator_in: null, language_scope_in: options.languageScope ?? "all",
      limit_in: 64, offset_in: offset,
    });
    if (error) throw new Error(error.message);
    const page = (data ?? []) as NamedRow[];
    // The RPC orders exact names first. Unrecognized descriptions keep the
    // existing general discovery path; do not silently discard their words.
    if (offset === 0 && normalize(page[0]?.name ?? "") !== normalize(name)) return null;
    for (const row of page) {
      if (seen.has(row.id)) throw new Error("Named-card search could not advance to a complete result set");
      seen.add(row.id);
      // The shared Pokemon game also contains Pocket records. Preserve the
      // caller's physical-card scope, without shortening the raw RPC pages.
      if (row.gv_id?.startsWith(prefix)) rows.push(row);
    }
    if (page.length < 64) return rows;
  }
  // The existing RPC caps offsets at 10,000. Never return a truncated success
  // or repeat its final window as though it were a new page.
  throw new Error("Named-card search is too broad to verify completely. Narrow your search.");
}
