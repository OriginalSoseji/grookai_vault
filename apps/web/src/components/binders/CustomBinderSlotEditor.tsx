"use client";

import { useEffect, useMemo, useState } from "react";
import PublicCardImage from "@/components/PublicCardImage";
import type { BinderChecklistSlot } from "@/lib/binders/types";
import { useBinderOnline } from "./BinderOfflineBanner";

type FinishOption = {
  cardPrintingId: string;
  label: string;
};

type CardOption = {
  cardPrintId: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  finishes: FinishOption[];
};

type EditorSlot = {
  localKey: string;
  cardPrintId: string;
  cardPrintingId: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  finishLabel: string | null;
  finishOptions: FinishOption[];
  requiredQuantity: number;
};

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none focus:ring-2 focus:ring-emerald-300";

function mergeFinishOptions(
  current: FinishOption[],
  incoming: FinishOption[],
) {
  const byId = new Map<string, FinishOption>();
  for (const option of [...incoming, ...current]) {
    if (option.cardPrintingId && option.label) {
      byId.set(option.cardPrintingId, option);
    }
  }
  return [...byId.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

function makeInitialSlots(initialSlots: BinderChecklistSlot[]): EditorSlot[] {
  const slots: EditorSlot[] = [];
  initialSlots.forEach((slot, index) => {
    if (!slot.cardPrintId) {
      return;
    }
    const finishOptions =
      slot.cardPrintingId
        ? [
            {
              cardPrintingId: slot.cardPrintingId,
              label: slot.finishLabel ?? "Current governed finish",
            },
          ]
        : [];
    slots.push({
      localKey: `current-${index}-${slot.cardPrintId}`,
      cardPrintId: slot.cardPrintId,
      cardPrintingId: slot.cardPrintingId,
      title: slot.title,
      subtitle: slot.subtitle,
      imageUrl: slot.imageUrl,
      finishLabel: slot.finishLabel,
      finishOptions,
      requiredQuantity: Math.min(
        100,
        Math.max(1, slot.requiredQuantity),
      ),
    });
  });
  return slots;
}

function identitiesOverlap(
  leftCardPrintId: string,
  leftCardPrintingId: string | null,
  rightCardPrintId: string,
  rightCardPrintingId: string | null,
) {
  return (
    leftCardPrintId === rightCardPrintId &&
    (!leftCardPrintingId ||
      !rightCardPrintingId ||
      leftCardPrintingId === rightCardPrintingId)
  );
}

export function CustomBinderSlotEditor({
  inputName,
  mode,
  initialSlots = [],
}: {
  inputName: "customSlotsJson" | "slotsJson";
  mode: "create" | "revision";
  initialSlots?: BinderChecklistSlot[];
}) {
  const online = useBinderOnline();
  const [slots, setSlots] = useState<EditorSlot[]>(() =>
    makeInitialSlots(initialSlots),
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardOption[]>([]);
  const [finishSelections, setFinishSelections] = useState<
    Record<string, string>
  >({});
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const initialCardIdsKey = useMemo(
    () =>
      Array.from(
        new Set(
          initialSlots
            .map((slot) => slot.cardPrintId)
            .filter((value): value is string => Boolean(value)),
        ),
      ).join(","),
    [initialSlots],
  );

  useEffect(() => {
    if (!initialCardIdsKey || !online) {
      return;
    }
    const controller = new AbortController();
    void fetch("/binders/card-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardPrintIds: initialCardIdsKey.split(","),
      }),
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          ok?: boolean;
          items?: Array<{
            cardPrintId?: string;
            finishes?: FinishOption[];
          }>;
        };
        if (!response.ok || !payload.ok) {
          throw new Error("Finish choices could not be loaded.");
        }
        const finishesByCard = new Map(
          (payload.items ?? [])
            .filter(
              (item): item is { cardPrintId: string; finishes: FinishOption[] } =>
                typeof item.cardPrintId === "string" &&
                Array.isArray(item.finishes),
            )
            .map((item) => [item.cardPrintId, item.finishes] as const),
        );
        setSlots((current) =>
          current.map((slot) => ({
            ...slot,
            finishOptions: mergeFinishOptions(
              slot.finishOptions,
              finishesByCard.get(slot.cardPrintId) ?? [],
            ),
          })),
        );
        setFinishError(null);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setFinishError(
            error instanceof Error
              ? error.message
              : "Finish choices could not be loaded.",
          );
        }
      });
    return () => controller.abort();
  }, [initialCardIdsKey, online]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }
    if (!online) {
      setResults([]);
      setSearchError("Reconnect to search the canonical card catalog.");
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      const params = new URLSearchParams({ q: normalized });
      void fetch(`/binders/card-options?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json()) as {
            ok?: boolean;
            error?: string;
            items?: CardOption[];
          };
          if (!response.ok || !payload.ok) {
            throw new Error(
              payload.error ?? "Card search is temporarily unavailable.",
            );
          }
          setResults(Array.isArray(payload.items) ? payload.items : []);
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setResults([]);
            setSearchError(
              error instanceof Error
                ? error.message
                : "Card search is temporarily unavailable.",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setSearching(false);
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [online, query]);

  const serializedSlots = useMemo(
    () =>
      JSON.stringify(
        slots.map((slot) => ({
          card_print_id: slot.cardPrintId,
          card_printing_id: slot.cardPrintingId,
          required_quantity: slot.requiredQuantity,
        })),
      ),
    [slots],
  );

  const totalRequired = slots.reduce(
    (sum, slot) => sum + slot.requiredQuantity,
    0,
  );

  function changeSlots(update: (current: EditorSlot[]) => EditorSlot[]) {
    setSlots((current) => update(current));
    setConfirmed(false);
  }

  function addCard(option: CardOption) {
    if (slots.length >= 1000) {
      setNotice("A custom Binder can contain at most 1,000 checklist slots.");
      return;
    }
    const selectedFinishId = finishSelections[option.cardPrintId] || null;
    if (
      slots.some((slot) =>
        identitiesOverlap(
          slot.cardPrintId,
          slot.cardPrintingId,
          option.cardPrintId,
          selectedFinishId,
        ),
      )
    ) {
      setNotice(
        "That card and finish overlaps a slot already in this checklist.",
      );
      return;
    }
    const selectedFinish = option.finishes.find(
      (finish) => finish.cardPrintingId === selectedFinishId,
    );
    changeSlots((current) => [
      ...current,
      {
        localKey: crypto.randomUUID(),
        cardPrintId: option.cardPrintId,
        cardPrintingId: selectedFinish?.cardPrintingId ?? null,
        title: option.title,
        subtitle: option.subtitle,
        imageUrl: option.imageUrl,
        finishLabel: selectedFinish?.label ?? null,
        finishOptions: option.finishes,
        requiredQuantity: 1,
      },
    ]);
    setNotice(`${option.title} was added to the checklist preview.`);
  }

  function changeFinish(index: number, cardPrintingId: string) {
    const currentSlot = slots[index];
    if (!currentSlot) {
      return;
    }
    const nextPrintingId = cardPrintingId || null;
    if (
      slots.some(
        (slot, slotIndex) =>
          slotIndex !== index &&
          identitiesOverlap(
            slot.cardPrintId,
            slot.cardPrintingId,
            currentSlot.cardPrintId,
            nextPrintingId,
          ),
      )
    ) {
      setNotice(
        "That finish would overlap another slot for the same card.",
      );
      return;
    }
    const finish = currentSlot.finishOptions.find(
      (option) => option.cardPrintingId === nextPrintingId,
    );
    changeSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index
          ? {
              ...slot,
              cardPrintingId: finish?.cardPrintingId ?? null,
              finishLabel: finish?.label ?? null,
            }
          : slot,
      ),
    );
    setNotice(null);
  }

  function changeQuantity(index: number, rawValue: string) {
    const quantity = Math.min(
      100,
      Math.max(1, Number.parseInt(rawValue, 10) || 1),
    );
    const current = slots[index];
    if (!current) {
      return;
    }
    if (totalRequired - current.requiredQuantity + quantity > 25000) {
      setNotice(
        "The combined required quantity cannot exceed 25,000 copies.",
      );
      return;
    }
    changeSlots((items) =>
      items.map((slot, slotIndex) =>
        slotIndex === index
          ? { ...slot, requiredQuantity: quantity }
          : slot,
      ),
    );
    setNotice(null);
  }

  function moveSlot(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= slots.length) {
      return;
    }
    changeSlots((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(destination, 0, moved);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <input type="hidden" name={inputName} value={serializedSlots} />

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <h3 className="font-semibold text-slate-950">Find canonical cards</h3>
          <p className="mt-1 text-sm text-slate-600">
            Search by Pokémon, set, collector number, or governed finish. The
            exact card and finish selection is kept for you.
          </p>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Card search
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
              }
            }}
            maxLength={80}
            placeholder="Pikachu Base Set 58 or reverse holo"
            className={inputClass}
          />
        </label>
        <div aria-live="polite" className="text-sm text-slate-600">
          {searching
            ? "Searching canonical cards…"
            : searchError
              ? searchError
              : query.trim().length >= 2 && results.length === 0
                ? "No canonical cards matched that search."
                : null}
        </div>
        {results.length > 0 ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {results.map((option) => {
              const selectedFinish =
                finishSelections[option.cardPrintId] ?? "";
              return (
                <li
                  key={option.cardPrintId}
                  className="rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex gap-3">
                    <div className="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <PublicCardImage
                        src={option.imageUrl ?? undefined}
                        alt={`${option.title} card artwork`}
                        imageClassName="h-full w-full object-contain"
                        fallbackClassName="flex h-full items-center justify-center p-2 text-center text-[10px] text-slate-500"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-950">
                        {option.title}
                      </p>
                      {option.subtitle ? (
                        <p className="mt-1 text-xs text-slate-600">
                          {option.subtitle}
                        </p>
                      ) : null}
                      <label className="mt-2 block text-xs font-medium text-slate-700">
                        Finish requirement
                        <select
                          className={inputClass}
                          value={selectedFinish}
                          onChange={(event) =>
                            setFinishSelections((current) => ({
                              ...current,
                              [option.cardPrintId]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Any governed finish</option>
                          {option.finishes.map((finish) => (
                            <option
                              key={finish.cardPrintingId}
                              value={finish.cardPrintingId}
                            >
                              {finish.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        aria-label={`Add ${option.title} to checklist`}
                        onClick={() => addCard(option)}
                        className="mt-3 min-h-11 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Add card
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="font-semibold text-slate-950">Ordered checklist</h3>
          <p className="mt-1 text-sm text-slate-600">
            {slots.length} {slots.length === 1 ? "slot" : "slots"} ·{" "}
            {totalRequired} required{" "}
            {totalRequired === 1 ? "copy" : "copies"}
          </p>
        </div>
        {finishError ? (
          <p role="alert" className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
            {finishError} Current finish selections are preserved, but wait to
            publish if you need to change them.
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-2xl bg-sky-50 p-3 text-sm text-sky-900">
            {notice}
          </p>
        ) : null}
        {slots.length > 0 ? (
          <ol className="space-y-3">
            {slots.map((slot, index) => (
              <li
                key={slot.localKey}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    <PublicCardImage
                      src={slot.imageUrl ?? undefined}
                      alt={`${slot.title} card artwork`}
                      imageClassName="h-full w-full object-contain"
                      fallbackClassName="flex h-full items-center justify-center p-2 text-center text-[10px] text-slate-500"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Slot {index + 1}
                      </p>
                      <p className="font-semibold text-slate-950">{slot.title}</p>
                      {slot.subtitle ? (
                        <p className="mt-1 text-xs text-slate-600">
                          {slot.subtitle}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-medium text-slate-700">
                        Finish requirement
                        <select
                          className={inputClass}
                          value={slot.cardPrintingId ?? ""}
                          onChange={(event) =>
                            changeFinish(index, event.target.value)
                          }
                        >
                          <option value="">Any governed finish</option>
                          {slot.finishOptions.map((finish) => (
                            <option
                              key={finish.cardPrintingId}
                              value={finish.cardPrintingId}
                            >
                              {finish.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs font-medium text-slate-700">
                        Copies required
                        <input
                          type="number"
                          min={1}
                          max={100}
                          inputMode="numeric"
                          className={inputClass}
                          value={slot.requiredQuantity}
                          onChange={(event) =>
                            changeQuantity(index, event.target.value)
                          }
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={index === 0}
                        aria-label={`Move ${slot.title} earlier`}
                        onClick={() => moveSlot(index, -1)}
                        className="min-h-11 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        disabled={index === slots.length - 1}
                        aria-label={`Move ${slot.title} later`}
                        onClick={() => moveSlot(index, 1)}
                        className="min-h-11 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        Move down
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${slot.title} from checklist`}
                        onClick={() =>
                          changeSlots((current) =>
                            current.filter(
                              (candidate) =>
                                candidate.localKey !== slot.localKey,
                            ),
                          )
                        }
                        className="min-h-11 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600">
            Add at least one canonical card to create the checklist.
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
        <h3 className="font-semibold text-emerald-950">
          Review and confirm
        </h3>
        {slots.length > 0 ? (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-emerald-950">
            {slots.map((slot) => (
              <li key={`preview-${slot.localKey}`}>
                {slot.title}
                {slot.finishLabel ? ` · ${slot.finishLabel}` : " · any finish"}
                {` · ${slot.requiredQuantity} ${
                  slot.requiredQuantity === 1 ? "copy" : "copies"
                }`}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-emerald-950">
            The checklist needs at least one card before confirmation.
          </p>
        )}
        <p className="text-xs text-emerald-900">
          {mode === "revision"
            ? "Publishing replaces the active checklist definition. Contributions that no longer match are removed from the Binder only; Vault cards never change."
            : "This creates a private personal Binder. Cards are contributed separately and always stay in their owner's Vault."}
        </p>
        <label className="flex items-start gap-2 text-sm font-medium text-emerald-950">
          <input
            type="checkbox"
            name="customChecklistConfirmation"
            value="confirmed"
            required
            checked={confirmed}
            onChange={(event) => {
              if (slots.length > 0) {
                setConfirmed(event.target.checked);
              }
            }}
            className="mt-1"
          />
          <span>
            I reviewed this ordered checklist and its finish and quantity
            requirements.
          </span>
        </label>
      </section>
    </div>
  );
}
