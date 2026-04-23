"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { assignWallSectionMembershipAction } from "@/lib/wallSections/assignWallSectionMembershipAction";
import { removeWallSectionMembershipAction } from "@/lib/wallSections/removeWallSectionMembershipAction";
import {
  WALL_SECTION_HELPER_COPY,
  type OwnerWallSectionMembership,
  type OwnerWallSectionMembershipModel,
  type WallSectionMembershipActionResult,
} from "@/lib/wallSections/wallSectionTypes";

type VaultInstanceSectionMembershipCardProps = {
  model: OwnerWallSectionMembershipModel;
  isActive: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function resolveStatusTone(result: WallSectionMembershipActionResult | null): "success" | "error" | null {
  if (!result) {
    return null;
  }

  return result.ok ? "success" : "error";
}

export default function VaultInstanceSectionMembershipCard({
  model,
  isActive,
}: VaultInstanceSectionMembershipCardProps) {
  const router = useRouter();
  const [sections, setSections] = useState<OwnerWallSectionMembership[]>(model.sections);
  const [statusMessage, setStatusMessage] = useState<WallSectionMembershipActionResult | null>(
    model.loadError
      ? {
          ok: false,
          message: model.loadError,
        }
      : null,
  );
  const [pendingSectionId, setPendingSectionId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setSections(model.sections);
  }, [model.sections]);

  const statusTone = resolveStatusTone(statusMessage);
  const assignedCount = sections.filter((section) => section.is_member).length;

  function applyResult(result: WallSectionMembershipActionResult) {
    setStatusMessage(result);
    if (result.sections) {
      setSections(result.sections);
    }
  }

  function handleToggle(section: OwnerWallSectionMembership) {
    if (!isActive || pendingSectionId) {
      return;
    }

    setPendingSectionId(section.id);
    setStatusMessage(null);

    startTransition(async () => {
      try {
        const result = section.is_member
          ? await removeWallSectionMembershipAction({
              sectionId: section.id,
              vaultItemInstanceId: model.instanceId,
            })
          : await assignWallSectionMembershipAction({
              sectionId: section.id,
              vaultItemInstanceId: model.instanceId,
            });

        applyResult(result);
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
    <div className="space-y-4 rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* LOCK: Wall and section curation are exact-copy only. */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Sections</p>
          <p className="text-sm text-slate-600">
            Add this exact copy to custom sections. Wall visibility follows copy intent.
          </p>
        </div>
        {sections.length > 0 ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {assignedCount} selected
          </span>
        ) : null}
      </div>

      {sections.length === 0 ? (
        <div className="rounded-[1rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-7 text-slate-600">
          <p>Not in any sections yet.</p>
          <p className="mt-1">{WALL_SECTION_HELPER_COPY}</p>
          <Link
            href="/account"
            className="mt-4 inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Create section
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((section) => {
            const pending = pendingSectionId === section.id;
            const disabled = !isActive || pendingSectionId !== null;
            return (
              <button
                key={section.id}
                type="button"
                disabled={disabled}
                onClick={() => handleToggle(section)}
                className={cx(
                  "flex w-full items-center justify-between gap-3 rounded-[1rem] border px-4 py-3 text-left transition",
                  section.is_member
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-white",
                  disabled ? "cursor-not-allowed opacity-70" : "",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{section.name}</span>
                  <span className={cx("mt-1 block text-xs", section.is_member ? "text-slate-300" : "text-slate-500")}>
                    {section.is_active ? "Active" : "Inactive"}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium">
                  {pending ? "Saving..." : section.is_member ? "Added" : "Add to section"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!isActive ? (
        <p className="text-sm text-slate-500">This copy is archived. Section assignments are historical.</p>
      ) : null}

      {statusMessage?.message ? (
        <p className={`text-sm ${statusTone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
          {statusMessage.message}
        </p>
      ) : null}
    </div>
  );
}
