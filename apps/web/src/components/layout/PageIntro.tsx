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
          <p className="gv-eyebrow">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-3">
          <h1
            className={
              size === "compact"
                ? "gv-section-title"
                : "gv-display-title"
            }
          >
            {title}
          </h1>
          {description ? (
            <p className="gv-body-copy max-w-2xl">{description}</p>
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
