import type { SupabaseClient } from "@supabase/supabase-js";

type NamedRow = { id: string; gv_id?: string | null; name?: string | null };
// Kept only by the request that performed the interpretation probe.
export type NamedCardFirstPage = { query: string; gameScope: string; rows: NamedRow[] };
const retainedPages = new WeakSet<NamedCardFirstPage>();
export function retainNamedCardFirstPage(page: NamedCardFirstPage): NamedCardFirstPage {
  retainedPages.add(page);
  return page;
}
const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// A brief pause after the first keystroke must not scan the whole catalog.
export const supportsCompleteNameSearch = (value: string) =>
  normalize(value).split(" ").some((word) => Array.from(word).length >= 3);

// Use the release-aware name RPC, preserving its game/language/set scope.
// After the first full page, overlap at most four read-only page requests.
export async function fetchCompleteNamedCardRows(
  client: Pick<SupabaseClient, "rpc">,
  options: { textQuery?: string; gameScope: string; languageScope?: string; exactSetCode?: string; namedFirstPage?: NamedCardFirstPage },
): Promise<NamedRow[] | null> {
  const name = (options.textQuery ?? "")
    .replace(/\b(?:(?:hyper|ultra|secret|double|special illustration|illustration)\s+rare|uncommon|common|rare(?!\s+candy))\b/gi, " ")
    .replace(/(?<![\p{L}\p{N}])#?\d+(?:\/\d+)?(?![\p{L}\p{N}])/gu, " ")
    .replace(/\s+/g, " ").trim();
  if (!name || !supportsCompleteNameSearch(name)) return null;
  const prefix = options.gameScope === "pokemon" ? "GV-PK-" : options.gameScope === "mtg" ? "GV-MTG-" : "GV-OP-";
  const fragments = normalize(name).split(" ").filter(Boolean);
  const matchesName = (row: NamedRow) => {
    const words = normalize(row.name ?? "").split(" ");
    return fragments.every((fragment) => words.some((word) => word.includes(fragment)));
  };
  const readPage = async (offset: number) => {
    const first = options.namedFirstPage;
    // A serialized server-action argument cannot supply a trusted RPC page.
    if (offset === 0 && first && retainedPages.has(first) && first.query === name && first.gameScope === options.gameScope &&
        (options.languageScope ?? "all") === "all" && !options.exactSetCode) return first.rows;
    const { data, error } = await client.rpc("search_game_card_prints_v4", {
      game_code_in: options.gameScope, q: name,
      set_code_in: options.exactSetCode ?? null, number_in: null,
      illustrator_in: null, language_scope_in: options.languageScope ?? "all",
      limit_in: 64, offset_in: offset,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as NamedRow[];
  };
  const rows: NamedRow[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < 10000;) {
    const offsets = Array.from({ length: offset === 0 ? 1 : 4 }, (_, i) => offset + i * 64)
      .filter((value) => value < 10000);
    // Attach both handlers immediately: speculative pages after the first short
    // page cannot cause an unhandled rejection or delay a complete result.
    const pending = offsets.map((value) => readPage(value).then(
      (page) => ({ page, error: null }),
      (error: unknown) => ({ page: null, error }),
    ));
    // Consume in offset order even when the network completes out of order.
    for (let i = 0; i < pending.length; i++) {
      const result = await pending[i];
      if (result.page === null) throw result.error;
      const page = result.page;
      if (offsets[i] === 0 && (!page[0] || !matchesName(page[0]))) return null;
      for (const row of page) {
        if (seen.has(row.id)) throw new Error("Named-card search could not advance to a complete result set");
        seen.add(row.id);
        // Pocket exclusions must not shorten the raw RPC paging boundary.
        if (row.gv_id?.startsWith(prefix) && matchesName(row)) rows.push(row);
      }
      if (page.length < 64) return rows;
    }
    offset += offsets.length * 64;
  }
  // The RPC caps offsets at 10,000. Never publish a truncated success.
  throw new Error("Named-card search is too broad to verify completely. Narrow your search.");
}
