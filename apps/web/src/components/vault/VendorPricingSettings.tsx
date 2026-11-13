"use client";
import {useId, useState, useTransition} from "react";
import {vendorPricingAction} from "@/lib/vendorPricing/actions";
import type {PricingDefinition, PricingRule, PricingWorkspace} from "@/lib/vendorPricing/types";

const base: PricingDefinition = {markupBps: 0, flatMinor: 0, rounding: "up", stepMinor: 100, minMinor: null, maxMinor: null};
const input = "min-h-11 w-full rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface)] px-3";
function cents(raw: string, optional = false) {
  if (optional && raw.trim() === "") return null;
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(raw.trim())) throw Error("Use USD amounts with up to two decimal places.");
  return Math.round(Number(raw) * 100);
}
export default function VendorPricingSettings({initial}: {initial: PricingWorkspace}) {
  const [workspace, setWorkspace] = useState(initial);
  const [editing, setEditing] = useState<PricingRule | null>(null);
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("0");
  const [flat, setFlat] = useState("0.00");
  const [rounding, setRounding] = useState<PricingDefinition["rounding"]>("up");
  const [step, setStep] = useState("1.00");
  const [min, setMin] = useState(""); const [max, setMax] = useState("");
  const [defaultId, setDefaultId] = useState(initial.settings.default_rule_id ?? "");
  const [auto, setAuto] = useState(initial.settings.auto_for_new);
  const [message, setMessage] = useState(""); const [error, setError] = useState(false);
  const [sample, setSample] = useState("10.00"); const [preview, setPreview] = useState("");
  const [pending, start] = useTransition(); const prefix = useId();
  function edit(rule: PricingRule | null) {
    setEditing(rule); const d = rule?.definition ?? base;
    setName(rule?.name ?? ""); setPercent(String(d.markupBps / 100)); setFlat((d.flatMinor / 100).toFixed(2));
    setRounding(d.rounding); setStep((d.stepMinor / 100).toFixed(2));
    setMin(d.minMinor === null ? "" : (d.minMinor / 100).toFixed(2)); setMax(d.maxMinor === null ? "" : (d.maxMinor / 100).toFixed(2)); setPreview("");
  }
  function definition(): PricingDefinition {
    if (!/^-?\d+(?:\.\d{1,2})?$/.test(percent)) throw Error("Use a percentage with up to two decimal places.");
    const value = {markupBps: Math.round(Number(percent) * 100), flatMinor: cents(flat)!, rounding,
      stepMinor: cents(step)!, minMinor: cents(min, true), maxMinor: cents(max, true)};
    if (value.markupBps < -9999 || value.markupBps > 100000) throw Error("Choose a percentage between −99.99% and 1,000%.");
    if (value.stepMinor < 1 || value.stepMinor > 1000000) throw Error("Choose a rounding increment from $0.01 to $10,000.");
    for (const limit of [value.minMinor, value.maxMinor]) if (limit !== null && (limit < 1 || limit > 9999999999)) throw Error("Minimum and maximum must be positive USD amounts.");
    if (value.minMinor !== null && value.maxMinor !== null && value.minMinor > value.maxMinor) throw Error("Minimum must not exceed maximum.");
    return value;
  }
  function perform(action: string, payload: () => Record<string, unknown>) {
    setMessage(""); setError(false);
    start(async () => {try {
      const result = await vendorPricingAction(action, payload());
      if (!result.ok) throw Error(result.message);
      if (action === "calculate") {setPreview(`$${((result.value.amountMinor ?? 0) / 100).toFixed(2)}`); return;}
      setWorkspace(result.value); setDefaultId(result.value.settings.default_rule_id ?? ""); setAuto(result.value.settings.auto_for_new);
      if (action === "save_rule") edit(null);
      setMessage("Saved. Existing My price cards keep their price. Rule-based cards update automatically.");
    } catch (e) {setError(true); setMessage(e instanceof Error ? e.message : "Save could not be confirmed. Reload before retrying.");}});
  }
  function field(label: string, value: string, change: (s: string) => void, helper?: string) {
    const id = `${prefix}-${label.replace(/\W/g, "")}`;
    return <label htmlFor={id} className="grid gap-2 text-sm">{label}<input id={id} className={input} value={value} disabled={pending} maxLength={label === "Preset name" ? 60 : 20} onChange={e => {change(e.target.value); setPreview("");}} inputMode={label === "Preset name" ? "text" : "decimal"} />{helper && <span className="text-xs text-[var(--gv-text-secondary)]">{helper}</span>}</label>;
  }
  return <div className="space-y-8">
    {!workspace.enabled && <p role="status" className="text-sm">Automatic repricing is paused. You can prepare presets; existing prices remain available.</p>}
    <form className="space-y-4 border-y border-[var(--gv-border-soft)] py-5" onSubmit={e => {e.preventDefault(); perform("save_settings", () => ({requestId: crypto.randomUUID(), expectedRevision: workspace.settings.revision, defaultRuleId: defaultId || null, autoForNew: auto}));}}>
      <h2 className="text-lg font-semibold">Your default</h2>
      <label className="grid gap-2 text-sm">Default pricing preset<select aria-label="Default pricing preset" className={input} value={defaultId} disabled={pending} onChange={e => setDefaultId(e.target.value)}><option value="">Choose a preset</option>{workspace.rules.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={auto} disabled={pending || !defaultId} onChange={e => setAuto(e.target.checked)} className="mt-1" />Use my default for new, unpriced cards. Adding a card keeps it private until I choose For sale.</label>
      <button className="gv-primary-button" disabled={pending || (auto && !defaultId)}>Save default</button>
    </form>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Presets</h2>
      {workspace.rules.length === 0 ? <p className="text-sm text-[var(--gv-text-secondary)]">Create your first pricing preset below.</p> : <ul className="divide-y divide-[var(--gv-border-soft)]">{workspace.rules.map(r => <li key={r.id} className="flex items-center justify-between gap-3 py-3"><span>{r.name}</span><button disabled={pending} onClick={() => edit(r)} className="gv-secondary-button">Edit</button></li>)}</ul>}
    </section>
    <form className="space-y-4" onSubmit={e => {e.preventDefault(); perform("save_rule", () => ({requestId: crypto.randomUUID(), name, definition: definition(), ruleId: editing?.id, expectedRevision: editing?.revision}));}}>
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{editing ? `Edit ${editing.name}` : "New preset"}</h2>{editing && <button type="button" className="gv-secondary-button" onClick={() => edit(null)}>Cancel edit</button>}</div>
      {field("Preset name", name, setName)}
      <div className="grid gap-4 sm:grid-cols-2">{field("Percent above market", percent, setPercent, "Use a negative percentage for below market.")}{field("USD adjustment", flat, setFlat, "Added after the percentage. Negative amounts subtract.")}</div>
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm">Rounding<select className={input} disabled={pending} value={rounding} onChange={e => {setRounding(e.target.value as PricingDefinition["rounding"]); setPreview("");}}><option value="none">No rounding</option><option value="up">Round up</option><option value="down">Round down</option><option value="nearest">Nearest</option></select></label>{field("Round to USD", step, setStep, "For example: 0.25, 0.50 or 1.00.")}</div>
      <div className="grid gap-4 sm:grid-cols-2">{field("Minimum USD (optional)", min, setMin)}{field("Maximum USD (optional)", max, setMax)}</div>
      <p className="text-xs text-[var(--gv-text-secondary)]">Fresh exact market → percentage → USD adjustment → rounding → minimum / maximum. Only exact raw-card USD references are eligible. Missing or stale references retain the last confirmed price.</p>
      <div className="flex flex-wrap items-end gap-3"><div className="w-40">{field("Example market USD", sample, setSample)}</div><button type="button" className="gv-secondary-button" disabled={pending} onClick={() => perform("calculate", () => ({definition: definition(), marketAmount: sample}))}>Preview rule</button>{preview && <output className="pb-3 text-sm">Example price: {preview}</output>}</div>
      <button className="gv-primary-button" disabled={pending || !name.trim()}>{pending ? "Saving…" : "Save preset"}</button>
    </form>
    {message && <p role={error ? "alert" : "status"} aria-live="polite" className="text-sm">{message}</p>}
  </div>;
}
