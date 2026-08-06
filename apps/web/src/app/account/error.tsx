"use client";

import ProductState from "@/components/layout/ProductState";

export default function AccountError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-12">
      <ProductState
        tone="error"
        eyebrow="Account unavailable"
        title="Account settings could not load"
        description="Your profile, privacy settings, and collection were not changed. Try loading the account page again."
        action={<button type="button" className="gv-primary-button" onClick={reset}>Try again</button>}
        secondaryAction={<a href="/vault" className="gv-secondary-button">Open Vault</a>}
      />
    </div>
  );
}
