import Link from "next/link";
import { isLocalCommunityFeedEnabled } from "@/lib/network/localCommunityFeatureFlag";

export default function NetworkSectionNav({
  active,
}: {
  active: "cards" | "collectors" | "nearby";
}) {
  const localCommunityEnabled = isLocalCommunityFeedEnabled();

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/network"
        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
          active === "cards"
            ? "border border-slate-300 bg-white text-slate-950 shadow-sm"
            : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
        }`}
      >
        Cards
      </Link>
      {localCommunityEnabled ? (
        <Link
          href="/network/nearby"
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            active === "nearby"
              ? "border border-slate-300 bg-white text-slate-950 shadow-sm"
              : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
          }`}
        >
          Nearby
        </Link>
      ) : null}
      <Link
        href="/network/discover"
        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
          active === "collectors"
            ? "border border-slate-300 bg-white text-slate-950 shadow-sm"
            : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-950"
        }`}
      >
        Collectors
      </Link>
    </div>
  );
}
