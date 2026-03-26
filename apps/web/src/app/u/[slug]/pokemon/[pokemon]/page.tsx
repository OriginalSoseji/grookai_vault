import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicCollectionEmptyState } from "@/components/public/PublicCollectionEmptyState";
import { PublicCollectionGrid } from "@/components/public/PublicCollectionGrid";
import { PublicCollectorHeader, type PublicCollectorStat } from "@/components/public/PublicCollectorHeader";
import { PublicPokemonJumpForm } from "@/components/public/PublicPokemonJumpForm";
import { getPublicProfileBySlug } from "@/lib/getPublicProfileBySlug";
import {
  filterSharedCardsByPokemonSlug,
  formatPokemonSlugLabel,
  getSharedCardsBySlug,
  normalizePokemonSlug,
} from "@/lib/getSharedCardsBySlug";
import { getSiteOrigin } from "@/lib/getSiteOrigin";
import { deriveTopSetCodesFromCards } from "@/lib/profileSetIdentity";
import { getSetLogoAssetPathMap } from "@/lib/setLogoAssets";
import { createServerComponentClient } from "@/lib/supabase/server";

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
  const description = `${profile.display_name}'s ${pokemonLabel} collection on Grookai.`;

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
  const supabase = createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profileSetLogoPathMap = await getSetLogoAssetPathMap(deriveTopSetCodesFromCards(sharedCards));
  const matchingCards = profile.vault_sharing_enabled ? filterSharedCardsByPokemonSlug(sharedCards, params.pokemon) : [];
  const matchingSetCount = new Set(matchingCards.map((card) => card.set_name?.trim()).filter(Boolean)).size;
  const stats: PublicCollectorStat[] =
    profile.vault_sharing_enabled && matchingCards.length > 0
      ? [
          { value: `${matchingCards.length}`, label: matchingCards.length === 1 ? "card" : "cards" },
          { value: `${matchingSetCount}`, label: matchingSetCount === 1 ? "set" : "sets" },
        ]
      : [];
  const description = profile.vault_sharing_enabled
    ? `${pokemonLabel} in ${profile.display_name}'s collection on Grookai.`
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

      <section className="space-y-4">
        <div className="flex flex-col gap-4 rounded-[1.6rem] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/60 sm:px-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Pokémon</p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{pokemonLabel} Collection</h2>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link href={`/u/${profile.slug}`} className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
                View profile
              </Link>
              <Link href={`/u/${profile.slug}/collection`} className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
                Collection
              </Link>
            </div>
          </div>
          <PublicPokemonJumpForm slug={profile.slug} defaultValue={pokemonLabel} variant="compact" />
        </div>
        {!profile.vault_sharing_enabled ? (
          <PublicCollectionEmptyState title="Collection not shared yet" body="This collection isn't shared yet." />
        ) : matchingCards.length === 0 ? (
          <PublicCollectionEmptyState title="No cards found" body={`No cards match ${pokemonLabel}.`} />
        ) : (
          <PublicCollectionGrid
            cards={matchingCards}
            viewerUserId={user?.id ?? null}
            ownerUserId={profile.user_id}
          />
        )}
      </section>
    </div>
  );
}
