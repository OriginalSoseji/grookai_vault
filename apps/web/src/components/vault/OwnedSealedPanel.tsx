"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, History, ChevronLeft, ChevronRight, Edit, Package, Plus, RefreshCw, Search, Share2, Trash2, X } from 'lucide-react';
import { SealedDetailsDialog, SealedHistoryDialog } from './SealedCopyDetails';
import { SealedLotDialog } from './SealedLotDialog';
import { supabase } from '@/lib/supabaseClient';
import { combineUsdTotal, parseSealedCopy, parseSealedTotals, sealedIdentity, sealedOwnershipEnabled,
  verifySealedAddition, type SealedCopy, type SealedTotals } from '@/lib/sealed/ownedSealedV1';

const control = 'min-h-10 w-full rounded-md border border-current/25 bg-transparent px-3 py-2 text-sm';
const icon = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40';
const money = (n: number | null, c: string | null) => n == null ? 'Unpriced' : `${c ?? ''} ${n.toFixed(2)}`;
async function rpc(name: string, params: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc(name, params); if (error) throw error; return data;
}
const running = new Map<string, Promise<unknown>>();
async function mutation(name: string, params: Record<string, unknown>, verify: (r: unknown) => Promise<void>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Sign in first');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([name, params])));
  const key = `sealed_request_v1:${user.id}:${Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')}`;
  if (running.has(key)) return running.get(key);
  const task = (async () => {
    const requestId = localStorage.getItem(key) ?? crypto.randomUUID();
    localStorage.setItem(key, requestId);
    const result = await rpc(name, { ...params, p_request_id: requestId });
    const current = await supabase.auth.getUser();
    if (current.data.user?.id !== user.id) throw new Error('Account changed');
    await verify(result);
    localStorage.removeItem(key);
    return result;
  })();
  running.set(key, task);
  try { return await task; } finally { running.delete(key); }
}
async function dispose(row: SealedCopy, operation: string, details: Record<string, unknown> = {}) {
  await mutation('vault_dispose_sealed_copy_v1', { p_instance_id: row.instance_id, p_operation: operation, ...details }, async raw => {
    const result = raw as Record<string, unknown>;
    const remaining = await rpc('get_owned_sealed_copies_v1', { p_instance_ids: [row.instance_id] });
    if (result.instance_id !== row.instance_id || result.archived !== true || result.operation !== operation || remaining.length !== 0) throw new Error('Disposition readback mismatch');
  });
}
let capability: { user: string; expires: number; promise: Promise<boolean> } | undefined;
export function AddSealedButton({ variantId, name, onChanged }: { variantId: string; name: string; onChanged?: () => void }) {
  const [allowed, setAllowed] = useState(false), [open, setOpen] = useState(false);
  useEffect(() => {
    if (!sealedOwnershipEnabled) return;
    let cancelled = false;
    let revision = 0;
    let refresh: ReturnType<typeof setTimeout> | undefined;
    async function check() {
      const currentRevision = ++revision;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setAllowed(false); return; }
      if (!capability || capability.user !== user.id || capability.expires < Date.now()) capability = { user: user.id, expires: Date.now() + 30000,
        promise: rpc('get_sealed_ownership_capabilities_v1').then(r => r?.add_enabled === true).catch(() => false) };
      const allowed = await capability.promise;
      if (!cancelled && currentRevision === revision) setAllowed(allowed);
    }
    void check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      revision++; capability = undefined; setAllowed(false); setOpen(false);
      clearTimeout(refresh);
      // Leave the auth callback before issuing another authenticated request.
      refresh = setTimeout(() => { if (!cancelled) void check(); }, 0);
    });
    return () => { cancelled = true; clearTimeout(refresh); subscription.unsubscribe(); };
  }, []);
  if (!allowed) return null;
  return <><button className="flex min-h-10 items-center gap-2 text-sm font-semibold" onClick={() => setOpen(true)}><Plus size={18} />Add to Vault</button>
    {open && <SealedEditor variantId={variantId} name={name} close={() => { setOpen(false); onChanged?.(); }} />}</>;
}

export function OwnedSealedPanel({ ownerId, sectionId, wallOnly = false, onTotals }: {
  ownerId?: string; sectionId?: string; wallOnly?: boolean; onTotals?: (totals: SealedTotals | null) => void;
}) {
  const [rows, setRows] = useState<SealedCopy[]>([]), [offset, setOffset] = useState(0), [query, setQuery] = useState(''), [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [generation, setGeneration] = useState(0);
  const [self, setSelf] = useState(false), [selected, setSelected] = useState<Set<string>>(new Set()), [edit, setEdit] = useState<SealedCopy | null>(null);
  const [notice, setNotice] = useState(''); const totalsRef = useRef(onTotals);
  const [details, setDetails] = useState<SealedCopy | null>(null), [history, setHistory] = useState(false);
  const [lot, setLot] = useState<SealedCopy[] | null>(null);
  useEffect(() => { totalsRef.current = onTotals; }, [onTotals]);
  const reload = useCallback(() => setGeneration(n => n + 1), []);
  useEffect(() => {
    if (!sealedOwnershipEnabled) return;
    let cancelled = false;
    async function load() {
      setBusy(true); setError(''); setRows([]); setSelected(new Set()); setSelf(false);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Sign in first');
        const own = !ownerId || ownerId === user.id;
        const result = await rpc('get_owned_sealed_inventory_v1', { p_owner_id: ownerId ?? null, p_section_id: sectionId ?? null,
          p_wall_only: wallOnly, p_query: query, p_limit: 50, p_offset: offset });
        const parsed = (result as unknown[]).map(parseSealedCopy);
        if (cancelled) return;
        setRows(parsed); setSelected(new Set()); setSelf(own);
        if (own && totalsRef.current) {
          try { const totals = parseSealedTotals(await rpc('get_owned_sealed_totals_v1')); if (!cancelled) totalsRef.current(totals); }
          catch { if (!cancelled) totalsRef.current(null); }
        }
      } catch { if (!cancelled) { setError('Sealed inventory could not load. Your collection is unchanged.'); totalsRef.current?.(null); } }
      finally { if (!cancelled) setBusy(false); }
    }
    void load(); return () => { cancelled = true; };
  }, [ownerId, sectionId, wallOnly, query, offset, generation]);
  async function removeSelected() {
    if (!window.confirm(`Remove ${selected.size} sealed copies from your Vault and Wall? History will be retained.`)) return;
    setBusy(true); let removed = 0;
    for (const row of rows.filter(r => selected.has(r.instance_id))) {
      try { await dispose(row, 'remove'); removed++; } catch { break; }
    }
    setNotice(`${removed} of ${selected.size} copies removed`); reload();
  }
  if (!sealedOwnershipEnabled) return null;
  return <section aria-label="Owned sealed products" className="border-y border-current/15 py-4">
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <h2 className="mr-auto text-lg font-semibold">Sealed products</h2>
      {self && <button className={icon} title="Sealed history" aria-label="Sealed history" onClick={() => setHistory(true)}><History size={18} /></button>}
      {selected.size >= 2 && <button className={icon} title="Share selected lot" aria-label="Share selected lot" disabled={busy || selected.size > 12} onClick={() => setLot(rows.filter(r => selected.has(r.instance_id)))}><Share2 size={18} /></button>}
      {selected.size > 0 && <button className={icon} title="Remove selected copies" aria-label="Remove selected copies" disabled={busy} onClick={removeSelected}><Trash2 size={18} /></button>}
      <button className={icon} title="Refresh sealed inventory" aria-label="Refresh sealed inventory" disabled={busy} onClick={reload}><RefreshCw size={18} /></button>
    </div>
    <form className="mb-3 flex max-w-lg gap-2" onSubmit={e => { e.preventDefault(); setOffset(0); setQuery(draft); }}>
      <input type="search" aria-label="Search owned sealed products" placeholder="Search sealed products" maxLength={100} value={draft} onChange={e => setDraft(e.target.value)} className={control} />
      <button className={icon} title="Search" aria-label="Search"><Search size={18} /></button>
    </form>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {busy && <p role="status">Loading...</p>}
    {!busy && !error && rows.length === 0 && <p className="py-4 text-sm">No sealed products match.</p>}
    <div className="divide-y divide-current/10">{rows.map(row => <article key={row.instance_id} className="flex items-start gap-3 py-3">
      {self && <input type="checkbox" className="mt-4 h-5 w-5" aria-label={`Select ${row.name} ${row.gv_vi_id}`} disabled={busy}
        checked={selected.has(row.instance_id)} onChange={e => setSelected(previous => { const next = new Set(previous); if (e.target.checked) next.add(row.instance_id); else next.delete(row.instance_id); return next; })} />}
      <SealedOwnedImage row={row} />
      <div className="min-w-0 flex-1">
        <Link href={`/gvvi/${encodeURIComponent(row.gv_vi_id)}`} className="font-semibold">{sealedIdentity(row)}</Link>
        <p className="text-xs opacity-70">{row.seal_state.replaceAll('_', ' ')} / {row.package_condition}</p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm"><span>Market: {money(row.owned_market_price, row.market_currency)}</span>
          <span>My price: {money(row.asking_price_amount, row.asking_price_currency)}</span></div>
        {row.owned_market_price == null && row.reference_market_price != null && <p className="text-xs opacity-70">Factory-sealed reference: {money(row.reference_market_price, row.market_currency)}</p>}
        <div className="flex flex-wrap gap-2">{self && <><button className={icon} title="Manage copy" aria-label={`Manage ${row.name}`} disabled={busy} onClick={() => setEdit(row)}><Edit size={18} /></button>
          <AddSealedButton variantId={row.sealed_product_variant_id} name={row.name} onChanged={reload} />
          <button className={icon} title="Photos and private notes" aria-label={`Photos and notes for ${row.name}`} disabled={busy} onClick={() => setDetails(row)}><Camera size={18} /></button></>}
          <button className={icon} title="Share copy" aria-label={`Share ${row.name}`} onClick={async () => {
            const url = `${window.location.origin}/gvvi/${encodeURIComponent(row.gv_vi_id)}`;
            try { if (navigator.share) await navigator.share({ title: row.name, text: sealedIdentity(row), url }); else { await navigator.clipboard.writeText(url); setNotice('Copy link copied. Visibility follows your profile and Wall settings.'); } }
            catch { setNotice('Sharing was cancelled or unavailable.'); }
          }}><Share2 size={18} /></button></div>
      </div>
    </article>)}</div>
    <nav aria-label="Sealed inventory pages" className="flex items-center justify-center gap-3">
      <button className={icon} aria-label="Previous page" disabled={busy || offset === 0} onClick={() => setOffset(n => n - 50)}><ChevronLeft size={20} /></button>
      <span>Page {offset / 50 + 1}</span><button className={icon} aria-label="Next page" disabled={busy || rows.length < 50} onClick={() => setOffset(n => n + 50)}><ChevronRight size={20} /></button>
    </nav>
    {edit && <SealedEditor copy={edit} name={edit.name} close={() => { setEdit(null); reload(); }} />}
    {details && <SealedDetailsDialog row={details} close={() => { setDetails(null); reload(); }} />}
    {history && <SealedHistoryDialog close={() => setHistory(false)} />}
    {lot && <SealedLotDialog selected={lot} close={() => setLot(null)} />}
  </section>;
}

let imageActive = 0;
const imageWaiters: (() => void)[] = [];
async function signImage(row: SealedCopy) {
  if (imageActive >= 6) await new Promise<void>(resolve => imageWaiters.push(resolve)); else imageActive++;
  try { return await supabase.functions.invoke(`${row.game_key === 'pokemon' ? 'pokemon' : 'mtg'}-sealed-sign-image-v1`, {
    body: { storage_bucket: row.image_storage_bucket, object_path: row.image_object_path },
  }); } finally { const next = imageWaiters.shift(); if (next) next(); else imageActive--; }
}
export function SealedOwnedImage({ row }: { row: SealedCopy }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!row.image_object_path || !row.image_storage_bucket || !['pokemon', 'mtg'].includes(row.game_key)) return;
    void signImage(row).then(({ data, error }) => { if (!cancelled && !error && data?.expires_in === 3600 && typeof data.signed_url === 'string') setUrl(data.signed_url); }).catch(() => {});
    return () => { cancelled = true; };
  }, [row]);
  return <div className="flex h-24 w-20 shrink-0 items-center justify-center">{url
    // Signed private URLs are already resized product evidence, never persisted.
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url} alt={row.name} className="h-full w-full object-contain" onError={() => setUrl(null)} /> : <Package size={28} aria-label="Product image unavailable" />}</div>;
}

function SealedEditor({ copy, variantId, name, close }: { copy?: SealedCopy; variantId?: string; name: string; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), [busy, setBusy] = useState(false), [attempted, setAttempted] = useState(false), [error, setError] = useState('');
  const [mode, setMode] = useState(copy ? 'settings' : 'add'), [cashMode, setCashMode] = useState('none');
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]), [memberships, setMemberships] = useState(new Set(copy?.section_ids));
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    if (!copy) return;
    let cancelled = false;
    void supabase.from('wall_sections').select('id,name').eq('user_id', copy.owner_id).eq('is_active', true).order('position')
      .then(({ data, error }) => { if (!cancelled) { if (error) setError('Wall sections could not load.'); else setSections(data ?? []); } });
    return () => { cancelled = true; };
  }, [copy]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? '').trim();
    const params = { seal: get('seal'), condition: get('condition'), currency: get('currency') };
    setBusy(true); setError('');
    if (mode !== 'settings') setAttempted(true);
    try {
      if (mode === 'add' && variantId) {
        const quantity = Number(get('quantity'));
        await mutation('vault_add_sealed_copies_v1', { p_variant_id: variantId, p_quantity: quantity,
          p_seal_state: params.seal, p_package_condition: params.condition, p_acquisition_cost: get('cost') || null,
          p_acquisition_currency: get('cost') ? params.currency : null }, result => verifySealedAddition(rpc, result, variantId, quantity));
      } else if (copy && mode === 'settings') {
        await rpc('vault_update_sealed_copy_v1', { p_instance_id: copy.instance_id, p_seal_state: params.seal,
          p_package_condition: params.condition, p_intent: get('intent'), p_asking_price: get('asking') || null,
          p_asking_currency: get('asking') ? params.currency : null });
        const read = await rpc('get_owned_sealed_copies_v1', { p_instance_ids: [copy.instance_id] });
        if (read.length !== 1 || read[0].seal_state !== params.seal || read[0].package_condition !== params.condition ||
          read[0].intent !== get('intent') || read[0].asking_price_amount !== (get('asking') ? Number(get('asking')) : null) ||
          read[0].asking_price_currency !== (get('asking') ? params.currency : null)) throw new Error('Readback mismatch');
      } else if (copy) {
        await dispose(copy, mode, {
          ...(mode === 'sale' ? { p_sale_price: get('sale'), p_sale_currency: params.currency } : {}),
          ...(mode !== 'remove' && get('counterparty') ? { p_counterparty: get('counterparty') } : {}),
          ...(mode === 'trade' ? { p_trade_received: get('received'), ...(cashMode !== 'none' ? {
            p_cash_direction: cashMode, p_cash_amount: get('cash'), p_cash_currency: params.currency } : {}) } : {}),
        });
      } else throw new Error('Missing exact identity');
      close();
    } catch { setError('Could not confirm the change. Retry this same request to confirm.'); }
    finally { setBusy(false); }
  }
  const select = (label: string, key: string, options: string[], value: string) => <label className="block text-sm">{label}<select aria-label={label} name={key} className={control} defaultValue={value}>{options.map(v => <option key={v} value={v}>{v.replaceAll('_', ' ')}</option>)}</select></label>;
  const amount = (label: string, key: string, required = false, initial = '', min = '0') => <label className="block text-sm">{label}<input aria-label={label} className={control} name={key} type="number" min={min} max="9999999999.99" step="0.01" required={required} defaultValue={initial} /></label>;
  return <dialog ref={dialog} onCancel={e => { if (busy) e.preventDefault(); else close(); }} className="m-auto max-h-[90dvh] w-[min(95vw,480px)] overflow-auto rounded-lg bg-white p-5 text-slate-950 backdrop:bg-black/50 dark:bg-zinc-950 dark:text-white">
    <div className="mb-4 flex items-start gap-3"><h2 className="min-w-0 flex-1 text-lg font-semibold">{name}</h2><button className={icon} disabled={busy} onClick={close} aria-label="Close"><X size={20} /></button></div>
    <form onSubmit={submit} className="space-y-3">
      {/* Keep fields successful form controls on retry; inert prevents changes without omitting FormData. */}
      <div inert={busy || attempted} className="space-y-3">
        {copy && <label className="block text-sm">Action<select className={control} value={mode} onChange={e => setMode(e.target.value)}>{['settings', 'sale', 'trade', 'remove'].map(v => <option key={v}>{v}</option>)}</select></label>}
        {mode === 'add' && <label className="block text-sm">Copies<input name="quantity" className={control} type="number" min={1} max={100} defaultValue={1} required /></label>}
        {(mode === 'add' || mode === 'settings') && <>
          {select('Seal', 'seal', ['unknown', 'factory_sealed', 'opened'], copy?.seal_state ?? 'unknown')}
          {select('Package condition', 'condition', ['unknown', 'undamaged', 'damaged'], copy?.package_condition ?? 'unknown')}
          {mode === 'add' ? amount('Cost per copy (optional)', 'cost') : <>{select('Visibility / intent', 'intent', ['hold', 'showcase', 'sell', 'trade'], copy?.intent ?? 'hold')}{amount('My price (optional)', 'asking', false, copy?.asking_price_amount?.toString() ?? '')}</>}
        </>}
        {mode === 'sale' && amount('Sold price', 'sale', true, '', '0.01')}
        {(mode === 'sale' || mode === 'trade') && <label className="block text-sm">To whom (optional)<input name="counterparty" maxLength={120} className={control} /></label>}
        {mode === 'trade' && <><label className="block text-sm">Received in trade<textarea name="received" maxLength={1000} required className={control} /></label>
          <label className="block text-sm">Cash<select className={control} value={cashMode} onChange={e => setCashMode(e.target.value)}>{['none', 'received', 'paid'].map(v => <option key={v}>{v}</option>)}</select></label>
          {cashMode !== 'none' && amount('Cash amount', 'cash', true, '', '0.01')}</>}
        {mode !== 'remove' && select('Currency', 'currency', [...new Set(['USD', 'CAD', 'EUR', 'GBP', 'JPY', copy?.asking_price_currency ?? 'USD'])], copy?.asking_price_currency ?? 'USD')}
      </div>
      {['sale', 'trade', 'remove'].includes(mode) && <p className="text-sm">This copy leaves your active Vault and Wall. History is retained.</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={busy} className="min-h-11 rounded-md bg-emerald-700 px-5 font-semibold text-white disabled:opacity-50">{busy ? 'Confirming...' : attempted ? 'Retry' : mode === 'add' ? 'Add to Vault' : mode === 'settings' ? 'Save' : 'Confirm'}</button>
    </form>
    {copy && mode === 'settings' && <fieldset disabled={busy} className="mt-5 border-t border-current/15 pt-3"><legend>Wall sections</legend>
      {sections.map(section => <label key={section.id} className="flex min-h-10 items-center gap-3"><input type="checkbox" checked={memberships.has(section.id)} onChange={async e => {
        const add = e.target.checked; setBusy(true); setError('');
        try {
          await rpc('vault_set_copy_section_memberships_v1', { p_instance_ids: [copy.instance_id], p_section_id: section.id, p_add: add });
          const rows = await rpc('get_owned_sealed_copies_v1', { p_instance_ids: [copy.instance_id] });
          if (rows.length !== 1 || rows[0].section_ids.includes(section.id) !== add) throw new Error('Section readback mismatch');
          setMemberships(new Set(rows[0].section_ids));
        } catch { setError('Section change could not be confirmed.'); } finally { setBusy(false); }
      }} />{section.name}</label>)}
      {sections.length === 0 && <Link href="/wall">Create a Wall section</Link>}
    </fieldset>}
  </dialog>;
}

export { combineUsdTotal };
