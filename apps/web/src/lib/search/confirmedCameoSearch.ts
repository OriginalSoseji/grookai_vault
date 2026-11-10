import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 100;
const SUBJECT = /^[\p{L}\p{N} .’'♀♂-]{1,64}$/u;

// Resolve a subject against the species catalog, then use the existing
// confirmed-only projection. Imported associations are never search evidence.
export async function fetchConfirmedCameoGvIds(
  client: Pick<SupabaseClient, "from" | "rpc">,
  subject: string,
): Promise<string[]> {
  if (typeof subject !== "string") return [];
  const name = subject.normalize("NFC").trim().replace(/\s+/g, " ");
  if (!SUBJECT.test(name)) return [];
  const slug = name.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "").replace(/♀/g, "-f").replace(/♂/g, "-m")
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  const quote = (value: string) => `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const species = await client.from("pokemon_species").select("national_dex_number")
    .eq("active", true)
    .or(`slug.eq.${quote(slug)},canonical_name.ilike.${quote(name)},display_name.ilike.${quote(name)}`)
    .limit(3);
  if (species.error) throw new Error(species.error.message);
  const matches = species.data ?? [];
  const numbers = new Set(matches.map((row) => row.national_dex_number));
  if (matches.length >= 3 || numbers.size > 1) throw new Error("Cameo subject requires an unambiguous species name");
  if (numbers.size === 0) return [];
  const ndex = [...numbers][0];
  if (!Number.isInteger(ndex) || ndex < 1 || ndex > 99999) throw new Error("Invalid cameo species identity");
  const ids = new Set<string>();
  for (let offset = 0; offset <= 1000; offset += PAGE_SIZE) {
    const { data, error } = await client.rpc("get_public_card_cameos_v2", {
      p_pokemon_ndex: String(ndex), p_offset: offset,
    });
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Array<{ gv_id?: unknown; appearance_role?: unknown }>;
    if (!Array.isArray(page) || page.length > PAGE_SIZE) throw new Error("Invalid confirmed cameo page");
    for (const row of page) {
      if (typeof row.gv_id !== "string" || !row.gv_id.startsWith("GV-PK-") || row.gv_id.length > 100 ||
          !["scene_subject", "depicted_subject", "character_representation"].includes(String(row.appearance_role))) {
        throw new Error("Invalid confirmed cameo projection");
      }
      ids.add(row.gv_id);
    }
    if (page.length < PAGE_SIZE) return [...ids];
  }
  throw new Error("Cameo results could not be verified completely");
}
