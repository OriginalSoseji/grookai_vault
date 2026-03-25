import "server-only";

import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import {
  normalizeDiscoverableVaultIntent,
  type DiscoverableVaultIntent,
} from "@/lib/network/intent";
import { getPublicPricingByCardIds } from "@/lib/pricing/getPublicPricingByCardIds";
import { resolveVaultInstanceMediaUrl } from "@/lib/vault/resolveVaultInstanceMediaUrl";
import { createServerAdminClient } from "@/lib/supabase/admin";
import {
  normalizeVaultInstancePricingAmount,
  normalizeVaultInstancePricingCurrency,
  normalizeVaultInstancePricingMode,
  normalizeVaultInstancePricingNote,
  type VaultInstancePricingMode,
} from "@/lib/vaultInstancePricing";

type PublicVaultInstanceRow = {
  id: string;
  user_id: string | null;
  gv_vi_id: string | null;
  card_print_id: string | null;
  slab_cert_id: string | null;
  legacy_vault_item_id: string | null;
  condition_label: string | null;
  intent: string | null;
  created_at: string | null;
  grade_company: string | null;
  grade_value: string | null;
  grade_label: string | null;
  image_url: string | null;
  image_back_url: string | null;
  archived_at: string | null;
  pricing_mode: string | null;
  asking_price_amount: number | string | null;
  asking_price_currency: string | null;
  asking_price_note: string | null;
};

type PublicProfileRow = {
  slug: string | null;
  display_name: string | null;
  public_profile_enabled: boolean | null;
  vault_sharing_enabled: boolean | null;
};

type SlabCertRow = {
  id: string;
  card_print_id: string | null;
  grader: string | null;
  cert_number: string | null;
  grade: number | string | null;
};

type CardPrintRow = {
  id: string | null;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  sets:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

function normalizeOptionalText(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeGradeValue(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : null;
  }

  return normalizeOptionalText(value);
}

function normalizeSetName(value: CardPrintRow["sets"]) {
  const record = Array.isArray(value) ? value[0] : value;
  return normalizeOptionalText(record?.name) ?? "Unknown set";
}

export type PublicVaultInstanceDetail = {
  instanceId: string;
  gvviId: string;
  vaultItemId: string;
  ownerUserId: string;
  ownerSlug: string;
  ownerDisplayName: string;
  cardPrintId: string;
  gvId: string;
  cardName: string;
  setCode: string;
  setName: string;
  number: string;
  imageUrl: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  intent: DiscoverableVaultIntent;
  conditionLabel: string | null;
  isGraded: boolean;
  grader: string | null;
  grade: string | null;
  certNumber: string | null;
  createdAt: string | null;
  pricingMode: VaultInstancePricingMode;
  askingPriceAmount: number | null;
  askingPriceCurrency: string | null;
  askingPriceNote: string | null;
  marketReferencePrice: number | null;
  marketReferenceSource: string | null;
  marketReferenceUpdatedAt: string | null;
};

export async function getPublicVaultInstanceByGvvi(
  gvviId: string,
): Promise<PublicVaultInstanceDetail | null> {
  const normalizedGvviId = gvviId.trim();
  if (!normalizedGvviId) {
    return null;
  }

  const admin = createServerAdminClient();
  const { data: instanceData, error: instanceError } = await admin
    .from("vault_item_instances")
    .select(
      "id,user_id,gv_vi_id,card_print_id,slab_cert_id,legacy_vault_item_id,condition_label,intent,created_at,grade_company,grade_value,grade_label,image_url,image_back_url,archived_at,pricing_mode,asking_price_amount,asking_price_currency,asking_price_note",
    )
    .eq("gv_vi_id", normalizedGvviId)
    .maybeSingle();

  if (instanceError || !instanceData) {
    return null;
  }

  const instance = instanceData as PublicVaultInstanceRow;
  const ownerUserId = normalizeOptionalText(instance.user_id);
  const vaultItemId = normalizeOptionalText(instance.legacy_vault_item_id);
  const intent = normalizeDiscoverableVaultIntent(instance.intent);

  if (!ownerUserId || !vaultItemId || !intent || instance.archived_at !== null) {
    return null;
  }

  const { data: profileData } = await admin
    .from("public_profiles")
    .select("slug,display_name,public_profile_enabled,vault_sharing_enabled")
    .eq("user_id", ownerUserId)
    .maybeSingle();

  const profile = (profileData ?? null) as PublicProfileRow | null;
  const ownerSlug = normalizeOptionalText(profile?.slug);
  const ownerDisplayName = normalizeOptionalText(profile?.display_name);

  if (!profile?.public_profile_enabled || !profile.vault_sharing_enabled || !ownerSlug || !ownerDisplayName) {
    return null;
  }

  let slabCert: SlabCertRow | null = null;
  if (instance.slab_cert_id) {
    const { data: slabData } = await admin
      .from("slab_certs")
      .select("id,card_print_id,grader,cert_number,grade")
      .eq("id", instance.slab_cert_id)
      .maybeSingle();

    slabCert = (slabData ?? null) as SlabCertRow | null;
  }

  const cardPrintId =
    normalizeOptionalText(instance.card_print_id) ?? normalizeOptionalText(slabCert?.card_print_id);
  if (!cardPrintId) {
    return null;
  }

  const { data: cardData } = await admin
    .from("card_prints")
    .select("id,gv_id,name,set_code,number,image_url,image_alt_url,sets(name)")
    .eq("id", cardPrintId)
    .maybeSingle();

  if (!cardData) {
    return null;
  }

  const card = cardData as CardPrintRow;
  const [frontImageUrl, backImageUrl, pricingByCardId] = await Promise.all([
    resolveVaultInstanceMediaUrl(instance.image_url),
    resolveVaultInstanceMediaUrl(instance.image_back_url),
    getPublicPricingByCardIds(admin, [cardPrintId]),
  ]);
  const pricingRecord = !instance.slab_cert_id ? pricingByCardId.get(cardPrintId) : undefined;

  return {
    instanceId: instance.id,
    gvviId: normalizedGvviId,
    vaultItemId,
    ownerUserId,
    ownerSlug,
    ownerDisplayName,
    cardPrintId,
    gvId: normalizeOptionalText(card.gv_id) ?? "",
    cardName: normalizeOptionalText(card.name) ?? "Unknown card",
    setCode: normalizeOptionalText(card.set_code) ?? "Unknown set",
    setName: normalizeSetName(card.sets),
    number: normalizeOptionalText(card.number) ?? "—",
    imageUrl: getBestPublicCardImageUrl(card.image_url, card.image_alt_url) ?? null,
    frontImageUrl,
    backImageUrl,
    intent,
    conditionLabel: normalizeOptionalText(instance.condition_label),
    isGraded: Boolean(instance.slab_cert_id),
    grader: normalizeOptionalText(slabCert?.grader) ?? normalizeOptionalText(instance.grade_company),
    grade:
      normalizeGradeValue(slabCert?.grade) ??
      normalizeOptionalText(instance.grade_label) ??
      normalizeOptionalText(instance.grade_value),
    certNumber: normalizeOptionalText(slabCert?.cert_number),
    createdAt: instance.created_at ?? null,
    pricingMode: normalizeVaultInstancePricingMode(instance.pricing_mode) ?? "market",
    askingPriceAmount: normalizeVaultInstancePricingAmount(instance.asking_price_amount),
    askingPriceCurrency: normalizeVaultInstancePricingCurrency(instance.asking_price_currency),
    askingPriceNote: normalizeVaultInstancePricingNote(instance.asking_price_note),
    marketReferencePrice:
      typeof pricingRecord?.raw_price === "number" && Number.isFinite(pricingRecord.raw_price)
        ? pricingRecord.raw_price
        : null,
    marketReferenceSource:
      typeof pricingRecord?.raw_price_source === "string" ? pricingRecord.raw_price_source.trim() : null,
    marketReferenceUpdatedAt:
      typeof pricingRecord?.raw_price_ts === "string" && pricingRecord.raw_price_ts.trim().length > 0
        ? pricingRecord.raw_price_ts
        : null,
  };
}
