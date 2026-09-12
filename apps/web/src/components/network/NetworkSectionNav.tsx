import Link from "next/link";
import { isLocalCommunityFeedEnabled } from "@/lib/network/localCommunityFeatureFlag";

export default function NetworkSectionNav({
  active,
}: {
  active: "cards" | "collectors" | "nearby";
}) {
  const localCommunityEnabled = isLocalCommunityFeedEnabled();

  return (
    <nav aria-label="Pulse sections" className="flex flex-wrap gap-x-6 border-b border-[color:var(--gv-border-soft)]">
      <Link
        href="/network"
        aria-current={active === "cards" ? "page" : undefined}
        className={`inline-flex min-h-11 items-center border-b-2 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${
          active === "cards"
            ? "border-[color:var(--gv-text-primary)] text-[color:var(--gv-text-primary)]"
            : "border-transparent text-[color:var(--gv-text-secondary)] hover:text-[color:var(--gv-text-primary)]"
        }`}
      >
        Cards
      </Link>
      {localCommunityEnabled ? (
        <Link
          href="/network/nearby"
          aria-current={active === "nearby" ? "page" : undefined}
          className={`inline-flex min-h-11 items-center border-b-2 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${
            active === "nearby"
              ? "border-[color:var(--gv-text-primary)] text-[color:var(--gv-text-primary)]"
              : "border-transparent text-[color:var(--gv-text-secondary)] hover:text-[color:var(--gv-text-primary)]"
          }`}
        >
          Nearby
        </Link>
      ) : null}
      <Link
        href="/network/discover"
        aria-current={active === "collectors" ? "page" : undefined}
        className={`inline-flex min-h-11 items-center border-b-2 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${
          active === "collectors"
            ? "border-[color:var(--gv-text-primary)] text-[color:var(--gv-text-primary)]"
            : "border-transparent text-[color:var(--gv-text-secondary)] hover:text-[color:var(--gv-text-primary)]"
        }`}
      >
        Discover
      </Link>
    </nav>
  );
}
