import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveCardImageFieldsV1,
  type CardDisplayImageKind,
  type CardImageLike,
  type ResolvedCardImageFieldsV1,
} from "@/lib/canon/resolveCardImageFieldsV1";
export { orderCatalogImageSourcesV1 } from "@/lib/canon/catalogImageSourceOrderV1";

const CATALOG_IMAGE_LOOKUP_CHUNK_SIZE = 500;
const CATALOG_IMAGE_SELECT =
  "id,gv_id,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note";

type CatalogImageLookupColumn = "id" | "gv_id";

type CatalogImageLookupRow = CardImageLike & {
  id: string | null;
  gv_id: string | null;
};

export type CatalogImageSourcesV1 = {
  cardPrintId: string | null;
  gvId: string | null;
  hostedImageUrl: string | null;
  providerImageUrl: string | null;
  displayImageKind: CardDisplayImageKind;
  imageStatus: string | null;
  imageNote: string | null;
};

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeText(value))
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export function getCatalogImageSourcesFromResolvedFieldsV1(
  row: Pick<CatalogImageLookupRow, "id" | "gv_id">,
  imageFields: ResolvedCardImageFieldsV1,
): CatalogImageSourcesV1 {
  const hostedImageUrl =
    imageFields.exact_image_source === "identity" && imageFields.image_path
      ? imageFields.display_image_url
      : null;
  const providerImageUrl = hostedImageUrl
    ? imageFields.external_image_fallback_url
    : imageFields.display_image_url;

  return {
    cardPrintId: normalizeText(row.id),
    gvId: normalizeText(row.gv_id),
    hostedImageUrl,
    providerImageUrl,
    displayImageKind: imageFields.display_image_kind,
    imageStatus: imageFields.image_status,
    imageNote: imageFields.image_note,
  };
}

async function getCatalogImageSourcesByColumnV1(
  client: Pick<SupabaseClient, "from">,
  column: CatalogImageLookupColumn,
  values: string[],
) {
  const normalizedValues = uniqueValues(values);
  const sourcesByValue = new Map<string, CatalogImageSourcesV1>();

  for (
    let index = 0;
    index < normalizedValues.length;
    index += CATALOG_IMAGE_LOOKUP_CHUNK_SIZE
  ) {
    const batch = normalizedValues.slice(
      index,
      index + CATALOG_IMAGE_LOOKUP_CHUNK_SIZE,
    );
    const { data, error } = await client
      .from("card_prints")
      .select(CATALOG_IMAGE_SELECT)
      .in(column, batch);

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[catalog-images] hosted image lookup failed closed", {
          column,
          message: error.message,
        });
      }
      continue;
    }

    const resolvedRows = await Promise.all(
      ((data ?? []) as CatalogImageLookupRow[]).map(async (row) =>
        getCatalogImageSourcesFromResolvedFieldsV1(
          row,
          await resolveCardImageFieldsV1(row),
        ),
      ),
    );

    for (const resolved of resolvedRows) {
      const key = column === "id" ? resolved.cardPrintId : resolved.gvId;
      if (key) {
        sourcesByValue.set(key, resolved);
      }
    }
  }

  return sourcesByValue;
}

export function getCatalogImageSourcesByCardPrintIdsV1(
  client: Pick<SupabaseClient, "from">,
  cardPrintIds: string[],
) {
  return getCatalogImageSourcesByColumnV1(client, "id", cardPrintIds);
}

export function getCatalogImageSourcesByGvIdsV1(
  client: Pick<SupabaseClient, "from">,
  gvIds: string[],
) {
  return getCatalogImageSourcesByColumnV1(client, "gv_id", gvIds);
}
