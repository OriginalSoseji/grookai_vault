"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import PrintingSelector from "@/components/cards/PrintingSelector";
import VaultSubmitButton from "@/components/VaultSubmitButton";
import { useClientViewer } from "@/lib/auth/useClientViewer";
import { findPrintingByReference } from "@/lib/cards/printingSelection";
import { sendTelemetryEvent } from "@/lib/telemetry/client";
import type { CardPrinting } from "@/types/cards";

export type AddToVaultActionResult =
  | {
      ok: true;
      status: "added" | "incremented" | "exists";
      gvvi_id?: string | null;
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
  printings?: CardPrinting[];
  initialPrintingId?: string | null;
  selectedPrintingId?: string | null;
  onSelectedPrintingChange?: (printing: CardPrinting) => void;
};

function getDefaultPrinting(printings: CardPrinting[], initialPrintingId?: string | null) {
  if (initialPrintingId) {
    const initialPrinting = findPrintingByReference(printings, initialPrintingId);
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

  const publicPrintingReference =
    args.printing.printing_gv_id?.trim() ||
    args.finishKey?.trim() ||
    args.printing.finish_key?.trim() ||
    args.finishName?.trim() ||
    args.printing.finish_name?.trim();
  if (publicPrintingReference) {
    params.set("printing", publicPrintingReference);
  }

  const finishName = args.finishName?.trim() || args.printing.finish_name?.trim();
  if (finishName) {
    params.set("finish", finishName);
  }

  params.set("reason", args.reason?.trim() || "child_printing_uses_parent_image");
  params.set("returnTo", args.currentPath);

  return `/submit?${params.toString()}`;
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
}: AddToVaultCardActionProps) {
  const router = useRouter();
  const viewer = useClientViewer(null);
  const [state, formAction] = useFormState(action, null);
  const refreshedSubmissionKeyRef = useRef<number | null>(null);
  const [successPulse, setSuccessPulse] = useState<"added" | "incremented" | null>(null);
  const [selectedPrinting, setSelectedPrinting] = useState<CardPrinting | null>(() =>
    getDefaultPrinting(printings, initialPrintingId),
  );
  const externallySelectedPrinting = selectedPrintingId ? findPrintingByReference(printings, selectedPrintingId) : null;
  const effectiveSelectedPrinting = externallySelectedPrinting ?? selectedPrinting;
  const selectedChildPrintingId = effectiveSelectedPrinting?.is_display_fallback ? null : effectiveSelectedPrinting?.id ?? null;
  const onlyFallbackPrinting = printings.length === 1 && printings[0]?.is_display_fallback === true;
  const statusMessage = getStatusMessage(state);
  const toneClasses =
    statusMessage?.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-rose-200 bg-rose-50 text-rose-800";
  const effectiveIsAuthenticated = isAuthenticated || viewer.isAuthenticated;

  function handleSelectedPrintingChange(printing: CardPrinting) {
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
      {printings.length > 0 ? (
        <PrintingSelector
          printings={printings}
          selectedPrintingId={effectiveSelectedPrinting?.id}
          onSelectedPrintingChange={handleSelectedPrintingChange}
          title="Variant / Finish"
          description="Choose the exact version before adding it to your vault."
          compact
          showImageFallbackNotice
          getImageSuggestionHref={getImageSuggestionHref}
          imageSuggestionLinks={
            onlyFallbackPrinting
              ? [
                  {
                    label: "Suggest Reverse Holo image",
                    href: getSuggestionHrefForFinish("reverse", "Reverse Holo") ?? "#",
                  },
                ].filter((link) => link.href !== "#")
              : []
          }
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {effectiveIsAuthenticated ? (
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
            {selectedChildPrintingId ? <input type="hidden" name="card_printing_id" value={selectedChildPrintingId} /> : null}
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
          {(state?.status === "login-required" || !effectiveIsAuthenticated) ? (
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
