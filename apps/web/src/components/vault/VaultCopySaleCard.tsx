"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveVaultItemInstancePricingAction } from "@/lib/vault/saveVaultItemInstancePricingAction";
import {vendorPricingAction} from "@/lib/vendorPricing/actions";
import type {PricingWorkspace, PricingQuote} from "@/lib/vendorPricing/types";

const pricingSelection = (w: PricingWorkspace) => w.copy?.mode === "preset" ? w.copy.rule_id ?? "manual"
  : w.copy?.mode === "default" ? "default" : "manual";

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
  const [workspace, setWorkspace] = useState<PricingWorkspace | null>(null);
  const [mode, setMode] = useState("manual");
  const [quote, setQuote] = useState<PricingQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [conflict, setConflict] = useState(false);
  const priceInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const dirty = useRef(false);
  // Polling can refresh display data, but cannot grant a stale editor a new
  // write revision. Only an explicit load or a confirmed save moves this base.
  const editRevision = useRef<number | null>(null);
  const workspaceGeneration = useRef(0);
  const listed = intent === "sell";
  useEffect(() => { if (!submitting.current && !dirty.current) setPrice(currency === "USD" && amount !== null ? amount.toFixed(2) : ""); }, [amount, currency]);
  useEffect(() => {
    let alive = true;
    workspaceGeneration.current++;
    editRevision.current = null;
    void vendorPricingAction("workspace", {instanceId}).then(result => {
      if (!alive || !result.ok) return;
      const w = result.value; setWorkspace(w);
      editRevision.current = w.copy?.revision ?? 0;
      if (!dirty.current) setMode(pricingSelection(w));
    }).catch(() => {});
    return () => {alive = false;};
  }, [instanceId]);
  useEffect(() => {
    if (mode === "manual") {setQuote(null); setQuoting(false); return;}
    let alive = true;
    setQuoting(true);
    setQuote(null);
    void vendorPricingAction("preview", {instanceId, mode: mode === "default" ? "default" : "preset", ruleId: mode === "default" ? null : mode}).then(result => {
      if (alive) setQuote(result.ok ? result.value : {status: "waiting", reason: result.message});
    }).catch(() => {if (alive) setQuote({status: "waiting", reason: "Price preview is unavailable. Try again or choose My price."});})
      .finally(() => {if (alive) setQuoting(false);});
    return () => {alive = false;};
  }, [instanceId, mode, previewRevision, workspace?.enabled, workspace?.settings.revision,
    workspace?.copy?.resolved_minor, workspace?.copy?.revision]);
  useEffect(() => {
    if (!workspace) return;
    let alive = true;
    let checking = false;
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible" || submitting.current || checking) return;
      const generation = workspaceGeneration.current;
      checking = true;
      void vendorPricingAction("workspace", {instanceId}).then(result => {
        if (!alive || !result.ok || submitting.current || generation !== workspaceGeneration.current) return;
        const current = result.value.copy;
        setWorkspace(result.value);
        setPreviewRevision(value => value + 1);
        if (editRevision.current !== null && (current?.revision ?? 0) !== editRevision.current) {
          if (dirty.current) {
            setConflict(true); setError(true);
            setMessage("This copy's pricing changed in another view. Reload the latest price before saving your edits.");
          } else {
            editRevision.current = current?.revision ?? 0;
            setMode(pricingSelection(result.value));
            setError(false); setMessage("Pricing updated in another view. Check Square status before checkout.");
          }
        }
        if (current?.resolved_minor !== workspace.copy?.resolved_minor || current?.revision !== workspace.copy?.revision) {
          if (!dirty.current && current?.mode !== "manual" && current?.resolved_minor !== workspace.copy?.resolved_minor) setMessage("Asking price updated. Check Square status before checkout.");
          router.refresh();
        }
      }).catch(() => {}).finally(() => {checking = false;});
    }, 15000);
    return () => {alive = false; clearInterval(timer);};
  }, [instanceId, router, workspace]);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || conflict) return;
    if (mode === "manual" && (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(price.trim()) || Number(price) <= 0)) {
      setError(true); setMessage("Enter a USD asking price greater than 0, with up to 2 decimal places.");
      priceInput.current?.focus(); return;
    }
    submitting.current = true; workspaceGeneration.current++; setError(false); setMessage(null);
    startTransition(async () => {
      try {
        const result = mode !== "manual" ? await vendorPricingAction("apply", {
          requestId: crypto.randomUUID(), instanceId, mode: mode === "default" ? "default" : "preset",
          ruleId: mode === "default" ? null : mode, expectedRevision: editRevision.current ?? 0, publish: true,
        }) : await saveVaultItemInstancePricingAction({
          instanceId, pricingMode: "asking", askingPriceAmount: price.trim(),
          askingPriceCurrency: "USD", publishForSale: true,
        });
        if (!result.ok) { setError(true); setMessage(result.message); return; }
        setMessage(result.squareStatus === "ready" ? "For sale saved. Ready to scan in Square."
          : result.squareStatus === "pending" ? "For sale saved. Square is still syncing. Wait for confirmation before checkout."
          : result.squareStatus === "review" ? "For sale saved. Square needs attention before checkout."
          : "For sale saved. Your profile and sharing settings still apply.");
        dirty.current = false;
        const fresh = await vendorPricingAction("workspace", {instanceId}).catch(() => null);
        if (fresh?.ok) {setWorkspace(fresh.value); editRevision.current = fresh.value.copy?.revision ?? 0;}
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
      {workspace && <label className="grid gap-2 text-sm">Pricing<select aria-label="Pricing" className="min-h-11 rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface)] px-3" value={mode} disabled={pending} onChange={e => {dirty.current = true; setMode(e.target.value); setMessage(null);}}>
        <option value="manual">My price · fixed</option><option value="default" disabled={!workspace.settings.default_rule_id || !workspace.enabled}>Vendor default · automatic</option>
        {workspace.rules.map(rule => <option key={rule.id} value={rule.id} disabled={!workspace.enabled}>{rule.name} · automatic</option>)}
      </select></label>}
      {mode === "manual" ? <label htmlFor={priceId} className="grid gap-2 text-sm">Asking price · USD
        <input id={priceId} ref={priceInput} name="sale_price" type="text" inputMode="decimal" autoComplete="off"
          value={price} disabled={pending} onChange={event => { dirty.current = true; setPrice(event.target.value); setMessage(null); setError(false); }}
          aria-invalid={error} aria-describedby={message ? `${priceId}-status` : undefined}
          placeholder="0.00" className="min-h-11 w-40 rounded-lg border border-[var(--gv-border-soft)] bg-transparent px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current" />
      </label> : <p aria-live="polite" className="max-w-sm pb-3 text-sm">{!workspace?.enabled ? "Automatic repricing is paused. Your last confirmed asking price is retained." : quoting ? "Checking fresh market…" : quote?.status === "ready" ? `$${((quote.amountMinor ?? 0) / 100).toFixed(2)} · ${quote.ruleName}. Updates automatically.` : quote?.reason ?? "Choose a pricing rule."}</p>}
      <button type="submit" className="gv-primary-button" disabled={pending || conflict || (mode !== "manual" && (quoting || quote?.status !== "ready" || !workspace?.enabled))}>{pending ? "Saving and syncing…" : listed ? "Save sale price" : "Make public and For sale"}</button>
      {conflict && <button type="button" className="gv-secondary-button" onClick={() => window.location.reload()}>Reload latest price</button>}
      {qrHref && <Link href={qrHref} className="gv-secondary-button">QR and label</Link>}
      <Link href="/account/pricing" className="text-sm underline">Manage pricing rules</Link>
    </form>
    {workspace?.copy?.reason && <p className="text-sm" role="status">{workspace.copy.reason} Last confirmed asking price is retained.</p>}
    {message && <p id={`${priceId}-status`} role={error ? "alert" : "status"} aria-live="polite" className="text-sm">{message}</p>}
    {!error && message?.includes("Square") && !message.includes("Ready to scan") && <Link href="/account/connections/square" className="gv-secondary-button">Check Square status</Link>}
  </section>;
}
