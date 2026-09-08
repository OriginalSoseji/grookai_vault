"use client";
import { useEffect, useRef, useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { parseSealedCopy, sealedIdentity, type SealedCopy } from '@/lib/sealed/ownedSealedV1';
import { sealedPersonalImage } from './SealedCopyDetails';

async function productImage(row: SealedCopy): Promise<string | null> {
  const personal = await sealedPersonalImage(row);
  if (personal) return personal;
  if (!row.image_object_path || !['pokemon', 'mtg'].includes(row.game_key)) return null;
  const { data, error } = await supabase.functions.invoke(`${row.game_key === 'pokemon' ? 'pokemon' : 'mtg'}-sealed-sign-image-v1`, {
    body: { storage_bucket: row.image_storage_bucket, object_path: row.image_object_path },
  });
  return !error && data?.expires_in === 3600 ? data.signed_url ?? null : null;
}
async function image(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return null;
  const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url;
  await img.decode(); return img;
}
function lines(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const result: string[] = []; let line = '';
  for (const word of text.split(/\s+/)) {
    if (ctx.measureText(word).width > width) {
      if (line) { result.push(line); line = ''; }
      let part = '';
      for (const ch of word) { if (ctx.measureText(part + ch).width > width) { result.push(part); part = ch; } else part += ch; }
      line = part;
    } else if (line && ctx.measureText(`${line} ${word}`).width > width) { result.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) result.push(line); return result;
}
async function render(rows: SealedCopy[], photos: (HTMLImageElement | null)[], back: boolean): Promise<Blob> {
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image renderer unavailable');
  const columns = rows.length <= 4 ? 2 : 3, width = 360, gap = 24, margin = 32;
  canvas.width = columns * width + (columns - 1) * gap + margin * 2;
  ctx.font = '22px Arial';
  const labels = rows.map(row => lines(ctx, sealedIdentity(row), width - 28));
  const height = 390 + Math.max(...labels.map(l => l.length)) * 27 + (back ? 95 : 0);
  canvas.height = 100 + Math.ceil(rows.length / columns) * (height + gap) + margin;
  ctx.fillStyle = '#101414'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px Arial'; ctx.fillText(`Grookai Vault - ${rows.length} sealed products`, margin, 52);
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index], rowStart = Math.floor(index / columns) * columns;
    const inRow = Math.min(columns, rows.length - rowStart);
    const x = (canvas.width - (inRow * width + (inRow - 1) * gap)) / 2 + index % columns * (width + gap);
    const y = 94 + Math.floor(index / columns) * (height + gap);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, width, height);
    const img = photos[index];
    if (img) {
      const scale = Math.min((width - 28) / img.naturalWidth, 280 / img.naturalHeight);
      ctx.drawImage(img, x + (width - img.naturalWidth * scale) / 2, y + 12 + (280 - img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
    } else { ctx.fillStyle = '#536061'; ctx.font = '20px Arial'; ctx.fillText(back ? 'No back photo' : 'Image unavailable', x + 28, y + 140); }
    let textY = y + 320;
    ctx.fillStyle = '#111818'; ctx.font = '22px Arial';
    for (const label of labels[index]) { ctx.fillText(label, x + 14, textY); textY += 27; }
    ctx.font = '18px Arial';
    ctx.fillText(`${row.seal_state.replaceAll('_', ' ')} / ${row.package_condition}`, x + 14, textY + 5);
    ctx.fillText(row.asking_price_amount == null ? 'Ask for price' : `My price: ${row.asking_price_currency} ${row.asking_price_amount.toFixed(2)}`, x + 14, textY + 32);
    if (back) {
      ctx.fillText(row.owned_market_price == null ? 'Market: unpriced' : `Market: ${row.market_currency} ${row.owned_market_price.toFixed(2)}`, x + 14, textY + 59);
      ctx.font = '16px Arial'; ctx.fillText(row.gv_vi_id, x + 14, textY + 88);
    }
  }
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image generation failed')), 'image/png'));
}

export function SealedLotDialog({ selected, close }: { selected: SealedCopy[]; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), urls = useRef<string[]>([]);
  const [files, setFiles] = useState<File[]>([]), [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); return () => { urls.current.forEach(URL.revokeObjectURL); }; }, []);
  async function generate() {
    setBusy(true); setError(''); setFiles([]); setPreviews([]);
    try {
      if (selected.length < 2 || selected.length > 12 || new Set(selected.map(r => r.instance_id)).size !== selected.length) throw new Error('Choose 2 to 12 exact copies.');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || selected.some(r => r.owner_id !== user.id)) throw new Error('These copies must belong to you.');
      const { data, error } = await supabase.rpc('get_owned_sealed_copies_v1', { p_instance_ids: selected.map(r => r.instance_id), p_limit: 50 });
      if (error) throw error;
      const fresh = (data as unknown[]).map(parseSealedCopy);
      if (fresh.length !== selected.length || new Set(fresh.map(r => r.instance_id)).size !== selected.length) throw new Error('Your selection changed. Refresh your Vault.');
      const rows = selected.map(row => {
        const found = fresh.find(r => r.instance_id === row.instance_id && r.sealed_product_variant_id === row.sealed_product_variant_id);
        if (!found) throw new Error('Copy identity changed.'); return found;
      });
      const currencies = new Set(rows.filter(r => r.asking_price_amount != null).map(r => r.asking_price_currency));
      if (currencies.size > 1) throw new Error('Share different asking-price currencies in separate lots.');
      const front: (HTMLImageElement | null)[] = [], back: (HTMLImageElement | null)[] = [];
      for (const row of rows) { front.push(await image(await productImage(row))); back.push(await image(await sealedPersonalImage(row, true))); }
      const blobs = [await render(rows, front, false), await render(rows, back, true)];
      urls.current.forEach(URL.revokeObjectURL); urls.current = blobs.map(blob => URL.createObjectURL(blob));
      setPreviews([...urls.current]); setFiles(blobs.map((blob, i) => new File([blob], `grookai-sealed-lot-${i ? 'back' : 'front'}.png`, { type: 'image/png' })));
    } catch (e) { setError(e instanceof Error ? e.message : 'Both lot images could not be generated. Retry to confirm.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} onCancel={e => { if (busy) e.preventDefault(); else close(); }} className="m-auto max-h-[90dvh] w-[min(95vw,900px)] overflow-auto rounded-lg bg-white p-5 text-zinc-950 backdrop:bg-black/50 dark:bg-zinc-950 dark:text-white">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Share {selected.length} sealed copies</h2><button className="h-11 w-11" aria-label="Close" disabled={busy} onClick={close}><X size={20} /></button></div>
    <p className="py-3 text-sm">Includes your selected front and back photos. Private notes are never included.</p>
    <button className="min-h-11 rounded-md bg-emerald-700 px-4 text-white disabled:opacity-40" disabled={busy} onClick={generate}>{busy ? 'Preparing both images...' : 'Generate lot images'}</button>
    {error && <p role="alert" className="py-3">{error}</p>}
    <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">{previews.map((url, i) => <figure key={url}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`Sealed lot ${i ? 'back' : 'front'}`} className="w-full" /><a className="flex min-h-11 items-center gap-2" href={url} download={files[i]?.name}><Download size={18} />Download {i ? 'back' : 'front'}</a>
    </figure>)}</div>
    {files.length === 2 && <button className="flex min-h-11 items-center gap-2" onClick={async () => {
      try { if (!navigator.canShare?.({ files })) { setError('Use the two download buttons to save both images.'); return; }
        await navigator.share({ files, title: 'Grookai sealed lot', text: selected.map(row => `${sealedIdentity(row)}\n${window.location.origin}/gvvi/${encodeURIComponent(row.gv_vi_id)}`).join('\n\n') });
      } catch { setError('Sharing was cancelled or unavailable. Both images remain available to download.'); }
    }}><Share2 size={18} />Share both images</button>}
  </dialog>;
}
