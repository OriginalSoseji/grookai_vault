# Latios search indexed probe preparation V4

V4 is the exact507-to508 preparation for
`20261118160000_identity_search_probe_v1.sql`. Preserve applied505/506/507,
the failed507 API receipt, and locally applied508 bytes. V5 is the final release
scope; this sole508 scope must not be widened to include509.

508 changes only `search_print_identity_v1`, adds the nonunique
`card_prints_identity_fallback_trgm_v1_idx` and runs bounded ANALYZE on parents.
It normalizes an absent scope before unused alias resolution, hashes Jungle
exclusions with an explicit NULL-array guard, and indexes a safe literal-token
superset of fallback candidates. Parent text excludes the joined set name;
the candidate union separately includes matches in set names. The complete
original fallback text, predicates, ordering and limit remain the final authority.
No canonical, customer, printing, alias, mapping or market row may be rewritten.

Index construction and statistics collection may use120 seconds and a three-second
lock timeout. Public API acceptance remains three seconds. Existing owners,
signatures, definer settings, grants, RLS, raw IDs and ownership remain unchanged.
Preserve all failed evidence. Qualified baseline507 remains schema-only; the
independent507 data-only receipt proves120 retained fingerprints and full schema
and security parity while explicitly retaining the failed API acceptance.
