export const MTG_PRINT_RELEASE_READ_V1: 'mtg_print_release_read:v1';
export type MtgPrintRelease = {
  card_print_id: string;
  release_date: string;
  release_year: number;
  release_date_scope: 'individual_print';
  release_date_source: 'scryfall';
};
export function readMtgPrintReleaseV1(parent: unknown, identities: unknown[], sourceOwners: unknown[]): MtgPrintRelease | null;
