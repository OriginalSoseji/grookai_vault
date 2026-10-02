"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImportClient } from "./ImportClient";
import { sourceLabel, type CollectionPreviewV2 } from "@/lib/import/collectionPreviewV2";
import { chooseCollectionReviewCandidate } from "@/lib/import/collectionPreviewChoices";
import { getCardPrintingFinishLabel, getPrintedIdentityModifierDisplayLabel, getVariantDisplayLabel } from "@/lib/cards/displayDiscriminator";
import type { CollectionAttemptV2, CollectionReceiptV2 } from "@/lib/import/collectionReadbackV2";

export function CollectionImportClientV2({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false), [legacy, setLegacy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<CollectionPreviewV2 | null>(null);
  const [pending, setPending] = useState<CollectionAttemptV2 | null>(null);
  const [receipt, setReceipt] = useState<CollectionReceiptV2 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [newRequest, setNewRequest] = useState(false);
  const [filter, setFilter] = useState<"all" | "ready" | "review">("all"), [limit, setLimit] = useState(50);
  const csv = useRef(""), generation = useRef(0), active = useRef(false);
  const attemptRef = useRef<CollectionAttemptV2 | null>(null);
  const storageKey = `vault-import:v2:${ownerId}`;

  useEffect(() => {
    let mounted = true;
    const generationRef = generation;
    queueMicrotask(() => {
      if (!mounted) return;
      try {
        setLegacy(!!sessionStorage.getItem(`vault-import:v1:${ownerId}`));
        const raw = sessionStorage.getItem(storageKey);
        if (raw) {
          const saved = JSON.parse(raw) as CollectionAttemptV2;
          if (saved.version !== 2 || saved.ownerUserId !== ownerId || typeof saved.csvText !== "string" || typeof saved.requestId !== "string" || !Array.isArray(saved.targets)) throw new Error("recovery");
          attemptRef.current = saved; setPending(saved); setFileName(saved.fileName);
        }
        setReady(true);
      } catch { setError("The saved import could not be read. Keep the original CSV and restore browser storage before continuing."); }
    });
    return () => { mounted = false; generationRef.current++; };
  }, [ownerId, storageKey]);

  async function send(body: unknown) {
    const encoded = JSON.stringify(body);
    if (new TextEncoder().encode(encoded).length > 2097152) throw new Error("This import exceeds the 2 MiB request limit. Split the CSV into smaller files.");
    const response = await fetch("/api/vault/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: encoded });
    return { response, data: await response.json() };
  }
  async function chooseFile(file?: File) {
    if (!file || active.current || attemptRef.current) return;
    const current = ++generation.current;
    active.current = true; setBusy(true); setError(null); setPreview(null); setReceipt(null); setFileName(file.name); setFilter("all"); setLimit(50);
    try {
      if (file.size > 2097152) throw new Error("This CSV exceeds the 2 MiB limit.");
      const original = await file.text();
      const { response, data } = await send({ operation: "preview", ownerUserId: ownerId, csvText: original });
      if (current !== generation.current) return;
      if (!response.ok) throw new Error(data.error);
      if (data.ownerId !== ownerId || !Array.isArray(data.rows)) throw new Error("The preview could not be confirmed.");
      csv.current = original; setPreview(data);
    } catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : "The preview could not be loaded. Nothing was saved."); }
    finally { active.current = false; if (current === generation.current) setBusy(false); }
  }
  async function save() {
    if (!ready || active.current || (!attemptRef.current && !preview)) return;
    const current = generation.current;
    let attempt = attemptRef.current;
    if (!attempt) attempt = { version: 2, ownerUserId: ownerId, requestId: crypto.randomUUID(), csvText: csv.current,
      targets: preview!.rows.flatMap(row => row.selection ? [row.selection] : []), fileName };
    else if (newRequest) attempt = { ...attempt, requestId: crypto.randomUUID() };
    try {
      // The original CSV and selection remain frozen across network loss/reload.
      sessionStorage.setItem(storageKey, JSON.stringify(attempt));
      if (sessionStorage.getItem(storageKey) !== JSON.stringify(attempt)) throw new Error("storage");
    } catch { setError("Browser storage could not retain this import. Enable it before saving; nothing was sent."); return; }
    attemptRef.current = attempt; setPending(attempt); setNewRequest(false); active.current = true; setBusy(true); setError(null);
    try {
      const { response, data } = await send({ operation: "save", ownerUserId: ownerId, attempt });
      if (current !== generation.current) return;
      if (!response.ok) {
        setNewRequest(data.retryWithNewRequest === true); throw new Error(data.error);
      }
      if (data.success !== true || data.requestId !== attempt.requestId) throw new Error("The saved result could not be confirmed. Retry this same import.");
      setReceipt(data); setPreview(null);
      // Keep recovery active if storage cleanup fails; replay remains safe.
      sessionStorage.removeItem(storageKey);
      attemptRef.current = null; setPending(null); csv.current = "";
      router.refresh();
    } catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : "The save result could not be confirmed. Retry this same import safely."); }
    finally { active.current = false; if (current === generation.current) setBusy(false); }
  }
  function chooseCandidate(sourceIndices: number[], cardId: string | null) {
    if (!preview || active.current || attemptRef.current || busy || pending) return;
    try { setPreview(chooseCollectionReviewCandidate(preview, sourceIndices, cardId)); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "This choice could not be confirmed."); }
  }
  async function reviewFailedAttempt() {
    const attempt = attemptRef.current;
    // Only a confirmed failed transaction may release its frozen selection.
    // Network uncertainty must retain the same request and target IDs.
    if (!attempt || !newRequest || active.current) return;
    const current = generation.current;
    active.current = true; setBusy(true); setError(null);
    try {
      const { response, data } = await send({ operation: "preview", ownerUserId: ownerId, csvText: attempt.csvText });
      if (current !== generation.current) return;
      if (!response.ok || data.ownerId !== ownerId || !Array.isArray(data.rows)) throw new Error("The preview could not be refreshed. Your saved attempt is still retained.");
      sessionStorage.removeItem(storageKey);
      if (sessionStorage.getItem(storageKey) !== null) throw new Error("Browser storage could not release the failed attempt. Keep the original file and retry.");
      csv.current = attempt.csvText; attemptRef.current = null;
      setPending(null); setNewRequest(false); setPreview(data); setReceipt(null); setFilter("all"); setLimit(50);
    } catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : "The preview could not be refreshed."); }
    finally { active.current = false; if (current === generation.current) setBusy(false); }
  }
  if (legacy) return <ImportClient ownerId={ownerId} recoveryOnly onRecovered={() => setLegacy(false)} />;
  const rows = preview?.rows.filter(row => filter === "all" || (filter === "ready" ? !!row.selection : !row.selection)) ?? [];
  return <div className="space-y-6">
    <header className="space-y-3"><p className="text-sm font-medium uppercase tracking-wider text-slate-500">Vault Import</p>
      <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Import your collection</h1>
      <p className="max-w-2xl text-slate-600 dark:text-slate-300">Upload your original Collectr CSV. Review exact cards and finishes before saving. Rows that need review stay in your saved import with their original details.</p></header>
    <section className="rounded-xl border border-slate-200 p-5 dark:border-white/15">
      <label className="block font-medium" htmlFor="collectr-csv">Choose Collectr CSV</label>
      <input id="collectr-csv" className="mt-3 block max-w-full text-sm" type="file" accept=".csv,text/csv" disabled={!ready || busy || !!pending} onChange={event => void chooseFile(event.target.files?.[0])} />
      {fileName && <p className="mt-3 break-all text-sm text-slate-500">{fileName}</p>}
      {busy && <p role="status" className="mt-3">{pending ? "Saving and verifying your import…" : "Checking the complete catalog and printing details…"}</p>}
    </section>
    {error && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">{error}</p>}
    {pending && <section className="rounded-xl border border-sky-200 p-5"><h2 className="font-semibold">Import waiting for confirmation</h2><p className="mt-2 text-sm">Retry this saved attempt to confirm the outcome. Keep the original file; retrying will not add the same imported copies again.</p></section>}
    {pending && newRequest && <button type="button" disabled={busy} className="rounded-lg border px-4 py-3 disabled:opacity-50" onClick={() => void reviewFailedAttempt()}>Review selections again</button>}
    {receipt && <section role="status" className="rounded-xl border border-emerald-300 p-5"><h2 className="font-semibold">Import verified</h2><p className="mt-2">{receipt.importedCards} copies added. {receipt.reviewRows} source rows retained for review.</p><p className="mt-2 text-sm">Grades and other unsupported details remain in the original source; review rows have not been added as owned cards.</p><Link className="mt-3 inline-block underline" href="/vault">Open your Vault</Link></section>}
    {preview && <section className="space-y-4">
      <p>{preview.sourceRows} source rows · {preview.readyRows} ready ({preview.readyCopies} copies) · {preview.reviewRows} need review</p>
      <div className="flex flex-wrap gap-2" aria-label="Preview filters">{(["all", "ready", "review"] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} className={`rounded-full border px-4 py-2 text-sm ${filter === value ? "bg-slate-900 text-white" : "border-slate-300"}`} onClick={() => { setFilter(value); setLimit(50); }}>{value === "all" ? "All rows" : value === "ready" ? "Ready" : "Needs review"}</button>)}</div>
      <div className="space-y-3">{rows.slice(0, limit).map(row => <article key={row.sourceIndices.join(",")} className="rounded-xl border border-slate-200 p-4 dark:border-white/15">
        <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{sourceLabel(row.source, "product name", "card name") || "Unnamed product"}</h3><span className={row.selection ? "text-emerald-700" : "text-amber-700"}>{row.review?.selectedCardId ? "Ready · Chosen by you" : row.selection ? "Ready" : "Needs review"}</span></div>
        <p className="mt-1 text-sm text-slate-500">{sourceLabel(row.source, "set", "series")} · #{sourceLabel(row.source, "card number", "number") || "—"} · Quantity: {row.quantity ?? sourceLabel(row.source, "quantity", "qty")}</p>
        <p className="mt-2 text-sm">{row.reason ?? `${row.matchedName} · ${row.finish}`}</p>
        {row.review && <details className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-white/15">
          <summary className="cursor-pointer font-medium">Review matching cards ({row.review.candidates.length})</summary>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Compare the card, variant and finish with your copy. Choose only a match you can confirm; otherwise keep this row for review. Card links open in a new tab.</p>
          <fieldset disabled={busy || !!pending} className="mt-3 space-y-3">
            <legend className="sr-only">Card choice for source rows {row.sourceIndices.map(i => i + 2).join(", ")}</legend>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3">
              <input type="radio" name={`choice-${row.sourceIndices.join("-")}`} checked={row.review.selectedCardId === null} onChange={() => chooseCandidate(row.sourceIndices, null)} />
              <span>Keep in review</span>
            </label>
            {row.review.candidates.map(candidate => {
              const variant = candidate.variantKey?.startsWith("scryfall:") ? null : getVariantDisplayLabel(candidate.variantKey);
              const modifier = getPrintedIdentityModifierDisplayLabel(candidate.printedIdentityModifier);
              const details = [...new Set([variant, modifier].filter(Boolean))].join(" · ");
              const finish = getCardPrintingFinishLabel({ finishKey: candidate.finish }) || candidate.finish;
              const href = `/card/${encodeURIComponent(candidate.gvId)}${candidate.selection?.cardPrintingId ? `?printing=${encodeURIComponent(candidate.selection.cardPrintingId)}` : ""}`;
              return <div key={candidate.cardId} className="rounded-lg border p-3">
                <label className="flex min-h-11 cursor-pointer items-start gap-3">
                  <input type="radio" className="mt-1" name={`choice-${row.sourceIndices.join("-")}`} checked={row.review!.selectedCardId === candidate.cardId} disabled={!candidate.selection} onChange={() => chooseCandidate(row.sourceIndices, candidate.cardId)} />
                  <span className="min-w-0 break-words"><span className="block font-medium">{candidate.name} · #{candidate.number}</span>
                    <span className="block text-sm">{candidate.setName}{candidate.setCode ? ` (${candidate.setCode})` : ""}</span>
                    <span className="block text-sm">{details || "Variant not specified in catalog"}{finish ? ` · ${finish}` : ""}</span>
                    <span className="block text-xs text-slate-500">Catalog reference: {candidate.gvId}</span>
                  </span>
                </label>
                {candidate.unavailableReason && <p className="mt-2 text-sm text-amber-700">{candidate.unavailableReason}</p>}
                <Link href={href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block py-2 text-sm underline" aria-label={`View ${candidate.name}, ${candidate.gvId}, card and printing`}>View card and printing</Link>
              </div>;
            })}
          </fieldset>
        </details>}
        <details className="mt-3 text-sm"><summary className="cursor-pointer">Original CSV details · row{row.sourceIndices.length > 1 ? "s" : ""} {row.sourceIndices.map(i => i + 2).join(", ")}</summary>
          {row.sourceRecords.map((record, index) => <div key={row.sourceIndices[index]} className="mt-3"><p className="font-medium">Source row {row.sourceIndices[index] + 2}</p><dl className="mt-2 grid gap-2 sm:grid-cols-2">{Object.entries(record).map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-slate-500">{key}</dt><dd className="break-words whitespace-pre-wrap">{value || "—"}</dd></div>)}</dl></div>)}</details>
      </article>)}</div>
      {rows.length > limit && <button type="button" className="rounded-lg border px-4 py-2" onClick={() => setLimit(limit + 50)}>Show more ({rows.length - limit} remaining)</button>}
    </section>}
    {(preview || pending) && <button type="button" className="rounded-xl bg-slate-900 px-6 py-3 font-medium text-white disabled:opacity-50" disabled={!ready || busy} onClick={() => void save()}>{busy ? "Please wait…" : pending ? "Retry saved import" : `Save ${preview!.readyCopies} ready copies and retain review rows`}</button>}
  </div>;
}
