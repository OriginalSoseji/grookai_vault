import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import FollowCollectorButton from "@/components/public/FollowCollectorButton";
import { PublicCollectorHeader, type PublicCollectorStat } from "@/components/public/PublicCollectorHeader";
import { PublicCollectorProfileContent } from "@/components/public/PublicCollectorProfileContent";
import { getCollectorFollowCounts } from "@/lib/follows/getCollectorFollowCounts";
import { getCollectorFollowState } from "@/lib/follows/getCollectorFollowState";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { deriveTopSetCodesFromCards } from "@/lib/profileSetIdentity";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import { createServerComponentClient } from "@/lib/supabase/server";
import { getPublicCollectorWallSectionsBySlug } from "@/lib/wallSections/getPublicCollectorWallSectionsBySlug";
import { getPublicSectionBySlugAndId } from "@/lib/wallSections/getPublicSectionBySlugAndId";
import { getPublicSectionShareHref } from "@/lib/wallSections/wallSectionTypes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicSectionPageProps = {
  params: {
    slug: string;
    section_id: string;
  };
};

export async function generateMetadata({ params }: PublicSectionPageProps): Promise<Metadata> {
  const model = await getPublicSectionBySlugAndId(params.slug, params.section_id);

  if (!model) {
    return {
      title: "Section not found | Grookai Vault",
    };
  }

  const siteOrigin = getSiteOrigin();
  const sectionPath = getPublicSectionShareHref(model.collector.slug, model.section.id);
  const title = `${model.section.name} | ${model.collector.display_name} | Grookai Vault`;
  const description = `${model.collector.display_name}'s ${model.section.name} on Grookai.`;

  return {
    title,
    description,
    alternates: siteOrigin
      ? {
          canonical: `${siteOrigin}${sectionPath}`,
        }
      : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      url: siteOrigin ? `${siteOrigin}${sectionPath}` : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicSectionPage({ params }: PublicSectionPageProps) {
  const model = await getPublicSectionBySlugAndId(params.slug, params.section_id);

  if (!model) {
    notFound();
  }

  const profile = model.collector;
  const sectionPath = getPublicSectionShareHref(profile.slug, model.section.id);
  const requestedPath = getPublicSectionShareHref(params.slug, params.section_id);
  const requestedIsCanonical = params.slug === profile.slug && params.section_id === model.section.id;
  if (!requestedIsCanonical || requestedPath !== sectionPath) {
    redirect(sectionPath);
  }

  const supabase = createServerComponentClient();
  const [{ data: authData }, followCounts, sectionViews] = await Promise.all([
    supabase.auth.getUser(),
    getCollectorFollowCounts(profile.user_id),
    getPublicCollectorWallSectionsBySlug(profile.slug),
  ]);
  const selectedSection = sectionViews.find((section) => section.kind === "custom" && section.id === model.section.id);
  if (!selectedSection) {
    notFound();
  }

  const viewerUserId = authData.user?.id ?? null;
  const isOwnProfile = viewerUserId === profile.user_id;
  const initialIsFollowing =
    viewerUserId && !isOwnProfile ? await getCollectorFollowState(viewerUserId, profile.user_id) : false;
  const profileSetLogoPathMap = await getSetLogoAssetPathMap(deriveTopSetCodesFromCards(model.cards));
  const setCount = new Set(model.cards.map((card) => card.set_name?.trim()).filter(Boolean)).size;
  const stats: PublicCollectorStat[] =
    model.cards.length > 0
      ? [
          { value: `${model.cards.length}`, label: model.cards.length === 1 ? "card" : "cards" },
          { value: `${setCount}`, label: setCount === 1 ? "set" : "sets" },
        ]
      : [];

  return (
    <div className="space-y-8 py-8">
      <PublicCollectorHeader
        displayName={profile.display_name}
        slug={profile.slug}
        description={`${model.section.name} from ${profile.display_name}'s Wall.`}
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
            isAuthenticated={Boolean(authData.user)}
            isOwnProfile={isOwnProfile}
            initialIsFollowing={initialIsFollowing}
            loginHref={`/login?next=${encodeURIComponent(sectionPath)}`}
          />
        }
      />

      <PublicCollectorProfileContent
        slug={profile.slug}
        collectorDisplayName={profile.display_name}
        collectorUserId={profile.user_id}
        sections={sectionViews}
        isAuthenticated={Boolean(authData.user)}
        viewerUserId={viewerUserId}
        currentPath={sectionPath}
        selectedSectionId={model.section.id}
      />
    </div>
  );
}
