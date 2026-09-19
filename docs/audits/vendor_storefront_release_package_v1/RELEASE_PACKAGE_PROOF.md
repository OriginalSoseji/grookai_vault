# Storefront release package proof

Recorded September 18, 2026 America/Denver (September 19 UTC).

The migration packaging blocker is resolved locally. Both formal strict phases
pass for the sole pending `20260919050000_vendor_storefront_release_v1.sql`.
Nothing was merged, pushed, deployed, enabled or applied to production.

## Candidate and preservation

- New isolated candidate: `C:/gv_store_release_20260919`, detached at current main
  `a151794a98cc1e47a9a8886e0e643009cea898e5`, rechecked against GitHub after proof.
- Predecessor `C:/gv_store_desktop_20260918` and the populated 164xx proof database
  remain untouched. Catalog worktrees, repair snapshots and shared services were
  not reset. All 1,027 compared desktop/native product files match the predecessor.
- PR #473 remains open at `6e747bb1561354fc56b62c73be39f258da506f15`; its included
  Vault-add behavior remains a coordination point if it lands independently.

## Migration reconciliation

The original three files were never applied remotely. They are preserved byte for
byte in `historical_migrations/`, with provenance in `consolidation.json`.
The release contains their final behavior in one transaction, defining the final
publisher and final PT409 custom mutation once. The unchanged strict duplicate
scanner now passes. Do not apply this file to the historical 397-migration proof
database or combine it with the original three-file package.

`scripts/schema/build_storefront_release_v1.mjs` reproduces and checks the package.
Its explicit `--write` mode is local file generation only. The first rehearsal
found an SQL dollar-quote substitution error; it failed and rolled back the entire
release, retaining the 394 baseline. The corrected builder uses literal callback
replacements. `failed-replay-dollar-quotes.json` preserves that failed attempt;
the successful final receipts bind the corrected source and tools.

## Fresh proof

1. **Formal AuditLinkedSchema:** production has 394 applied migrations, this one
   pending migration and no remote-only ledger rows. Fresh sanity counts were
   170,658 cards, 3,399 sets and 32,903 traits. Pinned pgkit 0.6.1 inspected the
   actual isolated 394 baseline and production using repeatable-read, read-only
   snapshots. Only the governed exact column-order reconciliation for `card_prints`,
   `pricing_jobs`, and `sets` was needed. Remaining SQL diff: zero bytes. All 893
   supplementary owner/ACL/RLS/function-security objects matched.
2. **Formal PrePush:** exact pending set, unchanged timestamp/object duplicate
   checks and real `supabase db reset --local --no-seed --yes` passed. The new
   `grookai-storefront-release-20260919` project uses 168xx ports and a database
   attached only to its dedicated internal network. Its fixed-destination relay
   exposes loopback ports. No arbitrary proxy or credentials are present in it.
   Configuration, source/copy hashes, empty application data and disabled workers
   are checked before reset. Final ledger: all 395 migrations. All 9,494 schema,
   function-definition, grant, policy and related footprint objects exactly match
   the original 397-migration candidate, without column-order normalization.
3. **Runtime SQL:** three synthetic transaction/rollback tests pass: nullable
   printing add, exact-copy storefront eligibility/publication/app-web parity,
   and custom-only publication/foreign-owner rejection/PT409 stale edit/downgrade
   and explicit re-publication. No synthetic users remain; rollout remains off.
4. **Guard tests:** three groups verify target/config/hash rejection, changed
   migration inventory rejection, and rejection of wrong pending sets or combined
   options before CLI access. The reproducible builder also passes.

Commands:

```powershell
pwsh -NoProfile -File scripts/migration_preflight_strict.ps1 -Phase AuditLinkedSchema -StorefrontReleaseIsolatedReplay -ExpectedLocalOnlyIds 20260919050000
pwsh -NoProfile -File scripts/migration_preflight_strict.ps1 -Phase PrePush -StorefrontReleaseIsolatedReplay -ExpectedLocalOnlyIds 20260919050000
node scripts/schema/build_storefront_release_v1.mjs
node --test scripts/tests/storefront_release_gate_v1.test.mjs
```

The gate is deliberately bound to this empty disposable replay target and this
release hash. It fails on the preserved proof database or a different configuration.
It is not a general-purpose reset command; after successful replay, a fresh baseline
must be prepared before rerunning the two phases. Receipt files alone cannot replace
the real reset. The CLI initializes its login role during authenticated inspection;
all requested production application/schema SQL was read-only. Raw engine snapshots
and diagnostic SQL stay in ignored `.local`, since function source can be sensitive.

## Website and remaining release work

The website remains complete at `/account/store`: desktop store setup/branding,
existing catalog add/import and exact-copy editing, explicit selection, custom
collectible details/photos/quantities/sections, preview and publication. App-only
owners can manage from a computer; public web publication still requires `store_web`.
See the previous desktop browser/build receipts. Those UI/device tests were not
rerun for this migration packaging change; product-source parity is recorded here.

Next is code/integration review of this candidate, with PR #473 and active catalog
repair dependency fingerprints reconciled. The new storefront foreign keys and
entitlement triggers can invalidate frozen repair fingerprints. Fresh preflight is
required if main, production schema, source or tooling changes. Merge, production
migration, web/native deployment and entitlement/rollout activation remain separate
authorized release steps. Billing, checkout and custom domains remain outside scope.

Rollback continues to disable store availability and restore clients while retaining
the additive tables and owner data. Never alter Vault ownership to roll back.

Receipts: `baseline.json`, `replay.json`, `sql-tests.json`,
`product-source-parity.json`, `release-schema-footprint.json`, formal transcripts,
and final source/readback manifests in this directory.
