import type { Metadata } from "next";
import Link from "next/link";
import { FounderGovernedPricingPlatformDetail } from "@/components/founder/FounderGovernedPricingPlatform";
import PageContainer from "@/components/layout/PageContainer";
import PageIntro from "@/components/layout/PageIntro";
import { requireFounderAccess } from "@/lib/founder/requireFounderAccess";
import {
  getFounderGovernedPricingPlatformSummary,
  getFounderPricingTraceByGvId,
} from "@/lib/founder/getGovernedPricingPlatformSummary";
import { createServerAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Pricing Platform | Founder | Grookai",
  robots: { index: false, follow: false },
};

type FounderPricingPageProps = {
  searchParams?: Promise<{
    gv_id?: string | string[];
  }>;
};

export default async function FounderPricingPage(props: FounderPricingPageProps) {
  const searchParams = await props.searchParams;
  await requireFounderAccess("/founder/pricing");
  const admin = createServerAdminClient();
  const summary = await getFounderGovernedPricingPlatformSummary(admin);
  const rawGvId = Array.isArray(searchParams?.gv_id)
    ? searchParams?.gv_id[0]
    : searchParams?.gv_id;
  const trace = rawGvId
    ? await getFounderPricingTraceByGvId(admin, rawGvId, summary)
    : null;

  return (
    <PageContainer className="space-y-9 py-8">
      <section className="gv-collector-panel px-6 py-8 sm:px-8 lg:px-10">
        <PageIntro
          eyebrow="Founder / Pricing"
          title="TCGPlayer Market Publication"
          description="Read-only operational proof for the governed English Pokemon exact-printing price platform. Database truth, deployed visibility, and release readiness are reported as separate facts."
          actions={
            <Link href="/founder" className="gv-secondary-button">
              Back to Founder
            </Link>
          }
        />
      </section>
      <FounderGovernedPricingPlatformDetail
        summary={summary}
        trace={trace}
      />
    </PageContainer>
  );
}
