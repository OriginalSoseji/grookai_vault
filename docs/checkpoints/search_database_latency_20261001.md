# Search database latency — October 1

The production read-only diagnosis measured uncached searches at 5.7–7.7 seconds.
It found repeated caller-visible set catalog pages, repeated metadata reads, and
an artist scan across 171,022 card rows. Shared statement counters also showed
slow case-insensitive exact-set lookups; those counters include other traffic.
They are not a trace attributing every query to the resolver request.

This candidate adds one invoker-security JSON catalog read, reuses that metadata
within its request, indexes artist/ID, and resolves case-insensitive set references
through an indexed generated key. An ordinary lower(code) expression index was
rejected by the local plan test: PostgreSQL cannot push that non-leakproof
expression ahead of the RLS barrier. The generated key keeps ordinary equality
indexable without changing visibility policies. No card identity or saved copy
is rewritten. Searches with credentials are private; timings contain durations
only. Existing complete-result filtering and pagination stay intact.

Source: `C:/gv_search_database_20261001`, branch
`fix/search-database-latency-20261001`, migration `20261001150000` over411.
The earlier source already includes the GameStop fix on main.

Qualification uses new isolated full412 and retained411-to412 labs. V1 fixtures
preserve the failed expression-index experiment. V2 uses loopback65241/65341 and
internal Docker networks with workers/cron disabled. Never reset populated labs.
`scripts/schema/search_database_runtime_v1.mjs` tests real anonymous and signed-in
HTTP calls, over1,000 visible sets, hidden/signed-in/game visibility, literal
wildcards, canonical case, and actual index use. `--verify` rechecks the retained
synthetic fixture without reseeding it. Its accounts are local fixtures only.

Use the strict migration gate's `-SearchDatabaseLatencyV1` switch and exact
`-ExpectedLocalOnlyIds 20261001150000`. AuditLinkedSchema verifies the unchanged
production411 baseline; PrePush additionally requires qualified V2 labs, runtime
proof and a fresh normal-hook receipt from clean committed source. The separate
`prepare_search_database_v1.mjs prepare|dry-run` creates an exact-pending private
CLI inspection package. These tools do not apply production changes.

Private evidence, qualification receipts and actual deployment status are under
`C:/grookai_vault_operator_artifacts/search_database_20261001`. Local passing
tests do not establish a live release. Apply the exact migration through the
Supabase CLI only after qualification, compare schema/security and retained data,
then qualify the hosted search candidate against the recorded complete results
before promotion. Preserve the previous live deployment as rollback. Physical
iPhone testing is not a gate for this server-side fix.
