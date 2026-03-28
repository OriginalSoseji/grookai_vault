"use server";

/**
 * LEGACY SYSTEM DISABLED
 *
 * This system used user_card_images + shared_cards.
 * It is no longer aligned with GVVI media pipeline.
 *
 * Do NOT re-enable.
 * Future public image system must be built on USER_IMAGE_PIPELINE_CONTRACT_V1.
 */

export type ToggleSharedCardPublicImageInput = {
  cardId: string;
  side: "front" | "back";
  enabled: boolean;
};

export type ToggleSharedCardPublicImageResult =
  | {
      ok: true;
      side: "front" | "back";
      enabled: boolean;
      publicImageUrl: string | null;
    }
  | {
      ok: false;
      side: "front" | "back";
      message: string;
    };

export async function toggleSharedCardPublicImageAction(
  _input: ToggleSharedCardPublicImageInput,
): Promise<ToggleSharedCardPublicImageResult> {
  throw new Error("Legacy public image system is disabled. Use GVVI media pipeline.");
}
