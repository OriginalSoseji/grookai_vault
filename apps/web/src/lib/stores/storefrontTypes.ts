export const STOREFRONT_VERSION = "VENDOR_STORE_V2";
export type StoreSurface = "web" | "app" | "preview" | "manage";
export type StoreFilters = {
  query?: string;
  sectionId?: string;
  condition?: string;
  kind?: string;
  offset?: number;
};
export type StoreItem = {
  entry_type: "catalog_copy";
  id: string;
  gv_vi_id: string;
  card_print_id: string;
  card_printing_id: string | null;
  gv_id: string;
  printing_gv_id: string | null;
  name: string;
  display_name: string;
  set_code: string;
  number: string;
  finish_label: string | null;
  condition_label: string | null;
  is_graded: boolean;
  grade_company: string | null;
  grade_value: string | null;
  grade_label: string | null;
  asking_price_amount: number;
  asking_price_currency: string;
  display_image_url: string | null;
  display_image_kind: string;
  selected?: boolean;
  ineligible_reason?: string | null;
};
export type CustomStoreProduct = {
  entry_type: "custom_product";
  id: string;
  title: string;
  description: string;
  category: string;
  franchise: string;
  manufacturer: string;
  release_region: string;
  language: string;
  condition_description: string;
  packaging_description: string;
  asking_price_amount: number | null;
  asking_price_currency: string;
  available_quantity: number;
  photo_ids: string[];
};
export type StoreEntry = StoreItem | CustomStoreProduct;
export type CustomProductDetail = {
  schema_version: typeof STOREFRONT_VERSION;
  store: Storefront["store"];
  preview: boolean;
  product: CustomStoreProduct;
};
export type Storefront = {
  schema_version: typeof STOREFRONT_VERSION;
  store: {
    id: string;
    slug: string;
    display_name: string;
    description: string;
    has_logo: boolean;
    has_banner: boolean;
    collector_slug: string | null;
  };
  items: StoreEntry[];
  sections: { id: string; name: string }[];
  total: number;
  offset: number;
  limit: number;
  preview: boolean;
};
export type StoreOwner = {
  schema_version: "VENDOR_STORE_V1";
  store: null | {
    id: string;
    slug: string;
    display_name: string;
    description: string;
    logo_path: string | null;
    banner_path: string | null;
    app_published: boolean;
    web_published: boolean;
    first_published_at: string | null;
  };
  capabilities: { store_app: boolean; store_web: boolean };
  rollout: {
    app_enabled: boolean;
    web_enabled: boolean;
    custom_enabled?: boolean;
  };
  sections: {
    id: string;
    name: string;
    selected: boolean;
    position: number | null;
  }[];
};

export function storeFilters(params: URLSearchParams): StoreFilters {
  const offset = Number(params.get("offset") ?? 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > 100000)
    throw new Error("Invalid page");
  return {
    query: params.get("q") ?? "",
    sectionId: params.get("section") || undefined,
    condition: params.get("condition") || undefined,
    kind: params.get("kind") || "all",
    offset,
  };
}

export function storeReadParams(
  slug: string,
  surface: StoreSurface,
  filters: StoreFilters = {},
) {
  return {
    p_slug: slug,
    p_surface: surface,
    p_query: filters.query ?? "",
    p_section_id: filters.sectionId ?? null,
    p_condition: filters.condition ?? null,
    p_kind: filters.kind ?? "all",
    p_offset: filters.offset ?? 0,
    p_limit: 40,
  };
}
