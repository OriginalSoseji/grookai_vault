import Image from "next/image";
import Link from "next/link";
import { PublicPokemonJumpForm } from "@/components/public/PublicPokemonJumpForm";

export type PublicCollectorStat = {
  value: string;
  label: string;
};

type PublicCollectorHeaderProps = {
  displayName: string;
  slug: string;
  description: string;
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
  stats = [],
  activeView,
  defaultPokemonValue,
  setLogoPaths = [],
}: PublicCollectorHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm shadow-slate-200/70 md:px-8">
      {setLogoPaths.length > 0 ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {setLogoPaths.slice(0, 3).map((logoPath, index) => {
            const placements = [
              "left-[-8%] top-[-12%] rotate-[-10deg]",
              "left-[28%] top-[2%] rotate-[8deg]",
              "right-[-10%] bottom-[-12%] rotate-[12deg]",
            ];

            return (
              <div key={`${logoPath}-${index}`} className={`absolute ${placements[index] ?? placements[0]}`}>
                <Image
                  src={logoPath}
                  alt=""
                  width={360}
                  height={180}
                  className="h-auto w-[280px] scale-[1.9] object-contain opacity-[0.04] blur-[12px]"
                />
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="relative z-10 space-y-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] bg-slate-950 text-2xl font-semibold tracking-[0.08em] text-white">
            {getInitials(displayName)}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Profile</p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">{displayName}</h1>
              <p className="text-sm font-medium tracking-[0.08em] text-slate-500">/u/{slug}</p>
              <p className="max-w-2xl text-base leading-7 text-slate-600">{description}</p>
            </div>
            {stats.length > 0 ? (
              <div className="flex flex-wrap gap-3 pt-1">
                {stats.map((stat) => (
                  <div key={`${stat.label}-${stat.value}`} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
                    <p className="text-sm font-medium text-slate-900">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-200 pt-5">
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
