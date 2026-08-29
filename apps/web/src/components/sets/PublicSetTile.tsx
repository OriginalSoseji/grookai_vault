"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { buildPathWithCompareCards } from "@/lib/compareCards";
import type { PublicSetSummary } from "@/lib/publicSets.shared";
import { getSetAccentColor } from "@/lib/setAccentColors";

type PublicSetTileProps = {
  setInfo: PublicSetSummary;
  compareCards: string[];
  logoPath?: string;
  priority?: boolean;
};

export default function PublicSetTile({ setInfo, compareCards, logoPath, priority = false }: PublicSetTileProps) {
  const accentColor = getSetAccentColor(setInfo.code);
  const routeParams = new URLSearchParams();
  if (setInfo.game_code !== "pokemon") {
    routeParams.set("game", setInfo.game_code);
  }
  const watermarkStyle = {
    "--wm-opacity-desktop": "0.08",
    "--wm-blur-desktop": "5px",
    "--wm-scale-desktop": "1.15",
    "--wm-opacity-hover": "0.11",
    "--wm-blur-hover": "3px",
    "--wm-scale-hover": "1.19",
    "--wm-opacity-mobile": "0.10",
    "--wm-blur-mobile": "3px",
    "--wm-scale-mobile": "1.18",
  } as CSSProperties;

  return (
    <Link
      href={buildPathWithCompareCards(`/sets/${setInfo.code}`, routeParams.toString(), compareCards)}
      className="gv-visual-card group relative isolate overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-3xl"
        style={{ backgroundColor: accentColor }}
      />
      {logoPath && !setInfo.hero_image_url ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <Image
            src={logoPath}
            alt=""
            width={420}
            height={180}
            className="gv-ghost-watermark h-auto w-[72%] object-contain"
            style={watermarkStyle}
          />
        </div>
      ) : null}
      {logoPath && !setInfo.hero_image_url ? (
        <div
          aria-hidden="true"
          className="gv-set-logo-wash pointer-events-none absolute inset-0"
        />
      ) : null}

      <div className="relative z-10 aspect-[16/9] overflow-hidden border-b border-slate-200/70 bg-slate-100 dark:border-white/[0.08] dark:bg-slate-900">
        {setInfo.hero_image_url ? (
          <>
            <Image
              src={setInfo.hero_image_url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="scale-110 object-cover opacity-20 blur-lg transition duration-300 group-hover:scale-115"
              unoptimized
            />
            <Image
              src={setInfo.hero_image_url}
              alt={`${setInfo.name} cover art`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-contain p-3 transition duration-300 group-hover:scale-[1.025]"
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              unoptimized
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center" style={{ backgroundColor: `${accentColor}18` }}>
            <span className="font-mono text-2xl font-black uppercase text-slate-700 dark:text-slate-200">
              {setInfo.code}
            </span>
          </div>
        )}
      </div>

      <div className="relative z-10 space-y-3 px-5 py-5">
        <div className="space-y-2">
          <p className="gv-eyebrow">{setInfo.code}</p>
          <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-50">{setInfo.name}</h2>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {[
            typeof setInfo.release_year === "number" ? String(setInfo.release_year) : undefined,
            typeof setInfo.printed_total === "number" ? `${setInfo.printed_total} cards` : undefined,
          ]
            .filter(Boolean)
            .join(" • ")}
        </p>
      </div>
    </Link>
  );
}
