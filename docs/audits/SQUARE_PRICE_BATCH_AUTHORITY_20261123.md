# Square durable price batch candidate — November 23, 2026

Implementation branch: `feat/square-bulk-price-authority-20261123`, based on
canonical source `4b5489e4dd4bc43d7f12933f63783c63e9a73dd6`. The root operator
workspace and the duplicate release source were preserved.

Evidence root:
`C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/bulk-authority-v1`.
This is an unmerged candidate. Production changes, main merges and app installs
for this stage: zero. The 100-vendor, 100,000-card daily tail is unqualified.

The fresh unchanged strict V16 AuditLinkedSchema starting gate passed before
feature integration. It compared actual production521 with the qualified
canonical baseline in all four governed schemas and security, with zero writes.
Canonical522 was separately owned; that starting witness is not a Square
PrePush/apply gate or a claim about later production state.

The qualified protocol/pricing/recovery source from `5b53cbe9` was integrated
without replacing the newer catalog contracts or operator history. Three old
prototype migration files and every old lab were retained unchanged. A new
ordered canonical522-to526 package carries their exact payload bytes before
the new batch authority; `forward-package-provenance-v1.json` binds all copies.
It is not a renamed history for the earlier prototype databases.

The new owned database `square_bulk_authority522_20261123_v1` was cloned from
the qualified retained canonical522 lineage. Its original parent and all449
protected-table fingerprints remained exact. No borrowed lab was stopped or
seeded. The candidate initially underwent rollback-only real SQL/role checks.
Two query-name ambiguities were corrected before persistent application; failed
checks and source copies remain retained. A later expectation mismatch was a
test error-code assertion; the production barrier already denied the action.

Seventeen real local SQL/RPC scenarios passed, including default-off admission,
role/tenant/lease denials, immutable requests/members, old-writer exclusion,
continued reads/deselection, source-change cancellation before dispatch,
disabled admission recovery, catalog kill, missing receipt, post-dispatch
privacy change, known rejection plus complete original readback, unknown and
partial effects, and takeover of an interrupted attempt. These checks used
actual SQL roles; they do not claim HTTP Auth sign-in qualification.

The official CLI2.90.0 applied the exact four forward files once to the owned
clone and a second push reported no pending migration. The first harness run
stopped before apply because it incorrectly truncated historical short migration
IDs. The second applied successfully and stopped during the security audit
because its whitelist omitted PostgreSQL composite row types. The third audit
reused that same consumed apply receipt; SQL was not reapplied or edited.
All failures and the original applied source remain retained.

`owned-upgrade526-v3/result.json` passes: ledger526, all449 protected tables and
the original parent exact, all pre-existing security owners/grants/properties
unchanged, only the two intended catalog function bodies replaced,27 intended
new security objects and default-off batch control. Private helper execution
remains denied. `four-schema-delta-v1/result.json` also passes complete existing
object preservation and explicit candidate-addition checks, with zero remaining
diff SQL in public, grookai_square, grookai_inventory and grookai_vendor_pricing.
Generated diff SQL was never executed. This is not new empty526 replay proof.

The candidate backend uses the established writer lease and shared SDK. It
saves a whole request before begin, sends its literal text and reconciles every
saved member after uncertainty or rejection. Tests caught and fixed database
receipt-loss classification. jsonb request-key ordering is also covered: the
inspection view comes from the saved literal request, preserving its byte hash.
Unit fault injection is separate from actual provider or persistent-DB proof.

Local PostgREST/Kong uses the already qualified pinned images and official CLI
local credentials on loopback55831, against only the new owned database. The
shared SDK worker checks and their retained reports are in the same evidence
root. The provider in these checks is synthetic; actual Square throughput is
not claimed. Normal managed/hosted checks are still pending for this source.

Persistent shared-SDK HTTP checks passed an immediate 25-member write and a
real Node process exit after a synthetic provider accepted another 25-member
request, before its DB receipt or lease release. A later process waited for the
unchanged 120-second lease, recovered all 25 with admission disabled and made
zero additional provider mutations. Early claims correctly returned busy.
Whole request bytes, keys and normalized members remained exact.

Independent readback exposed a dangling sending-attempt label on an already
observed successful parent. Applied 240040 source remains unchanged. Forward
240050 adds observed-attempt receipts and closes only the fully observed
terminal sending record. Unknown/rejected attempts remain retained. Exact SQL
SHA-256: 23a3662d6853044008b24f381a8753f09bb2eea00c94bf514b1bbf9a6df1efcc.
The official CLI applied it once locally; no-op and complete four-schema/security
checks passed in owned-upgrade527-v4. A pre-apply harness hash typo, a post-apply
audit omitting the intentional attempt-row change and an unexecuted harness
syntax error remain retained. Later audits reused the consumed apply receipt.
No applied SQL was rewritten or reapplied.

Two further 2-member writes exercised the corrected authority. Final independent
readback passes for all 54 synthetic copies across two vendors and four requests:
54 catalog prices acknowledged, source asks unchanged, three observed attempts
and one retained unknown attempt, no pending parent or sending attempt, zero
stock/sale/refund/return rows created and admission restored off. HTTP anon and
wrong-owner service calls are denied. Readback harness query errors remain
retained. This does not prove Auth sign-in, deployed scheduling or live capacity.

Current source passes 160 Square tests, 20 vendor-pricing tests and 12 eBay
tests. The same direct Square command passes 146 in retained 5b53cbe9 source,
confirming all 14 new tests are included. Direct Node checks do not replace
normal managed hooks or hosted exact-head verification.

The later [replay and concurrent-service audit](SQUARE_PRICE_BATCH_REPLAY_20261123.md)
closes new-prefix replay, complete fresh/populated equivalence, official export,
real local HTTP Auth, bounded older-writer exclusion and continued sale/withdrawal
checks. Its provider remains synthetic; it does not qualify hosted clocks.

Remaining: exact current-canonical release gate, simultaneous clock admission,
scheduled/focused/manual integration, both-clock flag wiring, varied-reference
and artwork/manual-price profiles, the complete100,000-copy pricing-to-POS tail,
new-card saves during that backlog, real provider/hosted-clock capacity and
normal exact-head managed/hosted review. The reader sale remains owner-deferred.
Main and production publication remain held by the shared coordination pause.
