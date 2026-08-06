"use client";

import ProductState from "@/components/layout/ProductState";

export default function VaultImportError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-12">
      <ProductState
        tone="error"
        eyebrow="Vault import unavailable"
        title="Import could not load"
        description="No file rows were added to your Vault. Try again, or add an exact card from Search."
        action={<button type="button" className="gv-primary-button" onClick={reset}>Try again</button>}
        secondaryAction={<a href="/explore" className="gv-secondary-button">Search cards</a>}
      />
    </div>
  );
}
