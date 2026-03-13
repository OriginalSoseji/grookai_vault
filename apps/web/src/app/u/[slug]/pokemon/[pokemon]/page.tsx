import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { PublicCollectionGrid } from "@/components/public/PublicCollectionGrid";
import { PublicCollectorHeader, type PublicCollectorStat } from "@/components/public/PublicCollectorHeader";
import { getPublicProfileBySlug } from "@/lib/getPublicProfileBySlug";
import {
  filterSharedCardsByPokemonSlug,
  formatPokemonSlugLabel,
  getSharedCardsBySlug,
  normalizePokemonSlug,
} from "@/lib/getSharedCardsBySlug";
import { getSiteOrigin } from "@/lib/getSiteOrigin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: { slug: string; pokemon: string };
}): Promise<Metadata> {
  const profile = await getPublicProfileBySlug(params.slug);
  const pokemonLabel = formatPokemonSlugLabel(params.pokemon);

  if (!profile || !normalizePokemonSlug(params.pokemon)) {
    return {
      title: "Collection not found | Grookai Vault",
    };
  }

  const siteOrigin = getSiteOrigin();
  const title = `${profile.display_name}'s ${pokemonLabel} Collection | Grookai Vault`;
  const description = `${profile.display_name}'s ${pokemonLabel} collection on Grookai Vault.`;

  return {
    title,
    description,
    alternates: siteOrigin
      ? {
          canonical: `${siteOrigin}/u/${profile.slug}/pokemon/${params.pokemon}`,
        }
      : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      url: siteOrigin ? `${siteOrigin}/u/${profile.slug}/pokemon/${params.pokemon}` : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicPokemonCollectionPage({
  params,
}: {
  params: { slug: string; pokemon: string };
}) {
  const profile = await getPublicProfileBySlug(params.slug);
  const pokemonLabel = formatPokemonSlugLabel(params.pokemon);
  const normalizedPokemon = normalizePokemonSlug(params.pokemon);

  if (!profile || !normalizedPokemon) {
    notFound();
  }

  const sharedCards = profile.vault_sharing_enabled ? await getSharedCardsBySlug(profile.slug) : [];
  const matchingCards = profile.vault_sharing_enabled ? filterSharedCardsByPokemonSlug(sharedCards, params.pokemon) : [];
  const matchingSetCount = new Set(matchingCards.map((card) => card.set_name?.trim()).filter(Boolean)).size;
  const stats: PublicCollectorStat[] =
    profile.vault_sharing_enabled && matchingCards.length > 0
      ? [
          { value: `${matchingCards.length}`, label: matchingCards.length === 1 ? "card in collection" : "cards in collection" },
          { value: `${matchingSetCount}`, label: matchingSetCount === 1 ? "set represented" : "sets represented" },
        ]
      : [];
  const description = profile.vault_sharing_enabled
    ? `${pokemonLabel} cards from this collector's public collection.`
    : "A collector profile on Grookai Vault. Collection sharing is not enabled yet.";

  return (
    <div className="space-y-8 py-8">
      <PublicCollectorHeader
        displayName={profile.display_name}
        slug={profile.slug}
        description={description}
        stats={stats}
        activeView="pokemon"
        defaultPokemonValue={pokemonLabel}
      />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Pokemon</p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{pokemonLabel} Collection</h2>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href={`/u/${profile.slug}`} className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
              View profile
            </Link>
            <Link href={`/u/${profile.slug}/collection`} className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
              Collection route
            </Link>
          </div>
        </div>
        {!profile.vault_sharing_enabled ? (
          <PublicCollectionEmptyState
            title="Collection not shared yet"
            body="This collector has not enabled public collection sharing."
          />
        ) : matchingCards.length === 0 ? (
          <PublicCollectionEmptyState title="No matching cards" body="No shared cards matched this Pokemon." />
        ) : (
          <PublicCollectionGrid cards={matchingCards} />
        )}
      </section>
    </div>
  );
}
