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
  card: "rounded-[16px] border border-slate-200 bg-white px-6 py-6 shadow-sm",
  subtle: "rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4",
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
