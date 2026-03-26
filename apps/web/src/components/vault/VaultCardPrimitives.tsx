import type { ButtonHTMLAttributes, ReactNode } from "react";
import { PokemonCardGridBadge } from "@/components/cards/PokemonCardGridTile";
import type { VaultCardData } from "@/components/vault/VaultCardTile";
import {
  getVaultIntentLabel,
  normalizeDiscoverableVaultIntent,
  type VaultIntent,
} from "@/lib/network/intent";
import { getWallCategoryLabel } from "@/lib/sharedCards/wallCategories";

type VaultActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "default" | "strong" | "quiet";
};

export function formatVaultCurrency(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatVaultCardValue(value: number | null) {
  const formattedValue = formatVaultCurrency(value);
  return formattedValue ? `~${formattedValue}` : null;
}

export function getVaultMessageSignalLabel({
  activeMessageCount,
  unreadMessageCount,
}: {
  activeMessageCount: number;
  unreadMessageCount: number;
}) {
  if (unreadMessageCount > 0) {
    return `${unreadMessageCount} new ${unreadMessageCount === 1 ? "message" : "messages"}`;
  }

  if (activeMessageCount > 0) {
    return `${activeMessageCount} interested`;
  }

  return null;
}

export function getVaultPrimaryActionLabel({
  inPlayCount,
  activeMessageCount,
}: {
  inPlayCount: number;
  activeMessageCount: number;
}) {
  if (activeMessageCount > 0) {
    return "View messages";
  }

  if (inPlayCount > 0) {
    return "Manage";
  }

  return "Make available";
}

export function formatVaultSlabSummary(item: Pick<VaultCardData, "grader" | "grade">) {
  return [item.grader, item.grade]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
}

export function formatVaultObjectLevelSlabSummary(item: { grader: string | null; grade: string | null }) {
  return [item.grader, item.grade]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
}

export function formatVaultCopyIdentityLabel(item: {
  is_graded: boolean;
  grader: string | null;
  grade: string | null;
  cert_number: string | null;
  condition_label: string | null;
}) {
  if (item.is_graded) {
    const slabSummary = formatVaultObjectLevelSlabSummary(item);
    const certSuffix = item.cert_number ? ` • Cert ${item.cert_number}` : "";
    return `${slabSummary || "Graded slab"}${certSuffix}`;
  }

  return `${item.condition_label || "Unknown"} • Raw`;
}

export function formatVaultCopyDate(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatVaultMixedOwnershipSummary(
  item: Pick<VaultCardData, "raw_count" | "slab_count" | "grader" | "grade">,
) {
  if (!(item.raw_count > 0 && item.slab_count > 0)) {
    return null;
  }

  const slabSummary = formatVaultSlabSummary(item);
  const rawLabel = `${item.raw_count} Raw`;

  if (item.slab_count === 1 && slabSummary) {
    return `${rawLabel} + 1 ${slabSummary}`;
  }

  return `${rawLabel} + ${item.slab_count} Slab`;
}

export function getVaultOwnershipSummary(
  item: Pick<
    VaultCardData,
    "raw_count" | "slab_count" | "grader" | "grade" | "is_slab" | "condition_label" | "owned_count"
  >,
) {
  return (
    formatVaultMixedOwnershipSummary(item) ??
    (item.is_slab
      ? formatVaultSlabSummary(item) || `${item.slab_count || item.owned_count} Slab`
      : item.owned_count > 1
        ? `${item.raw_count || item.owned_count} Raw`
        : `Condition ${item.condition_label || "NM"}`)
  );
}

function formatVaultClosedOwnershipContext(
  item: Pick<
    VaultCardData,
    "raw_count" | "slab_count" | "grader" | "grade" | "is_slab" | "condition_label" | "owned_count"
  >,
) {
  return (
    formatVaultMixedOwnershipSummary(item) ??
    (item.is_slab
      ? formatVaultSlabSummary(item) || `${item.slab_count || item.owned_count} Slab`
      : item.owned_count > 1
        ? `${item.raw_count || item.owned_count} Raw`
        : `${item.condition_label || "Unknown"} Raw`)
  );
}

export function formatVaultSecondaryContext(
  item: Pick<
    VaultCardData,
    | "raw_count"
    | "slab_count"
    | "grader"
    | "grade"
    | "is_slab"
    | "condition_label"
    | "owned_count"
    | "is_shared"
    | "wall_category"
    | "primary_intent"
  >,
) {
  const parts: string[] = [];
  const ownershipContext = formatVaultClosedOwnershipContext(item);
  const wallCategoryLabel = getWallCategoryLabel(item.wall_category);

  if (ownershipContext) {
    parts.push(ownershipContext);
  }

  if (item.is_shared) {
    parts.push("On Wall");
  }

  if (wallCategoryLabel) {
    const isIntentDuplicate =
      (wallCategoryLabel === "For Sale" && item.primary_intent === "sell") ||
      (wallCategoryLabel === "Trades" && item.primary_intent === "trade");
    const isGraderDuplicate =
      (wallCategoryLabel === "PSA" && (item.grader ?? "").toUpperCase() === "PSA") ||
      (wallCategoryLabel === "CGC" && (item.grader ?? "").toUpperCase() === "CGC") ||
      (wallCategoryLabel === "BGS" && (item.grader ?? "").toUpperCase() === "BGS");

    if (!isIntentDuplicate && !isGraderDuplicate) {
      parts.push(wallCategoryLabel);
    }
  }

  return parts.length > 0 ? parts.join(" • ") : null;
}

export function getVaultPrimaryStateBadge(
  item: Pick<VaultCardData, "primary_intent" | "in_play_count">,
): { label: string; tone: "accent" | "positive" | "warm" | "neutral" } | null {
  switch (item.primary_intent) {
    case "sell":
      return { label: "For Sale", tone: "accent" };
    case "trade":
      return { label: "Trade", tone: "positive" };
    case "showcase":
      return { label: "Showcase", tone: "warm" };
    case "hold":
    case null:
    default:
      return item.in_play_count > 0 ? { label: "In Play", tone: "neutral" } : null;
  }
}

export function getVaultCardMetaLine(item: Pick<VaultCardData, "set_name" | "set_code" | "number">) {
  return [item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined]
    .filter(Boolean)
    .join(" • ");
}

export function VaultPrimaryStateBadge({
  item,
  size = "xs",
}: {
  item: Pick<VaultCardData, "primary_intent" | "in_play_count">;
  size?: "xs" | "sm";
}) {
  const badge = getVaultPrimaryStateBadge(item);

  if (!badge) {
    return null;
  }

  return (
    <PokemonCardGridBadge tone={badge.tone} size={size}>
      {badge.label}
    </PokemonCardGridBadge>
  );
}

export function getVaultCopyIntentBadgeClassName(intent: VaultIntent) {
  switch (intent) {
    case "trade":
      return "border-emerald-300 bg-emerald-100 text-emerald-900";
    case "sell":
      return "border-sky-300 bg-sky-100 text-sky-900";
    case "showcase":
      return "border-amber-300 bg-amber-100 text-amber-900";
    case "hold":
    default:
      return "border-slate-300 bg-slate-100 text-slate-700";
  }
}

export function getVaultCopyVisibilityLabel(intent: VaultIntent) {
  return normalizeDiscoverableVaultIntent(intent) ? "In Play" : "Hidden";
}

export function getVaultCopyVisibilityBadgeClassName(intent: VaultIntent) {
  return normalizeDiscoverableVaultIntent(intent)
    ? "border-slate-300 bg-white text-slate-700"
    : "border-slate-200 bg-slate-100 text-slate-500";
}

export function VaultStatusBadges({
  item,
  includeQuantity = true,
  size = "xs",
}: {
  item: Pick<
    VaultCardData,
    | "owned_count"
    | "is_slab"
    | "is_shared"
    | "wall_category"
    | "intent"
    | "in_play_count"
    | "trade_count"
    | "sell_count"
    | "showcase_count"
  >;
  includeQuantity?: boolean;
  size?: "xs" | "sm";
}) {
  const wallCategoryLabel = getWallCategoryLabel(item.wall_category);
  const discoverableIntentKinds = [item.trade_count > 0, item.sell_count > 0, item.showcase_count > 0].filter(Boolean).length;
  const singleIntentLabel =
    item.trade_count > 0 && item.sell_count === 0 && item.showcase_count === 0
      ? `${getVaultIntentLabel("trade")}${item.trade_count > 1 ? ` ${item.trade_count}` : ""}`
      : item.sell_count > 0 && item.trade_count === 0 && item.showcase_count === 0
        ? `${getVaultIntentLabel("sell")}${item.sell_count > 1 ? ` ${item.sell_count}` : ""}`
        : item.showcase_count > 0 && item.trade_count === 0 && item.sell_count === 0
          ? `${getVaultIntentLabel("showcase")}${item.showcase_count > 1 ? ` ${item.showcase_count}` : ""}`
          : null;

  return (
    <>
      {includeQuantity ? (
        <PokemonCardGridBadge tone="neutral" size={size}>
          Qty {item.owned_count}
        </PokemonCardGridBadge>
      ) : null}
      <PokemonCardGridBadge tone={item.is_slab ? "warm" : "default"} size={size}>
        {item.is_slab ? "Slab" : "Raw"}
      </PokemonCardGridBadge>
      {item.in_play_count > 0 && discoverableIntentKinds === 1 && singleIntentLabel ? (
        <PokemonCardGridBadge tone="accent" size={size}>
          {singleIntentLabel}
        </PokemonCardGridBadge>
      ) : null}
      {item.in_play_count > 0 && discoverableIntentKinds > 1 ? (
        <PokemonCardGridBadge tone="accent" size={size}>
          In Play {item.in_play_count}
        </PokemonCardGridBadge>
      ) : null}
      {item.is_shared ? (
        <PokemonCardGridBadge tone="positive" size={size}>
          On Wall
        </PokemonCardGridBadge>
      ) : null}
      {wallCategoryLabel ? (
        <PokemonCardGridBadge tone="accent" size={size}>
          {wallCategoryLabel}
        </PokemonCardGridBadge>
      ) : null}
    </>
  );
}

export function VaultActionButton({
  children,
  tone = "default",
  className,
  ...props
}: VaultActionButtonProps) {
  const toneClassName =
    tone === "strong"
      ? "border border-slate-950 bg-slate-950 text-white shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)] hover:bg-slate-800"
      : tone === "quiet"
        ? "border border-slate-200/80 bg-slate-50/85 text-slate-700 hover:border-slate-300 hover:bg-white"
        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";

  return (
    <button
      {...props}
      className={[
        "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium transition",
        toneClassName,
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

export function VaultQuantityStepper({
  item,
  isPending,
  onQuantityChange,
  className,
}: {
  item: Pick<VaultCardData, "name" | "vault_item_id" | "owned_count">;
  isPending: boolean;
  onQuantityChange: (itemId: string, type: "increment" | "decrement") => void;
  className?: string;
}) {
  return (
    <div className={["inline-flex items-center rounded-full border border-slate-200 bg-slate-50/90 p-1", className].filter(Boolean).join(" ")}>
      <button
        type="button"
        onClick={() => onQuantityChange(item.vault_item_id, "decrement")}
        disabled={isPending}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Decrease quantity for ${item.name}`}
      >
        −
      </button>
      <span className="min-w-[2rem] px-1.5 text-center text-sm font-medium text-slate-900">{item.owned_count}</span>
      <button
        type="button"
        onClick={() => onQuantityChange(item.vault_item_id, "increment")}
        disabled={isPending}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Increase quantity for ${item.name}`}
      >
        +
      </button>
    </div>
  );
}

export function VaultDetailPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "space-y-5 rounded-[18px] border border-slate-200/80 bg-slate-50/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export function VaultFieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">{children}</p>;
}

export function VaultInsetCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-[14px] border border-slate-200/80 bg-white/95 px-3.5 py-3 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.35)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export function VaultStatPill({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "muted" | "attention";
  className?: string;
}) {
  const toneClassName =
    tone === "attention"
      ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200"
      : tone === "muted"
        ? "bg-slate-100/70 text-slate-500 ring-1 ring-inset ring-slate-200/70"
        : "bg-slate-100/90 text-slate-700 ring-1 ring-inset ring-slate-200/80";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium",
        toneClassName,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
