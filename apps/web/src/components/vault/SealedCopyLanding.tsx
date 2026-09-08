"use client";
import { useState } from 'react';
import QRCode from 'qrcode';
import { Printer, QrCode, Share2 } from 'lucide-react';
import { sealedIdentity, type SealedCopy } from '@/lib/sealed/ownedSealedV1';
import { SealedOwnedImage } from './OwnedSealedPanel';
import { SealedPersonalPhotos } from './SealedCopyDetails';

export function SealedCopyLanding({ row, owner }: { row: SealedCopy; owner: boolean }) {
  const [qr, setQr] = useState<string | null>(null), [message, setMessage] = useState('');
  const url = () => `${window.location.origin}/gvvi/${encodeURIComponent(row.gv_vi_id)}`;
  async function makeQr(print = false) {
    try { const data = await QRCode.toDataURL(url(), { width: 240, margin: 3, errorCorrectionLevel: 'M' });
      const ready = new Image(); ready.src = data; await ready.decode();
      setQr(data); if (print) { await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); window.print(); }
    } catch { setMessage('QR could not be prepared.'); }
  }
  return <section aria-label="Sealed copy" className="mx-auto max-w-3xl space-y-5 px-5 py-8">
    <style>{`@media print {
      body * { visibility: hidden !important; }
      #sealed-copy-print-label, #sealed-copy-print-label * { visibility: visible !important; }
      #sealed-copy-print-label { position: absolute; inset: 0 auto auto 0; width: 90mm; padding: 8mm;
        color: #000; background: #fff; break-inside: avoid; font-family: sans-serif; }
      #sealed-copy-print-label img { width: 45mm; height: 45mm; }
    }`}</style>
    {(row.image_object_path || !row.personal_image_url) && <div className="[&_div]:h-80 [&_div]:w-full"><SealedOwnedImage row={row} /></div>}
    <SealedPersonalPhotos row={row} />
    <h1 className="text-2xl font-bold">{row.name}</h1><p>{sealedIdentity(row)}</p>
    <p>{row.seal_state.replaceAll('_', ' ')} / {row.package_condition}</p>
    {row.asking_price_amount != null && <p className="text-xl font-semibold">Asking {row.asking_price_currency} {row.asking_price_amount.toFixed(2)}</p>}
    {row.reference_market_price != null && <p>Factory-sealed market reference: {row.market_currency} {row.reference_market_price.toFixed(2)}</p>}
    <div className="flex flex-wrap gap-3 print:hidden">
      <button className="flex min-h-11 items-center gap-2" onClick={async () => {
        try { if (navigator.share) await navigator.share({ title: row.name, text: sealedIdentity(row), url: url() });
          else { await navigator.clipboard.writeText(url()); setMessage('Link copied'); } }
        catch { setMessage('Sharing was cancelled or unavailable.'); }
      }}><Share2 size={18} />Share</button>
      {owner && <><button className="flex min-h-11 items-center gap-2" onClick={() => makeQr()}><QrCode size={18} />Show QR</button>
        <button className="flex min-h-11 items-center gap-2" onClick={() => makeQr(true)}><Printer size={18} />Print</button></>}
    </div>
    {owner && qr && <div id="sealed-copy-print-label">
      <p className="font-semibold">{row.name}</p><p className="text-sm">{sealedIdentity(row)}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} width={240} height={240} alt={`QR for ${row.name}`} /><p className="text-sm">{row.gv_vi_id}</p>
    </div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
