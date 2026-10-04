"use server";

import { collapseRows } from "@/lib/import/collapseRows";
import { getJungleEditionResolution } from "@/lib/cards/jungleEditionResolution";
import { createImportReport, type ImportReport } from "@/lib/import/importReport";
import {
  normalizeImportNameForCompare,
  normalizeImportNumberForCompare,
  normalizeImportSetForCompare,
} from "@/lib/import/normalizeRow";
import { reconcileVaultQuantities } from "@/lib/import/reconcileVaultQuantities";
import { validateRows } from "@/lib/import/validateRows";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getOwnedCountsByCardPrintIds } from "@/lib/vault/getOwnedCountsByCardPrintIds";
import type { CardMatch, MatchCardPrintsResult, MatchResult, NormalizedRow } from "@/types/import";

type SetRow = {
  id: string;
  name: string | null;
  code: string | null;
};

type CardPrintRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  number: string | null;
  set_id: string | null;
  set_code: string | null;
  sets:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

type MatchImportMeta = {
  compareKey: string;
  desiredQuantity: number;
  importQuantity: number;
};

type MatchResultWithImportMeta = MatchResult & {
  importMeta?: MatchImportMeta;
};

export type MatchCardPrintsPreviewResult = MatchCardPrintsResult & {
  report: ImportReport;
};

function normalizeKeyPart(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buildMatchKey(setName: string, number: string, name: string) {
  return `${normalizeKeyPart(setName)}||${(number ?? "").trim()}||${normalizeKeyPart(name)}`;
}

function buildRowKey(row: Pick<NormalizedRow, "compareSet" | "compareNumber" | "compareName">) {
  return `${row.compareSet}|${row.compareNumber}|${row.compareName}`;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function readCatalogPages<T extends { id: string }>(
  fetchPage: (afterId: string | null) => PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  let afterId: string | null = null;
  for (;;) {
    const { data, error } = await fetchPage(afterId);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as T[];
    if (page.length === 0) return rows;
    const lastId = page[page.length - 1].id;
    if (!lastId || (afterId !== null && lastId <= afterId)) {
      throw new Error("Import catalog pagination did not advance. Please retry the preview.");
    }
    rows.push(...page);
    afterId = lastId;
    // Keep reading until empty, including when the server's row cap is smaller
    // than our requested page size. The stable ID cursor avoids offset drift.
  }
}

async function fetchCandidateCardPrintRows(
  rows: NormalizedRow[],
  setNameMap: Map<string, SetRow[]>,
): Promise<CardPrintRow[]> {
  if (rows.length === 0) {
    return [];
  }

  const client = await createServerComponentClient();
  const candidateSetIds = Array.from(
    new Set(
      rows.flatMap((row) => {
        const matchedSets = setNameMap.get(row.compareSet) ?? [];
        return matchedSets.map((setRow) => setRow.id);
      }),
    ),
  );
  const candidateNumbers = new Set(rows.map((row) => row.compareNumber.trim()).filter(Boolean));
  const candidateRows: CardPrintRow[] = [];

  if (candidateSetIds.length === 0 || candidateNumbers.size === 0) {
    return candidateRows;
  }

  const setIdChunks = chunkArray(candidateSetIds, 100);
  for (const setIdChunk of setIdChunks) {
    // Stored collector numbers may be padded or include a denominator. An exact
    // SQL filter on the normalized number discards valid prints before matching.
    // Read only the resolved sets, then use the same normalization as match keys.
    const setCards = await readCatalogPages<CardPrintRow>((afterId) => {
      let query = client
        .from("card_prints")
        .select("id,gv_id,name,number,set_id,set_code,sets(name)")
        .in("set_id", setIdChunk)
        .order("id", { ascending: true })
        .limit(500);
      if (afterId !== null) query = query.gt("id", afterId);
      return query;
    });
    candidateRows.push(...setCards.filter((card) => candidateNumbers.has(normalizeImportNumberForCompare(card.number ?? ""))));
  }

  return candidateRows;
}

async function fetchExistingVaultQuantities(
  userId: string,
  candidateRows: CardPrintRow[],
  editionReview: Map<string, string>,
): Promise<Record<string, number>> {
  if (candidateRows.length === 0) {
    return {};
  }

  const existingByCardId = await getOwnedCountsByCardPrintIds(
    userId,
    Array.from(new Set(candidateRows.map((row) => row.id.trim()).filter(Boolean))),
  );

  const cardIdsByRowKey = new Map<string, Set<string>>();

  for (const candidate of candidateRows) {
    const cardId = candidate.id.trim();
    if (!cardId) {
      continue;
    }

    const setRecord = Array.isArray(candidate.sets) ? candidate.sets[0] : candidate.sets;
    const key = buildRowKey({
      compareSet: normalizeImportSetForCompare(setRecord?.name ?? ""),
      compareNumber: normalizeImportNumberForCompare(candidate.number ?? ""),
      compareName: normalizeImportNameForCompare(candidate.name ?? ""),
    });
    const ids = cardIdsByRowKey.get(key) ?? new Set<string>();
    ids.add(cardId);
    cardIdsByRowKey.set(key, ids);
  }

  const quantities: Record<string, number> = {};
  for (const [key, ids] of cardIdsByRowKey) {
    // Subtract ownership only after the row identifies one exact printing.
    // Summing different variants/languages here could hide an unresolved row.
    // Ambiguous rows retain their target until selection; the writer rechecks
    // the selected printing's owned count before creating any copies.
    if (ids.size !== 1 || [...ids].some(id => editionReview.has(id))) continue;
    const [cardId] = ids;
    quantities[key] = existingByCardId.get(cardId) ?? 0;
  }

  return quantities;
}

export async function matchCardPrints(rows: NormalizedRow[]): Promise<MatchCardPrintsPreviewResult> {
  const client = await createServerComponentClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new Error("Sign in required.");
  }

  if (rows.length === 0) {
    return {
      rows: [],
      summary: {
        totalRows: 0,
        matchedRows: 0,
        multipleRows: 0,
        unmatchedRows: 0,
      },
      report: createImportReport(),
    };
  }

  const collapsedRows = collapseRows(rows);
  const { valid, invalid } = validateRows(collapsedRows);
  const reportBase = {
    rowsRead: rows.length,
    rowsCollapsed: collapsedRows.length,
    rowsValid: valid.length,
    rowsInvalid: invalid.length,
  };

  if (valid.length === 0) {
    return {
      rows: [],
      summary: {
        totalRows: 0,
        matchedRows: 0,
        multipleRows: 0,
        unmatchedRows: 0,
      },
      report: createImportReport(reportBase),
    };
  }

  const setRows = await readCatalogPages<SetRow>((afterId) => {
    let query = client.from("sets").select("id,name,code").order("id", { ascending: true }).limit(500);
    if (afterId !== null) query = query.gt("id", afterId);
    return query;
  });

  const setNameMap = new Map<string, SetRow[]>();
  for (const setRow of setRows) {
    const normalizedName = normalizeImportSetForCompare(setRow.name ?? "");
    if (!normalizedName) {
      continue;
    }

    const current = setNameMap.get(normalizedName) ?? [];
    current.push(setRow);
    setNameMap.set(normalizedName, current);
  }

  const candidateRows = await fetchCandidateCardPrintRows(valid, setNameMap);
  const editionReview = new Map<string, string>();
  for (const card of candidateRows.filter(card => card.set_code === "base2")) {
    try {
      const edition = await getJungleEditionResolution(client, card.id);
      if (edition.status !== "not_applicable") {
        editionReview.set(card.id, edition.status === "unavailable"
          ? "Jungle edition choices are being reviewed. This row is not imported; keep the original CSV."
          : "Confirm First Edition or Unlimited on the physical card. This row is kept for review; automatic edition import is not available yet.");
      }
    } catch {
      editionReview.set(card.id, "Jungle edition choices could not be checked. Upload the CSV again to retry; this row is not imported.");
    }
  }
  const existingVault = await fetchExistingVaultQuantities(user.id, candidateRows, editionReview);
  const desiredQuantityByKey = new Map(valid.map((row) => [buildRowKey(row), row.quantity]));
  const rowsToMatch = reconcileVaultQuantities(valid, existingVault);

  if (rowsToMatch.length === 0) {
    const report = createImportReport(reportBase);
    console.info("[import:match]", report);
    return {
      rows: [],
      summary: {
        totalRows: 0,
        matchedRows: 0,
        multipleRows: 0,
        unmatchedRows: 0,
      },
      report,
    };
  }

  const matchMap = new Map<string, CardPrintRow[]>();
  for (const candidate of candidateRows) {
    const setRecord = Array.isArray(candidate.sets) ? candidate.sets[0] : candidate.sets;
    const key = buildMatchKey(
      normalizeImportSetForCompare(setRecord?.name ?? ""),
      normalizeImportNumberForCompare(candidate.number ?? ""),
      normalizeImportNameForCompare(candidate.name ?? ""),
    );
    const current = matchMap.get(key) ?? [];
    current.push(candidate);
    matchMap.set(key, current);
  }

  const previewRows = rowsToMatch.map<MatchResultWithImportMeta>((row) => {
    const compareKey = buildRowKey(row);
    const importMeta: MatchImportMeta = {
      compareKey,
      desiredQuantity: desiredQuantityByKey.get(compareKey) ?? row.quantity,
      importQuantity: row.quantity,
    };

    if (!row.compareName || !row.compareSet || !row.compareNumber) {
      return {
        importMeta,
        row,
        status: "missing",
      };
    }

    const candidates = matchMap.get(buildMatchKey(row.compareSet, row.compareNumber, row.compareName)) ?? [];

    const reviewReason = candidates.map(card => editionReview.get(card.id)).find(Boolean);
    if (reviewReason) return { importMeta, row, status: "review", reviewReason };

    if (candidates.length === 1) {
      const match = candidates[0];
      const setRecord = Array.isArray(match.sets) ? match.sets[0] : match.sets;
      const cardMatch: CardMatch = {
        card_id: match.id,
        gv_id: match.gv_id ?? "",
        name: match.name?.trim() || row.displayName,
        set_name: setRecord?.name?.trim() || row.displaySet,
        set_code: match.set_code?.trim() || null,
        number: match.number?.trim() || row.displayNumber,
      };
      return {
        importMeta,
        row,
        match: cardMatch,
        status: "matched",
      };
    }

    if (candidates.length > 1) {
      const matches: CardMatch[] = candidates.map((candidate) => {
        const setRecord = Array.isArray(candidate.sets) ? candidate.sets[0] : candidate.sets;
        return {
          card_id: candidate.id,
          gv_id: candidate.gv_id ?? "",
          name: candidate.name?.trim() || row.displayName,
          set_name: setRecord?.name?.trim() || row.displaySet,
          set_code: candidate.set_code?.trim() || null,
          number: candidate.number?.trim() || row.displayNumber,
        };
      });
      return {
        importMeta,
        row,
        matches,
        status: "multiple",
      };
    }

    return {
      importMeta,
      row,
      status: "missing",
    };
  });

  const report = createImportReport({
    ...reportBase,
    rowsMatched: previewRows.filter((row) => row.status === "matched").length,
    rowsMissing: previewRows.filter((row) => row.status === "missing" || row.status === "review").length,
  });

  console.info("[import:match]", report);

  return {
    rows: previewRows,
    summary: {
      totalRows: previewRows.length,
      matchedRows: previewRows.filter((row) => row.status === "matched").length,
      multipleRows: previewRows.filter((row) => row.status === "multiple").length,
      unmatchedRows: previewRows.filter((row) => row.status === "missing" || row.status === "review").length,
    },
    report,
  };
}
