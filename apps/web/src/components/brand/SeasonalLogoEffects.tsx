import type { CSSProperties } from "react";

export type SeasonalLogoTheme = "halloween" | "winter";

function Spider() {
  return (
    <g className="gv-logo-spider-body">
      <g fill="none" stroke="#c4a2ef" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round">
        <path className="gv-logo-spider-legs-a" d="M-2-3-7-7-10-5M2-3 7-7 10-5M-3 1-8 2-10 6M3 1 8 2 10 6" />
        <path className="gv-logo-spider-legs-b" d="M-3-1-8-3-11 0M3-1 8-3 11 0M-2 3-6 6-6 10M2 3 6 6 6 10" />
      </g>
      <ellipse cy="2" rx="3.7" ry="5" fill="#382341" stroke="#e3af78" strokeWidth="0.75" />
      <circle cy="-3" r="2.8" fill="#382341" stroke="#e3af78" strokeWidth="0.75" />
      <g fill="#ffe0a3"><circle cx="-1" cy="-3.6" r="0.65" /><circle cx="1" cy="-3.6" r="0.65" /></g>
    </g>
  );
}

const flakes = [
  [38, 42, 8, -2, -12, 0.8], [74, 94, 10, -7, 17, 0.55],
  [102, 24, 9, -4, -15, 0.8], [136, 80, 12, -8, 12, 0.6],
  [172, 136, 9, -1, -18, 0.9], [204, 70, 11, -6, 11, 0.6],
  [54, 156, 13, -10, 20, 0.5], [94, 190, 8, -5, -14, 0.7],
  [144, 46, 10, -3, 18, 0.85], [184, 194, 12, -9, -16, 0.65],
  [118, 130, 11, -6, 13, 0.55], [216, 112, 9, -4, -12, 0.7],
] as const;

/** Decorative motion stays inside the avatar; the emblem is a separate layer. */
export function SeasonalLogoEffects({ theme }: { theme: SeasonalLogoTheme }) {
  return (
    <svg className={`gv-logo-seasonal-effects gv-logo-seasonal-effects-${theme}`} viewBox="0 0 240 240" fill="none" aria-hidden="true" data-seasonal-effects={theme}>
      {theme === "halloween" ? (
        <>
          <g stroke="#b5a0cf" strokeWidth="0.7" opacity="0.25">
            <path d="M31 27 94 39M31 27 82 68M31 27 49 94M31 27 14 71" />
            <path d="M20 48Q30 43 39 54Q51 46 61 51Q60 37 65 34M15 65Q34 59 46 79Q68 67 80 68Q75 46 88 38" />
          </g>
          <g className="gv-logo-spider-hang gv-logo-spider-hang-one">
            <path d="M0-100V-6" stroke="#cfb8e6" strokeWidth="0.65" opacity="0.55" />
            <Spider />
          </g>
          <g className="gv-logo-spider-hang gv-logo-spider-hang-two">
            <path d="M0-100V-6" stroke="#cfb8e6" strokeWidth="0.65" opacity="0.4" />
            <Spider />
          </g>
          <g className="gv-logo-spider-crawl"><Spider /></g>
        </>
      ) : (
        flakes.map(([x, y, duration, delay, drift, scale], index) => (
          <g
            key={index}
            className="gv-logo-snowflake"
            style={{ "--snow-x": `${x}px`, "--snow-y": `${y}px`, "--snow-duration": `${duration}s`, "--snow-delay": `${delay}s`, "--snow-drift": `${drift}px` } as CSSProperties}
            opacity={scale}
          >
            <g className="gv-logo-snowflake-spin">
              <path transform={`scale(${scale})`} d="M0-6V6M-5.2-3 5.2 3M-5.2 3 5.2-3M-2-4 0-2 2-4M-2 4 0 2 2 4M-4.5-.4-2.3-1.3-2.6-3.6M4.5.4 2.3 1.3 2.6 3.6M-4.5.4-2.3 1.3-2.6 3.6M4.5-.4 2.3-1.3 2.6-3.6" stroke="#e4faff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        ))
      )}
    </svg>
  );
}
