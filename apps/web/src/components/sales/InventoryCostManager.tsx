"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, RefreshCw } from "lucide-react";
import { allocationPreview } from "@/lib/sales/acquisitionAllocation.mjs";
import { minor, money } from "@/lib/sales/salesDesk.mjs";
import s from "./SalesDesk.module.css";

type Row = { instanceId: string; gvviId: string; name: string; setCode: string; number: string; condition: string; acquisitionDate: string; acquisitionMethod: string | null; acquisitionCost: { status: string; minor?: string | null }; marketPrice: number | null; batchId: string | null };
type Selected = Row & { allocatedMinor: number };
type Batch = { batchId: string; purchasedAt: string; totalPaidMinor: number; allocationMethod: string; lineCount: number; soldCount: number; remainingCount: number; allocatedCogMinor: number; soldRevenueMinor: number; realizedCogMinor: number; remainingCogMinor: number; realizedProfitMinor: number; remainingEstimatedValueMinor: number };

export default function InventoryCostManager() {
  const [rows, setRows] = useState<Row[]>([]), [batches, setBatches] = useState<Batch[]>([]), [selected, setSelected] = useState<Selected[]>([]), [from, setFrom] = useState(""), [to, setTo] = useState(""), [sort, setSort] = useState("oldest");
  const [total, setTotal] = useState(""), [mode, setMode] = useState<"equal_split" | "manual">("equal_split"), [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const totalMinor = minor(total) ?? 0;
  const allocations = useMemo(() => allocationPreview(totalMinor, selected, mode), [totalMinor, selected, mode]);
  const allocatedTotal = allocations.reduce((sum, value) => sum + value, 0);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ sort, limit: "500" });
      if (from) query.set("from", new Date(`${from}T00:00:00`).toISOString());
      if (to) query.set("to", new Date(`${to}T00:00:00`).toISOString());
      const [response, reportResponse] = await Promise.all([
        fetch(`/api/inventory/acquisition?${query}`, { cache: "no-store" }),
        fetch(`/api/inventory/acquisition?action=report&${query}`, { cache: "no-store" }),
      ]);
      const data = await response.json(), report = await reportResponse.json();
      if (!response.ok) throw Error(data.error ?? "Inventory could not load");
      if (!reportResponse.ok) throw Error(report.error ?? "Batch profitability could not load");
      setRows(data.items ?? []); setBatches(report.batches ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Inventory could not load"); }
    finally { setLoading(false); }
  }, [from, to, sort]);
  useEffect(() => { void load(); }, [load]);
  function toggle(row: Row) {
    if (row.batchId) return;
    setSelected(current => current.some(item => item.instanceId === row.instanceId) ? current.filter(item => item.instanceId !== row.instanceId) : [...current, { ...row, allocatedMinor: 0 }]);
  }
  async function save() {
    if (!selected.length || !totalMinor || allocatedTotal !== totalMinor) { setError("Select copies and enter a total that reconciles exactly."); return; }
    if (!date) { setError("Choose the date paid."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/inventory/acquisition", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action: "batch", id: crypto.randomUUID(), purchasedAt: new Date(`${date}T12:00:00`).toISOString(), totalPaidMinor: totalMinor, allocationMethod: "backfill", lines: selected.map((row, index) => ({ instanceId: row.instanceId, gvviId: row.gvviId, allocatedMinor: allocations[index] })), note: "Bulk COG backfill" }) });
      const data = await response.json(); if (!response.ok) throw Error(data.error ?? "COG backfill failed");
      setNotice(`Backfilled ${selected.length} exact copies. Their GVVI cost and purchase date are now recorded.`); setSelected([]); setTotal(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "COG backfill failed"); }
    finally { setBusy(false); }
  }
  return <main className={s.shell}>
    <header className={s.header}><div><Link href="/account/store/sales"><ArrowLeft size={15}/> Sales desk</Link><h1>Inventory aging & COG <span>Find the oldest exact copies and backfill their paid cost.</span></h1></div><div className={s.actions}><Link href="/account/store/sales/buy">Buy / intake</Link><Link href="/account/store/card-pnl">Per-card P&amp;L</Link><button onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Refresh</button></div></header>
    {error && <div role="alert" className={s.error}>{error}</div>}{notice && <p role="status" className={s.notice}><Check size={16}/> {notice}</p>}
    <section className={s.toolbar}><label>Purchased from<input type="date" value={from} onChange={event => setFrom(event.target.value)}/></label><label>Purchased to<input type="date" value={to} onChange={event => setTo(event.target.value)}/></label><label>Order<select value={sort} onChange={event => setSort(event.target.value)}><option value="oldest">Oldest first</option><option value="newest">Newest first</option></select></label></section>
    <section className={s.inventory}><div className={s.cartHeader}><h2>Batch profitability</h2><span>{batches.length} lots</span></div><div className={s.lines}>{batches.map(batch => <div className={s.line} key={batch.batchId}><div><strong>{new Date(batch.purchasedAt).toLocaleDateString()} · {batch.lineCount} copies</strong><small>Paid ${money(batch.totalPaidMinor)} · allocated COG ${money(batch.allocatedCogMinor)} · {batch.allocationMethod}</small><small>Sold {batch.soldCount} · revenue ${money(batch.soldRevenueMinor)} · realized COG ${money(batch.realizedCogMinor)}</small><small>Realized profit <strong>${money(batch.realizedProfitMinor)}</strong> · remaining COG ${money(batch.remainingCogMinor)} · estimated remaining value ${money(batch.remainingEstimatedValueMinor)}</small></div></div>)}</div>{!loading && batches.length === 0 && <p className={s.empty}>No acquisition batches match this date range yet.</p>}</section>
    <div className={s.workspace}><section className={s.inventory}><div className={s.resultBar}><span>{loading ? "Loading exact inventory…" : `${rows.length} active exact copies`}</span><button onClick={() => setSelected(rows.filter(row => !row.batchId).map(row => ({ ...row, allocatedMinor: 0 })))}>Select untracked shown</button></div><div className={s.lines}>{rows.map(row => <label className={s.line} key={row.instanceId}><input type="checkbox" disabled={!!row.batchId} checked={selected.some(item => item.instanceId === row.instanceId)} onChange={() => toggle(row)}/><div><strong>{row.name} · {row.setCode} · {row.number}</strong><small>{row.condition} · {row.gvviId}</small><small>Purchased {new Date(row.acquisitionDate).toLocaleDateString()} · {row.acquisitionMethod ?? "unknown source"}</small><small>COG {row.acquisitionCost?.status === "known" && row.acquisitionCost.minor != null ? `$${money(Number(row.acquisitionCost.minor))}` : "Unknown"}{row.batchId ? ` · tracked batch ${row.batchId.slice(0, 8)}` : " · ready for backfill"}</small></div></label>)}</div></section>
      <aside className={s.cart}><h2>Bulk COG backfill</h2><p className={s.muted}>Use this for a historical lot. It writes one exact cost and purchase date per GVVI.</p><label>Date paid<input type="date" value={date} onChange={event => setDate(event.target.value)}/></label><label>Total paid (USD)<input inputMode="decimal" placeholder="300.00" value={total} onChange={event => setTotal(event.target.value)}/></label><label>Allocation<select value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="equal_split">Equal split</option><option value="manual">Manual per-copy</option></select></label>{selected.length > 0 && <div className={s.lines}><p>{selected.length} selected · ${money(allocatedTotal)} allocated</p>{selected.map((row, index) => <div className={s.line} key={row.instanceId}><div><strong>{row.name}</strong><small>{row.gvviId}</small>{mode === "manual" && <input inputMode="decimal" placeholder="COG" onChange={event => { const value = minor(event.target.value) ?? 0; setSelected(current => current.map(item => item.instanceId === row.instanceId ? { ...item, allocatedMinor: value } : item)); }}/>}<small>${money(allocations[index] ?? 0)} allocated</small></div></div>)}</div>}<button className={s.primary} disabled={busy || !selected.length || allocatedTotal !== totalMinor || !totalMinor} onClick={() => void save()}>{busy ? "Saving…" : "Backfill selected copies"}</button></aside>
    </div>
  </main>;
}
