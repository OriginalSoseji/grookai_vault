import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicCardImage from "@/components/PublicCardImage";
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
  const description = `${profile.display_name}'s shared ${pokemonLabel} collection on Grookai Vault.`;

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

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
      <div className="mx-auto max-w-xl space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="text-sm leading-7 text-slate-600">{body}</p>
      </div>
    </section>
  );
}

function formatSetCountLabel(count: number) {
  return `${count} ${count === 1 ? "set" : "sets"} represented`;
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

  return (
    <div className="space-y-8 py-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm shadow-slate-200/70 md:px-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Shared Pokemon collection</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
            {profile.display_name}&apos;s {pokemonLabel} Collection
          </h1>
          <p className="text-sm font-medium tracking-[0.08em] text-slate-500">/u/{profile.slug}/pokemon/{params.pokemon}</p>
          <p className="max-w-2xl text-base leading-7 text-slate-600">Shared Pokemon collection</p>
          {profile.vault_sharing_enabled && matchingCards.length > 0 ? (
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                {matchingCards.length} card{matchingCards.length === 1 ? "" : "s"}
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                {formatSetCountLabel(matchingSetCount)}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            <Link href={`/u/${profile.slug}`} className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
              Back to profile
            </Link>
            <Link
              href={`/u/${profile.slug}/collection`}
              className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
            >
              View shared collection
            </Link>
          </div>
        </div>
      </section>

      {!profile.vault_sharing_enabled ? (
        <EmptyState title="Collection not shared yet" body="This collector has not enabled public collection sharing." />
      ) : matchingCards.length === 0 ? (
        <EmptyState title="No matching cards" body="No shared cards matched this Pokemon." />
      ) : (
        <section className="space-y-4">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {matchingCards.map((card) => (
              <Link
                key={card.gv_id}
                href={`/card/${card.gv_id}`}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <PublicCardImage
                  src={card.image_url}
                  alt={card.name}
                  imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-6"
                  fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
                  fallbackLabel={card.name}
                />
                <div className="space-y-2 border-t border-slate-200 px-5 py-5">
                  <p className="line-clamp-2 text-[1.35rem] font-semibold tracking-tight text-slate-950">{card.name}</p>
                  <p className="text-sm text-slate-600">
                    {[card.set_name, card.number !== "—" ? `#${card.number}` : undefined, card.rarity].filter(Boolean).join(" • ")}
                  </p>
                  {card.public_note ? <p className="text-sm leading-7 text-slate-600">{card.public_note}</p> : null}
                  {card.back_image_url ? (
                    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
                      <div className="border-b border-slate-200 px-4 py-2">
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Back Photo</p>
                      </div>
                      <PublicCardImage
                        src={card.back_image_url}
                        alt={`${card.name} back`}
                        imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-4"
                        fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
                        fallbackLabel={`${card.name} back`}
                      />
                    </div>
                  ) : null}
                  <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{card.gv_id}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
