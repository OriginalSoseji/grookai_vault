import type { SupabaseClient } from "@supabase/supabase-js";

export const PUBLIC_CARD_PRINTING_OPTIONS_RPC_V1 =
  "get_public_card_printing_options_v1";

export type PublicCardPrintingOptionRow = {
  id: string;
  card_print_id: string;
  printing_gv_id: string | null;
  finish_key: string;
  finish_label: string;
  finish_sort_order: number;
  finish_is_active: boolean;
  image_source: string | null;
  image_path: string | null;
  image_url: string | null;
  image_alt_url: string | null;
  image_status: string | null;
  image_note: string | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IDS_PER_REQUEST = 250;
const PAGE_SIZE = 1000;

function normalizedIds(values: readonly string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => UUID_PATTERN.test(value))),
  );
}

export async function getPublicCardPrintingOptions(
  client: SupabaseClient,
  cardPrintIds: readonly string[],
) {
  const ids = normalizedIds(cardPrintIds);
  const rows: PublicCardPrintingOptionRow[] = [];

  for (let start = 0; start < ids.length; start += MAX_IDS_PER_REQUEST) {
    const chunk = ids.slice(start, start + MAX_IDS_PER_REQUEST);
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await client.rpc(
        PUBLIC_CARD_PRINTING_OPTIONS_RPC_V1,
        {
          p_card_print_ids: chunk,
          p_limit: PAGE_SIZE,
          p_offset: offset,
        },
      );
      if (error) {
        throw new Error(`[${PUBLIC_CARD_PRINTING_OPTIONS_RPC_V1}] ${error.message}`);
      }

      const page = (data ?? []) as unknown as PublicCardPrintingOptionRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) {
        break;
      }
    }
  }

  return rows;
}

export function groupPublicCardPrintingOptionsByCardPrintId(
  rows: readonly PublicCardPrintingOptionRow[],
) {
  const grouped = new Map<string, PublicCardPrintingOptionRow[]>();
  for (const row of rows) {
    const cardPrintId = row.card_print_id?.trim();
    if (!UUID_PATTERN.test(cardPrintId)) {
      continue;
    }
    const values = grouped.get(cardPrintId) ?? [];
    values.push(row);
    grouped.set(cardPrintId, values);
  }
  return grouped;
}
