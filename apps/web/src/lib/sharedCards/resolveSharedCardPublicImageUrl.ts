/**
 * LEGACY SYSTEM DISABLED
 *
 * This system used user_card_images + shared_cards.
 * It is no longer aligned with GVVI media pipeline.
 *
 * Do NOT re-enable.
 * Future public image system must be built on USER_IMAGE_PIPELINE_CONTRACT_V1.
 */
export function resolveSharedCardPublicImageUrl(_storagePath: string | null | undefined) {
  return null;
}
