import Link from "next/link";

function buildVaultActionHref(cardHref: string) {
  return `${cardHref.split("#", 1)[0]}#vault-actions`;
}

export default function ExploreResultActions({
  cardHref,
  cardName,
  compact = false,
}: {
  cardHref: string;
  cardName: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={buildVaultActionHref(cardHref)}
      prefetch={false}
      aria-label={`Choose a version of ${cardName} to add to your Vault`}
      title="Choose the exact version and add it to your Vault"
      className={compact
        ? "gv-primary-button min-h-11 w-full px-4 py-2 text-sm sm:w-auto"
        : "gv-primary-button min-h-11 w-full px-3 py-2 text-sm"}
    >
      Add to Vault
    </Link>
  );
}
