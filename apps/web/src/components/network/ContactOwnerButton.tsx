"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { createPortal } from "react-dom";
import {
  createCardInteractionAction,
  type CreateCardInteractionActionResult,
} from "@/lib/network/createCardInteractionAction";
import {
  getVaultIntentActionLabel,
  getVaultIntentLabel,
  type DiscoverableVaultIntent,
} from "@/lib/network/intent";
import { useClientViewer } from "@/lib/auth/useClientViewer";
import TrustSafetyControls from "@/components/trust/TrustSafetyControls";
import {
  COLLECTOR_BLOCKED_EVENT,
  useContactEligibility,
  useSingletonContactEligibility,
} from "@/components/network/ContactEligibilityProvider";

type ContactOwnerButtonProps = {
  vaultItemId: string;
  cardPrintId: string;
  ownerUserId?: string | null;
  viewerUserId?: string | null;
  ownerDisplayName: string;
  cardName: string;
  intent: DiscoverableVaultIntent | null;
  isAuthenticated: boolean;
  loginHref: string;
  currentPath: string;
  buttonLabel?: string;
  buttonClassName?: string;
};

function getDefaultMessage(ownerDisplayName: string, cardName: string, intent: DiscoverableVaultIntent | null) {
  const collectorName = ownerDisplayName.trim() || "there";

  switch (intent) {
    case "trade":
      return `Hi ${collectorName}, I saw your ${cardName} and wanted to ask about a trade.`;
    case "sell":
      return `Hi ${collectorName}, I saw your ${cardName} and wanted to ask about buying it.`;
    case "showcase":
      return `Hi ${collectorName}, I saw your ${cardName} and wanted to ask about it.`;
    default:
      return `Hi ${collectorName}, I saw your ${cardName} and wanted to ask about it.`;
  }
}

function getStatusMessage(state: CreateCardInteractionActionResult | null) {
  if (!state) {
    return null;
  }

  if (state.ok) {
    return {
      tone: "success" as const,
      title: "Message sent",
      body: state.message,
    };
  }

  return {
    tone: "error" as const,
    title:
      state.status === "login-required"
        ? "Sign in required"
        : state.status === "validation-error"
          ? "Message blocked"
          : state.status === "unavailable"
            ? "Card unavailable"
            : "Message failed",
    body: state.message,
  };
}

function SubmitInteractionButton({ isSubmitting }: { isSubmitting: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = pending || isSubmitting;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDisabled ? "Sending..." : "Send message"}
    </button>
  );
}

export function ContactOwnerButton({
  vaultItemId,
  cardPrintId,
  ownerUserId = null,
  viewerUserId = null,
  ownerDisplayName,
  cardName,
  intent,
  isAuthenticated,
  loginHref,
  currentPath,
  buttonLabel: providedButtonLabel,
  buttonClassName,
}: ContactOwnerButtonProps) {
  const router = useRouter();
  const viewer = useClientViewer(viewerUserId);
  const contactEligibilityContext = useContactEligibility();
  const reactId = useId().replace(/:/g, "");
  const dialogTitleId = `contact-owner-title-${reactId}`;
  const dialogDescriptionId = `contact-owner-description-${reactId}`;
  const messageHintId = `contact-owner-message-hint-${reactId}`;
  const errorId = `contact-owner-error-${reactId}`;
  const [state, formAction] = useFormState(createCardInteractionAction, null);
  const [isOpen, setIsOpen] = useState(false);
  const [locallyBlocked, setLocallyBlocked] = useState(false);
  const [dismissedSubmissionKey, setDismissedSubmissionKey] = useState<number | null>(null);
  const defaultMessage = useMemo(
    () => getDefaultMessage(ownerDisplayName, cardName, intent),
    [ownerDisplayName, cardName, intent],
  );
  const [draft, setDraft] = useState(defaultMessage);
  const visibleState = state?.submissionKey === dismissedSubmissionKey ? null : state;
  const statusMessage = getStatusMessage(visibleState);
  const buttonLabel = providedButtonLabel ?? getVaultIntentActionLabel(intent);
  const canRenderPortal = typeof document !== "undefined";
  const submissionLockRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const effectiveViewerUserId = viewer.hasCheckedSession ? viewer.userId : viewerUserId;
  const effectiveIsAuthenticated = viewer.hasCheckedSession
    ? viewer.isAuthenticated
    : isAuthenticated;
  const isSelfContact = Boolean(ownerUserId && effectiveViewerUserId && ownerUserId === effectiveViewerUserId);
  const singletonContactEligibility = useSingletonContactEligibility({
    enabled:
      contactEligibilityContext === null &&
      effectiveIsAuthenticated &&
      !isSelfContact &&
      !locallyBlocked,
    vaultItemId,
    cardPrintId,
    viewerUserId: effectiveViewerUserId,
  });
  const contactEligibility = contactEligibilityContext
    ? contactEligibilityContext.isEligible(vaultItemId, cardPrintId, ownerUserId)
    : singletonContactEligibility;

  useEffect(() => {
    setDraft(defaultMessage);
  }, [defaultMessage]);

  useEffect(() => {
    if (!state) {
      return;
    }

    submissionLockRef.current = false;
    setIsSubmitting(false);
  }, [state]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const triggerElement = triggerRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => textareaRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!submissionLockRef.current) {
          event.preventDefault();
          setIsOpen(false);
        }
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (triggerElement?.isConnected) {
        window.requestAnimationFrame(() => triggerElement.focus());
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && state && !state.ok) {
      window.requestAnimationFrame(() => errorRef.current?.focus());
    }
  }, [isOpen, state]);

  useEffect(() => {
    if (!ownerUserId) {
      return;
    }

    function handleCollectorBlocked(event: Event) {
      const blockedOwnerUserId = (event as CustomEvent<{ ownerUserId?: unknown }>).detail?.ownerUserId;
      if (blockedOwnerUserId !== ownerUserId) {
        return;
      }

      setIsOpen(false);
      setLocallyBlocked(true);
    }

    window.addEventListener(COLLECTOR_BLOCKED_EVENT, handleCollectorBlocked);
    return () => window.removeEventListener(COLLECTOR_BLOCKED_EVENT, handleCollectorBlocked);
  }, [ownerUserId]);

  useEffect(() => {
    setLocallyBlocked(false);
  }, [effectiveViewerUserId]);

  useEffect(() => {
    if (!state?.ok) {
      return;
    }

    router.refresh();
    setIsOpen(false);
  }, [router, state]);

  function handleOpen() {
    setDismissedSubmissionKey(state?.submissionKey ?? null);
    setIsOpen(true);
  }

  function handleClose() {
    if (!submissionLockRef.current) {
      setIsOpen(false);
    }
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (submissionLockRef.current) {
      event.preventDefault();
      return;
    }

    submissionLockRef.current = true;
    setIsSubmitting(true);
  }

  if (isSelfContact || locallyBlocked) {
    return null;
  }

  if (!effectiveIsAuthenticated) {
    return (
      <Link
        href={loginHref}
        className={
          buttonClassName ??
          "inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
        }
      >
        Sign in to message
      </Link>
    );
  }

  if (contactEligibility !== true) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* LOCK: Contact language must stay calm, clear, and product-facing. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={
          buttonClassName ??
          "inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        }
      >
        {buttonLabel}
      </button>

      {statusMessage?.tone === "success" ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          <p className="font-semibold">{statusMessage.title}</p>
          <p className="mt-1">{statusMessage.body}</p>
          {visibleState?.ok ? (
            <div className="mt-3">
              <Link href="/network/inbox" className="font-medium underline underline-offset-4">
                View messages
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {isOpen && canRenderPortal
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
            >
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={dialogTitleId}
                aria-describedby={dialogDescriptionId}
                aria-busy={isSubmitting}
                tabIndex={-1}
                className="w-full max-w-xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl"
              >
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {intent ? getVaultIntentLabel(intent) : "Collector Network"}
                  </p>
                  <h3 id={dialogTitleId} className="text-2xl font-semibold tracking-tight text-slate-950">
                    Message {ownerDisplayName}
                  </h3>
                  <p id={dialogDescriptionId} className="text-sm leading-6 text-slate-600">
                    Start a message about {cardName}.
                  </p>
                </div>

                <form action={formAction} onSubmit={handleFormSubmit} className="mt-5 space-y-4">
                  <input type="hidden" name="vault_item_id" value={vaultItemId} />
                  <input type="hidden" name="card_print_id" value={cardPrintId} />
                  <input type="hidden" name="return_path" value={currentPath} />

                  <label className="block space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Message</span>
                    <textarea
                      ref={textareaRef}
                      name="message"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={6}
                      maxLength={2000}
                      required
                      aria-invalid={statusMessage?.tone === "error"}
                      aria-describedby={
                        statusMessage?.tone === "error"
                          ? `${messageHintId} ${errorId}`
                          : messageHintId
                      }
                      className="w-full rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  <p id={messageHintId} className="text-xs text-slate-500">
                    Keep it about this card. Maximum 2000 characters.
                  </p>

                  {statusMessage?.tone === "error" ? (
                    <div
                      ref={errorRef}
                      id={errorId}
                      role="alert"
                      aria-live="assertive"
                      tabIndex={-1}
                      className="rounded-[14px] border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900 outline-none focus:ring-2 focus:ring-rose-300"
                    >
                      <p className="font-semibold">{statusMessage.title}</p>
                      <p className="mt-1">{statusMessage.body}</p>
                    </div>
                  ) : null}

                  {ownerUserId && !isSelfContact ? (
                    <TrustSafetyControls
                      reportedUserId={ownerUserId}
                      surface="listing"
                      surfaceId={`${cardPrintId}:${vaultItemId}`}
                      returnPath={currentPath}
                      cardPrintId={cardPrintId}
                      compact
                    />
                  ) : null}

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <SubmitInteractionButton isSubmitting={isSubmitting} />
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default ContactOwnerButton;
