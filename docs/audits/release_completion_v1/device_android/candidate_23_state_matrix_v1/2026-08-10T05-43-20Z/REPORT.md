# Final Candidate Android Build 23 State Matrix V1

## Result

`PASSED` for the synchronized Android candidate. The installed package was
read back from the emulator and hashed exactly to the frozen signed APK:

- Application source: `a8ec3d27808fd100cbb8e544032ee479e9632f24`
- Package: `com.grookai.vault`
- Version: `1.0.0 (23)`
- APK SHA-256: `deda3271c92258870a8abbeffce163ba39fb9a5e6d3142aca8907ff969ddb7f6`
- Frozen artifact match: `true`

## State Proof

| State | Result | Evidence |
| --- | --- | --- |
| Loading | Passed | Live signed-in Search displayed its catalog progress indicator. |
| Empty | Passed | An impossible query displayed `No matching cards` and `No results yet`. |
| Offline/error | Passed | Search displayed the bounded local-results fallback and empty catalog state. |
| Recovery | Passed | After restoring connectivity, Search rendered `32 cards` and a populated grid. |
| Private | Passed | The disposable authenticated session rendered Pulse plus Wall, Vault, and Search navigation. |
| Signed out | Passed | Authentication entry and read-only `Explore cards` remained available. |
| Text scaling | Passed | Authentication and catalog controls remained visible and non-overlapping at 130% font scale. |

## Setting Restoration

- Airplane mode: `0 -> 1 -> 0`
- Font scale: `1.0 -> 1.3 -> 1.0`
- Both controlled settings were restored exactly.

## Boundaries

- No card, vault, wall, message, Want, or pricing mutation was performed.
- One existing disposable account authentication session was created.
- No database migration, database apply, deployment, or distribution action occurred.
- Credentials, raw authentication fields, and personal identifiers remain outside source control.

## Gate Effect

This closes the synchronized Android build `23` portion of the state matrix.
The overall cross-platform gate remains `partial` until physical TestFlight
build `289` proves the same required iPhone states. Existing deterministic web
and older physical-device evidence is supporting evidence only; it does not
replace the candidate-scoped iPhone run.

## Evidence

- `run_plan.json`
- `state_assertions.json`
- `offline_settled.png`
- `recovery_settled.png`
- `private_pulse_empty.png`
- `private_search_loading.png`
- `text_scale_auth_130.png`
- `text_scale_catalog_130.png`
- `private_evidence_hashes.json`
- `artifact_hashes.json`

## Exact Next Gate

Run loading, empty, offline/error, recovery, private, signed-out, and text-scale
states on physical TestFlight build `289`, preserving and restoring every iOS
setting. Do not start the 72-hour soak until that and the other non-soak gates
are reconciled.
