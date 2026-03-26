"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VaultCardData } from "@/components/vault/VaultCardTile";
import {
  VaultActionButton,
  VaultFieldLabel,
  VaultInsetCard,
} from "@/components/vault/VaultCardPrimitives";
import { saveSharedCardPublicNoteAction } from "@/lib/sharedCards/saveSharedCardPublicNoteAction";
import { saveSharedCardWallCategoryAction } from "@/lib/sharedCards/saveSharedCardWallCategoryAction";
import { toggleSharedCardAction } from "@/lib/sharedCards/toggleSharedCardAction";
import { toggleSharedCardPublicImageAction } from "@/lib/sharedCards/toggleSharedCardPublicImageAction";
import {
  WALL_CATEGORY_OPTIONS,
  type WallCategory,
} from "@/lib/sharedCards/wallCategories";

type VaultManageCardSettingsPanelProps = {
  item: VaultCardData;
  publicCollectionHref: string | null;
};

export default function VaultManageCardSettingsPanel({
  item,
  publicCollectionHref,
}: VaultManageCardSettingsPanelProps) {
  const router = useRouter();
  const [isShared, setIsShared] = useState(item.is_shared);
  const [wallCategory, setWallCategory] = useState<WallCategory | null>(item.wall_category);
  const [publicNote, setPublicNote] = useState(item.public_note ?? "");
  const [showFront, setShowFront] = useState(item.show_personal_front);
  const [showBack, setShowBack] = useState(item.show_personal_back);
  const [pendingField, setPendingField] = useState<"share" | "wallCategory" | "note" | "front" | "back" | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ tone: "success" | "error"; body: string } | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setIsShared(item.is_shared);
    setWallCategory(item.wall_category);
    setPublicNote(item.public_note ?? "");
    setShowFront(item.show_personal_front);
    setShowBack(item.show_personal_back);
  }, [item]);

  function handleShareToggle() {
    if (pendingField) {
      return;
    }

    const nextShared = !isShared;
    const previousState = {
      isShared,
      wallCategory,
      publicNote,
      showFront,
      showBack,
    };

    setStatusMessage(null);
    setPendingField("share");
    setIsShared(nextShared);

    if (!nextShared) {
      setWallCategory(null);
      setShowFront(false);
      setShowBack(false);
    }

    startTransition(async () => {
      try {
        const result = await toggleSharedCardAction({
          itemId: item.vault_item_id,
          gvViId: item.gv_vi_id,
          nextShared,
        });

        if (!result.ok) {
          setIsShared(previousState.isShared);
          setWallCategory(previousState.wallCategory);
          setPublicNote(previousState.publicNote);
          setShowFront(previousState.showFront);
          setShowBack(previousState.showBack);
          setStatusMessage({ tone: "error", body: result.message });
          setPendingField(null);
          return;
        }

        setIsShared(result.status === "shared");
        setStatusMessage({
          tone: "success",
          body: result.status === "shared" ? "Added to wall." : "Removed from wall.",
        });
        setPendingField(null);
        router.refresh();
      } catch {
        setIsShared(previousState.isShared);
        setWallCategory(previousState.wallCategory);
        setPublicNote(previousState.publicNote);
        setShowFront(previousState.showFront);
        setShowBack(previousState.showBack);
        setStatusMessage({ tone: "error", body: "Couldn’t update wall state." });
        setPendingField(null);
      }
    });
  }

  function handleWallCategoryChange(nextWallCategory: WallCategory | null) {
    if (!isShared || pendingField) {
      return;
    }

    const previousWallCategory = wallCategory;
    setStatusMessage(null);
    setPendingField("wallCategory");
    setWallCategory(nextWallCategory);

    startTransition(async () => {
      try {
        const result = await saveSharedCardWallCategoryAction({
          itemId: item.vault_item_id,
          gvViId: item.gv_vi_id,
          wallCategory: nextWallCategory,
        });

        if (!result.ok) {
          setWallCategory(previousWallCategory);
          setStatusMessage({ tone: "error", body: result.message });
          setPendingField(null);
          return;
        }

        setWallCategory(result.wallCategory);
        setStatusMessage({ tone: "success", body: "Wall category saved." });
        setPendingField(null);
        router.refresh();
      } catch {
        setWallCategory(previousWallCategory);
        setStatusMessage({ tone: "error", body: "Couldn’t save wall category." });
        setPendingField(null);
      }
    });
  }

  function handlePublicNoteSave() {
    if (!isShared || pendingField || publicNote === (item.public_note ?? "")) {
      return;
    }

    const previousNote = item.public_note ?? "";
    setStatusMessage(null);
    setPendingField("note");

    startTransition(async () => {
      try {
        const result = await saveSharedCardPublicNoteAction({
          itemId: item.vault_item_id,
          gvViId: item.gv_vi_id,
          note: publicNote,
        });

        if (!result.ok) {
          setPublicNote(previousNote);
          setStatusMessage({ tone: "error", body: result.message });
          setPendingField(null);
          return;
        }

        setPublicNote(result.publicNote ?? "");
        setStatusMessage({ tone: "success", body: "Wall note saved." });
        setPendingField(null);
        router.refresh();
      } catch {
        setPublicNote(previousNote);
        setStatusMessage({ tone: "error", body: "Couldn’t save wall note." });
        setPendingField(null);
      }
    });
  }

  function handlePublicImageToggle(side: "front" | "back", enabled: boolean) {
    if (!isShared || pendingField) {
      return;
    }

    const hasPhoto = side === "front" ? item.has_front_photo : item.has_back_photo;
    if (enabled && !hasPhoto) {
      setStatusMessage({
        tone: "error",
        body: side === "front" ? "Upload a front photo on the copy page first." : "Upload a back photo on the copy page first.",
      });
      return;
    }

    const previousValue = side === "front" ? showFront : showBack;
    setStatusMessage(null);
    setPendingField(side);

    if (side === "front") {
      setShowFront(enabled);
    } else {
      setShowBack(enabled);
    }

    startTransition(async () => {
      try {
        const result = await toggleSharedCardPublicImageAction({
          cardId: item.card_id,
          side,
          enabled,
        });

        if (!result.ok) {
          if (side === "front") {
            setShowFront(previousValue);
          } else {
            setShowBack(previousValue);
          }
          setStatusMessage({ tone: "error", body: result.message });
          setPendingField(null);
          return;
        }

        if (side === "front") {
          setShowFront(result.enabled);
        } else {
          setShowBack(result.enabled);
        }

        setStatusMessage({
          tone: "success",
          body: side === "front" ? "Front image visibility saved." : "Back image visibility saved.",
        });
        setPendingField(null);
        router.refresh();
      } catch {
        if (side === "front") {
          setShowFront(previousValue);
        } else {
          setShowBack(previousValue);
        }
        setStatusMessage({ tone: "error", body: "Couldn’t update public image settings." });
        setPendingField(null);
      }
    });
  }

  return (
    <div className="space-y-4 rounded-[1.6rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_48px_-38px_rgba(15,23,42,0.2)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Public / Wall</p>
          <p className="text-sm text-slate-600">Grouped-card presentation lives here instead of on the vault card.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isShared && publicCollectionHref ? (
            <Link
              href={publicCollectionHref}
              className="text-sm font-medium text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline"
            >
              View wall
            </Link>
          ) : null}
          <VaultActionButton type="button" onClick={handleShareToggle} disabled={pendingField !== null} tone="strong">
            {pendingField === "share" ? "Saving..." : isShared ? "Remove from Wall" : "Add to Wall"}
          </VaultActionButton>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="space-y-2">
            <VaultFieldLabel>Wall Category</VaultFieldLabel>
            <select
              value={wallCategory ?? ""}
              disabled={!isShared || pendingField !== null}
              onChange={(event) =>
                handleWallCategoryChange(event.target.value ? (event.target.value as WallCategory) : null)
              }
              className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">No category</option>
              {WALL_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <VaultInsetCard className="space-y-3">
            <div className="space-y-1">
              <VaultFieldLabel>Wall Note</VaultFieldLabel>
              <p className="text-sm text-slate-600">Collectors see this note when the grouped card is public on your wall.</p>
            </div>
            <textarea
              value={publicNote}
              disabled={!isShared || pendingField !== null}
              onChange={(event) => setPublicNote(event.target.value)}
              rows={4}
              placeholder="Add a collector-facing note for this grouped card."
              className="w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="flex justify-end">
              <VaultActionButton
                type="button"
                onClick={handlePublicNoteSave}
                disabled={!isShared || pendingField !== null || publicNote === (item.public_note ?? "")}
              >
                {pendingField === "note" ? "Saving..." : "Save note"}
              </VaultActionButton>
            </div>
          </VaultInsetCard>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <VaultFieldLabel>Public Images</VaultFieldLabel>
            <p className="text-sm text-slate-600">Grouped wall visibility can use the photos already uploaded on your exact copy pages.</p>
          </div>

          {!item.is_slab ? (
            <div className="space-y-2">
              <label className="flex items-start gap-3 rounded-[1rem] border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={showFront}
                  disabled={!isShared || !item.has_front_photo || pendingField !== null}
                  onChange={(event) => handlePublicImageToggle("front", event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:opacity-50"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-slate-800">Show front photo</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {item.has_front_photo
                      ? "Collectors will see the uploaded front photo for this grouped card."
                      : "Upload a front photo on an exact copy page first."}
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-[1rem] border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={showBack}
                  disabled={!isShared || !item.has_back_photo || pendingField !== null}
                  onChange={(event) => handlePublicImageToggle("back", event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300 disabled:opacity-50"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-slate-800">Show back photo</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {item.has_back_photo
                      ? "Collectors will see the uploaded back photo for this grouped card."
                      : "Upload a back photo on an exact copy page first."}
                  </span>
                </span>
              </label>
            </div>
          ) : (
            <VaultInsetCard className="text-sm text-slate-600">
              Slabbed grouped cards keep their public identity through slab details instead of personal image toggles.
            </VaultInsetCard>
          )}
        </div>
      </div>

      {statusMessage ? (
        <p className={`text-sm ${statusMessage.tone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
          {statusMessage.body}
        </p>
      ) : null}
    </div>
  );
}
