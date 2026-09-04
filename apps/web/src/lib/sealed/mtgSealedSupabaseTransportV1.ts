import type { SupabaseClient } from "@supabase/supabase-js";

import {
  MTG_SEALED_IMAGE_SIGNED_URL_TTL_SECONDS_V1,
  mtgSealedRpcNameV1,
  type MtgSealedClientTransportV1,
} from "./mtgSealedClientV1.ts";

const MTG_SEALED_SIGN_IMAGE_FUNCTION_V1 = "mtg-sealed-sign-image-v1";

type SignedImageResponseV1 = {
  signed_url?: unknown;
  expires_in?: unknown;
};

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
      if (
        input.expiresInSeconds !== MTG_SEALED_IMAGE_SIGNED_URL_TTL_SECONDS_V1
      ) {
        throw new Error("Invalid signed sealed image TTL.");
      }
      const { data, error } = await client.functions.invoke<SignedImageResponseV1>(
        MTG_SEALED_SIGN_IMAGE_FUNCTION_V1,
        {
          body: {
            storage_bucket: input.bucket,
            object_path: input.objectPath,
          },
        },
      );
      const signedUrl = typeof data?.signed_url === "string"
        ? data.signed_url.trim()
        : "";
      if (
        error || !signedUrl ||
        data?.expires_in !== MTG_SEALED_IMAGE_SIGNED_URL_TTL_SECONDS_V1
      ) {
        throw new Error(error?.message ?? "Missing signed sealed image URL.");
      }
      return signedUrl;
    },
  };
}
