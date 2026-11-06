# COLLECTOR_REVIEWED_INTAKE_V1

Status: Active; schema479 and Edge version1 deployed and independently verified.
Global writes enabled at control revision8 with an empty QA allowlist after
integrated build508 and live web qualification on October 28, 2026. See
[the release checkpoint](../checkpoints/APP_REFINEMENT_RELEASE_ACTIVATION_20261028.md).
Owner: grookai vault founder. Effective: October 27, 2026 (America/Denver).

## Scope and authority

Private collector purchase lots, reviewed scan/manual batches, exact-copy
acquisition allocation, resumable saving and owner-recorded sales. Existing
canonical card/printing identity, Vault ownership and disposition writers remain
authoritative. No catalog, identity, market price, public sharing, payment or eBay
publication is authorized by this subsystem. Vendor store batch intake remains
governed separately by `VENDOR_BATCH_INTAKE_V1`.

The initial source is merged main `aae9893f828b9d81c136ea154a0086e1bf0072d7`,
matching independently verified production 477. The old pending
`20261021010000_purchase_lots_batch_intake_v1.sql` is preserved evidence and must
not be deployed. New SQL must be forward-only and separately qualified.

## Review and canonical copies

- Only an explicit `confirmed` item state may create inventory. Missing, null,
  malformed or other states never pass as confirmation. Pending items remain
  pending after a partial save.
- A canonical card UUID is required; an optional printing must belong to that
  card and satisfy the existing eligibility writer. Name/set hints do not create
  or override canonical identity.
- Use the existing exact-copy add RPC. Persist its actual instance IDs and verify
  actor ownership. Never synthesize a successful saved-copy response.
- One item contains 1–100 copies; a batch contains at most 500 items/copies under
  the existing bounded payload. Requests and nested structures are validated
  explicitly, including SQL NULL and JSON null.

## Ownership, privacy and compatibility

- A thin authenticated Edge boundary derives the actor from verified identity,
  ignores client-supplied actor claims and delegates business logic to PostgreSQL.
- Only the privileged request wrapper is callable by the backend service role.
  The inner executor is not available to API roles. Anonymous/authenticated
  clients cannot invoke privileged inventory functions directly.
- Lots, batches, item payloads, costs, allocation evidence, sale supplements and
  operation records are private. Owner checks apply to every action. Existing
  public/family/community readers must not gain acquisition metadata by accident.
- Photos remain in an explicitly private JPEG/PNG bucket under the authenticated
  owner's path. No cross-owner read/write, public URL or incompatible existing
  bucket configuration is accepted silently.
- The existing native/web request actions and `{ok:true,result:...}` success shape
  remain compatible. Known business failures return safe codes/statuses and an
  opaque operation reference; raw SQL errors, request bodies and credentials
  never enter client responses or diagnostics.

## Atomicity, idempotency and recovery

- Batch locking serializes commits. Repeated/concurrent commits return the same
  exact-copy IDs and never create a second set of copies. Lost responses remain
  recoverable through owner-bound batch readback.
- Draft saves preserve confirmed/saved membership and detect stale conflicting
  edits. Saved origins/currencies cannot be rewritten through older clients.
- A failing item rolls back every copy, cost/reserve change and business event
  made by that operation. The wrapper catches business failure in an inner
  exception block and persists a final failure record outside that rollback.
- Every accepted request has one persisted final success/failure record, explicit
  version, deterministic actor/action/input fingerprint, operation ID, stage,
  timestamps and safe error code/detail. Success references durable business
  state. Diagnostics exclude raw notes, photos, request bodies, tokens and keys.
- A transport failure retains the client's durable review and stable IDs. An
  uncertain result is reconciled by readback/retry rather than guessed success.

## Costs and sales

- The collector's reviewed acquisition day must populate both intake `acquired_on`
  and canonical `acquisition_date`, which existing profitability readers use.
  Native/web capture the selected local day, its UTC instant and historical UTC
  offset together; retries and recovered drafts preserve that capture. Validate
  paired metadata and civil-day consistency, including timezone/DST boundaries.
  Older snapshots without metadata use an explicit UTC calendar convention.
- The frozen forward repair changes only committed, owner-matched reviewed-intake
  copies still carrying null or their creation-time default. Explicit different
  acquisition timestamps and unrelated inventory remain untouched.

- Money uses integer minor units or validated finite two-decimal amounts within
  explicit bounds. Unknown basis stays unknown. No implicit FX conversion or
  invented valuation is introduced.
- Known lot totals cannot be exceeded; unassigned reserve remains explicit.
  Currency/revision checks are revalidated at commit. Competing stale allocations
  cannot spend the same reserve twice.
- Cost revisions require a reason and append evidence. Disposed copy costs are
  locked. Compatibility policies cannot forge another user's lot/intake origin.
- Sales use the existing exact-instance disposition writer. Fees, sold date and
  stable request identity are private supplemental records keyed to its actual
  disposition; existing sale events are not rewritten.
- Concurrent identical sale retries produce one disposition and one supplement.
  Conflicting reuse of a request ID fails. Fees and acquisition basis do not imply
  a comparable profit across different currencies.
- Recording a sale here does not create or publish an eBay listing.

## Rollout and completion gates

New inventory writes start disabled, with an explicit service-controlled canary
allowlist and audited revision-checked control changes. Reads and recovery remain
available while new writes are paused. A client cannot activate the writer.

Release requires frozen source, genuine fresh full-source replay with the
declared historical prerequisite, retained-data upgrade, repeat/no-op proof,
full schema/security comparison, actual grants/auth/Storage checks, atomic
failure persistence, concurrent/lost-response recovery and compatible Edge
envelopes. The read-only 477 baseline gate cannot authorize this feature release.

Normal hooks, exact committed qualification and CLI dry-run/apply precede Edge
release and independent readback. Production canary uses disposable accounts;
the founder's account remains preserved. Global activation follows successful
canary evidence. The normal Samsung scan → review → save → Vault → restart/retry
journey and family/community privacy checks remain completion requirements.
