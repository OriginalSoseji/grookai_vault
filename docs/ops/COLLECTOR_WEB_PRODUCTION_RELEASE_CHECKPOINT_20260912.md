# Collector Website Release Checkpoint

Recorded September 11, 2026 America/Denver / September 12 UTC.

## Decision

Release candidate verified locally; production switch NOT performed. The founder
authorized conditional website rollout, not production database or pricing repair.
Do not describe this checkpoint as launch completion. Two backend blockers remain.

## Preserved Versions

- Live/main base: `31372a7c69c221adbfa6ac8c9505d929fe3ec08c`.
- Live deployment: `dpl_EZXp6L6jkUdVCGJPvAALFJSXc3JQ`, grookaivault.com.
- Protected approved preview: https://grookai-collector-staging.vercel.app.
- Approved preview deployment: `dpl_G61wUz5eSRjhs1Vf1vHW2V38AftP`.
- Original design tree: `C:/grookai_vault_collector_authenticated`, unchanged.
- Release tree: `C:/grookai_vault_collector_release`.
- Release branch: `release/collector-web-production-20260912`.
- Local isolated candidate: http://127.0.0.1:3169/explore.
- Private recovery repository: `OriginalSoseji/grookai-collector-recovery`.
- Prior verified recovery release: `collector-preserved-1789184475757`.

The main GitHub repository is public. Do not upload operator artifacts, credentials,
or unreviewed backups there. Keep recovery assets in the verified private repository.

## Completed

- Imported preserved source with per-file manifest hash verification onto actual
  live/main. All 97 pre-existing application route files remain present. Route
  inventory is not a claim that every workflow has been interactively tested.
- Fixed signed-in autocomplete using viewer-scoped credentials for MTG and One Piece;
  authenticated responses are private/no-store, anonymous responses remain scoped
  to public credentials. No admin fallback or cross-user cache reuse.
- Added fail-closed production configuration validation, preserving isolated
  staging restrictions and rejecting fixture databases or mixed deployment modes.
- Added Search canonical metadata. Preserved approved presentation and all tabs.
- Read-only production schema, RPC, grant, catalog and pricing inspection.
- Targeted contracts: 86 passed. Web suite: 213 passed, one existing opt-in browser
  test skipped. Provisional suite: 35 passed. Total: 334 passed, zero failed, one skipped.
- Optimized Next/TypeScript build passed in LOCAL STAGING mode, not a production
  configuration build. Focused lint, diff check and release-secret packaging guard passed.
- Separate signed-in local browser run: 26 checks passed, zero recorded browser
  errors or failed requests. Desktop/mobile screenshots inspected. Covers synthetic
  login, save, exact ownership, account isolation, Vault, Wall, Binders, Pulse,
  Discover, Sets, sharing visibility, notes, archive and sign-out behavior.
- Production SQL authenticated-role read probe: Pokemon 422 sets, MTG 946 sets,
  One Piece 61 sets; two Pokemon sealed sample results. Two actual Blastoise pricing
  rows accepted by the client contract. This is NOT a real production-user browser
  session and does not prove positive MTG sealed UI coverage.

Five of the initial test failures also occurred against preserved live source.
Repairs aligned stale presentation assertions with current behavior and froze time
in the sealed pricing fixture test; production freshness policy was not weakened.
An imported backend-only warehouse test was excluded because its staging-only Edge
implementation is not part of this website release. The original test remains
preserved. Do not claim that backend hardening is deployed to production.

## Blockers

### MTG Sealed Pricing

Production governed reader returns zero MTG sealed products. All 2,182 active
qualifications are outside the seven-day freshness window as of September 12 UTC;
their observed dates range from August 27 to September 3. Active price release is
`25626032-7d72-5542-a8e0-7a6532c2f776`; image source release agrees with it.

`.github/workflows/mtg-sealed-pricing-refresh-v1.yml` is dispatch-only and read-only:
it creates an audit plan, not a scheduled price publisher. Its successful September
4 run `33847669050` does not establish current publication. Catalog supervisor
success likewise does not prove fresh sealed prices.

Required next: governed qualification/release refresh with image-release compatibility,
then a scheduled publisher and freshness monitoring. Do not loosen freshness or
present stale prices as current. Production writes need their own governed execution
scope, not this website rollout contract.

### Confirmed Cameo Projection

Production lacks `get_public_card_cameos_v2`, used by candidate Card Detail and Dex.
The legacy active-association view does not prove image-confirmed appearance roles.
Do not fall back to it to conceal missing confirmed evidence. The existing offline
projection design needs a governed backend release and confirmed evidence workflow.

## Remaining Release Sequence

1. Resolve the two backend contracts above without changing the approved design.
2. Verify actual production feature configuration; encrypted/redacted Vercel values
   were not interpreted as enabled or disabled. Preserve existing feature gates.
3. Prove positive signed-in MTG/One Piece search and MTG sealed behavior, exact
   pricing, ownership and totals, plus confirmed-cameo behavior against the intended
   backend. Local synthetic Pokemon checks do not substitute for those proofs.
4. Recheck live/main drift, freeze tested source and production build configuration,
   build the release and record both deployment IDs and exact rollback procedure.
5. Switch only after critical checks pass. Immediately smoke-test production;
   revert the website deployment on regression. Website rollback never reverses data.

No production database writes, migrations, Storage operations, feature activation,
worker dispatches, mobile builds, production deployment, domain changes or main
push occurred during this gate. No new Vercel build was purchased during this gate.

The local commit attempt was stopped by the existing managed pre-commit hook:
full shipcheck requires `SUPABASE_DB_URL`, which is intentionally absent here.
The hook was not bypassed or modified; full shipcheck is NOT claimed as passing.
Preserve this candidate as a Git index-tree snapshot, source archive and binary
patch against the recorded base until the appropriate release checks can complete.
The recovery receipt records their hashes; the release branch still points at base.

## Evidence And Repeatable Checks

Operator artifacts: `C:/grookai_vault_operator_artifacts/collector_polish/production_release_20260912`.
Read `test-summary.json`, `compatibility.json`, `governed-read-probe.json`,
`sealed-diagnostic.json`, and `browser-1789186808461/smoke.json`.
Browser credentials remain outside Git under operator-only permissions.

From the release worktree:

```powershell
node scripts/preview/test_collector_release.mjs
node scripts/ci/guard_release_secret_packaging.mjs
git diff --check
```

For isolated browser verification only, use the documented local launcher and
`COLLECTOR_RELEASE_LOCAL_PORT=3169`. Never point that launcher at production.

Update this checkpoint and the operator playbook when a blocker is resolved or a
new operational process is introduced. Record actual evidence, not inferred success.
