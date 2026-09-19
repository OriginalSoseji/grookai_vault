import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getSupabaseServerConfig } from "@/lib/supabase/config";
import {
  resolveCardImageFieldsV1,
  type CardImageLike,
} from "@/lib/canon/resolveCardImageFieldsV1";
import { resolveDisplayIdentity } from "@/lib/cards/resolveDisplayIdentity";
import {
  storeReadParams,
  type StoreFilters,
  type Storefront,
  type StoreSurface,
} from "./storefrontTypes";

export const STORE_NO_STORE = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow",
};

// Anonymous web reads never inherit an owner's session or preview authority.
export function createStorePublicClient() {
  const { url, publishableKey } = getSupabaseServerConfig();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

export async function readStorefront(
  slug: string,
  surface: StoreSurface,
  filters: StoreFilters = {},
  suppliedClient?: SupabaseClient,
): Promise<Storefront | null> {
  const client =
    suppliedClient ??
    (surface === "web"
      ? createStorePublicClient()
      : await createServerComponentClient());
  const { data, error } = await client.rpc(
    "vendor_store_read_v2",
    storeReadParams(slug, surface, filters),
  );
  if (error) throw new Error("Store could not be loaded");
  if (!data) return null;
  const result = data as Storefront;
  result.items = await Promise.all(
    result.items.map(async (item) => {
      if (item.entry_type === "custom_product") return item;
      const raw = item as typeof item &
        CardImageLike & {
          variant_key: string | null;
          printed_identity_modifier: string | null;
          set_identity_model: string | null;
        };
      const image = await resolveCardImageFieldsV1(raw);
      const identity = resolveDisplayIdentity({
        name: raw.name,
        set_code: raw.set_code,
        number: raw.number,
        variant_key: raw.variant_key,
        printed_identity_modifier: raw.printed_identity_modifier,
        set_identity_model: raw.set_identity_model,
      });
      // Explicit output allowlist: never forward raw row JSON or ownership metadata.
      return {
        entry_type: "catalog_copy" as const,
        id: item.id,
        gv_vi_id: item.gv_vi_id,
        card_print_id: item.card_print_id,
        card_printing_id: item.card_printing_id,
        gv_id: item.gv_id,
        printing_gv_id: item.printing_gv_id,
        name: item.name,
        display_name: identity.display_name,
        set_code: item.set_code,
        number: item.number,
        finish_label: item.finish_label,
        condition_label: item.condition_label,
        is_graded: item.is_graded,
        grade_company: item.grade_company,
        grade_value: item.grade_value,
        grade_label: item.grade_label,
        asking_price_amount: item.asking_price_amount,
        asking_price_currency: item.asking_price_currency,
        display_image_url: image.display_image_url,
        display_image_kind: image.display_image_kind,
        ...(surface === "manage"
          ? {
              selected: item.selected,
              ineligible_reason: item.ineligible_reason,
            }
          : {}),
      };
    }),
  );
  return result;
}
