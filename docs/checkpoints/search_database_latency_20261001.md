# Search database latency — October 1

## Follow-up: repeated name and parent reads

PR570 is live at `a4132e6bf5ec924e6e7cacbb07b619e288b0057a`; its private
`search_tail_latency_20261001/CHECKPOINT.json` is terminal. Continue in
`C:/gv_search_rpc_latency_20261001`, branch `fix/search-rpc-latency-20261001`.
Private source comparisons and release receipts belong in `search_rpc_latency_20261001`
under the operator artifacts root. No migration or native binary is required.

Read-only tracing found Pika repeated its interpretation name probe during
retrieval, then reread parent fields already returned by the governed name RPC.
This candidate retains the first64 raw rows only within that request, reusing
them only for identical name/game/all-language/unrestricted-set RPC arguments.
Other scopes still fetch independently. Full parent rows avoid ID hydration;
collector-number fractions and sparse contracts retain hydration because V4
does not return card-specific printed totals. Existing visibility predicates,
complete pagination, duplicate detection and explicit failure behavior remain.

Server-Timing adds catalog, name-check, name-page and parent-read durations.
These contain no queries, identities or credentials. Qualification compares
complete result objects as well as counts and requests; source-only timings
must not be represented as live end-to-end measurements. Normal hooks, hosted
checks, candidate/live search and browser readback govern release separately.

## Follow-up: first-use set parser cost

PR568 is deployed with migration412; its private `CHECKPOINT.json` is terminal.
Do not replay that migration or release. The next isolated worktree is
`C:/gv_search_tail_latency_20261001`, branch `fix/search-tail-latency-20261001`.
Its private measurements and release status are under `search_tail_latency_20261001`
in the operator artifacts root.

Read-only profiling separated set HTTP, parser CPU, name RPC pages, and parent
hydration. With1,382 visible sets, the old parser spent1.3–1.8 seconds in its first
two measured executions, then16ms once regex compilation warmed. Screening
necessary query words before constructing each alias expression reduced those
local parser samples to5–9ms. These are CPU measurements, not end-to-end promises.

The screen uses one request-local Unicode case-insensitive word expression.
Only plausible aliases reach the original phrase matcher, which retains quote,
order, punctuation, identifier, connector and ambiguity behavior. It does not
share caller-visible catalog results, change database queries, or change schemas.
Regression checks cover large unrelated catalogs and Unicode folding as well as
the existing artist/name/set/finish journeys. The private full-catalog comparison
and hosted readback record qualification and actual release separately.

## Released database repair

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
