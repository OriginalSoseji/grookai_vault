"use client";

import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";

type FeaturedCardTileProps = {
  gv_id: string;
  name: string;
  image_url: string;
};

export default function FeaturedCardTile({ gv_id, name, image_url }: FeaturedCardTileProps) {
  return (
    <Link
      href={`/card/${gv_id}`}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
    >
      <PublicCardImage
        src={image_url}
        alt={name}
        imageClassName="aspect-[3/4] w-full object-contain p-4"
        fallbackClassName="flex aspect-[3/4] items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
      />
      <div className="space-y-1 border-t border-slate-200 px-3 py-3">
        <p className="line-clamp-2 text-sm font-medium text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">{gv_id}</p>
      </div>
    </Link>
  );
}
