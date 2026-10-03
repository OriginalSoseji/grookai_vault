"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JungleEditionOption } from "@/lib/cards/jungleEditionResolution";
import { prepareJungleSlab, saveJungleSlab } from "@/lib/slabs/jungleSlabActions";
import { PSA_GRADE_OPTIONS } from "@/lib/slabs/gradeOptions";

export default function AddJungleSlabAction({ options }: { options: JungleEditionOption[] }) {
  const router = useRouter();
  const [printing, setPrinting] = useState("");
  const [cert, setCert] = useState("");
  const [confirm, setConfirm] = useState("");
  const [grade, setGrade] = useState("10");
  const [prepared, setPrepared] = useState<Extract<Awaited<ReturnType<typeof prepareJungleSlab>>, { ok: true }> | null>(null);
  const [owned, setOwned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const reset = () => { setPrepared(null); setOwned(false); setMessage(""); };
  const fieldClass = "block w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900";
  async function verify() {
    const option = options.find(o => o.card_printing_id === printing);
    if (!option || busy) return;
    setBusy(true); reset();
    try {
      const result = await prepareJungleSlab({ cardPrintId: option.card_print_id, printingId: printing,
        certNumber: cert, certNumberConfirm: confirm, grade });
      if (result.ok) setPrepared(result); else setMessage(result.message);
    } catch { setMessage("Verification could not be completed. Try again."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!prepared || !owned || busy) return;
    setBusy(true); setMessage("");
    try {
      const result = await saveJungleSlab(prepared.token, owned);
      if (result.ok) {
        setPrepared(null); setOwned(false); setCert(""); setConfirm("");
        setMessage(`Slab added to your Vault. ${result.gvviId}`); router.refresh();
      } else setMessage(result.message);
    } catch { setMessage("The save response was interrupted. Retry to check the same save."); }
    finally { setBusy(false); }
  }
  return <details className="w-full rounded-xl border border-slate-200 p-4">
    <summary className="cursor-pointer text-sm font-medium">Add Jungle PSA slab</summary>
    <div className="mt-4 space-y-3 text-sm">
      <p>Choose the edition printed on your slab label, then verify its certificate.</p>
      <label className="block">Edition and finish
        <select className={fieldClass} value={printing} disabled={busy} onChange={e => { setPrinting(e.target.value); reset(); }}>
          <option value="">Choose an edition</option>
          {options.map(o => <option key={o.card_printing_id} value={o.card_printing_id}>{o.edition === "first_edition" ? "First Edition" : "Unlimited"} · {o.finish_key === "holo" ? "Holo" : "Normal"}</option>)}
        </select>
      </label>
      <label className="block">PSA grade
        <select className={fieldClass} value={grade} disabled={busy} onChange={e => { setGrade(e.target.value); reset(); }}>
          {PSA_GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </label>
      <label className="block">Certificate number<input className={fieldClass} value={cert} maxLength={64} autoComplete="off" disabled={busy} onChange={e => { setCert(e.target.value); reset(); }} /></label>
      <label className="block">Confirm certificate number<input className={fieldClass} value={confirm} maxLength={64} autoComplete="off" disabled={busy} onChange={e => { setConfirm(e.target.value); reset(); }} /></label>
      <button type="button" className="rounded-full border px-4 py-2 disabled:opacity-50" disabled={busy || !printing || !cert || !confirm} onClick={verify}>Verify with PSA</button>
      {prepared ? <div className="space-y-3 rounded-lg border border-emerald-200 p-3">
        <p>{prepared.label} · PSA {prepared.grade} · Certificate {prepared.certNumber}</p>
        <label className="flex gap-2"><input type="checkbox" checked={owned} disabled={busy} onChange={e => setOwned(e.target.checked)} />I own this exact slab and confirm the edition and certificate.</label>
        <button type="button" className="rounded-full bg-slate-950 px-4 py-2 text-white disabled:opacity-50" disabled={busy || !owned} onClick={save}>Save to Vault</button>
      </div> : null}
      <p role="status" aria-live="polite">{busy ? "Checking…" : message}</p>
    </div>
  </details>;
}
