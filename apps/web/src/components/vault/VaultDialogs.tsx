"use client";

import { useEffect } from "react";
import VaultDialogShell from "@/components/vault/VaultDialogShell";

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
    <VaultDialogShell
      isOpen={isOpen}
      isPending={isPending}
      title="Remove card?"
      description="This will remove the card from your vault."
      labelledBy="vault-remove-title"
      describedBy="vault-remove-body"
      onDismiss={onCancel}
      maxWidthClassName="max-w-md"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
      }
    />
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
    <VaultDialogShell
      isOpen={isOpen}
      isPending={isPending}
      title="Wall note"
      description="This note appears on your public wall item."
      labelledBy="vault-public-note-title"
      onDismiss={onCancel}
      maxWidthClassName="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
      }
    >
      <div className="space-y-3">
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
    </VaultDialogShell>
  );
}
