"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Boxes, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { OwnedSealedPanel } from "@/components/vault/OwnedSealedPanel";
import { sealedOwnershipEnabled } from "@/lib/sealed/ownedSealedV1";
import s from "./VendorInventory.module.css";

type Copy = {
  instanceId: string; gvviId: string; gv_id?: string; name: string;
  image?: string | null; set_code?: string; number?: string;
  condition?: string; printing?: string; intent?: string;
  askingAmount: number | null; askingCurrency: string | null;
};
type Cursor = { offset: number; copyOffset: number };
type Page = { owner: string; cards: Copy[]; next: Cursor | null };
const intents: Record<string, string> = { hold: "Private", sell: "For sale", trade: "For trade", showcase: "Showcase" };
const games = ["pokemon", "mtg", "one_piece"];

function asking(copy: Copy) {
  if (copy.askingAmount == null) return "Price not set";
  if (!Number.isFinite(copy.askingAmount) || !/^[A-Z]{3}$/.test(copy.askingCurrency ?? "")) return "Price needs review";
  return `${copy.askingCurrency} ${copy.askingAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Exact active copies through the existing authenticated stock reader. */
export default function VendorInventory({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const sealed = sealedOwnershipEnabled && params.get("kind") === "sealed";
  const q = (params.get("q") ?? "").trim().slice(0, 120);
  const game = games.includes(params.get("game") ?? "") ? params.get("game")! : "pokemon";
  const price = ["priced", "unpriced"].includes(params.get("price") ?? "") ? params.get("price")! : "all";
  const queryKey = JSON.stringify([q, game, price]);
  const [page, setPage] = useState<Page | null>(null);
  const [resultKey, setResultKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closed, setClosed] = useState(false);
  const generation = useRef(0);
  const accountChanged = useRef(false);
  const activeRequest = useRef<AbortController | null>(null);
  const failedCursor = useRef<Cursor | null>(null);
  const morePending = useRef(false);

  const load = useCallback(async (cursor?: Cursor) => {
    if (accountChanged.current || sealed || (cursor && morePending.current)) return;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    morePending.current = Boolean(cursor);
    const request = ++generation.current;
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ action: "stock", view: "inventory", q, game, price,
        ...(cursor ? { offset: String(cursor.offset), copyOffset: String(cursor.copyOffset) } : {}) });
      const response = await fetch(`/api/sales/desk?${query}`, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
      if (!response.ok) throw new Error("Inventory read failed");
      const data = await response.json() as Page;
      if (request !== generation.current || accountChanged.current) return;
      if (data.owner !== ownerId) {
        accountChanged.current = true;
        generation.current++;
        setClosed(true); setPage(null);
        return;
      }
      if (!Array.isArray(data.cards) || data.cards.some(copy =>
        !copy || typeof copy.instanceId !== "string" || !/^GVVI-[A-Z0-9-]+$/.test(copy.gvviId) || typeof copy.name !== "string")) {
        throw new Error("Unexpected inventory read");
      }
      if (data.next && ![data.next.offset, data.next.copyOffset].every(value => Number.isInteger(value) && value >= 0 && value <= 10000)) {
        throw new Error("Unexpected inventory page");
      }
      setPage(previous => {
        const rows = cursor && previous ? [...previous.cards, ...data.cards] : data.cards;
        return { ...data, cards: [...new Map(rows.map(copy => [copy.instanceId, copy])).values()] };
      });
      setResultKey(queryKey);
    } catch {
      if (request === generation.current && !accountChanged.current && !controller.signal.aborted) {
        failedCursor.current = cursor ?? null;
        setError(cursor ? "More copies could not load. Retry to continue." : "Inventory could not refresh. Your copies are unchanged.");
      }
    } finally {
      if (request === generation.current) { morePending.current = false; setLoading(false); }
    }
  }, [game, ownerId, price, q, queryKey, sealed]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user.id !== ownerId) {
        accountChanged.current = true;
        generation.current++;
        activeRequest.current?.abort();
        setClosed(true); setPage(null);
      }
    });
    return () => subscription.unsubscribe();
  }, [ownerId]);
  useEffect(() => {
    void load();
    return () => {
      // Invalidate requests, including when the owner-keyed component unmounts.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      activeRequest.current?.abort();
    };
  }, [load]);

  if (closed) return <section className={s.shell}><h1>Inventory closed</h1><p>Your account changed. Reopen inventory to continue.</p><a href="/account/store/inventory">Reopen inventory</a></section>;
  const current = resultKey === queryKey ? page : null;
  const kindHref = (kind: string) => { const next = new URLSearchParams(params.toString()); next.set("kind", kind); return `${pathname}?${next}`; };
  return <section className={s.shell} aria-label="Inventory">
    <header className={s.header}><div><h1>Inventory</h1><p>{sealed ? "Your sealed products. Manage each copy through your existing Vault tools." : "Your active card copies. Edit a copy to manage its price, condition and details."}</p></div>
      <Link href="/account/store/sales" prefetch={false} className={s.primary}>Open Desk</Link></header>
    {sealedOwnershipEnabled && <nav className={s.kinds} aria-label="Inventory type"><Link href={kindHref("cards")} aria-current={!sealed ? "page" : undefined}>Cards</Link><Link href={kindHref("sealed")} aria-current={sealed ? "page" : undefined}>Sealed products</Link></nav>}
    {sealed ? <OwnedSealedPanel ownerId={ownerId} /> : <>
    <form className={s.search} key={queryKey} onSubmit={event => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      const next = new URLSearchParams(params.toString());
      next.set("q", String(fields.get("q") ?? "").trim());
      next.set("game", String(fields.get("game")));
      next.set("price", String(fields.get("price")));
      router.push(`${pathname}?${next}`);
    }}>
      <label className={s.query}>Find your copies<div><Search size={18} aria-hidden="true" /><input name="q" defaultValue={q} minLength={2} maxLength={120} placeholder="Name, set, number or exact copy ID" /></div></label>
      <label>Search game<select name="game" defaultValue={game}><option value="pokemon">Pokémon</option><option value="mtg">Magic</option><option value="one_piece">One Piece</option></select></label>
      <label>Asking price<select name="price" defaultValue={price}><option value="all">Any price</option><option value="priced">Price set</option><option value="unpriced">Price not set</option></select></label>
      <button type="submit" className={s.primary}>Search</button>
    </form>
    <div className={s.tools}><p aria-live="polite">{current ? `${current.cards.length} ${current.cards.length === 1 ? "copy" : "copies"} shown${current.next ? " · more available" : ""}` : "Loading your copies…"}</p>
      <button type="button" disabled={loading} onClick={() => void load()}><RefreshCw size={16} aria-hidden="true" />Refresh</button></div>
    {error && <p role="alert" className={s.notice}>{error} <button disabled={loading} onClick={() => void load(failedCursor.current ?? undefined)}>Try again</button></p>}
    {loading && !current ? <p role="status">Loading inventory…</p> : current && !current.cards.length ?
      <div className={s.empty}><Boxes size={32} aria-hidden="true" /><h2>No matching active copies</h2><p>Change your search or price filter, or add cards from your Vault.</p><Link href="/vault" prefetch={false}>Open Vault</Link></div> :
      <ul className={s.rows}>{current?.cards.map(copy => <li key={copy.instanceId} className={s.copy}>
        <div className={s.art}>{copy.image ? <Image src={copy.image} alt="" width={60} height={84} unoptimized /> : <Boxes size={28} aria-hidden="true" />}</div>
        <div className={s.identity}><h2>{copy.name}</h2><p>{[copy.set_code, copy.number && `#${copy.number}`, copy.printing].filter(Boolean).join(" · ")}</p><p>{[copy.condition, intents[copy.intent ?? ""]].filter(Boolean).join(" · ")}</p><small>{copy.gvviId}</small></div>
        <div className={s.price}><span>Asking price</span><strong>{asking(copy)}</strong></div>
        <div className={s.actions}><Link href={`/vault/gvvi/${encodeURIComponent(copy.gvviId)}?${new URLSearchParams({ workspace: "vendor", inventoryQuery: q, inventoryGame: game, inventoryPrice: price })}`} prefetch={false}>Edit copy<span className={s.srOnly}> {copy.gvviId}</span></Link>
          {copy.gv_id && <Link href={`/card/${encodeURIComponent(copy.gv_id)}`} prefetch={false}>View card<span className={s.srOnly}> {copy.gvviId}</span></Link>}</div>
      </li>)}</ul>}
    {current?.next && <button className={s.more} disabled={loading} onClick={() => void load(current.next!)}>{loading ? "Loading more…" : "Load more copies"}</button>}
    <p className={s.footnote}>Browsing without a search shows all games. Search game applies to name and catalog searches. Asking prices are saved copy prices, not market estimates or completed sales.</p>
    </>}
  </section>;
}
