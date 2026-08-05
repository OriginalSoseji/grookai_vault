import Link from "next/link";
import ProductState from "@/components/layout/ProductState";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl py-10 sm:py-16">
      <ProductState
        eyebrow="Page not found"
        title="That destination is not available"
        description="The link may be old, private, or no longer shared. Search for the exact card or return to Grookai."
        action={(
          <Link href="/explore" className="gv-primary-button">
            Search cards
          </Link>
        )}
        secondaryAction={(
          <Link href="/" className="gv-secondary-button">
            Go home
          </Link>
        )}
      />
    </div>
  );
}
