"use client";

import { useFormStatus } from "react-dom";

type VaultSubmitButtonProps = {
  label: string;
  pendingLabel?: string;
};

export default function VaultSubmitButton({
  label,
  pendingLabel = "Adding...",
}: VaultSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition-all duration-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
