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
