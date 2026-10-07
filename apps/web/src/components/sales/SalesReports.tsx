"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import type { SalesReceipt } from "@/lib/sales/salesReport.mjs";
import SalesDashboard from "./SalesDashboard";
import s from "./SalesDesk.module.css";

/** Receipt reads only: opening reports must not create or open an editable deal. */
export default function SalesReports({ ownerId }: { ownerId: string }) {
  const [receipts, setReceipts] = useState<SalesReceipt[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closed, setClosed] = useState(false);
  const generation = useRef(0);
  const accountChanged = useRef(false);
  const load = useCallback(async () => {
    if (accountChanged.current) return;
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/sales/desk?action=book", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) throw new Error("Report read failed");
      const data = await response.json() as { book: { receipts: { receipt: SalesReceipt }[] } };
      if (current !== generation.current || accountChanged.current) return;
      const rows = data.book.receipts.map(entry => entry.receipt);
      if (rows.some(row => !row || typeof row.id !== "string" || !Array.isArray(row.items))) throw new Error("Invalid receipt read");
      setReceipts(rows);
    } catch {
      if (current === generation.current && !accountChanged.current) {
        setError("Reports could not refresh. Your saved receipts have not changed.");
      }
    } finally {
      if (current === generation.current && !accountChanged.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user.id !== ownerId) {
        accountChanged.current = true;
        generation.current++;
        setClosed(true);
        setReceipts(null);
      }
    });
    void load();
    return () => {
      // This ref is a request nonce, not a DOM node; invalidate all in-flight reads.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      subscription.unsubscribe();
    };
  }, [load, ownerId]);

  if (closed) return <section className={s.shell}><h1>Reports closed</h1>
    <p>Your account changed. Reopen reports to continue.</p><a href="/account/store/reports">Reopen reports</a></section>;

  return <section className={s.shell} aria-label="Reports">
    <header className={s.header}><h1>Reports</h1><Link href="/account/store/receipts/cloud">Receipts & customers</Link></header>
    {error && <p role="alert">{error} <button onClick={() => void load()} disabled={loading}>Try again</button></p>}
    {loading && !receipts ? <p role="status">Loading saved sales…</p> :
      <SalesDashboard receipts={receipts} loading={loading} refresh={() => void load()} />}
  </section>;
}
