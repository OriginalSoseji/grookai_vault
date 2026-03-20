import type { CardPricingComps } from "@/lib/pricing/getCardPricingComps";

type PricingCompsPanelProps = {
  currentPrice?: number;
  currentPriceSource?: string;
  currentPriceTs?: string;
  comps: CardPricingComps;
};

function formatCurrency(value?: number, currency = "USD") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "Unknown";
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(parsed));
}

function formatConfidence(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Unavailable";
  }
  return `${Math.round(value * 100)}%`;
}

function ThinState({
  acceptedCount,
  stagedCount,
  rejectedCount,
}: {
  acceptedCount: number;
  stagedCount: number;
  rejectedCount: number;
}) {
  return (
    <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
      <p className="font-semibold">No accepted live comps yet</p>
      <p className="mt-1 text-amber-800">
        Persisted observation evidence is still thin for this card.
        {stagedCount > 0 || rejectedCount > 0
          ? ` Filtered rows: ${stagedCount} staged, ${rejectedCount} rejected.`
          : " No staged or rejected rows are persisted yet."}
      </p>
    </div>
  );
}

function CompRow({
  row,
  secondary,
}: {
  row: CardPricingComps["accepted"][number];
  secondary?: boolean;
}) {
  const reasonBits = [row.mapping_status, row.exclusion_reason].filter((value): value is string => Boolean(value));

  return (
    <li
      className={`rounded-[16px] border px-4 py-4 ${
        secondary ? "border-slate-200 bg-slate-50" : "border-emerald-200 bg-emerald-50/60"
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{row.title ?? "Untitled listing"}</p>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span>{row.classification}</span>
            <span>{row.condition_bucket ?? row.condition_raw ?? "unknown condition"}</span>
            <span>{formatTimestamp(row.observed_at)}</span>
          </div>
          {reasonBits.length > 0 ? <p className="text-xs text-slate-500">{reasonBits.join(" • ")}</p> : null}
        </div>

        <div className="space-y-1 text-left lg:text-right">
          <p className="text-sm font-semibold text-slate-900">{formatCurrency(row.total_price, row.currency)}</p>
          {row.shipping > 0 ? (
            <p className="text-xs text-slate-500">
              {formatCurrency(row.price, row.currency)} + {formatCurrency(row.shipping, row.currency)} shipping
            </p>
          ) : (
            <p className="text-xs text-slate-500">{formatCurrency(row.price, row.currency)} item price</p>
          )}
          {row.listing_url ? (
            <a
              href={row.listing_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline"
            >
              View listing
            </a>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function PricingCompsPanel({
  currentPrice,
  currentPriceSource,
  currentPriceTs,
  comps,
}: PricingCompsPanelProps) {
  const acceptedCount = comps.summary.accepted_count;
  const stagedCount = comps.summary.staged_count;
  const rejectedCount = comps.summary.rejected_count;
  const hasAccepted = acceptedCount > 0;
  const isThin = acceptedCount > 0 && acceptedCount <= 2;
  const acceptedRangeMin = formatCurrency(comps.summary.accepted_price_min);
  const acceptedRangeMax = formatCurrency(comps.summary.accepted_price_max);

  return (
    <section className="space-y-4 rounded-[20px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Pricing Comps</h2>
        <p className="text-sm text-slate-600">Persisted observation evidence behind the current displayed price.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current Displayed Price</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{formatCurrency(currentPrice)}</p>
          <p className="mt-1 text-xs text-slate-500">{currentPriceSource ?? "No source metadata"}</p>
        </div>
        <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Accepted Comps</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{acceptedCount}</p>
          {hasAccepted && acceptedRangeMin && acceptedRangeMax ? (
            <p className="mt-1 text-xs text-slate-500">Range {acceptedRangeMin} to {acceptedRangeMax}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">No accepted comps yet</p>
          )}
        </div>
        <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Last Observed</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{formatTimestamp(comps.summary.latest_observed_at)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Avg match confidence {formatConfidence(comps.summary.accepted_average_match_confidence)}
          </p>
        </div>
        <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Filtered Out</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{stagedCount + rejectedCount}</p>
          <p className="mt-1 text-xs text-slate-500">
            {stagedCount} staged • {rejectedCount} rejected
          </p>
        </div>
      </div>

      {hasAccepted ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">Accepted comps</h3>
            {isThin ? (
              <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                Low comp count
              </span>
            ) : null}
          </div>
          <ul className="space-y-3">
            {comps.accepted.map((row) => (
              <CompRow key={row.id} row={row} />
            ))}
          </ul>
        </div>
      ) : (
        <ThinState acceptedCount={acceptedCount} stagedCount={stagedCount} rejectedCount={rejectedCount} />
      )}

      {(stagedCount > 0 || rejectedCount > 0) ? (
        <details className="group rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
            Filtered out listings
            <span className="ml-2 text-xs font-medium text-slate-500 group-open:hidden">
              {stagedCount} staged • {rejectedCount} rejected
            </span>
          </summary>
          <div className="mt-4 space-y-4">
            {stagedCount > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Staged</h4>
                <ul className="space-y-3">
                  {comps.staged.map((row) => (
                    <CompRow key={row.id} row={row} secondary />
                  ))}
                </ul>
              </div>
            ) : null}

            {rejectedCount > 0 ? (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Rejected</h4>
                <ul className="space-y-3">
                  {comps.rejected.map((row) => (
                    <CompRow key={row.id} row={row} secondary />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      {!hasAccepted && stagedCount === 0 && rejectedCount === 0 ? (
        <p className="text-xs text-slate-500">No persisted pricing observations exist for this card yet.</p>
      ) : null}

      {currentPriceTs ? (
        <p className="text-xs text-slate-500">Current displayed price timestamp: {formatTimestamp(currentPriceTs)}</p>
      ) : null}
    </section>
  );
}
