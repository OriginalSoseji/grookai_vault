"use client";
import {useState} from "react";
import Link from "next/link";
type Copy = {id: string; name: string; setName: string; number: string};
export default function VendorLabelPicker({copies}: {copies: Copy[]}) {
  const [selected, setSelected] = useState<string[]>([]);
  return <section className="space-y-4">
    <p className="text-sm text-[var(--gv-text-secondary)]">Choose the physical copies to label. Each copy gets its own permanent QR. Prices stay off the label.</p>
    <div className="flex flex-wrap items-center gap-3"><button className="gv-secondary-button" onClick={() => setSelected(selected.length === copies.length ? [] : copies.map(c => c.id))}>{selected.length === copies.length ? "Clear selection" : "Select this page"}</button>
      {selected.length > 0 && <Link href={`/vault/labels?copies=${encodeURIComponent(selected.join(","))}`} className="gv-primary-button">Preview {selected.length} {selected.length === 1 ? "label" : "labels"}</Link>}</div>
    <ul className="divide-y divide-[var(--gv-border-soft)]">{copies.map(copy => <li key={copy.id}><label className="flex min-h-14 items-center gap-3 py-3"><input type="checkbox" checked={selected.includes(copy.id)} onChange={e => setSelected(e.target.checked ? [...selected, copy.id] : selected.filter(id => id !== copy.id))} /><span><span className="block text-sm font-semibold">{copy.name}</span><span className="block text-xs text-[var(--gv-text-secondary)]">{copy.setName} · #{copy.number} · {copy.id.slice(-6)}</span></span></label></li>)}</ul>
    {copies.length === 0 && <p>No eligible For sale copies on this page. Save a copy For sale to print its label.</p>}
  </section>;
}
