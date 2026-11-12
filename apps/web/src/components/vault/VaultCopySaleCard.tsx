"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveVaultItemInstancePricingAction } from "@/lib/vault/saveVaultItemInstancePricingAction";

export default function VaultCopySaleCard({ instanceId, intent, amount, currency, qrHref }: {
  instanceId: string; intent: string; amount: number | null; currency: string | null;
  qrHref: string | null;
}) {
  const router = useRouter();
  const priceId = useId();
  const [price, setPrice] = useState(currency === "USD" && amount !== null ? amount.toFixed(2) : "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const priceInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const listed = intent === "sell";
  useEffect(() => { if (!submitting.current) setPrice(currency === "USD" && amount !== null ? amount.toFixed(2) : ""); }, [amount, currency]);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(price.trim()) || Number(price) <= 0) {
      setError(true); setMessage("Enter a USD asking price greater than 0, with up to 2 decimal places.");
      priceInput.current?.focus(); return;
    }
    submitting.current = true; setError(false); setMessage(null);
    startTransition(async () => {
      try {
        const result = await saveVaultItemInstancePricingAction({
          instanceId, pricingMode: "asking", askingPriceAmount: price.trim(),
          askingPriceCurrency: "USD", publishForSale: true,
        });
        if (!result.ok) { setError(true); setMessage(result.message); return; }
        setMessage(result.squareStatus === "ready" ? "For sale saved. Ready to scan in Square."
          : result.squareStatus === "pending" ? "For sale saved. Square is still syncing. Wait for confirmation before checkout."
          : result.squareStatus === "review" ? "For sale saved. Square needs attention before checkout."
          : "For sale saved. Your profile and sharing settings still apply.");
        router.refresh();
      } catch {
        setError(true); setMessage("The save could not be confirmed. Reload this copy before retrying.");
      } finally { submitting.current = false; }
    });
  }

  return <section id="copy-sale" className="scroll-mt-24 space-y-3 border-y border-[var(--gv-border-soft)] py-5" aria-labelledby={`${priceId}-title`}>
    <h2 id={`${priceId}-title`} className="text-lg font-semibold">{listed ? "For sale" : "Sell this copy"}</h2>
    <p className="text-sm text-[var(--gv-text-secondary)]">Set a price to make this exact copy public and For sale. Connected Square accounts with automatic stock enabled sync it automatically.</p>
    <form onSubmit={save} className="flex flex-wrap items-end gap-3">
      <label htmlFor={priceId} className="grid gap-2 text-sm">Asking price · USD
        <input id={priceId} ref={priceInput} name="sale_price" type="text" inputMode="decimal" autoComplete="off"
          value={price} disabled={pending} onChange={event => { setPrice(event.target.value); setMessage(null); setError(false); }}
          aria-invalid={error} aria-describedby={message ? `${priceId}-status` : undefined}
          placeholder="0.00" className="min-h-11 w-40 rounded-lg border border-[var(--gv-border-soft)] bg-transparent px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current" />
      </label>
      <button type="submit" className="gv-primary-button" disabled={pending}>{pending ? "Saving and syncing…" : listed ? "Save sale price" : "Make public and For sale"}</button>
      {qrHref && <Link href={qrHref} className="gv-secondary-button">Show grookai QR</Link>}
    </form>
    {message && <p id={`${priceId}-status`} role={error ? "alert" : "status"} aria-live="polite" className="text-sm">{message}</p>}
    {!error && message?.includes("Square") && !message.includes("Ready to scan") && <Link href="/account/connections/square" className="gv-secondary-button">Check Square status</Link>}
  </section>;
}
