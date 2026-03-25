import "server-only";

import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { normalizeVaultIntent, type VaultIntent } from "@/lib/network/intent";
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

type VaultInstanceRow = {
  id: string;
  user_id: string | null;
  gv_vi_id: string | null;
  card_print_id: string | null;
  slab_cert_id: string | null;
  legacy_vault_item_id: string | null;
  condition_label: string | null;
  intent: string | null;
  notes: string | null;
  created_at: string | null;
  archived_at: string | null;
  grade_company: string | null;
  grade_value: string | null;
  grade_label: string | null;
  photo_url: string | null;
  image_url: string | null;
  image_back_url: string | null;
  pricing_mode: string | null;
  asking_price_amount: number | string | null;
  asking_price_currency: string | null;
  asking_price_note: string | null;
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

type OutcomeRow = {
  id: string;
  execution_event_id: string | null;
  outcome_type: string | null;
  price_amount: number | string | null;
  price_currency: string | null;
  created_at: string | null;
  source_instance_id: string | null;
  result_instance_id: string | null;
  source_user_id: string | null;
  target_user_id: string | null;
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

function normalizePriceAmount(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export type VaultInstanceOutcome = {
  id: string;
  executionEventId: string | null;
  outcomeType: "sale" | "trade";
  role: "source" | "result";
  createdAt: string | null;
  priceAmount: number | null;
  priceCurrency: string | null;
  sourceUserId: string | null;
  targetUserId: string | null;
};

export type VaultInstanceDetail = {
  instanceId: string;
  gvviId: string;
  cardPrintId: string;
  gvId: string;
  cardName: string;
  setCode: string;
  setName: string;
  number: string;
  imageUrl: string | null;
  conditionLabel: string | null;
  intent: VaultIntent;
  isGraded: boolean;
  grader: string | null;
  grade: string | null;
  certNumber: string | null;
  notes: string | null;
  createdAt: string | null;
  archivedAt: string | null;
  legacyVaultItemId: string | null;
  hasFrontPhoto: boolean;
  hasBackPhoto: boolean;
  frontImagePath: string | null;
  backImagePath: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  pricingMode: VaultInstancePricingMode;
  askingPriceAmount: number | null;
  askingPriceCurrency: string | null;
  askingPriceNote: string | null;
  marketReferencePrice: number | null;
  marketReferenceSource: string | null;
  marketReferenceUpdatedAt: string | null;
  outcomes: VaultInstanceOutcome[];
};

export async function getVaultInstanceByGvvi(userId: string, gvviId: string): Promise<VaultInstanceDetail | null> {
  const normalizedUserId = userId.trim();
  const normalizedGvviId = gvviId.trim();

  if (!normalizedUserId || !normalizedGvviId) {
    return null;
  }

  const admin = createServerAdminClient();
  const { data: instanceData, error: instanceError } = await admin
    .from("vault_item_instances")
    .select(
      "id,user_id,gv_vi_id,card_print_id,slab_cert_id,legacy_vault_item_id,condition_label,intent,notes,created_at,archived_at,grade_company,grade_value,grade_label,photo_url,image_url,image_back_url,pricing_mode,asking_price_amount,asking_price_currency,asking_price_note",
    )
    .eq("gv_vi_id", normalizedGvviId)
    .maybeSingle();

  if (instanceError || !instanceData) {
    return null;
  }

  const instance = instanceData as VaultInstanceRow;
  if (instance.user_id !== normalizedUserId || normalizeOptionalText(instance.gv_vi_id) !== normalizedGvviId) {
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

  const resolvedCardPrintId =
    normalizeOptionalText(instance.card_print_id) ?? normalizeOptionalText(slabCert?.card_print_id);
  if (!resolvedCardPrintId) {
    return null;
  }

  const { data: cardData } = await admin
    .from("card_prints")
    .select("id,gv_id,name,set_code,number,image_url,image_alt_url,sets(name)")
    .eq("id", resolvedCardPrintId)
    .maybeSingle();

  if (!cardData) {
    return null;
  }

  const card = cardData as CardPrintRow;
  const legacyVaultItemId = normalizeOptionalText(instance.legacy_vault_item_id);
  const frontImagePath = normalizeOptionalText(instance.image_url);
  const backImagePath = normalizeOptionalText(instance.image_back_url);

  const [frontImageUrl, backImageUrl, outcomeResult, pricingByCardId] = await Promise.all([
    resolveVaultInstanceMediaUrl(frontImagePath),
    resolveVaultInstanceMediaUrl(backImagePath),
    admin
      .from("card_interaction_outcomes")
      .select(
        "id,execution_event_id,outcome_type,price_amount,price_currency,created_at,source_instance_id,result_instance_id,source_user_id,target_user_id",
      )
      .or(`source_instance_id.eq.${instance.id},result_instance_id.eq.${instance.id}`)
      .order("created_at", { ascending: false }),
    getPublicPricingByCardIds(admin, [resolvedCardPrintId]),
  ]);

  const outcomeRows = ((outcomeResult.data ?? []) as OutcomeRow[]).filter(
    (row): row is OutcomeRow & { outcome_type: "sale" | "trade" } =>
      row.outcome_type === "sale" || row.outcome_type === "trade",
  );
  const pricingRecord = !instance.slab_cert_id ? pricingByCardId.get(resolvedCardPrintId) : undefined;

  return {
    instanceId: instance.id,
    gvviId: normalizedGvviId,
    cardPrintId: resolvedCardPrintId,
    gvId: normalizeOptionalText(card.gv_id) ?? "",
    cardName: normalizeOptionalText(card.name) ?? "Unknown card",
    setCode: normalizeOptionalText(card.set_code) ?? "Unknown set",
    setName: normalizeSetName(card.sets),
    number: normalizeOptionalText(card.number) ?? "—",
    imageUrl: getBestPublicCardImageUrl(card.image_url, card.image_alt_url) ?? null,
    conditionLabel: normalizeOptionalText(instance.condition_label),
    intent: normalizeVaultIntent(instance.intent) ?? "hold",
    isGraded: Boolean(instance.slab_cert_id),
    grader: normalizeOptionalText(slabCert?.grader) ?? normalizeOptionalText(instance.grade_company),
    grade:
      normalizeGradeValue(slabCert?.grade) ??
      normalizeOptionalText(instance.grade_label) ??
      normalizeOptionalText(instance.grade_value),
    certNumber: normalizeOptionalText(slabCert?.cert_number),
    notes: normalizeOptionalText(instance.notes),
    createdAt: instance.created_at ?? null,
    archivedAt: instance.archived_at ?? null,
    legacyVaultItemId,
    hasFrontPhoto: Boolean(frontImageUrl),
    hasBackPhoto: Boolean(backImageUrl),
    frontImagePath,
    backImagePath,
    frontImageUrl,
    backImageUrl,
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
    outcomes: outcomeRows.map((row) => ({
      id: row.id,
      executionEventId: normalizeOptionalText(row.execution_event_id),
      outcomeType: row.outcome_type,
      role: row.source_instance_id === instance.id ? "source" : "result",
      createdAt: row.created_at ?? null,
      priceAmount: normalizePriceAmount(row.price_amount),
      priceCurrency: normalizeOptionalText(row.price_currency),
      sourceUserId: normalizeOptionalText(row.source_user_id),
      targetUserId: normalizeOptionalText(row.target_user_id),
    })),
  };
}
