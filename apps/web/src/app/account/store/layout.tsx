import { Suspense, type ReactNode } from "react";
import { VendorWorkspaceNavigation } from "@/components/workspace/VendorWorkspaceNavigation";

export default function VendorLayout({ children }: { children: ReactNode }) {
  return <><Suspense><VendorWorkspaceNavigation /></Suspense>{children}</>;
}
