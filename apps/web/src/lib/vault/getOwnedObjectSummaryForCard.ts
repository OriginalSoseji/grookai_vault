import "server-only";

import { getCardPrintingFinishLabel } from "@/lib/cards/displayDiscriminator";
import { createServerAdminClient } from "@/lib/supabase/admin";

export type OwnedObjectSummaryLine = {
  key: string;
  label: string;
  count: number;
  is_slab: boolean;
  grader: string | null;
  grade: string | null;
};

export type OwnedSlabObjectSummaryItem = {
  instanceId: string;
  slabCertId: string;
  grader: string | null;
  grade: string | null;
  certNumber: string | null;
};

export type OwnedRawObjectSummaryItem = {
  instanceId: string;
  gvviId: string | null;
  conditionLabel: string | null;
  cardPrintingId: string | null;
  finishLabel: string | null;
  createdAt: string | null;
};

export type OwnedObjectSummary = {
  totalCount: number;
  rawCount: number;
  slabCount: number;
  removableRawInstanceId: string | null;
  rawItems: OwnedRawObjectSummaryItem[];
  slabItems: OwnedSlabObjectSummaryItem[];
  lines: OwnedObjectSummaryLine[];
};

type RawInstanceRow = {
  id: string;
  gv_vi_id: string | null;
  condition_label: string | null;
  card_printing_id: string | null;
  created_at: string | null;
};

type CardPrintingFinishRow = {
  id: string | null;
  finish_key: string | null;
  finish_keys:
    | { label: string | null; sort_order: number | null }
    | { label: string | null; sort_order: number | null }[]
    | null;
};

type SlabCertRow = {
  id: string;
  grader: string | null;
  grade: number | string | null;
  cert_number: string | null;
};

type SlabInstanceRow = {
  id: string;
  slab_cert_id: string | null;
  created_at: string | null;
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

export async function getOwnedObjectSummaryForCard(userId: string, cardPrintId: string): Promise<OwnedObjectSummary> {
  const normalizedUserId = userId.trim();
  const normalizedCardPrintId = cardPrintId.trim();

  if (!normalizedUserId || !normalizedCardPrintId) {
    return {
      totalCount: 0,
      rawCount: 0,
      slabCount: 0,
      removableRawInstanceId: null,
      rawItems: [],
      slabItems: [],
      lines: [],
    };
  }

  const adminClient = createServerAdminClient();
  const [{ data: rawRows, error: rawError }, { data: slabCertRows, error: slabCertError }] = await Promise.all([
    adminClient
      .from("vault_item_instances")
      .select("id,gv_vi_id,condition_label,card_printing_id,created_at")
      .eq("user_id", normalizedUserId)
      .eq("card_print_id", normalizedCardPrintId)
      .is("slab_cert_id", null)
      .is("archived_at", null)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    adminClient.from("slab_certs").select("id,grader,grade,cert_number").eq("card_print_id", normalizedCardPrintId),
  ]);

  if (rawError) {
    throw new Error(`[card:ownership] raw instance summary query failed: ${rawError.message}`);
  }

  if (slabCertError) {
    throw new Error(`[card:ownership] slab cert summary query failed: ${slabCertError.message}`);
  }

  const normalizedRawRows = (rawRows ?? []) as RawInstanceRow[];
  const rawCardPrintingIds = Array.from(
    new Set(
      normalizedRawRows
        .map((row) => normalizeOptionalText(row.card_printing_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const finishLabelByPrintingId = new Map<string, string>();
  if (rawCardPrintingIds.length > 0) {
    const { data: printingRows, error: printingError } = await adminClient
      .from("card_printings")
      .select("id,finish_key,finish_keys(label,sort_order)")
      .in("id", rawCardPrintingIds);

    if (printingError) {
      throw new Error(`[card:ownership] raw finish summary query failed: ${printingError.message}`);
    }

    for (const row of (printingRows ?? []) as CardPrintingFinishRow[]) {
      const id = normalizeOptionalText(row.id);
      const finishRecord = Array.isArray(row.finish_keys) ? row.finish_keys[0] : row.finish_keys;
      const label = getCardPrintingFinishLabel({
        finishKey: row.finish_key,
        finishLabel: finishRecord?.label,
      });
      if (id && label) {
        finishLabelByPrintingId.set(id, label);
      }
    }
  }
  const rawItems: OwnedRawObjectSummaryItem[] = normalizedRawRows.map((row) => ({
    instanceId: row.id,
    gvviId: normalizeOptionalText(row.gv_vi_id),
    conditionLabel: normalizeOptionalText(row.condition_label),
    cardPrintingId: normalizeOptionalText(row.card_printing_id),
    finishLabel: normalizeOptionalText(row.card_printing_id)
      ? finishLabelByPrintingId.get(normalizeOptionalText(row.card_printing_id)!) ?? null
      : null,
    createdAt: row.created_at ?? null,
  }));
  const rawCount = rawItems.length;
  const removableRawInstanceId = rawCount === 1 ? rawItems[0]?.instanceId ?? null : null;
  const slabCerts = (slabCertRows ?? []) as SlabCertRow[];
  const slabCertIds = slabCerts
    .map((row) => normalizeOptionalText(row.id))
    .filter((value): value is string => Boolean(value));

  let slabInstances: SlabInstanceRow[] = [];
  if (slabCertIds.length > 0) {
    const { data, error } = await adminClient
      .from("vault_item_instances")
      .select("id,slab_cert_id,created_at")
      .eq("user_id", normalizedUserId)
      .is("archived_at", null)
      .in("slab_cert_id", slabCertIds)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`[card:ownership] slab instance summary query failed: ${error.message}`);
    }

    slabInstances = (data ?? []) as SlabInstanceRow[];
  }

  const certById = new Map<string, SlabCertRow>();
  for (const row of slabCerts) {
    const normalizedId = normalizeOptionalText(row.id);
    if (normalizedId) {
      certById.set(normalizedId, row);
    }
  }

  const slabItems: OwnedSlabObjectSummaryItem[] = [];
  for (const row of slabInstances) {
    const instanceId = normalizeOptionalText(row.id);
    const certId = normalizeOptionalText(row.slab_cert_id);
    if (!instanceId || !certId) {
      continue;
    }

    const slabCert = certById.get(certId);
    if (!slabCert) {
      continue;
    }

    slabItems.push({
      instanceId,
      slabCertId: certId,
      grader: normalizeOptionalText(slabCert.grader),
      grade: normalizeGradeValue(slabCert.grade),
      certNumber: normalizeOptionalText(slabCert.cert_number),
    });
  }

  const slabGroups = new Map<string, OwnedObjectSummaryLine>();
  for (const slabItem of slabItems) {
    const grader = slabItem.grader;
    const grade = slabItem.grade;
    const key = `${grader ?? "SLAB"}:${grade ?? "UNKNOWN"}`;
    const label = [grader, grade].filter((value): value is string => Boolean(value)).join(" ") || "Graded slab";
    const current = slabGroups.get(key) ?? {
      key,
      label,
      count: 0,
      is_slab: true,
      grader,
      grade,
    };

    current.count += 1;
    slabGroups.set(key, current);
  }

  const slabLines = Array.from(slabGroups.values()).sort((left, right) => left.label.localeCompare(right.label));
  const lines: OwnedObjectSummaryLine[] = [];

  if (rawCount > 0) {
    lines.push({
      key: "raw",
      label: "Raw",
      count: rawCount,
      is_slab: false,
      grader: null,
      grade: null,
    });
  }

  lines.push(...slabLines);

  return {
    totalCount: rawCount + slabItems.length,
    rawCount,
    slabCount: slabItems.length,
    removableRawInstanceId,
    rawItems,
    slabItems,
    lines,
  };
}
