import type { ReactNode } from "react";

type PageIntroProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  size?: "default" | "compact";
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function PageIntro({
  title,
  eyebrow,
  description,
  actions,
  className,
  size = "default",
}: PageIntroProps) {
  return (
    <div
      className={cx(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-3">
        {eyebrow ? (
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-2">
          <h1
            className={
              size === "compact"
                ? "text-3xl font-semibold tracking-tight text-slate-950"
                : "text-4xl font-semibold tracking-tight text-slate-950"
            }
          >
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-base leading-7 text-slate-600">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </div>
  );
}

export default PageIntro;
