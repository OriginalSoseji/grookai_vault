import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { PublicCollectionGrid } from "@/components/public/PublicCollectionGrid";
import { PublicCollectorHeader, type PublicCollectorStat } from "@/components/public/PublicCollectorHeader";
import { getPublicProfileBySlug } from "@/lib/getPublicProfileBySlug";
import { getSharedCardsBySlug } from "@/lib/getSharedCardsBySlug";
import { getSiteOrigin } from "@/lib/getSiteOrigin";

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

  const sharedCards = profile.vault_sharing_enabled ? await getSharedCardsBySlug(profile.slug) : [];
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
        stats={stats}
        activeView="collection"
      />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Collection</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Collection</h2>
          </div>
        </div>
        {!profile.vault_sharing_enabled ? (
          <PublicCollectionEmptyState title="Collection not shared yet" body="This collection isn't shared yet." />
        ) : sharedCards.length === 0 ? (
          <PublicCollectionEmptyState title="No cards yet" body="This collection doesn't have any cards yet." />
        ) : (
          <PublicCollectionGrid cards={sharedCards} />
        )}
      </section>
    </div>
  );
}
