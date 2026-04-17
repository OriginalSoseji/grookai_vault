import Image from "next/image";
import Link from "next/link";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { getFollowingCollectors } from "@/lib/follows/getFollowingCollectors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatFollowedAt(value: string | null) {
  if (!value) {
    return "Recently followed";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Recently followed";
  }

  return `Followed ${parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function getInitials(displayName: string) {
  const tokens = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return tokens.map((token) => token.charAt(0).toUpperCase()).join("") || "GV";
}

export default async function FollowingPage() {
  const { user } = await requireServerUser("/following");

  const followedCollectors = await getFollowingCollectors(user.id);

  return (
    <div className="space-y-8 py-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Following</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Collectors you want to revisit</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Keep a simple list of collectors you want to return to for future card interactions.
          </p>
        </div>
      </section>

      {followedCollectors.length === 0 ? (
        <PublicCollectionEmptyState
          title="No followed collectors yet"
          body="Follow a collector from their public profile to keep them easy to revisit."
        />
      ) : (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            {followedCollectors.map((collector) => (
              <Link
                key={collector.userId}
                href={`/u/${collector.slug}`}
                className="flex items-center gap-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-slate-300 hover:bg-white"
              >
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
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Collector</p>
                  <p className="mt-1 text-sm text-slate-600">{formatFollowedAt(collector.followedAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
