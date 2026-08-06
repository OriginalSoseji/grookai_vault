"use client";

import ProductState from "@/components/layout/ProductState";

export default function WallError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-12">
      <ProductState
        tone="error"
        eyebrow="Wall unavailable"
        title="Your Wall could not load"
        description="Your Vault cards, public settings, and Wall sections were not changed."
        action={<button type="button" className="gv-primary-button" onClick={reset}>Try again</button>}
      />
    </div>
  );
}
