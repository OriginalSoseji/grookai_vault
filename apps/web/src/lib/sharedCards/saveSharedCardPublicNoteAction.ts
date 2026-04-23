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

import { GROUPED_COMPATIBILITY_MUTATION_BLOCK_MESSAGE } from "@/lib/sharedCards/toggleSharedCardAction";

export const BLOCKED_GROUPED_PUBLIC_NOTE_WRITE_PATHS = [
  "shared_cards_update_public_note",
] as const;

export type SaveSharedCardPublicNoteInput = {
  itemId?: string;
  gvViId?: string | null;
  note: string;
};

export type SaveSharedCardPublicNoteResult =
  | {
      ok: true;
      itemId: string;
      publicNote: string | null;
    }
  | {
      ok: false;
      itemId: string;
      message: string;
    };

export async function saveSharedCardPublicNoteAction(
  _input: SaveSharedCardPublicNoteInput,
): Promise<SaveSharedCardPublicNoteResult> {
  throw new Error(GROUPED_COMPATIBILITY_MUTATION_BLOCK_MESSAGE);
}
