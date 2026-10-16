"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { minor, money } from "@/lib/sales/salesDesk.mjs";
import { cardProfit, taxInclusivePortion } from "@/lib/sales/cardProfit.mjs";
import { readIncomeTaxBps, writeIncomeTaxBps } from "@/lib/sales/cardProfitSettings.mjs";
import s from "./SalesDesk.module.css";

type CardRow = { instanceId: string; gvviId: string | null; name: string; setCode: string; number: string; condition: string; acquisitionDate: string; acquisitionCostMinor: number | null; saleAt: string | null; saleMinor: number | null; allocatedSalesTaxMinor: number; netRevenueMinor: number | null; grossProfitMinor: number | null; incomeTaxMinor: number | null; profitAfterTaxMinor: number | null; marketPriceMinor: number | null; estimatedGrossProfitMinor: number | null; status: "realized" | "sold_unknown_cost" | "unsold" };
type Totals = { realizedRevenueMinor: number; realizedCogMinor: number; grossProfitMinor: number; incomeTaxMinor: number; profitAfterTaxMinor: number; knownSoldCount: number; unknownCostCount: number; unsoldCount: number };

const n = (value: unknown) => typeof value === "number" ? value : Number(value ?? 0);

export default function CardProfitabilityManager() {
  const [rows, setRows] = useState<CardRow[]>([]), [totals, setTotals] = useState<Totals | null>(null);
  const [offers, setOffers] = useState<Record<string, string>>({});
  const [from, setFrom] = useState(""), [to, setTo] = useState(""), [tax, setTax] = useState("25.00"), [salesTaxRate, setSalesTaxRate] = useState("0.00"), [taxMode, setTaxMode] = useState("pass_through");
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  useEffect(() => { setTax((readIncomeTaxBps(window.localStorage) / 100).toFixed(2)); }, []);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const incomeTaxBps = Math.round(Number(tax) * 100);
      if (!Number.isInteger(incomeTaxBps) || incomeTaxBps < 0 || incomeTaxBps > 10000) throw Error("Income tax must be between 0% and 100%.");
      const query = new URLSearchParams({ action: "card-pnl", incomeTaxBps: String(incomeTaxBps), salesTaxMode: taxMode, limit: "500" });
      if (from) query.set("from", new Date(`${from}T00:00:00`).toISOString());
      if (to) query.set("to", new Date(`${to}T00:00:00`).toISOString());
      const response = await fetch(`/api/inventory/acquisition?${query}`, { cache: "no-store" });
      const data = await response.json(); if (!response.ok) throw Error(data.error ?? "Card profitability could not load");
      setRows(data.items ?? []); setTotals(data.totals ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Card profitability could not load"); }
    finally { setLoading(false); }
  }, [from, tax, taxMode, to]);
  useEffect(() => { void load(); }, [load]);
  return <main className={s.shell}>
    <header className={s.header}><div><Link href="/account/store/inventory-cost"><ArrowLeft size={15}/> Inventory aging & COG</Link><h1>Per-card P&amp;L <span>Exact GVVI cost, sale proceeds, estimated income tax, and profit after tax.</span></h1></div><div className={s.actions}><button onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Refresh</button></div></header>
    {error && <div role="alert" className={s.error}>{error}</div>}
    <section className={s.toolbar}><label>Acquired from<input type="date" value={from} onChange={event => setFrom(event.target.value)}/></label><label>Acquired to<input type="date" value={to} onChange={event => setTo(event.target.value)}/></label><label>Estimated income tax rate<input inputMode="decimal" value={tax} onChange={event => { const value = event.target.value; setTax(value); const bps = Number(value) * 100; if (Number.isInteger(bps) && bps >= 0 && bps <= 10000) writeIncomeTaxBps(window.localStorage, bps); }} aria-label="Estimated income tax rate"/><small>Used only to estimate tax on positive gross profit.</small></label><label>Sales tax treatment<select value={taxMode} onChange={event => setTaxMode(event.target.value)}><option value="pass_through">Pass-through (recommended)</option><option value="include_in_offer">Customer offer includes sales tax</option></select></label>{taxMode === "include_in_offer" && <label>Sales tax rate<input inputMode="decimal" value={salesTaxRate} onChange={event => setSalesTaxRate(event.target.value)} aria-label="Sales tax rate"/><small>Used for the hypothetical offer preview.</small></label>}</section>
    <section className={s.inventory}><div className={s.cartHeader}><h2>Realized P&amp;L &amp; offer preview</h2><span>{loading ? "Loading…" : `${rows.length} exact cards`}</span></div>{totals && <div className={s.resultBar}><span>Revenue <strong>${money(n(totals.realizedRevenueMinor))}</strong></span><span>COG <strong>${money(n(totals.realizedCogMinor))}</strong></span><span>Gross <strong>${money(n(totals.grossProfitMinor))}</strong></span><span>Income tax est. <strong>${money(n(totals.incomeTaxMinor))}</strong></span><span>After tax <strong>${money(n(totals.profitAfterTaxMinor))}</strong></span></div>}<p className={s.muted}>Sales tax is excluded from profit when treated as pass-through. Income tax is an estimate on positive profit; fees, payroll, and other deductions are not included. For an unsold card, enter a customer offer to see the projected after-tax result before accepting it.</p><div className={s.lines}>{rows.map(row => { const offerMinor = minor(offers[row.instanceId] ?? ""); const previewTaxBps = Number(tax) * 100; const previewSalesTaxRate = Number(salesTaxRate); const preview = row.status === "unsold" && row.acquisitionCostMinor != null && offerMinor != null && Number.isInteger(previewTaxBps) && previewTaxBps >= 0 && previewTaxBps <= 10000 && Number.isFinite(previewSalesTaxRate) && previewSalesTaxRate >= 0 ? cardProfit({ saleMinor: offerMinor, costMinor: row.acquisitionCostMinor, incomeTaxBps: previewTaxBps, salesTaxMode: taxMode, salesTaxMinor: taxMode === "include_in_offer" ? taxInclusivePortion(offerMinor, previewSalesTaxRate) : 0 }) : null; return <div className={s.line} key={row.instanceId}><div><strong>{row.name} · {row.setCode} · {row.number}</strong><small>{row.condition} · {row.gvviId ?? "No GVVI"} · acquired {new Date(row.acquisitionDate).toLocaleDateString()}</small>{row.status === "realized" ? <small>COG ${money(n(row.acquisitionCostMinor))} · sale ${money(n(row.saleMinor))} · net revenue ${money(n(row.netRevenueMinor))} · gross ${money(n(row.grossProfitMinor))} · tax est. ${money(n(row.incomeTaxMinor))} · <strong>after tax ${money(n(row.profitAfterTaxMinor))}</strong></small> : row.status === "sold_unknown_cost" ? <small>Sold ${money(n(row.saleMinor))} · COG unknown — backfill the exact paid amount to complete P&amp;L.</small> : <><small>Unsold · COG {row.acquisitionCostMinor == null ? "unknown" : `$${money(n(row.acquisitionCostMinor))}`} · market estimate {row.marketPriceMinor == null ? "unknown" : `$${money(n(row.marketPriceMinor))}`}{row.estimatedGrossProfitMinor != null ? ` · estimated gross profit $${money(n(row.estimatedGrossProfitMinor))}` : ""}</small>{row.acquisitionCostMinor != null && <label>Customer offer $<input inputMode="decimal" placeholder="90.00" value={offers[row.instanceId] ?? ""} onChange={event => setOffers(current => ({ ...current, [row.instanceId]: event.target.value }))}/>{preview && <small>Projected gross ${money(preview.grossProfitMinor)} · tax est. ${money(preview.incomeTaxMinor)} · <strong>after tax ${money(preview.profitAfterTaxMinor)}</strong></small>}</label>}</>}</div></div>})}</div>{!loading && rows.length === 0 && <p className={s.empty}>No cards match this acquisition date range.</p>}</section>
  </main>;
}
