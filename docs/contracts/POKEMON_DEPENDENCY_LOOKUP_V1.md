# Pokemon dependency lookup V1

The separate `POKEMON_DEPENDENCY_FRESH_ABSENCE_V1.md` API qualifies explicit
fresh-only zero-reference reads. It does not change this complete aggregate
contract or silently switch any existing executor/receipt version. Both readers
share the same fresh metadata query; retained scopes continue hashing every row.

This shared read-path gate governs Classic102 and World2010 outside-dependency
aggregates. It grants no schema, identity, mapping, finish or production apply
authority. Each nonempty aggregate now receives fresh physical table-size/index metadata
and a nonexecuting JSON EXPLAIN before execution. Empty scopes retain the exact
empty SHA256 aggregate and their existing pending-generated-ID markers.

Scopes must contain at most1024 lossless signed bigint or UUID IDs with one exact
catalog-bound FK column. Identifiers are validated and values parameterized. The
caller retains the unrestricted-role check, transaction/source/catalog fences,
generated-journal identity reconciliation and bounded statement/lock timeouts.
The gate does not change any predicate, dependency hash or retained-row invariant.

For ordinary tables larger than1MiB, require a live/ready/valid nonexpression
leading-column B-tree and an actual indexed predicate in the plan. Full indexes
must have no predicate. A partial index qualifies only when its fresh catalog
`pg_get_expr(indpred, indrelid, false)` is exactly `(column IS NOT NULL)` (including
the equivalent quoted identifier form) for that same leading FK column. The
unchanged equality/ANY query over validated nonnull IDs implies this predicate.
No arbitrary SQL normalization or general implication inference is permitted.
Wrong columns, AND/OR, active-only slices and all other predicates remain rejected.
The aggregate adds no filter and retains inactive/duplicate references. Index
validity, readiness, liveness, plan access and all size/cost limits still apply.
Reject large sequential scans, other relations, unsupported plan nodes, estimates
above65536 rows or total plan cost above20000. No optimizer flags are changed.
Tables at most1MiB may use bounded scans, explicitly classified as small-relation
proof only. Table size including TOAST comes from pg_table_size, not stale relpages. Partitioned
or foreign tables need a separately qualified extension; fail closed meanwhile.
Reinspect before every aggregate; cached or empty-array plans cannot qualify it.
EXPLAIN is an estimate, not an execution guarantee. Existing runtime timeout and
transaction rollback boundaries still apply. Actual production runtime remains
a separate prerequisite, including final generated IDs under the source fence.

The read-only observation CLI requires explicit Classic plan, World plan, CA file
and a new output directory. Two independent verified-TLS/read-only connections
must agree on scope hashes, catalog/index definitions, schema and policy decisions.
It checks every outside FK with nonempty IDs. Pending generated scopes use explicit
prospective bigint probes at the appropriate batch size. These are never described
as actual generated IDs, zero-reference evidence or runtime qualification. No
dependency aggregate executes in this inventory; every blocked path stays visible.
Costs and table growth from healthy workers may differ; raw observations are retained.

The isolated proof creates a NEW loopback database with250000 synthetic rows and
one synthetic B-tree. It verifies unindexed refusal, exact102/92 digests, absent
nonempty IDs, index-removal rollback, payload-change detection and independent
full-row preservation. This is not a production index migration or Supabase17
schema replay. Full Classic/World transaction proofs must also run on final code.

The separate `pokemon_dependency_nonnull_lookup_v1.mjs` proof requires a NEW
loopback `grookai_dependency_nonnull_*` database and immutable output directory.
Its250102-row fixture includes50000NULL rows and102inactive duplicate references.
Actual bigint/UUID102/92lookups must match an independent full-row digest using a
different membership query. Wrong-column/AND/OR/active-only indexes, a genuinely
failed concurrent unique index build, index removal and inactive payload mutation
exercise rejection and rollback. Independent whole-table readback proves retained
rows. No catalog flags are manually altered; validity-flag combinations also have
contract regressions. Local checks do not prove production runtime or migration.

Before a real index migration, the strict AuditLinkedSchema must pass; before
production schema apply, follow the unchanged migration contract, complete replay,
retained upgrade, exact-pending/clean-source/normal-hook gates and new apply intent.
The current worktree audit failure is retained in the private checkpoint. No
unqualified migration is authored or applied by this change. Existing migrations,
historical packages, consumed integrations and the healthy hourly worker stay intact.
