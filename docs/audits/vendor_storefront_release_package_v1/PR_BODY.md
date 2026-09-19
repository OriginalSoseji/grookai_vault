# Browse-only vendor stores with desktop and native owner management

Owners can configure one store, explicitly select eligible exact Vault copies and
publish seller-described custom collectibles. `/account/store` provides computer
management for branding, selection, custom details/photos/stock/sections, preview
and publication, alongside existing catalog add/import and exact-copy editing.
In-app and public-web publication are explicit, separately entitled actions.
Live ownership, privacy, printing/quarantine and database grant checks control reads.

One additive release migration contains the final storefront/custom/referral/media
schema. Three unapplied development migrations are archived with exact provenance;
their final publisher and PT409 mutation are defined once. Strict baseline and
PrePush gates pass through a guarded isolated replay. The full 395-migration chain
matches all 9,494 schema footprint objects of the original 397-migration candidate.
Three rollback SQL tests cover catalog/custom publication, ownership, pricing identity,
stale conflicts and entitlement downgrade. Guard tests and source packaging checks pass.

Previous receipts retain the desktop browser/build, Auth/Storage/API, referral
concurrency, native tests and Samsung auth/navigation proof. All 1,027 compared
product files are unchanged from that desktop candidate. This includes PR #473's
nullable-printing Vault add while excluding unassigned copies from publication.

Review `RELEASE_PACKAGE_PROOF.md`. Coordinate #473 and catalog repair dependency
fingerprints before integration. Rollout defaults off; no merge, remote apply,
activation or deployment has occurred. No billing, checkout, staff accounts or custom
domains are included. Rollback disables availability while retaining owner data.
