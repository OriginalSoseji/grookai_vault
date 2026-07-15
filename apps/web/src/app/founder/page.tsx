import Link from "next/link";
import FounderMarketSignalsSection from "@/components/founder/FounderMarketSignalsSection";
import PublicCardImage from "@/components/PublicCardImage";
import PageContainer from "@/components/layout/PageContainer";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import {
  getFounderMarketSignals,
  type FounderInsightBundle,
} from "@/lib/founder/getFounderMarketSignals";
import {
  getFounderPricingOpsSummary,
  type FounderPricingOpsSummary,
} from "@/lib/founder/getPricingOpsSummary";
import {
  getCatalogImageOpsSummary,
  type CatalogImageOpsSummary,
} from "@/lib/founder/getCatalogImageOpsSummary";
import {
  getFounderOpsReportRegistry,
  type FounderOpsReportRegistry,
  type FounderOpsReportStatus,
} from "@/lib/founder/getFounderOpsReportRegistry";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";
import { createServerAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

type AbuseReasonAggregate = {
  reason: string;
  count: number;
};

type AbuseLaneAggregate = {
  lane: string;
  count: number;
};

type AbuseRecentEvent = {
  id: string;
  created_at: string | null;
  event_name: string;
  path: string;
  lane: string;
  reason: string;
  request_count: number | null;
};

type AbuseProtectionMetrics = {
  signals24h: number;
  throttles24h: number;
  retiredRegistryHits24h: number;
  apiSignals24h: number;
  cardWalkingSignals7d: number;
  topReasons: AbuseReasonAggregate[];
  laneCounts: AbuseLaneAggregate[];
  recentEvents: AbuseRecentEvent[];
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

function getMetadataString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getMetadataNumber(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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

function aggregateAbuseProtectionMetrics(events: WebEventRow[]): AbuseProtectionMetrics {
  const twentyFourHoursAgo = hoursAgoDate(24);
  const sevenDaysAgo = daysAgoDate(7);
  const reasons = new Map<string, number>();
  const lanes = new Map<string, number>();
  const recentEvents: AbuseRecentEvent[] = [];

  let signals24h = 0;
  let throttles24h = 0;
  let retiredRegistryHits24h = 0;
  let apiSignals24h = 0;
  let cardWalkingSignals7d = 0;

  for (const event of events) {
    const eventName = event.event_name?.trim() || "";
    if (eventName !== "abuse_signal" && eventName !== "abuse_throttled") {
      continue;
    }

    const createdAt = parseEventDate(event.created_at);
    if (!createdAt || createdAt < sevenDaysAgo) {
      continue;
    }

    const lane = getMetadataString(event.metadata, "lane") ?? "unknown";
    const reason = getMetadataString(event.metadata, "reason") ?? "unknown";
    const is24h = createdAt >= twentyFourHoursAgo;

    lanes.set(lane, (lanes.get(lane) ?? 0) + 1);
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1);

    if (reason === "possible_card_id_walking") {
      cardWalkingSignals7d += 1;
    }

    if (is24h) {
      if (eventName === "abuse_signal") {
        signals24h += 1;
      }

      if (eventName === "abuse_throttled") {
        throttles24h += 1;
      }

      if (lane === "retired_registry") {
        retiredRegistryHits24h += 1;
      }

      if (lane === "api") {
        apiSignals24h += 1;
      }
    }

    if (recentEvents.length < 8) {
      recentEvents.push({
        id: event.id,
        created_at: event.created_at,
        event_name: eventName,
        path: event.path?.trim() || "Unknown path",
        lane,
        reason,
        request_count: getMetadataNumber(event.metadata, "request_count"),
      });
    }
  }

  return {
    signals24h,
    throttles24h,
    retiredRegistryHits24h,
    apiSignals24h,
    cardWalkingSignals7d,
    topReasons: Array.from(reasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason))
      .slice(0, 6),
    laneCounts: Array.from(lanes.entries())
      .map(([lane, count]) => ({ lane, count }))
      .sort((left, right) => right.count - left.count || left.lane.localeCompare(right.lane)),
    recentEvents,
  };
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

function formatTimestamp(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatHoursRemaining(value: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }

  if (value >= 1) {
    return `${value.toFixed(1)}h`;
  }

  return `${Math.max(value * 60, 1).toFixed(0)}m`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function getAlertToneClasses(tone: "neutral" | "warning" | "danger" | "positive") {
  if (tone === "danger") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (tone === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function OpsPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "warning" | "danger" | "positive";
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getAlertToneClasses(tone)}`}
    >
      {label}
    </span>
  );
}

function OpsMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-600">{detail}</p> : null}
    </div>
  );
}

function statusToTone(status: FounderOpsReportStatus) {
  if (status === "healthy") return "positive";
  if (status === "warning") return "warning";
  if (status === "critical") return "danger";
  return "neutral";
}

function formatReportAge(ageHours: number | null) {
  if (ageHours == null) return "unknown";
  if (ageHours < 1) return `${Math.max(1, Math.round(ageHours * 60))}m`;
  if (ageHours < 48) return `${ageHours.toFixed(1)}h`;
  return `${Math.round(ageHours / 24)}d`;
}

function trendMovementLabel(movement: "new" | "stable" | "improved" | "degraded") {
  if (movement === "improved") return "improved";
  if (movement === "degraded") return "degraded";
  if (movement === "stable") return "stable";
  return "new trend";
}

function trendMovementTone(movement: "new" | "stable" | "improved" | "degraded") {
  if (movement === "improved") return "positive";
  if (movement === "degraded") return "danger";
  if (movement === "stable") return "neutral";
  return "warning";
}

function trendDotClass(status: FounderOpsReportStatus) {
  if (status === "healthy") return "bg-emerald-500";
  if (status === "warning") return "bg-amber-500";
  if (status === "critical") return "bg-rose-500";
  return "bg-slate-300";
}

function FounderOpsReportsSection({ registry }: { registry: FounderOpsReportRegistry }) {
  const byCategory = registry.cards.reduce(
    (acc, cardItem) => {
      const current = acc.get(cardItem.category) ?? { total: 0, critical: 0, warning: 0, healthy: 0 };
      current.total += 1;
      if (cardItem.status === "critical") current.critical += 1;
      if (cardItem.status === "warning") current.warning += 1;
      if (cardItem.status === "healthy") current.healthy += 1;
      acc.set(cardItem.category, current);
      return acc;
    },
    new Map<string, { total: number; critical: number; warning: number; healthy: number }>(),
  );

  return (
    <PageSection spacing="default">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SectionHeader
          title="Founder Ops Reports"
          description="One operating view across launch gates, catalog trust, ingestion, market evidence, product readiness, and security reports."
        />
        <div className="flex flex-wrap items-center gap-2">
          <OpsPill label={`${registry.summary.critical} critical`} tone={registry.summary.critical > 0 ? "danger" : "positive"} />
          <OpsPill label={`${registry.summary.warning} review`} tone={registry.summary.warning > 0 ? "warning" : "positive"} />
          <OpsPill label={`${registry.summary.stale} stale`} tone={registry.summary.stale > 0 ? "warning" : "positive"} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from(byCategory.entries()).map(([category, counts]) => (
          <MetricCard
            key={category}
            label={category}
            value={counts.critical > 0 ? `${counts.critical} critical` : counts.warning > 0 ? `${counts.warning} review` : "Clear"}
            detail={`${counts.healthy}/${counts.total} healthy reports`}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {registry.cards.map((report) => (
          <div key={report.id} className="gv-premium-surface px-5 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{report.category}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{report.title}</h3>
                <p className="mt-1 break-all text-xs leading-6 text-slate-500">{report.sourcePath}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <OpsPill label={report.statusLabel} tone={statusToTone(report.status)} />
                <OpsPill label={report.stale ? "stale" : formatReportAge(report.ageHours)} tone={report.stale ? "warning" : "positive"} />
                <OpsPill label={trendMovementLabel(report.trend.movement)} tone={trendMovementTone(report.trend.movement)} />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <OpsMetric label="Status" value={report.primaryMetric} detail={report.secondaryMetric} />
              <OpsMetric label="Freshness" value={formatReportAge(report.ageHours)} detail={`${report.freshnessHours}h target`} />
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Trend</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {report.trend.pointCount > 0
                      ? `${report.trend.pointCount} snapshots over ${report.trend.windowDays}d`
                      : "Waiting for scheduled snapshots"}
                  </p>
                </div>
                {report.trend.points.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5" aria-label={`${report.title} recent status history`}>
                    {report.trend.points.slice(-14).map((point) => (
                      <span
                        key={`${report.id}-${point.collectedAt}`}
                        title={`${formatTimestamp(point.collectedAt)}: ${point.status} (${point.primaryMetric})`}
                        className={`h-2.5 w-2.5 rounded-full ${trendDotClass(point.status)}`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              {report.trend.lastChangedAt ? (
                <p className="mt-2 text-xs text-slate-600">Last status change: {formatTimestamp(report.trend.lastChangedAt)}</p>
              ) : null}
            </div>

            {report.details.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {report.details.slice(0, 4).map((detail) => (
                  <div key={`${report.id}-${detail.label}`} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{detail.label}</p>
                    <p className="mt-1 truncate text-sm font-medium text-slate-900">{detail.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {report.findings.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">Findings</p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-700">
                  {report.findings.slice(0, 3).map((finding) => (
                    <li key={finding}>{finding}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                No blocking findings in this report.
              </div>
            )}
          </div>
        ))}
      </div>
    </PageSection>
  );
}

function CatalogImageOpsSection({ imageOps }: { imageOps: CatalogImageOpsSummary }) {
  const statusTone =
    imageOps.status === "healthy"
      ? "positive"
      : imageOps.status === "warning"
        ? "warning"
        : imageOps.status === "critical"
          ? "danger"
          : "neutral";
  const full = imageOps.fullScan;
  const cleanup = imageOps.cleanupPlan;
  const ageLabel =
    imageOps.generatedAgeHours == null
      ? "unknown age"
      : imageOps.generatedAgeHours < 1
        ? `${Math.max(1, Math.round(imageOps.generatedAgeHours * 60))}m old`
        : `${imageOps.generatedAgeHours.toFixed(1)}h old`;

  return (
    <PageSection spacing="default">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <SectionHeader
          title="Catalog Image Health"
          description="Read-only monitoring from the full DB image playbook: referenced image integrity, wrong-image guards, cleanup backlog, and report freshness."
        />
        <div className="flex flex-wrap items-center gap-2">
          <OpsPill label={imageOps.statusLabel} tone={statusTone} />
          <OpsPill label={imageOps.stale ? "stale report" : ageLabel} tone={imageOps.stale ? "warning" : "positive"} />
        </div>
      </div>

      {full ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard
              label="Identity Paths"
              value={formatNumber(full.metrics.identityRowsWithCanonImagePath)}
              detail={`${formatNumber(full.metrics.identityRows)} identity rows scanned`}
            />
            <MetricCard
              label="Missing Objects"
              value={formatNumber(full.metrics.missingStorageObjects)}
              detail="Referenced image paths absent from storage"
            />
            <MetricCard
              label="Bad Patterns"
              value={formatNumber(full.metrics.badSelectedPatterns)}
              detail="Selected paths matching rejected source patterns"
            />
            <MetricCard
              label="JPN Bad Patterns"
              value={formatNumber(full.metrics.japaneseBadSelectedPatterns)}
              detail="Japanese rows with selected bad patterns"
            />
            <MetricCard
              label="Zero-byte"
              value={formatNumber(full.metrics.zeroByteObjects)}
              detail="Referenced image files with no content"
            />
            <MetricCard
              label="Suspicious Unref"
              value={formatNumber(full.metrics.unreferencedSuspiciousStorageObjects)}
              detail="Unreferenced objects requiring review"
            />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="gv-premium-surface px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Scan coverage</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Full catalog image surface</h3>
                </div>
                <OpsPill label={full.metrics.missingStorageObjects === 0 ? "covered" : "gap"} tone={full.metrics.missingStorageObjects === 0 ? "positive" : "danger"} />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <OpsMetric label="Parent rows" value={formatNumber(full.metrics.parentRowsScanned)} />
                <OpsMetric label="Child rows" value={formatNumber(full.metrics.childRowsScanned)} />
                <OpsMetric label="Storage objects" value={formatNumber(full.metrics.storageObjectsScanned)} />
                <OpsMetric label="Non-image refs" value={formatNumber(full.metrics.nonImageObjects)} />
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Report</p>
                <p className="mt-1 break-all text-xs leading-6 text-slate-600">{full.reportPath}</p>
                <p className="mt-2 break-all text-xs leading-6 text-slate-500">Fingerprint: {full.fingerprint ?? "—"}</p>
              </div>
            </div>

            <div className="gv-premium-surface px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Storage hygiene</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Cleanup readiness</h3>
                </div>
                <OpsPill
                  label={cleanup && cleanup.metrics.deleteCandidates === 0 ? "no backlog" : "review"}
                  tone={cleanup && cleanup.metrics.deleteCandidates === 0 ? "positive" : "warning"}
                />
              </div>

              {cleanup ? (
                <>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <OpsMetric label="Referenced paths" value={formatNumber(cleanup.metrics.referencedCanonImagePaths)} />
                    <OpsMetric label="Delete candidates" value={formatNumber(cleanup.metrics.deleteCandidates)} detail={formatBytes(cleanup.metrics.deleteCandidateBytes)} />
                    <OpsMetric label="Held proof files" value={formatNumber(cleanup.metrics.holdObjects)} detail={formatBytes(cleanup.metrics.holdBytes)} />
                    <OpsMetric label="Unreferenced total" value={formatNumber(cleanup.metrics.unreferencedCanonStorageObjects)} />
                  </div>

                  {cleanup.holdReasons.length > 0 ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {cleanup.holdReasons.map((item) => (
                        <span
                          key={item.key}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                        >
                          {item.key.replace(/_/g, " ")}: {item.count}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="mt-5 text-sm leading-6 text-slate-600">Cleanup plan report is unavailable.</p>
              )}
            </div>
          </div>

          {imageOps.blockingFindings.length > 0 || imageOps.warningFindings.length > 0 ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {imageOps.blockingFindings.length > 0 ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
                  <p className="text-sm font-semibold text-rose-800">Blocking findings</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-rose-700">
                    {imageOps.blockingFindings.map((finding) => (
                      <li key={finding}>{finding}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {imageOps.warningFindings.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                  <p className="text-sm font-semibold text-amber-800">Warnings</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-700">
                    {imageOps.warningFindings.map((finding) => (
                      <li key={finding}>{finding}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-700">
              No image integrity blockers or cleanup backlog were found in the latest report.
            </div>
          )}

          {full.topUnreferencedFolders.length > 0 ? (
            <div className="mt-5 gv-soft-surface px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Unreferenced held folders</p>
              <div className="mt-3 space-y-2">
                {full.topUnreferencedFolders.map((item) => (
                  <div key={item.key} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="break-all font-medium text-slate-800">{item.key}</span>
                    <span className="text-slate-500">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyPanel message="Catalog image health report is unavailable. Run the full DB image playbook scan, then reload the founder page." />
      )}
    </PageSection>
  );
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
    <div className="gv-premium-surface px-5 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-600">{detail}</p> : null}
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="gv-soft-surface px-6 py-6 text-sm leading-7 text-slate-600">
      {message}
    </div>
  );
}

function FounderToolCard({
  href,
  title,
  description,
  eyebrow,
  primary = false,
}: {
  href: string;
  title: string;
  description: string;
  eyebrow: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-[1.75rem] border px-5 py-5 transition hover:-translate-y-0.5 ${
        primary
          ? "border-slate-950 bg-slate-950 text-white shadow-[0_30px_84px_-46px_rgba(15,23,42,0.9)] hover:bg-slate-900 dark:border-white/10 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
          : "gv-premium-surface text-slate-950 hover:border-slate-300"
      }`}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${primary ? "text-slate-300" : "text-slate-500"}`}>
        {eyebrow}
      </p>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className={`text-sm leading-6 ${primary ? "text-slate-300" : "text-slate-600"}`}>{description}</p>
        </div>
        <span
          aria-hidden="true"
          className={`mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg transition group-hover:translate-x-0.5 ${
            primary ? "border-white/20 bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {"->"}
        </span>
      </div>
    </Link>
  );
}

export default async function FounderPage() {
  const admin = createServerAdminClient();
  await requireFounderAccess("/founder");

  const [pricingOps, imageOps, opsReportRegistry] = await Promise.all([
    getFounderPricingOpsSummary(admin),
    getCatalogImageOpsSummary(),
    getFounderOpsReportRegistry(),
  ]);
  let marketSignals: FounderInsightBundle | null = null;
  let marketSignalsError: string | null = null;
  try {
    marketSignals = await getFounderMarketSignals(admin);
  } catch (error) {
    marketSignalsError =
      error instanceof Error
        ? error.message
        : "Unknown founder market-signal error";
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
  const abuseProtectionMetrics = aggregateAbuseProtectionMetrics(telemetryRows);

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
    <PageContainer className="space-y-8 py-8">
      <section className="gv-collector-panel px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
        <PageIntro
          eyebrow="Founder"
          title="Founder Control Center"
          description="A single governed operating surface for access levels, warehouse review, pricing operations, product telemetry, and vault growth signals."
          actions={
            <>
              <Link href="/founder/entitlements" className="gv-primary-button">
                Manage Entitlements
              </Link>
              <Link href="/founder/warehouse" className="gv-secondary-button">
                Review Warehouse
              </Link>
            </>
          }
        />
      </section>

      <PageSection spacing="loose" className="gv-collector-panel px-5 py-6 sm:px-7">
        <SectionHeader
          title="Founder Tools"
          description="Use these guarded lanes for access, review, and staged operational changes."
        />
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
          <FounderToolCard
            href="/founder/entitlements"
            eyebrow="Access"
            title="User Entitlements"
            description="Manage Grookai Search, Assistant, Intelligence, vendor, and founder access from one governed source."
            primary
          />
          <FounderToolCard
            href="/founder/metrics"
            eyebrow="Metrics"
            title="North Star"
            description="Read weekly product health, notification tap-through, onboarding conversion, and advisory delivery flags."
          />
          <FounderToolCard
            href="/founder/warehouse"
            eyebrow="Images"
            title="Warehouse Review"
            description="Review image evidence and warehouse candidates without mixing review decisions into data execution."
          />
          <FounderToolCard
            href="/founder/staging"
            eyebrow="Operations"
            title="Staging Dashboard"
            description="Inspect staged work before any guarded production path is considered."
          />
          <FounderToolCard
            href="/founder/early-access"
            eyebrow="Leads"
            title="Early Access"
            description="View and copy early access emails captured through the public landing page."
          />
        </div>
      </PageSection>

      {telemetryError ? (
        <EmptyPanel message={`Telemetry analytics could not be loaded right now: ${telemetryError.message}`} />
      ) : null}

      {marketSignalsError ? (
        <EmptyPanel
          message={`Market signals could not be loaded right now: ${marketSignalsError}`}
        />
      ) : marketSignals ? (
        <FounderMarketSignalsSection insights={marketSignals} />
      ) : null}

      <FounderOpsReportsSection registry={opsReportRegistry} />

      <CatalogImageOpsSection imageOps={imageOps} />

      <PricingOpsSection pricingOps={pricingOps} />

      <PageSection spacing="default">
        <SectionHeader
          title="Product Signals"
          description="Rolling telemetry windows for traffic, engagement, and conversion intent."
        />

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
      </PageSection>

      <PageSection spacing="default">
        <SectionHeader
          title="Catalog Protection"
          description="Abuse signals from retired registry probes, API bursts, search pressure, and observed card-ID walking."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Signals (24h)" value={abuseProtectionMetrics.signals24h} detail="Observed suspicious behavior without blocking normal card indexing" />
          <MetricCard label="Throttles (24h)" value={abuseProtectionMetrics.throttles24h} detail="Requests returned 429 by the protection middleware" />
          <MetricCard label="Retired ID Hits (24h)" value={abuseProtectionMetrics.retiredRegistryHits24h} detail="Requests to /ids or /ids/cards after retirement" />
          <MetricCard label="API Signals (24h)" value={abuseProtectionMetrics.apiSignals24h} detail="API volume or probe signals" />
          <MetricCard label="Card Walking (7d)" value={abuseProtectionMetrics.cardWalkingSignals7d} detail="Observed only; card pages remain crawlable" />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="gv-premium-surface px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Protection lanes</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Signal mix</h3>
              </div>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                7d
              </span>
            </div>

            {abuseProtectionMetrics.laneCounts.length === 0 ? (
              <p className="mt-5 text-sm leading-6 text-slate-600">No abuse signals have been recorded yet.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {abuseProtectionMetrics.laneCounts.map((lane) => {
                  const maxCount = Math.max(...abuseProtectionMetrics.laneCounts.map((item) => item.count), 1);
                  const widthPercent = Math.max(8, Math.round((lane.count / maxCount) * 100));
                  return (
                    <div key={lane.lane} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-slate-800">{lane.lane.replace(/_/g, " ")}</span>
                        <span className="font-medium text-slate-500">{lane.count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-slate-950" style={{ width: `${widthPercent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="gv-premium-surface px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recent protection events</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Latest signals</h3>
              </div>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                Live
              </span>
            </div>

            {abuseProtectionMetrics.recentEvents.length === 0 ? (
              <p className="mt-5 text-sm leading-6 text-slate-600">No recent protection events.</p>
            ) : (
              <div className="mt-5 divide-y divide-slate-100">
                {abuseProtectionMetrics.recentEvents.map((event) => (
                  <div key={event.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{event.reason.replace(/_/g, " ")}</p>
                      <p className="truncate text-xs font-medium text-slate-500">
                        {event.lane.replace(/_/g, " ")} - {event.path}
                      </p>
                    </div>
                    <div className="text-left text-xs text-slate-500 sm:text-right">
                      <p className="font-semibold text-slate-700">{event.event_name === "abuse_throttled" ? "Throttled" : "Observed"}</p>
                      <p>
                        {formatTimeAgo(event.created_at)}
                        {event.request_count !== null ? ` - ${event.request_count} req` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {abuseProtectionMetrics.topReasons.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {abuseProtectionMetrics.topReasons.map((reason) => (
              <span
                key={reason.reason}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {reason.reason.replace(/_/g, " ")}: {reason.count}
              </span>
            ))}
          </div>
        ) : null}
      </PageSection>

      <PageSection spacing="default">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <SectionHeader
              title="Top Search Terms (7d)"
              description="Normalized search queries grouped case-insensitively."
            />

            {topSearchTerms.length === 0 ? (
              <EmptyPanel message="No search telemetry has been recorded yet." />
            ) : (
              <div className="space-y-3">
                {topSearchTerms.map((term) => (
                  <div
                    key={term.query}
                    className="gv-soft-surface flex items-center justify-between gap-4 px-5 py-4"
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
            <SectionHeader
              title="Top Viewed Cards (7d)"
              description="Most-viewed public card pages by canonical GV-ID."
            />

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
                    className="gv-soft-surface flex items-center gap-4 px-4 py-4 transition hover:-translate-y-0.5"
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
        </div>
      </PageSection>

      <PageSection spacing="default">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active Vault Instances" value={vaultRows.length} detail="Active owned objects read from vault_item_instances" />
          <MetricCard label="Distinct Vault Users" value={distinctUsers} detail="Collectors with vault activity" />
          <MetricCard label="Distinct GV-IDs" value={distinctCards} detail="Unique canonical cards in vault ownership" />
          <MetricCard label="Total Active Instances" value={totalQuantity} detail="Count of active owned objects across all canonical vault instances" />
        </div>
      </PageSection>

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
    </PageContainer>
  );
}

function PricingOpsSection({ pricingOps }: { pricingOps: FounderPricingOpsSummary }) {
  const { budget, budgetBurn, config, errorDistribution, errors, queueHealth, queueVelocity, retryRows, throughputBuckets } =
    pricingOps;
  const budgetTone = !budget ? "neutral" : budget.exhausted ? "danger" : budget.pctUsed >= 0.8 ? "warning" : "positive";
  const burnTone =
    !budgetBurn || budgetBurn.insufficientData
      ? "neutral"
      : budget?.exhausted
        ? "danger"
        : budgetBurn.projectedHoursRemaining != null && budgetBurn.projectedHoursRemaining <= 2
          ? "danger"
          : budgetBurn.projectedHoursRemaining != null && budgetBurn.projectedHoursRemaining <= 6
            ? "warning"
            : "positive";
  const retryTone =
    queueHealth && (queueHealth.retryable429Count > 3 || retryRows.length >= 5)
      ? "warning"
      : retryRows.length > 0
        ? "neutral"
        : "positive";
  const backlogTone =
    queueHealth && (queueHealth.backlogGrowing || queueHealth.pendingCount > 100)
      ? "warning"
      : queueHealth && queueHealth.pendingCount > 0
        ? "neutral"
        : "positive";
  const queueVelocityTone =
    !queueVelocity
      ? "neutral"
      : queueVelocity.trend === "growing"
        ? "warning"
        : queueVelocity.trend === "shrinking"
          ? "positive"
          : "neutral";
  const dominantErrorTone =
    !errorDistribution || !errorDistribution.dominantBucket
      ? "positive"
      : errorDistribution.dominantBucket === "budget_exhausted" || errorDistribution.dominantBucket === "generic_failure"
        ? "danger"
        : errorDistribution.dominantBucket === "retryable_429"
          ? "warning"
          : "neutral";
  const dominantErrorLabel =
    !errorDistribution || !errorDistribution.dominantBucket
      ? "No recent failures"
      : errorDistribution.dominantBucket === "retryable_429"
        ? "Retryable 429"
        : errorDistribution.dominantBucket === "budget_exhausted"
          ? "Budget exhausted"
          : errorDistribution.dominantBucket === "generic_failure"
            ? "Generic failure"
            : "Other";

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Pricing Ops</h2>
          <p className="text-sm text-slate-600">
            Live founder visibility into Browse quota, queue pressure, and retry behavior.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OpsPill
            label={budget ? `${formatPct(budget.pctUsed)} budget used` : "Budget unavailable"}
            tone={budgetTone}
          />
          <OpsPill
            label={
              queueHealth?.backlogGrowing
                ? "Backlog growing"
                : queueHealth && queueHealth.pendingCount > 0
                  ? "Backlog present"
                  : "Backlog clear"
            }
            tone={backlogTone}
          />
          <OpsPill
            label={retryRows.length > 0 ? `${retryRows.length} recent retry rows` : "Retry pressure quiet"}
            tone={retryTone}
          />
          <OpsPill
            label={queueVelocity ? `Queue ${queueVelocity.trend}` : "Queue velocity unavailable"}
            tone={queueVelocityTone}
          />
          <OpsPill label={dominantErrorLabel} tone={dominantErrorTone} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Browse Budget</h3>
              <p className="text-sm text-slate-600">Live snapshot from the budget RPC for today&apos;s UTC bucket.</p>
            </div>
            {budget ? <OpsPill label={budget.exhausted ? "Exhausted" : "Active"} tone={budgetTone} /> : null}
          </div>

          {errors.budget ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errors.budget}
            </div>
          ) : budget ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <OpsMetric label="Provider" value={budget.provider} />
                <OpsMetric label="Usage Date" value={budget.usageDate ?? "—"} />
                <OpsMetric label="Pct Used" value={formatPct(budget.pctUsed)} detail={budget.exhausted ? "Daily budget exhausted" : "Safe until quota is consumed"} />
                <OpsMetric label="Consumed Calls" value={budget.consumedCalls.toLocaleString("en-US")} />
                <OpsMetric label="Daily Budget" value={budget.dailyBudget.toLocaleString("en-US")} />
                <OpsMetric label="Remaining Calls" value={budget.remainingCalls.toLocaleString("en-US")} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Quota progress</span>
                  <span>{budget.consumedCalls.toLocaleString("en-US")} / {budget.dailyBudget.toLocaleString("en-US")}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${budget.exhausted ? "bg-rose-500" : budget.pctUsed >= 0.8 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.max(4, Math.min(budget.pctUsed * 100, 100))}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <EmptyPanel message="Pricing budget snapshot is unavailable right now." />
          )}
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Queue Health</h3>
              <p className="text-sm text-slate-600">Open pricing job backlog plus recent completion and retry signals.</p>
            </div>
            {queueHealth ? (
              <OpsPill
                label={queueHealth.backlogGrowing ? "Growing" : queueHealth.pendingCount > 0 ? "Open Queue" : "Idle"}
                tone={backlogTone}
              />
            ) : null}
          </div>

          {errors.queueHealth ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errors.queueHealth}
            </div>
          ) : queueHealth ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <OpsMetric label="Pending" value={queueHealth.pendingCount.toLocaleString("en-US")} />
                <OpsMetric label="Running" value={queueHealth.runningCount.toLocaleString("en-US")} />
                <OpsMetric label="Done (24h)" value={queueHealth.done24hCount.toLocaleString("en-US")} />
                <OpsMetric label="Failed (24h)" value={queueHealth.failed24hCount.toLocaleString("en-US")} />
                <OpsMetric label="Retryable 429" value={queueHealth.retryable429Count.toLocaleString("en-US")} detail="Pending jobs currently marked retryable_429" />
                <OpsMetric label="Stale Running" value={queueHealth.staleRunningCount.toLocaleString("en-US")} detail="Running past the 10-minute reclaim TTL" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Last Hour</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {queueHealth.requestedLastHourCount.toLocaleString("en-US")} requested / {queueHealth.startedLastHourCount.toLocaleString("en-US")} started
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Backlog Signal</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {queueHealth.backlogGrowing ? "Requested jobs outpacing starts" : "No current growth signal"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyPanel message="Queue health is unavailable right now." />
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Burn Rate</h3>
              <p className="text-sm text-slate-600">
                Estimated Browse pressure over the last hour using recent job starts and the configured calls-per-job ceiling.
              </p>
            </div>
            {budgetBurn ? (
              <OpsPill label={budgetBurn.insufficientData ? "Insufficient data" : "Estimated"} tone={burnTone} />
            ) : null}
          </div>

          {errors.budgetBurn ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errors.budgetBurn}
            </div>
          ) : budgetBurn ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <OpsMetric
                  label="Calls Consumed (1h)"
                  value={budgetBurn.callsConsumedLastHour.toLocaleString("en-US")}
                />
                <OpsMetric
                  label="Burn Rate"
                  value={
                    budgetBurn.burnRatePerHour == null
                      ? "—"
                      : `${budgetBurn.burnRatePerHour.toLocaleString("en-US")}/h`
                  }
                />
                <OpsMetric
                  label="Estimated Hours Remaining"
                  value={formatHoursRemaining(budgetBurn.projectedHoursRemaining)}
                  detail={budgetBurn.insufficientData ? "Waiting for started jobs in the last hour." : undefined}
                />
                <OpsMetric
                  label="Started Jobs (1h)"
                  value={budgetBurn.recentStartedJobs.toLocaleString("en-US")}
                  detail={`Estimated at up to ${budgetBurn.estimatedCallsPerStartedJob} Browse calls per started job`}
                />
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Estimate Basis</p>
                <p className="mt-1 font-medium text-slate-900">{budgetBurn.estimateLabel}</p>
              </div>
            </div>
          ) : (
            <EmptyPanel message="Burn rate is unavailable right now." />
          )}
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Queue Velocity</h3>
              <p className="text-sm text-slate-600">Requested, started, and completed jobs over the last hour.</p>
            </div>
            {queueVelocity ? (
              <OpsPill
                label={queueVelocity.trend.charAt(0).toUpperCase() + queueVelocity.trend.slice(1)}
                tone={queueVelocityTone}
              />
            ) : null}
          </div>

          {errors.queueVelocity ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errors.queueVelocity}
            </div>
          ) : queueVelocity ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <OpsMetric label="Requested (1h)" value={queueVelocity.requestedLastHourCount.toLocaleString("en-US")} />
                <OpsMetric label="Started (1h)" value={queueVelocity.startedLastHourCount.toLocaleString("en-US")} />
                <OpsMetric label="Completed (1h)" value={queueVelocity.completedLastHourCount.toLocaleString("en-US")} />
                <OpsMetric
                  label="Net Backlog Delta"
                  value={
                    queueVelocity.netBacklogDelta > 0
                      ? `+${queueVelocity.netBacklogDelta.toLocaleString("en-US")}`
                      : queueVelocity.netBacklogDelta.toLocaleString("en-US")
                  }
                  detail="Requested minus completed over the same 60-minute window"
                />
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Requested vs started</p>
                <p className="mt-1 font-medium text-slate-900">
                  {queueVelocity.requestedLastHourCount.toLocaleString("en-US")} requested /{" "}
                  {queueVelocity.startedLastHourCount.toLocaleString("en-US")} started
                </p>
              </div>
            </div>
          ) : (
            <EmptyPanel message="Queue velocity is unavailable right now." />
          )}
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Error Distribution</h3>
              <p className="text-sm text-slate-600">Recent pricing job errors normalized into operator-readable buckets.</p>
            </div>
            <OpsPill label={dominantErrorLabel} tone={dominantErrorTone} />
          </div>

          {errors.errorDistribution ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errors.errorDistribution}
            </div>
          ) : errorDistribution ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <OpsMetric
                  label="Retryable 429"
                  value={errorDistribution.retryable429Count.toLocaleString("en-US")}
                  detail={errorDistribution.samples.retryable429}
                />
                <OpsMetric
                  label="Budget Exhausted"
                  value={errorDistribution.budgetExhaustedCount.toLocaleString("en-US")}
                  detail={errorDistribution.samples.budgetExhausted}
                />
                <OpsMetric
                  label="Generic Failure"
                  value={errorDistribution.genericFailureCount.toLocaleString("en-US")}
                  detail={errorDistribution.samples.genericFailure}
                />
                <OpsMetric
                  label="Other"
                  value={errorDistribution.otherCount.toLocaleString("en-US")}
                  detail={errorDistribution.samples.other}
                />
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Dominant failure mode</p>
                <p className="mt-1 font-medium text-slate-900">
                  {dominantErrorLabel}
                  {errorDistribution.totalCount > 0 ? ` (${errorDistribution.totalCount} total recent errors)` : ""}
                </p>
              </div>
            </div>
          ) : (
            <EmptyPanel message="No recent pricing job error data is available." />
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Throughput</h3>
              <p className="text-sm text-slate-600">Jobs started over the last hour, grouped into 5-minute buckets.</p>
            </div>
            <OpsPill label={`${throughputBuckets.reduce((sum, bucket) => sum + bucket.startedCount, 0)} starts`} tone="neutral" />
          </div>

          {errors.throughput ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errors.throughput}
            </div>
          ) : throughputBuckets.length === 0 ? (
            <div className="mt-4">
              <EmptyPanel message="No pricing jobs have started in the last hour." />
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Bucket</th>
                    <th className="px-4 py-3 text-right">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                  {throughputBuckets.map((bucket) => (
                    <tr key={bucket.bucketStartIso}>
                      <td className="px-4 py-3">{formatTimestamp(bucket.bucketStartIso)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{bucket.startedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Live Config</h3>
            <p className="text-sm text-slate-600">Current expected operating config used by the Founder dashboard logic.</p>
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Daily Budget</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{config.dailyBudget.toLocaleString("en-US")}</p>
              <p className="mt-1 text-xs text-slate-600">Source: {config.budgetSource === "env" ? "runtime env" : "dashboard default"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Active Listings Limit</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{config.activeListingsLimit.toLocaleString("en-US")}</p>
              <p className="mt-1 text-xs text-slate-600">Source: {config.activeListingsLimitSource === "env" ? "runtime env" : "dashboard default"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Min Job Start Delay</p>
              <p className="mt-1 text-xl font-semibold text-slate-950">{config.minJobStartDelayMs.toLocaleString("en-US")} ms</p>
              <p className="mt-1 text-xs text-slate-600">Source: {config.minJobStartDelaySource === "env" ? "runtime env" : "dashboard default"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Recent Retry Pressure</h3>
            <p className="text-sm text-slate-600">Recent pricing jobs whose error trail suggests 429 or rate-limit retry behavior.</p>
          </div>
          <OpsPill label={`${retryRows.length} rows`} tone={retryTone} />
        </div>

        {errors.retryPressure ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errors.retryPressure}
          </div>
        ) : retryRows.length === 0 ? (
          <div className="mt-4">
            <EmptyPanel message="No recent 429 or rate-limit retry rows were found." />
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="pb-3 pr-4">Card</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Attempts</th>
                  <th className="pb-3 pr-4">Requested</th>
                  <th className="pb-3 pr-4">Started</th>
                  <th className="pb-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {retryRows.map((row) => {
                  const cardLabel = row.name
                    ? [row.name, row.setCode, row.number ? `#${row.number}` : undefined].filter(Boolean).join(" • ")
                    : row.cardPrintId ?? row.id;
                  const cardContent = row.gvId ? (
                    <Link href={`/card/${row.gvId}`} className="font-medium text-slate-900 hover:text-slate-700">
                      {cardLabel}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-900">{cardLabel}</span>
                  );

                  return (
                    <tr key={row.id}>
                      <td className="py-3 pr-4">
                        <div className="space-y-1">
                          {cardContent}
                          {row.gvId ? <p className="text-xs text-slate-500">{row.gvId}</p> : null}
                          {!row.gvId && row.cardPrintId ? <p className="text-xs text-slate-500">{row.cardPrintId}</p> : null}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <OpsPill
                          label={row.status}
                          tone={row.status === "failed" ? "danger" : row.status === "pending" ? "warning" : "neutral"}
                        />
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-900">{row.attempts}</td>
                      <td className="py-3 pr-4">{formatTimestamp(row.requestedAt)}</td>
                      <td className="py-3 pr-4">{formatTimestamp(row.startedAt)}</td>
                      <td className="py-3 align-top">
                        <p className="max-w-[30rem] break-words text-slate-700">{row.error ?? "—"}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
