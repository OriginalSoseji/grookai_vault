"use client";

import ProductState from "@/components/layout/ProductState";

export default function ScanError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-12">
      <ProductState
        tone="error"
        eyebrow="Scanner unavailable"
        title="Scan could not start"
        description="No photo was uploaded and no card was added. Try again, or find the exact card with Search."
        action={<button type="button" className="gv-primary-button" onClick={reset}>Try again</button>}
        secondaryAction={<a href="/explore" className="gv-secondary-button">Search cards</a>}
      />
    </div>
  );
}
