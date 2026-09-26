"use client";
/* eslint-disable @next/next/no-img-element -- Draft scans are private browser Blob URLs. */
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, CloudUpload, ImagePlus, Layers3, Pencil, RotateCw, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { BATCH_LIMIT, BATCH_TOTAL_LIMIT, applyBatchDefaults, commitSelection, defaultBatchSettings, itemProblem, naturalFileOrder, newIntakeBatch, pairAssets, selectBatchMatch, type BatchAsset, type BatchItem, type BatchSettings, type IntakeBatch } from "@/lib/stores/batchIntake";
import { clearIntakeBatch, intakePreset, loadIntakeBatch, saveIntakeBatch, restoreIntakeBatch } from "@/lib/stores/batchIntakeStorage";
import { exportBatchBackup, importBatchBackup } from "@/lib/stores/batchBackup";
import { BATCH_IMAGE_ACCEPT, decodeIntakeImage, intakeAsset } from "@/lib/stores/batchIntakeImages";
import { COPY_CONDITIONS, type CatalogChoice } from "@/lib/stores/storeInventoryInput";
import { storeRequest, type OwnerModel } from "./storeManagerClient";
import s from "./StoreManager.module.css";
import { useScanSuggestions } from "./useScanSuggestions";
import { assertSubmittedItemsRetained, freezeBatchSubmission, reconcileBatchCancellation, retryCancelledItem, type BatchCancellation } from "@/lib/stores/batchSubmission";

function ScanImage({ asset, alt }: { asset?: BatchAsset; alt: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!asset?.preview) { setUrl(""); return; }
    const objectUrl = URL.createObjectURL(asset.preview); setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [asset?.preview]);
  return url ? <img src={url} alt={alt} /> : <div className={s.cardPlaceholder}>{asset?.error || "Image needed"}</div>;
}
function Settings({ value, change, owner, prefix }: { value: BatchSettings; change: (settings: BatchSettings) => void; owner: OwnerModel; prefix: string }) {
  const patch = (v: Partial<BatchSettings>) => change({ ...value, ...v });
  return <><div className={s.grid}>
    <label>Condition<select aria-label={`${prefix} condition`} value={value.condition} onChange={e => patch({ condition: e.target.value })}>{COPY_CONDITIONS.map(c => <option key={c}>{c}</option>)}</select></label>
    <label>Sale status<select aria-label={`${prefix} sale status`} value={value.intent} onChange={e => patch({ intent: e.target.value as BatchSettings["intent"] })}><option value="hold">Keep private / hold</option><option value="sell">For sale</option></select></label>
    <label>Asking price<input aria-label={`${prefix} asking price`} inputMode="decimal" placeholder="Optional for private copies" value={value.amount} onChange={e => patch({ amount: e.target.value })} /></label>
    <label>Currency<input aria-label={`${prefix} currency`} maxLength={3} value={value.currency} onChange={e => patch({ currency: e.target.value.toUpperCase() })} /></label>
    <label>Storage location<input aria-label={`${prefix} box / bin / location`} maxLength={120} value={value.location} onChange={e => patch({ location: e.target.value })} placeholder="Box B · Row 3" /></label>
  </div><div className={s.batchSections}><span className={s.fieldCaption}>Sections</span>{owner.sections.map(section => <label className={s.check} key={section.id}><input type="checkbox" checked={value.sections.includes(section.id)} onChange={e => patch({ sections: e.target.checked ? [...value.sections, section.id] : value.sections.filter(id => id !== section.id) })} />{section.name}</label>)}</div></>;
}

export default function StoreBatchIntake({ owner, close, refresh, onPendingChange }: { owner: OwnerModel; close: () => void; refresh: () => Promise<void>; onPendingChange?: (pending: boolean) => void }) {
  const storeId = owner.store!.id;
  const [batch, setBatch] = useState<IntakeBatch | null>(null), current = useRef<IntakeBatch | null>(null);
  const revision = useRef(0), queue = useRef<Promise<void>>(Promise.resolve()), failed = useRef(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false), [saving, setSaving] = useState(0);
  const [storageFailed, setStorageFailed] = useState(false), [activeId, setActiveId] = useState("");
  const [filter, setFilter] = useState("all"), [query, setQuery] = useState(""), [results, setResults] = useState<CatalogChoice[]>([]), [more, setMore] = useState(false), [offset, setOffset] = useState(0), [searched, setSearched] = useState("");
  const [replaceOverrides, setReplaceOverrides] = useState(false), [reviewList, setReviewList] = useState<boolean | null>(null), [sectionName, setSectionName] = useState("");
  const [capabilities, setCapabilities] = useState({ commit: false, recognition: false, cancellation: false });
  const [autoMatch, setAutoMatch] = useState(true);
  const backupInput = useRef<HTMLInputElement>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<IntakeBatch | null>(null);
  const [cancelReview, setCancelReview] = useState<string | null>(null);
  const upload = useRef<HTMLInputElement>(null), replacement = useRef<HTMLInputElement>(null), replacementSide = useRef<"front" | "back">("front");
  const processing = useRef(false);
  useEffect(() => {
    onPendingChange?.(busy || saving > 0);
    return () => onPendingChange?.(false);
  }, [busy, saving, onPendingChange]);
  useEffect(() => {
    let mounted = true;
    loadIntakeBatch(storeId).then(saved => {
      if (!mounted) return;
      const draft = saved ?? newIntakeBatch(storeId); current.current = draft; revision.current = draft.revision;
      setBatch(draft); setActiveId(draft.items[0]?.id || "");
    }).catch(e => { if (mounted) { setError(e.message); setStorageFailed(true); failed.current = true; } });
    storeRequest<{ commit: boolean; recognition: boolean; cancellation: boolean }>("/api/stores/owner/intake").then(value => { if (mounted) setCapabilities(value); }).catch(() => undefined);
    return () => { mounted = false; };
  }, [storeId]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (saving || busy) event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [saving, busy]);
  function change(update: (value: IntakeBatch) => IntakeBatch): Promise<void> {
    if (!current.current || failed.current) return Promise.reject(new Error("Reopen the batch to restore draft storage."));
    const next = update(current.current); assertSubmittedItemsRetained(current.current, next); current.current = next; setBatch(next); setSaving(n => n + 1);
    const saved = queue.current.then(async () => {
      if (failed.current) throw new Error("Draft storage needs attention.");
      const result = await saveIntakeBatch({ ...next, revision: revision.current }); revision.current = result.revision;
      if (current.current) current.current.revision = result.revision;
    });
    queue.current = saved.catch(e => { failed.current = true; setStorageFailed(true); setError(e.message); }).finally(() => setSaving(n => n - 1));
    return saved;
  }
  const edit = (update: (value: IntakeBatch) => IntakeBatch) => { void change(update).catch(() => undefined); };
  const patchItem = (id: string, patch: Partial<BatchItem>) => edit(b => ({ ...b, items: b.items.map(i => i.id === id && !i.receipt && !i.submission ? { ...i, ...patch, confirmed: false, error: null } : i) }));
  async function run(work: () => Promise<void>) {
    if (processing.current) return;
    processing.current = true; setBusy(true); setError(""); setNotice("");
    try { await queue.current; if (failed.current) throw new Error("Draft storage needs attention. Reopen this batch before continuing."); await work(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not finish. Your batch is retained."); }
    finally { processing.current = false; setBusy(false); }
  }
  async function ingest(files: File[]) {
    const value = current.current!;
    if (value.items.some(i => i.receipt)) throw new Error("Finish this batch and start a new one before adding scans.");
    const ordered = naturalFileOrder(files), lastItem = value.items.at(-1);
    const fillsBack = value.layout === "pairs" && lastItem && !lastItem.back && (lastItem.requiresBack ?? true) ? 1 : 0;
    const newCopies = value.layout === "pairs" ? Math.ceil(Math.max(0, ordered.length - fillsBack) / 2) : ordered.length;
    if (value.items.length + newCopies > BATCH_LIMIT) throw new Error(`Use at most ${BATCH_LIMIT} copies in this batch.`);
    if ([...value.assets.map(a => a.original), ...ordered].reduce((sum, file) => sum + file.size, 0) > BATCH_TOTAL_LIMIT) throw new Error("Keep original scans under 250 MB per batch.");
    // Conversion is deliberately sequential to bound HEIC decoder memory.
    let added = 0;
    for (const file of ordered) {
      setNotice(`Preparing ${++added} of ${ordered.length}: ${file.name}`);
      const asset = await intakeAsset(file);
      if (current.current!.assets.some(a => a.hash === asset.hash) && !window.confirm(`${file.name} is identical to an image already in this batch. Add it as another physical copy/side?`)) continue;
      await change(b => {
        const assets = [...b.assets, asset];
        // Appending preserves reviewed item IDs, settings and receipts.
        const last = b.items[b.items.length - 1];
        const items = b.layout === "pairs" && last && !last.submission && !last.receipt && !last.back && (last.requiresBack ?? true)
          ? b.items.map(i => i.id === last.id ? { ...i, back: asset.id, confirmed: false } : i)
          : [...b.items, ...pairAssets([asset], b.layout, b.defaults)];
        if (!activeId && items.length) setActiveId(items[0].id);
        return { ...b, assets, items };
      });
    }
    setNotice("Scans saved on this computer. Review the pairing and choose each card's match.");
  }
  const visible = batch ? batch.items.filter(i => filter === "all" || (filter === "ready" ? !i.receipt && !itemProblem(batch, i) : filter === "done" ? Boolean(i.receipt) : !i.receipt && Boolean(itemProblem(batch, i)))) : [];
  const active = visible.find(item => item.id === activeId) ?? visible[0];
  const asset = (id?: string | null) => batch?.assets.find(a => a.id === id);
  const scan = asset(active?.front);
  const suggestions = useScanSuggestions(active ? `${storeId}:${active.id}:${active.front}:${active.rotation}` : "", scan?.preview ?? undefined,
    capabilities.recognition && autoMatch && !active?.receipt && !active?.card && !busy && !storageFailed);
  async function chooseSuggestion(card: CatalogChoice & { rotation?: number }) {
    if (!active || !scan || active.receipt || active.submission) return;
    const snapshot = { id: active.id, front: active.front, rotation: active.rotation };
    const correction = card.rotation ?? 0;
    if (![0, 90, 180, 270].includes(correction)) throw new Error("Invalid scan orientation.");
    const rotation = (snapshot.rotation + correction) % 360;
    const preview = correction ? await decodeIntakeImage(scan.original, scan.name, rotation) : scan.preview;
    await change(b => {
      const target = b.items.find(i => i.id === snapshot.id);
      if (!target || target.receipt || target.submission || target.front !== snapshot.front || target.rotation !== snapshot.rotation) throw new Error("This scan changed. Match the current front again.");
      return { ...b, assets: b.assets.map(a => a.id === snapshot.front ? { ...a, preview, error: null } : a),
        items: b.items.map(i => i.id === snapshot.id ? { ...selectBatchMatch(i, card), rotation } : i) };
    });
  }
  const move = (step: number) => {
    if (!batch) return;
    const index = visible.findIndex(i => i.id === active?.id), next = visible[index + step];
    if (next) { setActiveId(next.id); setResults([]); setQuery(""); }
  };
  async function search(next = 0, term = query) {
    const result = await storeRequest<{ cards: CatalogChoice[]; more: boolean }>(`/api/stores/owner/inventory?${new URLSearchParams({ q: term, offset: String(next) })}`);
    setResults(result.cards); setMore(result.more); setOffset(next); setSearched(term);
  }
  async function replace(file: File, side: "front" | "back") {
    if (!active || active.submission) return;
    if (batch!.assets.reduce((sum, a) => sum + a.original.size, file.size) > BATCH_TOTAL_LIMIT) throw new Error("This batch has reached its 250 MB storage limit. Start another batch.");
    const image = await intakeAsset(file);
    await change(b => ({ ...b, assets: [...b.assets, image], items: b.items.map(i => i.id === active.id ? { ...i, [side]: image.id, rotation: side === "front" ? 0 : i.rotation, ...(side === "front" ? { card: null, printing: "" } : {}), confirmed: false, error: null } : i) }));
  }
  async function commit() {
    const value = current.current!, items = commitSelection(value, Boolean(reviewList));
    for (const item of items) {
      setNotice(`Adding ${item.card!.name}…`);
      try {
        const submission = await freezeBatchSubmission(value, item, Boolean(reviewList));
        // Persist the exact request and media before the first network write.
        if (!item.submission) await change(b => ({ ...b, items: b.items.map(i => i.id === item.id ? { ...i, submission } : i) }));
        const prepared = await storeRequest<{ completed: boolean }>("/api/stores/owner/intake", submission.request);
        if (!prepared.completed) {
          for (const side of ["front", "back"] as const) {
            const bytes = submission[side]; if (!bytes) continue;
            const response = await fetch(`/api/stores/owner/intake/media?${new URLSearchParams({ batch: value.id, item: item.id, side })}`, {
              method: "POST", credentials: "same-origin", cache: "no-store", headers: { "content-type": bytes.type || "image/jpeg" }, body: bytes,
            });
            if (!response.ok) { const result = await response.json().catch(() => null); throw new Error(result?.error || "Photo upload interrupted. Resume this copy."); }
          }
        }
        const receipt = await storeRequest<{ id: string; gvvi: string }>("/api/stores/owner/intake/finish", { batch_id: value.id, item_id: item.id });
        await change(b => ({ ...b, items: b.items.map(i => i.id === item.id ? { ...i, receipt, error: null } : i) }));
      } catch (e) {
        setNotice("Batch paused. Resume selected copies to continue their saved submissions.");
        await change(b => ({ ...b, items: b.items.map(i => i.id === item.id ? { ...i, error: e instanceof Error ? e.message : "Could not confirm this copy." } : i) }));
        throw e;
      }
    }
    setReviewList(null); await refresh(); setNotice("Selected copies added. Their receipts are saved with this batch.");
  }
  async function cancelAttempt(item: BatchItem) {
    const result = await storeRequest<BatchCancellation>("/api/stores/owner/intake/cancel", { batch_id: current.current!.id, item_id: item.id });
    await change(b => reconcileBatchCancellation(b, item.id, result));
    if (result.completed) { await refresh(); setNotice("This copy already finished. Its inventory receipt has been recovered."); }
    else setNotice("Attempt cancelled. You can edit this copy or clear the batch safely.");
    setReviewList(null); setCancelReview(null);
  }
  async function editCancelled(item: BatchItem) {
    const next = retryCancelledItem(item);
    await change(b => ({ ...b, items: b.items.map(i => i.id === item.id ? next : i) }));
    setActiveId(next.id); setReviewList(null);
    setNotice("Review the card, finish and details again before adding this new attempt.");
  }
  async function downloadBackup() {
    if (processing.current || !current.current) return;
    processing.current = true; setBusy(true); setError("");
    try {
      // Even a storage failure must not prevent exporting the in-memory draft.
      await queue.current;
      const blob = await exportBatchBackup(current.current!, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = `grookai-batch-${current.current!.id}.gvbatch`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotice("Backup download started. Keep this file private: it contains your scans and listing details. Save a new backup after further changes.");
    } catch (e) { setError(e instanceof Error ? e.message : "Backup could not be created. Keep this browser open."); }
    finally { processing.current = false; setBusy(false); }
  }
  if (!batch) return <div className={s.inventoryEditor}><h3>Upload scans</h3><p role={error ? "alert" : "status"}>{error || "Opening your saved batch…"}</p><button onClick={close}>Close</button></div>;
  const remaining = batch.items.filter(i => !i.receipt && !i.cancelled), ready = remaining.filter(i => !itemProblem(batch, i));

  return <div className={s.intake}>
    <div className={s.intakeHeading}><div><span className={s.eyebrow}>Inventory / Scan intake</span><h2>{batch.items.length ? "Review your scans" : "Add a card batch"}</h2><p>Match the card. Set the details. Make it yours.</p></div><button className={s.iconButton} disabled={busy || saving > 0} onClick={close} aria-label="Close batch"><X size={18} /></button></div>
    <div className={s.intakeProgress} aria-label="Batch progress"><span data-current={!batch.items.length}><span>{batch.items.length ? <Check size={12} /> : "1"}</span>Upload scans</span><i /><span data-current={batch.items.length > 0}><span>2</span>Review & match</span><i /><span><span>3</span>Add to inventory</span></div>
    <div className={s.intakeStatus}><span role="status"><ShieldCheck size={14} />{storageFailed ? "Draft saving stopped" : saving ? "Saving draft…" : "Saved on this computer"}</span><span>{batch.items.length} copies <b>·</b> {ready.length} ready <b>·</b> {batch.items.filter(i => i.receipt).length} added</span></div>
    {error && <p role="alert" className={`${s.notice} ${s.error}`}>{error}</p>}{notice && <p role="status" className={s.notice}>{notice}</p>}
    <details className={s.batchSetup}><summary>Backup & recovery</summary><div className={s.setupContent}>
      <p>Download a private backup before changing computers or clearing browser data. It includes the scans, details and original submission IDs. Restoring does not add or publish cards.</p>
      <div className={s.actions}><button disabled={busy || saving > 0 || !batch.assets.length} onClick={() => void downloadBackup()}>Download batch backup</button>
        <button disabled={busy || storageFailed || saving > 0 || batch.assets.length > 0 || batch.items.length > 0} onClick={() => backupInput.current?.click()}>Restore batch backup</button></div>
      {(batch.assets.length > 0 || batch.items.length > 0) && <p className={s.muted}>Restore into an empty workspace or another browser signed in to this same store. Your current batch will not be overwritten.</p>}
      <input ref={backupInput} className={s.hiddenFile} type="file" accept=".gvbatch" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void run(async () => { setRestoreCandidate(null); setRestoreCandidate(await importBatchBackup(file, storeId, process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")); }); }} />
      {restoreCandidate && <div className={s.notice} role="region" aria-label="Confirm backup restore"><h3>Restore {restoreCandidate.name || "scan batch"}?</h3><p>{restoreCandidate.items.length} copies. Pending submissions keep their original IDs. Previously completed copies will be checked against the server when resumed. Review unsubmitted copies again before adding them.</p>
        <button disabled={busy || storageFailed || saving > 0} onClick={() => run(async () => { const restored = await restoreIntakeBatch(restoreCandidate, { ...current.current!, revision: revision.current }); current.current = restored; revision.current = restored.revision; setBatch(restored); setActiveId(restored.items[0]?.id ?? ""); setFilter("all"); setResults([]); setQuery(""); setReviewList(null); setRestoreCandidate(null); setNotice("Backup restored. Select copies to review or resume. No cards were added."); })}>Confirm restore</button>
        <button disabled={busy} onClick={() => setRestoreCandidate(null)}>Cancel restore</button></div>}
    </div></details>
    <fieldset disabled={busy || storageFailed} className={s.intakeStack}>
      <details className={s.batchSetup} open={batch.items.length === 0 ? true : undefined}><summary><SlidersHorizontal size={16} /><strong>Batch setup</strong><span>{batch.name || "Untitled batch"} · {batch.layout === "pairs" ? "Front & back" : "Front only"}</span></summary><div className={s.setupContent}><div className={s.grid}><label>Batch name<input maxLength={100} value={batch.name} onChange={e => edit(b => ({ ...b, name: e.target.value }))} /></label><label>Scan layout<select value={batch.layout} disabled={batch.items.some(i => Boolean(i.receipt || i.submission))} onChange={e => {
        const layout = e.target.value as IntakeBatch["layout"];
        if (batch.items.length && !window.confirm("Re-pair all scans? This clears matches and per-copy settings; original images stay saved.")) return;
        void run(async () => { await change(b => ({ ...b, layout, items: pairAssets(b.items.flatMap(i => [i.front, i.back]).filter((id): id is string => Boolean(id)).map(id => b.assets.find(a => a.id === id)!), layout, b.defaults) })); setActiveId(current.current!.items[0]?.id || ""); });
      }}><option value="front">One front per copy</option><option value="pairs">Alternating front → back</option></select></label></div>
      <div className={s.batchDrop} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy && !storageFailed) void run(() => ingest(Array.from(e.dataTransfer.files))); }}>
        <CloudUpload size={30} strokeWidth={1.5} /><strong>Drop your card scans here</strong><p>JPEG, PNG, WebP or HEIC · up to 20 MB each · {BATCH_LIMIT} copies per batch</p><button type="button" onClick={() => upload.current?.click()}>Choose scans</button>
        <input ref={upload} className={s.hiddenFile} type="file" multiple accept={BATCH_IMAGE_ACCEPT} onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ""; void run(() => ingest(files)); }} />
      </div>
      <details className={s.batchDefaults}><summary>Listing defaults & bulk editing</summary><p className={s.muted}>Defaults apply to new scans. Apply them to selected copies below when ready; individually edited copies are preserved unless you choose otherwise.</p>
        <Settings value={batch.defaults} owner={owner} prefix="Default" change={defaults => edit(b => ({ ...b, defaults }))} />
        <div className={s.actions}><label className={s.check}><input type="checkbox" checked={replaceOverrides} onChange={e => setReplaceOverrides(e.target.checked)} />Replace individual overrides</label><button onClick={() => run(async () => { await change(b => applyBatchDefaults(b, replaceOverrides)); setNotice("Defaults applied. Review and confirm affected copies."); })}>Apply to selected copies</button>
          <button onClick={() => run(async () => { await intakePreset(storeId, batch.defaults); setNotice("Defaults saved for future batches on this computer."); })}>Save these defaults</button><button onClick={() => run(async () => { const defaults = await intakePreset(storeId); if (!defaults) throw new Error("No saved defaults yet."); await change(b => ({ ...b, defaults })); })}>Load saved defaults</button></div>
        <div className={s.actions}><label>New section<input maxLength={40} value={sectionName} onChange={e => setSectionName(e.target.value)} /></label><button disabled={!sectionName.trim()} onClick={() => run(async () => { await storeRequest("/api/stores/owner/inventory", { action: "section", name: sectionName }); await refresh(); setSectionName(""); })}>Create section</button></div>
      </details>
      <p className={s.storageNote}>Scans are saved in this browser, not backed up online. Download a batch backup above and keep your originals; clearing site data removes this draft.</p></div></details>
      {batch.items.length > 0 && <><div className={s.batchToolbar}><div className={s.segmented} aria-label="Filter copies">{[["all","All copies"],["attention","Needs review"],["ready","Ready"],["done","Added"]].map(([value,label]) => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setResults([]); setQuery(""); }}>{label}{value === "all" && <span>{batch.items.length}</span>}{value === "ready" && <span>{ready.length}</span>}</button>)}</div><button onClick={() => upload.current?.click()}><ImagePlus size={15} />Add scans</button></div>
        <div className={s.queueSelection}><button onClick={() => edit(b => ({ ...b, items: b.items.map(i => ({ ...i, picked: !i.receipt && !i.cancelled })) }))}>Select unfinished</button><button onClick={() => edit(b => ({ ...b, items: b.items.map(i => ({ ...i, picked: false })) }))}>Clear selection</button><span>Alt + ← / → to move between copies</span></div>
        <div className={s.batchLayout}><div className={s.batchGrid}>{visible.map(item => <article key={item.id} className={s.batchCard} data-active={active?.id === item.id} data-ready={!itemProblem(batch, item)}>
          <button className={s.batchThumbnail} onClick={() => { setActiveId(item.id); setResults([]); setQuery(""); }} aria-label={`Review copy ${batch.items.indexOf(item) + 1}: ${item.card?.name || asset(item.front)?.name}`}><ScanImage asset={asset(item.front)} alt={item.card?.name || "Uploaded scan"} /></button>
          <label className={s.check}><input type="checkbox" disabled={Boolean(item.receipt || item.cancelled)} checked={item.picked} onChange={e => edit(b => ({ ...b, items: b.items.map(i => i.id === item.id ? { ...i, picked: e.target.checked } : i) }))} />{batch.items.indexOf(item) + 1}. {item.card?.name || "Choose match"}</label>
          <small>{item.receipt || !itemProblem(batch, item) ? <CheckCircle2 size={12} /> : <Circle size={12} />}{item.receipt ? "Added" : item.cancelled ? "Cancelled" : !itemProblem(batch, item) ? "Ready" : "Needs review"}</small>
        </article>)}</div>
        {!visible.length && <div className={s.queueEmpty}><CheckCircle2 size={28} /><h3>{filter === "attention" ? "All caught up" : "No copies here yet"}</h3><p>{filter === "attention" ? "Every unfinished copy has been reviewed." : "Choose another filter to continue reviewing your batch."}</p><button onClick={() => setFilter("all")}>Show all copies</button></div>}
        {active && <div className={s.batchReview} onKeyDown={e => { if (e.altKey && (e.key === "ArrowRight" || e.key === "ArrowLeft")) { e.preventDefault(); move(e.key === "ArrowRight" ? 1 : -1); } }}>
          <div className={s.reviewHeading}><div><span className={s.eyebrow}>Copy {batch.items.indexOf(active) + 1} of {batch.items.length}</span><h3>{active.card?.name || "Find your card"}</h3></div><div className={s.reviewArrows}><button aria-label="Previous copy" disabled={visible[0]?.id === active.id} onClick={() => move(-1)}><ArrowLeft size={16} /></button><button aria-label="Next copy" disabled={visible.at(-1)?.id === active.id} onClick={() => move(1)}><ArrowRight size={16} /></button></div></div><div className={s.reviewBody}><div className={s.reviewVisual}>
          <div className={s.batchComparison}><div><span>Your scan</span><div className={s.batchImage}><ScanImage asset={asset(active.front)} alt="Uploaded card front" />{!active.receipt && !active.submission && <button className={s.photoPencil} aria-label="Replace front photo" onClick={() => { replacementSide.current = "front"; replacement.current?.click(); }}><Pencil size={17} /></button>}</div><small>{asset(active.front)?.name}</small></div>
            <div><span>Catalog match</span><div className={s.batchImage}>{active.card?.image ? <img src={active.card.image} alt={active.card.name} /> : <div className={s.matchPlaceholder}><Layers3 size={30} strokeWidth={1} /><strong>Find a match</strong><span>Search the catalog to compare your card.</span></div>}</div><small>{active.card ? `${active.card.set_code} · ${active.card.number}` : "No match selected"}</small></div></div>
          {active.back && <details><summary>Back image</summary><div className={s.batchBack}><ScanImage asset={asset(active.back)} alt="Uploaded card back" /></div></details>}
          <fieldset disabled={Boolean(active.receipt || active.submission)} className={s.photoTools}><details><summary><SlidersHorizontal size={14} />Photo tools & pairing</summary><div className={s.photoToolsBody}>
            <input ref={replacement} className={s.hiddenFile} type="file" accept={BATCH_IMAGE_ACCEPT} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void run(() => replace(file, replacementSide.current)); }} />
            <div className={s.actions}><button onClick={() => run(async () => { const front = asset(active.front)!; const rotation = (active.rotation + 90) % 360; const preview = await decodeIntakeImage(front.original, front.name, rotation); await change(b => ({ ...b, assets: b.assets.map(a => a.id === front.id ? { ...a, preview, error: null } : a), items: b.items.map(i => i.id === active.id ? { ...i, rotation, confirmed: false } : i) })); })}><RotateCw size={14} />Rotate front</button>
              <button onClick={() => { replacementSide.current = "back"; replacement.current?.click(); }}>{active.back ? "Replace back" : "Attach back"}</button>
              {active.back && <button onClick={() => patchItem(active.id, { front: active.back!, back: active.front, rotation: 0, card: null, printing: "" })}>Swap front / back</button>}
            </div>
            <div className={s.grid}><label>Pair with back<select value={active.back || ""} onChange={e => {
              const back = e.target.value || null;
              if (back && batch.items.some(i => i.id !== active.id && (i.front === back || i.back === back))) { setError("That image belongs to another copy. Replace this back or re-pair the batch."); return; }
              patchItem(active.id, { back });
            }}><option value="">No back</option>{batch.assets.filter(a => a.id !== active.front).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div>
            {!active.back && <label className={s.check}><input type="checkbox" checked={!(active.requiresBack ?? batch.layout === "pairs")} onChange={e => patchItem(active.id, { requiresBack: !e.target.checked })} />This copy has only a front image</label>}
            </div></details></fieldset></div><fieldset disabled={Boolean(active.receipt || active.submission)} className={s.reviewDetails}><div className={s.detailTitle}><Layers3 size={15} /><h4>Card details</h4></div><div className={s.matchSearch}><label className={s.searchGrow}>Find the matching card<input value={query} maxLength={120} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void run(() => search()); } }} placeholder="Card name or GV-ID" /></label><button disabled={query.trim().length < 2} onClick={() => run(() => search())}>Search catalog</button>
            </div>
            {capabilities.recognition && <div className={s.notice}><label className={s.check}><input type="checkbox" checked={autoMatch} onChange={e => setAutoMatch(e.target.checked)} />Automatically suggest matches</label>
              <p className={s.muted}>Matches the sample catalog. Sends this front preview to Grookai for comparison without saving it online. Choose the card and exact finish yourself.</p>
              {!active.card && <><p role="status">{suggestions.pending ? "Comparing your scan…" : suggestions.result.message || (suggestions.result.status === "ambiguous" ? "Similar cards found. Compare the artwork, number and set." : suggestions.result.status === "suggestions" ? "Possible match found. Review it before selecting." : suggestions.result.status === "no_match" ? "No close match in the sample catalog. Try manual search; this card may not be included." : "")}</p>
              {autoMatch && !suggestions.pending && <button onClick={suggestions.retry}>Retry matching</button>}
              {suggestions.result.cards.length > 0 && <div className={s.catalogResults} aria-label="Visual match suggestions">{suggestions.result.cards.map(card => <button key={card.id} className={s.catalogCard} onClick={() => run(() => chooseSuggestion(card))}>{card.image ? <img src={card.image} alt="" /> : <span>No image</span>}<span><strong>{card.name}</strong><small>{card.set_code} · {card.number}</small><small>{card.gv_id}</small>{Boolean(card.rotation) && <small>Choosing this match also turns your scan upright.</small>}</span></button>)}</div>}</>}
            </div>}
            {!capabilities.recognition && <p className={s.muted}>Search and confirm matches here. Automatic scan suggestions are not enabled yet.</p>}
            {results.length > 0 && <div className={s.catalogResults}>{results.map(card => <button key={card.id} className={s.catalogCard} onClick={() => edit(b => ({ ...b, items: b.items.map(i => i.id === active.id ? selectBatchMatch(i, card) : i) }))}>{card.image ? <img src={card.image} alt="" /> : <span>No image</span>}<span><strong>{card.name}</strong><small>{card.set_code} · {card.number}</small><small>{card.gv_id}</small></span></button>)}</div>}
            {(more || offset > 0) && <div className={s.row}><button disabled={!offset} onClick={() => run(() => search(Math.max(0, offset - 20), searched))}>Previous matches</button><button disabled={!more} onClick={() => run(() => search(offset + 20, searched))}>More matches</button></div>}
            {active.card && <label>Exact finish<select value={active.printing} onChange={e => patchItem(active.id, { printing: e.target.value })}><option value="">Choose the finish</option>{active.card.printings.map(p => <option key={p.id} value={p.id}>{p.finish_label} · {p.printing_gv_id}</option>)}</select></label>}
            <Settings owner={owner} value={active.settings} prefix="Copy" change={settings => patchItem(active.id, { settings, overridden: true })} />
            <p className={s.reviewHint} data-ready={!itemProblem(batch, active)}>{!itemProblem(batch, active) && <CheckCircle2 size={15} />}{itemProblem(batch, active) || "Reviewed and ready to add"}</p>
            <button className={s.primary} onClick={() => run(async () => { const proposed = { ...active, confirmed: true }; const problem = itemProblem(current.current!, proposed); if (problem) throw new Error(problem); await change(b => ({ ...b, items: b.items.map(i => i.id === active.id ? proposed : i) })); move(1); })}>{active.confirmed ? "Confirm again & next" : "Confirm copy & next"}</button>
          </fieldset></div>
          {active.submission && !active.receipt && !active.cancelled && <div className={s.notice}><p>Submission saved. Resume this copy to finish its original photos and details without creating a duplicate.</p>{capabilities.cancellation && (cancelReview === active.id ? <div role="region" aria-label="Confirm saved attempt cancellation"><p>Cancel this attempt so you can correct its details? If it already finished, its inventory receipt will be recovered.</p><button onClick={() => run(() => cancelAttempt(active))}>Confirm cancellation</button> <button onClick={() => setCancelReview(null)}>Keep saved attempt</button></div> : <button onClick={() => setCancelReview(active.id)}>Cancel saved attempt</button>)}</div>}
          {active.cancelled && <div className={s.notice}><p>This attempt is cancelled. Its old saved request cannot add a copy.</p><button onClick={() => run(() => editCancelled(active))}>Edit & retry</button></div>}
          {active.error && <p role="alert" className={s.notice}>{active.error}</p>}
          {active.receipt && <p className={s.notice}>Added as {active.receipt.gvvi}. Edit this copy in Inventory.</p>}
        </div>}</div>
        <div className={s.batchFooter}><div><strong>{batch.items.filter(i => i.picked && !i.receipt && !i.cancelled).length} copies selected</strong><p>{ready.length} ready to add</p>
          {!capabilities.commit && <p className={s.muted}>Batch adding is not enabled in this environment yet. Your review is saved.</p>}</div>
          <div className={s.actions}><button disabled={!capabilities.commit || saving > 0 || !batch.items.some(i => i.picked && !i.receipt && !i.cancelled)} onClick={() => run(async () => { commitSelection(current.current!, false); setReviewList(false); })}>Review & add to inventory</button><button className={s.primary} disabled={!capabilities.commit || saving > 0 || !batch.items.some(i => i.picked && !i.receipt && !i.cancelled)} onClick={() => run(async () => { commitSelection(current.current!, true); setReviewList(true); })}>Review & list selected copies</button></div>
        </div>
      </>}
      {reviewList !== null && <div className={s.notice} role="region" aria-label="Confirm batch addition"><h3>{reviewList ? "Add and list selected copies" : "Add selected copies to inventory"}</h3><p>{batch.items.filter(i => i.picked && !i.receipt && !i.cancelled).length} selected copies will be added or resumed with their confirmed identities, photos, condition, price and sections.</p>{batch.items.some(i => i.picked && i.submission && !i.receipt && !i.cancelled) && <p>Pending copies keep their original submission IDs and listing choices. Already-completed copies are recovered without adding duplicates.</p>}{batch.items.some(i => i.picked && !i.receipt && !i.cancelled && (i.submission?.request.intent ?? i.settings.intent) === "sell") && <p>For-sale copies can appear on your public collector profile when Vault sharing is enabled.</p>}{reviewList && <p>{owner.store?.app_published || owner.store?.web_published ? "Your store is published. Eligible selected copies will become visible immediately." : "Copies will be selected for your store. Your store remains unpublished until you publish it."}</p>}<button className={s.primary} onClick={() => run(commit)}>Confirm addition</button> <button onClick={() => setReviewList(null)}>Keep reviewing</button></div>}
      <button className={s.clearBatch} disabled={batch.items.some(i => i.submission && !i.receipt && !i.cancelled)} onClick={() => run(async () => { if (!window.confirm("Clear this browser batch and its saved scans? Already-added Vault copies will remain.")) return; await clearIntakeBatch(storeId, batch.id, revision.current, batch.storageEpoch); const next = newIntakeBatch(storeId); next.defaults = await intakePreset(storeId) ?? defaultBatchSettings(); current.current = next; revision.current = 0; setBatch(next); setActiveId(""); setResults([]); setReviewList(null); await change(b => b); })}>Clear batch & start another</button>
    </fieldset>
  </div>;
}
