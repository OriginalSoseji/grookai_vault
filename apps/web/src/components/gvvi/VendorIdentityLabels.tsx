"use client";
import {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";

export type VendorIdentityLabel = {gvviId: string; name: string; setName: string; number: string; qr: string; qrModules: number};
type Format = "p21_14x40" | "munbyn_102x152";
const formats = {p21_14x40: {name: "P21 · 14 × 40 mm", width: 40, height: 14}, munbyn_102x152: {name: "Munbyn · 102 × 152 mm", width: 102, height: 152}};

export default function VendorIdentityLabels({labels}: {labels: VendorIdentityLabel[]}) {
  const [format, setFormat] = useState<Format>("p21_14x40");
  const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    try {const saved = localStorage.getItem("grookai.identity-label.format.v1"); if (saved === "p21_14x40" || saved === "munbyn_102x152") setFormat(saved);} catch {}
    setReady(true);
    const element = document.createElement("div"); element.id = "grookai-label-print-root";
    document.body.appendChild(element); setPortal(element);
    return () => {element.remove();};
  }, []);
  const size = formats[format];
  const missingSetName = labels.some(label => !label.setName.trim() || label.setName.trim().toLowerCase() === "unknown set");
  async function print() {
    if (busy) return;
    if (missingSetName) {setError("The full set name is unavailable. Reload the card after its set name is available."); return;}
    setBusy(true); setError("");
    try {
      if (!root.current || !portal) throw Error("The label preview is not ready. Try again.");
      await document.fonts.ready;
      const images = [...root.current.querySelectorAll("img"), ...portal.querySelectorAll("img")];
      await Promise.all(images.map(img => img.decode()));
      const text = root.current?.querySelectorAll<HTMLElement>("[data-label-text]") ?? [];
      for (const element of text) {
        const maximum = Number(element.dataset.maxFont);
        let fit = false;
        for (let px = maximum; px >= 4.5; px -= 0.25) {
          element.style.fontSize = `${px}px`;
          if (element.scrollHeight <= element.clientHeight + 1 && element.scrollWidth <= element.clientWidth + 1) {fit = true; break;}
        }
        if (!fit) throw Error("This full card identity will not fit legibly. Choose the larger label format.");
      }
      const printedText = portal?.querySelectorAll<HTMLElement>("[data-label-text]") ?? [];
      Array.from(text).forEach((element, index) => {if (printedText[index]) printedText[index].style.fontSize = element.style.fontSize;});
      window.print();
    } catch (e) {setError(e instanceof Error ? e.message : "The print preview could not be prepared. Nothing was sent automatically.");}
    finally {setBusy(false);}
  }
  const articles = labels.map(label => <article key={label.gvviId} className="identity-label" aria-label={`Label for ${label.name}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <div className="label-qr-box"><img className="label-qr" src={label.qr} alt={`Permanent QR for ${label.name}`} style={{width: `${label.qrModules * Math.floor((format === "p21_14x40" ? 96 : 575) / label.qrModules) / 203 * 25.4}mm`, height: `${label.qrModules * Math.floor((format === "p21_14x40" ? 96 : 575) / label.qrModules) / 203 * 25.4}mm`}} /></div>
    <div className="label-identity"><p data-label-text data-max-font={format === "p21_14x40" ? 11 : 30} className="label-name">{label.name}</p><p data-label-text data-max-font={format === "p21_14x40" ? 7 : 18} className="label-set">{label.setName}</p><p className="label-number">#{label.number}</p></div>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="label-emblem" src="/grookai-emblem-square.svg" alt="grookai" />
  </article>);
  return <div className="space-y-5">
    <div className="space-y-3 print:hidden">
      <label className="grid max-w-sm gap-2 text-sm">Label format<select aria-label="Label format" value={format} disabled={!ready || busy} onChange={e => {const value = e.target.value as Format; setFormat(value); setError(""); try {localStorage.setItem("grookai.identity-label.format.v1", value);} catch {}}} className="min-h-11 rounded-lg border border-[var(--gv-border-soft)] bg-[var(--gv-surface)] px-3">{Object.entries(formats).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}</select></label>
      <p className="max-w-xl text-sm text-[var(--gv-text-secondary)]">{labels.length} {labels.length === 1 ? "label" : "labels"}. Match the loaded stock, select your printer, and print at 100% / Actual size with margins and headers off. Each label keeps the same QR as prices change.</p>
      <button className="gv-primary-button" type="button" disabled={!ready || busy || missingSetName} onClick={print}>{busy ? "Preparing labels…" : labels.length === 1 ? "Print label" : `Print ${labels.length} labels`}</button>
      {missingSetName && <p role="alert" className="text-sm">The full set name is unavailable for a selected copy. Reload after its actual set name is available. Set codes are never substituted.</p>}
      <p className="text-xs text-[var(--gv-text-secondary)]">Check the physical output before printing again. Closing or cancelling the print dialog does not confirm a printed label.</p>
      {error && <p role="alert" className="text-sm">{error}</p>}
    </div>
    <div ref={root} data-identity-labels className={`identity-labels ${format}`}>
      {articles}
    </div>
    {portal && !missingSetName && createPortal(<div className={`identity-labels ${format}`}>{articles}</div>, portal)}
    <style>{`
      .identity-labels {display:grid; gap:20px; justify-content:start; max-width:100%; overflow-x:auto;}
      #grookai-label-print-root {display:none;}
      .identity-label {position:relative; box-sizing:border-box; display:flex; align-items:center; width:${size.width}mm; height:${size.height}mm; background:white; color:black; padding:1mm; outline:1px solid #bbb; font-family:var(--font-roboto),Roboto,sans-serif; break-after:page;}
      .label-qr-box {width:12mm; height:12mm; flex:none; display:grid; place-items:center;}
      .label-qr {flex:none; image-rendering:pixelated;}
      .label-identity {display:flex; flex-direction:column; gap:.5mm; min-width:0; width:24mm; height:12mm; margin-left:1mm;}
      .label-name,.label-set {margin:0; white-space:normal; overflow-wrap:anywhere; line-height:1.05;}
      .label-name {font-weight:700; font-size:11px; height:5.5mm;}
      .label-set {font-size:7px; height:3.5mm;}
      .label-number {margin:0; font-weight:700; font-size:8px; line-height:1;}
      .label-emblem {position:absolute; right:1mm; bottom:1mm; width:3mm; height:3mm; object-fit:contain; filter:grayscale(1) invert(1);}
      .munbyn_102x152 .identity-label {flex-direction:column; justify-content:center; gap:6mm; padding:6mm;}
      .munbyn_102x152 .label-qr-box {width:72mm; height:72mm;}
      .munbyn_102x152 .label-identity {width:90mm; height:45mm; margin:0; gap:2mm;}
      .munbyn_102x152 .label-name {font-size:30px; height:20mm;}
      .munbyn_102x152 .label-set {font-size:18px; height:15mm;}
      .munbyn_102x152 .label-number {font-size:18px;}
      .munbyn_102x152 .label-emblem {width:7mm; height:7mm; right:6mm; bottom:6mm;}
      @media print {
        @page {size:${size.width}mm ${size.height}mm; margin:0;}
        html,body {margin:0!important; padding:0!important; background:white!important;}
        body > *:not(#grookai-label-print-root) {display:none!important;}
        #grookai-label-print-root,#grookai-label-print-root .identity-labels {display:block!important; margin:0!important; padding:0!important; overflow:visible!important; max-width:none!important;}
        .identity-label {outline:none; margin:0!important; break-inside:avoid;}
        .identity-label:last-child {break-after:auto;}
      }
    `}</style>
  </div>;
}
