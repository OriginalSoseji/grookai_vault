import Link from "next/link";
import { redirect } from "next/navigation";
import PublicCardImage from "@/components/PublicCardImage";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { createServerAdminClient } from "@/lib/supabase/admin";
import { createServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const FOUNDER_EMAIL = "ccabrl@gmail.com";

type VaultAnalyticsRow = {
  id: string;
  user_id: string | null;
  card_print_id: string | null;
  slab_cert_id: string | null;
  condition_label: string | null;
  image_url: string | null;
  created_at: string | null;
};

type SlabCertLookupRow = {
  id: string;
  card_print_id: string | null;
};

type CardPrintMetadataRow = {
  id: string;
  gv_id: string | null;
  name: string | null;
  set_code: string | null;
  number: string | null;
  image_url: string | null;
  image_alt_url: string | null;
};

type NormalizedVaultRow = {
  id: string;
  user_id: string;
  gv_id: string;
  card_print_id: string;
  name: string;
  set_code: string;
  number: string;
  quantity: number;
  condition_label: string;
  created_at: string | null;
  image_url?: string;
};

type CardAggregate = {
  gv_id: string;
  name: string;
  set_code: string;
  number: string;
  total_qty: number;
  distinct_owners: number;
  image_url?: string;
};

type SetAggregate = {
  set_code: string;
  vault_rows: number;
  distinct_cards: number;
  total_qty: number;
};

type WebEventRow = {
  id: string;
  created_at: string | null;
  event_name: string | null;
  user_id: string | null;
  anonymous_id: string | null;
  path: string | null;
  gv_id: string | null;
  set_code: string | null;
  search_query: string | null;
  metadata: Record<string, unknown> | null;
};

type TopViewedCardMetadataRow = {
  gv_id: string | null;
  name: string | null;
  number: string | null;
  set_code: string | null;
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

type FounderTopViewedCard = {
  gv_id: string;
  name: string;
  number: string;
  set_code?: string;
  set_name?: string;
  image_url?: string;
  view_count: number;
};

type FounderMetric = {
  uniqueVisitors24h: number;
  signedInVisitors24h: number;
  newAccounts7d: number;
  cardPageViews24h: number;
  setPageViews24h: number;
  searchesPerformed24h: number;
  addToVaultClicks24h: number;
  successfulAddToVaults24h: number;
  activeVaultUsers7d: number;
  cardsAddedToVault7d: number;
};

type SearchAggregate = {
  query: string;
  count: number;
};

function parseEventDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hoursAgoDate(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgoDate(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function normalizeSearchTerm(value?: string | null) {
  const normalized = value?.trim().replace(/\s+/g, " ");
  return normalized ? normalized.toLowerCase() : null;
}

function aggregateTelemetryMetrics(events: WebEventRow[]): FounderMetric {
  const twentyFourHoursAgo = hoursAgoDate(24);
  const sevenDaysAgo = daysAgoDate(7);
  const uniqueVisitors24h = new Set<string>();
  const signedInVisitors24h = new Set<string>();
  const activeVaultUsers7d = new Set<string>();

  let newAccounts7d = 0;
  let cardPageViews24h = 0;
  let setPageViews24h = 0;
  let searchesPerformed24h = 0;
  let addToVaultClicks24h = 0;
  let successfulAddToVaults24h = 0;
  let cardsAddedToVault7d = 0;

  for (const event of events) {
    const createdAt = parseEventDate(event.created_at);
    if (!createdAt) {
      continue;
    }

    const eventName = event.event_name?.trim() || "";
    const is24h = createdAt >= twentyFourHoursAgo;
    const is7d = createdAt >= sevenDaysAgo;
    const visitorKey = event.user_id?.trim() || event.anonymous_id?.trim() || "";

    if (is24h && visitorKey) {
      uniqueVisitors24h.add(visitorKey);
    }

    if (is24h && event.user_id) {
      signedInVisitors24h.add(event.user_id);
    }

    if (eventName === "account_created" && is7d) {
      newAccounts7d += 1;
    }

    if (eventName === "page_view_card" && is24h) {
      cardPageViews24h += 1;
    }

    if (eventName === "page_view_set" && is24h) {
      setPageViews24h += 1;
    }

    if (eventName === "search_performed" && is24h) {
      searchesPerformed24h += 1;
    }

    if (eventName === "vault_add_click" && is24h) {
      addToVaultClicks24h += 1;
    }

    if (eventName === "vault_add_success") {
      if (is24h) {
        successfulAddToVaults24h += 1;
      }

      if (is7d) {
        const quantityDelta = typeof event.metadata?.quantity_delta === "number" ? event.metadata.quantity_delta : 1;
        cardsAddedToVault7d += quantityDelta;
      }
    }

    if (is7d && event.user_id && (eventName === "vault_add_success" || eventName === "vault_opened")) {
      activeVaultUsers7d.add(event.user_id);
    }
  }

  return {
    uniqueVisitors24h: uniqueVisitors24h.size,
    signedInVisitors24h: signedInVisitors24h.size,
    newAccounts7d,
    cardPageViews24h,
    setPageViews24h,
    searchesPerformed24h,
    addToVaultClicks24h,
    successfulAddToVaults24h,
    activeVaultUsers7d: activeVaultUsers7d.size,
    cardsAddedToVault7d,
  };
}

function aggregateTopSearchTerms(events: WebEventRow[], limit = 10): SearchAggregate[] {
  const sevenDaysAgo = daysAgoDate(7);
  const byQuery = new Map<string, { query: string; count: number }>();

  for (const event of events) {
    if (event.event_name !== "search_performed") {
      continue;
    }

    const createdAt = parseEventDate(event.created_at);
    if (!createdAt || createdAt < sevenDaysAgo) {
      continue;
    }

    const normalized = normalizeSearchTerm(event.search_query);
    if (!normalized) {
      continue;
    }

    const current = byQuery.get(normalized) ?? {
      query: event.search_query?.trim().replace(/\s+/g, " ") || normalized,
      count: 0,
    };
    current.count += 1;
    byQuery.set(normalized, current);
  }

  return Array.from(byQuery.values())
    .sort((left, right) => right.count - left.count || left.query.localeCompare(right.query))
    .slice(0, limit);
}

function aggregateTopViewedCardIds(events: WebEventRow[], limit = 10) {
  const sevenDaysAgo = daysAgoDate(7);
  const byGvId = new Map<string, number>();

  for (const event of events) {
    if (event.event_name !== "page_view_card") {
      continue;
    }

    const createdAt = parseEventDate(event.created_at);
    const gvId = event.gv_id?.trim();
    if (!createdAt || createdAt < sevenDaysAgo || !gvId) {
      continue;
    }

    byGvId.set(gvId, (byGvId.get(gvId) ?? 0) + 1);
  }

  return Array.from(byGvId.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function mapTopViewedCards(
  rows: TopViewedCardMetadataRow[],
  counts: Array<[string, number]>,
): FounderTopViewedCard[] {
  const rowsByGvId = new Map(
    rows
      .filter((row): row is TopViewedCardMetadataRow & { gv_id: string } => Boolean(row.gv_id))
      .map((row) => [row.gv_id, row]),
  );

  const mapped: FounderTopViewedCard[] = [];

  for (const [gvId, viewCount] of counts) {
      const row = rowsByGvId.get(gvId);
      if (!row) {
        continue;
      }

      const setRecord = Array.isArray(row.sets) ? row.sets[0] : row.sets;
      mapped.push({
        gv_id: gvId,
        name: row.name?.trim() || "Unknown card",
        number: row.number?.trim() || "—",
        set_code: row.set_code?.trim() || undefined,
        set_name: setRecord?.name?.trim() || undefined,
        image_url: getBestPublicCardImageUrl(row.image_url, row.image_alt_url),
        view_count: viewCount,
      });
    }

  return mapped;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

async function fetchAllActiveVaultInstanceRows(admin: ReturnType<typeof createServerAdminClient>): Promise<VaultAnalyticsRow[]> {
  const rows: VaultAnalyticsRow[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await admin
      .from("vault_item_instances")
      .select("id,user_id,card_print_id,slab_cert_id,condition_label,image_url,created_at")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Founder vault instance query failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...(data as VaultAnalyticsRow[]));

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

async function fetchSlabCardPrintMap(
  admin: ReturnType<typeof createServerAdminClient>,
  slabCertIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();

  for (const ids of chunkArray(slabCertIds, 500)) {
    const { data, error } = await admin
      .from("slab_certs")
      .select("id,card_print_id")
      .in("id", ids);

    if (error) {
      throw new Error(`Founder slab cert lookup failed: ${error.message}`);
    }

    for (const row of (data ?? []) as SlabCertLookupRow[]) {
      if (row.id && row.card_print_id) {
        out.set(row.id, row.card_print_id);
      }
    }
  }

  return out;
}

async function fetchCardPrintMetadataMap(
  admin: ReturnType<typeof createServerAdminClient>,
  cardPrintIds: string[],
): Promise<Map<string, CardPrintMetadataRow>> {
  const out = new Map<string, CardPrintMetadataRow>();

  for (const ids of chunkArray(cardPrintIds, 500)) {
    const { data, error } = await admin
      .from("card_prints")
      .select("id,gv_id,name,set_code,number,image_url,image_alt_url")
      .in("id", ids);

    if (error) {
      throw new Error(`Founder card metadata lookup failed: ${error.message}`);
    }

    for (const row of (data ?? []) as CardPrintMetadataRow[]) {
      if (row.id) {
        out.set(row.id, row);
      }
    }
  }

  return out;
}

function normalizeVaultRows(
  rows: VaultAnalyticsRow[],
  slabCardPrintIdBySlabCertId: Map<string, string>,
  cardPrintMetadataById: Map<string, CardPrintMetadataRow>,
): NormalizedVaultRow[] {
  const normalized: NormalizedVaultRow[] = [];

  for (const row of rows) {
    const effectiveCardPrintId =
      row.card_print_id ??
      (row.slab_cert_id ? slabCardPrintIdBySlabCertId.get(row.slab_cert_id) : undefined);
    if (!row.user_id || !effectiveCardPrintId) {
      continue;
    }

    const metadata = cardPrintMetadataById.get(effectiveCardPrintId);
    const gvId = metadata?.gv_id?.trim();
    if (!gvId) {
      continue;
    }

    normalized.push({
      id: row.id,
      user_id: row.user_id,
      gv_id: gvId,
      card_print_id: effectiveCardPrintId,
      name: metadata?.name?.trim() || "Unknown card",
      set_code: metadata?.set_code?.trim() || "Unknown set",
      number: metadata?.number?.trim() || "—",
      quantity: 1,
      condition_label: row.condition_label?.trim() || "Unknown",
      created_at: row.created_at,
      image_url: getBestPublicCardImageUrl(row.image_url ?? metadata?.image_url, metadata?.image_alt_url),
    });
  }

  return normalized;
}

function formatTimeAgo(value: string | null) {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(1, Math.floor(diffMs / 1000));

  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function aggregateCards(rows: NormalizedVaultRow[]): CardAggregate[] {
  const byCard = new Map<
    string,
    {
      gv_id: string;
      name: string;
      set_code: string;
      number: string;
      total_qty: number;
      owners: Set<string>;
      image_url?: string;
    }
  >();

  for (const row of rows) {
    const current = byCard.get(row.gv_id) ?? {
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      total_qty: 0,
      owners: new Set<string>(),
      image_url: row.image_url,
    };

    current.total_qty += row.quantity;
    current.owners.add(row.user_id);
    if (!current.image_url && row.image_url) {
      current.image_url = row.image_url;
    }
    byCard.set(row.gv_id, current);
  }

  return Array.from(byCard.values()).map((entry) => ({
    gv_id: entry.gv_id,
    name: entry.name,
    set_code: entry.set_code,
    number: entry.number,
    total_qty: entry.total_qty,
    distinct_owners: entry.owners.size,
    image_url: entry.image_url,
  }));
}

function aggregateSets(rows: NormalizedVaultRow[]): SetAggregate[] {
  const bySet = new Map<
    string,
    {
      set_code: string;
      vault_rows: number;
      total_qty: number;
      cards: Set<string>;
    }
  >();

  for (const row of rows) {
    const key = row.set_code || "Unknown set";
    const current = bySet.get(key) ?? {
      set_code: key,
      vault_rows: 0,
      total_qty: 0,
      cards: new Set<string>(),
    };

    current.vault_rows += 1;
    current.total_qty += row.quantity;
    current.cards.add(row.gv_id);
    bySet.set(key, current);
  }

  return Array.from(bySet.values()).map((entry) => ({
    set_code: entry.set_code,
    vault_rows: entry.vault_rows,
    distinct_cards: entry.cards.size,
    total_qty: entry.total_qty,
  }));
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-600">{detail}</p> : null}
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-6 text-sm leading-7 text-slate-600 shadow-sm">
      {message}
    </div>
  );
}

export default async function FounderPage() {
  const supabase = createServerComponentClient();
  const admin = createServerAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/founder")}`);
  }

  if (!user.email || user.email.toLowerCase() !== FOUNDER_EMAIL.toLowerCase()) {
    redirect("/");
  }

  const sevenDaysAgoIso = daysAgoDate(7).toISOString();
  let vaultRows: NormalizedVaultRow[] = [];
  let vaultAnalyticsError: string | null = null;

  try {
    const activeInstanceRows = await fetchAllActiveVaultInstanceRows(admin);
    const slabCardPrintIdBySlabCertId = await fetchSlabCardPrintMap(
      admin,
      Array.from(
        new Set(
          activeInstanceRows
            .map((row) => row.slab_cert_id)
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        ),
      ),
    );
    const cardPrintMetadataById = await fetchCardPrintMetadataMap(
      admin,
      Array.from(
        new Set(
          activeInstanceRows
            .map((row) => row.card_print_id ?? (row.slab_cert_id ? slabCardPrintIdBySlabCertId.get(row.slab_cert_id) : null))
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        ),
      ),
    );

    vaultRows = normalizeVaultRows(activeInstanceRows, slabCardPrintIdBySlabCertId, cardPrintMetadataById);
  } catch (error) {
    vaultAnalyticsError = error instanceof Error ? error.message : "Unknown founder analytics error";
  }

  const { data: telemetryData, error: telemetryError } = await admin
    .from("web_events")
    .select("id,created_at,event_name,user_id,anonymous_id,path,gv_id,set_code,search_query,metadata")
    .gte("created_at", sevenDaysAgoIso)
    .order("created_at", { ascending: false });

  const recentRows = [...vaultRows]
    .sort((left, right) => {
      const leftTs = left.created_at ? Date.parse(left.created_at) : Number.NaN;
      const rightTs = right.created_at ? Date.parse(right.created_at) : Number.NaN;
      const safeLeft = Number.isFinite(leftTs) ? leftTs : Number.NEGATIVE_INFINITY;
      const safeRight = Number.isFinite(rightTs) ? rightTs : Number.NEGATIVE_INFINITY;
      return safeRight - safeLeft;
    })
    .slice(0, 20);
  const telemetryRows = ((telemetryData ?? null) as WebEventRow[] | null) ?? [];

  const distinctUsers = new Set(vaultRows.map((row) => row.user_id)).size;
  const distinctCards = new Set(vaultRows.map((row) => row.gv_id)).size;
  const totalQuantity = vaultRows.reduce((sum, row) => sum + row.quantity, 0);
  const lowData = vaultRows.length > 0 && vaultRows.length < 10;
  const telemetryMetrics = aggregateTelemetryMetrics(telemetryRows);
  const topSearchTerms = aggregateTopSearchTerms(telemetryRows);
  const topViewedCardCounts = aggregateTopViewedCardIds(telemetryRows);

  const cardAggregates = aggregateCards(vaultRows);
  const topCardsByQty = [...cardAggregates]
    .sort((left, right) => right.total_qty - left.total_qty || right.distinct_owners - left.distinct_owners)
    .slice(0, 10);
  const topCardsByOwners = [...cardAggregates]
    .sort((left, right) => right.distinct_owners - left.distinct_owners || right.total_qty - left.total_qty)
    .slice(0, 10);
  const topSets = aggregateSets(vaultRows)
    .sort((left, right) => right.vault_rows - left.vault_rows || right.total_qty - left.total_qty)
    .slice(0, 10);
  const topViewedCardsResponse = topViewedCardCounts.length > 0
    ? await admin
        .from("card_prints")
        .select("gv_id,name,number,set_code,image_url,image_alt_url,sets(name)")
        .in(
          "gv_id",
          topViewedCardCounts.map(([gvId]) => gvId),
        )
    : { data: [], error: null };
  const topViewedCardsError = topViewedCardsResponse.error?.message ?? null;
  const topViewedCards = mapTopViewedCards(
    ((topViewedCardsResponse.data ?? []) as TopViewedCardMetadataRow[]) ?? [],
    topViewedCardCounts,
  );

  return (
    <div className="space-y-10 py-8">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm shadow-slate-200/70 md:px-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Founder Dashboard</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Founder Dashboard V2</h1>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            Founder intelligence combining collector vault data with lightweight first-party product telemetry.
          </p>
        </div>
      </section>

      {telemetryError ? (
        <EmptyPanel message={`Telemetry analytics could not be loaded right now: ${telemetryError.message}`} />
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Product Signals</h2>
          <p className="text-sm text-slate-600">Rolling telemetry windows for traffic, engagement, and conversion intent.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Unique Visitors (24h)" value={telemetryMetrics.uniqueVisitors24h} detail="Distinct user_id or anonymous_id across all web events" />
          <MetricCard label="Signed-in Visitors (24h)" value={telemetryMetrics.signedInVisitors24h} detail="Distinct authenticated users across all web events" />
          <MetricCard label="New Accounts (7d)" value={telemetryMetrics.newAccounts7d} detail="Account creation events" />
          <MetricCard label="Card Page Views (24h)" value={telemetryMetrics.cardPageViews24h} detail="page_view_card events" />
          <MetricCard label="Set Page Views (24h)" value={telemetryMetrics.setPageViews24h} detail="page_view_set events" />
          <MetricCard label="Searches Performed (24h)" value={telemetryMetrics.searchesPerformed24h} detail="Broad + structured search submissions" />
          <MetricCard label="Add-to-Vault Clicks (24h)" value={telemetryMetrics.addToVaultClicks24h} detail="Intent to add from the card page CTA" />
          <MetricCard label="Successful Add-to-Vaults (24h)" value={telemetryMetrics.successfulAddToVaults24h} detail="Successful +1 vault writes" />
          <MetricCard label="Active Vault Users (7d)" value={telemetryMetrics.activeVaultUsers7d} detail="Distinct users from vault_opened or vault_add_success" />
          <MetricCard label="Cards Added To Vault (7d)" value={telemetryMetrics.cardsAddedToVault7d} detail="Summed quantity_delta from vault_add_success" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Top Search Terms (7d)</h2>
            <p className="text-sm text-slate-600">Normalized search queries grouped case-insensitively.</p>
          </div>

          {topSearchTerms.length === 0 ? (
            <EmptyPanel message="No search telemetry has been recorded yet." />
          ) : (
            <div className="space-y-3">
              {topSearchTerms.map((term) => (
                <div
                  key={term.query}
                  className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-slate-950">{term.query}</p>
                    <p className="text-sm text-slate-600">Search query</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-right text-sm text-slate-700">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Count</p>
                    <p className="mt-1 font-medium text-slate-900">{term.count}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Top Viewed Cards (7d)</h2>
            <p className="text-sm text-slate-600">Most-viewed public card pages by canonical GV-ID.</p>
          </div>

          {topViewedCardsError ? (
            <EmptyPanel message={`Top viewed card metadata could not be loaded right now: ${topViewedCardsError}`} />
          ) : topViewedCards.length === 0 ? (
            <EmptyPanel message="No card page telemetry has been recorded yet." />
          ) : (
            <div className="space-y-3">
              {topViewedCards.map((item) => (
                <Link
                  key={`${item.gv_id}-views`}
                  href={`/card/${item.gv_id}`}
                  className="flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <PublicCardImage
                    src={item.image_url}
                    alt={item.name}
                    imageClassName="h-24 w-16 rounded-lg border border-slate-200 bg-slate-50 object-contain p-1"
                    fallbackClassName="flex h-24 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[10px] text-slate-500"
                    fallbackLabel={item.name}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-base font-medium text-slate-950">{item.name}</p>
                    <p className="text-sm text-slate-600">
                      {[item.set_name ?? item.set_code, item.number !== "—" ? `#${item.number}` : undefined].filter(Boolean).join(" • ")}
                    </p>
                    <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{item.gv_id}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-right text-sm text-slate-700">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Views</p>
                    <p className="mt-1 font-medium text-slate-900">{item.view_count}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active Vault Instances" value={vaultRows.length} detail="Active owned objects read from vault_item_instances" />
        <MetricCard label="Distinct Vault Users" value={distinctUsers} detail="Collectors with vault activity" />
        <MetricCard label="Distinct GV-IDs" value={distinctCards} detail="Unique canonical cards in vault ownership" />
        <MetricCard label="Total Active Instances" value={totalQuantity} detail="Count of active owned objects across all canonical vault instances" />
      </section>

      {vaultAnalyticsError ? (
        <EmptyPanel message={`Vault analytics could not be loaded right now: ${vaultAnalyticsError}`} />
      ) : (
        <>
          {vaultRows.length === 0 ? (
            <EmptyPanel message="No vault activity yet. Founder analytics will populate as collectors add cards." />
          ) : null}

          {lowData ? (
            <EmptyPanel message="Only a small amount of vault data exists so far. These metrics will become more meaningful as usage grows." />
          ) : null}

          <section className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Top Cards By Active Instances</h2>
                <p className="text-sm text-slate-600">Aggregated by GV-ID using canonical active instance count and distinct owner count.</p>
              </div>
            </div>

            {topCardsByQty.length === 0 ? (
              <EmptyPanel message="No canonical vault instance data is available yet." />
            ) : (
              <div className="space-y-4">
                {topCardsByQty.map((item) => (
                  <Link
                    key={item.gv_id}
                    href={`/card/${item.gv_id}`}
                    className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-5 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center"
                  >
                    <PublicCardImage
                      src={item.image_url}
                      alt={item.name}
                      imageClassName="h-28 w-20 rounded-xl border border-slate-200 bg-slate-50 object-contain p-1"
                      fallbackClassName="flex h-28 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-2 text-center text-[11px] text-slate-500"
                      fallbackLabel={item.name}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-xl font-medium text-slate-950">{item.name}</p>
                      <p className="text-sm text-slate-600">
                        {[item.set_code, item.number !== "—" ? `#${item.number}` : undefined].filter(Boolean).join(" • ")}
                      </p>
                      <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{item.gv_id}</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm text-slate-700 sm:min-w-[240px]">
                      <div className="rounded-2xl bg-slate-50 px-3 py-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Instances</dt>
                        <dd className="mt-1 font-medium text-slate-900">{item.total_qty}</dd>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Owners</dt>
                        <dd className="mt-1 font-medium text-slate-900">{item.distinct_owners}</dd>
                      </div>
                    </dl>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Top Sets By Vault Presence</h2>
                <p className="text-sm text-slate-600">Grouped by set code from canonical active vault instances.</p>
              </div>

              {topSets.length === 0 ? (
                <EmptyPanel message="No set-level vault presence data is available yet." />
              ) : (
                <div className="space-y-3">
                  {topSets.map((setRow) => (
                    <div
                      key={setRow.set_code}
                      className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-medium text-slate-950">{setRow.set_code}</p>
                          <p className="text-sm text-slate-600">{setRow.distinct_cards} distinct cards in vault activity</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm text-slate-700">
                          <div className="rounded-2xl bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Rows</p>
                            <p className="mt-1 font-medium text-slate-900">{setRow.vault_rows}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Cards</p>
                            <p className="mt-1 font-medium text-slate-900">{setRow.distinct_cards}</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Instances</p>
                            <p className="mt-1 font-medium text-slate-900">{setRow.total_qty}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Top Distinct Cards</h2>
                <p className="text-sm text-slate-600">Most represented cards by distinct owner count.</p>
              </div>

              {topCardsByOwners.length === 0 ? (
                <EmptyPanel message="No distinct-owner leaderboard is available yet." />
              ) : (
                <div className="space-y-3">
                  {topCardsByOwners.map((item) => (
                    <Link
                      key={`${item.gv_id}-owners`}
                      href={`/card/${item.gv_id}`}
                      className="flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                    >
                      <PublicCardImage
                        src={item.image_url}
                        alt={item.name}
                        imageClassName="h-24 w-16 rounded-lg border border-slate-200 bg-slate-50 object-contain p-1"
                        fallbackClassName="flex h-24 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[10px] text-slate-500"
                        fallbackLabel={item.name}
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-base font-medium text-slate-950">{item.name}</p>
                        <p className="text-sm text-slate-600">
                          {[item.set_code, item.number !== "—" ? `#${item.number}` : undefined].filter(Boolean).join(" • ")}
                        </p>
                        <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{item.gv_id}</p>
                      </div>
                      <div className="text-right text-sm text-slate-700">
                        <p className="font-medium text-slate-900">{item.distinct_owners} owners</p>
                        <p className="text-slate-600">{item.total_qty} active instances</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-5">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Recent Vault Activity</h2>
              <p className="text-sm text-slate-600">Latest active owned objects from canonical vault instances.</p>
            </div>

            {recentRows.length === 0 ? (
              <EmptyPanel message="No recent vault activity yet. Founder analytics will populate as collectors add cards." />
            ) : (
              <div className="space-y-3">
                {recentRows.map((item) => (
                  <Link
                    key={item.id}
                    href={`/card/${item.gv_id}`}
                    className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center"
                  >
                    <PublicCardImage
                      src={item.image_url}
                      alt={item.name}
                      imageClassName="h-24 w-16 rounded-lg border border-slate-200 bg-slate-50 object-contain p-1"
                      fallbackClassName="flex h-24 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[10px] text-slate-500"
                      fallbackLabel={item.name}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-lg font-medium text-slate-950">{item.name}</p>
                      <p className="text-sm text-slate-600">
                        {[item.set_code, item.number !== "—" ? `#${item.number}` : undefined].filter(Boolean).join(" • ")}
                      </p>
                      <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{item.gv_id}</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm text-slate-700 sm:min-w-[280px]">
                      <div className="rounded-2xl bg-slate-50 px-3 py-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">When</dt>
                        <dd className="mt-1 font-medium text-slate-900">{formatTimeAgo(item.created_at)}</dd>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-3 py-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Instances</dt>
                        <dd className="mt-1 font-medium text-slate-900">{item.quantity}</dd>
                      </div>
                      <div className="col-span-2 rounded-2xl bg-slate-50 px-3 py-2">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Condition</dt>
                        <dd className="mt-1 font-medium text-slate-900">{item.condition_label}</dd>
                      </div>
                    </dl>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
