import type { SupabaseClient } from "@supabase/supabase-js";

export type JungleEditionOption = {
  card_print_id: string;
  card_printing_id: string;
  gv_id: string;
  printing_gv_id: string;
  edition: "first_edition" | "unlimited";
  finish_key: "normal" | "holo";
};
export type JungleEditionResolution = {
  version: 1;
  status: "not_applicable" | "selection_required" | "ready" | "unavailable";
  legacy_card_print_id?: string;
  options: JungleEditionOption[];
};
export const JUNGLE_EDITION_RPC = "get_jungle_edition_resolution_v1";
export const JUNGLE_DISCOVERY_RPC = "get_jungle_edition_discovery_exclusions_v1";
// A historical manifest must not restore references excluded by live discovery.
export function jungleAwareCatalogCount(setCode: string, manifestCount: number, liveCount: number) {
  const current = Number.isFinite(liveCount) ? liveCount : 0;
  return setCode === "base2" ? current : Math.max(manifestCount, current);
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getJungleDiscoveryExclusions(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client.rpc(JUNGLE_DISCOVERY_RPC);
  if (error?.code === "PGRST202" && error.message.includes(JUNGLE_DISCOVERY_RPC)) return [];
  if (error || !Array.isArray(data) || data.some(id => typeof id !== "string" || !uuid.test(id))
    || new Set(data).size !== data.length) throw new Error("Jungle catalog choices could not be checked. Please retry.");
  return data;
}

export function parseJungleEditionResolution(value: unknown): JungleEditionResolution {
  if (!value || typeof value !== "object") throw new Error("Invalid edition response");
  const row = value as JungleEditionResolution;
  if (row.version !== 1 || !["not_applicable", "selection_required", "ready", "unavailable"].includes(row.status)
    || !Array.isArray(row.options)) throw new Error("Invalid edition response");
  if (row.status !== "not_applicable" && !uuid.test(row.legacy_card_print_id ?? "")) throw new Error("Invalid edition parent");
  if ((row.status === "ready" || row.status === "selection_required") && row.options.length !== 2) throw new Error("Incomplete edition choices");
  if (row.status === "not_applicable" && row.options.length !== 0) throw new Error("Unexpected edition choices");
  if (row.options.length !== 0 && row.options.length !== 2) throw new Error("Incomplete edition choices");
  for (const item of row.options) {
    if (!item || !uuid.test(item.card_print_id) || !uuid.test(item.card_printing_id)
      || !["first_edition", "unlimited"].includes(item.edition) || !["normal", "holo"].includes(item.finish_key)
      || !/^GV-PK-JU-([1-9]|[1-5][0-9]|6[0-4])-(FIRST-EDITION|UNLIMITED)$/.test(item.gv_id)
      || !item.gv_id.endsWith(item.edition === "first_edition" ? "-FIRST-EDITION" : "-UNLIMITED")
      || item.printing_gv_id !== `${item.gv_id}-${item.finish_key.toUpperCase()}`) throw new Error("Invalid edition choice");
  }
  if (row.options.length === 2 && (new Set(row.options.map(x => x.edition)).size !== 2
    || new Set(row.options.map(x => x.card_print_id)).size !== 2
    || new Set(row.options.map(x => x.card_printing_id)).size !== 2
    || new Set(row.options.map(x => x.gv_id.split("-")[3])).size !== 1
    || row.options[0].finish_key !== row.options[1].finish_key)) throw new Error("Conflicting edition choices");
  return row;
}

export async function getJungleEditionResolution(client: SupabaseClient, cardPrintId: string) {
  const { data, error } = await client.rpc(JUNGLE_EDITION_RPC, { p_card_print_id: cardPrintId });
  // Allows the caller release to precede this additive migration. Other errors
  // must not silently become permission to add an unresolved card.
  if (error?.code === "PGRST202" && error.message.includes(JUNGLE_EDITION_RPC)) {
    return { version: 1, status: "not_applicable", options: [] } as JungleEditionResolution;
  }
  if (error) throw new Error("Edition choices could not be checked. Please try again.");
  return parseJungleEditionResolution(data);
}

export class JungleEditionRequiredError extends Error {
  public readonly resolution: JungleEditionResolution;
  constructor(resolution: JungleEditionResolution) {
    super(resolution.status === "selection_required"
      ? "Choose First Edition or Unlimited before adding a new copy."
      : "Edition choices are being reviewed. Your saved copies remain available.");
    this.name = "JungleEditionRequiredError";
    this.resolution = resolution;
  }
}

export function assertJungleEditionSelection(resolution: JungleEditionResolution, parent: string, child?: string | null) {
  if (resolution.status === "not_applicable") return;
  if (resolution.status !== "ready") throw new JungleEditionRequiredError(resolution);
  if (!resolution.options.some(x => x.card_print_id === parent && x.card_printing_id === child)) {
    throw new Error("Choose the verified printing for this edition.");
  }
}
