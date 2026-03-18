import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { PublicCollectorHeader, type PublicCollectorStat } from "@/components/public/PublicCollectorHeader";
import { PublicCollectorProfileContent } from "@/components/public/PublicCollectorProfileContent";
import { getPublicProfileBySlug } from "@/lib/getPublicProfileBySlug";
import { getSharedCardsBySlug } from "@/lib/getSharedCardsBySlug";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { deriveTopSetCodesFromCards } from "@/lib/profileSetIdentity";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const profile = await getPublicProfileBySlug(params.slug);
  if (!profile) {
    return {
      title: "Collection not found | Grookai Vault",
    };
  }

  const siteOrigin = getSiteOrigin();
  const title = `${profile.display_name} Collection | Grookai Vault`;
  const description = `${profile.display_name}'s collection on Grookai.`;

  return {
    title,
    description,
    alternates: siteOrigin
      ? {
          canonical: `${siteOrigin}/u/${profile.slug}/collection`,
        }
      : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      url: siteOrigin ? `${siteOrigin}/u/${profile.slug}/collection` : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicCollectionPage({ params }: { params: { slug: string } }) {
  const profile = await getPublicProfileBySlug(params.slug);

  if (!profile) {
    notFound();
  }

  const sharedCards = profile.vault_sharing_enabled ? await getSharedCardsBySlug(profile.slug) : [];
  const profileSetLogoPathMap = await getSetLogoAssetPathMap(deriveTopSetCodesFromCards(sharedCards));
  const sharedSetCount = new Set(sharedCards.map((card) => card.set_name?.trim()).filter(Boolean)).size;
  const stats: PublicCollectorStat[] =
    profile.vault_sharing_enabled && sharedCards.length > 0
      ? [
          { value: `${sharedCards.length}`, label: sharedCards.length === 1 ? "card" : "cards" },
          { value: `${sharedSetCount}`, label: sharedSetCount === 1 ? "set" : "sets" },
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
        avatarUrl={profile.avatar_url}
        bannerUrl={profile.banner_url}
        stats={stats}
        setLogoPaths={[...profileSetLogoPathMap.values()].slice(0, 3)}
      />

      <div className="flex justify-end">
        <Link href={`/u/${profile.slug}`} className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
          View profile
        </Link>
      </div>

      {!profile.vault_sharing_enabled ? (
        <PublicCollectionEmptyState title="Collection not shared yet" body="This collection isn't shared yet." />
      ) : sharedCards.length === 0 ? (
        <PublicCollectionEmptyState title="No cards yet" body="This collection doesn't have any cards yet." />
      ) : (
        <PublicCollectorProfileContent
          slug={profile.slug}
          cards={sharedCards}
          collectionTitle="Shared Collection"
          collectionEyebrow="Collection"
          collectionDescription="A cleaner browse through everything this collector has chosen to show."
        />
      )}
    </div>
  );
}
