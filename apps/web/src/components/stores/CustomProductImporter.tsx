"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { parseCustomProductCsv, CUSTOM_IMPORT_MAX_BYTES, CUSTOM_IMPORT_TEMPLATE, type CustomImportRow } from "@/lib/stores/customProductImport";
import type { CustomImportReceipt } from "@/lib/stores/customProductImportService";
import { storeRequest } from "./storeManagerClient";
import { useStoreDraftGuard } from "./useStoreDraftGuard";

export default function CustomProductImporter({batchId, initialReceipt, canImport}: {batchId:string; initialReceipt:CustomImportReceipt|null; canImport:boolean}) {
  const [rows,setRows] = useState<CustomImportRow[]|null>(null), [receipt,setReceipt] = useState(initialReceipt);
  const [filename,setFilename] = useState(""), [error,setError] = useState(""), [busy,setBusy] = useState(false), [attempted,setAttempted] = useState(false), [confirmed,setConfirmed] = useState(false);
  const lock = useRef(false);
  const [ready,setReady] = useState(false);
  useEffect(()=>setReady(true),[]);
  useStoreDraftGuard(Boolean(rows && !receipt));
  const task = async (work:()=>Promise<void>) => {
    if(lock.current)return; lock.current=true;setBusy(true);setError("");
    try { await work(); } catch(e) {setError(e instanceof Error ? e.message : "Import could not be confirmed. Check its status.");}
    finally {lock.current=false;setBusy(false);}
  };
  const check = async () => {
    const data=await storeRequest<{receipt:CustomImportReceipt|null}>(`/api/stores/owner/import?id=${batchId}`);
    if(data.receipt) {setReceipt(data.receipt);setRows(null);}
    else setError("No completed import was found. You can retry this same batch with the same file.");
  };
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8" aria-busy={busy}>
    <header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-3xl font-bold">Import custom collectibles</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Create private drafts for seller-described collectibles. Add photos and review each listing before publishing. Each CSV row creates a separate product; this does not update existing stock.</p></div><Link href="/account/store" className="text-sm font-semibold">Back to store workspace</Link></header>
    {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4">{error}</p>}
    {receipt ? <section className="space-y-4 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-semibold" role="status">{receipt.productIds.length} drafts imported</h2><p className="text-sm">Nothing was published. Open each product to add photos, choose sections and review its details.</p>
      <ol className="grid gap-2 sm:grid-cols-2" aria-label="Imported drafts">{receipt.productIds.map((id,index)=><li key={id}><Link className="text-emerald-800 underline" href={`/account/store?product=${id}`}>Edit imported product {index+1}</Link></li>)}</ol>
      <p className="text-sm text-slate-500">This page retains your batch receipt. Refreshing it does not import again.</p><Link href="/account/store/import" prefetch={false} className="inline-block font-semibold underline">Start a different import</Link>
    </section> : <>
      {!canImport && <p role="status" className="rounded-xl border p-4">Create a store and use an active store package to import new drafts. Existing import receipts remain available.</p>}
      <section className="space-y-4 rounded-xl border bg-white p-5">
        <h2 className="text-xl font-semibold">1. Choose your CSV</h2><p className="text-sm">Up to 100 products and 1 MiB per file. Required columns: title and available_quantity. Prices use decimal USD amounts. Optional columns cover description, category, franchise, manufacturer, region, language, condition, packaging and private SKU.</p>
        <a download="grookai-custom-products.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(CUSTOM_IMPORT_TEMPLATE)}`} className="inline-block font-semibold text-emerald-800 underline">Download CSV template</a>
        <label className="block text-sm font-semibold">Custom product CSV<input aria-label="Custom product CSV" className="mt-2 block w-full max-w-full" type="file" accept=".csv,text/csv" disabled={!ready || busy || !canImport || attempted} onChange={event=>{
          const file=event.target.files?.[0];event.target.value="";if(!file)return;
          void task(async()=>{setRows(null);setConfirmed(false);if(file.size>CUSTOM_IMPORT_MAX_BYTES)throw new Error("Choose a CSV up to 1 MiB.");let text;try{text=new TextDecoder("utf-8",{fatal:true}).decode(await file.arrayBuffer());}catch{throw new Error("Save the CSV as UTF-8 and choose it again.");}setRows(parseCustomProductCsv(text));setFilename(file.name);});
        }} /></label>
        <p className="text-sm text-slate-500">Keep this page if a request is interrupted. After refreshing, choose the original file to resume this batch.</p>
      </section>
      {rows && <section className="space-y-4 rounded-xl border bg-white p-5">
        <h2 className="text-xl font-semibold">2. Review {rows.length} drafts</h2><p className="break-all text-sm">{filename}</p>
        <p className="text-xs text-slate-500 sm:hidden">Swipe the preview table to review all columns.</p><div className="max-w-full overflow-x-auto"><table className="w-full min-w-[42rem] text-left text-sm"><caption className="sr-only">Custom product import preview</caption><thead><tr>{["Title","Quantity","Price (USD)","Private SKU","Details"].map(label=><th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index} className="border-t"><td className="max-w-xs break-words p-2">{row.title}</td><td className="p-2">{row.available_quantity}</td><td className="p-2">{row.asking_price_amount===null?"Not set":row.asking_price_amount.toFixed(2)}</td><td className="max-w-xs break-words p-2">{row.private_sku || "—"}</td><td className="p-2"><details><summary className="cursor-pointer">Review row {index+1}</summary><dl className="min-w-48 max-w-md">{Object.entries(row).filter(([key])=>!["title","available_quantity","asking_price_amount","private_sku"].includes(key)).map(([key,value])=><div className="py-1" key={key}><dt className="font-semibold">{key.replaceAll("_"," ")}</dt><dd className="whitespace-pre-wrap break-words">{value || "Not set"}</dd></div>)}</dl></details></td></tr>)}</tbody></table></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={busy || attempted} onChange={e=>setConfirmed(e.target.checked)} />I reviewed these rows and want to create {rows.length} separate private drafts.</label>
        <button className="rounded-full bg-slate-900 px-5 py-2 font-semibold text-white disabled:opacity-50" disabled={busy || !confirmed || !canImport} onClick={()=>void task(async()=>{
          setAttempted(true);const data=await storeRequest<{receipt:CustomImportReceipt}>("/api/stores/owner/import",{id:batchId,rows});setReceipt(data.receipt);setRows(null);
        })}>{attempted?"Retry this batch":"Create drafts"}</button>
      </section>}
      <button disabled={busy} className="font-semibold underline" onClick={()=>void task(check)}>Check import status</button>
    </>}
  </main>;
}
