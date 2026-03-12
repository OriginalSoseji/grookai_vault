import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  const classes = ["mx-auto", "w-full", "max-w-[1200px]", "px-6", className].filter(Boolean).join(" ");

  return <div className={classes}>{children}</div>;
}
