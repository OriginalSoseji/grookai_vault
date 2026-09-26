# VENDOR_STOREFRONTS_V1

Status: local implementation candidate, publication disabled by default.
Scope: one owner and one browse-only store per account. Billing, orders, checkout,
staff accounts, custom domains and production activation are separate work.

The additive `VENDOR_CUSTOM_COLLECTIBLES_V1` contract extends this candidate with
separate seller-authored products and the mixed `VENDOR_STORE_V2` projection.
The exact-copy eligibility and V1 RPC remain intact. Custom products never become
Vault inventory or canonical records; see that contract for their stock, sections,
publication, media and rollback rules.

## Ownership and presentation

`vendor_stores` holds a stable UUID, unique owner and slug, branding pointers and
separate app/web publication states. `vendor_store_items` selects existing physical
`vault_item_instances`; `vendor_store_sections` selects and orders existing owner
Wall sections. None duplicates inventory, ownership, price, condition or identity.
Deleting an underlying object cascades its presentation references; normal archive
and transfer simply make the selected copy ineligible on the next read.

Client base-table access is owner SELECT only. Mutations use owner-authenticated
security-definer RPCs with an empty search path. Anonymous users cannot read drafts,
membership tables, private media or the referral ledger. Store media lives in its
own private bucket, with store-owned immutable object paths and a 5 MB JPEG/PNG/WebP
limit. It never overwrites collector profile assets. Old replaced objects remain
private; garbage collection is not part of this phase.

Slug normalization matches profile normalization: trim, lowercase, whitespace and
underscores to hyphens, collapse/trim hyphens. Slugs are 3–63 letters/digits/hyphens;
`owner` is reserved for the owner API. Database uniqueness is authoritative. The
slug freezes at first publication, including app-only publication.

## Access and lifecycle

The existing `user_entitlements` authority gains JSON boolean features `store_app`
and `store_web`. Only active database grants count; an active user-ID grant takes
precedence over an email-only grant. Web capability also requires app capability.
Environment allowlists, tier names alone and client booleans grant no store rights.

The proposed $30 package maps to app=true/web=false; $50 maps to both true. These
are package simulations, not billable subscriptions. Existing signed-in Vendor Mode,
pricing, QR/card sharing and manual disposition retain their prior access rules.

`vendor_store_rollout` is a service-controlled singleton; both flags start false.
Creation, section selection, ordinary pricing changes and upgrades never publish
or select another copy. Publishing app and web are distinct explicit actions.
Publication needs at least one currently eligible selected copy. Adding a copy to
an already published store is explicit and confirmed in the native UI.

The entitlement trigger clears affected publication states on downgrade/revocation,
serialized against publication. Re-upgrade never restores those states. Reads also
recheck active capabilities, flags and ownership. Retained owner settings, selection
removal, previews and unpublication remain accessible after downgrade. Saving new
settings/selections/media requires app access. Public unavailability is generic.

## Shared exact-copy projection

`vendor_store_read_v1` emits `VENDOR_STORE_V1` through the shared server transformer.
It returns independent rows for physical siblings. App and web use identical
selected copy IDs, prices, conditions, printings and eligibility. Public release
is required even for signed-in app and owner preview: staged `signed_in` game/set
catalog releases cannot expand a store's public selection. Existing governed
catalog visibility and quarantine-aware public printing functions remain read-only
dependencies; the storefront adds the stricter public-audience release check.

A publishable copy must be explicitly selected, active and still owned by the store
owner; have public-profile and Vault-sharing permission, Sell intent, asking pricing
with a finite positive amount and a currency code; have a visible canonical parent,
canonical GV-ID and usable GVVI detail identity; and have an assigned same-parent
printing with its existing printing GV-ID, active finish and no public truth quarantine.
Passing this boundary is not complete Master Index verification. No finish, market
price or qualified artwork is inferred. Missing images use established placeholders.

Owner management lists active owned card copies, including unassigned/ineligible
copies with reasons. Public and preview counts are calculated after eligibility.
Section contents intersect explicit store-copy membership with existing section
membership. Search covers name, parent GV-ID, printing GV-ID and GVVI. Filters cover
selected section, condition, raw/slab. API pages are 40; RPC limits are 1–100 and
offsets 0–100000. Query length is bounded to 120 characters.

## Routes

| Route | Authority |
| --- | --- |
| `/store/{slug}` and `/api/stores/{slug}` | Anonymous database client, web publication/capability |
| `/store/{slug}?preview=1` and `/api/stores/{slug}/preview` | Authenticated exact store owner |
| `/api/stores/{slug}/app` | Authenticated viewer, app publication/capability |
| `/api/stores/owner` | Authenticated owner settings/inventory/actions |
| `/api/stores/{slug}/media/{kind}` | Public web authority |
| `/api/stores/{slug}/app/media/{kind}` | Authenticated app authority |
| `/api/stores/{slug}/preview/media/{kind}` | Exact owner authority |

Audience comes from the route, never a client query or capability flag. All store
APIs/media are private/no-store. Dynamic pages are uncached and use generic metadata.
Media delivery rechecks access and streams private bytes; it emits no durable signed
URL. Owner cookie mutations and referral entry require the governed site origin;
native owner mutations may use authenticated bearer tokens without Origin.

`/u/{slug}` remains the collector and follow surface. Exact-copy links remain
`/gvvi/{GVVI}`. `/q/{GVVI}` is unchanged. Native canonical/deep links preserve store
and owner-preview destinations through sign-in. Web browsing requires no app install.

## Signup attribution

Encrypted AES-GCM cookie contexts expire after 30 days. V1 GVVI tokens remain valid;
V2 carries only store UUID and timestamps. Vendor identity is derived server-side.
The service-only `vendor_referral_credit_v1` RPC compares the authenticated account's
actual `auth.users.created_at` against that interval, rechecks current offer/store
eligibility, excludes self-referral and inserts into `vendor_referral_signups`.
The referred-user primary key awards at most one credit across contexts/concurrent
callbacks. Account/store deletion removes personal attribution references.

Client `account_created` telemetry is not signup evidence. Client-created
`vendor_referred_signup` is rejected. The tracker deduplicates the actual event
name; best-effort analytics follows authoritative insertion. Attribution failures
never block navigation/authentication. Cross-device and deferred-install attribution
are unsupported.

## Integration and rollback

See `docs/audits/vendor_storefronts_v1/LOCAL_IMPLEMENTATION_20260917.md` for proof and
remaining gates. No release is implied. Future schema application must recheck active
catalog repair dependency fingerprints and strict migration preflight. Reconcile
native routing with Vault-add PR #473. Do not copy dirty repair/search worktrees.

Rollback disables both new rollout read/publication flags and returns to prior
clients. Retain the additive tables, metadata, selections and existing Vault data.
Do not drop the schema, change inventory ownership, or revoke legacy vendor access.

The full-app Android password/refresh/pending-route proof and coordinated review
packet are recorded in `docs/audits/vendor_storefront_native_auth_v1/NATIVE_AUTH_PROOF_20260918.md`.
This local proof does not authorize merge, remote schema application or release.
