"use client";

import Image from "next/image";
import Link from "next/link";
import PublicCardImage from "@/components/PublicCardImage";
import ShareCardButton from "@/components/ShareCardButton";

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
  image_url?: string;
  created_at: string | null;
  is_shared: boolean;
  public_note: string | null;
  show_personal_front: boolean;
  show_personal_back: boolean;
  has_front_photo: boolean;
  has_back_photo: boolean;
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
  isSharePending: boolean;
  isPublicFrontImagePending: boolean;
  isPublicBackImagePending: boolean;
  isSharedControlsExpanded: boolean;
  error?: string;
  shareError?: string;
  publicCollectionHref?: string | null;
  logoPath?: string;
  onQuantityChange: (itemId: string, type: "increment" | "decrement") => void;
  onConditionChange: (condition: string) => void;
  onShareToggle: (item: VaultCardData) => void;
  onSharedControlsToggle: (item: VaultCardData) => void;
  onPublicNoteEdit: (item: VaultCardData) => void;
  onPublicImageToggle: (item: VaultCardData, side: "front" | "back", enabled: boolean) => void;
};

export function VaultCardTile({
  item,
  isPending,
  isSharePending,
  isPublicFrontImagePending,
  isPublicBackImagePending,
  isSharedControlsExpanded,
  error,
  shareError,
  publicCollectionHref,
  logoPath,
  onQuantityChange,
  onConditionChange,
  onShareToggle,
  onSharedControlsToggle,
  onPublicNoteEdit,
  onPublicImageToggle,
}: VaultCardTileProps) {
  const shouldRenderSharedControls = item.is_shared || isSharedControlsExpanded;

  return (
    <article className="card-hover overflow-hidden rounded-[16px] border border-slate-100 bg-white p-4 shadow-sm">
      <Link href={`/card/${item.gv_id}`} className="block">
        <div className="flex items-center justify-center rounded-[12px] border border-slate-100 bg-slate-50 p-4">
          <PublicCardImage
            src={item.image_url}
            alt={item.name}
            imageClassName="aspect-[3/4] w-full object-contain transition duration-150 hover:scale-[1.02]"
            fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[10px] bg-slate-100 px-4 text-center text-sm text-slate-500"
            fallbackLabel={item.name}
          />
        </div>
      </Link>

      <div className="relative mt-4 overflow-hidden rounded-[1.5rem]">
        {logoPath ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            <Image
              src={logoPath}
              alt=""
              width={360}
              height={180}
              className="h-auto w-[85%] scale-[1.5] object-contain opacity-[0.07] blur-[6px]"
            />
          </div>
        ) : null}
        <div className="relative z-10 space-y-4">
          <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/card/${item.gv_id}`} className="block min-w-0 flex-1">
              <p className="line-clamp-2 text-[1.35rem] font-semibold tracking-tight text-slate-950 transition hover:text-slate-700">
                {item.name}
              </p>
            </Link>
            <span
              className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                item.is_shared
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-slate-200 bg-slate-100 text-slate-500"
              }`}
            >
              {item.is_shared ? "Shared" : "Not shared"}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {[item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined]
              .filter(Boolean)
              .join(" • ")}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">Qty {item.quantity}</span>
            <ShareCardButton gvId={item.gv_id} />
          </div>
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

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Public Share</p>
              <p className="text-sm text-slate-600">{item.is_shared ? "Visible in your shared collection." : "Not shared publicly."}</p>
            </div>
            <button
              type="button"
              onClick={() => onShareToggle(item)}
              disabled={isSharePending}
              className={`inline-flex rounded-full px-4 py-2 text-sm font-medium transition ${
                item.is_shared
                  ? "border border-slate-300 bg-slate-950 text-white hover:bg-slate-800"
                  : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isSharePending ? "Saving..." : item.is_shared ? "Shared" : "Share"}
            </button>
          </div>
          {item.is_shared && publicCollectionHref ? (
            <div className="mt-2">
              <Link
                href={publicCollectionHref}
                className="text-xs font-medium text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline"
              >
                View Public
              </Link>
            </div>
          ) : null}
          {shouldRenderSharedControls ? (
            <div className="mt-3 border-t border-slate-200 pt-3">
              {item.is_shared ? (
                <button
                  type="button"
                  onClick={() => onSharedControlsToggle(item)}
                  className="text-xs font-medium text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline"
                >
                  {isSharedControlsExpanded ? "Hide shared controls" : "Manage shared card"}
                </button>
              ) : (
                <p className="text-xs font-medium text-slate-500">Sharing this card...</p>
              )}

              {isSharedControlsExpanded ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <button
                      type="button"
                      onClick={() => onPublicNoteEdit(item)}
                      disabled={!item.is_shared}
                      className="text-xs font-medium text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline"
                    >
                      {item.public_note ? "Edit public note" : "Add public note"}
                    </button>
                    <p className="mt-1 text-xs text-slate-500">This note appears on your public shared card.</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Public Images</p>

                    <label className={`flex items-start gap-3 rounded-[1rem] border px-3 py-2.5 text-sm ${item.has_front_photo ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-100/80"}`}>
                      <input
                        type="checkbox"
                        checked={item.show_personal_front}
                        disabled={!item.is_shared || !item.has_front_photo || isPublicFrontImagePending}
                        onChange={(event) => onPublicImageToggle(item, "front", event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-800">Show front photo</span>
                        {!item.has_front_photo ? <span className="mt-1 block text-xs text-slate-500">Upload a card photo in your vault to enable this.</span> : null}
                      </span>
                    </label>

                    <label className={`flex items-start gap-3 rounded-[1rem] border px-3 py-2.5 text-sm ${item.has_back_photo ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-100/80"}`}>
                      <input
                        type="checkbox"
                        checked={item.show_personal_back}
                        disabled={!item.is_shared || !item.has_back_photo || isPublicBackImagePending}
                        onChange={(event) => onPublicImageToggle(item, "back", event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-800">Show back photo</span>
                        {!item.has_back_photo ? <span className="mt-1 block text-xs text-slate-500">Upload a card photo in your vault to enable this.</span> : null}
                      </span>
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {shareError ? <p className="mt-2 text-xs text-slate-500">{shareError}</p> : null}
          </div>

          <div className="border-t border-slate-200 pt-3">
          <p className="text-[11px] font-medium tracking-[0.08em] text-slate-400">{item.gv_id}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
