# Browse-only vendor stores with desktop and native owner management

Owners can configure one store, explicitly select eligible exact Vault copies and
publish seller-described custom collectibles. Storefronts share a bounded exact-copy
read model with live ownership, sharing, printing/quarantine and database package
checks. Public web publication and in-app publication are separate actions; drafts,
upgrades, restocks and ordinary price changes never publish automatically.

The website adds `/account/store` for desktop setup, branding, inventory selection,
custom listing details/photos/quantities/sections, preview and publication. It links
existing web catalog add/import and exact-copy management. Unsaved edits survive
version conflicts and cancelled workspace or main-navigation exits. App-only package
owners can manage from a computer; public web publication requires `store_web`.

Three additive migrations provide storefront metadata, private media policies,
custom products/version conflicts, database grants and authoritative unique referral
credit. This candidate includes PR #473's nullable-printing Vault add, while excluding
unassigned copies from publication. No checkout, subscription billing, staff accounts,
custom domains or changes to canonical identity are included.

Validation: final 12-group real local desktop browser journey, Next production build
and focused lint pass. Earlier retained receipts prove full 397-migration replay,
real local Auth/Storage/API/catalog boundaries, referral concurrency, native tests
and physical Samsung auth/navigation. Native and schema checks were not repeated
for the final navigation-only fix. See the linked review and original proof for
test scope and limitations.

Review `REVIEW_AND_HANDOFF_20260918.md` and
`../vendor_storefront_desktop_v1/DESKTOP_PROOF_20260918.md`. Before production schema
application, coordinate active catalog repair dependency fingerprints, run the
governed migration preflight and reconcile #473 if it merges separately. Rollout
flags default off; release and package activation require separate authorization.
Rollback disables availability and restores clients while retaining data.
