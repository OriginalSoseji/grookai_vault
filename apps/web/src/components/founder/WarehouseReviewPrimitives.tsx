import type { ReactNode } from "react";

type WarehouseBadgeProps = {
  value: string | boolean | null | undefined;
  tone?: "default" | "success" | "warning" | "danger" | "muted";
};

type JsonDisclosureProps = {
  label: string;
  value: unknown;
  defaultOpen?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeTone(value: string | boolean | null | undefined): NonNullable<WarehouseBadgeProps["tone"]> {
  if (value === true) {
    return "warning";
  }

  switch (String(value ?? "").toUpperCase()) {
    case "REVIEW_READY":
    case "NORMALIZED":
    case "CLASSIFIED":
    case "PROMOTED":
    case "NORMALIZED_READY":
    case "CLASSIFIED_READY":
    case "SUCCEEDED":
    case "NO_OP":
    case "CARD_PRINT_CREATED":
    case "CARD_PRINTING_CREATED":
    case "CANON_IMAGE_ENRICHED":
      return "success";
    case "RAW":
    case "PENDING":
    case "RUNNING":
    case "NORMALIZED_PARTIAL":
    case "CLASSIFIED_PARTIAL":
    case "REVIEW_REQUIRED":
      return "warning";
    case "BLOCKED_NO_PROMOTION":
    case "CLASSIFICATION_BLOCKED":
    case "NORMALIZATION_BLOCKED":
    case "FAILED":
    case "REJECTED":
    case "ARCHIVED":
      return "danger";
    default:
      return "muted";
  }
}

const TONE_CLASSNAME: Record<NonNullable<WarehouseBadgeProps["tone"]>, string> = {
  default: "border-slate-200 bg-white text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  muted: "border-slate-200 bg-slate-50 text-slate-600",
};

export function WarehouseBadge({ value, tone }: WarehouseBadgeProps) {
  const label = value === null || value === undefined || value === "" ? "—" : String(value);
  const normalizedTone = tone ?? normalizeTone(value);

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tracking-[0.04em]",
        TONE_CLASSNAME[normalizedTone],
      )}
    >
      {label}
    </span>
  );
}

export function JsonDisclosure({ label, value, defaultOpen = false }: JsonDisclosureProps) {
  const formatted = value === undefined ? undefined : JSON.stringify(value, null, 2);

  return (
    <details
      className="rounded-2xl border border-slate-200 bg-slate-50"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-slate-800">
        <span>{label}</span>
      </summary>
      <div className="border-t border-slate-200 px-4 py-4">
        {formatted ? (
          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-700">
            {formatted}
          </pre>
        ) : (
          <p className="text-sm text-slate-500">No structured payload recorded.</p>
        )}
      </div>
    </details>
  );
}

export function DefinitionGrid({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</dt>
          <dd className="text-sm leading-6 text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
