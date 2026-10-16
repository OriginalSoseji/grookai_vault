"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { minor, money } from "@/lib/sales/salesDesk.mjs";
import { cardProfit, taxInclusivePortion } from "@/lib/sales/cardProfit.mjs";
import type { SalesTaxMode } from "@/lib/sales/cardProfit.mjs";
import { readIncomeTaxBps, writeIncomeTaxBps } from "@/lib/sales/cardProfitSettings.mjs";
import s from "./SalesDesk.module.css";

type CardRow = { instanceId: string; gvviId: string | null; name: string; setCode: string; number: string; condition: string; acquisitionDate: string; acquisitionCostMinor: number | null; saleAt: string | null; saleRequestId: string | null; saleMinor: number | null; allocatedSalesTaxMinor: number; sellingFeeMinor: number | null; sellingFeeRecorded: boolean; netRevenueMinor: number | null; grossProfitMinor: number | null; incomeTaxMinor: number | null; profitAfterTaxMinor: number | null; marketPriceMinor: number | null; estimatedGrossProfitMinor: number | null; status: "realized" | "sold_unknown_cost" | "unsold" };
type Totals = { realizedRevenueMinor: number; realizedCogMinor: number; sellingFeeMinor: number; grossProfitMinor: number; incomeTaxMinor: number; profitAfterTaxMinor: number; knownSoldCount: number; unknownCostCount: number; unsoldCount: number };

const n = (value: unknown) => typeof value === "number" ? value : Number(value ?? 0);

export default function CardProfitabilityManager() {
  const [rows, setRows] = useState<CardRow[]>([]), [totals, setTotals] = useState<Totals | null>(null);
  const [offers, setOffers] = useState<Record<string, string>>({});
  const [from, setFrom] = useState(""), [to, setTo] = useState(""), [dateBasis, setDateBasis] = useState<"acquired" | "sold">("acquired"), [tax, setTax] = useState("25.00"), [salesTaxRate, setSalesTaxRate] = useState("0.00"), [taxMode, setTaxMode] = useState<SalesTaxMode>("pass_through"), [sellingFeeRate, setSellingFeeRate] = useState("0.00"), [sellingFeeFixed, setSellingFeeFixed] = useState("0.00");
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [backfilling, setBackfilling] = useState<string | null>(null);
  const persistSettings = (incomeTaxBps: number, mode: SalesTaxMode, salesTaxRateBps: number, feeBps = Math.round(Number(sellingFeeRate) * 100), feeFixedMinor = minor(sellingFeeFixed) ?? 0) => {
    writeIncomeTaxBps(window.localStorage, incomeTaxBps);
    void fetch("/api/inventory/acquisition", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action: "settings", incomeTaxBps, salesTaxMode: mode, salesTaxRateBps, sellingFeeBps: feeBps, sellingFeeFixedMinor: feeFixedMinor }) });
  };
  useEffect(() => {
    const fallback = readIncomeTaxBps(window.localStorage);
    setTax((fallback / 100).toFixed(2));
    void fetch("/api/inventory/acquisition?action=settings", { cache: "no-store" }).then(async response => response.ok ? response.json() : null).then(settings => {
      if (!settings) return;
      const bps = Number(settings.incomeTaxBps), rateBps = Number(settings.salesTaxRateBps ?? 0), feeBps = Number(settings.sellingFeeBps ?? 0), feeFixedMinor = Number(settings.sellingFeeFixedMinor ?? 0), mode = settings.salesTaxMode === "include_in_offer" ? "include_in_offer" : "pass_through";
      if (Number.isInteger(bps) && bps >= 0 && bps <= 10000) { setTax((bps / 100).toFixed(2)); writeIncomeTaxBps(window.localStorage, bps); }
      if (Number.isInteger(rateBps) && rateBps >= 0 && rateBps <= 10000) setSalesTaxRate((rateBps / 100).toFixed(2));
      if (Number.isInteger(feeBps) && feeBps >= 0 && feeBps <= 10000) setSellingFeeRate((feeBps / 100).toFixed(2));
      if (Number.isSafeInteger(feeFixedMinor) && feeFixedMinor >= 0 && feeFixedMinor <= 1000000) setSellingFeeFixed((feeFixedMinor / 100).toFixed(2));
      setTaxMode(mode);
    }).catch(() => { /* local fallback remains active */ });
  }, []);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const incomeTaxBps = Math.round(Number(tax) * 100);
      if (!Number.isInteger(incomeTaxBps) || incomeTaxBps < 0 || incomeTaxBps > 10000) throw Error("Income tax must be between 0% and 100%.");
      const query = new URLSearchParams({ action: "card-pnl", dateBasis, incomeTaxBps: String(incomeTaxBps), salesTaxMode: taxMode, limit: "500" });
      if (from) query.set("from", new Date(`${from}T00:00:00`).toISOString());
      if (to) query.set("to", new Date(`${to}T00:00:00`).toISOString());
      const response = await fetch(`/api/inventory/acquisition?${query}`, { cache: "no-store" });
      const data = await response.json(); if (!response.ok) throw Error(data.error ?? "Card profitability could not load");
      const feeRate = Number(sellingFeeRate), feeBps = feeRate * 100, feeFixedMinor = minor(sellingFeeFixed);
      if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 10000 || feeFixedMinor == null || feeFixedMinor < 0 || feeFixedMinor > 1000000) throw Error("Selling fees must be a percentage from 0% to 100% and a fixed fee from $0.00 to $10,000.00.");
      const items: CardRow[] = (data.items ?? []).map((row: CardRow) => {
        const sellingFeeMinor = row.saleMinor == null ? 0 : row.sellingFeeMinor == null ? Math.round(row.saleMinor * feeBps / 10000) + feeFixedMinor : row.sellingFeeMinor;
        const netRevenueMinor = row.netRevenueMinor == null ? null : row.netRevenueMinor - sellingFeeMinor;
        const grossProfitMinor = netRevenueMinor != null && row.acquisitionCostMinor != null ? netRevenueMinor - row.acquisitionCostMinor : null;
        const incomeTaxBps = Math.round(Number(tax) * 100);
        const incomeTaxMinor = grossProfitMinor == null ? null : grossProfitMinor > 0 ? Math.round(grossProfitMinor * incomeTaxBps / 10000) : 0;
        return { ...row, saleRequestId: row.saleRequestId ?? null, sellingFeeRecorded: Boolean(row.sellingFeeRecorded), sellingFeeMinor, netRevenueMinor, grossProfitMinor, incomeTaxMinor, profitAfterTaxMinor: grossProfitMinor == null ? null : grossProfitMinor - (incomeTaxMinor ?? 0) };
      });
      const realized = items.filter(row => row.status === "realized");
      setRows(items); setTotals({ realizedRevenueMinor: realized.reduce((sum, row) => sum + (row.netRevenueMinor ?? 0), 0), realizedCogMinor: realized.reduce((sum, row) => sum + (row.acquisitionCostMinor ?? 0), 0), sellingFeeMinor: realized.reduce((sum, row) => sum + (row.sellingFeeMinor ?? 0), 0), grossProfitMinor: realized.reduce((sum, row) => sum + (row.grossProfitMinor ?? 0), 0), incomeTaxMinor: realized.reduce((sum, row) => sum + (row.incomeTaxMinor ?? 0), 0), profitAfterTaxMinor: realized.reduce((sum, row) => sum + (row.profitAfterTaxMinor ?? 0), 0), knownSoldCount: realized.length, unknownCostCount: items.filter(row => row.status === "sold_unknown_cost").length, unsoldCount: items.filter(row => row.status === "unsold").length });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Card profitability could not load"); }
    finally { setLoading(false); }
  }, [dateBasis, from, sellingFeeFixed, sellingFeeRate, tax, taxMode, to]);
  useEffect(() => { void load(); }, [load]);
  async function backfillFee(row: CardRow) {
    if (!row.saleRequestId || row.sellingFeeRecorded) return;
    setBackfilling(row.instanceId); setError("");
    try {
      const response = await fetch("/api/inventory/acquisition", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action: "backfill-selling-fee", requestId: row.saleRequestId }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error ?? "Selling fee snapshot could not be saved");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Selling fee snapshot could not be saved"); }
    finally { setBackfilling(null); }
  }
  const estimatedRemainingAfterTax = rows.reduce((sum, row) => {
    const taxBps = Number(tax) * 100;
    if (row.status !== "unsold" || row.acquisitionCostMinor == null || row.marketPriceMinor == null || !Number.isInteger(taxBps) || taxBps < 0 || taxBps > 10000) return sum;
    if (!Number.isFinite(Number(sellingFeeRate)) || Number(sellingFeeRate) < 0) return sum;
    const fixedFeeMinor = minor(sellingFeeFixed);
    if (fixedFeeMinor == null || fixedFeeMinor < 0 || fixedFeeMinor > 1000000) return sum;
    const sellingFeeMinor = Math.round(row.marketPriceMinor * Number(sellingFeeRate) * 100 / 10000) + fixedFeeMinor;
    return sum + (cardProfit({ saleMinor: row.marketPriceMinor, costMinor: row.acquisitionCostMinor, incomeTaxBps: taxBps, sellingFeeMinor })?.profitAfterTaxMinor ?? 0);
  }, 0);
  function exportCsv() {
    const headers = ["GVVI", "Card", "Set", "Number", "Condition", "Acquisition date", "Sale date", "COG", "Sale", "Sales tax", "Selling fee", "Fee basis", "Net revenue", "Gross profit", "Income tax estimate", "Profit after tax", "Status"];
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const body = rows.map(row => [row.gvviId, row.name, row.setCode, row.number, row.condition, row.acquisitionDate, row.saleAt, row.acquisitionCostMinor == null ? "" : money(row.acquisitionCostMinor), row.saleMinor == null ? "" : money(row.saleMinor), money(row.allocatedSalesTaxMinor), money(n(row.sellingFeeMinor)), row.saleMinor == null ? "" : row.sellingFeeRecorded ? "Recorded" : "Estimated", row.netRevenueMinor == null ? "" : money(row.netRevenueMinor), row.grossProfitMinor == null ? "" : money(row.grossProfitMinor), row.incomeTaxMinor == null ? "" : money(row.incomeTaxMinor), row.profitAfterTaxMinor == null ? "" : money(row.profitAfterTaxMinor), row.status].map(escape).join(","));
    const summary = totals ? [["Report date basis", dateBasis === "sold" ? "Sale date" : "Acquisition date"], ["Realized revenue", money(n(totals.realizedRevenueMinor))], ["Realized COG", money(n(totals.realizedCogMinor))], ["Selling fees", money(n(totals.sellingFeeMinor))], ["Realized gross profit", money(n(totals.grossProfitMinor))], ["Estimated income tax", money(n(totals.incomeTaxMinor))], ["Realized profit after tax", money(n(totals.profitAfterTaxMinor))], ["Potential unsold profit after tax", money(estimatedRemainingAfterTax)], [], []].map(row => row.map(escape).join(",")) : [];
    const blob = new Blob([[...summary, headers.map(escape).join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob), anchor = document.createElement("a");
    anchor.href = url; anchor.download = `grookai-card-pnl-${dateBasis}-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }
  return <main className={s.shell}>
    <header className={s.header}><div><Link href="/account/store/inventory-cost"><ArrowLeft size={15}/> Inventory aging & COG</Link><h1>Per-card P&amp;L <span>Exact GVVI cost, sale proceeds, estimated income tax, and profit after tax.</span></h1></div><div className={s.actions}><button onClick={exportCsv} disabled={loading || rows.length === 0}><Download size={16}/> Export CSV</button><button onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Refresh</button></div></header>
    {error && <div role="alert" className={s.error}>{error}</div>}

    <section className={s.toolbar}><label>Date basis<select value={dateBasis} onChange={event => setDateBasis(event.target.value as "acquired" | "sold")}><option value="acquired">Acquisition date</option><option value="sold">Sale date</option></select></label><label>{dateBasis === "sold" ? "Sold from" : "Acquired from"}<input type="date" value={from} onChange={event => setFrom(event.target.value)}/></label><label>{dateBasis === "sold" ? "Sold to" : "Acquired to"}<input type="date" value={to} onChange={event => setTo(event.target.value)}/></label><label>Estimated income tax rate<input inputMode="decimal" value={tax} onChange={event => { const value = event.target.value; setTax(value); const bps = Number(value) * 100; if (Number.isInteger(bps) && bps >= 0 && bps <= 10000) persistSettings(bps, taxMode, Math.round(Number(salesTaxRate) * 100)); }} aria-label="Estimated income tax rate"/><small>Used only to estimate tax on positive gross profit.</small></label><label>Selling fee rate<input inputMode="decimal" value={sellingFeeRate} onChange={event => { const value = event.target.value; setSellingFeeRate(value); const bps = Number(value) * 100; if (Number.isInteger(bps) && bps >= 0 && bps <= 10000) persistSettings(Math.round(Number(tax) * 100), taxMode, Math.round(Number(salesTaxRate) * 100), bps, minor(sellingFeeFixed) ?? 0); }} aria-label="Selling fee rate"/><small>Estimated fee deducted before income tax.</small></label><label>Fixed fee per sold card<input inputMode="decimal" value={sellingFeeFixed} onChange={event => { const value = event.target.value; setSellingFeeFixed(value); const fixed = minor(value); if (fixed != null && fixed <= 1000000) persistSettings(Math.round(Number(tax) * 100), taxMode, Math.round(Number(salesTaxRate) * 100), Math.round(Number(sellingFeeRate) * 100), fixed); }} aria-label="Fixed selling fee"/></label><label>Sales tax treatment<select value={taxMode} onChange={event => { const mode = event.target.value as SalesTaxMode; setTaxMode(mode); persistSettings(Math.round(Number(tax) * 100), mode, Math.round(Number(salesTaxRate) * 100)); }}><option value="pass_through">Pass-through (recommended)</option><option value="include_in_offer">Customer offer includes sales tax</option></select></label>{taxMode === "include_in_offer" && <label>Sales tax rate<input inputMode="decimal" value={salesTaxRate} onChange={event => { const value = event.target.value; setSalesTaxRate(value); const rateBps = Number(value) * 100; if (Number.isInteger(rateBps) && rateBps >= 0 && rateBps <= 10000) persistSettings(Math.round(Number(tax) * 100), taxMode, rateBps); }} aria-label="Sales tax rate"/><small>Used for the hypothetical offer preview.</small></label>}</section>
    <section className={s.inventory}><div className={s.cartHeader}><h2>Realized P&amp;L &amp; offer preview</h2><span>{loading ? "Loading…" : `${rows.length} exact cards`}</span></div>{totals && <div className={s.resultBar}><span>Net revenue <strong>${money(n(totals.realizedRevenueMinor))}</strong></span><span>COG <strong>${money(n(totals.realizedCogMinor))}</strong></span><span>Selling fees <strong>${money(n(totals.sellingFeeMinor))}</strong></span><span>Gross <strong>${money(n(totals.grossProfitMinor))}</strong></span><span>Income tax est. <strong>${money(n(totals.incomeTaxMinor))}</strong></span><span>After tax <strong>${money(n(totals.profitAfterTaxMinor))}</strong></span><span>Potential after tax <strong>${money(estimatedRemainingAfterTax)}</strong></span></div>}<p className={s.muted}>Sales tax is excluded from profit when treated as pass-through. The selling fee estimate is deducted before income tax. Older sales without saved fee evidence are marked estimated; lock the current fee assumption to make their report repeatable. Payroll, overhead, and other deductions are not included. Potential after-tax profit uses current market estimates for unsold cards with known COG. For an unsold card, enter a customer offer to see the projected result before accepting it.</p><div className={s.lines}>{rows.map(row => { const offerMinor = minor(offers[row.instanceId] ?? ""); const previewTaxBps = Number(tax) * 100; const previewSalesTaxRate = Number(salesTaxRate); const previewSellingFeeRate = Number(sellingFeeRate); const previewSellingFeeMinor = offerMinor == null ? 0 : Math.round(offerMinor * previewSellingFeeRate * 100 / 10000) + (minor(sellingFeeFixed) ?? 0); const previewFixedFeeMinor = minor(sellingFeeFixed); const preview = row.status === "unsold" && row.acquisitionCostMinor != null && offerMinor != null && previewFixedFeeMinor != null && previewFixedFeeMinor >= 0 && previewFixedFeeMinor <= 1000000 && Number.isInteger(previewTaxBps) && previewTaxBps >= 0 && previewTaxBps <= 10000 && Number.isFinite(previewSalesTaxRate) && previewSalesTaxRate >= 0 && Number.isFinite(previewSellingFeeRate) && previewSellingFeeRate >= 0 ? cardProfit({ saleMinor: offerMinor, costMinor: row.acquisitionCostMinor, incomeTaxBps: previewTaxBps, salesTaxMode: taxMode, salesTaxMinor: taxMode === "include_in_offer" ? taxInclusivePortion(offerMinor, previewSalesTaxRate) : 0, sellingFeeMinor: previewSellingFeeMinor }) : null; return <div className={s.line} key={row.instanceId}><div><strong>{row.name} · {row.setCode} · {row.number}</strong><small>{row.condition} · {row.gvviId ?? "No GVVI"} · acquired {new Date(row.acquisitionDate).toLocaleDateString()}</small>{row.status === "realized" ? <><small>COG ${money(n(row.acquisitionCostMinor))} · sale ${money(n(row.saleMinor))} · fee ${money(n(row.sellingFeeMinor))} ({row.sellingFeeRecorded ? "recorded" : "estimated"}) · net revenue ${money(n(row.netRevenueMinor))} · gross ${money(n(row.grossProfitMinor))} · tax est. ${money(n(row.incomeTaxMinor))} · <strong>after tax ${money(n(row.profitAfterTaxMinor))}</strong></small>{!row.sellingFeeRecorded && row.saleRequestId && <button type="button" disabled={backfilling === row.instanceId} onClick={() => void backfillFee(row)}>{backfilling === row.instanceId ? "Locking…" : "Lock current fee assumption"}</button>}</> : row.status === "sold_unknown_cost" ? <small>Sold ${money(n(row.saleMinor))} · COG unknown — backfill the exact paid amount to complete P&amp;L.</small> : <><small>Unsold · COG {row.acquisitionCostMinor == null ? "unknown" : `$${money(n(row.acquisitionCostMinor))}`} · market estimate {row.marketPriceMinor == null ? "unknown" : `$${money(n(row.marketPriceMinor))}`}{row.estimatedGrossProfitMinor != null ? ` · estimated gross profit $${money(n(row.estimatedGrossProfitMinor))}` : ""}</small>{row.acquisitionCostMinor != null && <label>Customer offer $<input inputMode="decimal" placeholder="90.00" value={offers[row.instanceId] ?? ""} onChange={event => setOffers(current => ({ ...current, [row.instanceId]: event.target.value }))}/>{preview && <small>Projected gross ${money(preview.grossProfitMinor)} · fee ${money(previewSellingFeeMinor)} · tax est. ${money(preview.incomeTaxMinor)} · <strong>after tax ${money(preview.profitAfterTaxMinor)}</strong></small>}</label>}</>}</div></div>})}</div>{!loading && rows.length === 0 && <p className={s.empty}>No cards match this acquisition date range.</p>}</section>
  </main>;
}
