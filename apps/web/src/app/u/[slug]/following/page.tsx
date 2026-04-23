import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CollectorListRow from "@/components/public/CollectorListRow";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import FollowCollectorButton from "@/components/public/FollowCollectorButton";
import { PublicCollectorHeader, type PublicCollectorStat } from "@/components/public/PublicCollectorHeader";
import { getCollectorFollowCounts } from "@/lib/follows/getCollectorFollowCounts";
import { getFollowingCollectors } from "@/lib/follows/getFollowingCollectors";
import { getPublicProfileBySlug } from "@/lib/getPublicProfileBySlug";
import { getSharedCardsBySlug } from "@/lib/getSharedCardsBySlug";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { deriveTopSetCodesFromCards } from "@/lib/profileSetIdentity";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const profile = await getPublicProfileBySlug(params.slug);
  if (!profile) {
    return {
      title: "Following not found | Grookai Vault",
    };
  }

  const siteOrigin = getSiteOrigin();
  const title = `${profile.display_name} Following | Grookai Vault`;
  const description = `Collectors ${profile.display_name} follows on Grookai.`;

  return {
    title,
    description,
    alternates: siteOrigin
      ? {
          canonical: `${siteOrigin}/u/${profile.slug}/following`,
        }
      : undefined,
  };
}

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

export default async function PublicFollowingPage({ params }: { params: { slug: string } }) {
  const profile = await getPublicProfileBySlug(params.slug);
  if (!profile) {
    notFound();
  }

  const [sharedCards, followCounts, followedCollectors] = await Promise.all([
    profile.vault_sharing_enabled ? getSharedCardsBySlug(profile.slug) : Promise.resolve([]),
    getCollectorFollowCounts(profile.user_id),
    getFollowingCollectors(profile.user_id),
  ]);

  const profileSetLogoPathMap = await getSetLogoAssetPathMap(deriveTopSetCodesFromCards(sharedCards));
  const sharedSetCount = new Set(sharedCards.map((card) => card.set_name?.trim()).filter(Boolean)).size;
  const stats: PublicCollectorStat[] =
    profile.vault_sharing_enabled && sharedCards.length > 0
      ? [
          { value: `${sharedCards.length}`, label: sharedCards.length === 1 ? "card" : "cards" },
          { value: `${sharedSetCount}`, label: sharedSetCount === 1 ? "set" : "sets" },
        ]
      : [];

  return (
    <div className="space-y-8 py-8">
      <PublicCollectorHeader
        displayName={profile.display_name}
        slug={profile.slug}
        description={`${profile.display_name}'s collector follows on Grookai.`}
        joinedAt={profile.created_at}
        followingCount={followCounts.followingCount}
        followerCount={followCounts.followerCount}
        followingHref={`/u/${profile.slug}/following`}
        followerHref={`/u/${profile.slug}/followers`}
        avatarUrl={profile.avatar_url}
        bannerUrl={profile.banner_url}
        stats={stats}
        setLogoPaths={[...profileSetLogoPathMap.values()].slice(0, 3)}
        actions={
          <FollowCollectorButton
            collectorUserId={profile.user_id}
            isAuthenticated={false}
            isOwnProfile={false}
            initialIsFollowing={false}
            loginHref={`/login?next=${encodeURIComponent(`/u/${profile.slug}/following`)}`}
          />
        }
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-200/60">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Collector relationships</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Following</h2>
            <p className="text-sm text-slate-600">Collectors {profile.display_name} wants to revisit.</p>
          </div>
          <Link href={`/u/${profile.slug}`} className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
            View profile
          </Link>
        </div>

        {followedCollectors.length === 0 ? (
          <PublicCollectionEmptyState
            title="No follows yet"
            body={`${profile.display_name} is not following any public collectors yet.`}
          />
        ) : (
          <div className="space-y-4">
            {followedCollectors.map((collector) => (
              <CollectorListRow
                key={collector.userId}
                collector={collector}
                viewerUserId={null}
                isAuthenticated={false}
                initialIsFollowing={false}
                loginHref={`/login?next=${encodeURIComponent(`/u/${profile.slug}/following`)}`}
                metadata={formatFollowedAt(collector.followedAt)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
