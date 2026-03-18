"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import {
  removeOwnedObjectAction,
  type RemoveOwnedObjectActionResult,
} from "@/lib/vault/removeOwnedObjectAction";

export default function OwnedObjectRemoveAction({
  mode,
  instanceId,
  label,
}: {
  mode: "raw" | "slab";
  instanceId: string;
  label: string;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(removeOwnedObjectAction, null);

  useEffect(() => {
    if (!state?.ok) {
      return;
    }

    router.refresh();
  }, [router, state]);

  return (
    <div className="space-y-1 text-right">
      <form action={formAction}>
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="instance_id" value={instanceId} />
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          {label}
        </button>
      </form>
      {!state?.ok && state?.message ? (
        <p className="max-w-[16rem] text-xs text-rose-700">
          {state.errorCode ? `${state.errorCode}: ` : ""}
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
