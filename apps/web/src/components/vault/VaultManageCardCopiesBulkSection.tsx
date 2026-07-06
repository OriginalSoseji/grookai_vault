"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import OwnedObjectRemoveAction from "@/components/vault/OwnedObjectRemoveAction";
import VaultManageCopyCurationControls from "@/components/vault/VaultManageCopyCurationControls";
import {
  formatVaultCopyDate,
  formatVaultCopyIdentityLabel,
  getVaultCopyIntentBadgeClassName,
  getVaultCopyVisibilityBadgeClassName,
  getVaultCopyVisibilityLabel,
  VaultInsetCard,
} from "@/components/vault/VaultCardPrimitives";
import type { VaultCardInstanceData } from "@/components/vault/VaultCardTile";
import { getVaultIntentLabel, type VaultIntent } from "@/lib/network/intent";
import { saveVaultItemInstancesIntentBulkAction } from "@/lib/network/saveVaultItemInstancesIntentBulkAction";
import { bulkWallSectionMembershipAction } from "@/lib/wallSections/bulkWallSectionMembershipAction";
import type {
  OwnerWallSectionMembership,
  OwnerWallSectionMembershipModel,
} from "@/lib/wallSections/wallSectionTypes";

const INTENT_OPTIONS: VaultIntent[] = ["hold", "showcase", "trade", "sell"];

function dedupeSections(models: OwnerWallSectionMembershipModel[]): OwnerWallSectionMembership[] {
  const byId = new Map<string, OwnerWallSectionMembership>();

  for (const model of models) {
    for (const section of model.sections) {
      if (!byId.has(section.id)) {
        byId.set(section.id, section);
      }
    }
  }

  return Array.from(byId.values()).sort((left, right) => left.position - right.position || left.name.localeCompare(right.name));
}

export default function VaultManageCardCopiesBulkSection({
  copies,
  membershipModels,
  publicWallHref,
}: {
  copies: VaultCardInstanceData[];
  membershipModels: OwnerWallSectionMembershipModel[];
  publicWallHref: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const selectedSet = useMemo(() => new Set(selectedInstanceIds), [selectedInstanceIds]);
  const sectionOptions = useMemo(() => dedupeSections(membershipModels), [membershipModels]);
  const allSelected = copies.length > 0 && selectedInstanceIds.length === copies.length;
  const membershipByInstanceId = useMemo(
    () => new Map(membershipModels.map((model) => [model.instanceId, model] as const)),
    [membershipModels],
  );

  function toggleInstance(instanceId: string) {
    setMessage(null);
    setSelectedInstanceIds((current) =>
      current.includes(instanceId) ? current.filter((value) => value !== instanceId) : [...current, instanceId],
    );
  }

  function toggleAll() {
    setMessage(null);
    setSelectedInstanceIds(allSelected ? [] : copies.map((copy) => copy.instance_id));
  }

  function runBulkIntent(intent: VaultIntent) {
    const instanceIds = selectedInstanceIds;
    startTransition(async () => {
      const result = await saveVaultItemInstancesIntentBulkAction({
        instanceIds,
        intent,
      });
      setMessage(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  function runBulkSection(mode: "add" | "remove") {
    const instanceIds = selectedInstanceIds;
    const sectionId = selectedSectionId;
    startTransition(async () => {
      const result = await bulkWallSectionMembershipAction({
        instanceIds,
        sectionId,
        mode,
      });
      setMessage(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[14px] border border-slate-200 bg-slate-50/90 px-3.5 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-300 text-slate-950"
              aria-label={allSelected ? "Clear selected copies" : "Select all copies"}
            />
            <span>{selectedInstanceIds.length > 0 ? `${selectedInstanceIds.length} selected` : "Select copies"}</span>
          </label>

          {selectedInstanceIds.length > 0 ? (
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Bulk actions</span>
                {INTENT_OPTIONS.map((intent) => (
                  <button
                    key={intent}
                    type="button"
                    onClick={() => runBulkIntent(intent)}
                    disabled={isPending}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {getVaultIntentLabel(intent)}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedSectionId}
                  onChange={(event) => setSelectedSectionId(event.target.value)}
                  disabled={isPending || sectionOptions.length === 0}
                  className="min-h-8 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Choose wall section for selected copies"
                >
                  <option value="">Choose section</option>
                  {sectionOptions.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => runBulkSection("add")}
                  disabled={isPending || !selectedSectionId}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Add to section
                </button>
                <button
                  type="button"
                  onClick={() => runBulkSection("remove")}
                  disabled={isPending || !selectedSectionId}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Remove from section
                </button>
              </div>
            </div>
          ) : null}
        </div>
        {message ? <p className="mt-2 text-xs font-medium text-slate-500">{message}</p> : null}
      </div>

      {copies.map((copy) => {
        const copyHref = copy.gv_vi_id ? `/vault/gvvi/${encodeURIComponent(copy.gv_vi_id)}` : null;
        const createdAt = formatVaultCopyDate(copy.created_at);
        const membershipModel =
          membershipByInstanceId.get(copy.instance_id) ?? {
            instanceId: copy.instance_id,
            sections: [],
            loadError: "Section assignments could not be loaded.",
          };

        return (
          <VaultInsetCard key={copy.instance_id} className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(copy.instance_id)}
                    onChange={() => toggleInstance(copy.instance_id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950"
                    aria-label={`Select ${formatVaultCopyIdentityLabel(copy)}`}
                  />
                  <span className="min-w-0 space-y-2">
                    <span className="block text-sm font-medium text-slate-900">{formatVaultCopyIdentityLabel(copy)}</span>
                    <span className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 ${getVaultCopyIntentBadgeClassName(copy.intent)}`}
                      >
                        {getVaultIntentLabel(copy.intent)}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 ${getVaultCopyVisibilityBadgeClassName(copy.intent)}`}
                      >
                        {getVaultCopyVisibilityLabel(copy.intent)}
                      </span>
                    </span>
                  </span>
                </label>
                <div className="flex flex-wrap gap-2 pl-7 text-xs text-slate-500">
                  <span>{copy.gv_vi_id ?? "GVVI pending"}</span>
                  {createdAt ? <span>{createdAt}</span> : null}
                </div>
                {copy.notes ? <p className="pl-7 text-xs leading-5 text-slate-500">{copy.notes}</p> : null}
              </div>

              <div className="flex flex-wrap items-center gap-2 pl-7 lg:pl-0">
                {copyHref ? (
                  <Link
                    href={copyHref}
                    prefetch={false}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Open copy
                  </Link>
                ) : (
                  <span className="text-xs font-medium text-slate-400">Copy unavailable</span>
                )}
                <OwnedObjectRemoveAction
                  instanceId={copy.instance_id}
                  label={copy.is_graded ? "Remove slab" : "Remove copy"}
                  buttonClassName="inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>
            {/* LOCK: Bulk copy management writes only exact-copy instance IDs. */}
            <VaultManageCopyCurationControls
              instanceId={copy.instance_id}
              gvviId={copy.gv_vi_id}
              initialIntent={copy.intent}
              membershipModel={membershipModel}
              publicWallHref={publicWallHref}
              isActive
            />
          </VaultInsetCard>
        );
      })}
    </div>
  );
}
