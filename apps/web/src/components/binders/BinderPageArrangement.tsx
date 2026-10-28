"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useBinderHeldDrag } from "./useBinderHeldDrag";
import PublicCardImage from "@/components/PublicCardImage";

export default function BinderPageArrangement({ slots, onMove, unoptimizedImages = false, onUndo, onRedo, canUndo, canRedo, locatedKey, onInspect }: {
  onUndo?: () => void; onRedo?: () => void; canUndo?: boolean; canRedo?: boolean; locatedKey?: string | null; onInspect?: (index: number) => void;
  unoptimizedImages?: boolean;
  slots: {
    localKey: string;
    title: string;
    subtitle: string | null;
    imageUrl: string | null;
  }[];
  onMove: (from: number, to: number) => void;
}) {
  const [page, setPage] = useState(0);
  const [grid, setGrid] = useState(1);
  const [details, setDetails] = useState(false);
  const [go, setGo] = useState("");
  const [destination, setDestination] = useState("");
  const [status, setStatus] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const signature=JSON.stringify(slots);
  const latest=useRef(signature); useEffect(()=>{latest.current=signature;},[signature]);
  const moveDialog = useRef<HTMLDialogElement>(null);
  const imageDialog = useRef<HTMLDialogElement>(null);
  const layouts = [{columns:2,rows:2},{columns:3,rows:3},{columns:4,rows:3},{columns:4,rows:4}];
  const layout = layouts[grid];
  const capacity = layout.columns * layout.rows;
  useEffect(() => { try { const value = localStorage.getItem('grookai-binder-grid-v1'); if(value !== null && /^[0-3]$/.test(value)) setGrid(Number(value)); } catch {} }, []);
  useEffect(() => () => { if(image) URL.revokeObjectURL(image); }, [image]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const pages = Math.max(1, Math.ceil(slots.length / capacity));
  const located = slots.findIndex(s => s.localKey === locatedKey);
  const currentPage = Math.min(page, pages - 1);
  useEffect(()=>{ if(located>=0) setPage(Math.floor(located/capacity)); },[located,capacity,locatedKey]);
  const selected = slots.findIndex((slot) => slot.localKey === selectedKey);
  const clearSelection=useCallback(()=>setSelectedKey(null),[]);
  const {root:dragRoot,heldKey,start:startHeldDrag,consumeClick}=useBinderHeldDrag(slots,onMove,pages,setPage,setSelectedKey,clearSelection);
  function moveTo(index: number) {
    if(consumeClick())return;
    index = Math.min(index, slots.length - 1);
    if (selected >= 0 && selected !== index) {
      onMove(selected, index);
      setSelectedKey(null);
    } else {setSelectedKey(
        selected === index ? null : slots[index]?.localKey ?? null,
      );}
  }
  function changeGrid(value: number) {
    const anchor = currentPage * capacity; setGrid(value);
    setPage(Math.floor(anchor / (layouts[value].columns * layouts[value].rows)));
    try { localStorage.setItem('grookai-binder-grid-v1',String(value)); } catch { setStatus('Grid changed for this session; this device could not remember it.'); }
  }
  async function sharePage() {
    if(exporting) return; const snapshot=signature; setExporting(true); setStatus('');
    try {
      const {renderBinderPageImage} = await import('./binderPageImage');
      const blob = await renderBinderPageImage(slots.slice(currentPage*capacity,(currentPage+1)*capacity),layout.columns,layout.rows,currentPage,pages);
      if(snapshot!==latest.current) {setStatus('Checklist changed. Share the current page again.');return;}
      if(image) URL.revokeObjectURL(image); setImage(URL.createObjectURL(blob)); imageDialog.current?.showModal();
    } catch { setStatus('Image could not be created. Check artwork and try again.'); }
    finally { setExporting(false); }
  }
  return (
    <section
      ref={dragRoot}
      className="gv-binder-arrangement space-y-3"
      aria-label="Binder page arrangement"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label>Grid <select className="gv-binder-input" aria-label="Binder grid size" value={grid} onChange={e=>changeGrid(Number(e.target.value))}>{layouts.map((l,i)=><option key={i} value={i}>{l.columns} × {l.rows}</option>)}</select></label>
        <button type="button" className="gv-secondary-button" aria-pressed={details} onClick={()=>setDetails(!details)}>{details?'Details':'Artwork'}</button>
        {onUndo && onRedo ? <><button type="button" className="gv-secondary-button" disabled={!canUndo} onClick={()=>{onUndo();setSelectedKey(null);}}>Undo</button><button type="button" className="gv-secondary-button" disabled={!canRedo} onClick={()=>{onRedo();setSelectedKey(null);}}>Redo</button></>:null}
        <button type="button" className="gv-secondary-button" disabled={exporting} onClick={()=>void sharePage()}>{exporting?'Creating image…':'Share page image'}</button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Page arrangement</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="gv-secondary-button"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
            data-binder-turn="-1"
            aria-label="Previous binder page"
          >
            ←
          </button>
          <select className="gv-binder-input" aria-label="Choose Binder page" value={currentPage} onChange={e=>setPage(Number(e.target.value))}>{Array.from({length:pages},(_,p)=><option key={p} value={p}>Page {p+1} / {pages}</option>)}</select>
          <button
            type="button"
            className="gv-secondary-button"
            disabled={currentPage === pages - 1}
            onClick={() => setPage(currentPage + 1)}
            data-binder-turn="1"
            aria-label="Next binder page"
          >
            →
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2"><label>Go to page <input className="gv-binder-input w-20" inputMode="numeric" value={go} onChange={e=>setGo(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}} /></label><button type="button" className="gv-secondary-button" onClick={()=>{const p=Number(go); if(!/^\d+$/.test(go)||p<1||p>pages){setStatus(`Enter a page from 1 to ${pages}.`);return;}setPage(p-1);setStatus('');}}>Go</button></div>
      {status?<p role="alert">{status}</p>:null}
      <p className="text-xs leading-5" role="status">
        {selected >= 0
          ? `${
            slots[selected].title
          } selected. Choose its new pocket, including on another page.`
          : "Choose a card, then its new pocket. Dragging also works. Save the checklist to keep this order."}
      </p>
      {selected >= 0 ? <div className="flex flex-wrap gap-2"><button type="button" className="gv-secondary-button" onClick={()=>{setDestination('');moveDialog.current?.showModal();}}>Move to pocket</button>{onInspect?<button type="button" className="gv-secondary-button" onClick={()=>onInspect(selected)}>Inspect card</button>:null}</div>:null}
      {selected >= 0
        ? (
          <button
            type="button"
            className="min-h-11 text-sm underline"
            onClick={() => setSelectedKey(null)}
          >
            Cancel move
          </button>
        )
        : null}
      <div className="grid gap-[9px]" style={{gridTemplateColumns:`repeat(${layout.columns},minmax(0,1fr))`}}>
        {Array.from({ length: capacity }, (_, offset) => {
          const index = currentPage * capacity + offset;
          const slot = slots[index];
          return slot
            ? (
              <button
                type="button"
                key={slot.localKey}
                data-binder-pocket={index}
                data-held={heldKey===slot.localKey?true:undefined}
                onPointerDown={event=>startHeldDrag(slot.localKey,event)}
                onContextMenu={event=>{if(heldKey===slot.localKey)event.preventDefault();}}
                draggable
                aria-pressed={selected === index}
                aria-label={`Pocket ${index + 1}: ${slot.title}${
                  selected >= 0 ? ", move selected card here" : ""
                }`}
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    "application/x-grookai-binder-slot",
                    slot.localKey,
                  );
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = slots.findIndex((item) =>
                    item.localKey ===
                      event.dataTransfer.getData(
                        "application/x-grookai-binder-slot",
                      )
                  );
                  if (from >= 0 && from !== index) onMove(from, index);
                  setSelectedKey(null);
                }}
                onClick={() => moveTo(index)}
                className={`gv-binder-pocket min-w-0 rounded-[10px] border text-left ${
                  (selected === index || locatedKey === slot.localKey)
                    ? "border-[var(--gv-primary)] ring-2 ring-[var(--gv-primary)]"
                    : "border-current/20"
                }`}
              >
                <PublicCardImage
                  unoptimized={unoptimizedImages}
                  src={slot.imageUrl ?? undefined}
                  alt=""
                  imageClassName="aspect-[5/7] w-full rounded-[10px] object-contain"
                  fallbackClassName="flex aspect-[5/7] items-center justify-center text-xs"
                  fallbackLabel={slot.title}
                />
                <span className="mt-2 block text-[10px] opacity-60">
                  Pocket {index + 1}
                </span>
                {details ? <><span className="block truncate text-xs font-medium">
                  {slot.title}
                </span><span className="block text-xs">{slot.subtitle}</span></> : null}
              </button>
            )
            : (
              <button type="button" onClick={()=>moveTo(index)} disabled={selected<0} aria-label={`Empty pocket ${index+1}, append selected card`} data-binder-pocket={index}
                key={`empty-${offset}`}
                className="flex aspect-[5/7] items-center justify-center rounded-[10px] border border-dashed border-current/20 p-2 text-center text-xs opacity-50"
              >
                Empty pocket
              </button>
            );
        })}
      </div>
      <dialog ref={moveDialog} className="gv-collector-sheet" aria-label="Move to pocket"><div className="space-y-4 p-4"><h3>Move to pocket</h3><label>Destination pocket<input className="gv-binder-input block w-full" inputMode="numeric" value={destination} onChange={e=>setDestination(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}} /></label><p>{/^\d+$/.test(destination)&&Number(destination)>=1&&Number(destination)<=slots.length?`Page ${Math.floor((Number(destination)-1)/capacity)+1}, row ${Math.floor(((Number(destination)-1)%capacity)/layout.columns)+1}, column ${(Number(destination)-1)%layout.columns+1} · ${slots[Number(destination)-1].title}`:`Choose a pocket from 1 to ${slots.length}.`}</p><button type="button" className="gv-secondary-button" onClick={()=>moveDialog.current?.close()}>Cancel</button><button type="button" className="gv-primary-button" disabled={selected<0||!/^\d+$/.test(destination)||Number(destination)<1||Number(destination)>slots.length||Number(destination)-1===selected} onClick={()=>{const target=Number(destination)-1;if(selected<0||target<0||target>=slots.length)return;onMove(selected,target);setSelectedKey(null);setPage(Math.floor(target/capacity));moveDialog.current?.close();}}>Move card</button></div></dialog>
      <dialog ref={imageDialog} className="gv-collector-sheet" aria-label="Binder page image"><div className="space-y-3 p-4"><h3>Binder page image</h3><p>Checklist requirements · Ownership not shown</p>{image?<Image unoptimized width={1080} height={1800} src={image} alt="Full Binder checklist page preview" className="max-h-[65dvh] w-full object-contain"/>:null}<div className="flex gap-3">{image?<a className="gv-primary-button" href={image} download={`grookai-binder-page-${currentPage+1}.png`}>Download PNG</a>:null}<button type="button" className="gv-secondary-button" onClick={()=>imageDialog.current?.close()}>Close image</button></div></div></dialog>
    </section>
  );
}
