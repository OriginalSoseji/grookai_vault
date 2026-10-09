"use client";

import Link from "next/link";
import {useCallback, useEffect, useRef, useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import {inventoryExport, inventoryExportCsv, inventoryExportError, inventoryExportJson, type InventoryExport as Snapshot} from "@/lib/vault/inventoryExport";

export function InventoryExport({ownerId}: {ownerId: string}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false), [closed, setClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false), revision = useRef(0), invalidated = useRef(false), inFlight = useRef(false);
  const close = useCallback(() => {
    invalidated.current = true; revision.current += 1;
    setSnapshot(null); setError(null); setClosed(true); setBusy(false);
  }, []);
  useEffect(() => {
    active.current = true; invalidated.current = false;
    const {data} = supabase.auth.onAuthStateChange((_, session) => {
      if (active.current && session?.user.id !== ownerId) close();
    });
    return () => {active.current = false; revision.current += 1; data.subscription.unsubscribe();};
  }, [ownerId, close]);
  const load = async () => {
    if (!active.current || invalidated.current || inFlight.current) return;
    const request = ++revision.current;
    const current = () => active.current && !invalidated.current && revision.current === request;
    inFlight.current = true; setBusy(true); setSnapshot(null); setError(null);
    try {
      const before = await supabase.auth.getSession();
      if (!current()) return;
      if (before.error || before.data.session?.user.id !== ownerId) {close(); return;}
      const result = await supabase.rpc("vault_inventory_export_v1");
      if (!current()) return;
      if (result.error) throw result.error;
      const checked = inventoryExport(ownerId, result.data);
      const after = await supabase.auth.getSession();
      if (!current()) return;
      if (after.error || after.data.session?.user.id !== ownerId) {close(); return;}
      setSnapshot(checked);
    } catch (e) {if (current()) setError(inventoryExportError(e));}
    finally {inFlight.current = false; if (current()) setBusy(false);}
  };
  const download = async (format: "json" | "csv") => {
    if (!snapshot || busy || invalidated.current || !active.current) return;
    const request = revision.current, selected = snapshot;
    const session = await supabase.auth.getSession().catch(() => null);
    if (!active.current || invalidated.current || request !== revision.current) return;
    if (!session || session.error || session.data.session?.user.id !== ownerId) {close(); return;}
    try {
      const content = format === "json" ? inventoryExportJson(selected) : inventoryExportCsv(selected);
      const url = URL.createObjectURL(new Blob([content], {type: format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8"}));
      const link = document.createElement("a"); link.href = url;
      link.download = `grookai-inventory-${selected.capturedAt.replaceAll(/[^0-9]/g, "")}.${format}`;
      link.hidden = true; document.body.appendChild(link);
      try {link.click();} finally {link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);}
    } catch {setError("The file could not be created. Please retry.");}
  };
  if (closed) return <div role="status"><p>Your account changed. Reopen inventory export.</p><Link href="/vault/export" className="gv-primary-button" onClick={event => {event.preventDefault(); window.location.assign("/vault/export");}}>Reopen export</Link></div>;
  const counts = {card: 0, slab: 0, sealed: 0};
  for (const copy of snapshot?.copies ?? []) counts[copy.kind] += 1;
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Export your inventory</h1><Link href="/vault" className="gv-secondary-button">Back to Vault</Link></div>
    <p>Save your current cards, slabs and sealed copies, including private notes, known costs and exact identities.</p>
    <button className="gv-primary-button" disabled={busy} onClick={() => void load()}>{busy ? "Preparing your inventory…" : snapshot ? "Refresh inventory" : "Prepare export"}</button>
    {error && <p role="alert">{error}</p>}
    {snapshot && <section className="space-y-4 rounded-2xl border border-slate-200 p-4" aria-label="Prepared inventory export">
      <div role="status"><h2 className="text-lg font-semibold">{snapshot.copyCount === 0 ? "Your active inventory is empty" : `${snapshot.copyCount.toLocaleString()} copies ready`}</h2><p>Cards: {counts.card} · Slabs: {counts.slab} · Sealed: {counts.sealed}</p><p className="text-sm">Captured {new Date(snapshot.capturedAt).toLocaleString()}. Both files use this same snapshot.</p></div>
      <div className="flex flex-wrap gap-3"><button className="gv-primary-button" onClick={() => void download("json")}>Download JSON</button><button className="gv-secondary-button" onClick={() => void download("csv")}>Download CSV</button></div>
      <p className="text-sm">JSON keeps the full exported record and exact decimal values. CSV is a spreadsheet summary; formula-like text is prefixed with an apostrophe. Spreadsheets may reinterpret numeric text.</p>
    </section>}
    <p className="text-sm">This includes every active copy, regardless of Vault filters. Photo links are included; photo files, sold or archived copies, goals and receipts are separate.</p>
    <p className="text-sm">These files contain private collection information. They are record exports, not a supported Grookai restore format or a market valuation.</p>
  </main>;
}
