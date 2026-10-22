"use client";

import { useEffect, useState } from "react";

const storageKey = "grookai-logo-motion";
const changeEvent = "grookai-logo-motion-change";

export function BrandMotionToggle() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const sync = () => {
      let next = false;
      try { next = window.localStorage.getItem(storageKey) === "paused"; } catch {}
      document.documentElement.dataset.logoMotion = next ? "paused" : "playing";
      setPaused(next);
    };
    sync();
    window.addEventListener(changeEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(changeEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function toggle() {
    const next = !paused;
    document.documentElement.dataset.logoMotion = next ? "paused" : "playing";
    setPaused(next);
    try {
      window.localStorage.setItem(storageKey, next ? "paused" : "playing");
      window.dispatchEvent(new Event(changeEvent));
    } catch {}
  }

  const label = paused ? "Play logo animation" : "Pause logo animation";
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} aria-pressed={paused}
      className="gv-theme-toggle gv-logo-motion-control inline-flex h-9 w-9 shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-700"
      data-brand-motion-control>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        {paused ? <path d="m8 5 11 7-11 7Z" /> : <><path d="M8 5v14M16 5v14" strokeWidth="3" /></>}
      </svg>
    </button>
  );
}
