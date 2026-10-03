"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseCollectrCSV } from "@/lib/import/parseCollectrCSV";
import { normalizeRow } from "@/lib/import/normalizeRow";
import { matchCardPrints } from "@/lib/import/matchCardPrints";
import { importVaultItems } from "@/lib/import/importVaultItems";
import { parseStoredImportAttempt, prepareImportTargets, type StoredImportAttempt } from "@/lib/import/importAttempt";
import type { ImportVaultItemsResult, MatchCardPrintsResult, MatchResult } from "@/types/import";

type PreviewFilterKey = "all" | "matched" | "needs-review";

function getImportErrorMessage(stage: "parse" | "match" | "write") {
  if (stage === "parse") {
    return "This file could not be read as a Collectr CSV. Check the file and try again.";
  }
  if (stage === "match") {
    return "The card catalog could not be checked right now. Nothing was added to your Vault.";
  }
  return "The save result could not be confirmed. Retry this same import to recover its result safely.";
}

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

  if (matchStatus === "multiple" || matchStatus === "review") {
    return "text-amber-700";
  }

  return "text-slate-500";
}

export function ImportClient({ ownerId, recoveryOnly = false, onRecovered }: { ownerId: string; recoveryOnly?: boolean; onRecovered?: () => void }) {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<(MatchCardPrintsResult & { alreadySatisfiedRows?: number }) | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportVaultItemsResult | null>(null);
  const [activeFilter, setActiveFilter] = useState<PreviewFilterKey>("all");
  const [isMatching, startMatchTransition] = useTransition();
  const [isImporting, startImportTransition] = useTransition();
  const [pendingAttempt, setPendingAttempt] = useState<StoredImportAttempt | null>(null);
  const [failedAttempt, setFailedAttempt] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const attemptRef = useRef<StoredImportAttempt | null>(null);
  const fileGeneration = useRef(0);
  const storageKey = `vault-import:v1:${ownerId}`;

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted) return;
      try {
        const recovered = parseStoredImportAttempt(sessionStorage.getItem(storageKey), ownerId);
        if (recovered) {
          attemptRef.current = recovered;
          setPendingAttempt(recovered);
          setFileName(recovered.fileName);
        }
      } catch { /* The save handler requires durable tab storage before dispatch. */ }
      setRecoveryReady(true);
    });
    return () => { mounted = false; };
  }, [ownerId, storageKey]);

  const matchedRows = useMemo(
    () => preview?.rows.filter((row) => row.status === "matched") ?? [],
    [preview],
  );
  const needsReviewRows = useMemo(
    () => preview?.rows.filter((row) => row.status !== "matched") ?? [],
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
    if (recoveryOnly || attemptRef.current || isImporting) return;
    const generation = ++fileGeneration.current;
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
          if (generation !== fileGeneration.current) return;
          setPreview({ ...nextPreview, alreadySatisfiedRows: Math.max(0, nextPreview.report.rowsValid - nextPreview.rows.length) });
        } catch {
          if (generation !== fileGeneration.current) return;
          setPreview(null);
          setParseError(getImportErrorMessage("match"));
        }
      });
    } catch {
      if (generation !== fileGeneration.current) return;
      setParseError(getImportErrorMessage("parse"));
    }
  }

  function handleImport() {
    if (!recoveryReady || isImporting || (!attemptRef.current && (!preview || matchedRows.length === 0))) {
      return;
    }
    setParseError(null);
    let attempt = attemptRef.current;
    if (!attempt || failedAttempt) {
      attempt = { version: 1, ownerId, requestId: crypto.randomUUID(), rows: attempt?.rows ?? preview!.rows, fileName };
    }
    try {
      prepareImportTargets(attempt.rows, attempt.requestId);
      // Freeze before dispatch; retries and reloads must reuse the same totals.
      sessionStorage.setItem(storageKey, JSON.stringify(attempt));
    } catch {
      setParseError("Recovery could not be saved in this tab. Enable browser storage or use a smaller file before importing.");
      return;
    }
    attemptRef.current = attempt;
    setPendingAttempt(attempt);
    setFailedAttempt(false);
    const submitted = attempt;

    startImportTransition(async () => {
      try {
        const result = await importVaultItems(submitted.rows, { ownerId, requestId: submitted.requestId });
        if (!result.ok) {
          setParseError(result.message);
          setFailedAttempt(result.errorCode === "failed");
          if (result.errorCode === "invalid") {
            attemptRef.current = null;
            setPendingAttempt(null);
            try { sessionStorage.removeItem(storageKey); } catch { /* no write was admitted */ }
          }
          return;
        }
        setImportResult(result);
        setPreview(null);
        attemptRef.current = null;
        setPendingAttempt(null);
        try { sessionStorage.removeItem(storageKey); } catch { /* receipt recovery remains safe */ }
        router.refresh();
        onRecovered?.();
      } catch {
        setImportResult(null);
        setParseError(getImportErrorMessage("write"));
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="border-b border-slate-200 pb-8 dark:border-white/[0.08]">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Vault Import</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-[2.8rem]">Import your collection</h1>
          <p className="text-base leading-7 text-slate-600">Upload a Collectr CSV to match your cards, review the results, and bring them into your vault.</p>
        </div>

        <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-950">Upload Collectr CSV</p>
              <p className="text-sm text-slate-600">No file edits required. Grookai will detect columns automatically.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50">
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileChange} disabled={recoveryOnly || !recoveryReady || isImporting || Boolean(pendingAttempt)} />
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
        <section className="rounded-lg border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700" role="alert">
          {parseError}
        </section>
      ) : null}

      {pendingAttempt ? (
        <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950" role="status">
          <p>{failedAttempt ? "The previous attempt rolled back. You can retry the same file as a new attempt." : "A previous save may have completed. Retry to recover its saved result before uploading another file."}</p>
          <button type="button" disabled={isImporting} onClick={handleImport} className="rounded-full bg-slate-950 px-5 py-2.5 font-medium text-white disabled:opacity-50">
            {isImporting ? "Checking import…" : "Retry import"}
          </button>
        </section>
      ) : null}

      {isMatching ? (
        <section className="border-y border-slate-200 py-5 text-sm text-slate-600 dark:border-white/[0.08]" role="status">
          Matching your cards against Grookai’s catalog…
        </section>
      ) : null}

      {preview ? (
        <section className="space-y-5 border-y border-slate-200 py-6 dark:border-white/[0.08]">
          {preview.alreadySatisfiedRows ? <p className="text-sm text-slate-600" role="status">
            {preview.alreadySatisfiedRows} {preview.alreadySatisfiedRows === 1 ? "row already meets" : "rows already meet"} {preview.alreadySatisfiedRows === 1 ? "its" : "their"} requested quantity in your Vault. No additional copies are needed for {preview.alreadySatisfiedRows === 1 ? "that row" : "those rows"}.
          </p> : null}
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

          <div className="overflow-x-auto rounded-lg border border-slate-200">
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
                          <p className="font-medium">Exact card matched</p>
                          <p className="text-xs text-slate-600">
                            {row.match.name ?? row.row.displayName} · {row.match.set_name ?? row.row.displaySet} · #{row.match.number ?? row.row.displayNumber}
                          </p>
                          <p className="text-xs text-slate-500">Grookai ID {row.match.gv_id}</p>
                        </div>
                      ) : row.status === "review" ? (
                        <p role="status">{row.reviewReason}</p>
                      ) : row.status === "multiple" ? (
                        `${row.matches?.length ?? 0} possible exact cards — not imported`
                      ) : (
                        "Missing match"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
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
              disabled={isImporting || Boolean(pendingAttempt) || matchedRows.length === 0 || !recoveryReady}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isImporting ? "Importing…" : "Import to Vault"}
            </button>
          </div>
        </section>
      ) : null}

      {importResult ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-6 text-emerald-900" role="status">
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
