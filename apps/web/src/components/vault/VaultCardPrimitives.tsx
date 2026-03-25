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
    return "Value unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
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

export function getVaultCardMetaLine(item: Pick<VaultCardData, "set_name" | "set_code" | "number">) {
  return [item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined]
    .filter(Boolean)
    .join(" • ");
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
      ? "border border-slate-300 bg-slate-950 text-white hover:bg-slate-800"
      : tone === "quiet"
        ? "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
        : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50";

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
    <div className={["space-y-4 rounded-[14px] border border-slate-200 bg-slate-50/80 p-3", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

export function VaultFieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{children}</p>;
}

export function VaultInsetCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={["rounded-[12px] border border-slate-200 bg-white px-3 py-2.5", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
