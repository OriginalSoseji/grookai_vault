export type SmartVariantSearchRow = {
  gv_id?: string | null;
  search_object_type?: "parent_print" | "child_printing";
};

export function mergeSmartVariantScopeRows<T extends SmartVariantSearchRow>(
  parentRows: T[],
  childRows: T[],
  requireChildScope: boolean,
) {
  if (requireChildScope) {
    return childRows;
  }

  const childParentGvIds = new Set(
    childRows
      .map((row) => row.gv_id?.trim() ?? "")
      .filter(Boolean),
  );
  const parentsWithoutChildMatches = parentRows.filter((row) => {
    const gvId = row.gv_id?.trim() ?? "";
    return !gvId || !childParentGvIds.has(gvId);
  });

  return [...parentsWithoutChildMatches, ...childRows];
}

type StructuredVariantIntent = {
  residualQuery?: string;
  releaseYearMin?: number;
  releaseYearMax?: number;
  finishKeys: string[];
  stampLabels: string[];
  imageState?: string;
  unappliedLabels: string[];
};

type StructuredSearchContext = {
  expectedSetCodes?: string[];
};

export function classifySmartVariantResolverState(
  rowCount: number,
  intent: StructuredVariantIntent,
  mode: "generic" | "structured_text",
  context: StructuredSearchContext = {},
) {
  if (rowCount === 0) {
    return "NO_MATCH" as const;
  }

  const hasStructuredConstraint =
    intent.finishKeys.length > 0 ||
    intent.stampLabels.length > 0 ||
    Boolean(intent.imageState && intent.imageState !== "any") ||
    typeof intent.releaseYearMin === "number" ||
    typeof intent.releaseYearMax === "number" ||
    Boolean(context.expectedSetCodes?.length);
  const isFullyAppliedStructuredMatch =
    mode === "structured_text" &&
    rowCount === 1 &&
    Boolean(intent.residualQuery?.trim()) &&
    hasStructuredConstraint &&
    intent.unappliedLabels.length === 0;

  return isFullyAppliedStructuredMatch ? ("DIRECT_MATCH" as const) : ("WEAK_MATCH" as const);
}
