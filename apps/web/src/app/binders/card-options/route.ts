import { NextRequest, NextResponse } from "next/server";
import { getCardPrintingFinishLabel } from "@/lib/cards/displayDiscriminator";
import { getVariantLabels } from "@/lib/cards/variantPresentation";
import { getExploreRowsForLanguageScopedTextSearch } from "@/lib/explore/getExploreRows";
import { getBinderFeatureFlags } from "@/lib/binders/featureFlags";
import {
  getPublicCardPrintingOptions,
  type PublicCardPrintingOptionRow,
} from "@/lib/cards/getPublicCardPrintingOptions";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type FinishRow = PublicCardPrintingOptionRow;

type FinishOption = {
  cardPrintingId: string;
  label: string;
  sortOrder: number;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

async function requireCustomBinderEditor() {
  const flags = getBinderFeatureFlags();
  if (!flags.schemaRpc || !flags.customBinders) {
    return null;
  }
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

async function getFinishOptions(
  supabase: Awaited<ReturnType<typeof createServerComponentClient>>,
  cardPrintIds: string[],
) {
  const rows: FinishRow[] = await getPublicCardPrintingOptions(
    supabase,
    cardPrintIds,
  );

  const byCardPrintId = new Map<
    string,
    FinishOption[]
  >();
  for (const row of rows) {
    const cardPrintingId = text(row.id);
    const cardPrintId = text(row.card_print_id);
    if (!UUID_PATTERN.test(cardPrintingId) || !UUID_PATTERN.test(cardPrintId)) {
      continue;
    }
    const label =
      getCardPrintingFinishLabel({
        finishKey: row.finish_key,
        finishLabel: row.finish_label,
      }) ||
      text(row.finish_key).replaceAll("_", " ") ||
      "Governed finish";
    const options = byCardPrintId.get(cardPrintId) ?? [];
    options.push({
      cardPrintingId,
      label,
      sortOrder:
        typeof row.finish_sort_order === "number"
          ? row.finish_sort_order
          : Number.MAX_SAFE_INTEGER,
    });
    byCardPrintId.set(cardPrintId, options);
  }

  for (const options of byCardPrintId.values()) {
    options.sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.label.localeCompare(right.label),
    );
  }
  return byCardPrintId;
}

export async function GET(request: NextRequest) {
  const supabase = await requireCustomBinderEditor();
  if (!supabase) {
    return privateJson({ ok: false, error: "Unavailable." }, 404);
  }
  const query = text(request.nextUrl.searchParams.get("q")).slice(0, 80);
  if (query.length < 2) {
    return privateJson(
      { ok: false, error: "Enter at least two characters." },
      400,
    );
  }

  try {
    const rows = await getExploreRowsForLanguageScopedTextSearch(
      query,
      "all",
      "relevance",
    );
    const uniqueRows = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (UUID_PATTERN.test(row.id) && !uniqueRows.has(row.id)) {
        uniqueRows.set(row.id, row);
      }
      if (uniqueRows.size >= 12) {
        break;
      }
    }
    const cardPrintIds = [...uniqueRows.keys()];
    const finishesByCardPrintId = await getFinishOptions(
      supabase,
      cardPrintIds,
    );
    const items = [...uniqueRows.values()].map((row) => ({
      cardPrintId: row.id,
      title: row.name,
      subtitle:
        [row.set_name, row.number ? `#${row.number}` : ""]
          .filter(Boolean)
          .join(" · ") || null,
      imageUrl:
        row.display_image_url ??
        row.display_image_fallback_url ??
        row.image_url ??
        row.representative_image_url ??
        null,
      variantLabels: getVariantLabels({
        number: row.number,
        setCode: row.set_code,
        variantKey: row.variant_key,
        printedIdentityModifier: row.printed_identity_modifier,
        variants: row.variants,
      }),
      finishes: (finishesByCardPrintId.get(row.id) ?? []).map(
        ({ cardPrintingId, label }) => ({ cardPrintingId, label }),
      ),
    }));
    return privateJson({ ok: true, items });
  } catch {
    return privateJson(
      { ok: false, error: "Card search is temporarily unavailable." },
      503,
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await requireCustomBinderEditor();
  if (!supabase) {
    return privateJson({ ok: false, error: "Unavailable." }, 404);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return privateJson({ ok: false, error: "Invalid request." }, 400);
  }
  const rawIds =
    body && typeof body === "object" && Array.isArray((body as { cardPrintIds?: unknown }).cardPrintIds)
      ? (body as { cardPrintIds: unknown[] }).cardPrintIds
      : [];
  const cardPrintIds = Array.from(
    new Set(rawIds.map(text).filter((value) => UUID_PATTERN.test(value))),
  ).slice(0, 1000);
  if (cardPrintIds.length === 0) {
    return privateJson({ ok: true, items: [] });
  }

  try {
    const finishesByCardPrintId = await getFinishOptions(
      supabase,
      cardPrintIds,
    );
    return privateJson({
      ok: true,
      items: cardPrintIds.map((cardPrintId) => ({
        cardPrintId,
        finishes: (finishesByCardPrintId.get(cardPrintId) ?? []).map(
          ({ cardPrintingId, label }) => ({ cardPrintingId, label }),
        ),
      })),
    });
  } catch {
    return privateJson(
      { ok: false, error: "Finish options are temporarily unavailable." },
      503,
    );
  }
}
