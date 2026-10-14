"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { PSA_GRADE_OPTIONS } from "@/lib/slabs/gradeOptions";
import { normalizePsaGradeValue } from "@/lib/slabs/normalizePsaGrade";
import type { SlabVerificationResult } from "@/lib/slabs/psaVerificationAdapter";

export type AddSlabActionResult =
  | {
      ok: true;
      status: "created";
      message: string;
      submissionKey: number;
      grade: string;
      certNumber: string;
      gvviId: string | null;
    }
  | {
      ok: false;
      status: "login-required" | "validation-error" | "verification-failed" | "error";
      errorCode?: string;
      message: string;
      submissionKey: number;
    };

export type AddSlabCardServerAction = (
  previousState: AddSlabActionResult | null,
  formData: FormData,
) => Promise<AddSlabActionResult>;

function getVerificationMessage(result: SlabVerificationResult | null, gradeMismatch: boolean) {
  if (!result) return null;

  if (result.verified && gradeMismatch) {
    return {
      tone: "error" as const,
      title: "Grade does not match",
      body: `PSA lists this certification as grade ${result.grade}. Select that grade and verify again.`,
    };
  }

  if (result.verified) {
    return {
      tone: "success" as const,
      title: "PSA verified",
      body: "The certification and selected grade match.",
    };
  }

  return {
    tone: "error" as const,
    title: "Certification not verified",
    body: result.error_code?.trim() || "PSA could not verify this certification number.",
  };
}

function SlabSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition active:scale-[0.98] hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-slate-700 dark:disabled:text-slate-400 sm:w-auto"
    >
      {pending ? "Adding graded copy…" : "Add graded copy to Vault"}
    </button>
  );
}

export default function AddSlabCardAction({
  action,
  cardName,
}: {
  action: AddSlabCardServerAction;
  cardName: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, null);
  const refreshedSubmissionKeyRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState("10");
  const [certNumber, setCertNumber] = useState("");
  const [certNumberConfirm, setCertNumberConfirm] = useState("");
  const [verificationResult, setVerificationResult] = useState<SlabVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const normalizedVerifiedGrade = normalizePsaGradeValue(verificationResult?.grade);
  const gradeMismatch = Boolean(
    verificationResult?.verified && normalizedVerifiedGrade && normalizedVerifiedGrade !== selectedGrade,
  );
  const verificationMessage = useMemo(
    () => getVerificationMessage(verificationResult, gradeMismatch),
    [gradeMismatch, verificationResult],
  );
  const certificationVerified = Boolean(
    verificationResult?.verified && verificationResult.grade && normalizedVerifiedGrade && !gradeMismatch,
  );

  useEffect(() => {
    if (!state) return;

    if (!state.ok) {
      setIsOpen(true);
      return;
    }

    if (refreshedSubmissionKeyRef.current === state.submissionKey) return;

    refreshedSubmissionKeyRef.current = state.submissionKey;
    router.refresh();
    setIsOpen(false);
    setSelectedGrade("10");
    setCertNumber("");
    setCertNumberConfirm("");
    setVerificationResult(null);
    setOwnershipConfirmed(false);
    setLocalError(null);
  }, [router, state]);

  function resetVerificationState() {
    setVerificationResult(null);
    setOwnershipConfirmed(false);
    setLocalError(null);
  }

  async function verifyCert() {
    const trimmedCert = certNumber.trim();
    const trimmedConfirm = certNumberConfirm.trim();

    if (!trimmedCert || !trimmedConfirm) {
      setLocalError("Enter the certification number twice before verifying.");
      setVerificationResult(null);
      return;
    }

    if (trimmedCert !== trimmedConfirm) {
      setLocalError("Certification numbers must match exactly.");
      setVerificationResult(null);
      return;
    }

    setIsVerifying(true);
    setLocalError(null);

    try {
      const response = await fetch("/api/slabs/verify/psa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cert_number: trimmedCert }),
      });

      if (!response.ok) {
        setVerificationResult({
          grader: "PSA",
          cert_number: trimmedCert,
          verified: false,
          parser_status: "failed",
          error_code: `HTTP_${response.status}`,
        });
        return;
      }

      const result = (await response.json()) as SlabVerificationResult;
      setVerificationResult(result);
      if (!result.verified) setOwnershipConfirmed(false);
    } catch {
      setVerificationResult({
        grader: "PSA",
        cert_number: trimmedCert,
        verified: false,
        parser_status: "failed",
        error_code: "FETCH_EXCEPTION",
      });
    } finally {
      setIsVerifying(false);
    }
  }

  const saveDisabled = isVerifying || !certificationVerified || !ownershipConfirmed;

  return (
    <div className="space-y-4" data-add-slab-flow>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="add-slab-panel"
        onClick={() => {
          setIsOpen((current) => !current);
          setLocalError(null);
        }}
        className="group flex min-h-14 w-full items-center justify-between gap-4 rounded-[18px] px-1 py-2 text-left transition active:scale-[0.99]"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900 dark:text-white">Add graded copy</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
            Verify a PSA certification before adding it to your Vault.
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition group-hover:border-slate-300 group-hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:group-hover:border-slate-600 dark:group-hover:bg-white/[0.06]">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </span>
      </button>

      {state ? (
        <div
          className={`rounded-[12px] border px-4 py-3 ${
            state.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/45 dark:text-emerald-100"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/45 dark:text-rose-100"
          }`}
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold">{state.ok ? "Graded copy added" : "Could not add graded copy"}</p>
          <p className="mt-1 text-sm">{state.message}</p>
          {state.ok && state.gvviId ? (
            <Link
              href={`/vault/gvvi/${encodeURIComponent(state.gvviId)}`}
              className="mt-3 inline-flex min-h-11 items-center rounded-full border border-current px-4 py-2 text-sm font-medium transition active:scale-[0.98]"
            >
              View exact copy
            </Link>
          ) : null}
        </div>
      ) : null}

      {isOpen ? (
        <form
          id="add-slab-panel"
          action={formAction}
          className="space-y-5 border-t border-slate-200/80 pt-5 dark:border-slate-700/80"
        >
          <input type="hidden" name="grader" value="PSA" />

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              1. Verify certification
            </p>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              PSA is supported first. Enter the grade and certification printed on the label.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
            <label className="block space-y-2">
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">PSA grade</span>
              <select
                name="grade"
                value={selectedGrade}
                onChange={(event) => {
                  setSelectedGrade(event.target.value);
                  resetVerificationState();
                }}
                className="min-h-11 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:border-slate-400 dark:focus:ring-slate-700"
              >
                {PSA_GRADE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">Certification number</span>
              <input
                name="cert_number"
                type="text"
                inputMode="numeric"
                value={certNumber}
                onChange={(event) => {
                  setCertNumber(event.target.value);
                  resetVerificationState();
                }}
                className="min-h-11 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:border-slate-400 dark:focus:ring-slate-700"
                placeholder="Enter PSA cert number"
                autoComplete="off"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
              Confirm certification number
            </span>
            <input
              name="cert_number_confirm"
              type="text"
              inputMode="numeric"
              value={certNumberConfirm}
              onChange={(event) => {
                setCertNumberConfirm(event.target.value);
                resetVerificationState();
              }}
              className="min-h-11 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-950 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:border-slate-400 dark:focus:ring-slate-700"
              placeholder="Re-enter PSA cert number"
              autoComplete="off"
            />
          </label>

          <div className="space-y-3">
            <button
              type="button"
              onClick={verifyCert}
              disabled={isVerifying}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition active:scale-[0.98] hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:hover:border-slate-500 dark:hover:bg-slate-800 sm:w-auto"
            >
              {isVerifying ? "Verifying with PSA…" : "Verify PSA certification"}
            </button>
            {localError ? (
              <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
                {localError}
              </p>
            ) : null}
          </div>

          {verificationResult && verificationMessage ? (
            <div
              className={`rounded-[14px] border px-4 py-4 ${
                verificationMessage.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/70 dark:bg-emerald-950/45"
                  : "border-rose-200 bg-rose-50 dark:border-rose-900/70 dark:bg-rose-950/45"
              }`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    verificationMessage.tone === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                  }`}
                  aria-hidden="true"
                >
                  {verificationMessage.tone === "success" ? "✓" : "!"}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      verificationMessage.tone === "success"
                        ? "text-emerald-900 dark:text-emerald-100"
                        : "text-rose-900 dark:text-rose-100"
                    }`}
                  >
                    {verificationMessage.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{verificationMessage.body}</p>
                  {verificationResult.verified ? (
                    <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                      {verificationResult.title || cardName} · PSA {verificationResult.grade} · Cert {verificationResult.cert_number}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {certificationVerified ? (
            <div className="space-y-4 border-t border-slate-200/80 pt-5 dark:border-slate-700/80">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  2. Confirm and add
                </p>
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  The graded copy will be saved separately from raw copies of this card.
                </p>
              </div>

              <label className="flex min-h-11 items-start gap-3 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-white/[0.04]">
                <input
                  type="checkbox"
                  name="ownership_confirmed"
                  value="true"
                  checked={ownershipConfirmed}
                  onChange={(event) => setOwnershipConfirmed(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-slate-950 focus:ring-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:ring-slate-600"
                />
                <span className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                  I own this slab and confirm the certification number is correct.
                </span>
              </label>

              <SlabSubmitButton disabled={saveDisabled} />
            </div>
          ) : null}

        </form>
      ) : null}
    </div>
  );
}
