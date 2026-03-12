export type ParsedRow = {
  sourceRow: number;
  rawName?: string;
  rawSet?: string;
  rawNumber?: string;
  rawCondition?: string;
  rawQuantity?: string;
  rawCost?: string;
  rawDate?: string;
  rawNotes?: string;
};

export type NormalizedRow = {
  sourceRow: number;
  displayName: string;
  displaySet: string;
  displayNumber: string;
  name: string;
  set: string;
  number: string;
  quantity: number;
  condition: string;
  cost?: number;
  added?: string;
  notes?: string;
};

export type CardMatch = {
  card_id: string;
  gv_id: string;
  name?: string;
  set_name?: string;
  set_code?: string | null;
  number?: string;
};

export type MatchResult = {
  row: NormalizedRow;
  match?: CardMatch;
  matches?: CardMatch[];
  status: "matched" | "multiple" | "missing";
};

export type MatchCardPrintsResult = {
  rows: MatchResult[];
  summary: {
    totalRows: number;
    matchedRows: number;
    multipleRows: number;
    unmatchedRows: number;
  };
};

export type ImportVaultItemsResult = {
  importedCards: number;
  importedEntries: number;
  needsManualMatch: number;
  skippedRows: number;
};
