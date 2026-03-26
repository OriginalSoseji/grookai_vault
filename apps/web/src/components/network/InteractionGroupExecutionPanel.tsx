"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  executeCardInteractionOutcomeAction,
  type ExecuteCardInteractionOutcomeActionResult,
} from "@/lib/network/executeCardInteractionOutcomeAction";
import type {
  UserCardInteractionOutcome,
  UserCardInteractionOwnedSourceInstance,
} from "@/lib/network/getUserCardInteractions";

type InteractionGroupExecutionPanelProps = {
  latestInteractionId: string;
  counterpartDisplayName: string;
  cardName: string;
  currentPath: string;
  ownedSourceInstances: UserCardInteractionOwnedSourceInstance[];
  latestOutcome: UserCardInteractionOutcome | null;
  pendingTradeExecutionEventId: string | null;
  hasAmbiguousPendingTradeEvent: boolean;
};

type ExecutionMode = "sale" | "trade";

function getStatusMessage(state: ExecuteCardInteractionOutcomeActionResult | null) {
  if (!state) {
    return null;
  }

  if (state.ok) {
    return {
      tone: "success" as const,
      body: state.message,
    };
  }

  return {
    tone: "error" as const,
    body: state.message,
  };
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatOutcomeSummary(outcome: UserCardInteractionOutcome) {
  const title = outcome.outcomeType === "sale" ? "Sale recorded" : "Trade leg recorded";
  const price =
    outcome.priceAmount && outcome.priceCurrency ? ` • ${outcome.priceCurrency} ${outcome.priceAmount}` : "";
  return `${title}${price} • ${formatTimestamp(outcome.createdAt)}`;
}

function SubmitExecutionButton({
  mode,
  isSubmitting,
  canSubmit,
}: {
  mode: ExecutionMode;
  isSubmitting: boolean;
  canSubmit: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = pending || isSubmitting || !canSubmit;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending || isSubmitting ? "Saving..." : mode === "sale" ? "Confirm sale" : "Confirm trade"}
    </button>
  );
}

export function InteractionGroupExecutionPanel({
  latestInteractionId,
  counterpartDisplayName,
  cardName,
  currentPath,
  ownedSourceInstances,
  latestOutcome,
  pendingTradeExecutionEventId,
  hasAmbiguousPendingTradeEvent,
}: InteractionGroupExecutionPanelProps) {
  const router = useRouter();
  const [state, formAction] = useFormState(executeCardInteractionOutcomeAction, null);
  const [mode, setMode] = useState<ExecutionMode | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState(ownedSourceInstances[0]?.instanceId ?? "");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLockRef = useRef(false);
  const statusMessage = getStatusMessage(state);
  const saleEligibleInstances = useMemo(
    () => ownedSourceInstances.filter((instance) => instance.intent === "sell"),
    [ownedSourceInstances],
  );
  const tradeEligibleInstances = useMemo(
    () => ownedSourceInstances.filter((instance) => instance.intent === "trade"),
    [ownedSourceInstances],
  );
  const eligibleInstances =
    mode === "sale" ? saleEligibleInstances : mode === "trade" ? tradeEligibleInstances : ownedSourceInstances;
  const canExecute = ownedSourceInstances.length > 0;
  const canExecuteSale = saleEligibleInstances.length > 0;
  const canExecuteTrade = tradeEligibleInstances.length > 0;
  const multipleInstances = eligibleInstances.length > 1;
  const currentExecutionEventId = mode === "trade" ? pendingTradeExecutionEventId : null;

  useEffect(() => {
    const nextEligibleInstances =
      mode === "sale" ? saleEligibleInstances : mode === "trade" ? tradeEligibleInstances : ownedSourceInstances;
    setSelectedInstanceId(nextEligibleInstances[0]?.instanceId ?? "");
  }, [mode, ownedSourceInstances, saleEligibleInstances, tradeEligibleInstances]);

  useEffect(() => {
    if (!state) {
      return;
    }

    submissionLockRef.current = false;
    setIsSubmitting(false);

    if (state.ok) {
      setMode(null);
      setPriceAmount("");
      setPriceCurrency("USD");
      router.refresh();
    }
  }, [router, state]);

  const tradeNote = useMemo(() => {
    if (hasAmbiguousPendingTradeEvent) {
      return "Multiple open trade bundles exist with this collector. Finish or archive one before recording another trade leg.";
    }

    if (pendingTradeExecutionEventId) {
      return `This trade leg will continue the open trade bundle with ${counterpartDisplayName}.`;
    }

    return `This records your side of the trade for ${cardName}.`;
  }, [cardName, counterpartDisplayName, hasAmbiguousPendingTradeEvent, pendingTradeExecutionEventId]);

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (submissionLockRef.current) {
      event.preventDefault();
      return;
    }

    submissionLockRef.current = true;
    setIsSubmitting(true);
  }

  if (!canExecute && !latestOutcome) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Card outcome</p>
        <p className="text-sm text-slate-600">Record what actually happened only after the card changes hands.</p>
      </div>

      {latestOutcome ? (
        <div className="rounded-[0.9rem] border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
          {formatOutcomeSummary(latestOutcome)}
        </div>
      ) : null}

      {canExecute ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode((current) => (current === "sale" ? null : "sale"))}
              disabled={!canExecuteSale}
              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium transition ${
                mode === "sale"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Mark as sold
            </button>
            <button
              type="button"
              onClick={() => setMode((current) => (current === "trade" ? null : "trade"))}
              disabled={hasAmbiguousPendingTradeEvent || !canExecuteTrade}
              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium transition ${
                mode === "trade"
                  ? "bg-slate-950 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Mark as traded
            </button>
          </div>

          {mode ? (
            <form action={formAction} onSubmit={handleFormSubmit} className="space-y-3">
              <input type="hidden" name="execution_type" value={mode} />
              <input type="hidden" name="latest_interaction_id" value={latestInteractionId} />
              <input type="hidden" name="source_instance_id" value={selectedInstanceId} />
              <input type="hidden" name="return_path" value={currentPath} />
              {currentExecutionEventId ? <input type="hidden" name="execution_event_id" value={currentExecutionEventId} /> : null}

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {multipleInstances ? "Owned instance" : "Executing instance"}
                </span>
                {multipleInstances ? (
                  <select
                    name="source_instance_select"
                    value={selectedInstanceId}
                    onChange={(event) => setSelectedInstanceId(event.target.value)}
                    className="w-full rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    {eligibleInstances.map((instance) => (
                      <option key={instance.instanceId} value={instance.instanceId}>
                        {instance.label} • {instance.intent.toUpperCase()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                    {eligibleInstances[0] ? `${eligibleInstances[0].label} • ${eligibleInstances[0].intent.toUpperCase()}` : "Owned instance"}
                  </div>
                )}
              </label>

              {mode === "sale" && !canExecuteSale ? (
                <p className="text-sm text-slate-600">Mark one of your active copies as Sell in your vault before recording a sale.</p>
              ) : null}
              {mode === "trade" && !hasAmbiguousPendingTradeEvent && !canExecuteTrade ? (
                <p className="text-sm text-slate-600">Mark one of your active copies as Trade in your vault before recording a trade.</p>
              ) : null}

              {mode === "sale" ? (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Sale price
                    </span>
                    <input
                      name="price_amount"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={priceAmount}
                      onChange={(event) => setPriceAmount(event.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Currency</span>
                    <select
                      name="price_currency"
                      value={priceAmount ? priceCurrency : ""}
                      onChange={(event) => setPriceCurrency(event.target.value || "USD")}
                      className="w-full rounded-[0.9rem] border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    >
                      <option value="">None</option>
                      <option value="USD">USD</option>
                      <option value="CAD">CAD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </label>
                </div>
              ) : (
                <p className="text-sm text-slate-600">{tradeNote}</p>
              )}

              {statusMessage ? (
                <p className={`text-sm ${statusMessage.tone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                  {statusMessage.body}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  disabled={isSubmitting}
                  className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <SubmitExecutionButton mode={mode} isSubmitting={isSubmitting} canSubmit={Boolean(selectedInstanceId)} />
              </div>
            </form>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-slate-600">
          No active owned instance remains on this card conversation, so there is nothing left to execute from your side.
        </p>
      )}
    </div>
  );
}

export default InteractionGroupExecutionPanel;
