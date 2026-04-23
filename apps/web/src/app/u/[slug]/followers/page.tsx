import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CollectorListRow from "@/components/public/CollectorListRow";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import FollowCollectorButton from "@/components/public/FollowCollectorButton";
import { PublicCollectorHeader, type PublicCollectorStat } from "@/components/public/PublicCollectorHeader";
import { getCollectorFollowCounts } from "@/lib/follows/getCollectorFollowCounts";
import { getFollowerCollectors } from "@/lib/follows/getFollowerCollectors";
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
      title: "Followers not found | Grookai Vault",
    };
  }

  const siteOrigin = getSiteOrigin();
  const title = `${profile.display_name} Followers | Grookai Vault`;
  const description = `Collectors following ${profile.display_name} on Grookai.`;

  return {
    title,
    description,
    alternates: siteOrigin
      ? {
          canonical: `${siteOrigin}/u/${profile.slug}/followers`,
        }
      : undefined,
  };
}

function formatFollowerSince(value: string | null) {
  if (!value) {
    return "Following recently";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Following recently";
  }

  return `Following since ${parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default async function PublicFollowersPage({ params }: { params: { slug: string } }) {
  const profile = await getPublicProfileBySlug(params.slug);
  if (!profile) {
    notFound();
  }

  const [sharedCards, followCounts, followerCollectors] = await Promise.all([
    profile.vault_sharing_enabled ? getSharedCardsBySlug(profile.slug) : Promise.resolve([]),
    getCollectorFollowCounts(profile.user_id),
    getFollowerCollectors(profile.user_id),
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
        description={`Collectors following ${profile.display_name} on Grookai.`}
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
            loginHref={`/login?next=${encodeURIComponent(`/u/${profile.slug}/followers`)}`}
          />
        }
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-200/60">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Collector relationships</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Followers</h2>
            <p className="text-sm text-slate-600">Collectors keeping {profile.display_name} easy to revisit.</p>
          </div>
          <Link href={`/u/${profile.slug}`} className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
            View profile
          </Link>
        </div>

        {followerCollectors.length === 0 ? (
          <PublicCollectionEmptyState
            title="No followers yet"
            body={`No public collectors are following ${profile.display_name} yet.`}
          />
        ) : (
          <div className="space-y-4">
            {followerCollectors.map((collector) => (
              <CollectorListRow
                key={collector.userId}
                collector={collector}
                viewerUserId={null}
                isAuthenticated={false}
                initialIsFollowing={false}
                loginHref={`/login?next=${encodeURIComponent(`/u/${profile.slug}/followers`)}`}
                metadata={formatFollowerSince(collector.followedAt)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
