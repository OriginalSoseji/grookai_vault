"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LotSaleForm({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("1.00");
  const [condition, setCondition] = useState("NM");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const parsedAmount = Number(amount);
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0 || !Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setMessage("Enter a valid price and quantity.");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push(`/login?next=${encodeURIComponent(`/lots/${publicId}`)}`);
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("lot_label_record_sale_v1", {
      p_public_id: publicId,
      p_amount_cents: Math.round(parsedAmount * 100),
      p_condition_label: condition,
      p_quantity: parsedQuantity,
    });
    setBusy(false);
    setMessage(error ? "This lot sale could not be recorded." : "Sale recorded against this lot.");
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Record sale</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Track this lot without matching cards</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Price per label<input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Condition<select value={condition} onChange={(event) => setCondition(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option>NM</option><option>LP</option><option>MP</option><option>HP</option><option>DMG</option></select></label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Quantity<input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="numeric" className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
      </div>
      <button type="submit" disabled={busy} className="gv-primary-button w-full sm:w-auto">{busy ? "Recording…" : "Record sale"}</button>
      {message ? <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{message}</p> : null}
    </form>
  );
}
