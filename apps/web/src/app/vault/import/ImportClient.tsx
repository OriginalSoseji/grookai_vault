"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseCollectrCSV } from "@/lib/import/parseCollectrCSV";
import { normalizeRow } from "@/lib/import/normalizeRow";
import { matchCardPrints } from "@/lib/import/matchCardPrints";
import { importVaultItems } from "@/lib/import/importVaultItems";
import type { ImportVaultItemsResult, MatchCardPrintsResult, MatchResult } from "@/types/import";

type PreviewFilterKey = "all" | "matched" | "needs-review";

function SummaryPill({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active
          ? "border-slate-300 bg-white text-slate-950 shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
      }`}
    >
      <span className="font-medium text-slate-950">{value}</span> {label}
    </button>
  );
}

function getMatchTone(matchStatus: MatchResult["status"]) {
  if (matchStatus === "matched") {
    return "text-emerald-700";
  }

  if (matchStatus === "multiple") {
    return "text-amber-700";
  }

  return "text-slate-500";
}

export function ImportClient() {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<MatchCardPrintsResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportVaultItemsResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<PreviewFilterKey>("all");
  const [isMatching, startMatchTransition] = useTransition();
  const [isImporting, startImportTransition] = useTransition();

  const matchedRows = useMemo(
    () => preview?.rows.filter((row) => row.status === "matched") ?? [],
    [preview],
  );
  const needsReviewRows = useMemo(
    () => preview?.rows.filter((row) => row.status === "missing" || row.status === "multiple") ?? [],
    [preview],
  );
  const filteredRows = useMemo(() => {
    if (!preview) {
      return [];
    }

    if (activeFilter === "matched") {
      return matchedRows;
    }

    if (activeFilter === "needs-review") {
      return needsReviewRows;
    }

    return preview.rows;
  }, [activeFilter, matchedRows, needsReviewRows, preview]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(null);
    setImportResult(null);
    setParseError(null);
    setActiveFilter("all");

    if (!file) {
      setFileName(null);
      return;
    }

    setFileName(file.name);

    try {
      const csvText = await file.text();
      const parsed = parseCollectrCSV(csvText);
      const normalizedRows = parsed.map(normalizeRow);

      startMatchTransition(async () => {
        try {
          const nextPreview = await matchCardPrints(normalizedRows);
          setPreview(nextPreview);
        } catch (error) {
          setPreview(null);
          setParseError(error instanceof Error ? error.message : "The CSV could not be matched right now.");
        }
      });
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "The CSV could not be parsed.");
    }
  }

  function handleImport() {
    if (!preview || matchedRows.length === 0) {
      return;
    }

    setParseError(null);

    startImportTransition(async () => {
      try {
        const result = await importVaultItems(preview.rows);
        setImportResult(result);
        router.refresh();
      } catch (error) {
        setImportResult(null);
        setParseError(error instanceof Error ? error.message : "The import could not be completed.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm md:px-8">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Vault Import</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-[2.8rem]">Import your collection</h1>
          <p className="text-base leading-7 text-slate-600">Upload a Collectr CSV to match your cards, review the results, and bring them into your vault.</p>
        </div>

        <div className="mt-8 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-950">Upload Collectr CSV</p>
              <p className="text-sm text-slate-600">No file edits required. Grookai will detect columns automatically.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50">
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileChange} />
              Upload file
            </label>
          </div>

          {fileName ? (
            <p className="mt-4 text-sm text-slate-500">
              File: <span className="font-medium text-slate-700">{fileName}</span>
            </p>
          ) : null}
        </div>
      </section>

      {parseError ? (
        <section className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-5 text-sm text-rose-700">
          {parseError}
        </section>
      ) : null}

      {isMatching ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-6 text-sm text-slate-600 shadow-sm">
          Matching your cards against Grookai’s catalog…
        </section>
      ) : null}

      {preview ? (
        <section className="space-y-5 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Import Preview</h2>
              <p className="text-sm text-slate-600">Review the matched rows before anything is written to your vault.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SummaryPill
                label="All"
                value={preview.summary.totalRows}
                active={activeFilter === "all"}
                onClick={() => setActiveFilter("all")}
              />
              <SummaryPill
                label="Matched"
                value={preview.summary.matchedRows}
                active={activeFilter === "matched"}
                onClick={() => setActiveFilter("matched")}
              />
              <SummaryPill
                label="Need Review"
                value={preview.summary.multipleRows + preview.summary.unmatchedRows}
                active={activeFilter === "needs-review"}
                onClick={() => setActiveFilter("needs-review")}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-[1.5rem] border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Set</th>
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
                {filteredRows.map((row) => (
                  <tr key={`${row.row.sourceRow}-${row.row.displayName}-${row.row.displayNumber}`}>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="font-medium text-slate-950">{row.row.displayName}</p>
                        <p className="text-xs text-slate-500">Row {row.row.sourceRow}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.row.displaySet}</td>
                    <td className="px-4 py-3 text-slate-600">{row.row.displayNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{row.row.quantity}</td>
                    <td className={`px-4 py-3 ${getMatchTone(row.status)}`}>
                      {row.status === "matched" && row.match ? (
                        <div className="space-y-1">
                          <p className="font-medium">Matched</p>
                          <p className="text-xs text-slate-500">{row.match.gv_id}</p>
                        </div>
                      ) : row.status === "multiple" ? (
                        "Needs selection"
                      ) : (
                        "Missing match"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-950">Ready to import</p>
              <p className="text-sm text-slate-600">
                {matchedRows.length > 0
                  ? `${matchedRows.length} matched ${matchedRows.length === 1 ? "row is" : "rows are"} ready for import.`
                  : "No matched rows are ready to import yet."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || matchedRows.length === 0}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isImporting ? "Importing…" : "Import to Vault"}
            </button>
          </div>
        </section>
      ) : null}

      {importResult ? (
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 px-6 py-6 text-emerald-900 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Import complete</h2>
            <p className="text-sm leading-7">
              Imported {importResult.importedCards} {importResult.importedCards === 1 ? "card" : "cards"} across{" "}
              {importResult.importedEntries} {importResult.importedEntries === 1 ? "vault entry" : "vault entries"}.
            </p>
            <p className="text-sm leading-7">
              {importResult.needsManualMatch} {importResult.needsManualMatch === 1 ? "row needs" : "rows need"} manual match.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/vault" className="text-sm font-medium underline underline-offset-4">
                View Vault
              </Link>
              <Link href="/vault/import" className="text-sm font-medium underline underline-offset-4">
                Import another file
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
