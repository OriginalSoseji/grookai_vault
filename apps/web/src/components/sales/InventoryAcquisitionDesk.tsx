"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, Plus, Search, Trash2 } from "lucide-react";
import { allocationPreview } from "@/lib/sales/acquisitionAllocation.mjs";
import { conditions, minor, money } from "@/lib/sales/salesDesk.mjs";
import { purchaseRequest } from "@/lib/sales/salesPurchase.mjs";
import s from "./SalesDesk.module.css";

type Printing = { id: string; finish_label: string; printing_gv_id: string };
type Card = { id: string; name: string; set_code?: string; number?: string; image?: string | null; printings?: Printing[] };
type Line = { id: string; cardId: string; printingId: string; description: string; condition: string; image?: string | null; referenceMinor: number | null; allocatedMinor: number };

const blankSeller = { name: "", email: "", phone: "", wants: "", notes: "" };

export default function InventoryAcquisitionDesk({ owner }: { owner: string }) {
  const [query, setQuery] = useState(""), [game, setGame] = useState("pokemon"), [cards, setCards] = useState<Card[]>([]);
  const [searching, setSearching] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Card | null>(null), [printingId, setPrintingId] = useState(""), [condition, setCondition] = useState("NM");
  const [lines, setLines] = useState<Line[]>([]), [total, setTotal] = useState(""), [mode, setMode] = useState<"equal_split" | "weighted_reference" | "manual">("equal_split");
  const [storeName, setStoreName] = useState(""), [seller, setSeller] = useState(blankSeller), [note, setNote] = useState(""), [method, setMethod] = useState("Cash");
  const [busy, setBusy] = useState(false), [receipt, setReceipt] = useState<any>(null);
  const totalMinor = minor(total) ?? 0;
  const allocations = useMemo(() => allocationPreview(totalMinor, lines, mode), [totalMinor, lines, mode]);
  const allocatedTotal = allocations.reduce((sum, value) => sum + value, 0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) { setCards([]); return; }
      setSearching(true); setError("");
      try {
        const response = await fetch(`/api/sales/desk?action=catalog&q=${encodeURIComponent(query)}&game=${encodeURIComponent(game)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw Error(data.error ?? "Search failed");
        setCards(data.cards ?? []);
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Search failed"); }
      finally { setSearching(false); }
    }, 220);
    return () => clearTimeout(timer);
  }, [query, game]);

  function choose(card: Card) {
    setSelected(card); setPrintingId(card.printings?.[0]?.id ?? ""); setCondition("NM"); setError("");
  }
  function addLine() {
    if (!selected || !printingId) { setError("Choose the exact printing/finish before adding the copy."); return; }
    if (lines.length >= 50) { setError("A purchase can contain up to 50 exact copies."); return; }
    const printing = selected.printings?.find(item => item.id === printingId);
    if (!printing) { setError("That printing is no longer available. Search again."); return; }
    setLines(current => [...current, { id: crypto.randomUUID(), cardId: selected.id, printingId, description: `${selected.name} · ${printing.printing_gv_id} · ${condition}`, condition, image: selected.image, referenceMinor: null, allocatedMinor: 0 }]);
    setSelected(null);
  }
  async function submit() {
    if (!lines.length) { setError("Add at least one exact card copy."); return; }
    if (!totalMinor || allocatedTotal !== totalMinor) { setError("Enter the total paid. The allocation must reconcile exactly to that total."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const id = crypto.randomUUID();
      const request = purchaseRequest({
        storeName: storeName.trim() || "grookai vault",
        items: lines.map((line, index) => ({ description: line.description, quantity: 1, unitMinor: allocations[index], referenceMinor: line.referenceMinor, rateBps: line.referenceMinor == null ? null : 10000, cardId: line.cardId, printingId: line.printingId, condition: line.condition, addToVault: true })),
        payments: [{ method, amountMinor: totalMinor, tenderedMinor: totalMinor }], note, customerId: null, customer: seller, confirmed: true,
      }, id);
      const response = await fetch("/api/sales/desk", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action: "purchase", owner, ...request }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.error ?? "Purchase could not be recorded");
      setReceipt(data.result); setNotice("Purchase recorded. Each exact GVVI was created with its allocated COG.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Purchase could not be recorded"); }
    finally { setBusy(false); }
  }
  function reset() { setLines([]); setTotal(""); setReceipt(null); setNotice(""); setSeller(blankSeller); }

  return <main className={s.shell}>
    <header className={s.header}><div><Link href="/account/store/sales"><ArrowLeft size={15}/> Sales desk</Link><h1>Buy / intake <span>Every card gets an exact GVVI cost trail.</span></h1></div><div className={s.actions}><Link href="/account/store/inventory-cost">Inventory aging & backfill</Link></div></header>
    {error && <div role="alert" className={s.error}>{error}</div>}
    {notice && <p role="status" className={s.notice}>{notice}</p>}
    {receipt ? <section className={s.saved}><Check /><h2>Purchase recorded</h2><p>{receipt.number} · {receipt.items.length} exact copies · ${money(receipt.purchaseMinor)}</p><p>Each card is now in Vault with its GVVI, purchase COG, acquisition date, and batch link.</p><button className={s.primary} onClick={reset}>Record another purchase</button></section> : <div className={s.workspace}>
      <section className={s.inventory} aria-label="Find exact cards to buy">
        <div className={s.toolbar}><div className={s.tabs}><button aria-pressed={game === "pokemon"} onClick={() => setGame("pokemon")}>Pokémon</button><button aria-pressed={game === "mtg"} onClick={() => setGame("mtg")}>Magic</button><button aria-pressed={game === "one_piece"} onClick={() => setGame("one_piece")}>One Piece</button></div></div>
        <div className={s.search}><Search size={19}/><input aria-label="Find a card to buy" placeholder="Search card, set, number" value={query} onChange={event => setQuery(event.target.value)}/></div>
        <p className={s.resultBar}>{searching ? "Searching…" : query.trim().length < 2 ? "Search the canonical catalog, then choose the exact printing." : `${cards.length} matches`}</p>
        <div className={s.grid}>{cards.map(card => <article className={s.card} key={card.id}><button className={s.art} onClick={() => choose(card)}>{card.image ? <Image unoptimized width={300} height={420} src={card.image} alt={card.name}/> : <span>Artwork unavailable</span>}</button><h3>{card.name}</h3><p>{card.set_code} · {card.number}</p><button className={s.add} onClick={() => choose(card)}><Plus size={15}/> Choose exact copy</button></article>)}</div>
      </section>
      <aside className={s.cart} aria-label="Purchase batch">
        <h2>Purchase batch</h2><p className={s.muted}>Add up to 50 exact cards. The total is allocated in cents and must reconcile exactly.</p>
        {selected && <section className={s.editor}><h3>{selected.name}</h3><label>Exact printing<select value={printingId} onChange={event => setPrintingId(event.target.value)}><option value="">Choose printing / finish</option>{selected.printings?.map(printing => <option key={printing.id} value={printing.id}>{printing.finish_label} · {printing.printing_gv_id}</option>)}</select></label><label>Condition<select value={condition} onChange={event => setCondition(event.target.value)}>{conditions.map(value => <option key={value}>{value}</option>)}</select></label><button className={s.primary} onClick={addLine}><Plus size={16}/> Add exact copy</button></section>}
        <div className={s.lines}>{lines.map((line, index) => <div className={s.line} key={line.id}>{line.image && <Image unoptimized width={80} height={110} src={line.image} alt=""/>}<div><strong>{line.description}</strong><small>GVVI assigned when recorded</small><label>Reference value (optional)<input inputMode="decimal" value={line.referenceMinor == null ? "" : money(line.referenceMinor)} onChange={event => { const value = event.target.value.trim(); setLines(current => current.map(item => item.id === line.id ? { ...item, referenceMinor: value ? minor(value) : null } : item)); }}/></label>{mode === "manual" && <label>Allocated COG<input inputMode="decimal" value={line.allocatedMinor ? money(line.allocatedMinor) : ""} onChange={event => { const value = minor(event.target.value) ?? 0; setLines(current => current.map(item => item.id === line.id ? { ...item, allocatedMinor: value } : item)); }}/></label>}<strong>${money(allocations[index] ?? 0)} COG</strong></div><button aria-label={`Remove ${line.description}`} onClick={() => setLines(current => current.filter(item => item.id !== line.id))}><Trash2 size={16}/></button></div>)}</div>
        <label>Total paid (USD)<input inputMode="decimal" placeholder="300.00" value={total} onChange={event => setTotal(event.target.value)}/></label>
        <label>Allocation<select value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="equal_split">Equal split across exact copies</option><option value="weighted_reference">Weighted by reference value</option><option value="manual">Manual per-copy COG</option></select></label>
        {mode === "manual" && <p className={s.muted}>Manual mode uses each line’s COG shown above; enter a reference value only for audit context. Equal split is recommended for a lot purchase.</p>}
        <label>Seller / source<input value={seller.name} placeholder="Seller name (optional)" onChange={event => setSeller({ ...seller, name: event.target.value })}/></label><label>Payment method<select value={method} onChange={event => setMethod(event.target.value)}><option>Cash</option><option>Card (external terminal)</option><option>Bank / payment app</option><option>Other</option></select></label><label>Receipt note<textarea maxLength={500} value={note} onChange={event => setNote(event.target.value)}/></label>
        <dl><dt>Exact copies</dt><dd>{lines.length}</dd><dt>Total paid</dt><dd>${money(totalMinor)}</dd><dt>Allocated COG</dt><dd>${money(allocatedTotal)}</dd></dl>
        <button className={s.primary} disabled={busy || !lines.length || allocatedTotal !== totalMinor || !totalMinor} onClick={() => void submit()}>{busy ? "Recording…" : "Record purchase"}</button>
      </aside>
    </div>}
  </main>;
}
