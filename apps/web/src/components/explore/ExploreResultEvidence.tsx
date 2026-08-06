import type { ExploreResultCard } from "@/components/explore/exploreResultTypes";

function getDiagnosticId(card: ExploreResultCard) {
  return card.printing_gv_id
    ? `Exact version ID: ${card.printing_gv_id}`
    : `Card ID: ${card.gv_id}`;
}

export default function ExploreResultEvidence({
  card,
  matchReason,
  searchContext,
  compact = false,
}: {
  card: ExploreResultCard;
  matchReason?: string;
  searchContext?: string | null;
  compact?: boolean;
}) {
  return (
    <details className={`gv-result-evidence ${compact ? "gv-result-evidence-compact" : ""}`.trim()}>
      <summary>Why this result</summary>
      <div className="gv-result-evidence-body">
        {matchReason ? <p>{matchReason}</p> : null}
        {searchContext ? <p>{searchContext}</p> : null}
        <p className="font-mono">{getDiagnosticId(card)}</p>
      </div>
    </details>
  );
}
