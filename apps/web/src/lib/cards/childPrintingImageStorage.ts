import "server-only";

let cachedHasChildPrintingImageColumns: boolean | null = null;

export async function hasChildPrintingImageStorageColumns(client: any) {
  if (cachedHasChildPrintingImageColumns !== null) {
    return cachedHasChildPrintingImageColumns;
  }

  const { error } = await client
    .from("card_printings")
    .select("image_source,image_path,image_url,image_alt_url,image_status,image_note")
    .limit(1);

  cachedHasChildPrintingImageColumns = !error;
  return cachedHasChildPrintingImageColumns;
}

export function getCardPrintingImageSelectColumns(includeImageColumns: boolean) {
  const baseColumns = ["id", "finish_key"];
  const imageColumns = includeImageColumns
    ? ["image_source", "image_path", "image_url", "image_alt_url", "image_status", "image_note"]
    : [];

  return [...baseColumns, ...imageColumns, "finish_keys(label,sort_order)"].join(",\n");
}
