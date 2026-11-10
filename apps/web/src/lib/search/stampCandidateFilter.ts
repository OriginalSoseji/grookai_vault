// This is only a candidate filter. Final stamp, finish, language and ownership
// predicates still run before response paging. GameStop has an exact governed
// parent modifier; equality lets PostgreSQL narrow before public visibility RLS.
// ILIKE/JSON predicates on the public table scan too much under that RLS policy.
export function gameStopCandidateFilter(stampLabels?: string[]): string | null {
  if (!stampLabels?.some((label) => /^gamestop(?: stamp)?$/i.test(label.trim()))) {
    return null;
  }
  return "variant_key.eq.gamestop_stamp,printed_identity_modifier.eq.gamestop_stamp";
}

// These are governed canonical identity keys, including the recognized WB error
// states. Narrow candidates before catalog paging; final label/finish/scope
// checks still decide membership. Unknown labels retain the existing path.
export function governedStampCandidateFilter(stampLabels?: string[]): string | null {
  const clauses = new Set<string>();
  const gameStop = gameStopCandidateFilter(stampLabels);
  if (gameStop) clauses.add(gameStop);
  for (const input of stampLabels ?? []) {
    const label = input.trim().toLowerCase().replace(/[-\s]+/g, " ");
    if (/^build a bear(?: workshop)?(?: stamp)?$/.test(label)) {
      clauses.add("variant_key.eq.build_a_bear_workshop_stamp");
      clauses.add("printed_identity_modifier.eq.build_a_bear_workshop_stamp");
    }
    const wb = /^(?:(inverted|missing) )?wb kids(?: stamp)?$/.exec(label);
    if (wb) {
      const keys = wb[1]
        ? [`${wb[1]}_wb_kids_stamp`]
        : ["wb_kids_stamp", "inverted_wb_kids_stamp", "missing_wb_kids_stamp"];
      for (const key of keys) {
        clauses.add(`variant_key.eq.${key}`);
        clauses.add(`printed_identity_modifier.eq.${key === "wb_kids_stamp" ? "stamp:wb_kids_first_movie" : `recognized_error:${key}`}`);
      }
    }
  }
  return [...clauses].join(",") || null;
}
