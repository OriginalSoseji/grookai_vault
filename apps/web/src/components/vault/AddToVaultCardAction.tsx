"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useActionState, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { resolveCardImagePresentation } from "@/lib/cards/resolveCardImagePresentation";
import { isCollectorAcquisition, localCollectorAcquisition, localCollectorToday, type CollectorAcquisition } from "@/lib/vault/collectorAcquisitionDate";
import PrintingSelector from "@/components/cards/PrintingSelector";
import VaultSubmitButton from "@/components/VaultSubmitButton";
import { useClientViewer } from "@/lib/auth/useClientViewer";
import { findPrintingByReference } from "@/lib/cards/printingSelection";
import { sendTelemetryEvent } from "@/lib/telemetry/client";
import type { CardPrinting } from "@/types/cards";
import JungleEditionChoices from "@/components/cards/JungleEditionChoices";
import type { JungleEditionResolution } from "@/lib/cards/jungleEditionResolution";

export type AddToVaultActionResult =
  | {
    ok: true;
    status: "added" | "incremented" | "exists";
    gvvi_id?: string | null;
    gvvi_ids?: string[];
    quantity?: number;
    addedCount?: number;
    submissionKey: number;
  }
  | {
    ok: false;
    status: "login-required" | "not-found" | "error" | "edition-required";
    editionResolution?: JungleEditionResolution;
    addedCount?: number;
    message?: string;
    submissionKey: number;
  };

export type AddToVaultCardServerAction = (
  previousState: AddToVaultActionResult | null,
  formData: FormData,
) => Promise<AddToVaultActionResult>;

type AddToVaultCardActionProps = {
  action: AddToVaultCardServerAction;
  isAuthenticated: boolean;
  loginHref: string;
  currentPath: string;
  gvId: string;
  printings?: CardPrinting[];
  initialPrintingId?: string | null;
  selectedPrintingId?: string | null;
  onSelectedPrintingChange?: (printing: CardPrinting) => void;
  telemetryEnabled?: boolean;
  compactPresentation?: boolean;
};

function getDefaultPrinting(
  printings: CardPrinting[],
  initialPrintingId?: string | null,
) {
  if (initialPrintingId) {
    const initialPrinting = findPrintingByReference(
      printings,
      initialPrintingId,
    );
    if (initialPrinting) {
      return initialPrinting;
    }
  }

  return (
    printings.find((printing) => printing.finish_key === "normal") ??
      printings.find((printing) => printing.finish_key === "holo") ??
      printings[0] ??
      null
  );
}

function getStatusMessage(result: AddToVaultActionResult | null) {
  if (!result) {
    return null;
  }

  switch (result.status) {
    case "added":
      return {
        tone: "success" as const,
        title: "Added to Vault",
        body: "This card is now in your vault.",
      };
    case "incremented":
      return {
        tone: "success" as const,
        title: "Vault quantity updated",
        body: "Vault quantity increased by 1.",
      };
    case "exists":
      return {
        tone: "success" as const,
        title: "Already in Vault",
        body: "This card is already in your vault.",
      };
    case "login-required":
      return {
        tone: "error" as const,
        title: "Sign in required",
        body: "Sign in to add cards to your vault.",
      };
    case "not-found":
      return {
        tone: "error" as const,
        title: "Card unavailable",
        body: "This card could not be added right now.",
      };
    case "edition-required":
    case "error":
      return {
        tone: "error" as const,
        title: "Vault add failed",
        body: result.message?.trim() ||
          "Something went wrong while adding this card to your vault.",
      };
    default:
      return null;
  }
}

function buildImageSuggestionPath(args: {
  gvId: string;
  currentPath: string;
  printing: CardPrinting;
  finishKey?: string;
  finishName?: string;
  reason?: string;
}) {
  const params = new URLSearchParams();
  params.set("intent", "MISSING_IMAGE");
  params.set("card", args.gvId);

  const publicPrintingReference = args.printing.printing_gv_id?.trim() ||
    args.finishKey?.trim() ||
    args.printing.finish_key?.trim() ||
    args.finishName?.trim() ||
    args.printing.finish_name?.trim();
  if (publicPrintingReference) {
    params.set("printing", publicPrintingReference);
  }

  const finishName = args.finishName?.trim() ||
    args.printing.finish_name?.trim();
  if (finishName) {
    params.set("finish", finishName);
  }

  params.set(
    "reason",
    args.reason?.trim() || "child_printing_uses_parent_image",
  );
  params.set("returnTo", args.currentPath);

  return `/submit?${params.toString()}`;
}

function PendingReviewFields({children}: {children: ReactNode}) {
  const {pending} = useFormStatus();
  return <fieldset disabled={pending} className="min-w-0 space-y-3">{children}</fieldset>;
}

export default function AddToVaultCardAction({
  action,
  isAuthenticated,
  loginHref,
  currentPath,
  gvId,
  printings = [],
  initialPrintingId,
  selectedPrintingId,
  onSelectedPrintingChange,
  telemetryEnabled = true,
  compactPresentation = false,
}: AddToVaultCardActionProps) {
  const router = useRouter();
  const viewer = useClientViewer(null);
  const [state, formAction, actionPending] = useActionState(action, null);
  const finishSelectId = useId();
  const [requestId, setRequestId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState("Unspecified");
  const [totalPaid, setTotalPaid] = useState("");
  const [acquisition, setAcquisition] = useState<CollectorAcquisition | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const requestStorageKey = `vault_add_review_v1:${
    viewer.userId ?? "signed-out"
  }:${gvId}`;
  const refreshedSubmissionKeyRef = useRef<number | null>(null);
  const [successPulse, setSuccessPulse] = useState<
    "added" | "incremented" | null
  >(null);
  const [selectedPrinting, setSelectedPrinting] = useState<CardPrinting | null>(
    () => getDefaultPrinting(printings, initialPrintingId),
  );
  const externallySelectedPrinting = selectedPrintingId
    ? findPrintingByReference(printings, selectedPrintingId)
    : null;
  const effectiveSelectedPrinting = externallySelectedPrinting ??
    selectedPrinting;
  const selectedChildPrintingId = effectiveSelectedPrinting?.is_display_fallback
    ? null
    : effectiveSelectedPrinting?.id ?? null;
  const onlyFallbackPrinting = printings.length === 1 &&
    printings[0]?.is_display_fallback === true;
  const selectedVersionLabel = effectiveSelectedPrinting?.finish_name?.trim() ||
    "Selected version";
  const statusMessage = getStatusMessage(state);
  const toneClasses = statusMessage?.tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : "border-rose-200 bg-rose-50 text-rose-800";
  const effectiveIsAuthenticated = isAuthenticated || viewer.isAuthenticated;

  useEffect(() => {
    if (isAuthenticated && !viewer.hasCheckedSession) return;
    setQuantity(1);
    setCondition("Unspecified");
    setTotalPaid("");
    setAcquisition(localCollectorAcquisition(localCollectorToday()));
    try {
      // Without a verified browser owner, retain only this mounted attempt.
      const raw = viewer.userId ? sessionStorage.getItem(requestStorageKey) : null;
      const draft = raw ? JSON.parse(raw) : null;
      setRequestId(
        typeof draft?.requestId === "string"
          ? draft.requestId
          : crypto.randomUUID(),
      );
      if (draft) {
        if (isCollectorAcquisition(draft.acquisition)) setAcquisition(draft.acquisition);
        setQuantity(
          Number.isInteger(draft.quantity) && draft.quantity >= 1 &&
            draft.quantity <= 100
            ? draft.quantity
            : 1,
        );
        setCondition(
          ["Unspecified", "NM", "LP", "MP", "HP", "DMG"].includes(
              draft.condition,
            )
            ? draft.condition
            : "Unspecified",
        );
        setTotalPaid(
          typeof draft.totalPaid === "string" ? draft.totalPaid : "",
        );
        const printing = findPrintingByReference(
          printings,
          draft.printingId ?? "",
        );
        if (printing) {
          setSelectedPrinting(printing);
          onSelectedPrintingChange?.(printing);
        }
      }
      setReviewed(false);
    } catch {
      setRequestId(crypto.randomUUID());
    }
    setRestoredKey(requestStorageKey);
    // A stored request is restored only when the owner/card changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestStorageKey, isAuthenticated, viewer.userId, viewer.hasCheckedSession]);

  useEffect(() => {
    if (!requestId || restoredKey !== requestStorageKey || !viewer.userId) return;
    try {
      sessionStorage.setItem(requestStorageKey, JSON.stringify({requestId,quantity,condition,totalPaid,printingId:selectedChildPrintingId,acquisition}));
    } catch { /* A mounted review retains its retry identity when storage is unavailable. */ }
  }, [requestId,restoredKey,requestStorageKey,viewer.userId,quantity,condition,totalPaid,selectedChildPrintingId,acquisition]);

  useEffect(() => {
    setReviewed(false);
  }, [selectedChildPrintingId]);

  function handleSelectedPrintingChange(printing: CardPrinting) {
    setReviewed(false);
    setSelectedPrinting(printing);
    onSelectedPrintingChange?.(printing);
  }

  function getImageSuggestionHref(printing: CardPrinting) {
    const submitPath = buildImageSuggestionPath({
      gvId,
      currentPath,
      printing,
    });

    if (effectiveIsAuthenticated) {
      return submitPath;
    }

    return `/login?next=${encodeURIComponent(submitPath)}`;
  }

  function getSuggestionHrefForFinish(finishKey: string, finishName: string) {
    const fallbackPrinting = effectiveSelectedPrinting ?? printings[0];
    if (!fallbackPrinting) {
      return null;
    }

    const submitPath = buildImageSuggestionPath({
      gvId,
      currentPath,
      printing: fallbackPrinting,
      finishKey,
      finishName,
      reason: "missing_child_printing_image",
    });

    if (effectiveIsAuthenticated) {
      return submitPath;
    }

    return `/login?next=${encodeURIComponent(submitPath)}`;
  }

  useEffect(() => {
    if (
      !state?.ok || (state.status !== "added" && state.status !== "incremented")
    ) {
      setSuccessPulse(null);
      return;
    }

    if (refreshedSubmissionKeyRef.current === state.submissionKey) {
      return;
    }

    refreshedSubmissionKeyRef.current = state.submissionKey;
    try {
      sessionStorage.removeItem(requestStorageKey);
    } catch { /* In-memory retry identity remains available. */ }
    setRequestId(crypto.randomUUID());
    setReviewed(false);
    setSuccessPulse(state.status);
    router.refresh();

    const timeoutId = window.setTimeout(() => {
      setSuccessPulse((current) => (current === state.status ? null : current));
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [router, state, requestStorageKey]);

  const printingControls = <fieldset disabled={actionPending} className="min-w-0">{printings.length > 0
        ? (
          <PrintingSelector
            printings={printings}
            selectedPrintingId={effectiveSelectedPrinting?.id}
            onSelectedPrintingChange={handleSelectedPrintingChange}
            title="Printing"
            compact
            showImageFallbackNotice
            getImageSuggestionHref={getImageSuggestionHref}
            imageSuggestionLinks={onlyFallbackPrinting
              ? [
                {
                  label: "Suggest Reverse Holo image",
                  href: getSuggestionHrefForFinish("reverse", "Reverse Holo") ??
                    "#",
                },
              ].filter((link) => link.href !== "#")
              : []}
          />
        )
        : null}</fieldset>;
  const selectedImage = effectiveSelectedPrinting ? resolveCardImagePresentation(effectiveSelectedPrinting) : null;
  const selectedImageNote = effectiveSelectedPrinting?.is_display_fallback
    ? "Base image only; finish-specific artwork is not verified."
    : selectedImage?.detailNote ?? selectedImage?.detailBadgeLabel;

  return (
    <div className="space-y-5" data-add-to-vault-flow>
      {compactPresentation && printings.length > 0 ? (
        <div className="gv-detail-finish-field">
          <label htmlFor={finishSelectId}>Variant / Finish</label>
          <select id={finishSelectId} value={effectiveSelectedPrinting?.id ?? ""}
            disabled={actionPending}
            onChange={event => {
              const printing = printings.find(item => item.id === event.target.value);
              if (printing) handleSelectedPrintingChange(printing);
            }}>
            {printings.map(printing => <option key={printing.id} value={printing.id}>{printing.finish_name || printing.finish_key || "Base printing"}</option>)}
          </select>
        </div>
      ) : printingControls}
      {compactPresentation && selectedImageNote ? <p className="gv-detail-printing-notice">{selectedImageNote}</p> : null}

      <div className="space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-700/80">
        <div className="flex flex-wrap items-center gap-3">
          {effectiveIsAuthenticated
            ? (
              <form
                action={formAction}
                className="w-full space-y-3"
                onSubmit={() => {
                  try {
                    if (viewer.userId) sessionStorage.setItem(
                      requestStorageKey,
                      JSON.stringify({
                        requestId,
                        quantity,
                        condition,
                        totalPaid,
                        acquisition,
                        printingId: selectedChildPrintingId,
                      }),
                    );
                  } catch {
                    /* The same mounted form still retries with its original request ID. */
                  }
                  if (telemetryEnabled) {
                    sendTelemetryEvent({
                      eventName: "vault_add_click",
                      path: currentPath,
                      gvId,
                    });
                  }
                }}
              >
                <PendingReviewFields>
                {selectedChildPrintingId
                  ? (
                    <input
                      type="hidden"
                      name="card_printing_id"
                      value={selectedChildPrintingId}
                    />
                  )
                  : null}
                <input type="hidden" name="request_id" value={requestId} />
                <input type="hidden" name="acquired_at" value={acquisition?.acquired_at ?? ""} />
                <input type="hidden" name="acquired_utc_offset_minutes" value={acquisition?.acquired_utc_offset_minutes ?? ""} />
                <label className="gv-collector-field-row">Acquired on
                  <input type="date" name="acquired_on" required value={acquisition?.acquired_on ?? ""}
                    onChange={event => {setAcquisition(localCollectorAcquisition(event.target.value));setReviewed(false);}} />
                </label>
                <fieldset>
                  <legend className="text-sm font-medium">Condition</legend>
                  <input type="hidden" name="condition" value={condition} />
                  <div className="gv-collector-condition">
                    {["Unspecified", "NM", "LP", "MP", "HP", "DMG"].map(
                      (value) => (
                        <button
                          type="button"
                          key={value}
                          aria-pressed={condition === value}
                          onClick={() => {
                            setCondition(value);
                            setReviewed(false);
                          }}
                        >
                          {value === "Unspecified" ? "Unknown" : value}
                        </button>
                      ),
                    )}
                  </div>
                </fieldset>
                <div className="gv-collector-field-row">
                  <label htmlFor="review-copy-quantity">Quantity</label>
                  <div className="gv-quantity-stepper">
                    <button
                      type="button"
                      aria-label="Remove one copy"
                      disabled={quantity <= 1}
                      onClick={() => {
                        setQuantity((value) => Math.max(1, value - 1));
                        setReviewed(false);
                      }}
                    >
                      −
                    </button>
                    <input
                      id="review-copy-quantity"
                      required
                      name="quantity"
                      type="number"
                      min="1"
                      max="100"
                      value={quantity}
                      onChange={(event) => {
                        setQuantity(Number(event.target.value));
                        setReviewed(false);
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Add one copy"
                      disabled={quantity >= 100}
                      onClick={() => {
                        setQuantity((value) => Math.min(100, value + 1));
                        setReviewed(false);
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[var(--gv-text-secondary)]">
                  {quantity} × {selectedVersionLabel} ·{" "}
                  {condition === "Unspecified"
                    ? "Condition unknown"
                    : condition}
                </p>
                <details
                  className="gv-cost-disclosure"
                  open={totalPaid !== "" ? true : undefined}
                >
                  <summary>
                    <span>
                      Acquisition cost{" "}
                      <span className="text-xs text-[var(--gv-text-secondary)]">
                        (optional)
                      </span>
                      <span className="mt-1 block text-xs text-[var(--gv-text-secondary)]">
                        {totalPaid === ""
                          ? "Not recorded"
                          : `$${totalPaid} total`}
                      </span>
                    </span>
                    <span aria-hidden>✎</span>
                  </summary>
                  <label className="block pb-3 text-sm">
                    Total paid · USD (optional)<input
                      name="total_paid"
                      inputMode="decimal"
                      pattern="[0-9]+([.][0-9]{1,2})?"
                      value={totalPaid}
                      onChange={(event) => {
                        setTotalPaid(event.target.value);
                        setReviewed(false);
                      }}
                      placeholder="Unknown"
                      className="mt-2 min-h-11 w-full rounded-lg border border-[var(--gv-border-soft)] bg-transparent px-3"
                    />
                    <span className="mt-2 block text-xs text-[var(--gv-text-secondary)]">
                      Leave blank for unknown. Enter 0 for free.
                    </span>
                  </label>
                </details>
                <label className="flex min-h-12 items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="reviewed"
                    required
                    checked={reviewed}
                    onChange={(event) => setReviewed(event.target.checked)}
                  />I reviewed the printing, copies and cost.
                </label>
                <VaultSubmitButton
                  disabled={!reviewed || !acquisition || !requestId || restoredKey !== requestStorageKey || !selectedChildPrintingId}
                  label="Add to Vault"
                  successActive={successPulse !== null}
                  successLabel={successPulse === "incremented"
                    ? "Updated"
                    : "Added"}
                />
                </PendingReviewFields>
              </form>
            )
            : (
              <Link
                href={loginHref}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] hover:bg-slate-800 sm:w-auto"
              >
                Sign in to add
              </Link>
            )}
        </div>
      </div>

      {state && !state.ok && state.editionResolution ? <JungleEditionChoices resolution={state.editionResolution} /> : null}
      {statusMessage
        ? (
          <div
            className={`rounded-[12px] border px-4 py-3 ${toneClasses}`}
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-semibold">{statusMessage.title}</p>
            <p className="mt-1 text-sm">
              {state?.ok && state.quantity
                ? `${state.quantity} exact ${
                  state.quantity === 1 ? "copy saved" : "copies saved"
                }.`
                : statusMessage.body}
            </p>
            {state?.ok && state.gvvi_ids && state.gvvi_ids.length > 1
              ? (
                <ul className="mt-2 space-y-1">
                  {state.gvvi_ids.map((id) => (
                    <li key={id}>
                      <Link
                        className="inline-flex min-h-11 items-center underline"
                        href={`/vault/gvvi/${encodeURIComponent(id)}`}
                      >
                        {id}
                      </Link>
                    </li>
                  ))}
                </ul>
              )
              : null}
            {state?.ok && state.gvvi_id
              ? (
                <Link
                  href={`/vault/gvvi/${encodeURIComponent(state.gvvi_id)}`}
                  className="mt-3 inline-flex min-h-11 items-center rounded-full border border-current px-4 py-2 text-sm font-medium transition active:scale-[0.98]"
                >
                  View exact copy
                </Link>
              )
              : null}
            {state?.status === "login-required" || !effectiveIsAuthenticated
              ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href={loginHref}
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    Sign in
                  </Link>
                </div>
              )
              : null}
          </div>
        )
        : null}
    </div>
  );
}
