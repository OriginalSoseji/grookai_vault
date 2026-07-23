"use client";

import PageSection from "@/components/layout/PageSection";

export default function BindersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <PageSection surface="card">
        <h1 className="gv-section-title">Binders could not load</h1>
        <p className="text-sm text-slate-600">
          Your collection goals were not changed. Check your connection and try again.
        </p>
        <button type="button" onClick={reset} className="gv-primary-button">
          Try again
        </button>
      </PageSection>
    </div>
  );
}
