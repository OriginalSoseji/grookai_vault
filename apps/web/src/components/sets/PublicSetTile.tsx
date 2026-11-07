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

export default function PublicSetTile({ setInfo, compareCards, logoPath, priority = false }: PublicSetTileProps) {
  const accentColor = getSetAccentColor(setInfo.code);
  const preferBundledLogo = setInfo.game_code === "pokemon" && Boolean(logoPath) &&
    ["tcgdex", "pokemontcgapi"].includes(setInfo.hero_image_source?.trim().toLowerCase() ?? "");
  const coverSrc = preferBundledLogo ? logoPath : setInfo.hero_image_url;
  const fallbackSrc = preferBundledLogo ? setInfo.hero_image_url : logoPath;
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
      {/* Pokemon summaries use set/package artwork, then the exact set logo;
          other games retain their existing governed cover selection. */}
      <div className="gv-collector-set-cover relative z-10 aspect-[5/7] overflow-hidden rounded-[10px] bg-[var(--gv-surface-container)]">
        <PublicCardImage
          src={coverSrc}
          fallbackSrc={fallbackSrc}
          alt={`${setInfo.name} cover art`}
          imageClassName="gv-collector-set-cover-image h-full w-full object-contain p-2.5"
          fallbackClassName="gv-collector-set-cover-empty flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-600 dark:text-slate-400"
          fallbackLabel={
            <>
              <span className="max-w-full break-words font-semibold">{setInfo.display_code ?? setInfo.code}</span>
              <span>Cover artwork unavailable</span>
            </>
          }
          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 20vw, 17vw"
          loading="lazy"
          priority={priority}
          unoptimized={!coverSrc?.startsWith("/catalog-set-covers/")}
        />
      </div>

      <div className="gv-collector-set-info relative z-10 min-w-0 break-words pt-1.5">
        <div className="space-y-1">
          <p className="gv-eyebrow truncate text-[10px]" title={setInfo.display_code ?? setInfo.code}>{setInfo.display_code ?? setInfo.code}</p>
          <h2 className="line-clamp-2 min-h-[38px] text-sm font-semibold leading-[19px] text-slate-950 dark:text-slate-50" title={setInfo.name}>{setInfo.name}</h2>
          {setInfo.name_ja ? <p lang="ja" className="line-clamp-2 text-xs leading-[17px] text-slate-600 dark:text-slate-400" title={setInfo.name_ja}>{setInfo.name_ja}</p> : null}
        </div>
        <p className="mt-[3px] text-xs leading-[17px] text-slate-600 dark:text-slate-400">
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
