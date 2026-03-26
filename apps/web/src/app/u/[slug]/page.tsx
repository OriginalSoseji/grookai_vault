import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import FollowCollectorButton from "@/components/public/FollowCollectorButton";
import { PublicCollectorHeader, type PublicCollectorStat } from "@/components/public/PublicCollectorHeader";
import { PublicCollectorProfileContent } from "@/components/public/PublicCollectorProfileContent";
import { getCollectorFollowCounts } from "@/lib/follows/getCollectorFollowCounts";
import { getCollectorFollowState } from "@/lib/follows/getCollectorFollowState";
import { getPublicProfileBySlug } from "@/lib/getPublicProfileBySlug";
import { getInPlayCardsBySlug, getSharedCardsBySlug } from "@/lib/getSharedCardsBySlug";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { deriveTopSetCodesFromCards } from "@/lib/profileSetIdentity";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const profile = await getPublicProfileBySlug(params.slug);
  if (!profile) {
    return {
      title: "Profile not found | Grookai Vault",
    };
  }

  const siteOrigin = getSiteOrigin();
  const title = `${profile.display_name} | Grookai Vault`;
  const description = `${profile.display_name}'s collection on Grookai.`;

  return {
    title,
    description,
    alternates: siteOrigin
      ? {
          canonical: `${siteOrigin}/u/${profile.slug}`,
        }
      : undefined,
    openGraph: {
      title,
      description,
      type: "profile",
      url: siteOrigin ? `${siteOrigin}/u/${profile.slug}` : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicProfilePage({ params }: { params: { slug: string } }) {
  const profile = await getPublicProfileBySlug(params.slug);

  if (!profile) {
    notFound();
  }

  const supabase = createServerComponentClient();
  const [{ data: authData }, sharedCards, inPlayCards, followCounts] = await Promise.all([
    supabase.auth.getUser(),
    profile.vault_sharing_enabled ? getSharedCardsBySlug(profile.slug) : Promise.resolve([]),
    profile.vault_sharing_enabled ? getInPlayCardsBySlug(profile.slug) : Promise.resolve([]),
    getCollectorFollowCounts(profile.user_id),
  ]);
  const viewerUserId = authData.user?.id ?? null;
  const isOwnProfile = viewerUserId === profile.user_id;
  const initialIsFollowing =
    viewerUserId && !isOwnProfile ? await getCollectorFollowState(viewerUserId, profile.user_id) : false;
  const profileSetLogoPathMap = await getSetLogoAssetPathMap(deriveTopSetCodesFromCards(sharedCards));
  const setCount = new Set(sharedCards.map((card) => card.set_name?.trim()).filter(Boolean)).size;
  const stats: PublicCollectorStat[] =
    profile.vault_sharing_enabled && sharedCards.length > 0
      ? [
          { value: `${sharedCards.length}`, label: sharedCards.length === 1 ? "card" : "cards" },
          { value: `${setCount}`, label: setCount === 1 ? "set" : "sets" },
        ]
      : [];

  const description = profile.vault_sharing_enabled
    ? `${profile.display_name}'s collection on Grookai.`
    : "A collection on Grookai.";

  return (
    <div className="space-y-8 py-8">
      <PublicCollectorHeader
        displayName={profile.display_name}
        slug={profile.slug}
        description={description}
        joinedAt={profile.created_at}
        followingCount={followCounts.followingCount}
        followerCount={followCounts.followerCount}
        avatarUrl={profile.avatar_url}
        bannerUrl={profile.banner_url}
        stats={stats}
        setLogoPaths={[...profileSetLogoPathMap.values()].slice(0, 3)}
        actions={
          <FollowCollectorButton
            collectorUserId={profile.user_id}
            isAuthenticated={Boolean(authData.user)}
            isOwnProfile={isOwnProfile}
            initialIsFollowing={initialIsFollowing}
            loginHref={`/login?next=${encodeURIComponent(`/u/${profile.slug}`)}`}
          />
        }
      />

      {!profile.vault_sharing_enabled ? (
        <PublicCollectionEmptyState title="Collection not shared yet" body="This collection isn't shared yet." />
      ) : sharedCards.length === 0 && inPlayCards.length === 0 ? (
        <PublicCollectionEmptyState title="No cards yet" body="This collection doesn't have any cards yet." />
      ) : (
        <PublicCollectorProfileContent
          slug={profile.slug}
          collectorDisplayName={profile.display_name}
          collectorUserId={profile.user_id}
          cards={sharedCards}
          inPlayCards={inPlayCards}
          isAuthenticated={Boolean(authData.user)}
          viewerUserId={viewerUserId}
          currentPath={`/u/${profile.slug}`}
        />
      )}
    </div>
  );
}
