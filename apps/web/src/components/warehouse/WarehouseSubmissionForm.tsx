"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import {
  WAREHOUSE_SUBMISSION_IMAGE_ACCEPT,
  WAREHOUSE_SUBMISSION_IMAGE_MAX_BYTES,
  type WarehouseEvidenceImageType,
  type WarehouseSubmissionIntent,
  validateWarehouseSubmissionInput,
} from "@/lib/warehouse/warehouseSubmission";
import { submitWarehouseIntake } from "@/lib/warehouse/submitWarehouseIntake";
import {
  removeWarehouseEvidenceImages,
  uploadWarehouseEvidenceImage,
} from "@/lib/warehouse/uploadWarehouseEvidenceImage";

type WarehouseSubmissionFormProps = {
  userId: string;
};

type SubmissionStatus =
  | {
      tone: "error" | "success" | "pending";
      body: string;
    }
  | null;

type TouchedFields = {
  submissionIntent?: boolean;
  notes?: boolean;
  tcgplayerId?: boolean;
  frontImage?: boolean;
  backImage?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function useObjectPreview(file: File | null) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.toLowerCase().startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return previewUrl;
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-rose-700">{message}</p>;
}

function EvidencePicker({
  imageType,
  description,
  file,
  previewUrl,
  disabled,
  error,
  inputRef,
  onSelect,
  onRemove,
}: {
  imageType: WarehouseEvidenceImageType;
  description: string;
  file: File | null;
  previewUrl: string | null;
  disabled: boolean;
  error?: string;
  inputRef: MutableRefObject<HTMLInputElement | null>;
  onSelect: (file: File | null) => void;
  onRemove: () => void;
}) {
  const label = imageType === "front" ? "Front image" : "Back image";

  return (
    <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-950">{label}</p>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <div className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white">
        {previewUrl ? (
          <div className="bg-[linear-gradient(135deg,rgba(226,232,240,0.55),rgba(248,250,252,0.95))] p-3">
            <img
              src={previewUrl}
              alt={`${label} preview`}
              className="mx-auto aspect-[3/4] max-h-72 w-auto rounded-[0.9rem] object-contain"
            />
          </div>
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center px-5 text-center text-sm text-slate-500">
            {imageType === "front"
              ? "Add the card front to submit this report."
              : "Optional back image for extra review context."}
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={WAREHOUSE_SUBMISSION_IMAGE_ACCEPT}
        capture="environment"
        className="hidden"
        onChange={(event) => {
          onSelect(event.target.files?.[0] ?? null);
        }}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {file ? "Replace image" : "Choose image"}
          </button>
          {file ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onRemove}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remove
            </button>
          ) : null}
        </div>

        {file ? (
          <p className="break-all text-xs text-slate-500">
            {file.name} - {(file.size / (1024 * 1024)).toFixed(2)} MB
          </p>
        ) : null}

        <FieldError message={error} />
      </div>
    </div>
  );
}

export function WarehouseSubmissionForm({ userId }: WarehouseSubmissionFormProps) {
  const frontInputRef = useRef<HTMLInputElement | null>(null);
  const backInputRef = useRef<HTMLInputElement | null>(null);
  const [submissionIntent, setSubmissionIntent] = useState<WarehouseSubmissionIntent | "">("");
  const [notes, setNotes] = useState("");
  const [tcgplayerId, setTcgplayerId] = useState("");
  const [frontImageFile, setFrontImageFile] = useState<File | null>(null);
  const [backImageFile, setBackImageFile] = useState<File | null>(null);
  const [touched, setTouched] = useState<TouchedFields>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<SubmissionStatus>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);

  const frontPreviewUrl = useObjectPreview(frontImageFile);
  const backPreviewUrl = useObjectPreview(backImageFile);

  const validationErrors = useMemo(
    () =>
      validateWarehouseSubmissionInput({
        submissionIntent: submissionIntent || null,
        notes,
        tcgplayerId,
        frontImageFile,
        backImageFile,
      }),
    [backImageFile, frontImageFile, notes, submissionIntent, tcgplayerId],
  );

  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const shouldShowError = (field: keyof typeof validationErrors) => submitAttempted || Boolean(touched[field]);

  function clearStatusForEdit() {
    setStatus(null);
    setCandidateId(null);
  }

  function resetForm() {
    setSubmissionIntent("");
    setNotes("");
    setTcgplayerId("");
    setFrontImageFile(null);
    setBackImageFile(null);
    setTouched({});
    setSubmitAttempted(false);
    if (frontInputRef.current) {
      frontInputRef.current.value = "";
    }
    if (backInputRef.current) {
      backInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    clearStatusForEdit();

    if (hasValidationErrors || submissionIntent === "") {
      setStatus({
        tone: "error",
        body: "Fix the highlighted fields before submitting.",
      });
      return;
    }

    const normalizedNotes = notes.trim();
    const normalizedTcgplayerId = tcgplayerId.trim() || null;
    const frontImage = frontImageFile;
    const backImage = backImageFile;

    if (!frontImage) {
      setStatus({
        tone: "error",
        body: "A front image is required before submission.",
      });
      return;
    }

    const submissionId =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const uploadedPaths: string[] = [];
    setIsSubmitting(true);

    try {
      setStatus({
        tone: "pending",
        body: "Uploading evidence...",
      });

      const uploadedFront = await uploadWarehouseEvidenceImage({
        userId,
        submissionId,
        imageType: "front",
        file: frontImage,
      });
      uploadedPaths.push(uploadedFront.storagePath);

      let uploadedBack: { storagePath: string } | null = null;
      if (backImage) {
        uploadedBack = await uploadWarehouseEvidenceImage({
          userId,
          submissionId,
          imageType: "back",
          file: backImage,
        });
        uploadedPaths.push(uploadedBack.storagePath);
      }

      setStatus({
        tone: "pending",
        body: "Submitting to warehouse review...",
      });

      // Submission boundary:
      // 1. Browser uploads user-owned evidence paths to storage.
      // 2. The edge function validates the request.
      // 3. The RPC writes warehouse rows atomically.
      const result = await submitWarehouseIntake({
        notes: normalizedNotes,
        tcgplayer_id: normalizedTcgplayerId,
        submission_intent: submissionIntent,
        intake_channel: "UPLOAD",
        evidence: {
          images: [
            { type: "front", storage_path: uploadedFront.storagePath },
            ...(uploadedBack ? [{ type: "back" as const, storage_path: uploadedBack.storagePath }] : []),
          ],
        },
      });

      setCandidateId(result.candidateId);
      setStatus({
        tone: "success",
        body: "Submission received. It is now in warehouse review.",
      });
      resetForm();
    } catch (error) {
      await removeWarehouseEvidenceImages(uploadedPaths);
      setStatus({
        tone: "error",
        body:
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : "Submission failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label
          className={cx(
            "block cursor-pointer rounded-[1.5rem] border bg-white p-4 transition",
            submissionIntent === "MISSING_CARD"
              ? "border-slate-900 ring-2 ring-slate-900/10"
              : "border-slate-200 hover:border-slate-300",
          )}
        >
          <input
            type="radio"
            name="submission_intent"
            value="MISSING_CARD"
            checked={submissionIntent === "MISSING_CARD"}
            onChange={() => {
              setSubmissionIntent("MISSING_CARD");
              setTouched((current) => ({ ...current, submissionIntent: true }));
              clearStatusForEdit();
            }}
            className="sr-only"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Missing Card</p>
            <p className="text-lg font-semibold tracking-tight text-slate-950">
              This card does not exist in Grookai yet.
            </p>
            <p className="text-sm leading-6 text-slate-600">
              Use this when the card itself is missing from Grookai and should enter warehouse review.
            </p>
          </div>
        </label>

        <label
          className={cx(
            "block cursor-pointer rounded-[1.5rem] border bg-white p-4 transition",
            submissionIntent === "MISSING_IMAGE"
              ? "border-slate-900 ring-2 ring-slate-900/10"
              : "border-slate-200 hover:border-slate-300",
          )}
        >
          <input
            type="radio"
            name="submission_intent"
            value="MISSING_IMAGE"
            checked={submissionIntent === "MISSING_IMAGE"}
            onChange={() => {
              setSubmissionIntent("MISSING_IMAGE");
              setTouched((current) => ({ ...current, submissionIntent: true }));
              clearStatusForEdit();
            }}
            className="sr-only"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Missing Image</p>
            <p className="text-lg font-semibold tracking-tight text-slate-950">
              This card exists, but the image is missing or incorrect.
            </p>
            <p className="text-sm leading-6 text-slate-600">
              Missing image submissions currently require a TCGPlayer ID so the backend has reference context.
            </p>
          </div>
        </label>
      </div>

      <FieldError
        message={shouldShowError("submissionIntent") ? validationErrors.submissionIntent : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">Notes</span>
            <textarea
              rows={7}
              value={notes}
              disabled={isSubmitting}
              onBlur={() => setTouched((current) => ({ ...current, notes: true }))}
              onChange={(event) => {
                setNotes(event.target.value);
                setTouched((current) => ({ ...current, notes: true }));
                clearStatusForEdit();
              }}
              placeholder="Tell Grookai what is missing, what you noticed, and anything a reviewer should look at."
              className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <FieldError message={shouldShowError("notes") ? validationErrors.notes : undefined} />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-950">
              TCGPlayer ID (optional unless reporting a missing image)
            </span>
            <input
              type="text"
              value={tcgplayerId}
              disabled={isSubmitting}
              onBlur={() => setTouched((current) => ({ ...current, tcgplayerId: true }))}
              onChange={(event) => {
                setTcgplayerId(event.target.value);
                setTouched((current) => ({ ...current, tcgplayerId: true }));
                clearStatusForEdit();
              }}
              placeholder={
                submissionIntent === "MISSING_IMAGE"
                  ? "Required for missing image submissions"
                  : "Optional reference id"
              }
              className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            />
            {submissionIntent === "MISSING_IMAGE" ? (
              <p className="text-sm text-slate-600">
                Missing image submissions currently require a TCGPlayer ID.
              </p>
            ) : null}
            <FieldError
              message={shouldShowError("tcgplayerId") ? validationErrors.tcgplayerId : undefined}
            />
          </label>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-sm font-medium text-slate-950">Before you submit</p>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
              <li>Use the clearest front image you have.</li>
              <li>Back images are optional but helpful for review.</li>
              <li>
                Warehouse owns uncertainty from this point forward. The browser never writes warehouse rows
                directly.
              </li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <EvidencePicker
            imageType="front"
            description="Required. Start with the front so warehouse review has a consistent first evidence lane."
            file={frontImageFile}
            previewUrl={frontPreviewUrl}
            disabled={isSubmitting}
            error={shouldShowError("frontImage") ? validationErrors.frontImage : undefined}
            inputRef={frontInputRef}
            onSelect={(file) => {
              setFrontImageFile(file);
              setTouched((current) => ({ ...current, frontImage: true }));
              clearStatusForEdit();
            }}
            onRemove={() => {
              setFrontImageFile(null);
              setTouched((current) => ({ ...current, frontImage: true }));
              clearStatusForEdit();
              if (frontInputRef.current) {
                frontInputRef.current.value = "";
              }
            }}
          />

          <EvidencePicker
            imageType="back"
            description="Optional. Add the back if it helps explain the report."
            file={backImageFile}
            previewUrl={backPreviewUrl}
            disabled={isSubmitting}
            error={shouldShowError("backImage") ? validationErrors.backImage : undefined}
            inputRef={backInputRef}
            onSelect={(file) => {
              setBackImageFile(file);
              setTouched((current) => ({ ...current, backImage: true }));
              clearStatusForEdit();
            }}
            onRemove={() => {
              setBackImageFile(null);
              setTouched((current) => ({ ...current, backImage: true }));
              clearStatusForEdit();
              if (backInputRef.current) {
                backInputRef.current.value = "";
              }
            }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {status ? (
          <div
            aria-live="polite"
            className={cx(
              "rounded-[1.5rem] border px-4 py-3 text-sm",
              status.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : status.tone === "pending"
                  ? "border-sky-200 bg-sky-50 text-sky-800"
                  : "border-rose-200 bg-rose-50 text-rose-700",
            )}
          >
            <p>{status.body}</p>
            {candidateId ? (
              <p className="mt-2 break-all font-medium text-emerald-900">Candidate ID: {candidateId}</p>
            ) : null}
          </div>
        ) : null}

        {candidateId ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
            <p className="font-medium text-slate-950">Submission entered review.</p>
            <p className="mt-1">Warehouse now owns the uncertainty from this submission.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/account"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Back to account
              </Link>
              <button
                type="button"
                onClick={() => {
                  setCandidateId(null);
                  setStatus(null);
                }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Submit another
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Front image required. Max {Math.floor(WAREHOUSE_SUBMISSION_IMAGE_MAX_BYTES / (1024 * 1024))}
            {" "}
            MB per image.
          </p>
          <button
            type="submit"
            disabled={isSubmitting || hasValidationErrors}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Submitting..." : "Submit to warehouse"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default WarehouseSubmissionForm;
