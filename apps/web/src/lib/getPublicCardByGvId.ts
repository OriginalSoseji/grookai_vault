import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { resolveCardImageFieldsV1 } from "@/lib/canon/resolveCardImageFieldsV1";
import { getCompatiblePublicGvIdCandidates, pickResolvedPublicGvIdRow } from "@/lib/gvIdAlias";
import { getPublicPricingByCardIds } from "@/lib/pricing/getPublicPricingByCardIds";
import type { VariantFlags } from "@/lib/cards/variantPresentation";
import type { ActiveCardPrintIdentity, CardDetail, CardPrinting, RelatedCardPrint } from "@/types/cards";

type TraitRow = {
  hp: number | null;
  national_dex: number | null;
  types: string[] | null;
  supertype: string | null;
  card_category: string | null;
};

type PublicCardRow = {
  id: string | null;
  gv_id: string | null;
  name: string | null;
  number: string | null;
  number_plain: string | null;
  identity_domain: string | null;
  rarity: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
  representative_image_url: string | null;
  image_status: string | null;
  image_note: string | null;
  artist: string | null;
  set_code: string | null;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  variants: VariantFlags;
  external_ids?: { tcgdex?: string | null } | null;
  card_print_traits?: TraitRow | TraitRow[] | null;
  card_printings?:
    | {
        id: string | null;
        finish_key: string | null;
        finish_keys:
          | { label: string | null; sort_order: number | null }
          | { label: string | null; sort_order: number | null }[]
          | null;
      }[]
    | null;
  sets?:
    | {
        name: string | null;
        printed_total: number | null;
        printed_set_abbrev: string | null;
        release_date: string | null;
        identity_model: string | null;
      }
    | {
        name: string | null;
        printed_total: number | null;
        printed_set_abbrev: string | null;
        release_date: string | null;
        identity_model: string | null;
      }[]
    | null;
};

type RelatedCardRow = {
  id: string | null;
  gv_id: string | null;
  name: string | null;
  number: string | null;
  number_plain: string | null;
  rarity: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source: string | null;
  image_path: string | null;
  representative_image_url: string | null;
  image_status: string | null;
  image_note: string | null;
  set_code: string | null;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  variants: VariantFlags;
  external_ids?: { tcgdex?: string | null } | null;
  sets?:
    | { name: string | null; release_date: string | null; identity_model: string | null }
    | { name: string | null; release_date: string | null; identity_model: string | null }[]
    | null;
};

type StaticParamRow = {
  gv_id: string | null;
};

type SetRow = {
  name: string | null;
  printed_total: number | null;
  printed_set_abbrev: string | null;
  release_date: string | null;
};

type ActiveIdentityRow = {
  identity_domain: string | null;
  set_code_identity: string | null;
  printed_number: string | null;
  identity_key_version: string | null;
};

// LOCK: Canonical card route is card_prints-only.
// LOCK: Non-canonical entities must never resolve through /card/[gv_id].
export function assertCanonicalCardRouteRow(
  row: { gv_id: string | null } | null | undefined,
  requestedGvId: string,
): asserts row is { gv_id: string } {
  if (!row?.gv_id) {
    throw new Error(
      `SECURITY: Non-canonical entity attempted canonical route: ${requestedGvId}`,
    );
  }
}

function extractTcgdexExternalId(externalIds?: { tcgdex?: string | null } | null) {
  const value = externalIds?.tcgdex;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function getReleaseYear(releaseDate?: string | null) {
  if (!releaseDate) {
    return undefined;
  }

  const match = releaseDate.match(/^(\d{4})/);
  if (!match) {
    return undefined;
  }

  const parsedYear = Number(match[1]);
  return Number.isFinite(parsedYear) ? parsedYear : undefined;
}

function mapCardPrintings(rows?: PublicCardRow["card_printings"]): CardPrinting[] | undefined {
  const mapped = (rows ?? [])
    .map((printing) => {
      const finishRecord = Array.isArray(printing.finish_keys) ? printing.finish_keys[0] : printing.finish_keys;

      return {
        id: printing.id ?? "",
        finish_key: printing.finish_key?.trim() || undefined,
        finish_name: finishRecord?.label?.trim() || printing.finish_key?.trim() || undefined,
        finish_sort_order: typeof finishRecord?.sort_order === "number" ? finishRecord.sort_order : undefined,
      } satisfies CardPrinting;
    })
    .filter((printing) => Boolean(printing.id) && Boolean(printing.finish_name));

  if (mapped.length === 0) {
    return undefined;
  }

  mapped.sort((left, right) => {
    const leftSort = left.finish_sort_order ?? Number.MAX_SAFE_INTEGER;
    const rightSort = right.finish_sort_order ?? Number.MAX_SAFE_INTEGER;

    if (leftSort !== rightSort) {
      return leftSort - rightSort;
    }

    return (left.finish_name ?? "").localeCompare(right.finish_name ?? "");
  });

  return mapped;
}

function buildFallbackDisplayPrinting(row: Pick<PublicCardRow, "id" | "gv_id">): CardPrinting {
  const fallbackId = row.id?.trim() || row.gv_id?.trim() || "canonical";

  return {
    id: `canonical:${fallbackId}`,
    finish_name: "Base",
    display_finish: null,
    is_display_fallback: true,
  };
}

function resolveDisplayPrintings(
  row: Pick<PublicCardRow, "id" | "gv_id">,
  printings?: CardPrinting[],
): CardPrinting[] {
  if (Array.isArray(printings) && printings.length > 0) {
    return printings;
  }

  return [buildFallbackDisplayPrinting(row)];
}

function mapTraitRecord(record?: PublicCardRow["card_print_traits"]): TraitRow | undefined {
  const traitRecord = Array.isArray(record) ? record[0] : record;

  if (!traitRecord) {
    return undefined;
  }

  return {
    hp: typeof traitRecord.hp === "number" ? traitRecord.hp : null,
    national_dex: typeof traitRecord.national_dex === "number" ? traitRecord.national_dex : null,
    types: Array.isArray(traitRecord.types) ? traitRecord.types.filter((value): value is string => typeof value === "string") : null,
    supertype: traitRecord.supertype?.trim() || null,
    card_category: traitRecord.card_category?.trim() || null,
  };
}

async function mapRelatedPrints(rows: RelatedCardRow[]): Promise<RelatedCardPrint[] | undefined> {
  if (rows.length === 0) {
    return undefined;
  }

  const mapped = new Map<string, RelatedCardPrint>();

  for (const row of rows) {
    const gvId = row.gv_id?.trim();
    if (!gvId || mapped.has(gvId)) {
      continue;
    }

    const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;
    const imageFields = await resolveCardImageFieldsV1(row);

    mapped.set(gvId, {
      id: row.id ?? gvId,
      gv_id: gvId,
      name: row.name?.trim() || "Unknown",
      number: row.number?.trim() || "",
      number_plain: row.number_plain?.trim() || undefined,
      set_name: setRecord?.name?.trim() || undefined,
      set_code: row.set_code?.trim() || undefined,
      rarity: row.rarity?.trim() || undefined,
      image_url: imageFields.image_url ?? undefined,
      representative_image_url: imageFields.representative_image_url ?? undefined,
      image_status: imageFields.image_status ?? undefined,
      image_note: imageFields.image_note ?? undefined,
      image_source: imageFields.image_source ?? undefined,
      display_image_url: imageFields.display_image_url ?? undefined,
      display_image_kind: imageFields.display_image_kind,
      tcgdex_external_id: extractTcgdexExternalId(row.external_ids),
      release_date: setRecord?.release_date ?? undefined,
      release_year: getReleaseYear(setRecord?.release_date),
      variant_key: row.variant_key?.trim() || undefined,
      printed_identity_modifier: row.printed_identity_modifier?.trim() || undefined,
      set_identity_model: setRecord?.identity_model?.trim() || undefined,
      variants: row.variants ?? undefined,
    });
  }

  const result = Array.from(mapped.values());
  return result.length > 0 ? result : undefined;
}

function createServerSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_PUBLISHABLE_KEY.");
  }

  const cachedFetch: typeof fetch = (input, init) =>
    fetch(input, {
      ...init,
      next: {
        ...((init as { next?: Record<string, unknown> } | undefined)?.next ?? {}),
        revalidate: 120,
      },
    } as RequestInit & { next: { revalidate: number } });

  // LOCK: Public read helpers should be cacheable by default.
  // LOCK: Prefer bounded revalidation over request-by-request dynamic rendering.
  return createClient(url, key, {
    global: {
      fetch: cachedFetch,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

const getSetDetailsByCode = cache(async (setCode?: string | null) => {
  if (!setCode) {
    return {
      name: undefined,
      printedTotal: undefined,
      printedSetAbbrev: undefined,
      releaseDate: undefined,
      releaseYear: undefined,
    };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("sets")
    .select("name,printed_total,printed_set_abbrev,release_date")
    .eq("code", setCode)
    .maybeSingle();

  if (error || !data) {
    return {
      name: undefined,
      printedTotal: undefined,
      printedSetAbbrev: undefined,
      releaseDate: undefined,
      releaseYear: undefined,
    };
  }

  const row = data as SetRow;
  return {
    name: row.name ?? undefined,
    printedTotal: typeof row.printed_total === "number" ? row.printed_total : undefined,
    printedSetAbbrev: row.printed_set_abbrev ?? undefined,
    releaseDate: row.release_date ?? undefined,
    releaseYear: getReleaseYear(row.release_date),
  };
});

async function getActiveIdentityByCardPrintId(
  supabase: ReturnType<typeof createServerSupabase>,
  cardPrintId?: string | null,
  parentIdentityDomain?: string | null,
): Promise<ActiveCardPrintIdentity | null> {
  const normalizedCardPrintId = cardPrintId?.trim();
  if (!normalizedCardPrintId) {
    return null;
  }

  const { data, error } = await supabase
    .from("card_print_identity")
    .select("identity_domain,set_code_identity,printed_number,identity_key_version")
    .eq("card_print_id", normalizedCardPrintId)
    .eq("is_active", true)
    .limit(2);

  if (error) {
    console.error("[card-detail] active identity read failed", {
      cardPrintId: normalizedCardPrintId,
      message: error.message,
    });
    return null;
  }

  const rows = (data ?? []) as ActiveIdentityRow[];
  if (rows.length === 0) {
    return null;
  }

  if (rows.length > 1) {
    throw new Error(`MULTIPLE_ACTIVE_CARD_PRINT_IDENTITY_ROWS:${normalizedCardPrintId}:${rows.length}`);
  }

  const row = rows[0];
  const activeIdentity =
    row.identity_domain?.trim() &&
    row.printed_number?.trim() &&
    row.identity_key_version?.trim()
      ? {
          identity_domain: row.identity_domain.trim(),
          set_code_identity: row.set_code_identity?.trim() || undefined,
          printed_number: row.printed_number.trim(),
          identity_key_version: row.identity_key_version.trim(),
        }
      : null;

  if (
    process.env.NODE_ENV !== "production" &&
    activeIdentity &&
    parentIdentityDomain?.trim() &&
    activeIdentity.identity_domain !== parentIdentityDomain.trim()
  ) {
    console.warn("[card-detail] active identity domain mismatch", {
      cardPrintId: normalizedCardPrintId,
      parentIdentityDomain,
      activeIdentityDomain: activeIdentity.identity_domain,
    });
  }

  return activeIdentity;
}

async function getRelatedPrintsByName(
  supabase: ReturnType<typeof createServerSupabase>,
  name?: string | null,
  excludeId?: string | null,
) {
  const normalizedName = name?.trim();
  if (!normalizedName) {
    return undefined;
  }

  let query = supabase
    .from("card_prints")
    .select(
      `
        id,
        gv_id,
        name,
        number,
        number_plain,
        identity_domain,
        rarity,
        image_url,
        image_alt_url,
        image_source,
        image_path,
        representative_image_url,
        image_status,
        image_note,
        external_ids,
        set_code,
        variant_key,
        printed_identity_modifier,
        variants,
        sets(name,release_date,identity_model)
      `,
    )
    .eq("name", normalizedName)
    .limit(10)
    .order("set_code", { ascending: true })
    .order("number_plain", { ascending: true, nullsFirst: false });

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return undefined;
  }

  return mapRelatedPrints((data as RelatedCardRow[]).filter((row) => row.id !== excludeId));
}

export async function getPublicCardByGvId(gv_id: string): Promise<CardDetail | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("card_prints")
    .select(
      `
        id,
        gv_id,
        name,
        number,
        number_plain,
        rarity,
        image_url,
        image_alt_url,
        image_source,
        image_path,
        representative_image_url,
        image_status,
        image_note,
        artist,
        external_ids,
        set_code,
        variant_key,
        printed_identity_modifier,
        variants,
        card_print_traits(
          hp,
          national_dex,
          types,
          supertype,
          card_category
        ),
        card_printings(
          id,
          finish_key,
          finish_keys(label,sort_order)
        ),
        sets(name,printed_total,printed_set_abbrev,release_date,identity_model)
      `,
    )
    .in("gv_id", getCompatiblePublicGvIdCandidates(gv_id))
    .limit(2);

  if (error || !data) {
    return null;
  }

  const row = pickResolvedPublicGvIdRow(data as PublicCardRow[], gv_id);
  if (!row) {
    return null;
  }
  assertCanonicalCardRouteRow(row, gv_id);
  const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;
  const [fallbackSet, relatedPrints, imageFields, activeIdentity] = await Promise.all([
    getSetDetailsByCode(row.set_code),
    getRelatedPrintsByName(supabase, row.name, row.id),
    resolveCardImageFieldsV1(row),
    getActiveIdentityByCardPrintId(supabase, row.id, row.identity_domain),
  ]);
  // Pricing authority note:
  // Current active engine = v_grookai_value_v1_1
  // App-facing read surface = v_best_prices_all_gv_v1
  // Keep product reads on the compatibility surface during stabilization.
  const pricingByCardId = row.id ? await getPublicPricingByCardIds(supabase, [row.id]) : new Map();
  const priceRow = row.id ? pricingByCardId.get(row.id) : undefined;
  const traitRecord = mapTraitRecord(row.card_print_traits);
  const printings = mapCardPrintings(row.card_printings);
  const setName = setRecord?.name ?? fallbackSet.name;
  const printedTotal =
    typeof setRecord?.printed_total === "number" ? setRecord.printed_total : fallbackSet.printedTotal;
  const printedSetAbbrev = setRecord?.printed_set_abbrev ?? fallbackSet.printedSetAbbrev;
  const releaseDate = setRecord?.release_date ?? fallbackSet.releaseDate;

  return {
    id: row.id ?? "",
    gv_id: row.gv_id ?? gv_id,
    name: row.name ?? "Unknown",
    number: row.number ?? "",
    number_plain: row.number_plain ?? undefined,
    printed_set_abbrev: printedSetAbbrev ?? undefined,
    set_name: setName,
    set_code: row.set_code ?? undefined,
    active_identity: activeIdentity,
    rarity: row.rarity ?? undefined,
    image_url: imageFields.image_url ?? undefined,
    representative_image_url: imageFields.representative_image_url ?? undefined,
    image_status: imageFields.image_status ?? undefined,
    image_note: imageFields.image_note ?? undefined,
    image_source: imageFields.image_source ?? undefined,
    display_image_url: imageFields.display_image_url ?? undefined,
    display_image_kind: imageFields.display_image_kind,
    tcgdex_external_id: extractTcgdexExternalId(row.external_ids),
    artist: row.artist ?? undefined,
    printed_total: printedTotal,
    release_date: releaseDate ?? undefined,
    release_year: getReleaseYear(releaseDate),
    raw_price: priceRow?.raw_price,
    raw_price_source: priceRow?.raw_price_source,
    raw_price_ts: priceRow?.raw_price_ts,
    latest_price: priceRow?.latest_price,
    confidence: priceRow?.confidence,
    listing_count: priceRow?.listing_count,
    price_source: priceRow?.price_source,
    updated_at: priceRow?.updated_at,
    active_price_updated_at: priceRow?.active_price_updated_at,
    last_snapshot_at: priceRow?.last_snapshot_at,
    hp: traitRecord?.hp ?? undefined,
    national_dex: traitRecord?.national_dex ?? undefined,
    types: traitRecord?.types ?? undefined,
    supertype: traitRecord?.supertype ?? undefined,
    card_category: traitRecord?.card_category ?? undefined,
    variant_key: row.variant_key?.trim() || undefined,
    printed_identity_modifier: row.printed_identity_modifier?.trim() || undefined,
    set_identity_model: setRecord?.identity_model?.trim() || undefined,
    variants: row.variants ?? undefined,
    printings,
    display_printings: resolveDisplayPrintings(row, printings),
    related_prints: relatedPrints,
  };
}

export async function getStaticCardParams(limit = 100): Promise<Array<{ gv_id: string }>> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("card_prints")
    .select("gv_id")
    .not("gv_id", "is", null)
    .order("gv_id", { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as StaticParamRow[])
    .filter((row): row is { gv_id: string } => Boolean(row.gv_id))
    .map((row) => ({ gv_id: row.gv_id }));
}
