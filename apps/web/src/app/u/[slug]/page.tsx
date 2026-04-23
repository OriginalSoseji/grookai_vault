import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import FollowCollectorButton from "@/components/public/FollowCollectorButton";
import { PublicCollectorHeader, type PublicCollectorStat } from "@/components/public/PublicCollectorHeader";
import { PublicCollectorProfileContent } from "@/components/public/PublicCollectorProfileContent";
import { getCollectorFollowCounts } from "@/lib/follows/getCollectorFollowCounts";
import { getPublicProfileBySlug } from "@/lib/getPublicProfileBySlug";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { deriveTopSetCodesFromCards } from "@/lib/profileSetIdentity";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import type { PublicWallCard } from "@/lib/sharedCards/publicWall.shared";
import { getPublicCollectorWallViewBySlug } from "@/lib/wallSections/getPublicCollectorWallViewBySlug";
import { PUBLIC_WALL_SECTION_ID } from "@/lib/wallSections/wallSectionTypes";

export const revalidate = 60;

function dedupePublicWallCards(cards: PublicWallCard[]) {
  const cardByKey = new Map<string, PublicWallCard>();

  for (const card of cards) {
    const key = card.gv_vi_id ?? card.vault_item_id ?? card.card_print_id ?? card.gv_id;
    if (!cardByKey.has(key)) {
      cardByKey.set(key, card);
    }
  }

  return [...cardByKey.values()];
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const profile = await getPublicProfileBySlug(params.slug);
  if (!profile) {
    return {
      title: "Profile not found | Grookai Vault",
    };
  }

  const siteOrigin = getSiteOrigin();
  const title = `${profile.display_name} | Grookai Vault`;
  const description = `${profile.display_name}'s Wall on Grookai.`;

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

export default async function PublicProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  const profile = await getPublicProfileBySlug(params.slug);

  if (!profile) {
    notFound();
  }

  const [sectionViews, followCounts] = await Promise.all([
    profile.vault_sharing_enabled ? getPublicCollectorWallViewBySlug(profile.slug) : Promise.resolve([]),
    getCollectorFollowCounts(profile.user_id),
  ]);
  const renderableCards = dedupePublicWallCards(sectionViews.find((section) => section.id === PUBLIC_WALL_SECTION_ID)?.cards ?? []);
  const profileSetLogoPathMap = await getSetLogoAssetPathMap(deriveTopSetCodesFromCards(renderableCards));
  const setCount = new Set(renderableCards.map((card) => card.set_name?.trim()).filter(Boolean)).size;
  const stats: PublicCollectorStat[] =
    profile.vault_sharing_enabled && renderableCards.length > 0
      ? [
          { value: `${renderableCards.length}`, label: renderableCards.length === 1 ? "card" : "cards" },
          { value: `${setCount}`, label: setCount === 1 ? "set" : "sets" },
        ]
      : [];

  const description = profile.vault_sharing_enabled ? `${profile.display_name}'s Wall on Grookai.` : "A Wall on Grookai.";

  return (
    <div className="space-y-8 py-8">
      <PublicCollectorHeader
        displayName={profile.display_name}
        slug={profile.slug}
        description={description}
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
            loginHref={`/login?next=${encodeURIComponent(`/u/${profile.slug}`)}`}
          />
        }
      />

      {!profile.vault_sharing_enabled ? (
        <PublicCollectionEmptyState title="Nothing to show right now." />
      ) : (
        <PublicCollectorProfileContent
          slug={profile.slug}
          collectorDisplayName={profile.display_name}
          collectorUserId={profile.user_id}
          sections={sectionViews}
          isAuthenticated={false}
          viewerUserId={null}
          currentPath={`/u/${profile.slug}`}
          selectedSectionId={PUBLIC_WALL_SECTION_ID}
        />
      )}
    </div>
  );
}
