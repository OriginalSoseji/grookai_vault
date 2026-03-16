import Image from "next/image";
import Link from "next/link";
import { buildPathWithCompareCards } from "@/lib/compareCards";
import type { PublicSetSummary } from "@/lib/publicSets";
import { getSetAccentColor } from "@/lib/setAccentColors";

type PublicSetTileProps = {
  setInfo: PublicSetSummary;
  compareCards: string[];
  logoPath?: string;
};

export default function PublicSetTile({ setInfo, compareCards, logoPath }: PublicSetTileProps) {
  const accentColor = getSetAccentColor(setInfo.code);

  return (
    <Link
      href={buildPathWithCompareCards(`/sets/${setInfo.code}`, "", compareCards)}
      className="group relative isolate overflow-hidden rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition-all duration-200 hover:-translate-y-[2px] hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/70"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] rounded-t-3xl"
        style={{ backgroundColor: accentColor }}
      />
      {logoPath ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <Image
            src={logoPath}
            alt=""
            width={420}
            height={180}
            className="h-auto w-[84%] scale-[1.08] object-contain opacity-[0.1] blur-[3px] transition-all duration-200 ease-out group-hover:scale-[1.1] group-hover:opacity-[0.14] group-hover:blur-[1.5px]"
          />
        </div>
      ) : null}

      <div className="relative z-10 space-y-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{setInfo.code}</p>
          <h2 className="text-xl font-semibold text-slate-950">{setInfo.name}</h2>
        </div>
        <p className="text-sm text-slate-600">
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
