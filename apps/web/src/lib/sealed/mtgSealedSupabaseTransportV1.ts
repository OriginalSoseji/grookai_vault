import type { SupabaseClient } from "@supabase/supabase-js";

import {
  mtgSealedRpcNameV1,
  type MtgSealedClientTransportV1,
} from "./mtgSealedClientV1";

export function createMtgSealedSupabaseTransportV1(
  client: SupabaseClient,
): MtgSealedClientTransportV1 {
  return {
    async isAuthenticated() {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      return data.user != null;
    },
    async fetchRows(input) {
      const { data, error } = await client.rpc(mtgSealedRpcNameV1, {
        p_game_key: input.gameKey,
        p_query: input.query,
        p_limit: input.limit,
        p_offset: input.offset,
      });
      return {
        data,
        error: error ? new Error(error.message) : null,
      };
    },
    async createSignedImageUrl(input) {
      const { data, error } = await client.storage
        .from(input.bucket)
        .createSignedUrl(input.objectPath, input.expiresInSeconds);
      if (error || !data?.signedUrl) {
        throw new Error(error?.message ?? "Missing signed sealed image URL.");
      }
      return data.signedUrl;
    },
  };
}
