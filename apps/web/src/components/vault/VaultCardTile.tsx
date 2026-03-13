"use client";

import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";

export type VaultCardData = {
  id: string;
  vault_item_id: string;
  card_id: string;
  gv_id: string;
  name: string;
  set_code: string;
  set_name: string;
  number: string;
  condition_label: string;
  quantity: number;
  effective_price: number | null;
  supertype?: string;
  types?: string[] | null;
  card_category?: string;
  national_dex?: number | null;
  image_url?: string;
  created_at: string | null;
};

const CONDITION_OPTIONS = ["NM", "LP", "MP", "HP", "DMG"];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatCurrency(value: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Value unavailable";
  }

  return currencyFormatter.format(value);
}

type VaultCardTileProps = {
  item: VaultCardData;
  isPending: boolean;
  error?: string;
  onQuantityChange: (itemId: string, type: "increment" | "decrement") => void;
  onConditionChange: (condition: string) => void;
};

export function VaultCardTile({ item, isPending, error, onQuantityChange, onConditionChange }: VaultCardTileProps) {
  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.055)]">
      <Link href={`/card/${item.gv_id}`} className="block">
        <PublicCardImage
          src={item.image_url}
          alt={item.name}
          imageClassName="aspect-[3/4] w-full bg-slate-50 object-contain p-6"
          fallbackClassName="flex aspect-[3/4] w-full items-center justify-center bg-slate-100 px-4 text-center text-sm text-slate-500"
          fallbackLabel={item.name}
        />
      </Link>

      <div className="space-y-4 border-t border-slate-200 p-5">
        <div className="space-y-2">
          <Link href={`/card/${item.gv_id}`} className="block">
            <p className="line-clamp-2 text-[1.35rem] font-semibold tracking-tight text-slate-950 transition hover:text-slate-700">
              {item.name}
            </p>
          </Link>
          <p className="text-sm text-slate-500">
            {[item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>

        <div className="space-y-2 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Condition</span>
              <select
                value={item.condition_label || "NM"}
                onChange={(e) => onConditionChange(e.target.value)}
                disabled={isPending}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-900 transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {CONDITION_OPTIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Qty</span>
              <div className="inline-flex items-center self-start rounded-full border border-slate-200 bg-slate-50/90 p-1">
                <button
                  type="button"
                  onClick={() => onQuantityChange(item.vault_item_id, "decrement")}
                  disabled={isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-medium text-slate-600 transition hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Decrease quantity for ${item.name}`}
                >
                  −
                </button>
                <span className="min-w-[2.1rem] px-1.5 text-center text-sm font-medium text-slate-900">{item.quantity}</span>
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
            </div>
          </div>
          {error ? <p className="text-xs text-slate-500">{error}</p> : null}
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Value</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{formatCurrency(item.effective_price)}</p>
        </div>

        <div className="border-t border-slate-200 pt-3">
          <p className="text-[11px] font-medium tracking-[0.08em] text-slate-400">{item.gv_id}</p>
        </div>
      </div>
    </article>
  );
}
