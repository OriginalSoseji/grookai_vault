"use client";

import ProductState from "@/components/layout/ProductState";

export default function BindersError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <ProductState
        compact
        tone="error"
        eyebrow="Binders"
        title="Binders could not load"
        description="Your collection goals were not changed. Check your connection and try again."
        action={(
          <button type="button" onClick={reset} className="gv-primary-button">
            Try again
          </button>
        )}
      />
    </div>
  );
}
