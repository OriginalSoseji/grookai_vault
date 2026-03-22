import type { ReactNode } from "react";

type VaultDialogShellProps = {
  isOpen: boolean;
  isPending?: boolean;
  title: string;
  description?: string;
  labelledBy: string;
  describedBy?: string;
  onDismiss: () => void;
  children?: ReactNode;
  footer: ReactNode;
  maxWidthClassName?: string;
};

export function VaultDialogShell({
  isOpen,
  isPending = false,
  title,
  description,
  labelledBy,
  describedBy,
  onDismiss,
  children,
  footer,
  maxWidthClassName = "max-w-lg",
}: VaultDialogShellProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => {
        if (!isPending) {
          onDismiss();
        }
      }}
    >
      <div
        className={`w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7 ${maxWidthClassName}`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-3">
          <h3 id={labelledBy} className="text-2xl font-semibold tracking-tight text-slate-950">
            {title}
          </h3>
          {description ? (
            <p id={describedBy} className="text-sm leading-7 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>

        {children ? <div className="mt-5">{children}</div> : null}
        <div className="mt-6">{footer}</div>
      </div>
    </div>
  );
}

export default VaultDialogShell;
