"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { createPortal } from "react-dom";
import PublicCardImage from "@/components/PublicCardImage";
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
  if (!result) {
    return null;
  }

  if (result.verified && gradeMismatch) {
    return {
      tone: "error" as const,
      title: "Grade mismatch",
      body: `PSA verified this cert as grade ${result.grade}, so save is blocked until the selected grade matches.`,
    };
  }

  if (result.verified) {
    return {
      tone: "success" as const,
      title: "PSA verified",
      body: "Verification succeeded. Confirm ownership below to add this slab to your vault.",
    };
  }

  return {
    tone: "error" as const,
    title: "Verification failed",
    body: result.error_code?.trim() || "This certification number could not be verified.",
  };
}

export default function AddSlabCardAction({
  action,
  cardName,
}: {
  action: AddSlabCardServerAction;
  cardName: string;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState(action, null);
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
  const canRenderPortal = typeof document !== "undefined";

  useEffect(() => {
    if (!state?.ok) {
      return;
    }

    router.refresh();
    setIsOpen(false);
    setSelectedGrade("10");
    setCertNumber("");
    setCertNumberConfirm("");
    setVerificationResult(null);
    setOwnershipConfirmed(false);
    setLocalError(null);
  }, [router, state]);

  function openModal() {
    setIsOpen(true);
  }

  function closeModal() {
    if (isVerifying) {
      return;
    }

    setIsOpen(false);
    setLocalError(null);
  }

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
      setLocalError("Certification number confirmation must match exactly.");
      setVerificationResult(null);
      return;
    }

    setIsVerifying(true);
    setLocalError(null);

    try {
      const response = await fetch("/api/slabs/verify/psa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cert_number: trimmedCert,
        }),
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
      if (!result.verified) {
        setOwnershipConfirmed(false);
      }
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

  const saveDisabled =
    isVerifying ||
    !verificationResult?.verified ||
    !verificationResult.grade ||
    !normalizedVerifiedGrade ||
    gradeMismatch ||
    !ownershipConfirmed;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={openModal}
        className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
      >
        Add Slab
      </button>

      {state ? (
        <div
          className={`rounded-[12px] border px-4 py-3 ${
            state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <p className="text-sm font-semibold">{state.ok ? "Slab added" : "Slab add failed"}</p>
          <p className="mt-1 text-sm">{state.message}</p>
        </div>
      ) : null}

      {isOpen && canRenderPortal
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/85 p-4 sm:items-center sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-slab-title"
              onClick={closeModal}
            >
              <div
                className="w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl max-sm:max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] sm:p-7"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="space-y-2">
                  <h3 id="add-slab-title" className="text-2xl font-semibold tracking-tight text-slate-950">
                    Add Slab
                  </h3>
                  <p className="text-sm leading-7 text-slate-600">
                    Verify the PSA certification number, then confirm ownership to add this slab-backed card to your vault.
                  </p>
                </div>

                <form action={formAction} className="mt-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Grader</span>
                      <select
                        name="grader"
                        value="PSA"
                        disabled
                        className="w-full rounded-[1rem] border border-slate-200 bg-slate-100 px-3 py-3 text-sm text-slate-700"
                      >
                        <option value="PSA">PSA</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Grade</span>
                      <select
                        name="grade"
                        value={selectedGrade}
                        onChange={(event) => {
                          setSelectedGrade(event.target.value);
                          resetVerificationState();
                        }}
                        className="w-full rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      >
                        {PSA_GRADE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cert number</span>
                      <input
                        name="cert_number"
                        type="text"
                        value={certNumber}
                        onChange={(event) => {
                          setCertNumber(event.target.value);
                          resetVerificationState();
                        }}
                        className="w-full rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        autoComplete="off"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Confirm cert number</span>
                      <input
                        name="cert_number_confirm"
                        type="text"
                        value={certNumberConfirm}
                        onChange={(event) => {
                          setCertNumberConfirm(event.target.value);
                          resetVerificationState();
                        }}
                        className="w-full rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                        autoComplete="off"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={verifyCert}
                      disabled={isVerifying}
                      className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {isVerifying ? "Verifying..." : "Verify"}
                    </button>
                    {localError ? <p className="text-sm text-rose-700">{localError}</p> : null}
                  </div>

                  {verificationResult ? (
                    <div
                      className={`rounded-[1.5rem] border px-4 py-4 ${
                        verificationMessage?.tone === "success"
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-rose-200 bg-rose-50"
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        {verificationResult.image_url ? (
                          <div className="w-28 shrink-0">
                            <PublicCardImage
                              src={verificationResult.image_url}
                              alt={verificationResult.title ?? `${cardName} PSA cert`}
                              imageClassName="aspect-[3/4] w-full rounded-[1rem] border border-slate-200 bg-white object-contain p-2"
                              fallbackClassName="flex aspect-[3/4] w-full items-center justify-center rounded-[1rem] border border-slate-200 bg-slate-100 px-2 text-center text-xs text-slate-500"
                            />
                          </div>
                        ) : null}
                        <div className="min-w-0 space-y-2">
                          <p
                            className={`text-sm font-semibold ${
                              verificationMessage?.tone === "success" ? "text-emerald-900" : "text-rose-900"
                            }`}
                          >
                            {verificationMessage?.title}
                          </p>
                          <p className="text-sm text-slate-700">{verificationMessage?.body}</p>
                          <dl className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Grader</dt>
                              <dd className="mt-1">{verificationResult.grader}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Verified grade
                              </dt>
                              <dd className="mt-1">
                                {verificationResult.grade ?? "—"}
                                {verificationResult.grade && normalizedVerifiedGrade
                                  ? ` (${normalizedVerifiedGrade})`
                                  : ""}
                              </dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Title</dt>
                              <dd className="mt-1">{verificationResult.title ?? "Unavailable"}</dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="ownership_confirmed"
                        value="true"
                        checked={ownershipConfirmed}
                        disabled={!verificationResult?.verified || gradeMismatch}
                        onChange={(event) => setOwnershipConfirmed(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
                      />
                      <span className="text-sm leading-6 text-slate-700">
                        This slab will be attached to this exact card in your vault. I confirm the certification number is
                        correct.
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isVerifying}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saveDisabled}
                      className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Add Slab to Vault
                    </button>
                  </div>

                  {!state?.ok && state?.message ? (
                    <p className="text-sm text-rose-700">
                      {state.errorCode ? `${state.errorCode}: ` : ""}
                      {state.message}
                    </p>
                  ) : null}
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
