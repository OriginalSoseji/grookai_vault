import type { Metadata } from "next";
import { ScanClient } from "@/app/scan/ScanClient";
import { requireServerUser } from "@/lib/auth/requireServerUser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Scan | Grookai Vault",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ScanPage() {
  await requireServerUser("/scan");

  return <ScanClient />;
}
