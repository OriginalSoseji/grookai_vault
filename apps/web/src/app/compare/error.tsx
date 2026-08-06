"use client";

import ProductState from "@/components/layout/ProductState";

export default function CompareError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-12">
      <ProductState
        tone="error"
        eyebrow="Compare unavailable"
        title="These cards could not be compared"
        description="Your selected cards were not changed. Try again, or return to Search and choose a new comparison."
        action={<button type="button" className="gv-primary-button" onClick={reset}>Try again</button>}
        secondaryAction={<a href="/explore" className="gv-secondary-button">Search cards</a>}
      />
    </div>
  );
}
