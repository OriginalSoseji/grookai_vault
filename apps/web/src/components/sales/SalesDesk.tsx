"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SalesDialog from './SalesDialog';
import SalesPaymentEditor from './SalesPaymentEditor';
import {paymentLines, paymentSnapshot} from '@/lib/sales/salesPayments.mjs';
import SalesDashboard from './SalesDashboard';
import type {SalesReceipt} from '@/lib/sales/salesReport.mjs';
import { ArrowLeft, Search, ShoppingBag, Plus, Pause, Users, Eye, X, ArrowRightLeft, Check, LoaderCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { addLine, conditions, customerDeal, draftJournal, methods, minor, money, newDraft, rate, saleRequest, totals, tradeCredit } from '@/lib/sales/salesDesk.mjs';
import type { CatalogAttempt, Customer, Journal, SaleDraft, TradeLine } from '@/lib/sales/salesDesk.mjs';
import s from './SalesDesk.module.css';
type Card = {
    id: string;
    name: string;
    gv_id?: string;
    instanceId?: string;
    gvviId?: string;
    image?: string | null;
    number?: string;
    set_code?: string;
    condition?: string;
    printing?: string;
    askingMinor?: number | null;
    tcgplayer_id?: string;
    printings?: {
        id: string;
        finish_label: string;
        printing_gv_id: string;
    }[];
    search_card_printing_id?: string;
};
type Cursor = {
    offset: number;
    copyOffset: number;
};
type Session = {
    owner: string;
    available: boolean;
    trades: boolean;
    payments: boolean;
};
type Book = {
    book: {
        storeName: string;
        customers: ({
            id: string;
        } & Customer)[];
        receipts: {
            receipt: SalesReceipt;
        }[];
    };
};
type Receipt = SalesReceipt;
class RequestError extends Error {
    constructor(message: string, readonly rejected = false) { super(message); }
}
async function request<T>(query: Record<string, string> = {}, body?: object): Promise<T> {
    const response = await fetch('/api/sales/desk?' + new URLSearchParams(query), { cache: 'no-store', credentials: 'same-origin', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok)
        throw new RequestError(result.error ?? 'Request could not complete.', result.rejected === true);
    return result as T;
}
const emptyJournal: Journal = { version: 2, revision: 0, drafts: [], active: null, pending: null, catalog: null };
function paymentsValid(d:SaleDraft) {try {if(d.payments)paymentSnapshot(d.payments,totals(d).balance);return true;}catch{return false;}}
export default function SalesDesk() {
    const [dashboard,setDashboard]=useState(false),[historyBusy,setHistoryBusy]=useState(false);
    const [session, setSession] = useState<Session | null>(null), [journal, setJournal] = useState<Journal>(emptyJournal), [book, setBook] = useState<Book['book'] | null>(null);
    const [scope, setScope] = useState<'stock' | 'catalog'>('stock'), [intent, setIntent] = useState<'sell' | 'trade'>('sell'), [query, setQuery] = useState(''), [game, setGame] = useState('pokemon');
    const [cards, setCards] = useState<Card[]>([]), [next, setNext] = useState<Cursor | null>(null), [searching, setSearching] = useState(false), [searchError, setSearchError] = useState('');
    const [resultKey, setResultKey] = useState('');
    const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false), [changed, setChanged] = useState(false), [revision, setRevision] = useState(0);
    const [selected, setSelected] = useState<Card | null>(null), [quick, setQuick] = useState(false), [showHeld, setShowHeld] = useState(false), [showCustomer, setShowCustomer] = useState(false), [showDeal, setShowDeal] = useState(false), [review, setReview] = useState(false), [receipt, setReceipt] = useState<Receipt | null>(null);
    const [printing, setPrinting] = useState(''), [condition, setCondition] = useState('NM'), [price, setPrice] = useState(''), [percent, setPercent] = useState(''), [description, setDescription] = useState(''), [quantity, setQuantity] = useState('1'), [intake, setIntake] = useState(false);
    const repository = useRef<ReturnType<typeof draftJournal> | null>(null), state = useRef(journal), owner = useRef<string | null>(null), generation = useRef(0), queue = useRef(Promise.resolve()), searchRef = useRef<HTMLInputElement>(null), disabled = useRef(false);
    const draft = journal.drafts.find(d => d.id === journal.active) ?? null, locked = busy || changed || !!journal.pending || !!journal.catalog || !!receipt || session?.available !== true;
    const balance = draft ? totals(draft) : null;
    const searchKey = JSON.stringify([query, game, scope, intent, revision]), stale = resultKey !== searchKey;
    const mutate = useCallback((change: (j: Journal) => Journal) => {
        const operation = queue.current.then(async () => {
            if (disabled.current || !repository.current)
                throw Error('Reopen the sales desk before editing.');
            const updated = await repository.current.update(state.current.revision, change);
            state.current = updated;
            setJournal(updated);
            return updated;
        });
        queue.current = operation.then(() => { }, () => { });
        return operation;
    }, []);
    const edit = useCallback((change: (d: SaleDraft) => SaleDraft) => { if (locked)
        return; void mutate(j => { if (j.pending || j.catalog)
        throw Error('Recover the pending request first.'); return { ...j, drafts: j.drafts.map(d => d.id === j.active ? change(d) : d) }; }).catch(e => setError(e.message)); }, [locked, mutate]);
    useEffect(() => {
        let alive = true;
        disabled.current = false;
        async function start() {
            try {
                const auth = await request<Session>();
                if (!alive)
                    return;
                if (!navigator.locks)
                    throw Error('This browser cannot safely save simultaneous deals. Use a current browser.');
                owner.current = auth.owner;
                const repo = draftJournal(localStorage, auth.owner, async (name, fn) => await navigator.locks.request(name, fn));
                repository.current = repo;
                let saved = repo.read();
                if (!saved.drafts.length)
                    saved = await repo.update(saved.revision, j => { const d = newDraft(crypto.randomUUID()); return { ...j, drafts: [d], active: d.id }; });
                if (!alive)
                    return;
                state.current = saved;
                setJournal(saved);
                setSession(auth);
                void request<Book>({ action: 'book' }).then(data => { if (!alive || disabled.current)
                    return; setBook(data.book); if (state.current.pending || state.current.catalog)
                    return; void mutate(j => j.pending || j.catalog ? j : ({ ...j, drafts: j.drafts.map(d => d.storeName ? d : { ...d, storeName: data.book.storeName }) })).catch(e => setError(e.message)); }).catch(() => { if (alive && !disabled.current)
                    setError('Customer history could not load. You can still enter this sale’s details.'); });
                if (saved.pending) {
                    const found = await request<{
                        receipt: Receipt | null;
                    }>({ action: 'recover', id: saved.pending.id });
                    if (alive && !disabled.current && found.receipt)
                        setReceipt(found.receipt);
                }
            }
            catch (e) {
                if (alive)
                    setError(e instanceof Error ? e.message : 'Could not open sales desk.');
            }
        }
        void start();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, current) => { if (owner.current && current?.user.id !== owner.current) {
            disabled.current = true;
            setChanged(true);
            setCards([]);
            setBook(null);
            setSelected(null);
            setShowDeal(false);
        } });
        const storage = (e: StorageEvent) => { if (e.key === repository.current?.key) {
            disabled.current = true;
            setChanged(true);
            setError('Saved deals changed in another tab. Reload this page to use the latest version.');
        } };
        window.addEventListener('storage', storage);
        return () => { alive = false; disabled.current = true; subscription.unsubscribe(); window.removeEventListener('storage', storage); };
    }, [mutate]);
    const invalidateSearch = useCallback(() => { generation.current++; }, []);
    const search = useCallback(async (cursor: Cursor | null = null, signal?: AbortSignal) => {
        const g = ++generation.current;
        setSearching(true);
        setSearchError('');
        try {
            const p = { action: intent === 'trade' ? 'catalog' : scope, q: query, game, offset: String(cursor?.offset ?? 0), copyOffset: String(cursor?.copyOffset ?? 0) };
            const response = await fetch('/api/sales/desk?' + new URLSearchParams(p), { cache: 'no-store', credentials: 'same-origin', signal });
            const data = await response.json();
            if (!response.ok)
                throw Error(data.error);
            if (g !== generation.current || disabled.current)
                return;
            setCards(previous => { if (!cursor)
                return data.cards; const seen = new Set(previous.map(c => c.instanceId ?? c.id + ':' + (c.search_card_printing_id ?? ''))); return [...previous, ...data.cards.filter((c: Card) => !seen.has(c.instanceId ?? c.id + ':' + (c.search_card_printing_id ?? '')))]; });
            setNext(data.next);
            setResultKey(searchKey);
        }
        catch (e) {
            if (g === generation.current && !signal?.aborted)
                setSearchError(e instanceof Error ? e.message : 'Search failed.');
        }
        finally {
            if (g === generation.current)
                setSearching(false);
        }
    }, [query, game, scope, intent, searchKey]);
    useEffect(() => { if (!session || changed)
        return; const controller = new AbortController(); const timer = setTimeout(() => void search(null, controller.signal), 180); return () => { clearTimeout(timer); controller.abort(); invalidateSearch(); }; }, [search, session, changed, revision, invalidateSearch]);
    function choose(card: Card | null) { if (locked || card && (stale || searching))
        return; setSelected(card); setQuick(!card); setPrinting(''); setDescription(card?.name ?? ''); setPrice(card?.askingMinor ? money(card.askingMinor) : ''); setQuantity('1'); setIntake(false); setError(''); }
    function addOwned(card: Card) {
        if (locked || !draft || stale || searching)
            return;
        if (!card.askingMinor || card.askingMinor <= 0) {
            choose(card);
            return;
        }
        void mutate(j => { if (j.pending || j.catalog)
            throw Error('Recover the pending request first.'); return { ...j, drafts: j.drafts.map(d => d.id === j.active ? addLine(d, { instanceId: card.instanceId, gvviId: card.gvviId, description: card.name, quantity: 1, unitMinor: card.askingMinor!, askingMinor: card.askingMinor, image: card.image }) : d) }; }).then(() => { setNotice(card.name + ' added'); searchRef.current?.focus(); }).catch(e => setError(e.message));
    }
    async function catalogAttempt(saved: CatalogAttempt) {
        if (disabled.current)
            throw Error('Reopen the sales desk.');
        const { result } = await request<{
            result: {
                requestId: string;
                cardId: string;
                printingId: string;
                instanceId: string;
                gvviId: string;
            };
        }>({}, { action: 'catalog', owner: owner.current, id: saved.id, card: saved.card });
        if (result.requestId !== saved.id || result.cardId !== saved.card.cardId || result.printingId !== saved.card.printingId)
            throw Error('Card result unconfirmed. Recover the same add.');
        await mutate(j => { if (j.catalog?.id !== saved.id || !j.drafts.some(d => d.id === saved.draftId))
            throw Error('Saved add changed. Reload before recovery.'); return { ...j, catalog: null, drafts: j.drafts.map(d => d.id !== saved.draftId || d.items.some(l => l.instanceId === result.instanceId) ? d : addLine(d, { ...saved.line, instanceId: result.instanceId, gvviId: result.gvviId })) }; });
    }
    async function addSelection() {
        if (!draft || locked)
            return;
        const value = minor(price), qty = Number(quantity), bps = rate(percent);
        if (!description.trim() || value === null || value <= 0 || !Number.isInteger(qty) || qty < 1 || qty > 999 || intent === 'trade' && bps === null || selected && !selected.instanceId && !printing) {
            setError('Choose the exact printing and enter a positive price/value, quantity and trade percentage.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            if (intent === 'trade') {
                const t: TradeLine = { description: description.trim(), quantity: selected ? 1 : qty, valueMinor: value, rateBps: bps!, cardId: selected?.id ?? null, printingId: selected ? printing : null, condition: selected ? condition : null, addToVault: !!selected && intake };
                await mutate(j => ({ ...j, drafts: j.drafts.map(d => { if (d.id !== j.active)
                        return d; if (d.trades.length >= 50)
                        throw Error('This deal has 50 trade lines.'); return { ...d, trades: [...d.trades, t] }; }) }));
            }
            else if (selected && !selected.instanceId) {
                const saved: CatalogAttempt = { id: crypto.randomUUID(), draftId: draft.id, card: { cardId: selected.id, printingId: printing, condition, intent: 'hold', priceMinor: null }, line: { description: description.trim(), quantity: 1, unitMinor: value, image: selected.image } };
                await mutate(j => { if (j.pending || j.catalog)
                    throw Error('Recover the pending request first.'); const target = j.drafts.find(d => d.id === saved.draftId); if (!target)
                    throw Error('Reopen the saved deal.'); addLine(target, saved.line); return { ...j, catalog: saved }; });
                await catalogAttempt(saved);
            }
            else
                await mutate(j => ({ ...j, drafts: j.drafts.map(d => d.id === j.active ? addLine(d, { description: description.trim(), quantity: selected ? 1 : qty, unitMinor: value, instanceId: selected?.instanceId, gvviId: selected?.gvviId, askingMinor: selected?.askingMinor, image: selected?.image }) : d) }));
            setSelected(null);
            setQuick(false);
            setNotice(intent === 'trade' ? 'Trade added to the deal' : 'Card added to the deal');
            searchRef.current?.focus();
        }
        catch (e) {
            if (e instanceof RequestError && e.rejected)
                await mutate(j => ({ ...j, catalog: null }));
            setError(e instanceof Error ? e.message : 'Add unconfirmed. Recover the same request.');
        }
        finally {
            setBusy(false);
        }
    }
    async function recoverCatalog() { if (!journal.catalog)
        return; setBusy(true); try {
        await catalogAttempt(journal.catalog);
        setSelected(null);
        setQuick(false);
    }
    catch (e) {
        if (e instanceof RequestError && e.rejected)
            await mutate(j => ({ ...j, catalog: null }));
        setError(e instanceof Error ? e.message : 'Recovery failed.');
    }
    finally {
        setBusy(false);
    } }
    async function complete() {
        if (!draft || busy || changed || disabled.current)
            return;
        setBusy(true);
        setError('');
        try {
            await queue.current;
            let pending = state.current.pending;
            if (!pending) {
                const staged = await mutate(j => { if (j.catalog)
                    throw Error('Recover the catalog add first.'); const current = j.drafts.find(d => d.id === j.active); if (!current)
                    throw Error('Reopen the saved deal.'); if(current.payments !== undefined && !session?.payments) throw Error('Split payments are unavailable. Keep this deal saved and retry later.'); return { ...j, pending: saleRequest(current, crypto.randomUUID()) }; });
                pending = staged.pending!;
            }
            if (disabled.current)
                throw Error('Reopen the sales desk.');
            const { result } = await request<{
                result: Receipt;
            }>({}, { action: 'sale', owner: owner.current, ...pending });
            if (result.id !== pending.id)
                throw Error('Sale response unconfirmed. Recover this same sale.');
            if (disabled.current)
                return;
            setReceipt(result);
            setReview(false);
        }
        catch (e) {
            if (e instanceof RequestError && e.rejected) {
                await mutate(j => ({ ...j, pending: null }));
                setReview(false);
            }
            setReview(false);
            setError(e instanceof Error ? e.message : 'Sale unconfirmed. Recover the same sale.');
        }
        finally {
            setBusy(false);
        }
    }
    async function fresh() { if (busy || changed || journal.catalog || journal.pending && !receipt)
        return; await mutate(j => { const d = newDraft(crypto.randomUUID(), draft?.storeName ?? book?.storeName ?? ''); return { ...j, pending: null, active: d.id, drafts: [...j.drafts.filter(x => !receipt || x.id !== j.active), d] }; }); setReceipt(null); setShowHeld(false); setReview(false); setRevision(v => v + 1); }
    async function discard(id:string) {
        if(locked||!window.confirm('Discard this saved deal? Inventory and recorded sales are unchanged.'))return;
        await mutate(j=>{if(j.pending||j.catalog)throw Error('Recover the pending request first.');let drafts=j.drafts.filter(d=>d.id!==id);if(!drafts.length)drafts=[newDraft(crypto.randomUUID(),draft?.storeName??'')];return {...j,drafts,active:j.active===id?drafts[0].id:j.active};});
    }
    async function refreshHistory(){if(historyBusy||disabled.current)return;setHistoryBusy(true);try{const data=await request<Book>({action:'book'});if(!disabled.current)setBook(data.book);}catch{setError('History could not refresh. Saved sales remain unchanged.');}finally{setHistoryBusy(false);}}
    const deal = draft ? customerDeal(draft) : null;
    if (changed)
        return <main className={s.shell}><h1>Reopen your sales desk</h1><p>{error || 'Your account changed. Saved deals remain with their original owner.'}</p><button onClick={() => location.reload()}>Reload saved deals</button></main>;
    return <main className={s.shell}>
  <header className={s.header}><div><Link href="/account/store"><ArrowLeft size={15}/> Store workspace</Link><h1>Sales desk <span>Ready for your next deal.</span></h1></div><div className={s.actions}>
   <button disabled={!session} onClick={()=>setDashboard(!dashboard)}>{dashboard?'Back to selling':'Dashboard'}</button><Link href="/account/store/receipts/cloud">Receipts & customers</Link><button disabled={locked} onClick={() => setShowHeld(!showHeld)}><Pause size={16}/> Held deals ({journal.drafts.length})</button><button disabled={busy || changed || !!journal.catalog || !!journal.pending && !receipt} onClick={() => void fresh().catch(e => setError(e.message))}><Plus size={16}/> {receipt ? 'Next customer' : 'New deal'}</button></div></header>
  {error && <div role="alert" className={s.error}>{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={15}/></button></div>}
  {notice && <p role="status" className={s.notice}>{notice} · Draft saved on this browser</p>}
  {!session && <p role="status">{error?<button onClick={()=>location.reload()}>Retry opening sales desk</button>:'Opening your sales desk…'}</p>}
  {session && !session.available && <p className={s.error}>New sales are currently unavailable. Existing saved deals and recovery remain available.</p>}
  {journal.catalog && <div className={s.error}>A catalog add needs verification. <button disabled={busy} onClick={() => void recoverCatalog()}>Recover saved add</button></div>}
  {showHeld && <section className={s.held} aria-label="Held deals">{journal.drafts.map(d => <div key={d.id}><button disabled={locked} onClick={() => void mutate(j => ({ ...j, active: d.id })).then(() => setShowHeld(false)).catch(e => setError(e.message))}><strong>{d.customer.name || d.label}</strong><small>{d.items.length} items · ${money(totals(d).balance)}</small></button><button disabled={locked} aria-label={`Discard ${d.customer.name||d.label}`} onClick={()=>void discard(d.id).catch(e=>setError(e.message))}>Discard draft</button></div>)}<p>Holding a deal saves your work. Availability is checked again when recording the sale; it does not reserve online inventory.</p></section>}
  {dashboard?<SalesDashboard receipts={book?[...book.receipts.map(r=>r.receipt),...(receipt?[receipt]:[])]:null} loading={historyBusy} refresh={()=>void refreshHistory()}/>:<div className={s.workspace}><section className={s.inventory} aria-label="Find cards">
   <div className={s.toolbar}><div className={s.tabs}><button aria-pressed={intent === 'sell'} disabled={locked} onClick={() => { setIntent('sell'); setSelected(null); setQuick(false); }}>Sell</button><button aria-pressed={intent === 'trade'} disabled={locked || !session?.trades} onClick={() => { setIntent('trade'); setSelected(null); setQuick(false); }}><ArrowRightLeft size={16}/> Trade-in</button></div>
   {intent === 'sell' && <div className={s.tabs}><button aria-pressed={scope === 'stock'} onClick={() => { setScope('stock'); setSelected(null); }}>Your stock</button><button aria-pressed={scope === 'catalog'} onClick={() => { setScope('catalog'); setSelected(null); }}>Catalog</button></div>}</div>
   <div className={s.search}><Search size={19}/><input ref={searchRef} aria-label="Find a card" placeholder="Name, set, number or exact Grookai ID" value={query} onChange={e => { setQuery(e.target.value); setSelected(null); setQuick(false); }}/>{(scope === 'catalog' || intent === 'trade' || query.trim().length >= 2) && <select aria-label="Game" value={game} onChange={e => { setGame(e.target.value); setSelected(null); setQuick(false); }}><option value="pokemon">Pokémon</option><option value="mtg">Magic</option><option value="one_piece">One Piece</option></select>}</div>
   <div className={s.resultBar}><span role="status">{searching || stale ? 'Updating results…' : `${cards.length} ${scope === 'stock' && intent === 'sell' ? query.trim().length < 2 ? 'copies · all games' : 'copies shown' : 'matches shown'}`}</span><button disabled={locked} onClick={() => choose(null)}><Plus size={15}/> Quick {intent === 'trade' ? 'trade' : 'item'}</button></div>
   {searchError && <p role="alert" className={s.error}>{searchError}<button onClick={() => void search()}>Retry search</button></p>}
   {(selected || quick) && <section className={s.editor} aria-label="Card details"><button className={s.close} aria-label="Close card details" disabled={busy || !!journal.catalog} onClick={() => { setSelected(null); setQuick(false); }}><X /></button>
    {selected?.image && <Image unoptimized width={300} height={420} src={selected.image} alt={selected.name} className={s.editImage}/>}<div className={s.editFields}><h2>{intent === 'trade' ? 'Add a trade-in' : selected?.name ?? 'Quick item'}</h2>
    <label>Description<input maxLength={200} value={description} onChange={e => setDescription(e.target.value)}/></label>
    {selected && !selected.instanceId && <><label>Exact printing<select value={printing} onChange={e => setPrinting(e.target.value)}><option value="">Choose printing / finish</option>{selected.printings?.map(p => <option key={p.id} value={p.id}>{p.finish_label} · {p.printing_gv_id}</option>)}</select></label><label>Condition<select value={condition} onChange={e => setCondition(e.target.value)}>{conditions.map(c => <option key={c}>{c}</option>)}</select></label></>}
    <div className={s.fields}><label>{intent === 'trade' ? 'Reference value' : 'Sale price'} (USD)<input inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)}/></label>{intent === 'trade' && <label>Trade percentage<input inputMode="decimal" value={percent} onChange={e => setPercent(e.target.value)}/></label>}{!selected && <label>Quantity<input inputMode="numeric" value={quantity} onChange={e => setQuantity(e.target.value)}/></label>}</div>
    {intent === 'trade' && <><p>Trade credit: ${money(Math.floor(((minor(price) ?? 0) * Number(quantity || 1) * (rate(percent) ?? 0) + 5000) / 10000))}</p>{selected && <label className={s.check}><input type="checkbox" checked={intake} onChange={e => setIntake(e.target.checked)}/> Add incoming copy to my Vault when the deal completes</label>}</>}
    {selected?.askingMinor != null && <p>Your asking price: <strong>${money(selected.askingMinor)}</strong></p>}
    <button className={s.primary} disabled={locked} onClick={() => void addSelection()}><Plus size={16}/>{selected && !selected.instanceId && intent === 'sell' ? 'Add exact copy to Vault & deal' : 'Add to deal'}</button>
    {selected && !selected.instanceId && intent === 'sell' && <small>Creates one Hold copy. Does not publish it in your store.</small>}</div></section>}
   <div className={s.grid} aria-busy={searching}>{cards.map(c => {
            const inCart = !!c.instanceId && !!draft?.items.some(l => l.instanceId === c.instanceId);
            return <article key={c.instanceId ?? c.id + ':' + (c.search_card_printing_id ?? '')} className={s.card} draggable={!locked && !stale && !searching && !inCart && !!c.instanceId} onDragStart={e => e.dataTransfer.setData('application/x-grookai-copy', c.instanceId!)}>
    <button className={s.art} disabled={locked || inCart || searching || stale} onClick={() => c.instanceId ? addOwned(c) : choose(c)}>{c.image ? <Image unoptimized width={300} height={420} src={c.image} alt={c.name} loading="lazy"/> : <span>Artwork unavailable</span>}</button>
    <h3>{c.name}</h3><p>{c.set_code} · {c.number}</p><p>{c.condition} {c.printing}</p><small>{c.gvviId ?? c.gv_id}</small>
    {c.instanceId && <strong className={s.price}>{c.askingMinor != null ? `Your price $${money(c.askingMinor)}` : 'Set your sale price'}</strong>}
    <a href={c.tcgplayer_id && /^\d+$/.test(String(c.tcgplayer_id)) ? `https://www.tcgplayer.com/product/${c.tcgplayer_id}` : `https://www.tcgplayer.com/search/all/product?q=${encodeURIComponent([c.name, c.set_code, c.number].filter(Boolean).join(' '))}`} target="_blank" rel="noopener noreferrer">TCGplayer ↗</a>
    <button className={s.add} disabled={locked || inCart || searching || stale} onClick={() => c.instanceId ? addOwned(c) : choose(c)}>{inCart ? <><Check size={15}/> In deal</> : c.instanceId ? 'Add to deal' : 'Choose printing'}</button></article>;
        })}</div>
   {!cards.length && !searching && !searchError && <p className={s.empty}>{scope === 'stock' && intent === 'sell' ? 'No matching owned copies. Try Catalog or Quick item.' : 'Search for a card to begin. Refine by set or number when needed.'}</p>}
   {next && !stale && <button className={s.more} disabled={searching} onClick={() => void search(next)}>Load more</button>}
  </section>
  <aside id="sales-cart" className={s.cart} aria-label="Current deal" onDragOver={e => { if (!locked)
        e.preventDefault(); }} onDrop={e => { e.preventDefault(); const c = cards.find(c => c.instanceId === e.dataTransfer.getData('application/x-grookai-copy')); if (c)
        addOwned(c); }}>
   <div className={s.cartHeader}><h2><ShoppingBag size={20}/> Your deal</h2><button disabled={!draft || busy} onClick={() => setShowDeal(true)}><Eye size={16}/> Customer view</button></div>
   {draft && <><button className={s.customer} disabled={locked} onClick={() => setShowCustomer(!showCustomer)}><Users size={18}/><span>{draft.customer.name || 'Walk-up customer'}<small>{draft.customer.name ? 'Customer attached' : 'Add customer · optional'}</small></span></button>
    {showCustomer && <div className={s.details}><label>Saved customer<select value={draft.customerId ?? ''} onChange={e => { const c = book?.customers.find(c => c.id === e.target.value); edit(d => ({ ...d, customerId: c?.id ?? null, customer: c ? { name: c.name, email: c.email, phone: c.phone, wants: c.wants, notes: c.notes } : newDraft('').customer })); }}><option value="">New / walk-up customer</option>{book?.customers.map(c => <option key={c.id} value={c.id}>{c.name || c.email || c.phone}</option>)}</select></label>{(['name', 'email', 'phone', 'wants'] as const).map(k => <label key={k}>{k === 'wants' ? 'Cards they want' : k}<input key={draft.id+':'+(draft.customerId??'new')+':'+k} defaultValue={draft.customer[k]} disabled={locked || !!draft.customerId} maxLength={k === 'wants' ? 1000 : k === 'email' ? 254 : k === 'phone' ? 40 : 120} onChange={e => { const value=e.target.value; edit(d => ({ ...d, customer: { ...d.customer, [k]: value } })); }}/></label>)}</div>}
    <div className={s.lines}>{!draft.items.length && <p className={s.empty}>Tap or drag a card here.<br />Your deal stays visible as you search.</p>}{draft.items.map((l, i) => <div className={s.line} key={l.instanceId ?? i}>{l.image && <Image unoptimized width={300} height={420} src={l.image} alt=""/>}<div><strong>{l.description}</strong>{l.askingMinor != null && <small>Your price ${money(l.askingMinor)}</small>}<small>{l.gvviId ?? `${l.quantity} × item`}</small><label>Deal price $<input aria-label={`Price for ${l.description}`} disabled={locked} inputMode="decimal" key={l.unitMinor} defaultValue={money(l.unitMinor)} onBlur={e => { const n = minor(e.target.value); if (n === null || n <= 0) {
            e.target.value = money(l.unitMinor);
            setError('Enter a positive sale price.');
            return;
        } edit(d => ({ ...d, items: d.items.map((x, j) => j === i ? { ...x, unitMinor: n } : x) })); }}/></label></div><button disabled={locked} aria-label={`Remove ${l.description}`} onClick={() => edit(d => ({ ...d, items: d.items.filter((_, j) => j !== i) }))}><X size={16}/></button></div>)}</div>
    {draft.trades.length > 0 && <section className={s.trades}><h3>Customer trade-ins</h3>{draft.trades.map((t, i) => <div className={s.trade} key={i}><div><strong>{t.description}</strong><small>{t.quantity} × ${money(t.valueMinor)} × {t.rateBps / 100}%</small><strong>−${money(tradeCredit(t))}</strong></div><button disabled={locked} aria-label={`Remove trade ${t.description}`} onClick={() => edit(d => ({ ...d, trades: d.trades.filter((_, j) => j !== i) }))}><X size={16}/></button></div>)}</section>}
    <details className={s.details}><summary>Store, tax & receipt note</summary><label>Store name<input maxLength={120} disabled={locked} key={draft.id} defaultValue={draft.storeName} onChange={e => { const value=e.target.value; edit(d => ({ ...d, storeName: value })); }}/></label><label>Tax collected (USD)<input inputMode="decimal" disabled={locked} defaultValue={money(draft.taxMinor)} key={draft.id} onBlur={e => { const n = minor(e.target.value); if (n !== null)
            edit(d => ({ ...d, taxMinor: n }));
        else {
            e.target.value = money(draft.taxMinor);
            setError('Check the tax amount.');
        } }}/></label><label>Receipt note<input maxLength={draft.trades.length ? 350 : 500} disabled={locked} key={draft.id} defaultValue={draft.note} onChange={e => { const value=e.target.value; edit(d => ({ ...d, note: value })); }}/></label></details>
    <div className={s.checkout}><dl><dt>Items</dt><dd>${money(balance!.subtotal)}</dd><dt>Tax recorded</dt><dd>${money(draft.taxMinor)}</dd>{draft.trades.length > 0 && <><dt>Trade credit</dt><dd>−${money(balance!.credit)}</dd></>}<dt className={s.total}>{balance!.balance < 0 ? 'You pay customer' : 'Customer pays'}</dt><dd className={s.total}>${money(Math.abs(balance!.balance))}</dd></dl>
    {receipt ? <div className={s.saved}><Check /> Sale recorded · {receipt.number}{paymentLines(receipt,n=>'$'+money(n)).map((line,i)=><p key={i}>{line}</p>)}<Link href="/account/store/receipts/cloud">Open receipts to print, share or send</Link><button onClick={() => void fresh().catch(e => setError(e.message))}>Next customer</button></div> : journal.pending ? <button className={s.primary} disabled={busy} onClick={() => void complete()}>Recover this sale</button> : <button className={s.primary} disabled={locked || !draft.items.length} onClick={() => setReview(true)}>Review deal <span>${money(Math.abs(balance!.balance))}</span></button>}
    <small>Drafts stay on this browser. Payment is collected with cash or your external terminal.</small></div></>}
  </aside></div>}
  {review && draft && <SalesDialog className={s.modal} label="Review deal" busy={busy} onClose={() => setReview(false)}><h2>Complete the exchange</h2><p>{draft.items.length} sale lines · {draft.trades.length} trade lines</p><h3>{balance!.balance < 0 ? 'Pay customer' : 'Receive'} ${money(Math.abs(balance!.balance))}</h3>{(session?.payments || draft.payments !== undefined) && <label className={s.paymentToggle}><input type="checkbox" disabled={busy} checked={draft.payments !== undefined} onChange={e=>{const checked=e.target.checked; edit(d=>({...d,payments:checked?(balance!.balance===0?[]:[{method:d.method,amountMinor:Math.abs(balance!.balance),tenderedMinor:Math.abs(balance!.balance)}]):undefined}));}}/> Split payment / cash change</label>}{draft.payments !== undefined ? <SalesPaymentEditor entries={draft.payments} balance={balance!.balance} disabled={busy} onChange={update=>edit(d=>({...d,payments:update(d.payments??[])}))}/> : <label>Payment / payout method<select disabled={busy} value={draft.method} onChange={e => { const value=e.target.value; edit(d => ({ ...d, method: value })); }}>{methods.map(m => <option key={m}>{m}</option>)}</select></label>}<p>Confirm the physical cards and payment have been exchanged. This records the sale; it does not charge a payment card.</p><div className={s.actions}><button disabled={busy} onClick={() => setReview(false)}>Back to deal</button><button className={s.primary} disabled={busy || (draft.payments !== undefined && (!session?.payments || !paymentsValid(draft)))} onClick={() => void complete()}>{busy ? <LoaderCircle size={18}/> : <Check size={18}/>} Exchange completed · Record</button></div></SalesDialog>}
  {showDeal && deal && <SalesDialog className={s.customerDisplay} label="Customer deal" onClose={() => setShowDeal(false)}><button className={s.close} aria-label="Close customer view" onClick={() => setShowDeal(false)}><X /></button><small>YOUR DEAL</small><h2>{deal.storeName}</h2>{deal.items.map((l, i) => <div className={s.displayLine} key={i}>{l.image && <Image unoptimized width={300} height={420} src={l.image} alt=""/>}<div><strong>{l.description}</strong>{l.askingMinor != null && <small>Asking ${money(l.askingMinor)}</small>}<small>{l.quantity} × ${money(l.unitMinor)}</small></div><strong>${money(l.quantity * l.unitMinor)}</strong></div>)}{deal.trades.map((t, i) => <div className={s.displayLine} key={'t' + i}><div><strong>Trade-in · {t.description}</strong><small>{t.quantity} × ${money(t.valueMinor)} × {t.rateBps / 100}%</small></div><strong>−${money(t.creditMinor)}</strong></div>)}<p>Tax recorded: ${money(deal.taxMinor)}</p><h3>{deal.balance < 0 ? 'You receive' : 'You pay'} ${money(Math.abs(deal.balance))}</h3><p>{receipt ? 'Sale recorded · ' + receipt.number : 'Deal preview · payment not confirmed'}</p></SalesDialog>}
 {!dashboard&&draft && <a className={s.mobileCart} href="#sales-cart"><ShoppingBag size={18}/>{draft.items.length} items · View deal <strong>${money(Math.abs(balance!.balance))}</strong></a>}
 </main>;
}
