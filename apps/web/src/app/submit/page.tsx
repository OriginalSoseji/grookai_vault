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

function cleanParam(value?: string | string[] | null) {
  if (Array.isArray(value)) {
    return cleanParam(value[0]);
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function appendParam(params: URLSearchParams, key: string, value?: string | string[] | null) {
  if (Array.isArray(value)) {
    for (const item of value) {
      appendParam(params, key, item);
    }
    return;
  }

  const normalized = cleanParam(value);
  if (normalized) {
    params.append(key, normalized);
  }
}

function buildSubmitLoginNext(searchParams?: {
  intent?: string | string[];
  card?: string | string[];
  printing?: string | string[];
  finish?: string | string[];
  reason?: string | string[];
  returnTo?: string | string[];
}) {
  const params = new URLSearchParams();
  appendParam(params, "intent", searchParams?.intent);
  appendParam(params, "card", searchParams?.card);
  appendParam(params, "printing", searchParams?.printing);
  appendParam(params, "finish", searchParams?.finish);
  appendParam(params, "reason", searchParams?.reason);
  appendParam(params, "returnTo", searchParams?.returnTo);

  const query = params.toString();
  return query ? `/submit?${query}` : "/submit";
}

function buildInitialSubmissionValues(searchParams?: {
  intent?: string | string[];
  card?: string | string[];
  printing?: string | string[];
  finish?: string | string[];
  reason?: string | string[];
  returnTo?: string | string[];
}) {
  const intent = cleanParam(searchParams?.intent)?.toUpperCase() === "MISSING_IMAGE" ? "MISSING_IMAGE" : null;
  const card = cleanParam(searchParams?.card);
  const printing = cleanParam(searchParams?.printing);
  const finish = cleanParam(searchParams?.finish);
  const reason = cleanParam(searchParams?.reason);

  if (intent !== "MISSING_IMAGE" || !card) {
    return undefined;
  }

  const notes = [
    `Image suggestion for ${card}`,
    finish ? `Selected version: ${finish}` : null,
    printing ? `Selected printing reference: ${printing}` : null,
    reason === "child_printing_uses_parent_image"
      ? "Reason: selected version is currently using the base card image."
      : "Reason: this card image is missing or incorrect.",
  ].filter((value): value is string => Boolean(value));

  return {
    submissionIntent: "MISSING_IMAGE" as const,
    notes: notes.join("\n"),
  };
}

export default async function SubmitPage({
  searchParams,
}: {
  searchParams?: {
    intent?: string | string[];
    card?: string | string[];
    printing?: string | string[];
    finish?: string | string[];
    reason?: string | string[];
    returnTo?: string | string[];
  };
}) {
  const { user } = await requireServerUser(buildSubmitLoginNext(searchParams));
  const initialValues = buildInitialSubmissionValues(searchParams);

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
        <WarehouseSubmissionForm userId={user.id} initialValues={initialValues} />
      </PageSection>
    </div>
  );
}
