"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PublicPokemonJumpFormProps = {
  slug: string;
  defaultValue?: string;
};

function toPokemonRouteSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function PublicPokemonJumpForm({ slug, defaultValue = "" }: PublicPokemonJumpFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pokemonSlug = toPokemonRouteSlug(value);
    if (!pokemonSlug) {
      return;
    }

    router.push(`/u/${slug}/pokemon/${pokemonSlug}`);
  }

  return (
    <form
      id="pokemon-browser"
      onSubmit={handleSubmit}
      className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Pokemon</p>
          <label htmlFor="public-pokemon-route" className="sr-only">
            Browse a Pokemon collection
          </label>
          <input
            id="public-pokemon-route"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search a Pokemon name"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300"
          />
          <p className="text-xs text-slate-500">Open a Pokemon-specific collection view, such as Pikachu or Charizard.</p>
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Open Pokemon View
        </button>
      </div>
    </form>
  );
}
