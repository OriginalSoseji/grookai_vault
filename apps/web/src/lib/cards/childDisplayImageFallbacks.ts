import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveCardImageFieldsV1,
  type CardDisplayImageKind,
  type ResolvedCardImageFieldsV1,
} from "@/lib/canon/resolveCardImageFieldsV1";

export type ChildDisplayImageFallbackLookupRow = {
  id?: string | null;
  selected_printing_gv_id?: string | null;
  search_card_printing_id?: string | null;
  printing_gv_id?: string | null;
  finish_key?: string | null;
};

type CardPrintingImageLookupRow = {
  id: string;
  card_print_id: string | null;
  printing_gv_id: string | null;
  finish_key: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_source?: string | null;
  image_path?: string | null;
  image_status?: string | null;
  image_note?: string | null;
};

export type ChildDisplayImageFallback = {
  display_image_url: string;
  display_image_kind: CardDisplayImageKind;
  image_status: string;
  image_note: string;
};

const CHILD_FALLBACK_STATUS = "representative_missing_variant_visual";
const CHILD_FALLBACK_NOTE =
  "Correct card identity. Displaying the best reviewed child printing image until the parent identity image is available.";

export function applyChildDisplayImageFallback(
  imageFields: ResolvedCardImageFieldsV1,
  fallback: ChildDisplayImageFallback | null | undefined,
): ResolvedCardImageFieldsV1 {
  if (imageFields.display_image_url || !fallback) {
    return imageFields;
  }

  return {
    ...imageFields,
    display_image_url: fallback.display_image_url,
    display_image_kind: fallback.display_image_kind,
    image_status: fallback.image_status,
    image_note: fallback.image_note,
  };
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function hasChildImageEvidence(row: CardPrintingImageLookupRow) {
  return Boolean(
    row.image_path?.trim() ||
      row.image_url?.trim() ||
      row.image_alt_url?.trim(),
  );
}

function imageKindScore(kind: string | null | undefined) {
  if (kind === "exact") return 40;
  if (kind === "representative" || kind === "missing_variant_visual") return 25;
  return 10;
}

export async function getChildDisplayImageFallbacks(
  supabase: Pick<SupabaseClient, "from">,
  lookupRows: ChildDisplayImageFallbackLookupRow[],
) {
  const cardPrintIds = uniqueValues(lookupRows.map((row) => row.id));
  const fallbackByCardPrintId = new Map<string, ChildDisplayImageFallback>();
  if (cardPrintIds.length === 0) {
    return fallbackByCardPrintId;
  }

  const { data, error } = await supabase
    .from("card_printings")
    .select(
      "id,card_print_id,printing_gv_id,finish_key,image_source,image_path,image_url,image_alt_url,image_status,image_note",
    )
    .in("card_print_id", cardPrintIds);

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[image-fallback] child image lookup failed closed", {
        message: error.message,
      });
    }
    return fallbackByCardPrintId;
  }

  const childrenByParentId = new Map<string, CardPrintingImageLookupRow[]>();
  for (const child of ((data ?? []) as CardPrintingImageLookupRow[]).filter(
    hasChildImageEvidence,
  )) {
    if (!child.card_print_id) continue;
    const existing = childrenByParentId.get(child.card_print_id) ?? [];
    existing.push(child);
    childrenByParentId.set(child.card_print_id, existing);
  }

  await Promise.all(
    lookupRows.map(async (row) => {
      const parentId = row.id?.trim();
      if (!parentId) return;

      const children = childrenByParentId.get(parentId) ?? [];
      if (children.length === 0) return;

      const selectedPrintingGvId =
        row.selected_printing_gv_id?.trim() ||
        row.search_card_printing_id?.trim() ||
        row.printing_gv_id?.trim() ||
        null;
      const targetFinishKey = row.finish_key?.trim().toLowerCase() || null;
      const resolved = await Promise.all(
        children.map(async (child) => ({
          child,
          imageFields: await resolveCardImageFieldsV1(child),
        })),
      );

      const best = resolved
        .filter((entry) => Boolean(entry.imageFields.display_image_url))
        .sort((left, right) => {
          const leftSelected =
            selectedPrintingGvId && left.child.printing_gv_id === selectedPrintingGvId ? 100 : 0;
          const rightSelected =
            selectedPrintingGvId && right.child.printing_gv_id === selectedPrintingGvId ? 100 : 0;
          if (leftSelected !== rightSelected) return rightSelected - leftSelected;

          const leftFinish =
            targetFinishKey && left.child.finish_key?.toLowerCase() === targetFinishKey ? 20 : 0;
          const rightFinish =
            targetFinishKey && right.child.finish_key?.toLowerCase() === targetFinishKey ? 20 : 0;
          if (leftFinish !== rightFinish) return rightFinish - leftFinish;

          const leftKind = imageKindScore(left.imageFields.display_image_kind);
          const rightKind = imageKindScore(right.imageFields.display_image_kind);
          if (leftKind !== rightKind) return rightKind - leftKind;

          return String(left.child.printing_gv_id ?? "").localeCompare(
            String(right.child.printing_gv_id ?? ""),
          );
        })[0];

      if (!best?.imageFields.display_image_url) return;

      fallbackByCardPrintId.set(parentId, {
        display_image_url: best.imageFields.display_image_url,
        display_image_kind: "missing_variant_visual",
        image_status: CHILD_FALLBACK_STATUS,
        image_note: CHILD_FALLBACK_NOTE,
      });
    }),
  );

  return fallbackByCardPrintId;
}
