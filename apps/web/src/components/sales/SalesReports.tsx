"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { RecordedReceipt as SalesReceipt } from "@/lib/sales/salesReport.mjs";
import {isPurchaseReceipt,validatePurchaseReceipt} from '@/lib/sales/salesPurchase.mjs';
import SalesDashboard from "./SalesDashboard";
import {readSaleCostSnapshots} from '@/lib/sales/readSaleCostSnapshots';
import type {CostReportState} from './SalesProfitPanel';
import s from "./SalesDesk.module.css";

/** Receipt reads only: opening reports must not create or open an editable deal. */
export default function SalesReports({ ownerId, profitEnabled=false }: { ownerId: string; profitEnabled?:boolean }) {
  const [receipts, setReceipts] = useState<SalesReceipt[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closed, setClosed] = useState(false);
  const generation = useRef(0);
  const accountChanged = useRef(false);
  const controller = useRef<AbortController|null>(null);
  const [costState,setCostState]=useState<CostReportState>({snapshots:null,loading:profitEnabled,error:''});
  const load = useCallback(async () => {
    if (accountChanged.current) return;
    const current = ++generation.current;
    controller.current?.abort();const abort=new AbortController();controller.current=abort;
    setLoading(true);
    setError("");
    if(profitEnabled)setCostState({snapshots:null,loading:true,error:''});
    try {
      const response = await fetch(`/api/sales/desk?action=book&owner=${ownerId}`, { cache: "no-store", credentials: "same-origin",signal:abort.signal });
      if (!response.ok) throw new Error("Report read failed");
      const data = await response.json() as { ownerId:string; book: { receipts: { receipt: SalesReceipt }[] } };
      if (current !== generation.current || accountChanged.current) return;
      if(data.ownerId!==ownerId)throw Error('Report account changed');
      const rows = data.book.receipts.map(entry => entry.receipt);
      if (rows.some(row => !row || typeof row.id !== "string" || !Array.isArray(row.items))) throw new Error("Invalid receipt read");
      for(const row of rows)if(isPurchaseReceipt(row))validatePurchaseReceipt(row);
      setReceipts(rows);
      if(profitEnabled){
        try {
          const snapshots=await readSaleCostSnapshots(ownerId,rows.filter(row=>!isPurchaseReceipt(row)),abort.signal);
          if(current===generation.current && !accountChanged.current)setCostState({snapshots,loading:false,error:''});
        }catch{
          if(current===generation.current && !accountChanged.current)setCostState({snapshots:null,loading:false,error:'Private cost history could not load. Profit is unavailable until it can refresh.'});
        }
      }
    } catch {
      if (current === generation.current && !accountChanged.current) {
        setError("Reports could not refresh. Your saved receipts have not changed.");
        if(profitEnabled)setCostState({snapshots:null,loading:false,error:'Sales could not refresh, so profit is unavailable.'});
      }
    } finally {
      if (current === generation.current && !accountChanged.current) setLoading(false);
    }
  }, [ownerId,profitEnabled]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user.id !== ownerId) {
        accountChanged.current = true;
        generation.current++;
        controller.current?.abort();
        setClosed(true);
        setReceipts(null);
        setCostState({snapshots:null,loading:false,error:''});
      }
    });
    void load();
    return () => {
      // This ref is a request nonce, not a DOM node; invalidate all in-flight reads.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      controller.current?.abort();
      subscription.unsubscribe();
    };
  }, [load, ownerId]);

  if (closed) return <section className={`${s.shell} ${s.reportShell}`}><h1>Reports closed</h1>
    <p>Your account changed. Reopen reports to continue.</p><a href="/account/store/reports">Reopen reports</a></section>;

  return <section className={`${s.shell} ${s.reportShell}`} aria-label="Reports">
    <header className={s.header}><h1>Reports</h1><Link href="/account/store/receipts/cloud">Receipts & customers</Link></header>
    {error && <p role="alert">{error} <button onClick={() => void load()} disabled={loading}>Try again</button></p>}
    {loading && !receipts ? <p role="status">Loading saved sales…</p> :
      <SalesDashboard receipts={receipts} loading={loading} refresh={() => void load()} costState={profitEnabled?costState:undefined} />}
  </section>;
}
