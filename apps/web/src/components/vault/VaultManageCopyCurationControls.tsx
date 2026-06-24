"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  getVaultIntentHelper,
  getVaultIntentLabel,
  type VaultIntent,
} from "@/lib/network/intent";
import { saveVaultItemInstanceIntentAction } from "@/lib/network/saveVaultItemInstanceIntentAction";
import { assignWallSectionMembershipAction } from "@/lib/wallSections/assignWallSectionMembershipAction";
import { removeWallSectionMembershipAction } from "@/lib/wallSections/removeWallSectionMembershipAction";
import {
  WALL_SECTION_HELPER_COPY,
  type OwnerWallSectionMembership,
  type OwnerWallSectionMembershipModel,
  type WallSectionMembershipActionResult,
} from "@/lib/wallSections/wallSectionTypes";

const INTENT_OPTIONS: VaultIntent[] = ["hold", "trade", "sell", "showcase"];

type VaultManageCopyCurationControlsProps = {
  instanceId: string;
  initialIntent: VaultIntent;
  membershipModel: OwnerWallSectionMembershipModel;
  isActive: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function resolveStatusTone(result: { ok: boolean } | null): "success" | "error" | null {
  if (!result) {
    return null;
  }

  return result.ok ? "success" : "error";
}

export default function VaultManageCopyCurationControls({
  instanceId,
  initialIntent,
  membershipModel,
  isActive,
}: VaultManageCopyCurationControlsProps) {
  const router = useRouter();
  const [intent, setIntent] = useState(initialIntent);
  const [sections, setSections] = useState<OwnerWallSectionMembership[]>(membershipModel.sections);
  const [statusMessage, setStatusMessage] = useState<{ ok: boolean; message: string } | null>(
    membershipModel.loadError
      ? {
          ok: false,
          message: membershipModel.loadError,
        }
      : null,
  );
  const [pendingIntent, setPendingIntent] = useState<VaultIntent | null>(null);
  const [pendingSectionId, setPendingSectionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setIntent(initialIntent);
  }, [initialIntent]);

  useEffect(() => {
    setSections(membershipModel.sections);
  }, [membershipModel.sections]);

  const statusTone = resolveStatusTone(statusMessage);
  const assignedCount = sections.filter((section) => section.is_member).length;
  const disabled = !isActive || pendingIntent !== null || pendingSectionId !== null;

  function applyMembershipResult(result: WallSectionMembershipActionResult) {
    setStatusMessage(result);
    if (result.sections) {
      setSections(result.sections);
    }
  }

  function handleIntentChange(nextIntent: VaultIntent) {
    if (disabled || nextIntent === intent) {
      return;
    }

    const previousIntent = intent;
    setIntent(nextIntent);
    setPendingIntent(nextIntent);
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const result = await saveVaultItemInstanceIntentAction({
          instanceId,
          intent: nextIntent,
        });

        if (!result.ok) {
          setIntent(previousIntent);
          setStatusMessage({ ok: false, message: result.message });
          return;
        }

        setIntent(result.intent);
        setStatusMessage({ ok: true, message: "Copy visibility saved." });
        router.refresh();
      } catch {
        setIntent(previousIntent);
        setStatusMessage({ ok: false, message: "Copy visibility could not be saved." });
      } finally {
        setPendingIntent(null);
      }
    });
  }

  function handleSectionToggle(section: OwnerWallSectionMembership) {
    if (disabled) {
      return;
    }

    setPendingSectionId(section.id);
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const result = section.is_member
          ? await removeWallSectionMembershipAction({
              sectionId: section.id,
              vaultItemInstanceId: instanceId,
            })
          : await assignWallSectionMembershipAction({
              sectionId: section.id,
              vaultItemInstanceId: instanceId,
            });

        applyMembershipResult(result);
        router.refresh();
      } catch {
        setStatusMessage({
          ok: false,
          message: "Section assignment could not be saved.",
        });
      } finally {
        setPendingSectionId(null);
      }
    });
  }

  return (
    <div className="space-y-4 border-t border-slate-200 pt-4">
      <div className="space-y-1">
        {/* LOCK: Grouped card row curation is exact-copy only (vault_item_instances.id). */}
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Organize Copy</p>
        <p className="text-xs leading-5 text-slate-500">
          Intent controls Wall visibility. Sections place this exact copy on your public Wall.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Visibility</p>
        <div className="grid gap-2 sm:grid-cols-4">
          {INTENT_OPTIONS.map((option) => {
            const selected = intent === option;
            const pending = pendingIntent === option;
            return (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => handleIntentChange(option)}
                className={cx(
                  "rounded-full border px-3 py-2 text-xs font-medium transition",
                  selected
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  disabled ? "cursor-not-allowed opacity-70" : "",
                )}
              >
                {pending ? "Saving..." : getVaultIntentLabel(option)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">{getVaultIntentHelper(intent)}</p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Sections</p>
          {sections.length > 0 ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              {assignedCount} selected
            </span>
          ) : null}
        </div>

        {sections.length === 0 ? (
          <div className="rounded-[1rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-xs leading-6 text-slate-600">
            <p>Not in any sections yet.</p>
            <p className="mt-1">{WALL_SECTION_HELPER_COPY}</p>
            <Link
              href="/account"
              className="mt-3 inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Create section
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => {
              const pending = pendingSectionId === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSectionToggle(section)}
                  className={cx(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    section.is_member
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                    disabled ? "cursor-not-allowed opacity-70" : "",
                  )}
                >
                  <span>{section.name}</span>
                  <span className="text-[10px] uppercase tracking-[0.14em]">
                    {pending ? "Saving" : section.is_member ? "Added" : "Add"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!isActive ? (
        <p className="text-xs text-slate-500">This copy is archived. Curation is historical.</p>
      ) : null}

      {statusMessage?.message ? (
        <p className={`text-xs ${statusTone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
          {statusMessage.message}
        </p>
      ) : null}
    </div>
  );
}
