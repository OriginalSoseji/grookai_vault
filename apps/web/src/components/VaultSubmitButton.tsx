"use client";

import { useFormStatus } from "react-dom";

type VaultSubmitButtonProps = {
  label: string;
  pendingLabel?: string;
  successActive?: boolean;
  successLabel?: string;
};

export default function VaultSubmitButton({
  label,
  pendingLabel = "Adding...",
  successActive = false,
  successLabel = "Added",
}: VaultSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isSuccess = successActive && !pending;

  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-w-[140px] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
        isSuccess
          ? "bg-emerald-600 shadow-[0_10px_24px_rgba(5,150,105,0.18)] hover:bg-emerald-600"
          : "bg-slate-950 hover:bg-slate-800"
      }`}
    >
      {isSuccess ? (
        <>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
          <span>{successLabel}</span>
        </>
      ) : pending ? (
        pendingLabel
      ) : (
        label
      )}
    </button>
  );
}
