import {useCallback, useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import {Plus, Search, X} from 'lucide-react';
import OfferPolicies from './OfferPolicies';
import OfferSummary from './OfferSummary';
import {quoteOfferPolicy} from '@/lib/sales/offerPolicies.mjs';
import type {OfferPolicy, OfferReference, OfferProposal, OfferCondition} from '@/lib/sales/offerPolicies.mjs';
import {conditions, minor, money, rate} from '@/lib/sales/salesDesk.mjs';
import {addNegotiatedTrade} from '@/lib/sales/negotiatedDraft.mjs';
import type {NegotiatedDraft} from '@/lib/sales/negotiatedDraft.mjs';
import s from './SalesDesk.module.css';

type CatalogCard = {
    id: string; name: string; gv_id?: string; image?: string | null; number?: string; set_code?: string;
    search_card_printing_id?: string;
    printings?: {id: string; finish_label: string; printing_gv_id: string}[];
};
type Props = {owner: string; currentOwner: () => string | null; locked: boolean;
    edit: (change: (draft: NegotiatedDraft) => NegotiatedDraft) => Promise<unknown>;};
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Trade could not update.';
const referenceTime = (value: string | null) => value === null ? 'Unavailable' : new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
}).format(new Date(value)) + ' UTC';

// Uses the parent's owner-bound held-deal journal and completion/recovery queue.
export default function NegotiatedTradeEditor({owner, currentOwner, locked, edit}: Props) {
    const [query, setQuery] = useState(''), [game, setGame] = useState('pokemon');
    const [cards, setCards] = useState<CatalogCard[]>([]), [cursor, setCursor] = useState<number | null>(null);
    const [searching, setSearching] = useState(false), [searchError, setSearchError] = useState('');
    const [searchRevision, setSearchRevision] = useState(0), [error, setError] = useState('');
    const [selected, setSelected] = useState<CatalogCard | null>(null), [quick, setQuick] = useState(false);
    const [description, setDescription] = useState(''), [printing, setPrinting] = useState(''), [condition, setCondition] = useState('NM');
    const [agreed, setAgreed] = useState(''), [reference, setReference] = useState(''), [percentage, setPercentage] = useState('');
    const [quantity, setQuantity] = useState('1'), [intake, setIntake] = useState(false);
    const [policy, setPolicy] = useState<OfferPolicy | null>(null), [marketReference, setMarketReference] = useState<OfferReference | null>(null);
    const [marketError, setMarketError] = useState(''), [marketLoading, setMarketLoading] = useState(false), [marketReload, setMarketReload] = useState(0);
    const [conditionReview, setConditionReview] = useState(''), [editorRevision, setEditorRevision] = useState(0);
    const [, refreshClock] = useState(0);
    const selectPolicy = useCallback((value: OfferPolicy | null) => {setPolicy(value); setConditionReview('');}, []);
    const [adding, setAdding] = useState(false);
    const searchGeneration = useRef(0), alive = useRef(true);
    const disabled = locked || adding;
    useEffect(() => { alive.current = true; return () => {alive.current = false;}; }, []);
    const selectedCardId = selected?.id ?? null;
    useEffect(() => {
        const controller = new AbortController();
        setMarketReference(null); setMarketError(''); setMarketLoading(false);
        if (policy?.source !== 'tcgplayer_market' || !selectedCardId || !printing) return () => controller.abort();
        setMarketLoading(true);
        void (async () => {
            try {
                if (currentOwner() !== owner) throw Error('Your account changed. Reopen the sales desk.');
                const response = await fetch('/api/sales/desk?' + new URLSearchParams({action: 'offer-reference', owner, cardId: selectedCardId, printingId: printing}),
                    {cache: 'no-store', credentials: 'same-origin', signal: controller.signal});
                const result = await response.json();
                if (controller.signal.aborted || !alive.current || currentOwner() !== owner) return;
                if (!response.ok || result.owner !== owner) throw Error('Market reference could not load. Retry or bypass the policy.');
                if (result.status !== 'available') throw Error('No qualified market reference for this exact printing. You can enter agreed terms manually.');
                const checked = quoteOfferPolicy({id: printing, name: 'Reference check', intent: 'trade', rateBps: 10000, source: 'tcgplayer_market',
                    conditionBasis: 'unspecified', rounding: {incrementMinor: 1, mode: 'nearest'}, lowValueTier: null},
                    {intent: 'trade', quantity: 1, cardId: selectedCardId, printingId: printing, condition: null}, result.reference, Date.now());
                if (checked.status !== 'available') throw Error('Market reference needs review. Refresh it or enter agreed terms manually.');
                setMarketReference(result.reference);
            } catch (error) {if (!controller.signal.aborted && alive.current && currentOwner() === owner) setMarketError(errorText(error));}
            finally {if (!controller.signal.aborted && alive.current) setMarketLoading(false);}
        })();
        return () => controller.abort();
    }, [policy?.source, selectedCardId, printing, owner, currentOwner, marketReload]);
    useEffect(() => {
        if (policy?.source !== 'tcgplayer_market') return;
        const timer = setInterval(() => refreshClock(value => value + 1), 30000);
        return () => clearInterval(timer);
    }, [policy?.source]);
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
        setPolicy(null); setConditionReview(''); setEditorRevision(value => value + 1);
    }
    let suggestion: number | null = null;
    try {const value = minor(reference), bps = rate(percentage), count = selected ? 1 : Number(quantity); if (value !== null && value > 0 && bps !== null && Number.isInteger(count) && count >= 1 && count <= 999) suggestion = Math.floor((value * count * bps + 5000) / 10000);} catch { /* Optional offer fields may be incomplete. */ }
    function policyProposal(): OfferProposal | null {
        if (!policy) return null;
        try {
            const basis = policy.conditionBasis === 'selected' ? selected ? condition as OfferCondition : null : policy.conditionBasis === 'unspecified' ? null : policy.conditionBasis;
            const evidence = policy.source === 'tcgplayer_market' ? marketReference : minor(reference) === null ? null : {
                source: 'manual' as const, amountMinor: minor(reference)!, currency: 'USD', cardId: selectedCardId, printingId: selected ? printing : null,
                condition: basis, observedAt: null, publishedAt: null, provenanceId: null,
            };
            return quoteOfferPolicy(policy, {intent: 'trade', quantity: selected ? 1 : Number(quantity), cardId: selectedCardId,
                printingId: selected ? printing : null, condition: selected ? condition as OfferCondition : null}, evidence, Date.now());
        } catch {return {status: 'unavailable', reason: 'incomplete_item'};}
    }
    const proposal = policyProposal();
    if (policy) suggestion = proposal?.status === 'available' ? proposal.suggestedMinor : null;
    const reviewKey = JSON.stringify([policy, selectedCardId, printing, condition, quantity, policy?.source === 'manual' ? reference : marketReference]);
    const needsReview = proposal?.status === 'available' && proposal.requiresConditionReview && conditionReview !== reviewKey;
    function useSuggestion() {
        if (disabled || currentOwner() !== owner) return;
        const fresh = policyProposal();
        if (policy && (fresh?.status !== 'available' || fresh.requiresConditionReview && conditionReview !== reviewKey)) {
            setError('Review the reference, condition and current offer before applying it.'); return;
        }
        const amount = fresh?.status === 'available' ? fresh.suggestedMinor : suggestion;
        if (amount !== null) setAgreed(money(amount));
    }
    async function add() {
        if (disabled || currentOwner() !== owner) return;
        try {
            const amount = minor(agreed), count = /^\d{1,3}$/.test(quantity) ? Number(quantity) : null;
            const fresh = policyProposal();
            const referenceMinor = policy ? fresh?.status === 'available' ? fresh.referenceMinor : null : reference.trim() === '' ? null : minor(reference);
            const rateBps = policy ? fresh?.status === 'available' ? fresh.rateBps : null : percentage.trim() === '' ? null : rate(percentage);
            if (amount === null || count === null || !policy && (reference.trim() !== '' && referenceMinor === null || percentage.trim() !== '' && rateBps === null))
                throw Error('Check the agreed whole-line credit, quantity and optional offer fields.');
            if (selected && !printing) throw Error('Choose the exact printing first.');
            const option = selected?.printings?.find(value => value.id === printing);
            if (selected && !option) throw Error('Choose an available printing.');
            const line = {description: selected ? `${selected.name} · ${option!.printing_gv_id}` : description.trim(),
                quantity: selected ? 1 : count, creditMinor: amount, valueMinor: referenceMinor, rateBps,
                cardId: selected?.id ?? null, printingId: selected ? printing : null,
                condition: selected ? condition as OfferCondition : null, addToVault: selected ? intake : false};
            setAdding(true);
            await edit(value => addNegotiatedTrade(value, line));
            if (alive.current) {setSelected(null); setQuick(false); setError('');}
        } catch (error) {if (alive.current) setError(errorText(error));}
        finally {if (alive.current) setAdding(false);}
    }
    return <div>
        {error && <p role="alert" className={s.error}>{error}</p>}
            <section className={s.inventory} aria-label="Find incoming cards">
                <h2>Incoming trade cards</h2><p>Agree the total credit for each line. Save selected incoming copies when the exchange is complete.</p>
                <div className={s.search}><Search size={19}/><input aria-label="Find incoming card" placeholder="Card name, set, number or Grookai ID" value={query} disabled={disabled} onChange={event => setQuery(event.target.value)}/>
                    <select aria-label="Trade game" value={game} disabled={disabled} onChange={event => setGame(event.target.value)}><option value="pokemon">Pokémon</option><option value="mtg">Magic</option><option value="one_piece">One Piece</option></select></div>
                <div className={s.resultBar}><span role="status">{searching ? 'Updating results…' : `${cards.length} matches shown`}</span><button disabled={disabled || searching} onClick={() => choose(null)}><Plus size={15}/> Quick trade</button></div>
                {searchError && <p role="alert" className={s.error}>{searchError}<button onClick={() => setSearchRevision(value => value + 1)}>Retry search</button></p>}
                {(selected || quick) && <section className={s.editor} aria-label="Trade item details">
                    <button className={s.close} aria-label="Close trade item" disabled={adding} onClick={() => {setSelected(null); setQuick(false);}}><X/></button>
                    {selected?.image && <Image unoptimized width={300} height={420} src={selected.image} alt={selected.name} className={s.editImage}/>}
                    <div className={s.editFields}><h3>{selected?.name ?? 'Quick trade'}</h3>
                        {!selected && <label>Item description<input maxLength={200} value={description} disabled={disabled} onChange={event => setDescription(event.target.value)}/></label>}
                        {selected && <><label>Exact printing<select value={printing} disabled={disabled} onChange={event => setPrinting(event.target.value)}><option value="">Choose printing / finish</option>{selected.printings?.map(option => <option key={option.id} value={option.id}>{option.finish_label} · {option.printing_gv_id}</option>)}</select></label>
                            <label>Condition<select value={condition} disabled={disabled} onChange={event => setCondition(event.target.value)}>{conditions.map(value => <option key={value}>{value}</option>)}</select></label></>}
                        <label>Agreed credit for this whole line (USD)<input inputMode="decimal" value={agreed} disabled={disabled} onChange={event => setAgreed(event.target.value)}/></label>
                        {!selected && <label>Quantity<input inputMode="numeric" value={quantity} disabled={disabled} onChange={event => setQuantity(event.target.value)}/></label>}
                        <details><summary>Calculate an offer · optional</summary>
                            <OfferPolicies key={editorRevision} owner={owner} currentOwner={currentOwner} intent="trade" disabled={disabled} select={selectPolicy}/>
                            {policy && <p>Using {policy.name} <button disabled={disabled} onClick={() => selectPolicy(null)}>Bypass policy · manual terms</button></p>}
                            <div className={s.fields}>
                            {policy?.source !== 'tcgplayer_market' && <label>Reference value per item (USD)<input inputMode="decimal" value={reference} disabled={disabled} onChange={event => setReference(event.target.value)}/></label>}
                            {!policy && <label>Trade percentage<input inputMode="decimal" value={percentage} disabled={disabled} onChange={event => setPercentage(event.target.value)}/></label>}</div>
                            {policy?.source === 'manual' && <p>Entered reference · condition basis: {policy.conditionBasis === 'selected' ? selected ? condition : 'unknown' : policy.conditionBasis}. Enter a value for this basis; Grookai does not adjust it between conditions.</p>}
                            {policy?.source === 'tcgplayer_market' && <><p>TCGPlayer Market · exact printing · condition unspecified</p>
                                {marketLoading && <p role="status">Loading market reference…</p>}{marketError && <p role="alert">{marketError}</p>}
                                <button disabled={disabled || marketLoading || !printing} onClick={() => setMarketReload(value => value + 1)}>Refresh market reference</button>
                                {marketReference && <small>Observed {referenceTime(marketReference.observedAt)} · published {referenceTime(marketReference.publishedAt)}</small>}</>}
                            {suggestion !== null && <OfferSummary suggested={suggestion} agreed={minor(agreed)} trade={true} proposal={proposal}/>}
                            {proposal?.status === 'available' && proposal.requiresConditionReview && <label className={s.check}><input type="checkbox" checked={conditionReview === reviewKey} disabled={disabled}
                                onChange={event => setConditionReview(event.target.checked ? reviewKey : '')}/> I reviewed the {proposal.basisCondition ?? 'unspecified'} reference condition for this {selected ? condition : 'unspecified-condition'} item.</label>}
                            {policy && proposal?.status !== 'available' && !marketLoading && <p>No policy offer yet. Check the exact printing, reference and condition basis. You may still enter agreed credit.</p>}
                            <button disabled={disabled || suggestion === null || needsReview} onClick={useSuggestion}>Use suggested credit</button>
                            </details>
                        {selected ? <label className={s.check}><input type="checkbox" checked={intake} disabled={disabled} onChange={event => setIntake(event.target.checked)}/> Add this copy to my Vault when the trade completes</label> : <p>A quick trade records the incoming line and agreed credit. It does not add inventory.</p>}
                        <button className={s.primary} disabled={disabled} onClick={() => void add()}>Add to trade</button>
                    </div>
                </section>}
                <div className={s.grid} aria-busy={searching}>{cards.map(card => <article key={card.id + ':' + (card.search_card_printing_id ?? '')} className={s.card}>
                    <button className={s.art} disabled={disabled || searching} onClick={() => choose(card)}>{card.image ? <Image unoptimized width={300} height={420} src={card.image} alt={card.name} loading="lazy"/> : <span>Artwork unavailable</span>}</button>
                    <h3>{card.name}</h3><p>{card.set_code} · {card.number}</p><small>{card.gv_id}</small><button className={s.add} disabled={disabled || searching} onClick={() => choose(card)}>Choose printing</button>
                </article>)}</div>
                {!cards.length && !searching && !searchError && <p className={s.empty}>Search for a card or enter a quick trade.</p>}
                {cursor !== null && <button className={s.more} disabled={searching || disabled} onClick={() => void more()}>Load more</button>}
            </section>
    </div>;
}
