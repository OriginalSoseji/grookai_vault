# Vendor store team V1

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
