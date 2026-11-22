import "server-only";

import {cache} from "react";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {createServerAdminClient} from "@/lib/supabase/admin";
import {parsePublicPlayables, type PublicPlayables} from "./publicPlayables";

export const getPokemonPlayables = cache(async (): Promise<PublicPlayables | null> => {
  try {
    let body: string;
    const preview = process.env.POKEMON_PLAYABLES_PREVIEW_DIRECTORY;
    if (process.env.NODE_ENV !== "production" && preview) {
      body = await readFile(path.join(preview, "standard-usage/current.json"), "utf8");
    } else {
      if (!process.env.SUPABASE_SECRET_KEY) return null;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const result = await Promise.race([
        createServerAdminClient().storage.from("pokemon-playables-private").download("standard-usage/current.json"),
        new Promise<null>(resolve => {timer = setTimeout(() => resolve(null), 1500);}),
      ]).finally(() => clearTimeout(timer));
      if (!result) return null;
      const {data, error} = result;
      if (error || !data || data.size > 4 * 1024 * 1024) return null;
      body = await data.text();
    }
    if (Buffer.byteLength(body) > 4 * 1024 * 1024) return null;
    return parsePublicPlayables(JSON.parse(body));
  } catch {
    return null;
  }
});
