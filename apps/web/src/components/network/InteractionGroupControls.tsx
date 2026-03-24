"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateCardInteractionGroupStateAction,
  type CardInteractionGroupStateAction,
} from "@/lib/network/updateCardInteractionGroupStateAction";
import type { UserCardInteractionGroupState } from "@/lib/network/getUserCardInteractions";

type InteractionGroupControlsProps = {
  cardPrintId: string;
  counterpartUserId: string;
  currentPath: string;
  hasUnread: boolean;
  conversationState: UserCardInteractionGroupState;
};

function ActionButton({
  action,
  label,
  pendingAction,
  onClick,
}: {
  action: CardInteractionGroupStateAction;
  label: string;
  pendingAction: CardInteractionGroupStateAction | null;
  onClick: (action: CardInteractionGroupStateAction) => void;
}) {
  const isPending = pendingAction === action;

  return (
    <button
      type="button"
      onClick={() => onClick(action)}
      disabled={Boolean(pendingAction)}
      className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? "Saving..." : label}
    </button>
  );
}

export function InteractionGroupControls({
  cardPrintId,
  counterpartUserId,
  currentPath,
  hasUnread,
  conversationState,
}: InteractionGroupControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<CardInteractionGroupStateAction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (conversationState !== "inbox") {
    return null;
  }

  function handleAction(action: CardInteractionGroupStateAction) {
    setErrorMessage(null);
    setPendingAction(action);

    startTransition(async () => {
      const result = await updateCardInteractionGroupStateAction({
        action,
        cardPrintId,
        counterpartUserId,
        returnPath: currentPath,
      });

      if (!result.ok) {
        setErrorMessage(result.message);
        setPendingAction(null);
        return;
      }

      router.refresh();
      setPendingAction(null);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {hasUnread ? (
          <ActionButton
            action="read"
            label="Mark read"
            pendingAction={isPending ? pendingAction : null}
            onClick={handleAction}
          />
        ) : null}
        <ActionButton
          action="closed"
          label="Close"
          pendingAction={isPending ? pendingAction : null}
          onClick={handleAction}
        />
        <ActionButton
          action="archived"
          label="Archive"
          pendingAction={isPending ? pendingAction : null}
          onClick={handleAction}
        />
      </div>
      {errorMessage ? <p className="text-xs text-rose-700">{errorMessage}</p> : null}
    </div>
  );
}

export default InteractionGroupControls;
