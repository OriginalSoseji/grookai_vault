# Square catalog sync V1

Status: active implementation contract; default-off local candidate, not released.

The owner connects an existing Square merchant once, chooses an active location,
selects exact-copy vendor stock in grookai and requests catalog sync. Optional
ongoing sync applies only to that explicit selection. Square creates the catalog
item/variation; grookai continues generating the existing public `/q/{GVVI}` QR.
The full unchanged URL is the Square variation SKU. Names never identify stock.
One exact GVVI is one mapped variation; no new canonical or inventory identity.

V1 automates catalog creation, asking-price and condition/name updates only. New
variations track inventory but receive no allocated stock. Catalog sync must not
be presented as sale, payment, refund, receipt or stock reconciliation. Enabling
sellable Square quantities requires a later shared-allocation implementation
that respects existing Stripe and eBay claims. No quantities, existing stock
settings, taxes, modifiers, siblings or payments are overwritten by this sync.

Linking and publication are independently default-off and owner-canary scoped.
All user identity comes from shared Supabase SDK verification. Owner HTTP actions
reject foreign browser origins; native bearer requests can omit Origin. Private
service-only database authority owns connections, hashed single-use OAuth state,
browser binding, encrypted credentials, target selection, fenced leases, immutable
provider requests and receipts. No user can read tokens or dispatch service RPCs.

OAuth authorization-code exchange begins only after atomic expiry/browser/state
consumption. Ambiguous code exchanges require fresh owner consent; they are never
automatically repeated. Verify the immutable Square merchant and prevent an
environment/merchant from binding to another owner. Relinking cannot change that
identity. Tokens stay encrypted server-side with domain-bound authenticated data.
Refresh is serialized and its durable attempt starts before provider IO. An
uncertain refresh stops writes until safe credential recovery/reconnection.

Before preparing each item, reprove active ownership, vendor entitlement, public
profile/sharing, exact-copy sale intent, positive exact USD asking price and
existing public printing eligibility. Client booleans never establish eligibility.
Unselected/private/ineligible targets cannot create or update items. Losing
eligibility pauses the target and surfaces a conflict; it does not silently erase
merchant data or mark the Vault copy sold. No public Square Online channel is
enabled by grookai. Existing merchant settings require review before first sync.

Existing unmapped same-SKU items require explicit owner adoption of the observed
unique item/variation. Duplicate SKUs, missing mapped resources, different merchant,
changed Square managed fields and shared multi-variation items require review.
Never create a replacement merely because a lookup failed or mapping is missing.
Provider reads must be complete; partial pagination is an error, not empty stock.

Square full-object replacement requires current versions and complete observed
objects. Persist the exact payload and idempotency key before sending. Serialize
mutations per merchant. Record sending before IO, retain ambiguous outcomes and
recover the same attempt/key; never generate a replacement create on timeout.
Persist sanitized failures and provider receipts. Credential errors pause new IO.
Stopping new work preserves unresolved operations and reconciliation history.

Backend orchestration lives in workers; web/native routes are thin. Production
credentials, access/refresh tokens, provider codes, state and browser capabilities
never enter logs, client bundles, mobile defines, fixtures or committed artifacts.
Strict TLS, fixed provider origins, redirect rejection, bounded IO and pinned API
versions apply to every provider request. No payment/customer permissions belong
to catalog-only linking. Use only catalog read/write and merchant/location reads.

Release requires current baseline qualification, forward-only source, genuine
fresh replay, retained-data/no-op proof, real role/Auth isolation and OAuth/browser
expiry/replay tests, interrupted provider writes/refreshes, concurrent workers,
existing-item adoption, conflicts, actual Square Sandbox proof and normal hosted
checks. Owner consent and configuration are separate from implementation. All
production schema/deployment/activation steps retain their explicit release gates.
