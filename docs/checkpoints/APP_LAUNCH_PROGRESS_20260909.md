# App Launch Progress

Date: September 9, 2026. Updated through 19:33 UTC.
Founder direction: release useful functionality without a calendar canary hold.
Security, correct ownership/value and honest limitations remain required.

## Delivered

- Collection fix PR454 merged as 588be2887ce73f70cbcc1273197202a4a9d7ce58.
  PR453 is superseded; original branch/execution evidence is preserved.
- Samsung profile318 installed and visually verified. iOS318 produced from
  526559d2a470f693566fc8e3b949cece0a1b6352, accepted by Apple and available to the
  existing internal TestFlight group. Runner/App dSYMs match the signed archive.
  Apple build ID: 8b90fc28-a529-4077-8429-96449389cf2c. Build317 remains preserved.
- Sealed global signed-in Add enabled with one exact control-row update at
  19:27:53 UTC. Plan fingerprint:
  02568b439188c21652a07d495b22f764c1388dc49c86ea2b2104f212109bae45.
  Rollback rehearsal and post-commit independent connection readback passed.
  Two ordinary-role capability probes passed; anonymous Add remains denied.
  The actual existing Apple reviewer password login and capabilities/catalog/
  totals reads passed at 19:31 UTC. No reviewer holding was fabricated.
- Pokemon paired price/image refresh applied from
  fd4938df3853bd2d25414d0e7556a646c8d15d5c. Plan fingerprint:
  f9f001deff3ad0bb0a31a2f7d053116fccadf1e609a3f0ec22256591a552ba4a.
  1712 published, nine exclusions; 8532 inserted immutable evidence/release rows,
  two paired pointer changes. Independent exact readback and a zero-write
  idempotency run passed. No canonical, Storage, Vault or other-game changes.
- Source health distinguishes one contained source identity mismatch from active
  publication failure. Twenty-two quotes are aging, seven expire next day;
  zero expired quotes accepted. Authenticated image bytes/cross-game denial pass.

## Remaining

- Merge PR455 so daily automation uses the proven source-containment repair.
- Verify the production web deployment and signed-in collector routes.
- Contain the Phantom Forces incorrect printing choices through the existing
  non-destructive review sidecar, preserving canonical/owned data.
- Complete external TestFlight reviewer information and submit the verified
  build for external beta review; App Store submission is still separate.
- Finish current store/privacy/reviewer journey evidence and final submission.
- Keep source identity reconciliation, legitimate quote gaps, worker capacity
  and remaining operational debt visible after release. No artificial 72-hour wait.

## Evidence And Rollback

Root: `C:/grookai_vault_operator_artifacts/release_closeout/20260909/`.
Receipts: `sealed_source_containment_rehearsal/`,
`sealed_source_containment_idempotency/`, `sealed_source_containment_health/`,
`sealed_launch_control_v3/`, `reviewer318_access_*.json`.
Mac archive/upload/Apple receipts use
`~/grookai_operator_artifacts/release_closeout_20260909/`.

First two control rehearsals stopped before mutation on timestamp serialization
differences. Their plans/failure receipts are preserved. V3 uses exact PostgreSQL
JSONB row comparison, including microseconds. No live control state was changed
until the successful verified V3 apply.

Rollback disables new sealed additions with a compare-and-swap against the exact
current control row. It must preserve all holdings, history, photos and grants.
Paired price/image rollback uses the frozen prior Pokemon pointers together;
never alter unrelated game pointers. No source archive or previous app build
was deleted. The founder holding remains unknown-condition and honestly unpriced.
