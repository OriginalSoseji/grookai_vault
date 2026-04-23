"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createWallSectionAction } from "@/lib/wallSections/createWallSectionAction";
import { updateWallSectionAction } from "@/lib/wallSections/updateWallSectionAction";
import {
  countActiveWallSections,
  getPublicSectionShareHref,
  normalizeWallSectionName,
  PUBLIC_WALL_SECTION_ID,
  WALL_SECTION_HELPER_COPY,
  WALL_SECTION_LIMIT_MESSAGE,
  WALL_SECTION_STORED_LIMIT_MESSAGE,
  type OwnerWallSection,
  type OwnerWallSectionLimitState,
  type WallSectionActionResult,
  type WallSectionsSettingsModel,
} from "@/lib/wallSections/wallSectionTypes";

type OwnerWallSectionRailProps = {
  initialModel: WallSectionsSettingsModel;
  publicProfileSlug?: string | null;
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

function getCreatedSection(previousSections: OwnerWallSection[], nextSections: OwnerWallSection[] | undefined) {
  const previousIds = new Set(previousSections.map((section) => section.id));
  return nextSections?.find((section) => !previousIds.has(section.id)) ?? null;
}

export function OwnerWallSectionRail({ initialModel, publicProfileSlug = null }: OwnerWallSectionRailProps) {
  const [sections, setSections] = useState<OwnerWallSection[]>(initialModel.sections);
  const [limitState, setLimitState] = useState<OwnerWallSectionLimitState>(initialModel.limitState);
  const [selectedSectionId, setSelectedSectionId] = useState(PUBLIC_WALL_SECTION_ID);
  const [isCreating, setIsCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>(() => buildNameDrafts(initialModel.sections));
  const [actionResult, setActionResult] = useState<WallSectionActionResult | null>(
    initialModel.loadError
      ? {
          ok: false,
          message: `Sections could not be loaded: ${initialModel.loadError}`,
        }
      : null,
  );
  const [isPending, startTransition] = useTransition();

  const activeCount = useMemo(() => countActiveWallSections(sections), [sections]);
  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? null;
  const normalizedCreateName = normalizeWallSectionName(createName);
  const createDisabled =
    isPending ||
    !normalizedCreateName ||
    activeCount >= limitState.activeLimit ||
    sections.length >= limitState.storedLimit;
  const statusTone = resolveStatusTone(actionResult);

  function applyResult(result: WallSectionActionResult) {
    setActionResult(result);

    if (result.sections) {
      setSections(result.sections);
      setNameDrafts(buildNameDrafts(result.sections));

      if (selectedSectionId !== PUBLIC_WALL_SECTION_ID && !result.sections.some((section) => section.id === selectedSectionId)) {
        setSelectedSectionId(PUBLIC_WALL_SECTION_ID);
      }
    }

    if (result.limitState) {
      setLimitState(result.limitState);
    }
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = normalizeWallSectionName(createName);
    const previousSections = sections;

    startTransition(async () => {
      const result = await createWallSectionAction({ name });
      applyResult(result);

      if (result.ok) {
        const createdSection = getCreatedSection(previousSections, result.sections);
        setCreateName("");
        setIsCreating(false);

        if (createdSection) {
          setSelectedSectionId(createdSection.id);
        }
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
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Wall</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Organize your Wall</h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">{WALL_SECTION_HELPER_COPY}</p>
        </div>

        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-medium text-slate-950">
            {activeCount} of {limitState.activeLimit} active
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Wall is always first.</p>
        </div>
      </div>

      {/* LOCK: Owner Wall rail keeps Wall fixed first and owner-only section controls out of public profile rendering. */}
      <nav aria-label="Wall sections" className="mt-6 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedSectionId(PUBLIC_WALL_SECTION_ID)}
          className={cx(
            "inline-flex h-11 shrink-0 items-center rounded-full px-5 text-sm font-medium transition",
            selectedSectionId === PUBLIC_WALL_SECTION_ID
              ? "bg-slate-950 text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950",
          )}
          aria-current={selectedSectionId === PUBLIC_WALL_SECTION_ID ? "page" : undefined}
        >
          Wall
        </button>

        {sections.map((section) => {
          const selected = section.id === selectedSectionId;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setSelectedSectionId(section.id)}
              className={cx(
                "inline-flex h-11 min-w-0 max-w-[14rem] shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
                selected
                  ? "bg-slate-950 text-white shadow-sm"
                  : section.is_active
                    ? "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950"
                    : "border border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400 hover:text-slate-800",
              )}
              aria-current={selected ? "page" : undefined}
            >
              <span className="truncate">{section.name}</span>
              {!section.is_active ? <span className="shrink-0 text-xs opacity-75">Inactive</span> : null}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setIsCreating(true);
            setSelectedSectionId(PUBLIC_WALL_SECTION_ID);
          }}
          className="inline-flex h-11 shrink-0 items-center rounded-full border border-slate-300 bg-slate-50 px-5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-white"
        >
          + Add Section
        </button>
      </nav>

      {isCreating ? (
        <form className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" onSubmit={handleCreate}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Section name</span>
              <input
                type="text"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Pikachu, Grails, FS/FT"
                disabled={isPending}
                className="w-full rounded-[1rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                autoFocus
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={createDisabled}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isPending ? "Saving..." : "Add Section"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setIsCreating(false);
                  setCreateName("");
                }}
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
          {actionResult?.fieldErrors?.name ? <p className="mt-3 text-sm text-rose-700">{actionResult.fieldErrors.name}</p> : null}
          {activeCount >= limitState.activeLimit ? (
            <p className="mt-3 text-sm text-slate-500">{WALL_SECTION_LIMIT_MESSAGE}</p>
          ) : sections.length >= limitState.storedLimit ? (
            <p className="mt-3 text-sm text-slate-500">{WALL_SECTION_STORED_LIMIT_MESSAGE}</p>
          ) : null}
        </form>
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

      {selectedSection ? (
        <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cx(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  selectedSection.is_active ? "bg-slate-950 text-white" : "bg-slate-200 text-slate-700",
                )}
              >
                {selectedSection.is_active ? "Active" : "Inactive"}
              </span>
              <span className="text-xs text-slate-500">{selectedSection.item_count} cards</span>
            </div>

            <label className="block space-y-2">
              <span className="sr-only">Rename {selectedSection.name}</span>
              <input
                type="text"
                value={nameDrafts[selectedSection.id] ?? selectedSection.name}
                onChange={(event) =>
                  setNameDrafts((current) => ({
                    ...current,
                    [selectedSection.id]: event.target.value,
                  }))
                }
                disabled={isPending}
                className="w-full rounded-[1rem] border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-950 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </label>
            <p className="text-sm leading-6 text-slate-600">Add cards to sections from each exact copy page.</p>
          </div>

          <div className="flex flex-wrap items-start gap-2 lg:justify-end">
            <button
              type="button"
              disabled={
                isPending || normalizeWallSectionName(nameDrafts[selectedSection.id] ?? selectedSection.name) === selectedSection.name
              }
              onClick={() => handleRename(selectedSection)}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Rename
            </button>
            <button
              type="button"
              disabled={isPending || (!selectedSection.is_active && activeCount >= limitState.activeLimit)}
              onClick={() => handleToggleActive(selectedSection)}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {selectedSection.is_active ? "Deactivate" : "Activate"}
            </button>
            {publicProfileSlug && selectedSection.is_active ? (
              <Link
                href={getPublicSectionShareHref(publicProfileSlug, selectedSection.id)}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Open section
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5 text-sm leading-7 text-slate-600">
          {sections.length === 0
            ? "No custom sections yet. Add a section when you are ready to group cards beyond Wall."
            : "Wall is fixed. Choose a section above to manage it."}
        </div>
      )}
    </section>
  );
}
