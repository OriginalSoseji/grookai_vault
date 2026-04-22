"use client";

import { useMemo, useState, useTransition } from "react";
import { createWallSectionAction } from "@/lib/wallSections/createWallSectionAction";
import { updateWallSectionAction } from "@/lib/wallSections/updateWallSectionAction";
import {
  countActiveWallSections,
  normalizeWallSectionName,
  WALL_SECTION_HELPER_COPY,
  WALL_SECTION_LIMIT_MESSAGE,
  WALL_SECTION_STORED_LIMIT_MESSAGE,
  type OwnerWallSection,
  type OwnerWallSectionLimitState,
  type WallSectionActionResult,
  type WallSectionsSettingsModel,
} from "@/lib/wallSections/wallSectionTypes";

type WallSectionsSettingsCardProps = {
  initialModel: WallSectionsSettingsModel;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function buildNameDrafts(sections: OwnerWallSection[]) {
  return Object.fromEntries(sections.map((section) => [section.id, section.name]));
}

function resolveStatusTone(result: WallSectionActionResult | null): "success" | "error" | null {
  if (!result) {
    return null;
  }

  return result.ok ? "success" : "error";
}

export function WallSectionsSettingsCard({ initialModel }: WallSectionsSettingsCardProps) {
  const [sections, setSections] = useState<OwnerWallSection[]>(initialModel.sections);
  const [limitState, setLimitState] = useState<OwnerWallSectionLimitState>(initialModel.limitState);
  const [createName, setCreateName] = useState("");
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>(() => buildNameDrafts(initialModel.sections));
  const [actionResult, setActionResult] = useState<WallSectionActionResult | null>(
    initialModel.loadError
      ? {
          ok: false,
          message: `Wall Sections could not be loaded: ${initialModel.loadError}`,
        }
      : null,
  );
  const [isPending, startTransition] = useTransition();

  const activeCount = useMemo(() => countActiveWallSections(sections), [sections]);
  const createDisabled = isPending || activeCount >= limitState.activeLimit || sections.length >= limitState.storedLimit;
  const statusTone = resolveStatusTone(actionResult);

  function applyResult(result: WallSectionActionResult) {
    setActionResult(result);
    if (result.sections) {
      setSections(result.sections);
      setNameDrafts(buildNameDrafts(result.sections));
    }
    if (result.limitState) {
      setLimitState(result.limitState);
    }
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = normalizeWallSectionName(createName);

    startTransition(async () => {
      const result = await createWallSectionAction({ name });
      applyResult(result);
      if (result.ok) {
        setCreateName("");
      }
    });
  }

  function handleRename(section: OwnerWallSection) {
    const name = normalizeWallSectionName(nameDrafts[section.id] ?? section.name);

    startTransition(async () => {
      applyResult(await updateWallSectionAction({ sectionId: section.id, name }));
    });
  }

  function handleToggleActive(section: OwnerWallSection) {
    startTransition(async () => {
      applyResult(
        await updateWallSectionAction({
          sectionId: section.id,
          isActive: !section.is_active,
        }),
      );
    });
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Wall Sections</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Organize your public Wall</h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">{WALL_SECTION_HELPER_COPY}</p>
        </div>

        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-medium text-slate-950">
            {activeCount} of {limitState.activeLimit} active
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Wall is always included.</p>
        </div>
      </div>

      <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={handleCreate}>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Section name</span>
          <input
            type="text"
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="Pikachu, Grails, FS/FT"
            disabled={isPending}
            className="w-full rounded-[1rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </label>
        <button
          type="submit"
          disabled={createDisabled}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? "Saving..." : "Create section"}
        </button>
      </form>

      {activeCount >= limitState.activeLimit ? (
        <p className="mt-3 text-sm text-slate-500">{WALL_SECTION_LIMIT_MESSAGE}</p>
      ) : sections.length >= limitState.storedLimit ? (
        <p className="mt-3 text-sm text-slate-500">{WALL_SECTION_STORED_LIMIT_MESSAGE}</p>
      ) : null}

      {actionResult?.message ? (
        <div
          className={cx(
            "mt-4 rounded-[1.25rem] border px-4 py-3 text-sm",
            statusTone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700",
          )}
        >
          {actionResult.message}
        </div>
      ) : null}

      {sections.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm leading-7 text-slate-600">
          No custom sections yet. Create one when you are ready to group cards beyond your Wall.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {sections.map((section) => {
            const nameDraft = nameDrafts[section.id] ?? section.name;
            const changedName = normalizeWallSectionName(nameDraft) !== section.name;
            const activationBlocked = !section.is_active && activeCount >= limitState.activeLimit;

            return (
              <div
                key={section.id}
                className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cx(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        section.is_active ? "bg-slate-950 text-white" : "bg-slate-200 text-slate-700",
                      )}
                    >
                      {section.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-slate-500">{section.item_count} cards</span>
                  </div>

                  <label className="block space-y-2">
                    <span className="sr-only">Rename {section.name}</span>
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(event) =>
                        setNameDrafts((current) => ({
                          ...current,
                          [section.id]: event.target.value,
                        }))
                      }
                      disabled={isPending}
                      className="w-full rounded-[1rem] border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <button
                    type="button"
                    disabled={isPending || !changedName}
                    onClick={() => handleRename(section)}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    disabled={isPending || activationBlocked}
                    onClick={() => handleToggleActive(section)}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {section.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
