# Existing Stripe seller connection V1

This candidate connects a dashboard-created seller without fabricating an app
creation attempt or provisioning a second Stripe account. It is not released.
Checkout, orders, commission policy, taxes and payouts are separate capabilities.

## Authority

An operator-reviewed private grant binds one owner, store, Stripe platform,
provider mode and existing connected account. It retains a hash of the confirmed
owner email and of the approval record, expires within seven days, and defaults
disabled. No grant is created by the migration or an environment flag. Before
issuing one, the operator must verify the exact platform/account using a platform
API credential, the real app owner/store and the user's account-selection intent.
The operator module and fixed-scope CLI implement plan/apply issuance. Planning
performs GETs and writes a private local review file only. The 30-minute plan hash
binds the project, migration bytes, owner/store, provider account/mode, email hash
and proposed 24-hour grant. Applying requires the independently reviewed hash,
fresh provider GETs, clean released source, qualified full replay, retained-data
upgrade, real Auth/HTTP proof, matching deployed alias and fresh schema/security
parity. No production grant has been issued. Do not insert an ad-hoc grant.

`vendor_seller_issue_adoption_v1` is service-only. Direct service table inserts
are denied. It locks the exact provider account, Auth identity and owner/store;
rechecks current email confirmation/hash, package, rollout, holds and prior
deauthorization; and inserts only the approved grant. Conflicting approvals fail.
Lost-response retries return the same approval without re-enabling a revoked one.
Issuance creates no seller binding and grants no checkout or staff permissions.

The authenticated owner confirms through `/api/vendor-payments/adoption`. Its
only accepted request is `{ "action": "connect" }`, with exact same-site Origin.
The server derives the owner from `Auth.getUser`, loads the grant, and verifies
current Stripe identity, controller and mode using four GETs. Both platform and
connected Balance mode must match. Email comparison is supplemental evidence,
not sufficient account ownership authority. Client IDs/evidence are rejected.
Errors and receipts exclude raw identities, bank details and provider payloads.

The service-only SQL consume operation independently checks the approved scope,
fresh observation, confirmed Auth email, store ownership, package access,
publication-system availability and financial holds. It uses the same account
advisory lock as Connect deauthorization, then the owner/store lock. Expired or
revoked grants cannot create a binding; concurrent retries return the existing
row. A disconnected/closing row cannot reopen. Creating a grant over an existing
reservation/binding is rejected. Legacy creation cannot reserve an owner with an
adoption grant, preventing duplicate provider accounts.

## Provenance and compatibility

Adopted rows have immutable `adoption_grant_id` and `adoption_evidence`, and null
`creation_attempt_id` / `creation_started_at`. Legacy rows retain their original
constraints and creation/recovery semantics. No fake creation receipt is allowed.
Existing status, fresh readiness, event invalidation and financial closeout reuse
the existing binding. Adopted accounts cannot enter V1 creation recovery or V1
hosted-onboarding verification. Later identity updates currently use the seller's
full Stripe Dashboard; generating adopted-account onboarding links is not part
of this candidate.

Approval history is retained. At most one enabled approval exists for an owner,
store or provider account. A fresh operator plan may explicitly name an expired,
still-enabled predecessor using `replacesGrantId`; issuance locks and verifies that
exact predecessor, disables it, and inserts a new approval linked by
`replaces_grant_id`. Account/store scope cannot change. Missing, live, revoked,
superseded or concurrently consumed predecessors are rejected. A historical
provider account cannot be reassigned to another owner through this path.

Approval metadata and expiry are immutable. The database trigger permits only
true-to-false revocation (and no-op updates), including for direct service-role
updates. A revoked approval cannot become enabled again. Same-plan retries retain
their original identity and never revive revoked or superseded approvals.

Connecting does not assert readiness or enable checkout. Readiness remains a
fresh provider read using the existing conservative policy. Actual platform,
account/controller/mode and capability fields passed live readback on September29;
refresh them during issuance/connection. Do not substitute a dashboard badge.

## Activation and validation

`GROOKAI_VENDOR_SELLER_ADOPTION_ENABLED=true` enables the new route only when the
existing seller runtime and its credentials/webhook configuration are valid.
The new private database grant remains independently required. Keep ordinary
onboarding and all buyer checkout controls disabled during the connection release.
Turning off this flag stops new adoption; retained bindings and obligations stay.

The strict baseline compares fresh production408 with its qualified full408
replay, using the unchanged pgkit schema/security comparator. The new strict mode
is read-only and rejects PrePush, combined modes and target overrides.
The409 schema candidate must pass full isolated Supabase replay, upgrade parity,
actual Auth/API proof, complete release checks and a new exact-payload production
gate before deployment. The supplementary native PostgreSQL16 subset proves SQL
roles, behavior and locks, not complete Supabase17 compatibility or a release.

## Operator commands and retained proof

From the isolated candidate, `node --use-system-ca
scripts/stripe/run_seller_adoption_operator_v1.mjs plan` prepares the fixed founder
scope from the private target file. It reads the encrypted verification key only
in memory. No secret belongs in command arguments, plans, logs or receipts.

`apply <seller-approval-TIMESTAMP.private.json> <reviewed-sha256>` accepts only a
plan in the fixed external `seller-approval/` directory. Its release.private.json
must bind projectRef, commit, migrationSha256, deploymentId, fullReplayReceiptSha256,
upgradeReceiptSha256 and authHttpReceiptSha256 with status passed. These must be
real release receipts; creating a claim file is not a replacement for executing
the release gate. Source proof directories are replay-409, upgrade-proof and
http-proof-TIMESTAMP under `.local/integration/seller-adoption-v1`. The release
receipt selects that directory with httpProofDirectory. The latter records real
Auth proof, matching source hashes, migration bytes, project and release commit.
Expired plans must be regenerated and reviewed, not extended in place.

References:
- [Accounts v2 interoperability](https://docs.stripe.com/connect/accounts-v2/migrate-integration)
- [Stripe Account fields](https://docs.stripe.com/api/accounts/object)
- [Implementation checkpoint](../ops/VENDOR_SELLER_LINK_20260928.md)
