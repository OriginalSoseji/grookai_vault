"use client";

import { useState, type CSSProperties } from "react";
import { BrandAvatar } from "./BrandAvatar";
import { BrandLockup, BrandText } from "./BrandText";
import { BRAND_THEMES } from "./brandTheme";

const themes = [
  { name: "Original", fill: "var(--gv-text-primary)", description: "The original emblem in the current text color." },
  { name: "Lime", fill: "#b7f23a", description: "The grookai interaction color." },
  { name: "Autumn", fill: "linear-gradient(135deg, #fce09a, #f29c46 50%, #d95d39)", description: "Warm harvest colors." },
  { name: "Halloween", fill: BRAND_THEMES.halloween.logoFill, description: "Spiders crawl and dangle inside the profile picture." },
  { name: "Winter", fill: BRAND_THEMES.winter.logoFill, description: "Snowflakes drift past the original emblem." },
  { name: "Celebration", fill: "linear-gradient(135deg, #ff7373, #ffd966 35%, #86dbc5 65%, #a2b9ff)", description: "A multicolor celebration." },
] as const;

export function LogoThemePreview() {
  const [selected, setSelected] = useState<(typeof themes)[number]>(themes[0]);
  const [paused, setPaused] = useState(false);
  const animation = selected.name === "Halloween" ? "halloween" : selected.name === "Winter" ? "winter" : undefined;

  return (
    <div className="gv-page-rhythm">
      <div>
        <BrandText includeVault />
        <h1 className="gv-display-title mt-5">One logo. Every season.</h1>
        <p className="gv-body-copy mt-2">Try a palette. The original design stays intact.</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Logo color themes">
        {themes.map((theme) => (
          <button
            key={theme.name}
            type="button"
            className={selected.name === theme.name ? "gv-primary-button" : "gv-secondary-button"}
            aria-pressed={selected.name === theme.name}
            onClick={() => { setSelected(theme); setPaused(false); }}
          >
            {theme.name}
          </button>
        ))}
      </div>
      <section
        className="gv-logo-preview-stage gv-premium-surface grid gap-6 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10 sm:p-10"
        aria-label="Selected logo theme"
        style={{ "--gv-logo-fill": selected.fill } as CSSProperties}
      >
        <BrandAvatar size={240} theme={animation} paused={paused} label={`${selected.name} grookai logo`} />
        <div className="min-w-0 space-y-4">
          <BrandLockup seasonal={false} />
          <div aria-live="polite">
            <h2 className="gv-section-title">{selected.name}</h2>
            <p className="gv-body-copy mt-2">{selected.description}</p>
          </div>
          {animation ? (
            <button className="gv-logo-motion-control gv-secondary-button" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>
              {paused ? "Play animation" : "Pause animation"}
            </button>
          ) : null}
          <p className="gv-quiet-line">Live profile picture and a larger emblem beside the name.</p>
        </div>
      </section>
      <p className="gv-quiet-line">Local design preview. Choose colors here to explore the brand.</p>
    </div>
  );
}
