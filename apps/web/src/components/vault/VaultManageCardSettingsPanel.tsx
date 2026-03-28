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
  const [pendingField, setPendingField] = useState<"share" | "wallCategory" | "note" | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ tone: "success" | "error"; body: string } | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setIsShared(item.is_shared);
    setWallCategory(item.wall_category);
    setPublicNote(item.public_note ?? "");
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
    };

    setStatusMessage(null);
    setPendingField("share");
    setIsShared(nextShared);

    if (!nextShared) {
      setWallCategory(null);
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
            <p className="text-sm text-slate-600">Legacy grouped-card public images are disabled until the GVVI-aligned replacement exists.</p>
          </div>

          <VaultInsetCard className="text-sm text-slate-600">
            Public wall rendering now falls back to canonical card imagery only. Personal front/back image toggles remain disabled while the GVVI media pipeline is designed for public use.
          </VaultInsetCard>
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
