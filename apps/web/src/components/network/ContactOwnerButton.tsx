"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import {
  createCardInteractionAction,
  type CreateCardInteractionActionResult,
} from "@/lib/network/createCardInteractionAction";
import {
  getVaultIntentActionLabel,
  getVaultIntentLabel,
  type DiscoverableVaultIntent,
} from "@/lib/network/intent";

type ContactOwnerButtonProps = {
  vaultItemId: string;
  cardPrintId: string;
  ownerDisplayName: string;
  cardName: string;
  intent: DiscoverableVaultIntent;
  isAuthenticated: boolean;
  loginHref: string;
  currentPath: string;
  buttonClassName?: string;
};

function getDefaultMessage(ownerDisplayName: string, cardName: string, intent: DiscoverableVaultIntent) {
  const collectorName = ownerDisplayName.trim() || "there";

  switch (intent) {
    case "trade":
      return `Hi ${collectorName}, I'm interested in trading for your ${cardName}. Is it still available?`;
    case "sell":
      return `Hi ${collectorName}, I'm interested in buying your ${cardName}. Is it still available?`;
    case "showcase":
      return `Hi ${collectorName}, I saw your ${cardName} in the collector network and wanted to ask about it.`;
  }
}

function getStatusMessage(state: CreateCardInteractionActionResult | null) {
  if (!state) {
    return null;
  }

  if (state.ok) {
    return {
      tone: "success" as const,
      title: "Interaction created",
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
            : "Interaction failed",
    body: state.message,
  };
}

export function ContactOwnerButton({
  vaultItemId,
  cardPrintId,
  ownerDisplayName,
  cardName,
  intent,
  isAuthenticated,
  loginHref,
  currentPath,
  buttonClassName,
}: ContactOwnerButtonProps) {
  const router = useRouter();
  const [state, formAction] = useFormState(createCardInteractionAction, null);
  const [isOpen, setIsOpen] = useState(false);
  const defaultMessage = useMemo(
    () => getDefaultMessage(ownerDisplayName, cardName, intent),
    [ownerDisplayName, cardName, intent],
  );
  const [draft, setDraft] = useState(defaultMessage);
  const statusMessage = getStatusMessage(state);
  const buttonLabel = getVaultIntentActionLabel(intent);

  useEffect(() => {
    setDraft(defaultMessage);
  }, [defaultMessage]);

  useEffect(() => {
    if (!state?.ok) {
      return;
    }

    router.refresh();
    setIsOpen(false);
  }, [router, state]);

  if (!isAuthenticated) {
    return (
      <Link
        href={loginHref}
        className={
          buttonClassName ??
          "inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
        }
      >
        Sign in to contact
      </Link>
    );
  }

  return (
    <div className="space-y-3">
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
                View interactions
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`contact-owner-${vaultItemId}`}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {getVaultIntentLabel(intent)}
              </p>
              <h3 id={`contact-owner-${vaultItemId}`} className="text-2xl font-semibold tracking-tight text-slate-950">
                Contact {ownerDisplayName}
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                Start a card-anchored interaction for {cardName}. This message will stay attached to this specific card.
              </p>
            </div>

            <form action={formAction} className="mt-5 space-y-4">
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

              <p className="text-xs text-slate-500">Keep it specific to this card. Maximum 2000 characters.</p>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Send interaction
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ContactOwnerButton;
