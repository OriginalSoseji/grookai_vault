import type { SmartSearchIntent } from "@/lib/search/smartSearchIntent";

export function hasDeterministicSmartSearchIntent(intent: SmartSearchIntent) {
  return (
    intent.interpretedLabels.length > 0 ||
    intent.finishKeys.length > 0 ||
    intent.stampLabels.length > 0 ||
    Boolean(intent.artist) ||
    Boolean(intent.imageState && intent.imageState !== "any") ||
    Boolean(intent.ownedState && intent.ownedState !== "any") ||
    typeof intent.releaseYearMin === "number" ||
    typeof intent.releaseYearMax === "number"
  );
}

export function resolveSmartSearchQuery(rawQuery: string, intent: SmartSearchIntent) {
  return intent.residualQuery || (hasDeterministicSmartSearchIntent(intent) ? "" : rawQuery.trim());
}
