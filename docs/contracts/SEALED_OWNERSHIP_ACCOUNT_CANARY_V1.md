# Sealed Ownership Account Canary V1

Date: 2026-09-08. Status: schema applied and independently verified in production,
default off and grant-empty. NOT production activation authority.
Parent: `SEALED_OWNED_COLLECTIBLES_V1.md`.

## September 9 Single-Product Scope Amendment

The founder selected Blooming Waters 151, reviewed the account-only activation
request, and explicitly answered "yes" when asked to confirm enabling that
test without automatically adding inventory. This supersedes only the original
requirement to include both Pokemon and MTG in every canary. A frozen plan may
now select one or two exact released Pokemon/MTG variants. The old two-product
plan remains historical and unchanged; no product may be substituted in it.

This documentation amendment applies to the preserved executable commit
`222b6dee132c596f9726301ba4e3fcdfdac75c2f`, plan
`a1d2d35fa883ab65899b195f455ccfe7785c9cabb3baf50a2cf596edbcb903f6`, execution
`74a928f44cfb1e294a11d5ecc65ccf3dd097b938b090237f4f8cab0d8dca6590`.
Its sole variant is `4643eb90-c362-57cf-96ea-bca2cd08e82b` (English Blooming
Waters Premium Collection). Do not rebuild its authority from a documentation
commit or alter the frozen execution, source evidence, window or product list.

The corresponding authorization is one existing founder grant, one exact
variant grant and one canary-switch update, with zero inventory creation and
global additions remaining off. The 25-copy cumulative ceiling, frozen 24-hour
window, fresh preflight, locked parity, exact affected-row counts, independent
readback and preservation/rollback boundaries all remain mandatory. Approval
of this activation does not authorize schema, catalog, pricing, Storage,
deployment, deletion, fabricated holdings or sale/trade writes.

## Why This Is Needed

The deployed `sealed_ownership_controls_v1.enabled` switch and
`get_sealed_ownership_capabilities_v1` are global. A client-only account check
cannot restrict direct RPC callers. Do not enable the global switch and call
that a one-owner canary. Current migrations are already applied and their
single-use authorities cannot be reused.

## Minimum Server Change

- Preserve the existing broad-release switch and keep it false during canary.
- Add an independently default-false canary switch and service-only grants
  for exact owner IDs and exact released sealed variant IDs. Default empty.
- Bind each grant to a frozen plan fingerprint, start/end timestamps and a
  cumulative creation limit. Initial plan: one owner, at most 25 copies,
  one or two exact Pokemon/MTG variants, no anonymous additions. Do not populate
  grants or turn on switches as part of a schema-only migration.
- Force RLS and clear inherited grants. No anonymous/authenticated direct
  reads or writes to grant tables; no self-enrollment RPC. Expose only the
  caller's effective capability, not other owners or the allowlist.
- Use the same policy for capability reporting and the authoritative add
  writer. Bind identity to auth.uid(), never a client-supplied owner ID.
- Serialize budget checks and creation under the existing owner row lock.
  Count all lifetime successful sealed creations for the owner from the bound request journal,
  including subsequently sold/traded/removed copies. Removing inventory
  must not replenish the canary budget. Never count a retry twice.
- Preserve exact request replay before checking whether new additions are
  enabled. A previously committed request remains recoverable after expiry
  or rollback; a different payload with its request ID remains a conflict.
- Variant membership, release visibility, identity, price eligibility and
  media privacy checks continue unchanged. Canary permission is not catalog,
  pricing, image, shared visibility or counterparty-transfer authority.
- Expired or revoked grants fail closed. Rollback disables both addition
  switches and revokes grants, preserving existing reads, totals, photos,
  sale/trade/removal and transaction history. No schema rollback or deletion.

## Required Tests Before A Migration Plan

1. Empty/default configuration denies new additions for every caller.
2. Allowed owner plus allowed variant works only within the grant window.
3. Other owner, other variant, hidden release, expired/revoked grant and
   anonymous caller all fail, including direct RPC calls.
4. Capability response agrees with writer eligibility; no cross-owner data.
5. Concurrent additions cannot exceed the cumulative budget.
6. Repeating a committed request returns its original result with no new
   copies or budget consumption; changing its payload fails.
7. Selling/removing a canary copy does not restore its creation allowance.
8. Disabling additions preserves totals, ownership, media and history.
9. Existing card/slab paths and ordinary sealed behavior remain unchanged.
10. Exact ACL/forced-RLS checks, replay idempotency, full migration replay,
    negative authorization tests and source/plan hashes all pass.

## Release Sequence

1. Complete schema baseline comparison. A generated linked diff is diagnostic
   only; never execute it to make the comparison pass.
2. Implement the minimal forward migration and local SQL/concurrency tests.
   Do not expand the existing schema-reconciliation exception list.
3. Freeze a clean execution commit and exact schema-only apply plan. Obtain
   its governing production authority; previous applied hashes are historical.
4. Apply/read back the exact schema plan, still default off and grant-empty.
5. Complete outstanding browser file-picker/print/removal and native iOS
   acceptance. Local fixtures are not founder inventory or public evidence.
6. Freeze a separate owner/variant/limit/expiry activation plan with fresh
   preflight, protected-state hashes, stop conditions and rollback commands.
7. Execute real owner lifecycle/readback under that scope. Never insert fake
   founder inventory or infer authorization from a successful local test.
8. Monitor and reconcile additions, duplicate requests, totals, dispositions
   and media errors. Broad release remains a separate release decision.

## Current Evidence

The September 8 web follow-up proved authenticated removal of two exact local
copies, idempotent retries, unchanged unselected rows, preserved history and
22-to-20 active totals. It did not prove browser confirmation acceptance.
Photo/lot/QR evidence and remaining UI limitations are recorded in
`docs/checkpoints/SEALED_OWNERSHIP_WEB_SECTIONS_20260908.md`.
Candidate migration: `20260908193000_sealed_ownership_account_canary_v1.sql`.
It adds two grant/variant tables, one default-false control column, one private
policy helper, and replaces the capability/add functions. The add writer differs
from the deployed function only at its policy check; identity and journal rules
are preserved exactly by a source comparison test. Lifetime counting deliberately
does not reset after grant edits or renewal; this canary is not a recurring quota.

Local proof: 19 SQL checks, including ten racing connections with a one-copy
allowance (one creation, nine denied), four new source contracts, and a full
393-migration replay. The subsequent exact schema-only approval was executed
from `539fa592d5784d62833b6ee6df6ddb0d30c00366` on September 8. All 393 migrations,
891 security objects and function definitions match the final replay. Both
switches remain false; grant and target tables are empty. The apply authority
is consumed, not permission to enroll users or activate additions.
Receipt: `docs/checkpoints/SEALED_OWNERSHIP_CANARY_SCHEMA_APPLIED_20260908.md`.

## Read-Only Account Plan Producer

`scripts/schema/sealed_ownership_account_canary_plan_v1.mjs` prepares the next
scope without a writer or activation route. `--discover` permits a dirty
checkout for investigation only. Normal plan generation requires a clean
checkout on `feature/sealed-account-canary-boundary` or the explicit-selection
execution branch `fix/sealed-canary-explicit-product`, and records its exact SHA.
Production queries use a verified read-only transaction. Existing service
credentials are never written into artifacts or the repository.

The producer checks all migration versions (including the historical 8-digit
IDs), canonical environment counts, both disabled controls, empty grants and
sealed inventory/journal, forced RLS and no anonymous/authenticated table
privileges. It requires one unambiguous active founder with an existing owner
allocator. Private owner identity and hashes remain outside git.

The original proposed scope is one image-backed, fresh-priced English Pokemon variant
and one MTG variant, chosen alphabetically from each governed first 100-row
page. This is deterministic candidate selection, NOT evidence that the founder
owns either product. Do not add a product the founder does not actually own.
Changing selection requires a new frozen plan, not substitution during apply.
The optional `--selection-file` path instead binds one or two explicit
game/variant/query selections. Each exact ID must resolve once through its
governed bounded search; unrelated results never substitute for a missing ID.
All image, price and release checks still apply. The selection is fingerprinted
in snapshot and plan and replayed both before and inside the locked transaction.
The caller claims simulate release filtering inside the read-only service
connection; they are not an end-user authorization or deployed-client test.

The plan records a 25-copy lifetime maximum, a 24-hour UTC window starting at
capture, exact release/image evidence, protected inventory/control/pointer hashes,
policy hashes, stop conditions and non-destructive rollback requirements.
Artifacts are exclusive-create `preflight.json`, `activation_plan.json`, and
byte-level `ARTIFACT_HASHES.json`. An expired plan, or one with less than an hour
left, must not be activated. Fresh preflight is mandatory before any authorized
transaction; an old snapshot is never authority to ignore drift.

The initial preparation did not include an executable writer. The subsequent
executor now binds its transaction and rollback commands to the exact plan,
uses affected-row assertions and independent readback, and has local expiry,
contention, retry and preservation tests. Implementation is not activation.
Rollback must disable only the sole matching canary and revoke its exact
fingerprint-bound grant; it must never delete inventory or replenish the budget.

## Bounded Transition Executor

`scripts/schema/sealed_ownership_account_canary_execute_v1.mjs` defaults to
readback; `--mode=prepare` is also read-only. Both require the source plan
directory, a new external output directory and a clean execution checkout.
The frozen source commit must be an ancestor; its original byte hashes and
complete plan/preflight relationship must verify. Preparation performs fresh
production parity and produces a separate execution envelope binding the new
code SHA to the unchanged source plan.

`--mode=activate` and `--mode=rollback` require that exact execution envelope,
its fingerprint and an action-specific external authority file. The format is
enforced in code; a schema-only approval does not match. Never create this file
on behalf of the founder without the corresponding explicit authority. Client
production configuration/deployment acceptance remains an operator release gate;
the executor does not deploy or certify installed clients.

The transaction locks the control row, existing owner allocator, grant tables
and current release/visibility rows. Lock timeout is two seconds; statement
timeout is 30 seconds. Activation repeats fresh preflight under those locks,
inserts exactly one grant and the frozen plan's one or two variant grants,
asserts those exact affected-row counts, and compare-and-swaps only the
canary switch. It never turns on broad additions or creates inventory. Rollback
requires the exact sole grant/allowlist, revokes it and disables the canary.
Current owner inventory, allocator, journal, dispositions and protected release
state must remain unchanged across each transition.

Expiry does not prevent rollback. An expired enrollment's stored state is
reported separately from its open/closed time window. Repeated exact transitions
are zero-write in the transaction core; the operator CLI uses a stable exclusive
start marker beside the source plan and never retries mutations automatically.
It refuses to reactivate a disabled or revoked grant. A failed/lost COMMIT is
unknown until independent readback, not presumed rolled back. Preserve the
marker and all failure evidence. A readback failure never authorizes replay or
automatic compensating writes.

Tests and exact next release steps:
`docs/checkpoints/SEALED_OWNERSHIP_CANARY_EXECUTOR_20260908.md`.
