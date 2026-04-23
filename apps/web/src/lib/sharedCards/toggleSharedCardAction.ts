"use server";

/**
 * DEPRECATED COMPATIBILITY MUTATION LAYER
 *
 * This file previously mutated grouped/shared-card state.
 * All mutation authority has been removed.
 *
 * RULES:
 * - must not perform writes
 * - must not be used for ownership/trust mutation
 * - exists only for compatibility read support or legacy routing
 */

export const GROUPED_COMPATIBILITY_MUTATION_BLOCK_MESSAGE =
  "RUNTIME_ENFORCEMENT: grouped compatibility mutation paths are deprecated and blocked. Use exact-copy owner-write flows.";

export const BLOCKED_GROUPED_COMPATIBILITY_WRITE_PATHS = [
  "shared_cards_delete_by_user_card",
  "shared_cards_upsert_by_user_card",
] as const;

export type ToggleSharedCardInput = {
  itemId?: string;
  gvViId?: string | null;
  nextShared: boolean;
};

export type ToggleSharedCardResult =
  | {
      ok: true;
      status: "shared" | "unshared";
      itemId: string;
    }
  | {
      ok: false;
      itemId: string;
      message: string;
    };

export async function toggleSharedCardAction(
  _input: ToggleSharedCardInput,
): Promise<ToggleSharedCardResult> {
  throw new Error(GROUPED_COMPATIBILITY_MUTATION_BLOCK_MESSAGE);
}
