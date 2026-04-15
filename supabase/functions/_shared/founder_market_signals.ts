import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const PAGE_SIZE = 1000;
const SECTION_LIMIT = 10;
const RECENT_WINDOW_DAYS = 7;
const HOT_WINDOW_HOURS = 48;

type AdminClient = ReturnType<typeof createClient>;
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
  image_url: string | null;
  image_alt_url: string | null;
  sets:
    | {
        name: string | null;
      }
    | {
        name: string | null;
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

type SetAccumulator = {
  setCode: string | null;
  setName: string | null;
  wantCount: number;
  openCount: number;
  addCount: number;
  commentCount: number;
};

type SetMomentumEntry = SetAccumulator & {
  score: number;
};

type CardSignal = {
  id: string;
  gvId: string | null;
  name: string;
  setCode: string | null;
  setName: string | null;
  number: string | null;
  imageUrl: string | null;
  imageAltUrl: string | null;
};

export type FounderMarketSignalCardRow = {
  row_type: "card";
  card_print_id: string;
  gv_id: string | null;
  name: string;
  set_code: string | null;
  set_name: string | null;
  number: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  score: number;
  reason: string;
  signal_breakdown: Record<string, number>;
};

export type FounderMarketSignalSetRow = {
  row_type: "set";
  set_code: string | null;
  set_name: string | null;
  score: number;
  reason: string;
  signal_breakdown: Record<string, number>;
};

export type FounderMarketSignalSection = {
  key: string;
  title: string;
  description: string;
  score_label: string;
  row_type: "card" | "set";
  empty_message: string;
  rows: Array<FounderMarketSignalCardRow | FounderMarketSignalSetRow>;
};

export type FounderMarketSignalBundle = {
  generated_at: string;
  sections: FounderMarketSignalSection[];
};

export async function loadFounderMarketSignals(
  admin: AdminClient,
): Promise<FounderMarketSignalBundle> {
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

  return {
    generated_at: new Date().toISOString(),
    sections: [
      {
        key: "top_wanted",
        title: "Top Wanted",
        description: "Current collector Want intent across canonical cards.",
        score_label: "Wants",
        row_type: "card",
        rows: mapCountEntriesToCardRows(
          topWantedEntries,
          cardMetadataById,
          "wants",
          (entry) =>
            `${entry.count} ${pluralize(entry.count, "collector")} currently want this card`,
        ),
        empty_message:
          "Not enough signal yet. Top Wanted will populate as collectors mark cards they want.",
      },
      {
        key: "most_opened",
        title: "Most Opened (7d)",
        description: "Recent card-detail opens from real collector behavior.",
        score_label: "Opens",
        row_type: "card",
        rows: mapCountEntriesToCardRows(
          mostOpenedEntries,
          cardMetadataById,
          "opens7d",
          (entry) =>
            `Opened ${entry.count} ${pluralize(entry.count, "time")} in the last ${RECENT_WINDOW_DAYS} days`,
        ),
        empty_message:
          "Not enough signal yet. Recent open-detail activity will appear here as collectors browse cards.",
      },
      {
        key: "most_added_to_vault",
        title: "Most Added to Vault (7d)",
        description:
          "Cards collectors actually moved into ownership in the last week.",
        score_label: "Adds",
        row_type: "card",
        rows: mapCountEntriesToCardRows(
          mostAddedEntries,
          cardMetadataById,
          "addedToVault7d",
          (entry) =>
            `Added to vault ${entry.count} ${pluralize(entry.count, "time")} in the last ${RECENT_WINDOW_DAYS} days`,
        ),
        empty_message:
          "Not enough signal yet. Vault-add behavior will appear here as collectors save cards.",
      },
      {
        key: "demand_vs_supply_gap",
        title: "Demand vs Supply Gap",
        description:
          "Cards where active Want clearly exceeds current active ownership.",
        score_label: "Gap",
        row_type: "card",
        rows: demandGapEntries
          .map<FounderMarketSignalCardRow | null>((entry) => {
            const card = cardMetadataById.get(entry.cardPrintId);
            if (!card) {
              return null;
            }
            return buildCardRow(
              card,
              entry.gapScore,
              `${entry.wantCount} wants vs ${entry.ownerCount} current ${pluralize(entry.ownerCount, "owner")}`,
              {
                wants: entry.wantCount,
                owners: entry.ownerCount,
                gap: entry.gapScore,
              },
            );
          })
          .filter(
            (row): row is FounderMarketSignalCardRow => row != null,
          ),
        empty_message:
          "Not enough signal yet. Demand-vs-supply gaps will appear once cards have both Want intent and active ownership.",
      },
      {
        key: "most_discussed",
        title: "Most Discussed",
        description: "Card-anchored discussion activity from the last week.",
        score_label: "Comments",
        row_type: "card",
        rows: mapCountEntriesToCardRows(
          mostDiscussedEntries,
          cardMetadataById,
          "comments7d",
          (entry) =>
            `Discussed ${entry.count} ${pluralize(entry.count, "time")} in the last ${RECENT_WINDOW_DAYS} days`,
        ),
        empty_message:
          "Not enough discussion signal yet. Card-anchored comments will appear here as collectors talk on cards.",
      },
      {
        key: "set_momentum",
        title: "Set Momentum",
        description:
          "Sets with the strongest blended collector attention across intent and recent interaction.",
        score_label: "Momentum",
        row_type: "set",
        rows: setMomentumEntries.map((entry) => ({
          row_type: "set",
          set_code: entry.setCode,
          set_name: entry.setName,
          score: entry.score,
          reason: buildSetMomentumReason(entry),
          signal_breakdown: {
            wantsCurrent: entry.wantCount,
            opens7d: entry.openCount,
            addedToVault7d: entry.addCount,
            comments7d: entry.commentCount,
          },
        })),
        empty_message:
          "Set momentum will appear as collectors build a clearer pattern of wants, opens, adds, and discussion.",
      },
      {
        key: "hot_right_now",
        title: "Hot Right Now",
        description:
          "Short-window cards showing the strongest active demand and interaction right now.",
        score_label: "Hot Score",
        row_type: "card",
        rows: hotRightNowEntries
          .map<FounderMarketSignalCardRow | null>((entry) => {
            const card = cardMetadataById.get(entry.cardPrintId);
            if (!card) {
              return null;
            }
            return buildCardRow(
              card,
              entry.score,
              buildHotRightNowReason(entry),
              {
                opens48h: entry.openCount,
                wants48h: entry.wantCount,
                addedToVault48h: entry.addCount,
                comments48h: entry.commentCount,
              },
            );
          })
          .filter(
            (row): row is FounderMarketSignalCardRow => row != null,
          ),
        empty_message:
          "Not enough recent activity yet. Hot Right Now will populate once the last 48 hours have enough collector action.",
      },
    ],
  };
}

function buildCardRow(
  card: CardSignal,
  score: number,
  reason: string,
  signalBreakdown: Record<string, number>,
): FounderMarketSignalCardRow {
  return {
    row_type: "card",
    card_print_id: card.id,
    gv_id: card.gvId,
    name: card.name,
    set_code: card.setCode,
    set_name: card.setName,
    number: card.number,
    image_url: card.imageUrl,
    image_alt_url: card.imageAltUrl,
    score,
    reason,
    signal_breakdown: signalBreakdown,
  };
}

function mapCountEntriesToCardRows(
  entries: CountEntry[],
  cardMetadataById: Map<string, CardSignal>,
  breakdownKey: string,
  reasonBuilder: (entry: CountEntry) => string,
) {
  return entries
    .map<FounderMarketSignalCardRow | null>((entry) => {
      const card = cardMetadataById.get(entry.cardPrintId);
      if (!card) {
        return null;
      }
      return buildCardRow(card, entry.count, reasonBuilder(entry), {
        [breakdownKey]: entry.count,
      });
    })
    .filter((row): row is FounderMarketSignalCardRow => row != null);
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
      throw new Error(
        `Founder market-signal want query failed: ${error.message}`,
      );
    }

    const page = ((data ?? []) as WantRow[]).filter(
      (row) =>
        typeof row.card_print_id === "string" && row.card_print_id.length > 0,
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
      (row) =>
        typeof row.card_print_id === "string" && row.card_print_id.length > 0,
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

async function fetchRecentCommentCounts(admin: AdminClient, sinceIso: string) {
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
      (row) =>
        typeof row.card_print_id === "string" && row.card_print_id.length > 0,
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
      throw new Error(
        `Founder market-signal owner query failed: ${error.message}`,
      );
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
  const cardMetadataById = new Map<string, CardSignal>();
  const ids = Array.from(cardPrintIds).filter((value) => value.length > 0);

  if (ids.length === 0) {
    return cardMetadataById;
  }

  for (const batch of chunkArray(ids, 150)) {
    const { data, error } = await admin
      .from("card_prints")
      .select("id,gv_id,name,set_code,number,image_url,image_alt_url,sets(name)")
      .in("id", batch);

    if (error) {
      throw new Error(
        `Founder market-signal card metadata query failed: ${error.message}`,
      );
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
        imageUrl: row.image_url?.trim() || null,
        imageAltUrl: row.image_alt_url?.trim() || null,
      });
    }
  }

  return cardMetadataById;
}

function buildDemandGapEntries(wantCounts: CountMap, ownerCounts: CountMap) {
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
  cardMetadataById: Map<string, CardSignal>,
  wantCounts: CountMap,
  openCounts: CountMap,
  addCounts: CountMap,
  commentCounts: CountMap,
) {
  const bySet = new Map<string, SetAccumulator>();

  addCountsToSetAccumulator(bySet, cardMetadataById, wantCounts, "wantCount");
  addCountsToSetAccumulator(bySet, cardMetadataById, openCounts, "openCount");
  addCountsToSetAccumulator(bySet, cardMetadataById, addCounts, "addCount");
  addCountsToSetAccumulator(
    bySet,
    cardMetadataById,
    commentCounts,
    "commentCount",
  );

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
  cardMetadataById: Map<string, CardSignal>,
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
        right.count - left.count ||
        left.cardPrintId.localeCompare(right.cardPrintId),
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

function getSetKey(card: CardSignal) {
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
      (entry) =>
        typeof entry?.name === "string" && entry.name.trim().length > 0,
    );
    return first?.name?.trim() ?? null;
  }
  if (value && typeof value.name === "string" && value.name.trim().length > 0) {
    return value.name.trim();
  }
  return null;
}

function pluralize(count: number, singular: string, plural?: string) {
  if (count === 1) {
    return singular;
  }
  return plural ?? `${singular}s`;
}
