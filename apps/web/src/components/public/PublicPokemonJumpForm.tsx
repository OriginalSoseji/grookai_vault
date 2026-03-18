"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type PublicPokemonJumpFormProps = {
  slug: string;
  defaultValue?: string;
  variant?: "default" | "compact";
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

export function PublicPokemonJumpForm({
  slug,
  defaultValue = "",
  variant = "default",
}: PublicPokemonJumpFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      className={
        variant === "compact"
          ? "rounded-[1.35rem] border border-slate-200 bg-white p-3"
          : "rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4"
      }
    >
      <div className={`flex flex-col gap-3 ${variant === "compact" ? "sm:flex-row sm:items-end" : "md:flex-row md:items-end"}`}>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
            {variant === "compact" ? "Find a Pokemon" : "Pokémon"}
          </p>
          <label htmlFor="public-pokemon-route" className="sr-only">
            View a Pokémon collection
          </label>
          <input
            id="public-pokemon-route"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={variant === "compact" ? "Search this collection" : "Search your Pokémon"}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300"
          />
          <p className="text-xs text-slate-500">
            {variant === "compact" ? "Jump straight to a Pokémon in this collection." : "Jump to a Pokémon in this collection."}
          </p>
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
        >
          View Pokémon
        </button>
      </div>
    </form>
  );
}
