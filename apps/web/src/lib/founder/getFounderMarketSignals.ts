import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 1000;
const SECTION_LIMIT = 10;
const RECENT_WINDOW_DAYS = 7;
const HOT_WINDOW_HOURS = 48;

type AdminClient = ReturnType<typeof createServerAdminClient>;
type CountMap = Map<string, number>;
type FeedEventType = "open_detail" | "add_to_vault" | "want_on";

type WantRow = {
  card_print_id: string | null;
};

type FeedEventRow = {
  card_print_id: string | null;
};

type CommentRow = {
  card_print_id: string | null;
};

type VaultOwnerRow = {
  card_id: string | null;
  user_id: string | null;
};

type CardMetadataRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  sets:
    | {
        name: string | null;
        identity_model: string | null;
      }
    | {
        name: string | null;
        identity_model: string | null;
      }[]
    | null;
};

type CountEntry = {
  cardPrintId: string;
  count: number;
};

type DemandGapEntry = {
  cardPrintId: string;
  wantCount: number;
  ownerCount: number;
  gapScore: number;
};

type HotRightNowEntry = {
  cardPrintId: string;
  score: number;
  openCount: number;
  addCount: number;
  wantCount: number;
  commentCount: number;
};

type SetMomentumEntry = {
  setCode: string | null;
  setName: string | null;
  score: number;
  wantCount: number;
  openCount: number;
  addCount: number;
  commentCount: number;
};

type SetAccumulator = {
  setCode: string | null;
  setName: string | null;
  wantCount: number;
  openCount: number;
  addCount: number;
  commentCount: number;
};

export type FounderInsightCard = {
  id: string;
  gvId: string | null;
  name: string;
  setCode: string | null;
  setName: string | null;
  number: string | null;
  variant_key: string | null;
  printed_identity_modifier: string | null;
  set_identity_model: string | null;
  imageUrl: string | null;
  imageAltUrl: string | null;
};

export type FounderInsightCardRow = {
  card: FounderInsightCard;
  score: number;
  reason: string;
  signalBreakdown: Record<string, number>;
};

export type FounderInsightSection = {
  title: string;
  description: string;
  scoreLabel: string;
  rows: FounderInsightCardRow[];
  emptyMessage: string;
};

export type FounderInsightSetRow = {
  setCode: string | null;
  setName: string | null;
  score: number;
  reason: string;
  signalBreakdown: Record<string, number>;
};

export type FounderInsightSetSection = {
  title: string;
  description: string;
  scoreLabel: string;
  rows: FounderInsightSetRow[];
  emptyMessage: string;
};

export type FounderInsightBundle = {
  topWanted: FounderInsightSection;
  mostOpened: FounderInsightSection;
  mostAddedToVault: FounderInsightSection;
  demandVsSupplyGap: FounderInsightSection;
  mostDiscussed: FounderInsightSection;
  setMomentum: FounderInsightSetSection;
  hotRightNow: FounderInsightSection;
};

export async function getFounderMarketSignals(
  admin: AdminClient,
): Promise<FounderInsightBundle> {
  const recentWindowStartIso = new Date(
    Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const hotWindowStartIso = new Date(
    Date.now() - HOT_WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const [
    wantCounts,
    openCounts7d,
    addCounts7d,
    commentCounts7d,
    ownerCounts,
    hotOpenCounts,
    hotAddCounts,
    hotWantCounts,
    hotCommentCounts,
  ] = await Promise.all([
    fetchWantCounts(admin),
    fetchRecentEventCounts(admin, "open_detail", recentWindowStartIso),
    fetchRecentEventCounts(admin, "add_to_vault", recentWindowStartIso),
    fetchRecentCommentCounts(admin, recentWindowStartIso),
    fetchActiveOwnerCounts(admin),
    fetchRecentEventCounts(admin, "open_detail", hotWindowStartIso),
    fetchRecentEventCounts(admin, "add_to_vault", hotWindowStartIso),
    fetchRecentEventCounts(admin, "want_on", hotWindowStartIso),
    fetchRecentCommentCounts(admin, hotWindowStartIso),
  ]);

  const topWantedEntries = sortCounts(wantCounts, SECTION_LIMIT);
  const mostOpenedEntries = sortCounts(openCounts7d, SECTION_LIMIT);
  const mostAddedEntries = sortCounts(addCounts7d, SECTION_LIMIT);
  const mostDiscussedEntries = sortCounts(commentCounts7d, SECTION_LIMIT);
  const demandGapEntries = buildDemandGapEntries(
    wantCounts,
    ownerCounts,
  ).slice(0, SECTION_LIMIT);
  const hotRightNowEntries = buildHotRightNowEntries(
    hotOpenCounts,
    hotAddCounts,
    hotWantCounts,
    hotCommentCounts,
  ).slice(0, SECTION_LIMIT);

  const cardMetadataById = await fetchCardMetadataByIds(
    admin,
    new Set<string>([
      ...wantCounts.keys(),
      ...openCounts7d.keys(),
      ...addCounts7d.keys(),
      ...commentCounts7d.keys(),
      ...hotOpenCounts.keys(),
      ...hotAddCounts.keys(),
      ...hotWantCounts.keys(),
      ...hotCommentCounts.keys(),
      ...topWantedEntries.map((entry) => entry.cardPrintId),
      ...mostOpenedEntries.map((entry) => entry.cardPrintId),
      ...mostAddedEntries.map((entry) => entry.cardPrintId),
      ...mostDiscussedEntries.map((entry) => entry.cardPrintId),
      ...demandGapEntries.map((entry) => entry.cardPrintId),
      ...hotRightNowEntries.map((entry) => entry.cardPrintId),
    ]),
  );

  const setMomentumEntries = buildSetMomentumEntries(
    cardMetadataById,
    wantCounts,
    openCounts7d,
    addCounts7d,
    commentCounts7d,
  ).slice(0, SECTION_LIMIT);

  const bundle: FounderInsightBundle = {
    topWanted: {
      title: "Top Wanted",
      description: "Current collector Want intent across canonical cards.",
      scoreLabel: "Wants",
      rows: mapCountEntriesToRows(
        topWantedEntries,
        cardMetadataById,
        "wants",
        (entry) =>
          `${entry.count} ${pluralize(entry.count, "collector")} currently want this card`,
      ),
      emptyMessage:
        "Not enough signal yet. Top Wanted will populate as collectors mark cards they want.",
    },
    mostOpened: {
      title: "Most Opened (7d)",
      description: "Recent card-detail opens from real collector behavior.",
      scoreLabel: "Opens",
      rows: mapCountEntriesToRows(
        mostOpenedEntries,
        cardMetadataById,
        "opens7d",
        (entry) =>
          `Opened ${entry.count} ${pluralize(entry.count, "time")} in the last ${RECENT_WINDOW_DAYS} days`,
      ),
      emptyMessage:
        "Not enough signal yet. Recent open-detail activity will appear here as collectors browse cards.",
    },
    mostAddedToVault: {
      title: "Most Added to Vault (7d)",
      description: "Cards collectors actually moved into ownership in the last week.",
      scoreLabel: "Adds",
      rows: mapCountEntriesToRows(
        mostAddedEntries,
        cardMetadataById,
        "addedToVault7d",
        (entry) =>
          `Added to vault ${entry.count} ${pluralize(entry.count, "time")} in the last ${RECENT_WINDOW_DAYS} days`,
      ),
      emptyMessage:
        "Not enough signal yet. Vault-add behavior will appear here as collectors save cards.",
    },
    demandVsSupplyGap: {
      title: "Demand vs Supply Gap",
      description:
        "Cards where active Want clearly exceeds current active ownership.",
      scoreLabel: "Gap",
      rows: demandGapEntries
        .map<FounderInsightCardRow | null>((entry) => {
          const card = cardMetadataById.get(entry.cardPrintId);
          if (!card) {
            return null;
          }
          return {
            card,
            score: entry.gapScore,
            reason: `${entry.wantCount} wants vs ${entry.ownerCount} current ${pluralize(entry.ownerCount, "owner")}`,
            signalBreakdown: {
              wants: entry.wantCount,
              owners: entry.ownerCount,
              gap: entry.gapScore,
            },
          } satisfies FounderInsightCardRow;
        })
        .filter((row): row is FounderInsightCardRow => row != null),
      emptyMessage:
        "Not enough signal yet. Demand-vs-supply gaps will appear once cards have both Want intent and active ownership.",
    },
    mostDiscussed: {
      title: "Most Discussed",
      description: "Card-anchored discussion activity from the last week.",
      scoreLabel: "Comments",
      rows: mapCountEntriesToRows(
        mostDiscussedEntries,
        cardMetadataById,
        "comments7d",
        (entry) =>
          `Discussed ${entry.count} ${pluralize(entry.count, "time")} in the last ${RECENT_WINDOW_DAYS} days`,
      ),
      emptyMessage:
        "Not enough discussion signal yet. Card-anchored comments will appear here as collectors talk on cards.",
    },
    setMomentum: {
      title: "Set Momentum",
      description:
        "Sets with the strongest blended collector attention across intent and recent interaction.",
      scoreLabel: "Momentum",
      rows: setMomentumEntries.map((entry) => ({
        setCode: entry.setCode,
        setName: entry.setName,
        score: entry.score,
        reason: buildSetMomentumReason(entry),
        signalBreakdown: {
          wantsCurrent: entry.wantCount,
          opens7d: entry.openCount,
          addedToVault7d: entry.addCount,
          comments7d: entry.commentCount,
        },
      })),
      emptyMessage:
        "Set momentum will appear as collectors build a clearer pattern of wants, opens, adds, and discussion.",
    },
    hotRightNow: {
      title: "Hot Right Now",
      description:
        "Short-window cards showing the strongest active demand and interaction right now.",
      scoreLabel: "Hot Score",
      rows: hotRightNowEntries
        .map<FounderInsightCardRow | null>((entry) => {
          const card = cardMetadataById.get(entry.cardPrintId);
          if (!card) {
            return null;
          }
          return {
            card,
            score: entry.score,
            reason: buildHotRightNowReason(entry),
            signalBreakdown: {
              opens48h: entry.openCount,
              wants48h: entry.wantCount,
              addedToVault48h: entry.addCount,
              comments48h: entry.commentCount,
            },
          } satisfies FounderInsightCardRow;
        })
        .filter((row): row is FounderInsightCardRow => row != null),
      emptyMessage:
        "Not enough recent activity yet. Hot Right Now will populate once the last 48 hours have enough collector action.",
    },
  };

  if (process.env.NODE_ENV !== "production") {
    console.info("[founder-market-signals]", {
      topWanted: bundle.topWanted.rows.length,
      mostOpened: bundle.mostOpened.rows.length,
      mostAddedToVault: bundle.mostAddedToVault.rows.length,
      demandVsSupplyGap: bundle.demandVsSupplyGap.rows.length,
      mostDiscussed: bundle.mostDiscussed.rows.length,
      setMomentum: bundle.setMomentum.rows.length,
      hotRightNow: bundle.hotRightNow.rows.length,
    });
  }

  return bundle;
}

function mapCountEntriesToRows(
  entries: CountEntry[],
  cardMetadataById: Map<string, FounderInsightCard>,
  breakdownKey: string,
  reasonBuilder: (entry: CountEntry) => string,
) {
  return entries
    .map<FounderInsightCardRow | null>((entry) => {
      const card = cardMetadataById.get(entry.cardPrintId);
      if (!card) {
        return null;
      }
      return {
        card,
        score: entry.count,
        reason: reasonBuilder(entry),
        signalBreakdown: { [breakdownKey]: entry.count },
      } satisfies FounderInsightCardRow;
    })
    .filter((row): row is FounderInsightCardRow => row != null);
}

async function fetchWantCounts(admin: AdminClient) {
  const counts = new Map<string, number>();
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await admin
      .from("user_card_intents")
      .select("card_print_id")
      .eq("want", true)
      .range(from, to);

    if (error) {
      throw new Error(`Founder market-signal want query failed: ${error.message}`);
    }

    const page = ((data ?? []) as WantRow[]).filter(
      (row) => typeof row.card_print_id === "string" && row.card_print_id.length > 0,
    );

    for (const row of page) {
      const cardPrintId = row.card_print_id as string;
      counts.set(cardPrintId, (counts.get(cardPrintId) ?? 0) + 1);
    }

    if (page.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return counts;
}

async function fetchRecentEventCounts(
  admin: AdminClient,
  eventType: FeedEventType,
  sinceIso: string,
) {
  const counts = new Map<string, number>();
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await admin
      .from("card_feed_events")
      .select("card_print_id")
      .eq("event_type", eventType)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(
        `Founder market-signal ${eventType} query failed: ${error.message}`,
      );
    }

    const page = ((data ?? []) as FeedEventRow[]).filter(
      (row) => typeof row.card_print_id === "string" && row.card_print_id.length > 0,
    );

    for (const row of page) {
      const cardPrintId = row.card_print_id as string;
      counts.set(cardPrintId, (counts.get(cardPrintId) ?? 0) + 1);
    }

    if (page.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return counts;
}

async function fetchRecentCommentCounts(
  admin: AdminClient,
  sinceIso: string,
) {
  const counts = new Map<string, number>();
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await admin
      .from("card_comments")
      .select("card_print_id")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(
        `Founder market-signal comment query failed: ${error.message}`,
      );
    }

    const page = ((data ?? []) as CommentRow[]).filter(
      (row) => typeof row.card_print_id === "string" && row.card_print_id.length > 0,
    );

    for (const row of page) {
      const cardPrintId = row.card_print_id as string;
      counts.set(cardPrintId, (counts.get(cardPrintId) ?? 0) + 1);
    }

    if (page.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return counts;
}

async function fetchActiveOwnerCounts(admin: AdminClient) {
  const ownerIdsByCardId = new Map<string, Set<string>>();
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await admin
      .from("vault_items")
      .select("card_id,user_id")
      .is("archived_at", null)
      .range(from, to);

    if (error) {
      throw new Error(`Founder market-signal owner query failed: ${error.message}`);
    }

    const page = ((data ?? []) as VaultOwnerRow[]).filter(
      (row) =>
        typeof row.card_id === "string" &&
        row.card_id.length > 0 &&
        typeof row.user_id === "string" &&
        row.user_id.length > 0,
    );

    for (const row of page) {
      const cardPrintId = row.card_id as string;
      const userId = row.user_id as string;
      const owners = ownerIdsByCardId.get(cardPrintId) ?? new Set<string>();
      owners.add(userId);
      ownerIdsByCardId.set(cardPrintId, owners);
    }

    if (page.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return new Map<string, number>(
    Array.from(ownerIdsByCardId.entries()).map(([cardPrintId, owners]) => [
      cardPrintId,
      owners.size,
    ]),
  );
}

async function fetchCardMetadataByIds(
  admin: AdminClient,
  cardPrintIds: Set<string>,
) {
  const cardMetadataById = new Map<string, FounderInsightCard>();
  const ids = Array.from(cardPrintIds).filter((value) => value.length > 0);

  if (ids.length === 0) {
    return cardMetadataById;
  }

  for (const batch of chunkArray(ids, 150)) {
    const { data, error } = await admin
      .from("card_prints")
      .select(
        "id,gv_id,name,set_code,number,variant_key,printed_identity_modifier,image_url,image_alt_url,sets(name,identity_model)",
      )
      .in("id", batch);

    if (error) {
      throw new Error(`Founder market-signal card metadata query failed: ${error.message}`);
    }

    for (const row of (data ?? []) as CardMetadataRow[]) {
      const id = row.id?.trim();
      if (!id) {
        continue;
      }
      cardMetadataById.set(id, {
        id,
        gvId: row.gv_id?.trim() || null,
        name: row.name?.trim() || "Unknown card",
        setCode: row.set_code?.trim() || null,
        setName: getSetName(row.sets),
        number: row.number?.trim() || null,
        variant_key: row.variant_key?.trim() || null,
        printed_identity_modifier: row.printed_identity_modifier?.trim() || null,
        set_identity_model: getSetIdentityModel(row.sets),
        imageUrl: row.image_url?.trim() || null,
        imageAltUrl: row.image_alt_url?.trim() || null,
      });
    }
  }

  return cardMetadataById;
}

function buildDemandGapEntries(
  wantCounts: CountMap,
  ownerCounts: CountMap,
) {
  return Array.from(wantCounts.entries())
    .map(([cardPrintId, wantCount]) => {
      const ownerCount = ownerCounts.get(cardPrintId) ?? 0;
      return {
        cardPrintId,
        wantCount,
        ownerCount,
        gapScore: wantCount - ownerCount,
      } satisfies DemandGapEntry;
    })
    .filter((entry) => entry.wantCount > 0 && entry.gapScore > 0)
    .sort(
      (left, right) =>
        right.gapScore - left.gapScore ||
        right.wantCount - left.wantCount ||
        left.ownerCount - right.ownerCount ||
        left.cardPrintId.localeCompare(right.cardPrintId),
    );
}

function buildHotRightNowEntries(
  openCounts: CountMap,
  addCounts: CountMap,
  wantCounts: CountMap,
  commentCounts: CountMap,
) {
  const cardIds = new Set<string>([
    ...openCounts.keys(),
    ...addCounts.keys(),
    ...wantCounts.keys(),
    ...commentCounts.keys(),
  ]);

  return Array.from(cardIds)
    .map((cardPrintId) => {
      const openCount = openCounts.get(cardPrintId) ?? 0;
      const addCount = addCounts.get(cardPrintId) ?? 0;
      const wantCount = wantCounts.get(cardPrintId) ?? 0;
      const commentCount = commentCounts.get(cardPrintId) ?? 0;
      const score = openCount + wantCount * 2 + addCount * 3 + commentCount;
      return {
        cardPrintId,
        score,
        openCount,
        addCount,
        wantCount,
        commentCount,
      } satisfies HotRightNowEntry;
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.wantCount - left.wantCount ||
        right.addCount - left.addCount ||
        right.openCount - left.openCount ||
        right.commentCount - left.commentCount ||
        left.cardPrintId.localeCompare(right.cardPrintId),
    );
}

function buildSetMomentumEntries(
  cardMetadataById: Map<string, FounderInsightCard>,
  wantCounts: CountMap,
  openCounts: CountMap,
  addCounts: CountMap,
  commentCounts: CountMap,
) {
  const bySet = new Map<string, SetAccumulator>();

  addCountsToSetAccumulator(bySet, cardMetadataById, wantCounts, "wantCount");
  addCountsToSetAccumulator(bySet, cardMetadataById, openCounts, "openCount");
  addCountsToSetAccumulator(bySet, cardMetadataById, addCounts, "addCount");
  addCountsToSetAccumulator(bySet, cardMetadataById, commentCounts, "commentCount");

  return Array.from(bySet.values())
    .map((entry) => ({
      ...entry,
      score:
        entry.wantCount +
        entry.openCount +
        entry.addCount +
        entry.commentCount,
    }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.wantCount - left.wantCount ||
        right.openCount - left.openCount ||
        right.addCount - left.addCount ||
        right.commentCount - left.commentCount ||
        (left.setName ?? left.setCode ?? "Unknown set").localeCompare(
          right.setName ?? right.setCode ?? "Unknown set",
        ),
    );
}

function addCountsToSetAccumulator(
  bySet: Map<string, SetAccumulator>,
  cardMetadataById: Map<string, FounderInsightCard>,
  counts: CountMap,
  field: keyof Pick<
    SetAccumulator,
    "wantCount" | "openCount" | "addCount" | "commentCount"
  >,
) {
  for (const [cardPrintId, count] of counts.entries()) {
    if (count <= 0) {
      continue;
    }

    const card = cardMetadataById.get(cardPrintId);
    if (!card) {
      continue;
    }

    const key = getSetKey(card);
    const current = bySet.get(key) ?? {
      setCode: card.setCode,
      setName: card.setName,
      wantCount: 0,
      openCount: 0,
      addCount: 0,
      commentCount: 0,
    };

    current[field] += count;
    if (!current.setCode && card.setCode) {
      current.setCode = card.setCode;
    }
    if (!current.setName && card.setName) {
      current.setName = card.setName;
    }
    bySet.set(key, current);
  }
}

function sortCounts(counts: CountMap, limit: number) {
  return Array.from(counts.entries())
    .map(([cardPrintId, count]) => ({ cardPrintId, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.cardPrintId.localeCompare(right.cardPrintId),
    )
    .slice(0, limit);
}

function buildSetMomentumReason(entry: SetMomentumEntry) {
  return `High collector attention this week: ${joinCountParts([
    countPart(entry.wantCount, "want"),
    countPart(entry.openCount, "open"),
    countPart(entry.addCount, "add"),
    countPart(entry.commentCount, "discussion"),
  ])}`;
}

function buildHotRightNowReason(entry: HotRightNowEntry) {
  return `Hot in the last ${HOT_WINDOW_HOURS}h: ${joinCountParts([
    countPart(entry.openCount, "open"),
    countPart(entry.wantCount, "want"),
    countPart(entry.addCount, "add"),
    countPart(entry.commentCount, "discussion"),
  ])}`;
}

function countPart(count: number, singular: string, plural?: string) {
  if (count <= 0) {
    return null;
  }

  return `${count} ${pluralize(count, singular, plural)}`;
}

function joinCountParts(parts: Array<string | null>) {
  const values = parts.filter((value): value is string => value != null);
  return values.length > 0 ? values.join(", ") : "No recent signal";
}

function getSetKey(card: FounderInsightCard) {
  if (card.setCode) {
    return `code:${card.setCode.toLowerCase()}`;
  }
  if (card.setName) {
    return `name:${card.setName.toLowerCase()}`;
  }
  return `unknown:${card.id}`;
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function getSetName(value: CardMetadataRow["sets"]): string | null {
  if (Array.isArray(value)) {
    const first = value.find(
      (entry) => typeof entry?.name === "string" && entry.name.trim().length > 0,
    );
    return first?.name?.trim() ?? null;
  }
  if (value && typeof value.name === "string" && value.name.trim().length > 0) {
    return value.name.trim();
  }
  return null;
}

function getSetIdentityModel(value: CardMetadataRow["sets"]): string | null {
  if (Array.isArray(value)) {
    const first = value.find(
      (entry) =>
        typeof entry?.identity_model === "string" &&
        entry.identity_model.trim().length > 0,
    );
    return first?.identity_model?.trim() ?? null;
  }

  if (
    value &&
    typeof value.identity_model === "string" &&
    value.identity_model.trim().length > 0
  ) {
    return value.identity_model.trim();
  }

  return null;
}

function pluralize(count: number, singular: string, plural?: string) {
  if (count === 1) {
    return singular;
  }
  return plural ?? `${singular}s`;
}
