"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import PublicCardImage from "@/components/PublicCardImage";
import ShareCardButton from "@/components/ShareCardButton";
import OwnedObjectRemoveAction from "@/components/vault/OwnedObjectRemoveAction";

type VaultCardSlabItemData = {
  instance_id: string;
  grader: string | null;
  grade: string | null;
  cert_number?: string | null;
};

export type VaultCardData = {
  id: string;
  vault_item_id: string;
  gv_vi_id: string | null;
  card_id: string;
  gv_id: string;
  name: string;
  set_code: string;
  set_name: string;
  number: string;
  condition_label: string;
  owned_count: number;
  raw_count: number;
  slab_count: number;
  removable_raw_instance_id: string | null;
  slab_items: VaultCardSlabItemData[];
  effective_price: number | null;
  image_url?: string;
  created_at: string | null;
  is_slab: boolean;
  grader: string | null;
  grade: string | null;
  cert_number: string | null;
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

function formatSlabSummary(item: Pick<VaultCardData, "grader" | "grade">) {
  return [item.grader, item.grade].filter((value): value is string => typeof value === "string" && value.length > 0).join(" ");
}

function formatObjectLevelSlabSummary(item: Pick<VaultCardSlabItemData, "grader" | "grade">) {
  return [item.grader, item.grade].filter((value): value is string => typeof value === "string" && value.length > 0).join(" ");
}

function formatMixedOwnershipSummary(item: Pick<VaultCardData, "raw_count" | "slab_count" | "grader" | "grade">) {
  if (!(item.raw_count > 0 && item.slab_count > 0)) {
    return null;
  }

  const slabSummary = formatSlabSummary(item);
  const rawLabel = `${item.raw_count} Raw`;

  if (item.slab_count === 1 && slabSummary) {
    return `${rawLabel} + 1 ${slabSummary}`;
  }

  return `${rawLabel} + ${item.slab_count} Slab`;
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
  const slabSummary = formatSlabSummary(item);
  const mixedOwnershipSummary = formatMixedOwnershipSummary(item);
  const isMixedOwnership = mixedOwnershipSummary !== null;
  const hasRemovableRaw = Boolean(item.removable_raw_instance_id && item.raw_count > 0);
  const watermarkStyle = {
    "--wm-opacity-desktop": "0.04",
    "--wm-blur-desktop": "10px",
    "--wm-scale-desktop": "1.08",
    "--wm-opacity-mobile": "0.05",
    "--wm-blur-mobile": "8px",
    "--wm-scale-mobile": "1.10",
  } as CSSProperties;

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
              className="gv-ghost-watermark h-auto w-[58%] object-contain sm:w-[60%]"
              style={watermarkStyle}
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
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {item.is_slab ? (
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Slab
                </span>
              ) : null}
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                  item.is_shared
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-slate-200 bg-slate-100 text-slate-500"
                }`}
              >
                {item.is_shared ? "Shared" : "Not shared"}
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            {[item.set_name || item.set_code, item.number !== "—" ? `#${item.number}` : undefined]
              .filter(Boolean)
              .join(" • ")}
          </p>
          {item.is_slab ? (
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">
              {slabSummary || "Graded slab"}
            </p>
          ) : null}
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              {isMixedOwnership ? mixedOwnershipSummary : `Qty ${item.owned_count}`}
            </span>
            <ShareCardButton gvId={item.gv_id} />
          </div>
        </div>

          <div className="space-y-2 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-3">
          {item.is_slab ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    {isMixedOwnership ? "Owned" : "Slab"}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {isMixedOwnership ? mixedOwnershipSummary : slabSummary || "Graded slab"}
                  </p>
                </div>
                {isMixedOwnership ? (
                  <p className="text-sm font-medium text-slate-500">{item.owned_count} total</p>
                ) : (
                  <p className="text-sm font-medium text-slate-900">Qty {item.owned_count}</p>
                )}
              </div>
              <dl className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-2">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Grader</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{item.grader ?? "—"}</dd>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-2">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Grade</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{item.grade ?? "—"}</dd>
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-2">
                  <dt className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Cert</dt>
                  <dd className="mt-1 break-all text-sm font-medium text-slate-900">{item.cert_number ?? "—"}</dd>
                </div>
              </dl>
              {(hasRemovableRaw || item.slab_items.length > 0) ? (
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Remove owned objects</p>
                  {hasRemovableRaw ? (
                    <div className="flex flex-col gap-2 rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">{item.raw_count}</span> Raw
                      </p>
                      <OwnedObjectRemoveAction mode="raw" instanceId={item.removable_raw_instance_id!} label="Remove Raw" />
                    </div>
                  ) : null}
                  {item.slab_items.map((slabItem) => (
                    <div
                      key={slabItem.instance_id}
                      className="flex flex-col gap-2 rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm text-slate-700">
                          <span className="font-medium text-slate-900">1</span>{" "}
                          {formatObjectLevelSlabSummary(slabItem) || "Graded slab"}
                        </p>
                        {slabItem.cert_number ? <p className="text-xs text-slate-500">Cert {slabItem.cert_number}</p> : null}
                      </div>
                      <OwnedObjectRemoveAction mode="slab" instanceId={slabItem.instance_id} label="Remove Slab" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
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
                    <span className="min-w-[2.1rem] px-1.5 text-center text-sm font-medium text-slate-900">{item.owned_count}</span>
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
              {hasRemovableRaw ? (
                <div className="flex flex-col gap-2 rounded-[1rem] border border-slate-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium text-slate-900">{item.raw_count}</span> Raw
                  </p>
                  <OwnedObjectRemoveAction mode="raw" instanceId={item.removable_raw_instance_id!} label="Remove Raw" />
                </div>
              ) : null}
            </div>
          )}
          {error ? <p className="text-xs text-slate-500">{error}</p> : null}
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Value</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{formatCurrency(item.effective_price)}</p>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-4 py-3">
          {item.is_slab ? (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Public Share</p>
              <p className="text-sm text-slate-600">Slab rows are read-only in this phase.</p>
            </div>
          ) : (
            <>
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
            </>
          )}
          </div>

          <div className="border-t border-slate-200 pt-3">
          <p className="text-[11px] font-medium tracking-[0.08em] text-slate-400">{item.gv_id}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
