# Combined search — iPhone build 327

The user requested a new version to test instead of continuing the development
certificate trust procedure. Version **1.0.0 (327)** is now archived and exported
with App Store distribution signing. It has not been uploaded to TestFlight or
installed on the phone. No service deployment occurred.

## Frozen build and checks

- Source: `3597412554ac381aa95600313181ecafb3dbfc91`, with application code
  unchanged from the previously tested `ed8645b93` runtime. Current remote main
  `76ff8b32b` is included. No product changes were needed to build this version.
- A new detached Mac checkout, `grookai_vault_testflight_327_combined_search`,
  preserves the earlier dirty development checkout and all other worktrees.
  Sparse checkout omits unrelated report data; it does not modify source.
- Existing release configuration matches build 324 exactly. All three sealed
  feature switches remain enabled. No local endpoints or fixture credentials
  enter the package. Existing application identity and associated domains remain.
- Apple inventory showed build 324 as the latest uploaded VALID build. Local
  archives 325/326 belong to separate storefront work, so this build uses 327.
- Xcode archive succeeded; Runner and App dSYM UUIDs match their binaries.
  All 277 native source/dependency paths are hashed in the private manifest.
- Nine focused Mac tests passed across combined-search interpretation, links,
  repository behavior and release configuration. This is a targeted repeat,
  not a new full repository gate or a physical-device acceptance result.
- IPA export succeeded. Its signature verifies, its provisioning profile is for
  App Store distribution, debugger attachment is disabled, and production push
  and the existing associated-domain entitlement are preserved.

IPA SHA-256:
`a1a17d70794fe9222cc6dc24d35bdcbb1efc780751b4dfbe53134715ef4601d4`.
Package size: 29,095,090 bytes. Build readback: 2026-09-23 02:41 UTC.

## Search service dependency

This native build calls the existing production resolver. Fresh read-only checks
returned HTTP 200 but zero rows for `Yuka Morii Wurmple` and
`Yuka Morri Wurmple reverse holo`. The older service recognizes the finish but
leaves the artist words in the residual card-name query. Its existing
`smart_search` field alone does not prove the candidate artist interpretation is
deployed.

Publish and verify the reviewed combined-search web/service candidate before
using this build to accept combined search through TestFlight. That service
release changes the website as well as native search and is separate from the
user's new-build request. The distribution preference question is pending;
no existing tester groups, notifications, public links or store metadata changed.

After approved delivery, confirm Apple processing, actual tester availability
and physical installation of 327. Exercise the user's combined examples,
artist refinement, finish removal, complete results and detail/back behavior.
Build/export success does not close those acceptance cases.

## Disk recovery and private evidence

The first Flutter release compile passed, but Xcode archive failed when disk
space ran out. Its private log is preserved. The archive-only retry succeeded
after removing verified, unused intermediate objects from historical Grookai
builds 313–318. Archives, exports, source, build products and historical logs
were preserved. This task's obsolete development compilation caches were also
removed; the isolated signed physical app was retained.

Private artifacts are under `combined_search_20260922` on the operator machines:
`testflight-preflight.private.json`, `testflight-preparation.json`,
`testflight-disk-cleanup*.json`, `testflight-archive.private.log`,
`testflight-archive-retry.private.log`, `testflight-archive-verified.json`,
`testflight-source-manifest.json`, `testflight-native-tests.json`,
`testflight-export-verified.json`, and `testflight-service-readback.json`.
The Windows package is `GrookaiVault-1.0.0-327.ipa`; the Mac export is under
`testflight-327-export`. Preserve the failed attempt separately from the retry.

The previous trust-gate checkpoint remains historical evidence for the retained
development app. No additional trust retry is needed for the chosen distribution
build; TestFlight processing and installation are separate remaining actions.
