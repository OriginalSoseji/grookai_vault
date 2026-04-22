import "server-only";

import { getPublicProvisionalCards } from "@/lib/provisional/getPublicProvisionalCards";
import type { PublicProvisionalCard } from "@/lib/provisional/publicProvisionalTypes";

const DISCOVERY_PROVISIONAL_CARD_LIMIT = 6;

// LOCK: Discovery provisional cards must come only from the public provisional adapter.
// LOCK: Never expose raw warehouse rows in feed surfaces.
export async function getDiscoveryProvisionalCards(
  limit = DISCOVERY_PROVISIONAL_CARD_LIMIT,
): Promise<PublicProvisionalCard[]> {
  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.trunc(limit), 1), 12)
    : DISCOVERY_PROVISIONAL_CARD_LIMIT;

  return getPublicProvisionalCards({
    limit: safeLimit,
  });
}
