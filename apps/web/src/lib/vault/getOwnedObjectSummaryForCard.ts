import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

export type OwnedObjectSummaryLine = {
  key: string;
  label: string;
  count: number;
  is_slab: boolean;
  grader: string | null;
  grade: string | null;
};

export type OwnedObjectSummary = {
  totalCount: number;
  rawCount: number;
  slabCount: number;
  lines: OwnedObjectSummaryLine[];
};

type RawInstanceRow = {
  id: string;
};

type SlabCertRow = {
  id: string;
  grader: string | null;
  grade: number | string | null;
};

type SlabInstanceRow = {
  slab_cert_id: string | null;
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
      lines: [],
    };
  }

  const adminClient = createServerAdminClient();
  const [{ data: rawRows, error: rawError }, { data: slabCertRows, error: slabCertError }] = await Promise.all([
    adminClient
      .from("vault_item_instances")
      .select("id")
      .eq("user_id", normalizedUserId)
      .eq("card_print_id", normalizedCardPrintId)
      .is("slab_cert_id", null)
      .is("archived_at", null),
    adminClient.from("slab_certs").select("id,grader,grade").eq("card_print_id", normalizedCardPrintId),
  ]);

  if (rawError) {
    throw new Error(`[card:ownership] raw instance summary query failed: ${rawError.message}`);
  }

  if (slabCertError) {
    throw new Error(`[card:ownership] slab cert summary query failed: ${slabCertError.message}`);
  }

  const rawCount = ((rawRows ?? []) as RawInstanceRow[]).length;
  const slabCerts = (slabCertRows ?? []) as SlabCertRow[];
  const slabCertIds = slabCerts
    .map((row) => normalizeOptionalText(row.id))
    .filter((value): value is string => Boolean(value));

  let slabInstances: SlabInstanceRow[] = [];
  if (slabCertIds.length > 0) {
    const { data, error } = await adminClient
      .from("vault_item_instances")
      .select("slab_cert_id")
      .eq("user_id", normalizedUserId)
      .is("archived_at", null)
      .in("slab_cert_id", slabCertIds);

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

  const slabGroups = new Map<string, OwnedObjectSummaryLine>();
  for (const row of slabInstances) {
    const certId = normalizeOptionalText(row.slab_cert_id);
    if (!certId) {
      continue;
    }

    const slabCert = certById.get(certId);
    if (!slabCert) {
      continue;
    }

    const grader = normalizeOptionalText(slabCert.grader);
    const grade = normalizeGradeValue(slabCert.grade);
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
    totalCount: rawCount + slabInstances.length,
    rawCount,
    slabCount: slabInstances.length,
    lines,
  };
}
