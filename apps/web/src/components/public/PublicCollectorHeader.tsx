import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PublicPokemonJumpForm } from "@/components/public/PublicPokemonJumpForm";

export type PublicCollectorStat = {
  value: string;
  label: string;
};

type PublicCollectorHeaderProps = {
  displayName: string;
  slug: string;
  description: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  stats?: PublicCollectorStat[];
  activeView: "collection" | "pokemon";
  defaultPokemonValue?: string;
  setLogoPaths?: string[];
};

function getInitials(displayName: string) {
  const tokens = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  const initials = tokens.map((token) => token.charAt(0).toUpperCase()).join("");
  return initials || "GV";
}

export function PublicCollectorHeader({
  displayName,
  slug,
  description,
  avatarUrl = null,
  bannerUrl = null,
  stats = [],
  activeView,
  defaultPokemonValue,
  setLogoPaths = [],
}: PublicCollectorHeaderProps) {
  const collageWatermarkStyle = {
    "--wm-opacity-desktop": "0.025",
    "--wm-blur-desktop": "12px",
    "--wm-scale-desktop": "1.35",
    "--wm-opacity-mobile": "0.03",
    "--wm-blur-mobile": "10px",
    "--wm-scale-mobile": "1.4",
  } as CSSProperties;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-5 py-6 shadow-sm shadow-slate-200/70 sm:px-6 sm:py-7 md:px-8 md:py-8">
      {bannerUrl ? (
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
          <Image src={bannerUrl} alt="" fill unoptimized className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/45 via-slate-950/15 to-white/92" />
        </div>
      ) : setLogoPaths.length > 0 ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {setLogoPaths.slice(0, 2).map((logoPath, index) => {
            const placements = [
              "left-[-14%] top-[-18%] rotate-[-8deg]",
              "right-[-16%] bottom-[-18%] rotate-[10deg]",
            ];

            return (
              <div key={`${logoPath}-${index}`} className={`absolute ${placements[index] ?? placements[0]}`}>
                <Image
                  src={logoPath}
                  alt=""
                  width={360}
                  height={180}
                  className="gv-ghost-watermark h-auto w-[220px] object-contain md:w-[240px]"
                  style={collageWatermarkStyle}
                />
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="relative z-10 space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-4 sm:gap-5 md:flex-row md:items-start">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.4rem] border border-white/60 bg-slate-950 text-xl font-semibold tracking-[0.08em] text-white shadow-sm sm:h-20 sm:w-20 sm:rounded-[1.75rem] sm:text-2xl">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={`${displayName} profile photo`} fill unoptimized className="object-cover" />
            ) : (
              getInitials(displayName)
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2.5 sm:space-y-3">
            <div className="space-y-1.5 sm:space-y-2">
              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${bannerUrl ? "text-white/80" : "text-slate-500"}`}>Profile</p>
              <h1 className={`text-3xl font-semibold tracking-tight sm:text-4xl ${bannerUrl ? "text-white" : "text-slate-950"}`}>{displayName}</h1>
              <p className={`text-xs font-medium tracking-[0.08em] sm:text-sm ${bannerUrl ? "text-white/80" : "text-slate-500"}`}>/u/{slug}</p>
              <p className={`max-w-2xl text-sm leading-6 sm:text-base sm:leading-7 ${bannerUrl ? "text-white/90" : "text-slate-600"}`}>{description}</p>
            </div>
            {stats.length > 0 ? (
              <div className="flex flex-wrap gap-2.5 pt-1 sm:gap-3">
                {stats.map((stat) => (
                  <div
                    key={`${stat.label}-${stat.value}`}
                    className={`rounded-full px-4 py-2 ${
                      bannerUrl
                        ? "border border-white/25 bg-white/12 backdrop-blur-sm"
                        : "border border-slate-200 bg-slate-50"
                    }`}
                  >
                    <p className={`text-sm font-medium ${bannerUrl ? "text-white" : "text-slate-900"}`}>{stat.value}</p>
                    <p className={`text-xs ${bannerUrl ? "text-white/80" : "text-slate-500"}`}>{stat.label}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3.5 border-t border-slate-200 pt-4 sm:space-y-4 sm:pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/u/${slug}`}
              className={`inline-flex rounded-full px-4 py-2 text-sm font-medium transition ${
                activeView === "collection"
                  ? "border border-slate-300 bg-slate-950 text-white"
                  : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              Collection
            </Link>
            <a
              href="#pokemon-browser"
              className={`inline-flex rounded-full px-4 py-2 text-sm font-medium transition ${
                activeView === "pokemon"
                  ? "border border-slate-300 bg-slate-950 text-white"
                  : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              Pokémon
            </a>
          </div>
          <PublicPokemonJumpForm slug={slug} defaultValue={defaultPokemonValue} />
        </div>
      </div>
    </section>
  );
}
