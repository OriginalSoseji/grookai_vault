import {useEffect, useRef, useState} from 'react';
import {offerPolicyStore, removeOfferPolicy, validateOfferPolicy} from '@/lib/sales/offerPolicies.mjs';
import type {OfferPolicy, OfferPolicyBook, OfferIntent} from '@/lib/sales/offerPolicies.mjs';
import {minor, money, rate} from '@/lib/sales/salesDesk.mjs';

type Props = {owner: string; currentOwner: () => string | null; disabled: boolean; intent: OfferIntent;
    select: (policy: OfferPolicy | null) => void};
export default function OfferPolicies({owner, currentOwner, disabled, intent, select}: Props) {
    const [book, setBook] = useState<OfferPolicyBook | null>(null), [error, setError] = useState('');
    const [name, setName] = useState(''), [percentage, setPercentage] = useState(''), [editing, setEditing] = useState<string | null>(null);
    const [policyIntent, setIntent] = useState<OfferIntent>(intent), [source, setSource] = useState<OfferPolicy['source']>('manual');
    const [basis, setBasis] = useState<OfferPolicy['conditionBasis']>('selected');
    const [increment, setIncrement] = useState<OfferPolicy['rounding']['incrementMinor']>(1), [mode, setMode] = useState<OfferPolicy['rounding']['mode']>('nearest');
    const [tier, setTier] = useState(false), [ceiling, setCeiling] = useState(''), [tierPercentage, setTierPercentage] = useState('');
    const [busy, setBusy] = useState(false), [reload, setReload] = useState(0);
    const repository = useRef<ReturnType<typeof offerPolicyStore> | null>(null), initialized = useRef(false);
    const alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        let cancelled = false;
        Promise.resolve().then(() => {
            if (cancelled) return;
            try {
                if (!navigator.locks) throw Error('Saved policies need browser storage locking. You can still calculate an offer manually.');
                const repo = offerPolicyStore(localStorage, owner, async (key, run) => await navigator.locks.request(key, run), currentOwner);
                repository.current = repo;
                const loaded = repo.read(); setBook(loaded); setError('');
                if (!initialized.current) {
                    initialized.current = true;
                    const defaultPolicy = loaded.presets.find(value => value.id === loaded.defaults[intent]);
                    if (defaultPolicy) select(defaultPolicy);
                }
            } catch (e) {setBook(null); setError(e instanceof Error ? e.message : 'Offer policies could not load.');}
        });
        return () => {cancelled = true; alive.current = false; repository.current = null;};
    }, [owner, currentOwner, reload, intent, select]);
    const locked = disabled || busy;
    function reset() {setEditing(null); setName(''); setPercentage(''); setIntent(intent); setSource('manual'); setBasis('selected'); setIncrement(1); setMode('nearest'); setTier(false); setCeiling(''); setTierPercentage('');}
    async function save(presets: readonly OfferPolicy[], defaults: OfferPolicyBook['defaults']) {
        if (locked || !book || !repository.current) return;
        setBusy(true); setError('');
        try {
            const next = await repository.current.save(book.revision, presets, defaults);
            if (alive.current && currentOwner() === owner) {setBook(next); reset();}
        } catch (e) {if (alive.current && currentOwner() === owner) setError(e instanceof Error ? e.message : 'Offer policies could not save.');}
        finally {if (alive.current) setBusy(false);}
    }
    function submit() {
        if (locked || !book) return;
        try {
            const policy = validateOfferPolicy({id: editing ?? crypto.randomUUID(), name, intent: policyIntent, rateBps: rate(percentage), source, conditionBasis: basis,
                rounding: {incrementMinor: increment, mode}, lowValueTier: tier ? {ceilingMinor: minor(ceiling), rateBps: rate(tierPercentage)} : null});
            // Changing intent clears a now-incompatible default without assigning a replacement.
            const defaults = {...book.defaults};
            for (const kind of ['cash', 'trade'] as const) if (defaults[kind] === policy.id && policy.intent !== kind) defaults[kind] = null;
            void save(editing ? book.presets.map(value => value.id === editing ? policy : value) : [...book.presets, policy], defaults);
        } catch {setError('Enter a policy name, percentages from 0.01–100%, and a positive tier ceiling when enabled.');}
    }
    function edit(policy: OfferPolicy) {
        setEditing(policy.id); setName(policy.name); setPercentage(String(policy.rateBps / 100)); setIntent(policy.intent); setSource(policy.source);
        setBasis(policy.conditionBasis); setIncrement(policy.rounding.incrementMinor); setMode(policy.rounding.mode); setTier(policy.lowValueTier !== null);
        setCeiling(policy.lowValueTier ? money(policy.lowValueTier.ceilingMinor) : ''); setTierPercentage(policy.lowValueTier ? String(policy.lowValueTier.rateBps / 100) : '');
    }
    return <details><summary>Offer policies</summary>
        <p>Private · saved on this browser for this account. Policies calculate a proposal; your agreed price stays as entered.</p>
        {error && <p role="alert">{error} <button disabled={locked} onClick={() => {reset(); setReload(value => value + 1);}}>Reload policies</button></p>}
        {book && <>
            {(['cash', 'trade'] as const).map(kind => <label key={kind}>Default {kind} policy<select disabled={locked} value={book.defaults[kind] ?? ''}
                onChange={event => void save(book.presets, {...book.defaults, [kind]: event.target.value || null})}>
                <option value="">No default</option>{book.presets.filter(value => value.intent === kind).map(value => <option key={value.id} value={value.id}>{value.name}</option>)}
            </select></label>)}
            <small>Defaults apply to new items. Held deals and this item keep their current terms.</small>
            {book.presets.length === 0 && <p>No saved policies yet.</p>}
            <ul>{book.presets.map(policy => <li key={policy.id}><strong>{policy.name}</strong> · {policy.intent} · {policy.rateBps / 100}% · {policy.source === 'manual' ? 'Entered reference' : 'TCGPlayer Market'}{' '}
                {policy.intent === intent && <button disabled={locked} onClick={() => {if (currentOwner() === owner) select(policy);}}>Use {policy.name}</button>}{' '}
                <button disabled={locked} onClick={() => edit(policy)}>Edit {policy.name}</button>{' '}
                <button disabled={locked} onClick={() => {const next = removeOfferPolicy(book, policy.id); void save(next.presets, next.defaults);}}>Delete {policy.name}</button>
            </li>)}</ul>
            <label>Policy name<input maxLength={80} value={name} disabled={locked} onChange={event => setName(event.target.value)}/></label>
            <label>Policy intent<select value={policyIntent} disabled={locked} onChange={event => setIntent(event.target.value as OfferIntent)}><option value="cash">Cash purchase</option><option value="trade">Trade credit</option></select></label>
            <label>Policy percentage<input inputMode="decimal" value={percentage} disabled={locked} onChange={event => setPercentage(event.target.value)}/></label>
            <label>Reference source<select value={source} disabled={locked} onChange={event => setSource(event.target.value as OfferPolicy['source'])}><option value="manual">Entered reference</option><option value="tcgplayer_market">TCGPlayer Market · exact printing</option></select></label>
            <label>Reference condition basis<select value={basis} disabled={locked} onChange={event => setBasis(event.target.value as OfferPolicy['conditionBasis'])}>
                <option value="selected">Selected item condition</option><option value="unspecified">Condition unspecified</option>{['NM', 'LP', 'MP', 'HP', 'DMG'].map(value => <option key={value}>{value}</option>)}
            </select></label>
            {source === 'tcgplayer_market' && <small>Market references have no condition adjustment. Choose condition unspecified and review it when applying the offer.</small>}
            <label>Round to<select value={increment} disabled={locked} onChange={event => setIncrement(Number(event.target.value) as typeof increment)}>{[1, 5, 10, 25, 50, 100].map(value => <option key={value} value={value}>${money(value)}</option>)}</select></label>
            <label>Rounding rule<select value={mode} disabled={locked} onChange={event => setMode(event.target.value as typeof mode)}><option value="nearest">Nearest · halves up</option><option value="down">Down</option></select></label>
            <label><input type="checkbox" checked={tier} disabled={locked} onChange={event => setTier(event.target.checked)}/> Use a low-value tier</label>
            {tier && <><label>Tier reference ceiling per item (USD)<input inputMode="decimal" value={ceiling} disabled={locked} onChange={event => setCeiling(event.target.value)}/></label>
                <label>Tier percentage<input inputMode="decimal" value={tierPercentage} disabled={locked} onChange={event => setTierPercentage(event.target.value)}/></label><small>Applies at or below the ceiling, before multiplying quantity.</small></>}
            <button disabled={locked || !editing && book.presets.length >= 20} onClick={submit}>{editing ? 'Save policy changes' : 'Save new policy'}</button>
            {editing && <button disabled={locked} onClick={reset}>Cancel policy edit</button>}
            <small>{book.presets.length}/20 policies. Editing or deleting a policy does not change an offer already selected.</small>
        </>}
    </details>;
}
