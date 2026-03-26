"use client";

import Image from "next/image";
import Link from "next/link";
import FollowCollectorButton from "@/components/public/FollowCollectorButton";

type CollectorListRowProps = {
  collector: {
    userId: string;
    slug: string;
    displayName: string;
    avatarUrl: string | null;
  };
  viewerUserId: string | null;
  isAuthenticated: boolean;
  initialIsFollowing: boolean;
  loginHref: string;
  metadata?: string | null;
};

function getInitials(displayName: string) {
  const tokens = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return tokens.map((token) => token.charAt(0).toUpperCase()).join("") || "GV";
}

export default function CollectorListRow({
  collector,
  viewerUserId,
  isAuthenticated,
  initialIsFollowing,
  loginHref,
  metadata = null,
}: CollectorListRowProps) {
  const isOwnProfile = viewerUserId === collector.userId;

  return (
    <div className="flex flex-col gap-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/u/${collector.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-950 text-sm font-semibold tracking-[0.08em] text-white">
          {collector.avatarUrl ? (
            <Image src={collector.avatarUrl} alt={`${collector.displayName} profile photo`} fill className="object-cover" />
          ) : (
            getInitials(collector.displayName)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-slate-950">{collector.displayName}</p>
          <p className="truncate text-sm text-slate-600">/u/{collector.slug}</p>
          {metadata ? <p className="mt-1 text-xs font-medium text-slate-500">{metadata}</p> : null}
        </div>
      </Link>

      <FollowCollectorButton
        collectorUserId={collector.userId}
        isAuthenticated={isAuthenticated}
        isOwnProfile={isOwnProfile}
        initialIsFollowing={initialIsFollowing}
        loginHref={loginHref}
      />
    </div>
  );
}
