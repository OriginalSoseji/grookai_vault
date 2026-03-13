export type ImportReport = {
  rowsRead: number;
  rowsCollapsed: number;
  rowsValid: number;
  rowsInvalid: number;
  rowsMatched: number;
  rowsMissing: number;
};

export function createImportReport(data: Partial<ImportReport> = {}): ImportReport {
  return {
    rowsRead: data.rowsRead ?? 0,
    rowsCollapsed: data.rowsCollapsed ?? 0,
    rowsValid: data.rowsValid ?? 0,
    rowsInvalid: data.rowsInvalid ?? 0,
    rowsMatched: data.rowsMatched ?? 0,
    rowsMissing: data.rowsMissing ?? 0,
  };
}
