import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import type {
  FounderInsightBundle,
  FounderInsightCardRow,
  FounderInsightSection,
  FounderInsightSetRow,
  FounderInsightSetSection,
} from "@/lib/founder/getFounderMarketSignals";
import { getBestPublicCardImageUrl } from "@/lib/publicCardImage";

export default function FounderMarketSignalsSection({
  insights,
  showHeader = true,
}: {
  insights: FounderInsightBundle;
  showHeader?: boolean;
}) {
  const sections: Array<
    | { kind: "card"; section: FounderInsightSection }
    | { kind: "set"; section: FounderInsightSetSection }
  > = [
    { kind: "card", section: insights.topWanted },
    { kind: "card", section: insights.mostOpened },
    { kind: "card", section: insights.mostAddedToVault },
    { kind: "card", section: insights.demandVsSupplyGap },
    { kind: "card", section: insights.mostDiscussed },
    { kind: "set", section: insights.setMomentum },
    { kind: "card", section: insights.hotRightNow },
  ];

  return (
    <section className="space-y-5">
      {showHeader ? (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Market Signals
          </h2>
          <p className="text-sm text-slate-600">
            Founder-only ranked cards and sets derived from real collector
            demand, interaction, and active ownership.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        {sections.map((item) =>
          item.kind === "card" ? (
            <FounderSignalCard key={item.section.title} section={item.section} />
          ) : (
            <FounderSetSignalCard
              key={item.section.title}
              section={item.section}
            />
          ),
        )}
      </div>
    </section>
  );
}

function FounderSignalCard({ section }: { section: FounderInsightSection }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-950">{section.title}</h3>
        <p className="text-sm text-slate-600">{section.description}</p>
      </div>

      {section.rows.length === 0 ? (
        <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
          {section.emptyMessage}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {section.rows.map((row, index) => (
            <FounderSignalRow
              key={`${section.title}-${row.card.id}`}
              row={row}
              index={index}
              scoreLabel={section.scoreLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FounderSetSignalCard({
  section,
}: {
  section: FounderInsightSetSection;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-slate-950">{section.title}</h3>
        <p className="text-sm text-slate-600">{section.description}</p>
      </div>

      {section.rows.length === 0 ? (
        <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-600">
          {section.emptyMessage}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {section.rows.map((row, index) => (
            <FounderSetSignalRow
              key={`${section.title}-${row.setCode ?? row.setName ?? index}`}
              row={row}
              index={index}
              scoreLabel={section.scoreLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FounderSignalRow({
  row,
  index,
  scoreLabel,
}: {
  row: FounderInsightCardRow;
  index: number;
  scoreLabel: string;
}) {
  const imageUrl = getBestPublicCardImageUrl(
    row.card.imageUrl,
    row.card.imageAltUrl,
  );
  const metadata = [
    row.card.setName ?? row.card.setCode,
    row.card.number ? `#${row.card.number}` : undefined,
  ]
    .filter(Boolean)
    .join(" • ");
  const content = (
    <div className="flex items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 transition hover:border-slate-300">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
        {index + 1}
      </div>
      <PublicCardImage
        src={imageUrl}
        alt={row.card.name}
        imageClassName="h-24 w-16 rounded-lg border border-slate-200 bg-slate-50 object-contain p-1"
        fallbackClassName="flex h-24 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-1 text-center text-[10px] text-slate-500"
        fallbackLabel={row.card.name}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="space-y-1">
          <p className="truncate text-base font-medium text-slate-950">
            {row.card.name}
          </p>
          <p className="text-sm text-slate-600">{metadata || "Card signal"}</p>
          {row.card.gvId ? (
            <p className="text-xs font-medium tracking-[0.08em] text-slate-500">
              {row.card.gvId}
            </p>
          ) : null}
        </div>
        <p className="text-sm leading-6 text-slate-700">{row.reason}</p>
        <FounderBreakdownChips signalBreakdown={row.signalBreakdown} />
      </div>
      <div className="shrink-0 rounded-2xl bg-slate-50 px-3 py-2 text-right text-sm text-slate-700">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {scoreLabel}
        </p>
        <p className="mt-1 font-medium text-slate-900">{row.score}</p>
      </div>
    </div>
  );

  if (!row.card.gvId) {
    return content;
  }

  return <Link href={`/card/${encodeURIComponent(row.card.gvId)}`}>{content}</Link>;
}

function FounderSetSignalRow({
  row,
  index,
  scoreLabel,
}: {
  row: FounderInsightSetRow;
  index: number;
  scoreLabel: string;
}) {
  const setLabel = row.setName ?? row.setCode ?? "Unknown set";
  const setMeta =
    row.setName && row.setCode
      ? row.setCode
      : row.setName
        ? "Set signal"
        : "Set signal";

  return (
    <div className="flex items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
        {index + 1}
      </div>
      <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
        {row.setCode ?? "SET"}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="space-y-1">
          <p className="truncate text-base font-medium text-slate-950">
            {setLabel}
          </p>
          <p className="text-sm text-slate-600">{setMeta}</p>
        </div>
        <p className="text-sm leading-6 text-slate-700">{row.reason}</p>
        <FounderBreakdownChips signalBreakdown={row.signalBreakdown} />
      </div>
      <div className="shrink-0 rounded-2xl bg-slate-50 px-3 py-2 text-right text-sm text-slate-700">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {scoreLabel}
        </p>
        <p className="mt-1 font-medium text-slate-900">{row.score}</p>
      </div>
    </div>
  );
}

function FounderBreakdownChips({
  signalBreakdown,
}: {
  signalBreakdown: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(signalBreakdown)
        .filter(([, value]) => value > 0)
        .map(([key, value]) => (
          <span
            key={key}
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600"
          >
            {formatBreakdownLabel(key)} {value}
          </span>
        ))}
    </div>
  );
}

function formatBreakdownLabel(key: string) {
  switch (key) {
    case "wants":
      return "Wants";
    case "wantsCurrent":
      return "Current Wants";
    case "opens7d":
      return "Opens";
    case "addedToVault7d":
      return "Adds";
    case "comments7d":
      return "Discussed";
    case "opens48h":
      return "Opens 48h";
    case "wants48h":
      return "Wants 48h";
    case "addedToVault48h":
      return "Adds 48h";
    case "comments48h":
      return "Discussed 48h";
    case "owners":
      return "Owners";
    case "gap":
      return "Gap";
    default:
      return key;
  }
}
