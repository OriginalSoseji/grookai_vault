import "server-only";

import { createServerAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 1000;
const SECTION_LIMIT = 10;
const RECENT_WINDOW_DAYS = 7;

type AdminClient = ReturnType<typeof createServerAdminClient>;

type WantRow = {
  card_print_id: string | null;
};

type FeedEventRow = {
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

export type FounderInsightCard = {
  id: string;
  gvId: string | null;
  name: string;
  setCode: string | null;
  setName: string | null;
  number: string | null;
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

export type FounderInsightBundle = {
  topWanted: FounderInsightSection;
  mostOpened: FounderInsightSection;
  mostAddedToVault: FounderInsightSection;
  demandVsSupplyGap: FounderInsightSection;
};

export async function getFounderMarketSignals(
  admin: AdminClient,
): Promise<FounderInsightBundle> {
  const recentWindowStartIso = new Date(
    Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [wantCounts, openCounts, addCounts, ownerCounts] = await Promise.all([
    fetchWantCounts(admin),
    fetchRecentEventCounts(admin, "open_detail", recentWindowStartIso),
    fetchRecentEventCounts(admin, "add_to_vault", recentWindowStartIso),
    fetchActiveOwnerCounts(admin),
  ]);

  const topWantedEntries = sortCounts(wantCounts, SECTION_LIMIT);
  const mostOpenedEntries = sortCounts(openCounts, SECTION_LIMIT);
  const mostAddedEntries = sortCounts(addCounts, SECTION_LIMIT);
  const demandGapEntries = buildDemandGapEntries(
    wantCounts,
    ownerCounts,
  ).slice(0, SECTION_LIMIT);

  const cardMetadataById = await fetchCardMetadataByIds(
    admin,
    new Set<string>([
      ...topWantedEntries.map((entry) => entry.cardPrintId),
      ...mostOpenedEntries.map((entry) => entry.cardPrintId),
      ...mostAddedEntries.map((entry) => entry.cardPrintId),
      ...demandGapEntries.map((entry) => entry.cardPrintId),
    ]),
  );

  const bundle: FounderInsightBundle = {
    topWanted: {
      title: "Top Wanted",
      description: "Current collector Want intent across canonical cards.",
      scoreLabel: "Wants",
      rows: topWantedEntries
          .map<FounderInsightCardRow | null>((entry) => {
            const card = cardMetadataById.get(entry.cardPrintId);
            if (!card) {
              return null;
            }
            return {
              card,
              score: entry.count,
              reason: `${entry.count} ${pluralize(entry.count, "collector")} currently want this card`,
              signalBreakdown: { wants: entry.count },
            } satisfies FounderInsightCardRow;
          })
          .filter((row): row is FounderInsightCardRow => row != null),
      emptyMessage:
        "Not enough signal yet. Top Wanted will populate as collectors mark cards they want.",
    },
    mostOpened: {
      title: "Most Opened (7d)",
      description: "Recent card-detail opens from real collector behavior.",
      scoreLabel: "Opens",
      rows: mostOpenedEntries
          .map<FounderInsightCardRow | null>((entry) => {
            const card = cardMetadataById.get(entry.cardPrintId);
            if (!card) {
              return null;
            }
            return {
              card,
              score: entry.count,
              reason: `Opened ${entry.count} ${pluralize(entry.count, "time")} in the last ${RECENT_WINDOW_DAYS} days`,
              signalBreakdown: { opens7d: entry.count },
            } satisfies FounderInsightCardRow;
          })
          .filter((row): row is FounderInsightCardRow => row != null),
      emptyMessage:
        "Not enough signal yet. Recent open-detail activity will appear here as collectors browse cards.",
    },
    mostAddedToVault: {
      title: "Most Added to Vault (7d)",
      description: "Cards collectors actually moved into ownership in the last week.",
      scoreLabel: "Adds",
      rows: mostAddedEntries
          .map<FounderInsightCardRow | null>((entry) => {
            const card = cardMetadataById.get(entry.cardPrintId);
            if (!card) {
              return null;
            }
            return {
              card,
              score: entry.count,
              reason: `Added to vault ${entry.count} ${pluralize(entry.count, "time")} in the last ${RECENT_WINDOW_DAYS} days`,
              signalBreakdown: { addedToVault7d: entry.count },
            } satisfies FounderInsightCardRow;
          })
          .filter((row): row is FounderInsightCardRow => row != null),
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
  };

  if (process.env.NODE_ENV !== "production") {
    console.info("[founder-market-signals]", {
      topWanted: bundle.topWanted.rows.length,
      mostOpened: bundle.mostOpened.rows.length,
      mostAddedToVault: bundle.mostAddedToVault.rows.length,
      demandVsSupplyGap: bundle.demandVsSupplyGap.rows.length,
    });
  }

  return bundle;
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
  eventType: "open_detail" | "add_to_vault",
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

  for (const batch of chunkArray(ids, 150)) {
    const { data, error } = await admin
      .from("card_prints")
      .select("id,gv_id,name,set_code,number,image_url,image_alt_url,sets(name)")
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
        imageUrl: row.image_url?.trim() || null,
        imageAltUrl: row.image_alt_url?.trim() || null,
      });
    }
  }

  return cardMetadataById;
}

function buildDemandGapEntries(
  wantCounts: Map<string, number>,
  ownerCounts: Map<string, number>,
) {
  return Array.from(wantCounts.entries())
    .map(([cardPrintId, wantCount]) => {
      const ownerCount = ownerCounts.get(cardPrintId) ?? 0;
      return {
        cardPrintId,
        wantCount,
        ownerCount,
        gapScore: wantCount - ownerCount,
      };
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

function sortCounts(counts: Map<string, number>, limit: number) {
  return Array.from(counts.entries())
    .map(([cardPrintId, count]) => ({ cardPrintId, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.cardPrintId.localeCompare(right.cardPrintId),
    )
    .slice(0, limit);
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function getSetName(
  value: CardMetadataRow["sets"],
): string | null {
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry?.name === "string" && entry.name.trim().length > 0);
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
