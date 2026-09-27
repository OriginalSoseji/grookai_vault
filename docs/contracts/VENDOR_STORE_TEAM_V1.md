# Vendor store team V1

## Opt-in workflow extension (migration405 candidate)

The independent `vendor_store_team_workflow_control` defaults off. When enabled,
owners may explicitly grant `intake`, `sections`, or `custom`; existing grants
and invitations are retained unchanged. The original four permissions and owner
boundaries below remain in force except for these explicitly delegated actions.

- Intake adds one exact raw catalog printing to the owner's inventory. The
  canonical public release and quarantine-aware printing boundary must pass.
  Initial price, section assignment and listing selection each require their
  corresponding grant. Everything commits atomically; a request UUID and exact
  actor/payload receipt make retries idempotent. The actor is never impersonated.
- Sections expose only active sections selected for the store. Managers can
  create/select a new section, rename it, or assign scoped active Sell copies.
  Existing owner section limits apply. Assignment never lists a copy. Renames
  affect the shared Wall section too. Private section membership stays private.
- Custom products permit draft creation, metadata/quantity edits and private
  photos. Pricing, sections and explicit publication need the separate grants.
  Stock guards and version checks remain active. Archive stays owner-only.
  Product images require actor-authorized server delivery and validated upload;
  no manager Storage policy is added. Uploads have a store-serialized20/hour
  budget and attachment rechecks access and product version.

Request receipts retain creation arguments as historical idempotency evidence;
they are not a second current inventory, price or ownership authority. Private
request tables and internal helpers are unavailable to authenticated/anon roles.
Bulk scans/import, billing, payouts, ownership, destination publication and staff
administration remain owner-only. Disabling workflow control immediately denies
the new operations without deleting owner inventory, products, sections or grants.
The original live404 release is preserved. This candidate requires its own
405 upgrade/full replay, real role/concurrency/Auth/Storage/browser proof, normal
shipcheck, review and separate migration/deployment/activation readback.

## Original four-permission release

The owner can grant individual managers these independent actions: existing card
condition, asking prices, store listing selection, and business branding. Each
manager has their own verified account. Billing, payouts, publication, ownership,
team administration, custom products, sections and new-card intake stay owner-only.
No permanent grant or invitation is created by migration, signup or upgrade.

`vendor_store_team_*` tables contain delegated presentation scope, memberships,
hashed email-bound seven-day invitations and actor-attributed events. They carry
no duplicate inventory, condition, price, canonical identity or ownership.
Base tables are closed to anonymous/authenticated roles. Governed RPCs recheck
active database store access, team rollout, membership and the specific action.
Existing owner RPCs retain their original authorization. Never impersonate an
owner or replace the authenticated actor's identity.

The scope begins with explicitly selected store copies and retains those IDs
after unlisting. Every read/write still requires current active ownership and
Sell intent. Held/private personal copies and transfers disappear immediately.
Relisting uses the existing quarantine-aware storefront eligibility boundary.
Independent owner Vault/QR publication semantics remain unchanged.

Writes and revocation lock the same store row before copies. Version checks
prevent stale price/condition/name writes. Concurrent acceptance is idempotent;
revoked or expired invitations cannot reinstate access. Matching confirmed auth
email, not user-supplied metadata, binds the intended recipient. An owner can
inspect and revoke retained team access after downgrade or rollout suspension.

Branding uses immutable store-scoped private paths, accepted JPEG/PNG/WebP magic
and5MB limits. Storage policies also verify active branding membership. Attachment
rechecks authorization after upload; an interrupted upload remains private.
Managers cannot INSERT directly into Storage. The validated server route uploads
only after a store-serialized20/hour budget check; it removes its newly uploaded
object when attachment is denied. Existing owner Storage policies remain intact.
Direct copy RPCs accept only the selected action's keys and at most1024 bytes,
preventing callers from persisting arbitrary extra audit data.
No checkout, payments or staff billing access is introduced.

API responses and private pages are uncached. Exact-origin mutations, bounded
JSON/media bodies, server-generated invitation origins and generic denial errors
apply. Invitation URLs survive safe login redirects but are suppressed in
analytics and referrers. Invitations are copied manually; no email is sent.

Release requires full402→403 upgrade and403 replay equivalence, existing object
and permission preservation, actual role/Auth/Storage/concurrency tests, browser
proof and normal shipcheck. Follow STORE_TEAM_CHECKPOINT_20260927.md; the read-only
baseline mode is not an apply gate. Roll back by disabling team control, retaining
all data and leaving other rollout controls unchanged.
