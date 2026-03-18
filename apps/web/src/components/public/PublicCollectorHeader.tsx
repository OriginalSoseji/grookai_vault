import Image from "next/image";
import type { CSSProperties } from "react";

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
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
      {bannerUrl ? (
        <div aria-hidden="true" className="relative h-28 overflow-hidden sm:h-32">
          <Image src={bannerUrl} alt="" fill unoptimized className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/55 via-slate-950/20 to-slate-950/5" />
        </div>
      ) : setLogoPaths.length > 0 ? (
        <div aria-hidden="true" className="pointer-events-none relative h-28 overflow-hidden bg-[linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] sm:h-32">
          {setLogoPaths.slice(0, 2).map((logoPath, index) => {
            const placements = [
              "left-[-14%] top-[-12%] rotate-[-8deg]",
              "right-[-16%] bottom-[-12%] rotate-[10deg]",
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
      ) : (
        <div
          aria-hidden="true"
          className="h-24 bg-[radial-gradient(circle_at_top_left,_rgba(226,232,240,0.9),_transparent_42%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] sm:h-28"
        />
      )}
      <div className="relative z-10 px-5 pb-5 sm:px-6 sm:pb-6 md:px-8 md:pb-7">
        <div className="-mt-8 flex flex-col gap-4 sm:-mt-10 sm:gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 items-end gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.4rem] border border-white/70 bg-slate-950 text-xl font-semibold tracking-[0.08em] text-white shadow-sm sm:h-20 sm:w-20 sm:rounded-[1.75rem] sm:text-2xl">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={`${displayName} profile photo`} fill unoptimized className="object-cover" />
              ) : (
                getInitials(displayName)
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Collector Profile</p>
              <div className="space-y-1">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{displayName}</h1>
                <p className="text-xs font-medium tracking-[0.08em] text-slate-500 sm:text-sm">/u/{slug}</p>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
            </div>
          </div>
          {stats.length > 0 ? (
            <div className="flex flex-wrap gap-2.5 md:max-w-[26rem] md:justify-end">
              {stats.map((stat) => (
                <div
                  key={`${stat.label}-${stat.value}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2"
                >
                  <p className="text-sm font-medium text-slate-900">{stat.value}</p>
                  <p className="text-[11px] text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
