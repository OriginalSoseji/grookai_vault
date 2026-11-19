export type PlayableCardSignal = {
  as_of: string;
  valid_until: string;
  lists: number;
  events: number;
};

export type PublicPlayables = {
  version: "pokemon_playables_public:v1";
  game: "pokemon";
  format: "standard";
  platform: "paper";
  state: "ready" | "insufficient_evidence";
  snapshot_id: string;
  as_of: string;
  valid_until: string;
  rows: Array<{card_print_id: string; gv_id: string; lists: number; events: number}>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isCount = (value: unknown, minimum: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= minimum;

export function parsePublicPlayables(value: unknown, now = Date.now()): PublicPlayables | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.version !== "pokemon_playables_public:v1" || data.game !== "pokemon" ||
      data.format !== "standard" || data.platform !== "paper" ||
      (data.state !== "ready" && data.state !== "insufficient_evidence") ||
      typeof data.snapshot_id !== "string" || !/^[a-f0-9]{64}$/.test(data.snapshot_id) ||
      typeof data.as_of !== "string" || typeof data.valid_until !== "string" ||
      !Array.isArray(data.rows) || data.rows.length > 20000) return null;
  const from = Date.parse(data.as_of), until = Date.parse(data.valid_until);
  if (!Number.isFinite(from) || !Number.isFinite(until) || from > now || until <= now ||
      until <= from || until - from > 86_400_000) return null;
  const seen = new Set<string>();
  const rows: PublicPlayables["rows"] = [];
  for (const row of data.rows) {
    if (!row || typeof row !== "object" || typeof row.card_print_id !== "string" || !UUID.test(row.card_print_id) ||
        typeof row.gv_id !== "string" || !row.gv_id.startsWith("GV-PK-") ||
        !isCount(row.lists, 3) || !isCount(row.events, 2) || row.events > row.lists || seen.has(row.card_print_id)) return null;
    seen.add(row.card_print_id);
    rows.push({card_print_id: row.card_print_id, gv_id: row.gv_id, lists: row.lists, events: row.events});
  }
  if (data.state === "insufficient_evidence" && rows.length > 0) return null;
  // Explicit projection: provider receipts and private review data never reach clients.
  return {version: data.version, game: data.game, format: data.format, platform: data.platform,
    state: data.state, snapshot_id: data.snapshot_id, as_of: data.as_of, valid_until: data.valid_until, rows};
}

export function applyPlayableSignals<T extends {id: string; gv_id?: string}>(
  rows: T[], snapshot: PublicPlayables | null, now = Date.now(),
): Array<T & {playable?: PlayableCardSignal}> {
  const current = snapshot && parsePublicPlayables(snapshot, now);
  const byId = new Map(current?.rows.map(row => [row.card_print_id, row]) ?? []);
  return rows.map(row => {
    const member = byId.get(row.id);
    return {...row, playable: current && member && member.gv_id === row.gv_id
      ? {as_of: current.as_of, valid_until: current.valid_until, lists: member.lists, events: member.events}
      : undefined};
  });
}
