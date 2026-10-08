import {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {Check, Eye, Plus, Search, X} from 'lucide-react';
import SalesDialog from './SalesDialog';
import SalesPaymentEditor from './SalesPaymentEditor';
import {conditions, methods, minor, money, rate} from '@/lib/sales/salesDesk.mjs';
import type {Customer} from '@/lib/sales/salesDesk.mjs';
import {addPurchaseItem, purchaseDraftRequest, purchaseDraftTotal, purchaseOfferView} from '@/lib/sales/purchaseDraft.mjs';
import type {PurchaseDraft} from '@/lib/sales/purchaseDraft.mjs';
import {purchaseOffer, purchaseCustomerView} from '@/lib/sales/salesPurchase.mjs';
import type {PurchaseReceipt} from '@/lib/sales/salesPurchase.mjs';
import {paymentLines} from '@/lib/sales/salesPayments.mjs';
import s from './SalesDesk.module.css';

type CatalogCard = {
    id: string; name: string; gv_id?: string; image?: string | null; number?: string; set_code?: string;
    search_card_printing_id?: string;
    printings?: {id: string; finish_label: string; printing_gv_id: string}[];
};
type Props = {
    draft: PurchaseDraft; locked: boolean; busy: boolean; pending: boolean; receipt: PurchaseReceipt | null;
    customers: (Customer & {id: string})[];
    edit: (change: (draft: PurchaseDraft) => PurchaseDraft) => Promise<unknown>;
    complete: () => Promise<void>; next: () => Promise<void>;
};
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Purchase could not update.';

// Uses the parent's owner-bound held-deal journal and completion/recovery queue.
export default function PurchaseDesk({draft, locked, busy, pending, receipt, customers, edit, complete, next}: Props) {
    const [query, setQuery] = useState(''), [game, setGame] = useState('pokemon');
    const [cards, setCards] = useState<CatalogCard[]>([]), [cursor, setCursor] = useState<number | null>(null);
    const [searching, setSearching] = useState(false), [searchError, setSearchError] = useState('');
    const [searchRevision, setSearchRevision] = useState(0), [error, setError] = useState('');
    const [selected, setSelected] = useState<CatalogCard | null>(null), [quick, setQuick] = useState(false);
    const [description, setDescription] = useState(''), [printing, setPrinting] = useState(''), [condition, setCondition] = useState('NM');
    const [agreed, setAgreed] = useState(''), [reference, setReference] = useState(''), [percentage, setPercentage] = useState('');
    const [quantity, setQuantity] = useState('1'), [intake, setIntake] = useState(false);
    const [review, setReview] = useState(false), [sellerView, setSellerView] = useState(false), [adding, setAdding] = useState(false);
    const searchGeneration = useRef(0), alive = useRef(true);
    const total = purchaseDraftTotal(draft), offer = receipt ? purchaseCustomerView(receipt) : purchaseOfferView(draft), disabled = locked || adding;
    useEffect(() => { alive.current = true; return () => {alive.current = false;}; }, []);
    useEffect(() => {
        const generation = ++searchGeneration.current, controller = new AbortController();
        setCards([]); setCursor(null); setSearchError(''); setSelected(null); setQuick(false);
        if (query.trim().length < 2) {setSearching(false); return () => controller.abort();}
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const response = await fetch('/api/sales/desk?' + new URLSearchParams({action: 'catalog', q: query, game, offset: '0'}),
                    {cache: 'no-store', credentials: 'same-origin', signal: controller.signal});
                const result = await response.json();
                if (!response.ok) throw Error(result.error ?? 'Catalog could not load.');
                if (generation !== searchGeneration.current || !alive.current) return;
                setCards(result.cards); setCursor(result.next?.offset ?? null);
            } catch (error) {
                if (!controller.signal.aborted && generation === searchGeneration.current && alive.current) setSearchError(errorText(error));
            } finally {
                if (generation === searchGeneration.current && alive.current) setSearching(false);
            }
        }, 180);
        return () => {clearTimeout(timer); controller.abort();};
    }, [query, game, searchRevision]);
    async function more() {
        if (cursor === null || searching) return;
        const generation = searchGeneration.current;
        setSearching(true); setSearchError('');
        try {
            const response = await fetch('/api/sales/desk?' + new URLSearchParams({action: 'catalog', q: query, game, offset: String(cursor)}),
                {cache: 'no-store', credentials: 'same-origin'});
            const result = await response.json();
            if (!response.ok) throw Error(result.error ?? 'More results could not load.');
            if (generation !== searchGeneration.current || !alive.current) return;
            setCards(previous => {
                const key = (card: CatalogCard) => card.id + ':' + (card.search_card_printing_id ?? '');
                const seen = new Set(previous.map(key));
                return [...previous, ...result.cards.filter((card: CatalogCard) => !seen.has(key(card)))];
            });
            setCursor(result.next?.offset ?? null);
        } catch (error) {if (generation === searchGeneration.current && alive.current) setSearchError(errorText(error));}
        finally {if (generation === searchGeneration.current && alive.current) setSearching(false);}
    }
    function choose(card: CatalogCard | null) {
        if (disabled || searching) return;
        setSelected(card); setQuick(card === null); setDescription(card?.name ?? ''); setPrinting(''); setCondition('NM');
        setAgreed(''); setReference(''); setPercentage(''); setQuantity('1'); setIntake(false); setError('');
    }
    function change(update: (value: PurchaseDraft) => PurchaseDraft) {
        if (disabled) return;
        void edit(update).catch(error => {if (alive.current) setError(errorText(error));});
    }
    let suggestion: number | null = null;
    try {suggestion = purchaseOffer(minor(reference), rate(percentage));} catch { /* Optional offer fields may be incomplete. */ }
    async function add() {
        if (disabled) return;
        try {
            const amount = minor(agreed), count = /^\d{1,3}$/.test(quantity) ? Number(quantity) : null;
            const referenceMinor = reference.trim() === '' ? null : minor(reference);
            const rateBps = percentage.trim() === '' ? null : rate(percentage);
            if (amount === null || count === null || reference.trim() !== '' && referenceMinor === null || percentage.trim() !== '' && rateBps === null)
                throw Error('Check the agreed price, quantity and optional offer fields.');
            if (selected && !printing) throw Error('Choose the exact printing first.');
            const option = selected?.printings?.find(value => value.id === printing);
            if (selected && !option) throw Error('Choose an available printing.');
            const line = {description: selected ? `${selected.name} · ${option!.printing_gv_id}` : description.trim(),
                quantity: selected ? 1 : count, unitMinor: amount, referenceMinor, rateBps,
                cardId: selected?.id ?? null, printingId: selected ? printing : null,
                condition: selected ? condition : null, addToVault: selected ? intake : false};
            setAdding(true);
            await edit(value => addPurchaseItem(value, line));
            if (alive.current) {setSelected(null); setQuick(false); setError('');}
        } catch (error) {if (alive.current) setError(errorText(error));}
        finally {if (alive.current) setAdding(false);}
    }
    let canComplete = false;
    try {purchaseDraftRequest(draft, draft.id, true); canComplete = true;} catch { /* Display explicit validation when reviewing. */ }
    function startReview() {
        if (disabled) return;
        try {purchaseDraftRequest(draft, draft.id, true); setError(''); setReview(true);}
        catch (error) {setError(errorText(error));}
    }
    return <>
        {error && <div role="alert" className={s.error}>{error}<button aria-label="Dismiss purchase error" onClick={() => setError('')}><X size={15}/></button></div>}
        <div className={s.workspace}>
            <section className={s.inventory} aria-label="Find incoming cards">
                <h2>Buy cards</h2><p>Agree a price with the seller. Save incoming copies when the exchange is complete.</p>
                <div className={s.search}><Search size={19}/><input aria-label="Find incoming card" placeholder="Card name, set, number or Grookai ID" value={query} disabled={disabled} onChange={event => setQuery(event.target.value)}/>
                    <select aria-label="Purchase game" value={game} disabled={disabled} onChange={event => setGame(event.target.value)}><option value="pokemon">Pokémon</option><option value="mtg">Magic</option><option value="one_piece">One Piece</option></select></div>
                <div className={s.resultBar}><span role="status">{searching ? 'Updating results…' : `${cards.length} matches shown`}</span><button disabled={disabled || searching} onClick={() => choose(null)}><Plus size={15}/> Quick purchase</button></div>
                {searchError && <p role="alert" className={s.error}>{searchError}<button onClick={() => setSearchRevision(value => value + 1)}>Retry search</button></p>}
                {(selected || quick) && <section className={s.editor} aria-label="Purchase item details">
                    <button className={s.close} aria-label="Close purchase item" disabled={adding} onClick={() => {setSelected(null); setQuick(false);}}><X/></button>
                    {selected?.image && <Image unoptimized width={300} height={420} src={selected.image} alt={selected.name} className={s.editImage}/>}
                    <div className={s.editFields}><h3>{selected?.name ?? 'Quick purchase'}</h3>
                        {!selected && <label>Item description<input maxLength={200} value={description} disabled={disabled} onChange={event => setDescription(event.target.value)}/></label>}
                        {selected && <><label>Exact printing<select value={printing} disabled={disabled} onChange={event => setPrinting(event.target.value)}><option value="">Choose printing / finish</option>{selected.printings?.map(option => <option key={option.id} value={option.id}>{option.finish_label} · {option.printing_gv_id}</option>)}</select></label>
                            <label>Condition<select value={condition} disabled={disabled} onChange={event => setCondition(event.target.value)}>{conditions.map(value => <option key={value}>{value}</option>)}</select></label></>}
                        <label>Agreed price per item (USD)<input inputMode="decimal" value={agreed} disabled={disabled} onChange={event => setAgreed(event.target.value)}/></label>
                        {!selected && <label>Quantity<input inputMode="numeric" value={quantity} disabled={disabled} onChange={event => setQuantity(event.target.value)}/></label>}
                        <details><summary>Calculate an offer · optional</summary><div className={s.fields}>
                            <label>Reference value per item (USD)<input inputMode="decimal" value={reference} disabled={disabled} onChange={event => setReference(event.target.value)}/></label>
                            <label>Buy percentage<input inputMode="decimal" value={percentage} disabled={disabled} onChange={event => setPercentage(event.target.value)}/></label></div>
                            {suggestion !== null && <p>Suggested offer ${money(suggestion)} per item{minor(agreed) !== null && minor(agreed) !== suggestion ? ' · Agreed price overridden' : ''}</p>}
                            <button disabled={disabled || suggestion === null} onClick={() => {if (suggestion !== null) setAgreed(money(suggestion));}}>Use suggested offer</button>
                            <small>Changing the reference or percentage keeps your agreed price.</small></details>
                        {selected ? <label className={s.check}><input type="checkbox" checked={intake} disabled={disabled} onChange={event => setIntake(event.target.checked)}/> Add this copy to my Vault when the purchase completes</label> : <p>A quick purchase records the item and payout. It does not add inventory.</p>}
                        <button className={s.primary} disabled={disabled} onClick={() => void add()}>Add to purchase</button>
                    </div>
                </section>}
                <div className={s.grid} aria-busy={searching}>{cards.map(card => <article key={card.id + ':' + (card.search_card_printing_id ?? '')} className={s.card}>
                    <button className={s.art} disabled={disabled || searching} onClick={() => choose(card)}>{card.image ? <Image unoptimized width={300} height={420} src={card.image} alt={card.name} loading="lazy"/> : <span>Artwork unavailable</span>}</button>
                    <h3>{card.name}</h3><p>{card.set_code} · {card.number}</p><small>{card.gv_id}</small><button className={s.add} disabled={disabled || searching} onClick={() => choose(card)}>Choose printing</button>
                </article>)}</div>
                {!cards.length && !searching && !searchError && <p className={s.empty}>Search for a card or enter a quick purchase.</p>}
                {cursor !== null && <button className={s.more} disabled={searching || disabled} onClick={() => void more()}>Load more</button>}
            </section>
            <aside id="sales-cart" className={s.cart} aria-label="Current purchase">
                <div className={s.cartHeader}><h2>Your purchase</h2><button disabled={busy} onClick={() => setSellerView(true)}><Eye size={16}/> Seller view</button></div>
                <details className={s.details}><summary>{draft.customer.name || 'Add seller · optional'}</summary>
                    <label>Saved contact<select value={draft.customerId ?? ''} disabled={disabled} onChange={event => {const customer = customers.find(value => value.id === event.target.value); change(value => ({...value, customerId: customer?.id ?? null, customer: customer ? {name: customer.name, email: customer.email, phone: customer.phone, wants: customer.wants, notes: customer.notes} : {name: '', email: '', phone: '', wants: '', notes: ''}}));}}><option value="">New / walk-up seller</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name || customer.email || customer.phone}</option>)}</select></label>
                    {(['name', 'email', 'phone'] as const).map(key => <label key={key}>Seller {key}<input key={draft.id + ':' + draft.customerId + ':' + key} defaultValue={draft.customer[key]} disabled={disabled || !!draft.customerId} maxLength={key === 'name' ? 120 : key === 'email' ? 254 : 40} onChange={event => {const text = event.target.value; change(value => ({...value, customer: {...value.customer, [key]: text}}));}}/></label>)}
                </details>
                <div className={s.lines}>{!draft.items.length && <p className={s.empty}>Add the items you are buying.</p>}{draft.items.map((line, index) => <div className={s.line} key={index}><div><strong>{line.description}</strong><small>{line.quantity} × item · {line.condition ?? 'Quick purchase'}</small>
                    <small>{line.addToVault ? 'Adds one Vault copy on completion' : 'Receipt only'}</small>
                    {line.referenceMinor !== null && line.rateBps !== null && <small>Reference ${money(line.referenceMinor)} × {line.rateBps / 100}%{line.unitMinor !== purchaseOffer(line.referenceMinor, line.rateBps) ? ' · Agreed price overridden' : ''}</small>}
                    <label>Agreed price $<input aria-label={`Agreed price for ${line.description}`} key={line.unitMinor} inputMode="decimal" defaultValue={money(line.unitMinor)} disabled={disabled} onBlur={event => {const amount = minor(event.target.value); if (amount === null) {event.target.value = money(line.unitMinor); setError('Enter a valid agreed price, including zero when agreed.'); return;} change(value => ({...value, items: value.items.map((item, itemIndex) => itemIndex === index ? {...item, unitMinor: amount} : item)}));}}/></label></div>
                    <button disabled={disabled} aria-label={`Remove purchase ${line.description}`} onClick={() => change(value => ({...value, items: value.items.filter((_, itemIndex) => itemIndex !== index)}))}><X size={16}/></button></div>)}</div>
                <details className={s.details}><summary>Store & private note</summary><label>Store name<input key={draft.id} maxLength={120} defaultValue={draft.storeName} disabled={disabled} onChange={event => {const text = event.target.value; change(value => ({...value, storeName: text}));}}/></label>
                    <label>Private purchase note<input key={draft.id} maxLength={500} defaultValue={draft.note} disabled={disabled} onChange={event => {const text = event.target.value; change(value => ({...value, note: text}));}}/></label></details>
                <div className={s.checkout}><dl><dt className={s.total}>You pay seller</dt><dd className={s.total}>${money(total)}</dd></dl>
                    {receipt ? <div className={s.saved}><Check/> Purchase recorded · {receipt.number}{paymentLines(receipt, value => '$' + money(value)).map((line, index) => <p key={index}>{line}</p>)}<Link href="/account/store/receipts/cloud">Open purchase receipt</Link><button onClick={() => void next().catch(error => setError(errorText(error)))}>Next purchase</button></div> : pending ? <button className={s.primary} disabled={busy} onClick={() => void complete()}>Recover this purchase</button> : <button className={s.primary} disabled={disabled || !draft.items.length} onClick={startReview}>Review purchase</button>}
                    <small>Held offers stay on this browser. Payment is made outside Grookai.</small>
                </div>
            </aside>
        </div>
        {review && !receipt && <SalesDialog className={s.modal} label="Review purchase" busy={busy} onClose={() => setReview(false)}><h2>Complete the purchase</h2><p>{draft.items.length} purchase lines · {draft.items.filter(line => line.addToVault).length} new Vault copies</p><h3>Pay seller ${money(total)}</h3>
            <label className={s.paymentToggle}><input type="checkbox" checked={draft.payments !== undefined} disabled={disabled} onChange={event => {const checked = event.target.checked; change(value => ({...value, payments: checked ? [{method: value.method, amountMinor: total, tenderedMinor: total}] : undefined}));}}/> Split payout</label>
            {draft.payments !== undefined ? <SalesPaymentEditor entries={draft.payments} balance={-total} payoutRecipient="seller" disabled={disabled} onChange={update => change(value => ({...value, payments: update(value.payments ?? [])}))}/> : <label>Payout method<select value={draft.method} disabled={disabled} onChange={event => {const method = event.target.value; change(value => ({...value, method}));}}>{methods.map(method => <option key={method}>{method}</option>)}</select></label>}
            {!canComplete && <p role="alert">Check seller details and make sure payout amounts match the purchase total.</p>}
            <p>Confirm you received the cards and paid the seller. This records the purchase and selected incoming copies. Grookai does not transfer money.</p>
            <div className={s.actions}><button disabled={busy} onClick={() => setReview(false)}>Back to purchase</button><button className={s.primary} disabled={disabled || !canComplete} onClick={() => {setReview(false); void complete();}}>Exchange completed · Record purchase</button></div>
        </SalesDialog>}
        {sellerView && <SalesDialog className={s.customerDisplay} label="Seller offer" onClose={() => setSellerView(false)}><button className={s.close} aria-label="Close seller view" onClick={() => setSellerView(false)}><X/></button><small>YOUR OFFER</small><h2>{offer.storeName}</h2>{offer.items.map((line, index) => <div className={s.displayLine} key={index}><div><strong>{line.description}</strong><small>{line.quantity} × ${money(line.unitMinor)}</small></div><strong>${money(line.quantity * line.unitMinor)}</strong></div>)}<h3>You receive ${money(offer.purchaseMinor)}</h3><p>{receipt ? 'Purchase recorded · ' + receipt.number : 'Offer preview · payout not confirmed'}</p></SalesDialog>}
        <a className={s.mobileCart} href="#sales-cart">{draft.items.length} items · View purchase <strong>${money(total)}</strong></a>
    </>;
}
