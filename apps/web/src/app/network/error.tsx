"use client";

import ProductState from "@/components/layout/ProductState";

export default function NetworkError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-12">
      <ProductState
        tone="error"
        eyebrow="Pulse unavailable"
        title="Collector activity could not load"
        description="Your collection and messages were not changed. Try loading Pulse again."
        action={<button type="button" className="gv-primary-button" onClick={reset}>Try again</button>}
      />
    </div>
  );
}
