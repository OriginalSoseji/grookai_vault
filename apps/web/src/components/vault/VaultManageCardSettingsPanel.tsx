import Link from "next/link";
import type { VaultCardData } from "@/components/vault/VaultCardTile";
import { VaultInsetCard } from "@/components/vault/VaultCardPrimitives";

type VaultManageCardSettingsPanelProps = {
  item: VaultCardData;
  publicCollectionHref: string | null;
};

export default function VaultManageCardSettingsPanel({
  item,
  publicCollectionHref,
}: VaultManageCardSettingsPanelProps) {
  const hiddenCopies = Math.max(0, item.owned_count - item.in_play_count);

  return (
    <div className="space-y-4 rounded-[1.6rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_48px_-38px_rgba(15,23,42,0.2)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          {/* LOCK: Wall/section product language must reflect exact-copy curation only. */}
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Copies</p>
          <p className="text-sm text-slate-600">Organize this card from its exact copies below.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {item.in_play_count > 0 && publicCollectionHref ? (
            <Link
              href={publicCollectionHref}
              className="text-sm font-medium text-slate-500 underline-offset-4 transition hover:text-slate-900 hover:underline"
            >
              View wall
            </Link>
          ) : null}
          <a
            href="#manage-card-copies"
            className="inline-flex items-center justify-center rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-[0_14px_30px_-24px_rgba(15,23,42,0.55)] transition hover:bg-slate-800"
          >
            Manage copies
          </a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <VaultInsetCard className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Total</p>
          <p className="text-lg font-semibold text-slate-950">{item.owned_count}</p>
          <p className="text-xs text-slate-500">{item.owned_count === 1 ? "copy" : "copies"}</p>
        </VaultInsetCard>
        <VaultInsetCard className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Visible</p>
          <p className="text-lg font-semibold text-slate-950">{item.in_play_count}</p>
          <p className="text-xs text-slate-500">on your Wall</p>
        </VaultInsetCard>
        <VaultInsetCard className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Private</p>
          <p className="text-lg font-semibold text-slate-950">{hiddenCopies}</p>
          <p className="text-xs text-slate-500">in your vault</p>
        </VaultInsetCard>
      </div>

      <p className="text-sm text-slate-600">Wall and section placement is managed per copy.</p>
    </div>
  );
}
