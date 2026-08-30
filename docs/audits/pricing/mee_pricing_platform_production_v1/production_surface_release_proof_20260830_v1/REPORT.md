# TCGPlayer Market Pricing Surface Release Proof

## Status

- Surface gate: `passed`
- Required surfaces: `17`
- Passed surfaces: `17`
- Failed surfaces: `0`
- Findings: `0`
- Overall Production V1 completion: `not yet declared`
- Remaining operational gate: seven unattended full-production cycles

## Release Provenance

- Producing and deployed commit: `92da2a80a295f72b7a97f4436f98e63863d3a807`
- Branch: `fix/mee-health-bounded-current-run`
- Remote branch SHA: `92da2a80a295f72b7a97f4436f98e63863d3a807`
- Vercel deployment: `dpl_GYc4Wwt3J16FApuQEkS8SQthN4YC`
- Android artifact: `android/app-release.apk`
- Android SHA-256: `f885935c1d986ad06328b6c80ed45450bc3c2de65e194899e25aa6ba97e6fe0a`

## Surface Proof

All required web and Flutter surfaces reconciled their rendered pricing against
the authenticated governed read model.

Web (`9/9`):

- Card Detail
- Search
- Explore
- Set Grid
- Compare
- Private Vault
- Public Vault
- Vault Item
- Market History

Flutter (`8/8`):

- Network
- Search/Grid
- Card Detail
- Set Grid
- Compare
- Private Vault
- Public Collector
- Vault Item

The complete manifest has no missing, duplicate, or unsupported surface IDs.

## Vault Readback

- Status: `passed`
- Authenticated targets: `11`
- Duplicate instances: `0`
- Resolved printings: `11`
- Priced copies: `10`
- Intentionally unpriced copies: `1`
- Reconciled total: `$2,061.21`
- Independent total: `$2,061.21`

Public exact-printing sample:

- Card: Pikachu, 151 #173
- GV-ID: `GV-PK-MEW-173`
- `card_print_id`: `14dff926-f0b8-4034-a7ff-92a18c47a3de`
- Rendered and governed value: `$86.72`
- Public copies: `1`
- Private copies: `0`
- Observed at: `2026-08-29T09:23:50.512Z`
- Published at: `2026-08-29T11:05:38.232Z`

Two copies added accidentally while preparing Compare were removed by exact
instance ID. The final readback proves the Vault returned to 11 targets with no
duplicates and the original `$2,061.21` total. No other Vault row was removed.

## Verification

- Product surface verifier: `17/17 passed`
- Production edge probe: `passed`
- Contracts Runtime Protection: `passed`
- CodeQL: `passed`
- Guard: No Legacy Keys: `passed`
- Flutter Build Signed APK: `passed`
- Tracked worktree: clean
- Local branch and remote branch: exact SHA match
- Surface verifier database mode: authenticated read-only
- Surface verifier database writes: `0`

## Permanent Artifacts

- Combined evidence: `combined/`
- Combined manifest: `combined/capture_manifest.json`
- Web evidence: `web/`
- Flutter evidence: `flutter/`
- Android artifact: `android/app-release.apk`
- Vault readback: `C:/grookai_vault_launch_convergence_v2/artifacts/market_pricing_product_v1/vault_production_readback/2026-08-30T09-01-33-895Z/`
- Product surface proof: `C:/grookai_vault_launch_convergence_v2/artifacts/market_pricing_product_v1/product_surface_proof/2026-08-30T09-02-24-893Z/`

Primary hashes:

- Combined manifest: `3e4e526794262c6536524561f2d6fc1405923f1b1b49ed626f6deb0c5a3c0bc6`
- Product proof summary: `d94d74c63069dd467a459552af825a7db7aeedf55c941461dc8c05ea1bf8bb46`
- Product proof hash ledger: `f30934c67bffb8fb90744428f17225f517598850643f5fc43e7e8215cd762e9a`
- Vault readback summary: `124c66ee2252922a471b01f278f9d6cbec567a6e51cfe1456b80d1cf6e3e5db2`
- Vault readback hash ledger: `8236377992549c0886da6e420fa0d53c5d17653e59a5732687c72c3348b23364`

## Security Cleanup

- Authenticated browser storage-state files removed: `2`
- Ignored temporary session-refresh helper removed: `1`
- Secrets retained in permanent artifacts: `0`
- New post-proof commit created: `no`

## Current Operational Truth

The full production publication scheduler is active. The
`TCGPLAYER-MARKET-SCHEDULE-PRODUCTION-2026-08-30-publication` run was still in
progress when this report was prepared. Completed production runs immediately
before it reconciled successfully, but the governed seven-cycle observation
window is not yet complete and must not be claimed as complete early.

## Exact Next Gate

1. Allow the current production cycle to reach a terminal state.
2. Require it to be `verified` and `reconciled`, with no terminal alert.
3. Continue the frozen-worker observation window until seven consecutive
   scheduled full-production cycles are proven.
4. Run the full-rollout observer with the frozen activation run, worker commit,
   coverage summary, and performance summary.
5. If the observer passes, create the final Production V1 completion report.
6. Keep anonymous pricing behind the separate licensing/display-authority gate.

