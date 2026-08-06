"use client";

import { useState } from "react";
import { VaultCardTile, type VaultCardData } from "@/components/vault/VaultCardTile";

export default function ReleaseConvergenceVaultTileFixture({
  item,
  initialExpanded = false,
}: {
  item: VaultCardData;
  initialExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(initialExpanded);

  return (
    <VaultCardTile
      item={item}
      density="compact"
      isExpanded={expanded}
      onExpansionToggle={() => setExpanded((value) => !value)}
    />
  );
}
