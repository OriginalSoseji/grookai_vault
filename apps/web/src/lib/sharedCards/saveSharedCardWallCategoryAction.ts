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

import type { WallCategory } from "@/lib/sharedCards/wallCategories";
import { GROUPED_COMPATIBILITY_MUTATION_BLOCK_MESSAGE } from "@/lib/sharedCards/toggleSharedCardAction";

export const BLOCKED_GROUPED_WALL_CATEGORY_WRITE_PATHS = [
  "shared_cards_update_wall_category",
] as const;

export type SaveSharedCardWallCategoryInput = {
  itemId?: string;
  gvViId?: string | null;
  wallCategory?: string | null;
};

export type SaveSharedCardWallCategoryResult =
  | {
      ok: true;
      itemId: string;
      wallCategory: WallCategory | null;
    }
  | {
      ok: false;
      itemId: string;
      message: string;
    };

export async function saveSharedCardWallCategoryAction(
  _input: SaveSharedCardWallCategoryInput,
): Promise<SaveSharedCardWallCategoryResult> {
  throw new Error(GROUPED_COMPATIBILITY_MUTATION_BLOCK_MESSAGE);
}
