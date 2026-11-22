# Prismatic alias discovery read repair V2

Status: active for local qualification only; no production apply gate.
Supersedes the single-candidate admission in V1, preserving every V1 requirement
about identity authority, visibility, historical objects, fixtures and release.

The first actual reader regression hit a60-second timeout because SQL identity
search inlined the set resolver per candidate row. V1's applied local draft and
failed receipts remain immutable. The second forward migration wraps constant
set resolution in a scalar InitPlan. Do not edit the first applied local draft.

The only admitted candidate set above production496 is:

- `20261117063000_prismatic_alias_discovery_v1.sql`
- `20261117064000_prismatic_alias_query_initplans_v2.sql`

Their exact SHA-256 values are bound in
`scripts/schema/prismatic_alias_candidate_v2.json`. Changed, missing or additional
candidates reject. `-PrismaticAliasDiscoveryBaselineV2` supports read-only
AuditLinkedSchema only with a new bounded audit directory. V1 cannot admit V2;
PrePush, apply, pending-ID overrides, combined modes and target overrides reject.

The complete fresh498 replay uses a new unlinked internal-network lab. Existing
fresh497 and retained496→497 labs remain populated and must not be reset. Local
497→498 forward upgrades must preserve all449 protected table fingerprints,
and prove rollback, no-op, exact source hashes and the same role/reader tests.
Together with the retained496→497 receipt they prove the forward496→498 path.

Production release still requires a separate exact-candidate PrePush scope,
fresh live496 parity, clean committed source, the fully qualified CLI package,
and protected-state readback. No production mutation is enabled by this scope.
