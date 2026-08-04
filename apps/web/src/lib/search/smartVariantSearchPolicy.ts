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
