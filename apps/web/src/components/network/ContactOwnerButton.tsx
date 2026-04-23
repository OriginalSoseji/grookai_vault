"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [state, formAction] = useFormState(createCardInteractionAction, null);
  const [isOpen, setIsOpen] = useState(false);
  const defaultMessage = useMemo(
    () => getDefaultMessage(ownerDisplayName, cardName, intent),
    [ownerDisplayName, cardName, intent],
  );
  const [draft, setDraft] = useState(defaultMessage);
  const statusMessage = getStatusMessage(state);
  const buttonLabel = providedButtonLabel ?? getVaultIntentActionLabel(intent);
  const canRenderPortal = typeof document !== "undefined";
  const submissionLockRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const effectiveViewerUserId = viewer.userId ?? viewerUserId;
  const effectiveIsAuthenticated = isAuthenticated || viewer.isAuthenticated;
  const isSelfContact = Boolean(ownerUserId && effectiveViewerUserId && ownerUserId === effectiveViewerUserId);

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

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!state?.ok) {
      return;
    }

    router.refresh();
    setIsOpen(false);
  }, [router, state]);

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (submissionLockRef.current) {
      event.preventDefault();
      return;
    }

    submissionLockRef.current = true;
    setIsSubmitting(true);
  }

  if (isSelfContact) {
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

  return (
    <div className="space-y-3">
      {/* LOCK: Contact language must stay calm, clear, and product-facing. */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          buttonClassName ??
          "inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        }
      >
        {buttonLabel}
      </button>

      {statusMessage ? (
        <div
          className={`rounded-[14px] border px-4 py-3 text-sm ${
            statusMessage.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <p className="font-semibold">{statusMessage.title}</p>
          <p className="mt-1">{statusMessage.body}</p>
          {state?.ok ? (
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
              role="dialog"
              aria-modal="true"
              aria-labelledby={`contact-owner-${vaultItemId}`}
            >
              <div className="w-full max-w-xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {intent ? getVaultIntentLabel(intent) : "Collector Network"}
                  </p>
                  <h3 id={`contact-owner-${vaultItemId}`} className="text-2xl font-semibold tracking-tight text-slate-950">
                    Message {ownerDisplayName}
                  </h3>
                  <p className="text-sm leading-6 text-slate-600">
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
                      name="message"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={6}
                      maxLength={2000}
                      className="w-full rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>

                  <p className="text-xs text-slate-500">Keep it about this card. Maximum 2000 characters.</p>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
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
