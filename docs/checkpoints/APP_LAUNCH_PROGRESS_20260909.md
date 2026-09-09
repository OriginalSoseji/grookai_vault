# App Launch Progress

Date: September 9, 2026. Updated through 19:51 UTC.
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
- Submit the verified build for external beta review; App Store submission is
  still separate. Existing working review credentials were copied privately to
  the previously incomplete beta review form and read back. Draft build is318.
- Finish current store/privacy/reviewer journey evidence and final submission.
- Keep source identity reconciliation, legitimate quote gaps, worker capacity
  and remaining operational debt visible after release. No artificial 72-hour wait.

## Additional Live Findings And Completed Containment

Production web deployment `dpl_9FBwmfCdrsBTGgC8A1XMtcpBaLts` is READY from
main `588be2887ce73f70cbcc1273197202a4a9d7ce58`. Ordinary-account browser smoke
then exposed two actual defects: an absent production public sealed-ownership
flag and reuse of a login redirect prefetched before authentication. The flag
was created as `true` for production only; the next build must embed it. Login
now uses a fresh document at the existing sanitized continuation after successful
authentication. No authentication boundary is relaxed. Re-test after deployment;
the preserved failed smoke receipts must not be represented as passes.

Seven Phantom Forces finish choices were hidden at19:36:56 UTC through existing
`card_printing_truth_reviews`: six unsupported normal/reverse finishes for
34/35/114, plus secret121 reverse as explicitly unverifiable. The official PDF
ends at119 and does not establish secret121's finish. Canonical/owned rows were
unchanged, zero affected owned references; exact readback passed. Plan:
`3ede4f4ccb84d487ca92cd3833aacffb9f83d8c0ec1a19a3e89518fceb40b678`.
Issue450 remains open for remaining authoritative reconciliation, not more
blind writes. Current query API proof remains part of the post-deploy smoke.

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
