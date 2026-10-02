# Collectr explicit review choices — October 2

Local follow-up to completed PR575, based on main
`6d1c7255a41aeb92eea3f10de844152b1e895e68`. The completed checkout
`C:/gv_collectr_adventure_20261001` is reused on
`feature/collectr-review-choices-20261002`. Prior release receipts remain terminal.

The web importer now offers explicit choices for ambiguous catalog parents.
Cards include set, variant/modifier, finish and exact detail links. Keep in review
is the default; missing or duplicate child evidence disables selection. Source
records, quantity and metadata remain intact. The existing server validator and
atomic SQL writer are unchanged. No migration, Edge or native change is included.

Interrupted saves retain the same request and targets. A confirmed failed receipt
can reopen review after a fresh preview succeeds. Existing source groups cannot
be retargeted to create duplicate ownership; reselecting the original match
reconciles its existing copies. Unknown outcomes cannot discard the frozen attempt.

Private baseline replay preserves all 1118 ready rows / 1292 copies and 754 review
rows from 1872 source records. It offers choices on 119 review rows, with 218
selectable candidates and 33 disabled options. No choice is automatic; all 64
graded rows remain held. This uses the frozen prior catalog snapshot, not a claim
that current catalog coverage is complete. No real collection has been saved.

Focused preview/server contracts pass (285 tests). The isolated Auth, Next HTTP,
mobile Chromium and SQL journey passes (13 tests), including tampered target
rejection, original-source readback, switch/undo, disabled options, interrupted
save/reload/retry, conflicting retarget rejection and confirmed-failure recovery.
Mobile screenshots were inspected. The first browser run exposed test-only
details-toggle/shared-session cleanup errors; both failure evidence and the
corrected passing run are preserved. Physical iPhone testing is waived by the
user and is not claimed.

Opt in with `GV_COLLECTR_REVIEW_HTTP_PROOF=1` for
`tests/integration/collectr_mtg_import_http_v1.test.mjs`. The harness verifies the
retained 410 lab's migration hashes, loopback ports and isolated network before
adding fresh synthetic fixtures. It never resets that lab or writes production.
Current repository migrations are 414; this is a retained-baseline workflow test,
not a fresh 414 schema replay.

Evidence and current repository/release status:
`C:/grookai_vault_operator_artifacts/collectr_review_choices_20261002`.
The normal commit hook passed 6381 contracts (10 skipped), then stopped at the
quarantine report because Docker's backend crashed and local DB58540 refused
connections. Standalone web typecheck, lint and strict production build pass.
Docker recovered; the existing isolated relay was restarted after checking its
loopback bindings/internal network. Read-only SQL confirms the retained 410
migrations and saved fixture data. A fresh normal commit gate is required; its
terminal result belongs in the private checkpoint. No hook was bypassed and no
push/release is established by these checks. Do not replay any prior FCA/Adventure
release intent or receipt.
