"use client";

import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import { buildPathWithCompareCards } from "@/lib/compareCards";
import type { PublicSetSummary } from "@/lib/publicSets.shared";
import { getSetAccentColor } from "@/lib/setAccentColors";

type PublicSetTileProps = {
  setInfo: PublicSetSummary;
  compareCards: string[];
  logoPath?: string;
  priority?: boolean;
};

export default function PublicSetTile({ setInfo, compareCards, priority = false }: PublicSetTileProps) {
  const accentColor = getSetAccentColor(setInfo.code);
  const routeParams = new URLSearchParams();
  if (setInfo.game_code !== "pokemon") {
    routeParams.set("game", setInfo.game_code);
  }

  return (
    <Link
      href={buildPathWithCompareCards(`/sets/${setInfo.code}`, routeParams.toString(), compareCards)}
      className="gv-collector-set-tile gv-visual-card group relative isolate min-w-0 overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="gv-collector-set-accent absolute inset-x-0 top-0 z-20 h-[3px]"
        style={{ backgroundColor: accentColor }}
      />
      {/* The summary has only the governed hero (card, package, or legacy logo),
          not verified card candidates. Keep selection unchanged; never infer a hit card. */}
      <div className="gv-collector-set-cover relative z-10 h-[220px] overflow-hidden border-b border-slate-200/70 bg-slate-100 sm:h-[250px] dark:border-white/[0.08] dark:bg-slate-900">
        <PublicCardImage
          src={setInfo.hero_image_url}
          alt={`${setInfo.name} cover art`}
          imageClassName="gv-collector-set-cover-image h-full w-full rotate-[7deg] object-contain p-6 drop-shadow-md"
          fallbackClassName="gv-collector-set-cover-empty flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-600 dark:text-slate-400"
          fallbackLabel={
            <>
              <span className="max-w-full break-words font-mono font-semibold uppercase">{setInfo.code}</span>
              <span>Cover artwork unavailable</span>
            </>
          }
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          loading="lazy"
          priority={priority}
          unoptimized
        />
      </div>

      <div className="gv-collector-set-info relative z-10 space-y-3 break-words px-5 py-5">
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
