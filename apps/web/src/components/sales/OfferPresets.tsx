import {useEffect, useRef, useState} from 'react';
import {offerPresetStore} from '@/lib/sales/offerPresets.mjs';
import type {OfferPreset, OfferPresetBook} from '@/lib/sales/offerPresets.mjs';
import {rate} from '@/lib/sales/salesDesk.mjs';

type Props = {owner: string; currentOwner: () => string | null; disabled: boolean; select: (basisPoints: number) => void};
export default function OfferPresets({owner, currentOwner, disabled, select}: Props) {
    const [book, setBook] = useState<OfferPresetBook | null>(null), [error, setError] = useState('');
    const [name, setName] = useState(''), [percentage, setPercentage] = useState(''), [editing, setEditing] = useState<string | null>(null);
    const [busy, setBusy] = useState(false), [reload, setReload] = useState(0);
    const repository = useRef<ReturnType<typeof offerPresetStore> | null>(null), alive = useRef(true);
    useEffect(() => {
        alive.current = true;
        let cancelled = false;
        Promise.resolve().then(() => {
            if (cancelled) return;
            try {
                if (!navigator.locks) throw Error('Offer presets need browser storage locking. You can still enter a percentage manually.');
                const repo = offerPresetStore(localStorage, owner, async (key, run) => await navigator.locks.request(key, run), currentOwner);
                repository.current = repo; setBook(repo.read()); setError(''); setEditing(null); setName(''); setPercentage('');
            } catch (e) {setBook(null); setError(e instanceof Error ? e.message : 'Offer presets could not load.');}
        });
        return () => {cancelled = true; alive.current = false; repository.current = null;};
    }, [owner, currentOwner, reload]);
    const locked = disabled || busy;
    async function save(presets: readonly OfferPreset[]) {
        if (locked || !book || !repository.current) return;
        setBusy(true); setError('');
        try {
            const next = await repository.current.save(book.revision, presets);
            if (alive.current && currentOwner() === owner) {setBook(next); setEditing(null); setName(''); setPercentage('');}
        } catch (e) {if (alive.current && currentOwner() === owner) setError(e instanceof Error ? e.message : 'Offer presets could not save.');}
        finally {if (alive.current) setBusy(false);}
    }
    function submit() {
        if (locked || !book) return;
        const rateBps = rate(percentage);
        if (rateBps === null || rateBps < 1 || rateBps > 10000 || !name.trim()) {setError('Enter a preset name and percentage from 0.01–100%.'); return;}
        const preset = {id: editing ?? crypto.randomUUID(), name, rateBps};
        void save(editing ? book.presets.map(value => value.id === editing ? preset : value) : [...book.presets, preset]);
    }
    return <details><summary>Offer presets</summary>
        <p>Private · saved on this browser for this account. Using a preset changes the percentage; your agreed price stays as entered.</p>
        {error && <p role="alert">{error} <button disabled={locked} onClick={() => setReload(value => value + 1)}>Reload presets</button></p>}
        {book && <>
            {book.presets.length === 0 && <p>No saved presets yet.</p>}
            <ul>{book.presets.map(preset => <li key={preset.id}><strong>{preset.name}</strong> · {preset.rateBps / 100}%{' '}
                <button disabled={locked} onClick={() => {if (currentOwner() === owner) select(preset.rateBps);}}>Use {preset.name}</button>{' '}
                <button disabled={locked} onClick={() => {setEditing(preset.id); setName(preset.name); setPercentage(String(preset.rateBps / 100));}}>Edit {preset.name}</button>{' '}
                <button disabled={locked} onClick={() => void save(book.presets.filter(value => value.id !== preset.id))}>Delete {preset.name}</button>
            </li>)}</ul>
            <label>Preset name<input maxLength={80} value={name} disabled={locked} onChange={event => setName(event.target.value)}/></label>
            <label>Preset percentage<input inputMode="decimal" value={percentage} disabled={locked} onChange={event => setPercentage(event.target.value)}/></label>
            <button disabled={locked || !editing && book.presets.length >= 20} onClick={submit}>{editing ? 'Save preset changes' : 'Save new preset'}</button>
            {editing && <button disabled={locked} onClick={() => {setEditing(null); setName(''); setPercentage('');}}>Cancel preset edit</button>}
            <small>{book.presets.length}/20 presets. Changes apply only when you choose a preset again.</small>
        </>}
    </details>;
}
