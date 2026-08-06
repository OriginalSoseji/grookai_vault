"use client";

import ProductState from "@/components/layout/ProductState";

export default function SetsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-12">
      <ProductState
        tone="error"
        eyebrow="Sets unavailable"
        title="Sets could not load"
        description="Your Vault was not changed. Try loading the set catalog again, or continue with Search."
        action={<button type="button" className="gv-primary-button" onClick={reset}>Try again</button>}
        secondaryAction={<a href="/explore" className="gv-secondary-button">Search cards</a>}
      />
    </div>
  );
}
