"use client";

import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { parseSealedCopy, type SealedCopy } from '@/lib/sealed/ownedSealedV1';

const control = 'min-h-10 w-full rounded-md border border-current/25 bg-transparent px-3 py-2 text-sm';
const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 disabled:opacity-40';

export async function sealedPersonalImage(row: SealedCopy, back = false): Promise<string | null> {
  const path = back ? row.personal_back_image_url : row.personal_image_url;
  if (path !== `${row.owner_id}/vault-instances/${row.instance_id}/${back ? 'back' : 'front'}/current`) return null;
  const { data, error } = await supabase.storage.from('user-card-images').createSignedUrl(path, 3600);
  return !error ? data?.signedUrl ?? null : null;
}

export function SealedPersonalPhotos({ row }: { row: SealedCopy }) {
  const [photos, setPhotos] = useState<(string | null)[]>([]);
  useEffect(() => {
    let cancelled = false; setPhotos([]);
    void Promise.all([sealedPersonalImage(row), sealedPersonalImage(row, true)])
      .then(values => { if (!cancelled) setPhotos(values); }).catch(() => {});
    return () => { cancelled = true; };
  }, [row]);
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{photos.map((url, i) => url && <figure key={i}>
    <a href={url} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`${row.name} - owner ${i ? 'back' : 'front'} photo`} className="h-64 w-full object-contain" />
    </a><figcaption className="text-sm">{i ? 'Back' : 'Front'} photo</figcaption>
  </figure>)}</div>;
}

export function SealedDetailsDialog({ row, close }: { row: SealedCopy; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [notes, setNotes] = useState(row.notes ?? ''), [show, setShow] = useState(row.show_personal_photos === true);
  const [front, setFront] = useState<File | null>(null), [back, setBack] = useState<File | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function upload(file: File | null, side: string, previous: string | null | undefined) {
    if (!file) return previous ?? null;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Unsupported image');
    const decoded = await createImageBitmap(file); decoded.close();
    const path = `${row.owner_id}/vault-instances/${row.instance_id}/${side}/current`;
    const { error } = await supabase.storage.from('user-card-images').upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return path;
  }
  async function save() {
    setBusy(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id !== row.owner_id) throw new Error('Account changed');
      const frontPath = await upload(front, 'front', row.personal_image_url);
      const backPath = await upload(back, 'back', row.personal_back_image_url);
      const { error } = await supabase.rpc('vault_save_sealed_details_v1', {
        p_instance_id: row.instance_id, p_notes: notes.trim() || null,
        p_front_path: frontPath, p_back_path: backPath, p_show_photos: show,
      });
      if (error) throw error;
      const result = await supabase.rpc('get_owned_sealed_copies_v1', { p_instance_ids: [row.instance_id] });
      if (result.error || result.data?.length !== 1) throw new Error('Readback unavailable');
      const saved = parseSealedCopy(result.data[0]);
      if ((saved.notes ?? '') !== notes.trim() || saved.personal_image_url !== frontPath ||
        saved.personal_back_image_url !== backPath || saved.show_personal_photos !== show) throw new Error('Readback mismatch');
      close();
    } catch { setError('Could not confirm the details. Use JPG, PNG or WebP photos up to 10 MB, then retry.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} onCancel={e => { if (busy) e.preventDefault(); else close(); }} className="m-auto max-h-[90dvh] w-[min(95vw,520px)] overflow-auto rounded-lg bg-white p-5 text-zinc-950 backdrop:bg-black/50 dark:bg-zinc-950 dark:text-white">
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Photos and private notes</h2><button className={button} aria-label="Close" disabled={busy} onClick={close}><X size={20} /></button></div>
    <p className="mb-4 font-medium">{row.name}</p><SealedPersonalPhotos row={row} />
    <fieldset disabled={busy} className="space-y-4">
      <label className="block text-sm">Front photo<input type="file" accept="image/jpeg,image/png,image/webp" className={control} onChange={e => setFront(e.target.files?.[0] ?? null)} /></label>
      <label className="block text-sm">Back photo<input type="file" accept="image/jpeg,image/png,image/webp" className={control} onChange={e => setBack(e.target.files?.[0] ?? null)} /></label>
      <label className="flex min-h-10 items-center gap-3 text-sm"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} />Show uploaded photos on shared copy</label>
      <label className="block text-sm">Private notes<textarea className={control} maxLength={2000} rows={4} value={notes} onChange={e => setNotes(e.target.value)} /></label>
    </fieldset>
    {error && <p role="alert" className="my-3 text-sm">{error}</p>}
    <button className={`${button} mt-4 bg-emerald-700 text-white`} disabled={busy} onClick={save}><Camera size={18} />{busy ? 'Confirming...' : 'Save details'}</button>
  </dialog>;
}

export function SealedHistoryDialog({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]), [error, setError] = useState(''), [busy, setBusy] = useState(true);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    let cancelled = false; setBusy(true); setError(''); setRows([]);
    void supabase.rpc('get_sealed_ownership_history_v1', { p_limit: 50, p_offset: offset }).then(({ data, error }) => {
      if (cancelled) return; if (error) setError('History could not load.'); else setRows(data ?? []); setBusy(false);
    });
    return () => { cancelled = true; };
  }, [offset]);
  return <dialog ref={dialog} onCancel={close} className="m-auto max-h-[90dvh] w-[min(95vw,640px)] overflow-auto rounded-lg bg-white p-5 text-zinc-950 backdrop:bg-black/50 dark:bg-zinc-950 dark:text-white">
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Sealed history</h2><button className={button} aria-label="Close" onClick={close}><X size={20} /></button></div>
    {busy && <p role="status">Loading...</p>}{error && <p role="alert">{error}</p>}
    {!busy && !error && rows.length === 0 && <p className="py-5">No archived sealed copies.</p>}
    {rows.map(row => <article key={String(row.instance_id)} className="space-y-1 border-b border-current/15 py-4 text-sm">
      <h3 className="font-semibold">{String(row.name)}</h3><p>{String(row.package_form)} - {String(row.language_code).toUpperCase()}</p>
      <p>{String(row.operation)} - {String(row.archived_at)}</p><p className="text-xs">{String(row.gv_vi_id)}</p>
      {row.sale_price_amount != null && <p>Sold: {String(row.sale_price_currency)} {String(row.sale_price_amount)}</p>}
      {row.counterparty != null && <p>To: {String(row.counterparty)}</p>}
      {row.trade_received != null && <p>Received: {String(row.trade_received)}</p>}
      {row.cash_amount != null && <p>Cash {String(row.cash_direction)}: {String(row.cash_currency)} {String(row.cash_amount)}</p>}
    </article>)}
    <nav className="flex items-center justify-center gap-3 pt-4"><button className={button} aria-label="Previous history page" disabled={busy || offset === 0} onClick={() => setOffset(n => n - 50)}><ChevronLeft size={20} /></button><span>Page {offset / 50 + 1}</span><button className={button} aria-label="Next history page" disabled={busy || rows.length < 50} onClick={() => setOffset(n => n + 50)}><ChevronRight size={20} /></button></nav>
  </dialog>;
}
