"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import VaultSubmitButton from "@/components/VaultSubmitButton";
import { sendTelemetryEvent } from "@/lib/telemetry/client";

export type AddToVaultActionResult =
  | {
      ok: true;
      status: "added" | "incremented" | "exists";
      submissionKey: number;
    }
  | {
      ok: false;
      status: "login-required" | "not-found" | "error";
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
};

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
    case "error":
      return {
        tone: "error" as const,
        title: "Vault add failed",
        body: result.message?.trim() || "Something went wrong while adding this card to your vault.",
      };
    default:
      return null;
  }
}

export default function AddToVaultCardAction({
  action,
  isAuthenticated,
  loginHref,
  currentPath,
  gvId,
}: AddToVaultCardActionProps) {
  const router = useRouter();
  const [state, formAction] = useFormState(action, null);
  const refreshedSubmissionKeyRef = useRef<number | null>(null);
  const [successPulse, setSuccessPulse] = useState<"added" | "incremented" | null>(null);
  const statusMessage = getStatusMessage(state);
  const toneClasses =
    statusMessage?.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-rose-200 bg-rose-50 text-rose-800";

  useEffect(() => {
    if (!state?.ok || (state.status !== "added" && state.status !== "incremented")) {
      setSuccessPulse(null);
      return;
    }

    if (refreshedSubmissionKeyRef.current === state.submissionKey) {
      return;
    }

    refreshedSubmissionKeyRef.current = state.submissionKey;
    setSuccessPulse(state.status);
    router.refresh();

    const timeoutId = window.setTimeout(() => {
      setSuccessPulse((current) => (current === state.status ? null : current));
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [router, state]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {isAuthenticated ? (
          <form
            action={formAction}
            onSubmit={() => {
              sendTelemetryEvent({
                eventName: "vault_add_click",
                path: currentPath,
                gvId,
              });
            }}
          >
            <VaultSubmitButton
              label="Add to Vault"
              successActive={successPulse !== null}
              successLabel={successPulse === "incremented" ? "Updated" : "Added"}
            />
          </form>
        ) : (
          <Link
            href={loginHref}
            className="inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Sign in to add
          </Link>
        )}
      </div>

      {statusMessage ? (
        <div className={`rounded-[12px] border px-4 py-3 ${toneClasses}`}>
          <p className="text-sm font-semibold">{statusMessage.title}</p>
          <p className="mt-1 text-sm">{statusMessage.body}</p>
          {(state?.status === "login-required" || !isAuthenticated) ? (
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href={loginHref} className="text-sm font-medium underline underline-offset-4">
                Sign in
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
