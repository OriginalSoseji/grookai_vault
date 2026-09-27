"use client";

import Link from "next/link";
import ProductState from "@/components/layout/ProductState";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl py-10 sm:py-16">
      <ProductState
        tone="error"
        eyebrow="Could not load this page"
        title="Grookai hit a problem"
        description="Reload this page or return to Search. If a save was interrupted, check your collection before trying it again."
        action={(
          <button type="button" onClick={reset} className="gv-primary-button">
            Try again
          </button>
        )}
        secondaryAction={(
          <Link href="/explore" className="gv-secondary-button">
            Search cards
          </Link>
        )}
      />
    </div>
  );
}
