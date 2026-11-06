"use client";
import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import PublicCardImage from "@/components/PublicCardImage";

export type CoverOption = { cardPrintId: string; label: string; imageUrl?: string | null; subtitle?: string | null };
export default function BinderCoverPicker({ options, value, onChange, allowCurrent, unoptimizedImages = false }: { options: CoverOption[]; value: string; onChange: (value: string) => void; allowCurrent: boolean; unoptimizedImages?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const candidates = useMemo(() => [...new Map(options.map(option => [option.cardPrintId, option])).values()], [options]);
  const terms = query.toLowerCase().trim().split(/\s+/);
  const visible = candidates.filter(option => terms.every(term => `${option.label} ${option.subtitle ?? ""}`.toLowerCase().includes(term)));
  const selected = candidates.find(option => option.cardPrintId === value);
  const invalid = Boolean(value && !selected && !allowCurrent);
  function choose(id: string) { onChange(id); dialog.current?.close(); }
  return <div className="space-y-2">
    <span className="block text-sm font-medium">Binder cover</span>
    <input type="hidden" name="coverCardPrintId" value={value} />
    <button type="button" className="gv-cover-choice w-full text-left" onClick={() => dialog.current?.showModal()} aria-label="Choose Binder cover artwork">
      {selected ? <PublicCardImage unoptimized={unoptimizedImages} src={selected.imageUrl ?? undefined} alt="" imageClassName="h-16 w-12 rounded-[10px] object-contain" fallbackClassName="h-16 w-12" fallbackLabel="" /> : null}
      <span><span className="block">{selected?.label ?? (value ? invalid ? "Current cover needs replacement" : "Keep current cover" : "No cover")}</span><span className="block text-xs">{selected?.subtitle}</span><span className="block text-sm text-[var(--gv-primary)]">Choose artwork</span></span>
    </button>
    {invalid ? <p role="alert">Choose eligible checklist artwork or explicitly choose No cover.</p> : null}
    <dialog ref={dialog} className="gv-collector-sheet" aria-label="Choose Binder cover">
      <div className="space-y-3 p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Choose Binder cover</h3><button type="button" aria-label="Close cover picker" className="gv-secondary-button flex min-h-11 min-w-11 shrink-0 items-center justify-center !p-2" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button></div>
        <label>Search checklist artwork<input type="search" className="gv-binder-input block w-full" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }} /></label>
        <button type="button" className="gv-secondary-button" aria-pressed={!value} onClick={() => choose("")}>No cover</button>
        {value && !selected ? <button type="button" className="gv-secondary-button" disabled={!allowCurrent} onClick={() => choose(value)}>{allowCurrent ? "Keep current cover" : "Current cover needs replacement"}</button> : null}
        <p role="status">{candidates.length === 0 ? "No eligible checklist artwork available." : `${visible.length} ${visible.length === 1 ? "cover" : "covers"}`}</p>
        {!visible.length && candidates.length ? <div><p>No matching artwork</p><button type="button" className="gv-secondary-button" onClick={() => setQuery("")}>Clear search</button></div> : null}
        <div className="gv-cover-gallery">{visible.map(option => <button type="button" key={option.cardPrintId} className="gv-cover-tile" aria-pressed={value === option.cardPrintId} onClick={() => choose(option.cardPrintId)}>
          <PublicCardImage unoptimized={unoptimizedImages} src={option.imageUrl ?? undefined} alt="" imageClassName="aspect-[5/7] max-h-60 w-full rounded-[10px] object-contain" fallbackClassName="flex aspect-[5/7] items-center justify-center" fallbackLabel="Artwork unavailable" />
          <span className="mt-2 block font-semibold">{option.label}</span><span className="block text-xs">{option.subtitle}</span>{value === option.cardPrintId ? <span className="text-sm text-[var(--gv-primary)]">Selected</span> : null}
        </button>)}</div>
      </div>
    </dialog>
  </div>;
}
