"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import type { CreateCardInteractionActionResult } from "@/lib/network/createCardInteractionAction";
import { replyToCardInteractionGroupAction } from "@/lib/network/replyToCardInteractionGroupAction";

type InteractionGroupReplyFormProps = {
  vaultItemId: string;
  cardPrintId: string;
  counterpartUserId: string;
  counterpartDisplayName: string;
  currentPath: string;
};

function getStatusMessage(state: CreateCardInteractionActionResult | null) {
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

function SubmitReplyButton({ isSubmitting }: { isSubmitting: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = pending || isSubmitting;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDisabled ? "Sending..." : "Send"}
    </button>
  );
}

export function InteractionGroupReplyForm({
  vaultItemId,
  cardPrintId,
  counterpartUserId,
  counterpartDisplayName,
  currentPath,
}: InteractionGroupReplyFormProps) {
  const router = useRouter();
  const [state, formAction] = useFormState(replyToCardInteractionGroupAction, null);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionLockRef = useRef(false);
  const statusMessage = getStatusMessage(state);

  useEffect(() => {
    if (!state) {
      return;
    }

    submissionLockRef.current = false;
    setIsSubmitting(false);

    if (state.ok) {
      setDraft("");
      router.refresh();
    }
  }, [router, state]);

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (submissionLockRef.current) {
      event.preventDefault();
      return;
    }

    submissionLockRef.current = true;
    setIsSubmitting(true);
  }

  return (
    <div className="space-y-3 rounded-[1.1rem] border border-slate-300 bg-slate-50 px-4 py-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">Reply</p>

      <form action={formAction} onSubmit={handleFormSubmit} className="space-y-3">
        <input type="hidden" name="vault_item_id" value={vaultItemId} />
        <input type="hidden" name="card_print_id" value={cardPrintId} />
        <input type="hidden" name="counterpart_user_id" value={counterpartUserId} />
        <input type="hidden" name="counterpart_display_name" value={counterpartDisplayName} />
        <input type="hidden" name="return_path" value={currentPath} />

        <label className="block space-y-2">
          <span className="sr-only">Reply message</span>
          <textarea
            name="message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            maxLength={2000}
            disabled={isSubmitting}
            placeholder={`Reply to ${counterpartDisplayName} about this card`}
            className="w-full rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </label>

        {statusMessage ? (
          <p
            className={`text-sm ${
              statusMessage.tone === "success" ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {statusMessage.body}
          </p>
        ) : null}

        <div className="flex justify-end">
          <SubmitReplyButton isSubmitting={isSubmitting} />
        </div>
      </form>
    </div>
  );
}

export default InteractionGroupReplyForm;
