"use client";

import { useEffect } from "react";

type ConfirmRemovalModalProps = {
  isOpen: boolean;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

type PublicNoteModalProps = {
  isOpen: boolean;
  isPending: boolean;
  noteValue: string;
  error?: string | null;
  onNoteChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

function useDialogLock(isOpen: boolean, isPending: boolean, onCancel: () => void) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, isPending, onCancel]);
}

export function ConfirmRemovalModal({
  isOpen,
  isPending,
  onCancel,
  onConfirm,
}: ConfirmRemovalModalProps) {
  useDialogLock(isOpen, isPending, onCancel);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-remove-title"
      aria-describedby="vault-remove-body"
      onClick={() => {
        if (!isPending) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <h3 id="vault-remove-title" className="text-2xl font-semibold tracking-tight text-slate-950">
            Remove card?
          </h3>
          <p id="vault-remove-body" className="text-sm leading-7 text-slate-600">
            This will remove the card from your vault.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PublicNoteModal({
  isOpen,
  isPending,
  noteValue,
  error,
  onNoteChange,
  onCancel,
  onSave,
}: PublicNoteModalProps) {
  useDialogLock(isOpen, isPending, onCancel);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vault-public-note-title"
      onClick={() => {
        if (!isPending) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <h3 id="vault-public-note-title" className="text-2xl font-semibold tracking-tight text-slate-950">
            Wall note
          </h3>
          <p className="text-sm leading-7 text-slate-600">This note appears on your public wall item.</p>
        </div>

        <div className="mt-5 space-y-3">
          <textarea
            value={noteValue}
            onChange={(event) => onNoteChange(event.target.value)}
            rows={5}
            disabled={isPending}
            placeholder="Add a note collectors can see on your wall."
            className="w-full rounded-[1.25rem] border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? "Saving..." : "Save note"}
          </button>
        </div>
      </div>
    </div>
  );
}
