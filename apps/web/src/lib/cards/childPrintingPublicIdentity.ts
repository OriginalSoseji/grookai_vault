import "server-only";

let cachedHasPrintingGvIdColumn: boolean | null = null;

export async function hasChildPrintingPublicIdentityColumn(client: { from: (table: string) => any }) {
  if (cachedHasPrintingGvIdColumn !== null) {
    return cachedHasPrintingGvIdColumn;
  }

  const { error } = await client.from("card_printings").select("printing_gv_id").limit(1);
  cachedHasPrintingGvIdColumn = !error;
  return cachedHasPrintingGvIdColumn;
}

export function getCardPrintingsSelectColumns(includePublicIdentity: boolean) {
  return includePublicIdentity
    ? "id,card_print_id,finish_key,printing_gv_id,finish_keys(label,sort_order)"
    : "id,card_print_id,finish_key,finish_keys(label,sort_order)";
}
