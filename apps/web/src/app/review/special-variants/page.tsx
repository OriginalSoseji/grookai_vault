import type { Metadata } from "next";
import { notFound } from "next/navigation";

import SpecialVariantReviewClient from "@/components/review/SpecialVariantReviewClient";
import specialVariantManifest from "@/data/review/specialVariantPrintingEvidenceV1.json";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import { resolveVisualSearchReviewerAccess } from "@/lib/review/visualSearchReviewerAccess";
import type { SpecialVariantReviewManifest } from "@/lib/review/specialVariantReviewTypes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Special Variant Review | Grookai Vault",
  robots: { index: false, follow: false },
};

export default async function SpecialVariantReviewPage() {
  const { user } = await requireServerUser("/review/special-variants");
  const access = await resolveVisualSearchReviewerAccess(user);

  if (!access.allowed || !access.reviewerKey) {
    notFound();
  }

  return (
    <SpecialVariantReviewClient
      manifest={specialVariantManifest as SpecialVariantReviewManifest}
      reviewerKey={access.reviewerKey}
    />
  );
}
