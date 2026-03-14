import type { ReactNode } from "react";
import { spacing } from "@/styles/designTokens";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  const classes = ["mx-auto", "w-full", className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      style={{
        maxWidth: 1280,
        paddingLeft: spacing.xl,
        paddingRight: spacing.xl,
      }}
    >
      {children}
    </div>
  );
}
