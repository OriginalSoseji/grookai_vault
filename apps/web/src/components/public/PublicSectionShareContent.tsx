"use client";

import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import { ViewDensityToggle } from "@/components/collection/ViewDensityToggle";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { PublicCollectionGrid } from "@/components/public/PublicCollectionGrid";
import { useViewDensity } from "@/hooks/useViewDensity";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";
import {
  getPublicWallHref,
  PUBLIC_SECTION_SHARE_COPY,
} from "@/lib/wallSections/wallSectionTypes";

type PublicSectionShareContentProps = {
  slug: string;
  sectionName: string;
  sectionUrl: string;
  cards: PublicWallCard[];
  viewerUserId: string | null;
  ownerUserId: string;
};

function formatCardCount(count: number) {
  return `${count} ${count === 1 ? "card" : "cards"}`;
}

export function PublicSectionShareContent({
  slug,
  sectionName,
  sectionUrl,
  cards,
  viewerUserId,
  ownerUserId,
}: PublicSectionShareContentProps) {
  const { density, setDensity } = useViewDensity();

  return (
    <section className="space-y-4">
      <div className="rounded-[1.4rem] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/50 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
              {PUBLIC_SECTION_SHARE_COPY.section}
            </p>
            <h2 className="truncate text-2xl font-semibold tracking-tight text-slate-950">{sectionName}</h2>
            <p className="text-sm text-slate-500">{formatCardCount(cards.length)}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end lg:justify-end">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={getPublicWallHref(slug)}
                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                {PUBLIC_SECTION_SHARE_COPY.backToWall}
              </Link>
              <CopyButton
                text={sectionUrl}
                label={PUBLIC_SECTION_SHARE_COPY.copyLink}
                copiedLabel={PUBLIC_SECTION_SHARE_COPY.copied}
                className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              />
            </div>
            <div className="space-y-1 sm:min-w-fit">
              <p className="text-[11px] font-medium text-slate-500">Display</p>
              <ViewDensityToggle value={density} onChange={setDensity} />
            </div>
          </div>
        </div>
      </div>

      {cards.length > 0 ? (
        <PublicCollectionGrid
          cards={cards}
          density={density}
          viewerUserId={viewerUserId}
          ownerUserId={ownerUserId}
        />
      ) : (
        <PublicCollectionEmptyState title={PUBLIC_SECTION_SHARE_COPY.empty} />
      )}
    </section>
  );
}
