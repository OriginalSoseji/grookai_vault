"use client";

import ProductState from "@/components/layout/ProductState";

export default function DexError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-12">
      <ProductState
        tone="error"
        eyebrow="Grookai Dex unavailable"
        title="Character progress could not load"
        description="Your owned-card progress was not changed. Try loading the Dex again."
        action={<button type="button" className="gv-primary-button" onClick={reset}>Try again</button>}
        secondaryAction={<a href="/vault" className="gv-secondary-button">Open Vault</a>}
      />
    </div>
  );
}
