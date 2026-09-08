# Sealed Ownership Client Release Hold

Date: 2026-09-08 UTC (2026-09-07 America/Denver).
Branch: `feature/sealed-owned-collectibles-v1`. PR: #440, draft.
Repair base: `3f92cd10937ceefa0cff558081a0790bfc669842`.

## Why The Release Is Held

GitHub review found that personal-photo uploads attempted to overwrite fixed
`front/current` or `back/current` paths before the details RPC confirmed the
sharing state. Retained signed URLs could then expose replacement bytes if an
overwrite succeeded but the database save failed. The existing Storage policies
also do not grant owners UPDATE, making replacement unreliable even without
that failure sequence. Flutter public profiles additionally instantiated an
authenticated-only sealed panel for signed-out viewers.

## Repair

- Both clients upload to unique `side/revisions/<32 lowercase hex>` paths with
  `upsert=false`; existing published paths are never overwritten.
- Both readers accept bounded revision paths and legacy `current` paths.
- Flutter public profiles require a signed-in viewer before mounting the panel;
  service/panel guards prevent signed-out inventory RPCs.
- New migration `20260908070000_sealed_owned_photo_revisions_v1.sql` replaces
  only `vault_save_sealed_details_v1` and `sealed_owned_media_visible_v1`.
  It locks the owned row, validates both paths, then switches pointers and sharing
  atomically. A legacy path can be retained, not newly attached.
- SQL SHA-256: `8dd6ac2ef0f9e3f9880f17469147060d6fb91525484f51816c4ff0f6dc790499`.
- No production migration, inventory mutation or ownership activation occurred
  during this repair. The four previously approved migrations remain applied.

## Verification

The named disposable Supabase project on port 55430 replayed all 392 migrations.
The original populated local database on port 54330 was not reset.
The revised lifecycle suite passes 37 SQL/concurrency scenarios. Targeted web
tests pass 4/4, Flutter service tests 11/11, Node contracts 76/76. Web TypeScript,
targeted ESLint, Flutter scoped analysis and diff checks pass.

Real local Auth/Storage testing exercises a shared original photo, a private
staged replacement, a failed pointer save, private save, explicit sharing and
retained signed-URL byte readback. Initial round trip passed. A post-reset repeat
with 60-second test URLs failed with HTTP 400 during a longer run. The final repeat
with the clients' actual 3600-second lifetime PASSED: three unique uploads,
five byte comparisons, failed-save privacy, old shared-token original bytes,
private save and explicit sharing. Log: `photo-revision-media-client-ttl.log`.
The 400 cause was not independently captured; token expiry is a hypothesis,
not a diagnosed production failure. Preserve the earlier failed attempt.

The standard linked diff reports the previously investigated physical column
ordering differences. A read-only, candidate-hash-bound comparison verifies
exactly the two intended function definitions and unchanged 888 security objects.
No diagnostic SQL was executed. The first audit comparison expected no function
delta; the corrected candidate comparison requires exactly the two full replayed
definitions. A second run reached the clean-local-fixture assertion while the
concurrency fixtures were present. Final clean replay/readback PASSED at
`2026-09-08T05-04-41-652Z_footprint`: exactly two changed function definitions,
888 unchanged security objects, zero Storage policy differences, production
ledger 391 and replay ledger 392. Local copies/journal zero, additions OFF.
Only the existing three-table column-order diagnostic normalization was reused;
no broader diff exception or production schema mutation was introduced.
The repeatable cross-client checks also passed in
`../2026-09-08T05-04-51-563Z_checks/`.

Artifacts: `C:/grookai_vault_operator_artifacts/sealed_ownership/20260908_client_release/`.
Preserve all earlier failed logs and timestamped footprint directories.

## Existing Device And Deployment Evidence

- Samsung received the default-off build before this privacy repair; Vault
  remained 14 cards / 13 unique / 12 priced copies and USD 2,049.85. Pokemon
  sealed images/prices rendered. This is not proof of the revised photo UI.
- Samsung MTG Sets displayed zero sets; track separately, not resolved here.
- Web production still runs old main. Signed-in Pokemon and MTG sealed browse
  rendered self-hosted images; Pokemon required a fresh navigation after an
  initial load failure. No new production web release is claimed.
- iOS 315 archive from `883a20b4c61410a58756bdb2014716fac1d75cc0` passed
  signing/dSYM checks and simulator launch but was NOT uploaded. It predates
  this privacy repair and must not be uploaded as the repaired release.
- PR #440 remains unmerged. Do not bypass its unresolved review threads.

## Remaining Gates

1. Freeze the repair source and narrowly scoped schema apply plan. The previous
   four-migration approval does not authorize this fifth migration.
2. Apply the exact authorized function migration and independently read it back.
3. Resolve PR findings with evidence, merge through normal checks, deploy web and
   rebuild native clients from the repaired source with ownership still OFF.
4. Verify the repaired UI on Samsung and iOS; do not reuse the old 315 archive.
5. Perform the bounded owner lifecycle canary and native share/print acceptance
   before enabling ownership. Never use a default-off smoke test as enablement proof.

Existing operational alerts and the MTG zero-set observation do not establish
whole-app readiness. Keep catalog/market pipelines, pricing and unrelated data
outside this schema repair.
