import type { ReactNode } from "react";
import { PokemonCardGridBadge } from "@/components/cards/PokemonCardGridTile";

type CollectorCardFactsProps = {
  title: ReactNode;
  setName?: string | null;
  number?: string | null;
  rarity?: string | null;
  versionLabel?: string | null;
  ownershipLabel?: string | null;
  availabilityLabels?: string[];
  titleClassName?: string;
};

export function CollectorCardFacts({
  title,
  setName = null,
  number = null,
  rarity = null,
  versionLabel = null,
  ownershipLabel = null,
  availabilityLabels = [],
  titleClassName = "text-xl",
}: CollectorCardFactsProps) {
  const identityLine = [
    setName,
    number && number !== "—" ? `#${number}` : null,
    rarity,
  ].filter(Boolean);

  return (
    <div className="space-y-2.5" data-collector-card-facts>
      <div className="space-y-1">
        <div className={`${titleClassName} gv-hi-card-identity font-semibold leading-tight`}>{title}</div>
        {identityLine.length > 0 ? (
          <p className="gv-hi-metadata text-sm">{identityLine.join(" • ")}</p>
        ) : null}
      </div>
      {versionLabel || ownershipLabel || availabilityLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Card version and availability">
          {versionLabel ? <PokemonCardGridBadge tone="accent">{versionLabel}</PokemonCardGridBadge> : null}
          {ownershipLabel ? <PokemonCardGridBadge tone="neutral">{ownershipLabel}</PokemonCardGridBadge> : null}
          {availabilityLabels.map((label) => (
            <PokemonCardGridBadge key={label} tone="positive">{label}</PokemonCardGridBadge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CollectorEvidenceDisclosure({
  children,
  label = "Card evidence",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <details className="gv-result-evidence" data-collector-evidence>
      <summary>{label}</summary>
      <div className="gv-result-evidence-body space-y-1.5 text-xs">{children}</div>
    </details>
  );
}
