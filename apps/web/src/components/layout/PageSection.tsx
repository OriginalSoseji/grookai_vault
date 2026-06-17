import type { ReactNode } from "react";

type PageSectionProps = {
  children: ReactNode;
  className?: string;
  surface?: "plain" | "card" | "subtle";
  spacing?: "compact" | "default" | "loose";
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const SURFACE_CLASSNAME: Record<NonNullable<PageSectionProps["surface"]>, string> = {
  plain: "",
  card: "gv-premium-surface px-5 py-6 sm:px-7 sm:py-7",
  subtle: "gv-soft-surface px-4 py-5 sm:px-6",
};

const SPACING_CLASSNAME: Record<NonNullable<PageSectionProps["spacing"]>, string> = {
  compact: "space-y-3",
  default: "space-y-4",
  loose: "space-y-5",
};

export function PageSection({
  children,
  className,
  surface = "plain",
  spacing = "default",
}: PageSectionProps) {
  return (
    <section
      className={cx(
        "w-full",
        SPACING_CLASSNAME[spacing],
        SURFACE_CLASSNAME[surface],
        className,
      )}
    >
      {children}
    </section>
  );
}

export default PageSection;
