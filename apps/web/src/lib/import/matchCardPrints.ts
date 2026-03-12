"use server";

import { createServerComponentClient } from "@/lib/supabase/server";
import {
  normalizeImportNameForCompare,
  normalizeImportNumberForCompare,
  normalizeImportSetForCompare,
} from "@/lib/import/normalizeRow";
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

function normalizeKeyPart(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buildMatchKey(setName: string, number: string, name: string) {
  return `${normalizeKeyPart(setName)}||${(number ?? "").trim()}||${normalizeKeyPart(name)}`;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function matchCardPrints(rows: NormalizedRow[]): Promise<MatchCardPrintsResult> {
  const client = createServerComponentClient();
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
    };
  }

  const { data: setRows, error: setError } = await client.from("sets").select("id,name,code");
  if (setError) {
    throw new Error(setError.message);
  }

  const setNameMap = new Map<string, SetRow[]>();
  for (const setRow of (setRows ?? []) as SetRow[]) {
    const normalizedName = normalizeImportSetForCompare(setRow.name ?? "");
    if (!normalizedName) {
      continue;
    }
    const current = setNameMap.get(normalizedName) ?? [];
    current.push(setRow);
    setNameMap.set(normalizedName, current);
  }

  const candidateSetIds = Array.from(
    new Set(
      rows.flatMap((row) => {
        const matchedSets = setNameMap.get(row.compareSet) ?? [];
        return matchedSets.map((setRow) => setRow.id);
      }),
    ),
  );
  const candidateNumbers = Array.from(new Set(rows.map((row) => row.compareNumber.trim()).filter(Boolean)));

  const candidateRows: CardPrintRow[] = [];

  if (candidateSetIds.length > 0 && candidateNumbers.length > 0) {
    const setIdChunks = chunkArray(candidateSetIds, 100);
    const numberChunks = chunkArray(candidateNumbers, 100);

    for (const setIdChunk of setIdChunks) {
      for (const numberChunk of numberChunks) {
        const { data, error } = await client
          .from("card_prints")
          .select("id,gv_id,name,number,set_id,set_code,sets(name)")
          .in("set_id", setIdChunk)
          .in("number", numberChunk);

        if (error) {
          throw new Error(error.message);
        }

        candidateRows.push(...((data ?? []) as CardPrintRow[]));
      }
    }
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

  const previewRows = rows.map<MatchResult>((row) => {
    if (!row.compareName || !row.compareSet || !row.compareNumber) {
      return {
        row,
        status: "missing",
      };
    }

    const candidates = matchMap.get(buildMatchKey(row.compareSet, row.compareNumber, row.compareName)) ?? [];

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
        row,
        matches,
        status: "multiple",
      };
    }

    return {
      row,
      status: "missing",
    };
  });

  return {
    rows: previewRows,
    summary: {
      totalRows: previewRows.length,
      matchedRows: previewRows.filter((row) => row.status === "matched").length,
      multipleRows: previewRows.filter((row) => row.status === "multiple").length,
      unmatchedRows: previewRows.filter((row) => row.status === "missing").length,
    },
  };
}
