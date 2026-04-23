import { normalizeDiscoverableVaultIntent, type DiscoverableVaultIntent } from "@/lib/network/intent";
import { resolveDisplayImageUrl } from "@/lib/publicCardImage";
import type { PublicInPlayCopy, PublicWallCard } from "@/lib/sharedCards/publicWall.shared";

export type PublicWallCardViewRow = {
  instance_id?: string | null;
  gv_vi_id?: string | null;
  vault_item_id?: string | null;
  card_print_id?: string | null;
  intent?: string | null;
  condition_label?: string | null;
  is_graded?: boolean | null;
  grade_company?: string | null;
  grade_value?: string | null;
  grade_label?: string | null;
  created_at?: string | null;
  instance_created_at?: string | null;
  section_added_at?: string | null;
  gv_id?: string | null;
  name?: string | null;
  set_code?: string | null;
  set_name?: string | null;
  number?: string | null;
  image_url?: string | null;
  image_alt_url?: string | null;
  representative_image_url?: string | null;
  display_image_url?: string | null;
  display_image_kind?: string | null;
  public_note?: string | null;
};

function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeBoolean(value: unknown) {
  return value === true;
}

function getDisplayImageUrl(row: PublicWallCardViewRow) {
  // LOCK: Product surfaces must prefer display_image_url.
  // LOCK: Legacy image_url/image_alt_url are fallback-only compatibility fields.
  return (
    resolveDisplayImageUrl({
      display_image_url: row.display_image_url,
      image_url: row.image_url,
      image_alt_url: row.image_alt_url,
      representative_image_url: row.representative_image_url,
    }) ?? undefined
  );
}

function getCreatedAt(row: PublicWallCardViewRow) {
  return normalizeOptionalText(row.section_added_at) ?? normalizeOptionalText(row.instance_created_at) ?? normalizeOptionalText(row.created_at);
}

function toPublicInPlayCopy(row: PublicWallCardViewRow, intent: DiscoverableVaultIntent): PublicInPlayCopy | null {
  const instanceId = normalizeOptionalText(row.instance_id);
  if (!instanceId) {
    return null;
  }

  return {
    instance_id: instanceId,
    gv_vi_id: normalizeOptionalText(row.gv_vi_id) ?? undefined,
    vault_item_id: normalizeOptionalText(row.vault_item_id) ?? "",
    intent,
    condition_label: normalizeOptionalText(row.condition_label) ?? undefined,
    is_graded: normalizeBoolean(row.is_graded),
    grade_company: normalizeOptionalText(row.grade_company) ?? undefined,
    grade_value: normalizeOptionalText(row.grade_value) ?? undefined,
    grade_label: normalizeOptionalText(row.grade_label) ?? undefined,
    created_at: getCreatedAt(row) ?? undefined,
  };
}

function toBasePublicWallCard(row: PublicWallCardViewRow): PublicWallCard | null {
  const cardPrintId = normalizeOptionalText(row.card_print_id);
  const gvId = normalizeOptionalText(row.gv_id);
  if (!cardPrintId || !gvId) {
    return null;
  }

  const displayImageUrl = getDisplayImageUrl(row);

  return {
    card_print_id: cardPrintId,
    gv_id: gvId,
    gv_vi_id: normalizeOptionalText(row.gv_vi_id) ?? undefined,
    name: normalizeOptionalText(row.name) ?? "Unknown card",
    set_code: normalizeOptionalText(row.set_code) ?? undefined,
    set_name: normalizeOptionalText(row.set_name) ?? normalizeOptionalText(row.set_code) ?? undefined,
    number: normalizeOptionalText(row.number) ?? "—",
    image_url: displayImageUrl,
    canonical_image_url: displayImageUrl,
    public_note: normalizeOptionalText(row.public_note) ?? undefined,
    vault_item_id: normalizeOptionalText(row.vault_item_id) ?? undefined,
    intent: normalizeDiscoverableVaultIntent(row.intent) ?? undefined,
  };
}

export function mapSectionCardRowsToPublicWallCards(rows: PublicWallCardViewRow[]): PublicWallCard[] {
  const cards: PublicWallCard[] = [];

  for (const row of rows) {
    const card = toBasePublicWallCard(row);
    if (!card) {
      continue;
    }

    const isGraded = normalizeBoolean(row.is_graded);
    const intent = normalizeDiscoverableVaultIntent(row.intent);

    cards.push({
      ...card,
      owned_count: 1,
      raw_count: isGraded ? 0 : 1,
      slab_count: isGraded ? 1 : 0,
      is_slab: isGraded,
      grader: normalizeOptionalText(row.grade_company) ?? undefined,
      grade: normalizeOptionalText(row.grade_value) ?? normalizeOptionalText(row.grade_label) ?? undefined,
      in_play_quantity: intent ? 1 : undefined,
      in_play_raw_count: intent && !isGraded ? 1 : undefined,
      in_play_slab_count: intent && isGraded ? 1 : undefined,
      in_play_condition_label: normalizeOptionalText(row.condition_label) ?? undefined,
      in_play_is_graded: isGraded,
      in_play_grade_company: normalizeOptionalText(row.grade_company) ?? undefined,
      in_play_grade_value: normalizeOptionalText(row.grade_value) ?? undefined,
      in_play_grade_label: normalizeOptionalText(row.grade_label) ?? undefined,
      in_play_created_at: getCreatedAt(row) ?? undefined,
      in_play_copies: intent ? [toPublicInPlayCopy(row, intent)].filter((copy): copy is PublicInPlayCopy => Boolean(copy)) : undefined,
    });
  }

  return cards;
}

export function mapWallCardRowsToPublicWallCards(rows: PublicWallCardViewRow[]): PublicWallCard[] {
  const grouped = new Map<string, PublicWallCard>();

  for (const row of rows) {
    const card = toBasePublicWallCard(row);
    const intent = normalizeDiscoverableVaultIntent(row.intent);
    if (!card || !intent) {
      continue;
    }

    const key = card.card_print_id;
    const existing = grouped.get(key);
    const copy = toPublicInPlayCopy(row, intent);
    const isGraded = normalizeBoolean(row.is_graded);
    const nextCreatedAt = getCreatedAt(row) ?? undefined;

    if (!existing) {
      grouped.set(key, {
        ...card,
        owned_count: 1,
        raw_count: isGraded ? 0 : 1,
        slab_count: isGraded ? 1 : 0,
        is_slab: isGraded,
        grader: normalizeOptionalText(row.grade_company) ?? undefined,
        grade: normalizeOptionalText(row.grade_value) ?? normalizeOptionalText(row.grade_label) ?? undefined,
        intent,
        trade_count: intent === "trade" ? 1 : 0,
        sell_count: intent === "sell" ? 1 : 0,
        showcase_count: intent === "showcase" ? 1 : 0,
        in_play_quantity: 1,
        in_play_raw_count: isGraded ? 0 : 1,
        in_play_slab_count: isGraded ? 1 : 0,
        in_play_condition_label: normalizeOptionalText(row.condition_label) ?? undefined,
        in_play_is_graded: isGraded,
        in_play_grade_company: normalizeOptionalText(row.grade_company) ?? undefined,
        in_play_grade_value: normalizeOptionalText(row.grade_value) ?? undefined,
        in_play_grade_label: normalizeOptionalText(row.grade_label) ?? undefined,
        in_play_created_at: nextCreatedAt,
        in_play_copies: copy ? [copy] : undefined,
      });
      continue;
    }

    existing.owned_count = (existing.owned_count ?? 0) + 1;
    existing.raw_count = (existing.raw_count ?? 0) + (isGraded ? 0 : 1);
    existing.slab_count = (existing.slab_count ?? 0) + (isGraded ? 1 : 0);
    existing.trade_count = (existing.trade_count ?? 0) + (intent === "trade" ? 1 : 0);
    existing.sell_count = (existing.sell_count ?? 0) + (intent === "sell" ? 1 : 0);
    existing.showcase_count = (existing.showcase_count ?? 0) + (intent === "showcase" ? 1 : 0);
    existing.in_play_quantity = (existing.in_play_quantity ?? 0) + 1;
    existing.in_play_raw_count = (existing.in_play_raw_count ?? 0) + (isGraded ? 0 : 1);
    existing.in_play_slab_count = (existing.in_play_slab_count ?? 0) + (isGraded ? 1 : 0);

    if (copy) {
      existing.in_play_copies = [...(existing.in_play_copies ?? []), copy];
    }

    const existingCreatedAt = existing.in_play_created_at ? Date.parse(existing.in_play_created_at) : Number.NEGATIVE_INFINITY;
    const candidateCreatedAt = nextCreatedAt ? Date.parse(nextCreatedAt) : Number.NEGATIVE_INFINITY;
    if (candidateCreatedAt > existingCreatedAt) {
      existing.gv_vi_id = card.gv_vi_id;
      existing.vault_item_id = card.vault_item_id;
      existing.intent = intent;
      existing.in_play_condition_label = normalizeOptionalText(row.condition_label) ?? undefined;
      existing.in_play_is_graded = isGraded;
      existing.in_play_grade_company = normalizeOptionalText(row.grade_company) ?? undefined;
      existing.in_play_grade_value = normalizeOptionalText(row.grade_value) ?? undefined;
      existing.in_play_grade_label = normalizeOptionalText(row.grade_label) ?? undefined;
      existing.in_play_created_at = nextCreatedAt;
    }
  }

  return [...grouped.values()].sort((left, right) => {
    const leftCreatedAt = left.in_play_created_at ? Date.parse(left.in_play_created_at) : Number.NEGATIVE_INFINITY;
    const rightCreatedAt = right.in_play_created_at ? Date.parse(right.in_play_created_at) : Number.NEGATIVE_INFINITY;

    if (leftCreatedAt !== rightCreatedAt) {
      return rightCreatedAt - leftCreatedAt;
    }

    return left.name.localeCompare(right.name);
  });
}
