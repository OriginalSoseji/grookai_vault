import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { requireServerUser } from "@/lib/auth/requireServerUser";
import { resolveVisualSearchReviewerAccess } from "@/lib/review/visualSearchReviewerAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Visual Search Review | Grookai Vault",
  robots: { index: false, follow: false },
};

export default async function VisualSearchReviewPage() {
  const { user } = await requireServerUser("/review/visual-search");
  const access = await resolveVisualSearchReviewerAccess(user);

  if (!access.allowed || !access.reviewerKey) {
    notFound();
  }

  redirect(
    `/api/review/visual-search/dashboard?reviewer=${encodeURIComponent(access.reviewerKey)}`,
  );
}
