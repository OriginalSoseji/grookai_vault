"use client";

import { useActionState } from "react";
import {
  decideFounderOperationsWorkItem,
  type FounderOperationsDecisionState,
} from "@/app/founder/operations/actions";

type Props = {
  workItemId: string;
  title: string;
};

const initialState: FounderOperationsDecisionState | null = null;

export default function FounderOperationsDecisionControls({ workItemId, title }: Props) {
  const [state, action, pending] = useActionState(decideFounderOperationsWorkItem, initialState);

  return (
    <form action={action} className="mt-5 border-t border-white/10 pt-4">
      <input type="hidden" name="work_item_id" value={workItemId} />
      <p className="sr-only">Decide {title}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending}
          className="gv-primary-button min-w-28 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Recording…" : "Approve plan"}
        </button>
        <button
          type="submit"
          name="decision"
          value="request_repair"
          disabled={pending}
          className="gv-secondary-button active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
        >
          Request repair
        </button>
      </div>
      {state?.workItemId === workItemId ? (
        <p
          role="status"
          className={`mt-3 text-sm ${state.ok ? "text-lime-300" : "text-red-300"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
