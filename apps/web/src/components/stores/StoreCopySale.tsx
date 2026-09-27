"use client";
/* eslint-disable @next/next/no-img-element -- Reuse the owner's authorized copy thumbnail. */
import { useEffect, useId, useRef, useState } from "react";
import { recordVaultDispositionAction } from "@/lib/vault/recordVaultDispositionAction";
import type { DispositionInput, DispositionReceipt } from "@/lib/vault/vaultDisposition";
import type { StoreItem } from "@/lib/stores/storefrontTypes";
import s from "./StoreManager.module.css";

export default function StoreCopySale({ item, close, recorded, setDirty }: {
  item: StoreItem; close: () => void; recorded: () => Promise<void>; setDirty: (value: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null), lock = useRef(false);
  const heading = useId();
  const [price, setPrice] = useState(""), [buyer, setBuyer] = useState("");
  const [review, setReview] = useState<DispositionInput | null>(null);
  const [receipt, setReceipt] = useState<DispositionReceipt | null>(null);
  const [busy, setBusy] = useState(false), [attempted, setAttempted] = useState(false);
  const [error, setError] = useState(""), [refreshFailed, setRefreshFailed] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  function dismiss() {
    if (lock.current) return;
    if (!receipt && (price || buyer) && !window.confirm(attempted
      ? "Close this confirmation? Check transaction history before recording another sale for this copy."
      : "Discard these sale details?")) return;
    setDirty(false); close();
  }
  async function confirm() {
    if (lock.current || !review || receipt) return;
    lock.current = true; setBusy(true); setAttempted(true); setError("");
    try {
      const result = await recordVaultDispositionAction(review);
      if (!result.ok) { setError(result.message); return; }
      setReceipt(result.receipt); setDirty(false);
      // A failed inventory refresh must never turn a confirmed sale into a retry.
      try { await recorded(); } catch { setRefreshFailed(true); }
    } catch {
      setError("The sale could not be confirmed. Check transaction history or retry confirmation with these same details.");
    } finally { lock.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby={heading} className={s.saleDialog} onCancel={event => { event.preventDefault(); dismiss(); }}>
    <div className={s.stack}>
      <div className={s.row}><h2 id={heading}>{receipt ? "Sale recorded" : "Mark sold"}</h2><button type="button" disabled={busy} onClick={dismiss} aria-label="Close sale">Close</button></div>
      <div className={s.saleCopy}>{item.display_image_url && <img src={item.display_image_url} alt={item.display_name || item.name} />}<div><h3>{item.display_name || item.name}</h3><p className={s.muted}>{item.gv_vi_id}</p><p className={s.muted}>{item.condition_label} · {item.finish_label || "Finish unassigned"}</p></div></div>
      {receipt ? <>
        <p role="status">This copy is sold and removed from your active Vault and storefront.</p>
        <p>Recorded sale: {receipt.saleCurrency} {receipt.salePrice?.toFixed(2)}</p>
        {receipt.counterparty && <p>Buyer: {receipt.counterparty}</p>}
        {refreshFailed && <p role="alert">Your sale is saved. The inventory refresh failed; use Refresh inventory after closing this window.</p>}
        <button type="button" className={s.primary} disabled={busy} onClick={dismiss}>Done</button>
      </> : <>
        <p className={s.muted}>Record a sale completed outside Grookai, such as at a show or in your shop. This does not charge the buyer.</p>
        {!review ? <form onSubmit={event => {
          event.preventDefault(); setError("");
          setReview({ instanceId: item.id, type: "sale", salePrice: price.trim(), counterparty: buyer.trim(), tradeReceived: "", cashDirection: "none", cashAmount: "" });
        }}><fieldset className={s.stack} disabled={busy}>
          <label>Actual sale price (USD)<input type="number" inputMode="decimal" min="0.01" max="99999999" step="0.01" required value={price} onChange={event => { setPrice(event.target.value); setDirty(true); }} /></label>
          <p className={s.muted}>Enter what you received. Your asking price is not used automatically.</p>
          <label>Buyer (optional)<input maxLength={120} autoComplete="off" value={buyer} onChange={event => { setBuyer(event.target.value); setDirty(true); }} /></label>
          <button type="submit" className={s.primary}>Review sale</button>
        </fieldset></form> : <>
          <h3>Confirm sale</h3><p>Actual sale price: USD {Number(review.salePrice).toFixed(2)}</p>
          {review.counterparty && <p>Buyer: {review.counterparty}</p>}
          <p>This archives only {item.gv_vi_id} and removes its public offers. Your private receipt cannot be edited.</p>
          <div className={s.actions}><button type="button" className={s.primary} disabled={busy} onClick={() => void confirm()}>{busy ? "Recording…" : attempted ? "Retry confirmation" : "Confirm sold"}</button>{!attempted && <button type="button" disabled={busy} onClick={() => setReview(null)}>Back to details</button>}</div>
        </>}
      </>}
      {error && <p role="alert" className={s.error}>{error}</p>}
      <a href="/vault/transactions" target="_blank" rel="noopener noreferrer" className={s.linkButton}>View transaction history ↗</a>
    </div>
  </dialog>;
}
