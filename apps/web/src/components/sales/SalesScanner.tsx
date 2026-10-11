"use client";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { scannedCopyId } from '@/lib/sales/salesScanner.mjs';
import s from './SalesDesk.module.css';

export default function SalesScanner({disabled, context, add, pending}: {
    disabled: boolean; context: string;
    add: (id: string, current: () => boolean) => Promise<string>;
    pending: (value: boolean) => void;
}) {
    const [active, setActive] = useState(false), [text, setText] = useState(''), [status, setStatus] = useState(''), [focused, setFocused] = useState(false);
    const input = useRef<HTMLInputElement>(null), sequence = useRef(0), count = useRef(0), queue = useRef(Promise.resolve());
    const latest = useRef({disabled, context, active});
    useLayoutEffect(() => {
        if ((!latest.current.disabled && disabled) || latest.current.context !== context) sequence.current++;
        latest.current = {disabled, context, active};
    }, [disabled, context, active]);
    useEffect(() => () => { sequence.current++; }, []);
    function stop() { sequence.current++; setActive(false); setText(''); }
    function submit() {
        const raw = text;
        setText('');
        if (!active || disabled) return;
        const id = scannedCopyId(raw);
        if (!id) { setStatus('Scan a Grookai copy QR label (GVVI). Catalog codes cannot identify an individual copy.'); return; }
        if (count.current >= 50) { setStatus('Scan queue is full. Wait for the current cards.'); return; }
        const version = sequence.current, target = context;
        const current = () => sequence.current === version && latest.current.active && !latest.current.disabled && latest.current.context === target;
        count.current++; pending(true); setStatus('Reading card…');
        queue.current = queue.current.then(async () => {
            if (!current()) return;
            try { const message = await add(id, current); if (current()) setStatus(message); }
            catch (error) { if (current()) { setStatus(error instanceof Error ? error.message : 'Scan failed. Try again.'); sequence.current++; } }
        }).finally(() => { count.current--; if (!count.current) pending(false); });
    }
    return <section className={s.scanner} aria-label="Scan cards to cart">
        <div><ScanLine size={20}/><strong>Scan to cart</strong><button disabled={disabled} aria-pressed={active} onClick={() => {
            if (active) stop(); else { setActive(true); setStatus(''); requestAnimationFrame(() => input.current?.focus()); }
        }}>{active ? 'Stop scanning' : 'Scan cards'}</button></div>
        {active && <><p>Scan your Grookai copy QR labels to add cards at your asking price.</p>
            <form onSubmit={e => {e.preventDefault(); submit();}}><input ref={input} aria-label="Scanner input" placeholder="Ready for your next card" value={text} maxLength={1024}
                autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={disabled}
                onChange={e => setText(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}/>
                <button disabled={disabled || !text.trim()} type="submit">Add scan</button></form>
            {!focused && <button disabled={disabled} onClick={() => input.current?.focus()}>Resume scanning</button>}
            <small>Pair your Bluetooth scanner in device settings. Use keyboard mode with Enter after each scan.</small></>}
        {status && <p role="status">{status}</p>}
    </section>;
}
