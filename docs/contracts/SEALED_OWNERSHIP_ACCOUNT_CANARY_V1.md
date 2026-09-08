# Sealed Ownership Account Canary V1

Date: 2026-09-08. Status: locally implemented and tested, NOT deployed,
NOT production activation authority. Parent: `SEALED_OWNED_COLLECTIBLES_V1.md`.

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
  exact Pokemon and MTG variants, no anonymous additions. Do not populate
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
393-migration replay. No production canary table, grant or switch was created.
The candidate is not a frozen production apply plan until its final execution
commit and exact migration hashes are recorded under release governance.
