import type { BinderSummary } from "./types";

/** One bounded dashboard page, in the authority's order. Never infer global emptiness. */
export function selectBinderContinuation(items: BinderSummary[], hasNextPage: boolean) {
  const incomplete = items.filter((item) => item.lifecycle === "active" &&
    (item.totalSlots === 0 || item.completedSlots < item.totalSlots));
  return {
    items: incomplete.slice(0, 3),
    hasMore: hasNextPage || incomplete.length > 3,
    hasNoBinders: items.length === 0 && !hasNextPage,
  };
}

export type BinderContinuation = ReturnType<typeof selectBinderContinuation>;
