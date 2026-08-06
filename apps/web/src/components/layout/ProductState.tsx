import type { ReactNode } from "react";

type ProductStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  tone?: "neutral" | "error" | "private";
  compact?: boolean;
};

function StateIcon({ tone }: { tone: NonNullable<ProductStateProps["tone"]> }) {
  if (tone === "error") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4.5" />
        <path d="M12 16.25h.01" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }

  if (tone === "private") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="10" width="14" height="10" rx="2.5" />
        <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7.5h16" />
      <path d="M4 12h10" />
      <path d="M4 16.5h7" />
    </svg>
  );
}

export default function ProductState({
  eyebrow,
  title,
  description,
  action,
  secondaryAction,
  tone = "neutral",
  compact = false,
}: ProductStateProps) {
  return (
    <section
      className={`gv-product-state ${compact ? "gv-product-state-compact" : ""}`.trim()}
      role={tone === "error" ? "alert" : "status"}
    >
      <div className="gv-product-state-icon">
        <StateIcon tone={tone} />
      </div>
      <div className="min-w-0">
        {eyebrow ? <p className="gv-eyebrow">{eyebrow}</p> : null}
        <h1 className={compact ? "text-lg font-semibold" : "gv-section-title"}>{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>
        {action || secondaryAction ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {action}
            {secondaryAction}
          </div>
        ) : null}
      </div>
    </section>
  );
}
