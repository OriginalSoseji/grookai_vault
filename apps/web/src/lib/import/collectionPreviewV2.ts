import type { SupabaseClient } from "@supabase/supabase-js";
import { field, normalize, number, parseCsv, setName, text, type Normalized, type SourceRow } from "../../../../../supabase/functions/vault-import-collection-v2/source.ts";
import { collectrSetTargets } from "../../../../../supabase/functions/vault-import-collection-v2/set_scope.ts";
import { matchesCollectrPokemonName } from "../../../../../supabase/functions/vault-import-collection-v2/pokemon_name.ts";
import { matchesCollectrMtgIdentity } from "../../../../../supabase/functions/vault-import-collection-v2/mtg_identity.ts";
import { collectrPokemonNamedFinish } from "../../../../../supabase/functions/vault-import-collection-v2/pokemon_named_finish.ts";

export type CollectionSelection = { sourceIndices: number[]; cardId: string; gvId: string; cardPrintingId: string | null };
export type CollectionReviewCandidate = {
  cardId: string; gvId: string; name: string; number: string; setName: string; setCode: string;
  variantKey: string | null; printedIdentityModifier: string | null;
  finish: string | null; selection: CollectionSelection | null; unavailableReason: string | null;
};
export type CollectionPreviewRow = {
  sourceIndices: number[]; source: SourceRow; sourceRecords: SourceRow[]; quantity: number | null;
  reason: string | null; selection: CollectionSelection | null;
  matchedName: string | null; finish: string | null;
  review?: { reason: string; candidates: CollectionReviewCandidate[]; selectedCardId: string | null };
};
export type CollectionPreviewV2 = { ownerId: string; rows: CollectionPreviewRow[]; sourceRows: number; readyRows: number; readyCopies: number; reviewRows: number };
type SetRow = { id: string; name: string; code: string; game: string };
type CardRow = { id: string; gv_id: string; name: string; number: string; set_id: string; set_code: string; variant_key: string; printed_identity_modifier: string | null; identity_domain: string; language: string };
type Identity = { id: string; card_print_id: string } & Record<string, unknown>;
type Printing = { id: string; card_print_id: string; finish_key: string; finish_is_active: boolean };
type Result = PromiseLike<{ data: unknown; error: unknown }>;

export const importReviewMessage = (code: string) => ({
  import_target_requires_review: "This row needs review: check its game, number, grade or watchlist status.",
  import_finish_requires_review: "This finish needs review; it will not be replaced with another finish.",
  import_edition_requires_review: "The edition must be verified before saving this card.",
  import_column_requires_review: "This row contains details that cannot yet be imported.",
  invalid_import_quantity: "The quantity must be a positive whole number.",
  invalid_import_condition: "The card condition needs review.",
  invalid_import_cost: "The acquisition cost needs review.",
  invalid_import_date: "The date needs review.",
  invalid_import_date_precision: "The date has unsupported precision.",
  invalid_import_notes: "The notes exceed the supported length.",
}[code] ?? "This row needs review before it can be saved.");

// A short page is not completion: PostgREST may impose a smaller row cap.
export async function readImportPages<T>(fetchPage: (after: string | null) => Result, key: (row: T) => string): Promise<T[]> {
  const result: T[] = [];
  let after: string | null = null;
  for (;;) {
    const { data, error } = await fetchPage(after);
    if (error || !Array.isArray(data)) throw new Error("The catalog could not be fully read. Retry the preview.");
    if (!data.length) return result;
    for (const row of data as T[]) {
      const id = key(row);
      if (typeof id !== "string" || !id || (after !== null && id <= after)) throw new Error("The catalog returned an incomplete page. Retry the preview.");
      after = id;
      result.push(row);
    }
  }
}

export async function buildCollectionPreviewV2(client: SupabaseClient, ownerId: string, csvText: string): Promise<CollectionPreviewV2> {
  if (new TextEncoder().encode(csvText).length > 2097152) throw new Error("This file exceeds the 2 MiB import limit.");
  const source = parseCsv(csvText);
  const grouped = new Map<string, { row: CollectionPreviewRow; normalized: Normalized | null }>();
  source.forEach((fields, index) => {
    // Match the server's metadata grouping exactly; only quantity can differ.
    const signature = JSON.stringify(Object.fromEntries(Object.entries(fields).filter(([key]) => !["quantity", "qty"].includes(text(key).toLowerCase())).sort(([a], [b]) => a.localeCompare(b))));
    let normalized: Normalized | null = null, reason: string | null = null;
    try { normalized = normalize(fields); } catch (error) { reason = importReviewMessage(error instanceof Error ? error.message : ""); }
    // Invalid rows remain individually visible and can never merge into ready rows.
    const key = normalized ? signature : `invalid:${index}`;
    const prior = grouped.get(key);
    if (prior && normalized) {
      prior.row.sourceIndices.push(index);
      prior.row.sourceRecords.push(fields);
      prior.row.quantity = (prior.row.quantity ?? 0) + normalized.quantity;
    } else grouped.set(key, { normalized, row: { sourceIndices: [index], source: fields, sourceRecords: [fields], quantity: normalized?.quantity ?? null, reason, selection: null, matchedName: null, finish: null } });
  });
  const groups = [...grouped.values()];
  const valid = groups.filter(g => g.normalized !== null);
  const sets = valid.length ? await readImportPages<SetRow>(after => {
    let query = client.from("sets").select("id,name,code,game").order("id").limit(500);
    if (after) query = query.gt("id", after);
    return query;
  }, row => row.id) : [];
  const setsFor = (base: Normalized) => sets.filter(set => (!base.game || set.game === base.game) && collectrSetTargets(base.set, base.game, base.number).includes(setName(set.name ?? "", base.game)));
  const wanted = [...new Set(valid.flatMap(group => setsFor(group.normalized!).map(set => set.id)))].sort();
  const cards: CardRow[] = [];
  const numbers = new Set(valid.map(group => group.normalized!.number));
  for (let start = 0; start < wanted.length; start += 100) {
    const chunk = wanted.slice(start, start + 100);
    const page = await readImportPages<CardRow>(after => {
      let query = client.from("card_prints").select("id,gv_id,name,number,set_id,set_code,variant_key,printed_identity_modifier,identity_domain").in("set_id", chunk).order("id").limit(500);
      if (after) query = query.gt("id", after);
      return query;
    }, row => row.id);
    if (page.some(card => !chunk.includes(card.set_id))) throw new Error("The catalog returned an unrelated card.");
    cards.push(...page.filter(card => numbers.has(number(card.number ?? ""))));
  }
  const identities = new Map<string, Identity[]>();
  const identityIds = cards.filter(card => card.identity_domain === "mtg_eng_paper_print").map(card => card.id).sort();
  for (let start = 0; start < identityIds.length; start += 100) {
    const chunk = identityIds.slice(start, start + 100);
    const page = await readImportPages<Identity>(after => {
      let query = client.from("card_print_identity").select("id,card_print_id,identity_domain,identity_key_version,is_active,set_code_identity,printed_number,identity_payload").in("card_print_id", chunk).eq("is_active", true).order("id").limit(500);
      if (after) query = query.gt("id", after);
      return query;
    }, row => row.id);
    for (const identity of page) {
      if (!chunk.includes(identity.card_print_id)) throw new Error("The catalog returned unrelated identity evidence.");
      identities.set(identity.card_print_id, [...(identities.get(identity.card_print_id) ?? []), identity]);
    }
  }
  const matches = new Map<CollectionPreviewRow, CardRow[]>();
  for (const group of valid) {
    const base = group.normalized!, setIds = new Set(setsFor(base).map(set => set.id));
    const namedFinish = base.game === "pokemon" ? collectrPokemonNamedFinish(base.name) : null;
    matches.set(group.row, cards.filter(card => setIds.has(card.set_id) && number(card.number ?? "") === base.number && !!card.gv_id && (
      namedFinish ? matchesCollectrPokemonName({ sourceName: namedFinish.name, sourceNumber: base.number, game: base.game, card }) : (
      text(card.name ?? "").toLowerCase() === base.name ||
      matchesCollectrPokemonName({ sourceName: base.name, sourceNumber: base.number, game: base.game, card }) ||
      matchesCollectrMtgIdentity({ sourceName: base.name, sourceNumber: base.number, game: base.game, card, identities: identities.get(card.id) ?? [] })
    ))));
  }
  const printingIds = [...new Set([...matches.values()].flat().map(card => card.id))].sort();
  const printings = new Map<string, Printing[]>();
  for (let start = 0; start < printingIds.length; start += 100) {
    const chunk = printingIds.slice(start, start + 100), seen = new Set<string>();
    let offset = 0;
    for (;;) {
      const { data, error } = await client.rpc("get_public_card_printing_options_v1", { p_card_print_ids: chunk, p_limit: 1000, p_offset: offset });
      if (error || !Array.isArray(data)) throw new Error("Printing information could not be fully read. Retry the preview.");
      if (!data.length) break;
      for (const option of data as Printing[]) {
        if (!option.id || seen.has(option.id) || !chunk.includes(option.card_print_id)) throw new Error("Printing information is incomplete. Retry the preview.");
        seen.add(option.id);
        if (option.finish_is_active === true) printings.set(option.card_print_id, [...(printings.get(option.card_print_id) ?? []), option]);
      }
      offset += data.length;
    }
  }
  for (const { row, normalized: base } of valid) {
    let candidates = matches.get(row) ?? [];
    if (candidates.length > 1 && base!.finishKey !== null) {
      const compatible = candidates.filter(card => !(printings.get(card.id)?.length) || printings.get(card.id)!.some(p => p.finish_key === base!.finishKey));
      if (compatible.length) candidates = compatible;
    }
    if (candidates.length !== 1) {
      row.reason = candidates.length ? "Multiple catalog identities match. Keep this row for review." : "No exact match for this game, set, name and number.";
      if (candidates.length > 1) row.review = {
        reason: row.reason, selectedCardId: null,
        candidates: candidates.map(card => {
          const set = sets.find(set => set.id === card.set_id)!;
          // Offer only the exact selections the existing server validator can
          // accept. Missing or duplicate finish evidence is never user-overridden.
          const options = (printings.get(card.id) ?? []).filter(p => base!.finishKey === null || p.finish_key === base!.finishKey);
          const option = options.length === 1 ? options[0] : null;
          return {
            cardId: card.id, gvId: card.gv_id, name: card.name, number: card.number,
            setName: set.name, setCode: set.code || card.set_code || "",
            variantKey: card.variant_key || null, printedIdentityModifier: card.printed_identity_modifier || null,
            finish: option?.finish_key ?? null,
            selection: option ? { sourceIndices: [...row.sourceIndices], cardId: card.id, gvId: card.gv_id, cardPrintingId: option.id } : null,
            unavailableReason: option ? null : options.length ? "More than one printing matches; this option needs further review." : "No verified printing matches the requested finish.",
          };
        }),
      };
      continue;
    }
    const card = candidates[0];
    row.matchedName = card.name;
    const options = (printings.get(card.id) ?? []).filter(p => base!.finishKey === null || p.finish_key === base!.finishKey);
    if (options.length !== 1) {
      row.reason = options.length ? "More than one printing matches. Specify its finish or keep it for review." : "No verified catalog printing matches this row.";
      continue;
    }
    row.finish = options[0].finish_key;
    row.selection = { sourceIndices: row.sourceIndices, cardId: card.id, gvId: card.gv_id, cardPrintingId: options[0].id };
  }
  const rows = groups.map(group => group.row), ready = rows.filter(row => row.selection !== null);
  const readyRows = ready.reduce((sum, row) => sum + row.sourceIndices.length, 0);
  const readyCopies = ready.reduce((sum, row) => sum + (row.quantity ?? 0), 0);
  if (readyCopies > 50000) throw new Error("This import exceeds the 50,000-copy limit.");
  return { ownerId, rows, sourceRows: source.length, readyRows, readyCopies, reviewRows: source.length - readyRows };
}

export function sourceLabel(row: SourceRow, ...columns: string[]) { return field(row, ...columns); }
