import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const PAGE_SIZE = 1000;
const CARD_BATCH_SIZE = 150;
const HOT_CARD_LIMIT = 5;
const TOP_DRIVER_LIMIT = 5;
const SEVEN_DAY_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAY_MS = 30 * 24 * 60 * 60 * 1000;
const UNDERSTOCKED_WANT_THRESHOLD = 1;

type AdminClient = ReturnType<typeof createClient>;
type FeedEventType = "open_detail" | "add_to_vault" | "want_on";
type MetricKey = "opens" | "adds" | "comments" | "want_on";

type CardMetadataRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  set_id: string | null;
  set_code: string | null;
  number: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  set:
    | {
        id: string | null;
        name: string | null;
        code: string | null;
      }
    | {
        id: string | null;
        name: string | null;
        code: string | null;
      }[]
    | null;
};

type WantRow = {
  card_print_id: string | null;
};

type FeedEventRow = {
  card_print_id: string | null;
  event_type: FeedEventType | null;
  created_at: string | null;
};

type CommentRow = {
  card_print_id: string | null;
  created_at: string | null;
};

type OwnerRow = {
  user_id: string | null;
};

type CardSignal = {
  id: string;
  gvId: string | null;
  name: string;
  setId: string | null;
  setCode: string | null;
  setName: string | null;
  number: string | null;
  imageUrl: string | null;
  imageAltUrl: string | null;
};

type MetricWindow = {
  opens: number;
  adds: number;
  comments: number;
  wantOn: number;
};

export type FounderDrilldownCardSummary = {
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
  recommendation: string | null;
};

export type FounderSetDriverSummary = {
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
  breakdown: {
    want: number;
    open: number;
    add: number;
    comments: number;
  };
  recommendation: string | null;
};

export type FounderCardSignalDrilldown = {
  generated_at: string;
  kind: "card";
  card: {
    card_print_id: string;
    gv_id: string | null;
    name: string;
    set_id: string | null;
    set_code: string | null;
    set_name: string | null;
    number: string | null;
    image_url: string | null;
    image_alt_url: string | null;
  };
  current: {
    active_wants: number;
    active_owners: number;
    demand_supply_gap: number;
  };
  metrics_7d: {
    opens_7d: number;
    adds_7d: number;
    comments_7d: number;
    want_on_7d: number;
  };
  metrics_30d: {
    opens_30d: number;
    adds_30d: number;
    comments_30d: number;
    want_on_30d: number;
  };
  previous_7d: {
    opens_previous_7d: number;
    adds_previous_7d: number;
    comments_previous_7d: number;
    want_on_previous_7d: number;
  };
  deltas: {
    opens_delta: number;
    adds_delta: number;
    comments_delta: number;
    want_delta: number;
  };
  recommendation: string | null;
  insight_summary: string[];
  summary_lines: string[];
};

export type FounderSetSignalDrilldown = {
  generated_at: string;
  kind: "set";
  set: {
    set_id: string | null;
    set_code: string | null;
    set_name: string | null;
  };
  current: {
    active_wants: number;
    cards_with_signal: number;
  };
  metrics_7d: {
    opens_7d: number;
    adds_7d: number;
    comments_7d: number;
    want_on_7d: number;
  };
  metrics_30d: {
    opens_30d: number;
    adds_30d: number;
    comments_30d: number;
    want_on_30d: number;
  };
  previous_7d: {
    opens_previous_7d: number;
    adds_previous_7d: number;
    comments_previous_7d: number;
    want_on_previous_7d: number;
  };
  deltas: {
    opens_delta: number;
    adds_delta: number;
    comments_delta: number;
    want_delta: number;
  };
  top_drivers: FounderSetDriverSummary[];
  top_cards: FounderDrilldownCardSummary[];
  summary_lines: string[];
};

export async function loadFounderCardSignalDrilldown(
  admin: AdminClient,
  cardPrintId: string,
): Promise<FounderCardSignalDrilldown> {
  const now = Date.now();
  const since30Iso = new Date(now - THIRTY_DAY_MS).toISOString();

  const [card, activeWantCount, activeOwnerCount, eventRows, commentRows] =
    await Promise.all([
      fetchCardMetadata(admin, cardPrintId),
      fetchCurrentWantCount(admin, cardPrintId),
      fetchCurrentOwnerCount(admin, cardPrintId),
      fetchFeedEventRowsForCards(admin, [cardPrintId], since30Iso),
      fetchCommentRowsForCards(admin, [cardPrintId], since30Iso),
    ]);

  if (!card) {
    throw new Error("card_not_found");
  }

  const eventMetrics = buildMetricWindowsByCard(eventRows, now).get(card.id) ??
    emptyMetricWindows();
  const commentMetrics = buildCommentWindowsByCard(commentRows, now).get(
    card.id,
  ) ?? emptyMetricWindows();
  const metrics7d = mergeMetricWindows(eventMetrics.sevenDay, commentMetrics.sevenDay);
  const metrics30d = mergeMetricWindows(eventMetrics.thirtyDay, commentMetrics.thirtyDay);
  const previous7d = mergeMetricWindows(
    eventMetrics.previousSevenDay,
    commentMetrics.previousSevenDay,
  );
  const deltas = buildMetricDeltas(metrics7d, previous7d);
  const demandGap = activeWantCount - activeOwnerCount;
  const recommendation = buildCardRecommendation(activeWantCount, activeOwnerCount);

  return {
    generated_at: new Date().toISOString(),
    kind: "card",
    card: {
      card_print_id: card.id,
      gv_id: card.gvId,
      name: card.name,
      set_id: card.setId,
      set_code: card.setCode,
      set_name: card.setName,
      number: card.number,
      image_url: card.imageUrl,
      image_alt_url: card.imageAltUrl,
    },
    current: {
      active_wants: activeWantCount,
      active_owners: activeOwnerCount,
      demand_supply_gap: demandGap,
    },
    metrics_7d: {
      opens_7d: metrics7d.opens,
      adds_7d: metrics7d.adds,
      comments_7d: metrics7d.comments,
      want_on_7d: metrics7d.wantOn,
    },
    metrics_30d: {
      opens_30d: metrics30d.opens,
      adds_30d: metrics30d.adds,
      comments_30d: metrics30d.comments,
      want_on_30d: metrics30d.wantOn,
    },
    previous_7d: {
      opens_previous_7d: previous7d.opens,
      adds_previous_7d: previous7d.adds,
      comments_previous_7d: previous7d.comments,
      want_on_previous_7d: previous7d.wantOn,
    },
    deltas: {
      opens_delta: deltas.opens,
      adds_delta: deltas.adds,
      comments_delta: deltas.comments,
      want_delta: deltas.wantOn,
    },
    recommendation,
    insight_summary: buildCardInsightSummary({
      activeWantCount,
      activeOwnerCount,
      demandGap,
      metrics7d,
      deltas,
      recommendation,
    }),
    summary_lines: buildCardSummaryLines({
      activeWantCount,
      activeOwnerCount,
      demandGap,
      deltas,
      metrics7d,
    }),
  };
}

export async function loadFounderSetSignalDrilldown(
  admin: AdminClient,
  input: { setCode: string },
): Promise<FounderSetSignalDrilldown> {
  const setCode = input.setCode.trim();
  if (!setCode) {
    throw new Error("set_not_found");
  }

  const now = Date.now();
  const since30Iso = new Date(now - THIRTY_DAY_MS).toISOString();
  const cards = await fetchCardsForSetCode(admin, setCode);
  if (cards.length === 0) {
    throw new Error("set_not_found");
  }

  const cardIds = cards.map((card) => card.id);
  const [wantRows, eventRows, commentRows] = await Promise.all([
    fetchWantRowsForCards(admin, cardIds),
    fetchFeedEventRowsForCards(admin, cardIds, since30Iso),
    fetchCommentRowsForCards(admin, cardIds, since30Iso),
  ]);

  const wantCounts = countRowsByCardId(wantRows);
  const eventMetricsByCard = buildMetricWindowsByCard(eventRows, now);
  const commentMetricsByCard = buildCommentWindowsByCard(commentRows, now);

  const metrics7d = emptyMetricWindow();
  const metrics30d = emptyMetricWindow();
  const previous7d = emptyMetricWindow();
  const scoredCards = cards.map((card) => {
    const eventMetrics = eventMetricsByCard.get(card.id) ?? emptyMetricWindows();
    const commentMetrics = commentMetricsByCard.get(card.id) ?? emptyMetricWindows();
    const sevenDay = mergeMetricWindows(
      eventMetrics.sevenDay,
      commentMetrics.sevenDay,
    );
    const previous = mergeMetricWindows(
      eventMetrics.previousSevenDay,
      commentMetrics.previousSevenDay,
    );
    const thirtyDay = mergeMetricWindows(
      eventMetrics.thirtyDay,
      commentMetrics.thirtyDay,
    );

    addMetricWindow(metrics7d, sevenDay);
    addMetricWindow(metrics30d, thirtyDay);
    addMetricWindow(previous7d, previous);

    const activeWants = wantCounts.get(card.id) ?? 0;
    const recommendation = buildCardRecommendation(activeWants, 0);
    const score = driverScore(activeWants, sevenDay);

    return {
      card,
      score,
      reason: buildTopDriverReason(activeWants, sevenDay),
      breakdown: {
        want: activeWants,
        open: sevenDay.opens,
        add: sevenDay.adds,
        comments: sevenDay.comments,
      },
      signalBreakdown: {
        wantsCurrent: activeWants,
        opens7d: sevenDay.opens,
        adds7d: sevenDay.adds,
        comments7d: sevenDay.comments,
        wantOn7d: sevenDay.wantOn,
      },
      recommendation,
    };
  }).filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.card.name.localeCompare(right.card.name),
    );

  const topDrivers = scoredCards
    .slice(0, TOP_DRIVER_LIMIT)
    .map<FounderSetDriverSummary>((entry) => ({
      card_print_id: entry.card.id,
      gv_id: entry.card.gvId,
      name: entry.card.name,
      set_code: entry.card.setCode,
      set_name: entry.card.setName,
      number: entry.card.number,
      image_url: entry.card.imageUrl,
      image_alt_url: entry.card.imageAltUrl,
      score: entry.score,
      reason: entry.reason,
      breakdown: entry.breakdown,
      recommendation: entry.recommendation,
    }));

  const topCards = scoredCards
    .slice(0, HOT_CARD_LIMIT)
    .map<FounderDrilldownCardSummary>((entry) => ({
      card_print_id: entry.card.id,
      gv_id: entry.card.gvId,
      name: entry.card.name,
      set_code: entry.card.setCode,
      set_name: entry.card.setName,
      number: entry.card.number,
      image_url: entry.card.imageUrl,
      image_alt_url: entry.card.imageAltUrl,
      score: entry.score,
      reason: entry.reason,
      signal_breakdown: entry.signalBreakdown,
      recommendation: entry.recommendation,
    }));

  const setCardSignalCount = new Set<string>([
    ...Array.from(wantCounts.keys()),
    ...Array.from(eventMetricsByCard.keys()),
    ...Array.from(commentMetricsByCard.keys()),
  ]).size;
  const activeWants = Array.from(wantCounts.values()).reduce((sum, value) => sum + value, 0);
  const deltas = buildMetricDeltas(metrics7d, previous7d);
  const setIdentity = {
    set_id: cards[0]?.setId ?? null,
    set_code: cards[0]?.setCode ?? setCode,
    set_name: cards[0]?.setName ?? null,
  };

  return {
    generated_at: new Date().toISOString(),
    kind: "set",
    set: setIdentity,
    current: {
      active_wants: activeWants,
      cards_with_signal: setCardSignalCount,
    },
    metrics_7d: {
      opens_7d: metrics7d.opens,
      adds_7d: metrics7d.adds,
      comments_7d: metrics7d.comments,
      want_on_7d: metrics7d.wantOn,
    },
    metrics_30d: {
      opens_30d: metrics30d.opens,
      adds_30d: metrics30d.adds,
      comments_30d: metrics30d.comments,
      want_on_30d: metrics30d.wantOn,
    },
    previous_7d: {
      opens_previous_7d: previous7d.opens,
      adds_previous_7d: previous7d.adds,
      comments_previous_7d: previous7d.comments,
      want_on_previous_7d: previous7d.wantOn,
    },
    deltas: {
      opens_delta: deltas.opens,
      adds_delta: deltas.adds,
      comments_delta: deltas.comments,
      want_delta: deltas.wantOn,
    },
    top_drivers: topDrivers,
    top_cards: topCards,
    summary_lines: buildSetSummaryLines({
      activeWants,
      cardsWithSignal: setCardSignalCount,
      topDrivers,
      metrics7d,
      previous7d,
      deltas,
    }),
  };
}

async function fetchCardMetadata(
  admin: AdminClient,
  cardPrintId: string,
): Promise<CardSignal | null> {
  const { data, error } = await admin
    .from("card_prints")
    .select(
      "id,gv_id,name,set_id,set_code,number,image_url,image_alt_url,set:sets(id,name,code)",
    )
    .eq("id", cardPrintId)
    .maybeSingle();

  if (error) {
    throw new Error(`Founder drilldown card metadata query failed: ${error.message}`);
  }

  return data ? mapCardMetadataRow(data as CardMetadataRow) : null;
}

async function fetchCardsForSetCode(admin: AdminClient, setCode: string) {
  const cards: CardSignal[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await admin
      .from("card_prints")
      .select(
        "id,gv_id,name,set_id,set_code,number,image_url,image_alt_url,set:sets(id,name,code)",
      )
      .eq("set_code", setCode)
      .range(from, to);

    if (error) {
      throw new Error(`Founder drilldown set card query failed: ${error.message}`);
    }

    const page = ((data ?? []) as CardMetadataRow[])
      .map((row) => mapCardMetadataRow(row))
      .filter((row): row is CardSignal => row != null);

    cards.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return cards;
}

async function fetchCurrentWantCount(admin: AdminClient, cardPrintId: string) {
  const { count, error } = await admin
    .from("user_card_intents")
    .select("card_print_id", { count: "exact", head: true })
    .eq("card_print_id", cardPrintId)
    .eq("want", true);

  if (error) {
    throw new Error(`Founder drilldown want count query failed: ${error.message}`);
  }

  return count ?? 0;
}

async function fetchCurrentOwnerCount(admin: AdminClient, cardPrintId: string) {
  const ownerIds = new Set<string>();
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await admin
      .from("vault_items")
      .select("user_id")
      .eq("card_id", cardPrintId)
      .is("archived_at", null)
      .range(from, to);

    if (error) {
      throw new Error(`Founder drilldown owner query failed: ${error.message}`);
    }

    const page = (data ?? []) as OwnerRow[];
    for (const row of page) {
      if (typeof row.user_id === "string" && row.user_id.length > 0) {
        ownerIds.add(row.user_id);
      }
    }

    if (page.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return ownerIds.size;
}

async function fetchWantRowsForCards(admin: AdminClient, cardIds: string[]) {
  const rows: WantRow[] = [];
  for (const batch of chunkArray(cardIds, CARD_BATCH_SIZE)) {
    let from = 0;
    while (true) {
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await admin
        .from("user_card_intents")
        .select("card_print_id")
        .in("card_print_id", batch)
        .eq("want", true)
        .range(from, to);

      if (error) {
        throw new Error(`Founder drilldown want rows query failed: ${error.message}`);
      }

      const page = (data ?? []) as WantRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) {
        break;
      }
      from += PAGE_SIZE;
    }
  }
  return rows;
}

async function fetchFeedEventRowsForCards(
  admin: AdminClient,
  cardIds: string[],
  sinceIso: string,
) {
  const rows: FeedEventRow[] = [];
  for (const batch of chunkArray(cardIds, CARD_BATCH_SIZE)) {
    let from = 0;
    while (true) {
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await admin
        .from("card_feed_events")
        .select("card_print_id,event_type,created_at")
        .in("card_print_id", batch)
        .in("event_type", ["open_detail", "add_to_vault", "want_on"])
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Founder drilldown event query failed: ${error.message}`);
      }

      const page = (data ?? []) as FeedEventRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) {
        break;
      }
      from += PAGE_SIZE;
    }
  }
  return rows;
}

async function fetchCommentRowsForCards(
  admin: AdminClient,
  cardIds: string[],
  sinceIso: string,
) {
  const rows: CommentRow[] = [];
  for (const batch of chunkArray(cardIds, CARD_BATCH_SIZE)) {
    let from = 0;
    while (true) {
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await admin
        .from("card_comments")
        .select("card_print_id,created_at")
        .in("card_print_id", batch)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Founder drilldown comment query failed: ${error.message}`);
      }

      const page = (data ?? []) as CommentRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) {
        break;
      }
      from += PAGE_SIZE;
    }
  }
  return rows;
}

function mapCardMetadataRow(row: CardMetadataRow): CardSignal | null {
  const id = row.id?.trim();
  if (!id) {
    return null;
  }

  const set = normalizeSetRelation(row.set);
  return {
    id,
    gvId: row.gv_id?.trim() || null,
    name: row.name?.trim() || "Unknown card",
    setId: row.set_id?.trim() || set?.id || null,
    setCode: row.set_code?.trim() || set?.code || null,
    setName: set?.name || null,
    number: row.number?.trim() || null,
    imageUrl: row.image_url?.trim() || null,
    imageAltUrl: row.image_alt_url?.trim() || null,
  };
}

function normalizeSetRelation(
  value: CardMetadataRow["set"],
): { id: string | null; code: string | null; name: string | null } | null {
  if (Array.isArray(value)) {
    const first = value.find((entry) =>
      typeof entry?.id === "string" || typeof entry?.name === "string" ||
      typeof entry?.code === "string"
    );
    return first
      ? {
        id: first.id?.trim() || null,
        code: first.code?.trim() || null,
        name: first.name?.trim() || null,
      }
      : null;
  }
  if (value) {
    return {
      id: value.id?.trim() || null,
      code: value.code?.trim() || null,
      name: value.name?.trim() || null,
    };
  }
  return null;
}

function buildMetricWindowsByCard(rows: FeedEventRow[], now: number) {
  const metricsByCard = new Map<string, {
    sevenDay: MetricWindow;
    previousSevenDay: MetricWindow;
    thirtyDay: MetricWindow;
  }>();

  for (const row of rows) {
    if (typeof row.card_print_id !== "string" || !row.card_print_id) {
      continue;
    }
    const createdAt = parseTimestamp(row.created_at);
    if (createdAt == null) {
      continue;
    }
    const metricKey = eventMetricKey(row.event_type);
    if (!metricKey) {
      continue;
    }

    const entry = metricsByCard.get(row.card_print_id) ?? emptyMetricWindows();
    addMetricValue(entry.thirtyDay, metricKey, 1);

    const ageMs = now - createdAt;
    if (ageMs >= 0 && ageMs <= SEVEN_DAY_MS) {
      addMetricValue(entry.sevenDay, metricKey, 1);
    } else if (ageMs > SEVEN_DAY_MS && ageMs <= SEVEN_DAY_MS * 2) {
      addMetricValue(entry.previousSevenDay, metricKey, 1);
    }

    metricsByCard.set(row.card_print_id, entry);
  }

  return metricsByCard;
}

function buildCommentWindowsByCard(rows: CommentRow[], now: number) {
  const metricsByCard = new Map<string, {
    sevenDay: MetricWindow;
    previousSevenDay: MetricWindow;
    thirtyDay: MetricWindow;
  }>();

  for (const row of rows) {
    if (typeof row.card_print_id !== "string" || !row.card_print_id) {
      continue;
    }
    const createdAt = parseTimestamp(row.created_at);
    if (createdAt == null) {
      continue;
    }

    const entry = metricsByCard.get(row.card_print_id) ?? emptyMetricWindows();
    entry.thirtyDay.comments += 1;

    const ageMs = now - createdAt;
    if (ageMs >= 0 && ageMs <= SEVEN_DAY_MS) {
      entry.sevenDay.comments += 1;
    } else if (ageMs > SEVEN_DAY_MS && ageMs <= SEVEN_DAY_MS * 2) {
      entry.previousSevenDay.comments += 1;
    }

    metricsByCard.set(row.card_print_id, entry);
  }

  return metricsByCard;
}

function emptyMetricWindow(): MetricWindow {
  return {
    opens: 0,
    adds: 0,
    comments: 0,
    wantOn: 0,
  };
}

function emptyMetricWindows() {
  return {
    sevenDay: emptyMetricWindow(),
    previousSevenDay: emptyMetricWindow(),
    thirtyDay: emptyMetricWindow(),
  };
}

function mergeMetricWindows(left: MetricWindow, right: MetricWindow): MetricWindow {
  return {
    opens: left.opens + right.opens,
    adds: left.adds + right.adds,
    comments: left.comments + right.comments,
    wantOn: left.wantOn + right.wantOn,
  };
}

function addMetricWindow(target: MetricWindow, source: MetricWindow) {
  target.opens += source.opens;
  target.adds += source.adds;
  target.comments += source.comments;
  target.wantOn += source.wantOn;
}

function addMetricValue(target: MetricWindow, key: MetricKey, value: number) {
  switch (key) {
    case "opens":
      target.opens += value;
      break;
    case "adds":
      target.adds += value;
      break;
    case "comments":
      target.comments += value;
      break;
    case "want_on":
      target.wantOn += value;
      break;
  }
}

function eventMetricKey(eventType: FeedEventType | null): MetricKey | null {
  switch (eventType) {
    case "open_detail":
      return "opens";
    case "add_to_vault":
      return "adds";
    case "want_on":
      return "want_on";
    default:
      return null;
  }
}

function buildMetricDeltas(current: MetricWindow, previous: MetricWindow) {
  return {
    opens: current.opens - previous.opens,
    adds: current.adds - previous.adds,
    comments: current.comments - previous.comments,
    wantOn: current.wantOn - previous.wantOn,
  };
}

function countRowsByCardId(rows: WantRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (typeof row.card_print_id !== "string" || !row.card_print_id) {
      continue;
    }
    counts.set(row.card_print_id, (counts.get(row.card_print_id) ?? 0) + 1);
  }
  return counts;
}

function buildCardSummaryLines(input: {
  activeWantCount: number;
  activeOwnerCount: number;
  demandGap: number;
  deltas: {
    opens: number;
    adds: number;
    comments: number;
    wantOn: number;
  };
  metrics7d: MetricWindow;
}) {
  return [
    demandGapSummary(
      input.demandGap,
      input.activeWantCount,
      input.activeOwnerCount,
    ),
    trendSummary("Opens", input.deltas.opens, input.metrics7d.opens),
    trendSummary("Want activity", input.deltas.wantOn, input.metrics7d.wantOn),
  ];
}

function buildCardInsightSummary(input: {
  activeWantCount: number;
  activeOwnerCount: number;
  demandGap: number;
  metrics7d: MetricWindow;
  deltas: {
    opens: number;
    adds: number;
    comments: number;
    wantOn: number;
  };
  recommendation: string | null;
}) {
  const summary: string[] = [];

  if (input.recommendation === "understocked") {
    summary.push("High demand with limited visible supply.");
  } else if (input.activeWantCount > 0 && input.activeOwnerCount > 0) {
    summary.push("Demand is active and visible ownership is starting to build.");
  } else if (input.metrics7d.adds > 0) {
    summary.push("This card is actively entering collections.");
  } else {
    summary.push("Collector interest is present, but supply is still forming.");
  }

  if (input.deltas.opens > 0 || input.metrics7d.opens >= 3) {
    summary.push("Rising collector attention this week.");
  } else if (input.metrics7d.adds > 0) {
    summary.push("Collectors are converting attention into ownership.");
  } else if (input.metrics7d.comments > 0) {
    summary.push("Collectors are talking about this card right now.");
  } else if (input.deltas.wantOn > 0) {
    summary.push("Want activity is increasing this week.");
  } else {
    summary.push("Demand is holding steady week over week.");
  }

  return summary.slice(0, 2);
}

function buildSetSummaryLines(input: {
  activeWants: number;
  cardsWithSignal: number;
  topDrivers: FounderSetDriverSummary[];
  metrics7d: MetricWindow;
  previous7d: MetricWindow;
  deltas: {
    opens: number;
    adds: number;
    comments: number;
    wantOn: number;
  };
}) {
  const strongestNames = input.topDrivers.slice(0, 3).map((row) => row.name);
  const currentScore = momentumScore(input.metrics7d);
  const previousScore = momentumScore(input.previous7d);

  return [
    currentScore > previousScore
      ? `Collector attention is rising this week (+${currentScore - previousScore} momentum points vs previous 7 days).`
      : currentScore < previousScore
      ? `Collector attention cooled this week (${previousScore - currentScore} fewer momentum points vs previous 7 days).`
      : "Collector attention is flat week over week.",
    `${input.activeWants} active ${pluralize(input.activeWants, "want")} currently sit across ${input.cardsWithSignal} ${pluralize(input.cardsWithSignal, "card")}.`,
    strongestNames.isNotEmpty
      ? `Strongest cards in this set right now: ${strongestNames.join(", ")}.`
      : "Not enough recent card-level signal yet.",
  ];
}

function buildTopDriverReason(activeWants: number, metrics7d: MetricWindow) {
  const parts = [
    activeWants > 0 ? `${activeWants} ${pluralize(activeWants, "want")}` : null,
    metrics7d.opens > 0 ? `${metrics7d.opens} ${pluralize(metrics7d.opens, "open")}` : null,
    metrics7d.adds > 0 ? `${metrics7d.adds} ${pluralize(metrics7d.adds, "add")}` : null,
    metrics7d.comments > 0 ? `${metrics7d.comments} ${pluralize(metrics7d.comments, "comment")}` : null,
  ].filter((value): value is string => value != null);

  return parts.isNotEmpty
    ? parts.join(" · ")
    : "Not enough recent signal yet";
}

function demandGapSummary(demandGap: number, activeWants: number, activeOwners: number) {
  if (demandGap > 0) {
    return `${demandGap} more ${pluralize(demandGap, "collector")} want this card than visibly own it.`;
  }
  if (demandGap < 0) {
    return `Visible ownership exceeds demand by ${Math.abs(demandGap)} (${activeWants} wants vs ${activeOwners} owners).`;
  }
  return "Current Want and visible ownership are balanced.";
}

function trendSummary(label: string, delta: number, currentValue: number) {
  if (delta > 0) {
    return `${label} up ${delta} vs last week (${currentValue} in the last 7 days).`;
  }
  if (delta < 0) {
    return `${label} down ${Math.abs(delta)} vs last week (${currentValue} in the last 7 days).`;
  }
  return `${label} is flat week over week (${currentValue} in the last 7 days).`;
}

function buildCardRecommendation(activeWantCount: number, activeOwnerCount: number) {
  if (
    activeWantCount > activeOwnerCount &&
    activeWantCount >= UNDERSTOCKED_WANT_THRESHOLD
  ) {
    return "understocked";
  }
  return null;
}

function driverScore(activeWants: number, metrics7d: MetricWindow) {
  return activeWants * 3 + metrics7d.wantOn * 2 + metrics7d.opens +
    metrics7d.adds * 2 + metrics7d.comments;
}

function momentumScore(metrics: MetricWindow) {
  return metrics.wantOn * 2 + metrics.opens + metrics.adds * 2 + metrics.comments;
}

function parseTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function pluralize(count: number, singular: string, plural?: string) {
  if (count === 1) {
    return singular;
  }
  return plural ?? `${singular}s`;
}
