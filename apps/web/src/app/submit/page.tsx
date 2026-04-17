import type { Metadata } from "next";
import Link from "next/link";
import WarehouseSubmissionForm from "@/components/warehouse/WarehouseSubmissionForm";
import { requireServerUser } from "@/lib/auth/requireServerUser";
import PageIntro from "@/components/layout/PageIntro";
import PageSection from "@/components/layout/PageSection";
import SectionHeader from "@/components/layout/SectionHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Submit Missing Card or Image",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SubmitPage() {
  const { user } = await requireServerUser("/submit");

  return (
    <div className="space-y-8 py-6 md:py-8">
      <PageIntro
        eyebrow="Warehouse Submission"
        title="Submit a missing card or image"
        description="Upload the front of the card, explain what is missing, and Grookai will send the report into warehouse review."
        actions={(
          <Link
            href="/account"
            className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to account
          </Link>
        )}
      />

      <PageSection surface="subtle" spacing="compact" className="px-4 py-4 md:px-5">
        <SectionHeader
          title="How this works"
          description="You upload evidence from the browser. The warehouse intake edge function validates the request. The RPC writes intake records atomically after that."
        />
      </PageSection>

      <PageSection surface="card" spacing="loose" className="px-4 py-4 sm:px-5 md:px-6">
        <SectionHeader
          title="Submission form"
          description="This is a collector submission route. It does not expose founder review, staging, or canon mutation."
        />
        <WarehouseSubmissionForm userId={user.id} />
      </PageSection>
    </div>
  );
}
