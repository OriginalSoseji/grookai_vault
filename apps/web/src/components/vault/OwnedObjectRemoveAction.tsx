"use client";

import { type FormEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import {
  archiveVaultItemInstanceAction,
  type ArchiveVaultItemInstanceActionResult,
} from "@/lib/vault/archiveVaultItemInstanceAction";

function RemoveSubmitButton({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
    >
      {pending ? "Removing..." : label}
    </button>
  );
}

export default function OwnedObjectRemoveAction({
  instanceId,
  label,
  redirectHref,
  buttonClassName,
  confirmMessage,
}: {
  instanceId: string;
  label: string;
  redirectHref?: string | null;
  buttonClassName?: string;
  confirmMessage?: string;
}) {
  const router = useRouter();
  const handledSubmissionKeyRef = useRef<number | null>(null);
  const [state, formAction] = useFormState<ArchiveVaultItemInstanceActionResult | null, FormData>(
    archiveVaultItemInstanceAction,
    null,
  );

  useEffect(() => {
    if (!state?.ok || handledSubmissionKeyRef.current === state.submissionKey) {
      return;
    }

    handledSubmissionKeyRef.current = state.submissionKey;

    if (redirectHref) {
      router.push(redirectHref);
      return;
    }

    router.refresh();
  }, [redirectHref, router, state]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (typeof window === "undefined") {
      return;
    }

    const shouldContinue = window.confirm(
      confirmMessage ?? "Remove this exact copy from your vault? History will be kept.",
    );

    if (!shouldContinue) {
      event.preventDefault();
    }
  }

  const resolvedButtonClassName =
    buttonClassName ??
    "inline-flex items-center justify-center rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="space-y-1 text-right">
      <form action={formAction} onSubmit={handleSubmit}>
        <input type="hidden" name="instance_id" value={instanceId} />
        <RemoveSubmitButton label={label} className={resolvedButtonClassName} />
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
