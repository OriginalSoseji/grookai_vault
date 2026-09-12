import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type RecentOwnedCard = {
  id: string;
  gv_id: string;
  name: string | null;
  set_code: string | null;
  set_name: string | null;
  number: string | null;
  created_at: string | null;
  image_url: string | null;
  image_best: string | null;
  image_alt_url: string | null;
};

type Instance = { id: string; card_print_id: string | null; created_at: string | null };
type Metadata = {
  id: string; gv_id: string | null; name: string | null;
  set_code: string | null; number: string | null;
  image_url: string | null; image_alt_url: string | null;
  sets: { name: string | null } | { name: string | null }[] | null;
};

export async function getRecentOwnedCards(
  supabase: SupabaseClient,
  userId: string,
  requestedLimit = 10,
): Promise<{ data: RecentOwnedCard[] | null; error: { message: string } | null }> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
    return { data: null, error: { message: "A verified owner is required for recent activity." } };
  }
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(50, Math.floor(requestedLimit))) : 10;
  try {
    // Bound active ownership before catalog enrichment; never scan the legacy global activity view.
    const instances = await supabase.from("vault_item_instances")
      .select("id,card_print_id,created_at")
      .eq("user_id", userId)
      .is("archived_at", null)
      .not("card_print_id", "is", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);
    if (instances.error) return { data: null, error: { message: instances.error.message } };
    const rows = (instances.data ?? []) as Instance[];
    const ids = [...new Set(rows.map(row => row.card_print_id).filter((id): id is string => Boolean(id)))];
    if (ids.length === 0) return { data: [], error: null };
    const cards = await supabase.from("card_prints")
      .select("id,gv_id,name,set_code,number,image_url,image_alt_url,sets(name)")
      .in("id", ids);
    if (cards.error) return { data: null, error: { message: cards.error.message } };
    const byId = new Map(((cards.data ?? []) as Metadata[]).map(row => [row.id, row]));
    const data = rows.flatMap(instance => {
      const card = instance.card_print_id ? byId.get(instance.card_print_id) : null;
      if (!card?.gv_id) return [];
      const set = Array.isArray(card.sets) ? card.sets[0] : card.sets;
      return [{ id: instance.id, gv_id: card.gv_id, name: card.name,
        set_code: card.set_code, set_name: set?.name ?? null, number: card.number,
        created_at: instance.created_at, image_url: card.image_url,
        image_best: null, image_alt_url: card.image_alt_url }];
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : "Recent activity is unavailable." } };
  }
}
