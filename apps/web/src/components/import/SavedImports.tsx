"use client";

import Link from "next/link";
import {useCallback, useEffect, useRef, useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import {collectionImportArchiveJson, readCollectionImportArchive, type CollectionImportArchive} from "@/lib/import/collectionImportArchive";

type DocumentLink = {source_sha256: string; created_at: string};
const hashPattern = /^[a-f0-9]{64}$/;
const documentColumns = "user_id,source_sha256,created_at,source_rows";
const groupColumns = "user_id,source_sha256,group_key,source_indices,instance_ids,added_count,target";

export function SavedImports({ownerId, sourceSha256}: {ownerId: string; sourceSha256?: string}) {
  const [documents, setDocuments] = useState<DocumentLink[]>([]);
  const [archive, setArchive] = useState<CollectionImportArchive | null>(null);
  const [busy, setBusy] = useState(true), [more, setMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"review" | "reconciled" | "all">("review");
  const [search, setSearch] = useState(""), [limit, setLimit] = useState(50);
  const active = useRef(false), revision = useRef(0), inFlight = useRef(false);
  const cursor = useRef<string | null>(null);
  const requireOwner = useCallback(async () => {
    const {data, error: sessionError} = await supabase.auth.getSession();
    if (sessionError || data.session?.user.id !== ownerId) throw new Error("owner_changed");
  }, [ownerId]);

  const load = useCallback(async (append = false) => {
    if (!active.current || inFlight.current) return;
    inFlight.current = true;
    const request = ++revision.current;
    const current = () => active.current && request === revision.current;
    setBusy(true); setError(null);
    if (!append) {cursor.current = null; setDocuments([]); setArchive(null); setMore(true);}
    try {
      await requireOwner();
      if (!current()) return;
      if (sourceSha256) {
        if (!hashPattern.test(sourceSha256)) throw new Error("invalid_source");
        const saved = await readCollectionImportArchive(ownerId, sourceSha256, {
          isCurrentOwner: current,
          readDocument: async () => {
            const result = await supabase.from("vault_collection_import_documents_v2")
              .select(documentColumns).eq("user_id", ownerId).eq("source_sha256", sourceSha256).single();
            if (result.error) throw result.error;
            return result.data;
          },
          readGroupPage: async after => {
            let query = supabase.from("vault_collection_import_groups_v2").select(groupColumns)
              .eq("user_id", ownerId).eq("source_sha256", sourceSha256).order("group_key", {ascending: true}).limit(500);
            if (after) query = query.gt("group_key", after);
            const result = await query;
            if (result.error) throw result.error;
            return result.data;
          },
        });
        await requireOwner();
        if (current()) {setArchive(saved); setFilter(saved.counts.reviewRows ? "review" : "all"); setLimit(50);}
      } else {
        let query = supabase.from("vault_collection_import_documents_v2").select("user_id,source_sha256,created_at")
          .eq("user_id", ownerId).order("source_sha256", {ascending: true}).limit(20);
        if (cursor.current) query = query.gt("source_sha256", cursor.current);
        const result = await query;
        if (result.error || !Array.isArray(result.data)) throw new Error("read_failed");
        let after = cursor.current;
        const page = result.data.map(row => {
          if (row.user_id !== ownerId || !hashPattern.test(row.source_sha256) ||
              (after !== null && row.source_sha256 <= after) || !Number.isFinite(Date.parse(row.created_at))) throw new Error("invalid_page");
          after = row.source_sha256;
          return {source_sha256: row.source_sha256, created_at: row.created_at};
        });
        await requireOwner();
        if (!current()) return;
        cursor.current = after;
        setDocuments(previous => append ? [...previous, ...page] : page);
        // A short server-capped page is not proof that all documents were read.
        setMore(page.length !== 0);
      }
    } catch {
      if (current()) setError(sourceSha256 ? "This saved import could not be loaded. Retry to confirm its complete details." : "Saved imports could not be loaded. Try again.");
    } finally {
      if (current()) {inFlight.current = false; setBusy(false);}
    }
  }, [ownerId, requireOwner, sourceSha256]);

  useEffect(() => {
    const lifecycleRevision = revision;
    active.current = true; inFlight.current = false;
    const {data} = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user.id === ownerId) return;
      active.current = false; revision.current++;
      setDocuments([]); setArchive(null); setSearch(""); setError(null); setBusy(false);
    });
    void load();
    return () => {active.current = false; lifecycleRevision.current++; data.subscription.unsubscribe();};
  }, [load, ownerId]);

  async function download() {
    if (!archive || busy) return;
    const request = revision.current;
    try {
      await requireOwner();
      if (!active.current || request !== revision.current) return;
      const url = URL.createObjectURL(new Blob([collectionImportArchiveJson(archive)], {type: "application/json;charset=utf-8"}));
      const link = document.createElement("a");
      link.href = url; link.download = `grookai-saved-import-${archive.sourceSha256.slice(0, 12)}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {if (active.current && request === revision.current) setError("The source download could not be prepared. Reload this saved import and try again.");}
  }

  const review = new Set(archive?.reviewIndices ?? []);
  const terms = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const rows = archive?.rows.flatMap((row, index) => {
    if (filter === "review" && !review.has(index) || filter === "reconciled" && review.has(index)) return [];
    const text = Object.values(row).join(" ").toLocaleLowerCase();
    return terms.every(term => text.includes(term)) ? [{row, index}] : [];
  }) ?? [];
  const button = "min-h-11 rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-50";
  return <div className="space-y-4">
    <header className="space-y-2">
      <p className="text-sm font-medium text-slate-500">Collection import</p>
      <h1 className="text-3xl font-semibold">{sourceSha256 ? "Saved import details" : "Saved imports"}</h1>
      <p className="max-w-2xl text-slate-600">Your saved source rows and unresolved items. Review rows are not inventory.</p>
      <nav className="flex flex-wrap gap-4 text-sm underline" aria-label="Import navigation">
        <Link href="/vault/import">Import original CSV</Link>
        {sourceSha256 && <Link href="/vault/import/history">All saved imports</Link>}
        <Link href="/vault">Open Vault</Link>
      </nav>
    </header>
    {error && <div role="alert" className="space-y-3 rounded-xl border border-amber-300 p-4"><p>{error}</p><button type="button" className={button} disabled={busy} onClick={() => void load(!sourceSha256 && documents.length > 0)}>Retry loading</button></div>}
    {busy && <p role="status">Loading saved import{sourceSha256 ? " details" : "s"}…</p>}
    {!sourceSha256 && <>
      {!documents.length && !busy && !error && <p>No saved imports yet. After a verified import, its source rows and reconciliation appear here.</p>}
      <ul className="space-y-3">{documents.map((doc, index) => <li key={doc.source_sha256}>
        <Link href={`/vault/import/history/${doc.source_sha256}`} className="block rounded-xl border border-slate-200 p-4">
          <span className="block font-semibold">Saved {new Date(doc.created_at).toLocaleString()}</span>
          <span className="mt-1 block text-sm text-slate-500">Import {index + 1} · View source rows and review status</span>
        </Link>
      </li>)}</ul>
      {!!documents.length && more && !error && <button type="button" className={button} disabled={busy} onClick={() => void load(true)}>Show more imports</button>}
    </>}
    {archive && <>
      <section className="space-y-3 rounded-xl border border-slate-200 p-4" aria-label="Import reconciliation">
        <h2 className="sr-only">Source reconciliation</h2>
        <p>{archive.counts.sourceRows} source rows · {archive.counts.reconciledRows} previously reconciled · {archive.counts.reviewRows} need review</p>
        <p className="text-sm text-slate-600">Historical mappings: {archive.counts.cardCopies} card copies · {archive.counts.sealedCopies} sealed copies</p>
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-medium">Download source and retry options</summary>
          <div className="space-y-3 pt-2">
            <p>{archive.counts.addedCopies} copies were added by this source; {archive.counts.reusedCopies} were already accounted for. Mapped copies may since have been sold, archived or edited.</p>
            <button type="button" className={button} disabled={busy} onClick={() => void download()}>Download saved source JSON</button>
            <p className="text-xs text-slate-500">Includes all stored source fields and historical mappings, regardless of these filters. This is not the original CSV or a current collection export.</p>
            <p>To try matching unresolved rows again, upload the unchanged original CSV. A downloaded subset is a different import and cannot recover an uncertain save.</p>
          </div>
        </details>
      </section>
      <div className="flex flex-wrap gap-2" aria-label="Saved row filters">{(["review", "reconciled", "all"] as const).map(value => <button type="button" key={value} className={`${button} ${filter === value ? "bg-slate-900 text-white" : ""}`} aria-pressed={filter === value} onClick={() => {setFilter(value); setLimit(50);}}>{value === "review" ? `Needs review (${archive.counts.reviewRows})` : value === "reconciled" ? `Reconciled (${archive.counts.reconciledRows})` : `All rows (${archive.counts.sourceRows})`}</button>)}</div>
      <label className="block space-y-2"><span className="text-sm font-medium">Search saved source fields</span><input className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3" value={search} onChange={event => {setSearch(event.target.value); setLimit(50);}} /></label>
      <p className="text-sm text-slate-500">Showing {Math.min(limit, rows.length)} of {rows.length} matching source rows</p>
      {!rows.length && <p>No rows match this view. Choose another filter or clear the search.</p>}
      {rows.slice(0, limit).map(({row, index}) => {
        const titleKey = Object.keys(row).find(key => ["product name", "card name"].includes(key.trim().toLowerCase()));
        return <details key={index} className="rounded-xl border border-slate-200 p-4">
          <summary className="cursor-pointer break-words"><span className="font-semibold">{titleKey ? row[titleKey] || "Unnamed source row" : "Source row"}</span><span className="mt-1 block text-sm text-slate-500">Source row {index + 2} · {review.has(index) ? "Needs review; not added from this row" : "Previously reconciled"}</span></summary>
          <dl className="mt-4 space-y-3">{Object.entries(row).map(([key, value]) => <div key={key}><dt className="text-sm font-medium">{key}</dt><dd className="whitespace-pre-wrap break-words text-sm text-slate-600">{value === "" ? "—" : value}</dd></div>)}</dl>
        </details>;
      })}
      {limit < rows.length && <button type="button" className={button} onClick={() => setLimit(value => value + 50)}>Show more rows</button>}
    </>}
  </div>;
}
