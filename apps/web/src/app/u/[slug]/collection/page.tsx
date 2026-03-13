import type { Metadata } from "next";
import Link from "next/link";
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
      title: "Collection not found | Grookai Vault",
    };
  }

  const siteOrigin = getSiteOrigin();
  const title = `${profile.display_name} Collection | Grookai Vault`;
  const description = `${profile.display_name}'s public collection on Grookai Vault.`;

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
  const sharedSetCount = new Set(sharedCards.map((card) => card.set_name?.trim()).filter(Boolean)).size;
  const stats: PublicCollectorStat[] =
    profile.vault_sharing_enabled && sharedCards.length > 0
      ? [
          { value: `${sharedCards.length}`, label: sharedCards.length === 1 ? "card in collection" : "cards in collection" },
          { value: `${sharedSetCount}`, label: sharedSetCount === 1 ? "set represented" : "sets represented" },
        ]
      : [];
  const description = profile.vault_sharing_enabled
    ? "A collector profile and public collection showcase on Grookai Vault."
    : "A collector profile on Grookai Vault. Collection sharing is not enabled yet.";

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
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Public collection</h2>
          </div>
          <Link href={`/u/${profile.slug}`} className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
            View profile
          </Link>
        </div>
        {!profile.vault_sharing_enabled ? (
          <PublicCollectionEmptyState
            title="Collection not shared yet"
            body="This collector has not enabled public collection sharing."
          />
        ) : sharedCards.length === 0 ? (
          <PublicCollectionEmptyState
            title="No cards shared yet"
            body="This collector has not added any cards to their public collection yet."
          />
        ) : (
          <PublicCollectionGrid cards={sharedCards} />
        )}
      </section>
    </div>
  );
}
