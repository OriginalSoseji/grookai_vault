# Collectr review workspace — October 3

Local web candidate on `feature/collectr-review-workspace-20261003` in
`C:/gv_collectr_adventure_20261001`, based on main7a53b16a1 (415 migrations).
PR581 artwork matching is released; its terminal receipts remain immutable.
This batch changes preview presentation and downloads only. No matcher, writer,
schema, grade identity, native distribution or real collection import changes.

The preview supports search across original fields, mutually exclusive review
tasks counted by original source rows, clear filters, and complete unresolved CSV
download. Filtering never changes save targets. Downloads validate source-index
coverage and original values, then restore original source order across grouped
entries. Manual choices and undo change counts and download eligibility.

Private replay of the prior qualified preview: 1872 source rows, 1343 ready copies,
706 review rows. Tasks: 119 choices, 64 graded, 183 blank card numbers, 11 edition,
46 finish and 283 other catalog/source reviews. All 706 downloaded rows exactly
match original field values and source order. This is offline evidence, not a
fresh catalog match or a real collection save. Fresh read-only catalog inspection
is retained separately under `collectr_remaining_20261003`; Japanese samples were
absent/unpublished and do not justify permissive matching.

Use `GV_COLLECTR_WORKSPACE_HTTP_PROOF=1` with
`tests/integration/collectr_mtg_import_http_v1.test.mjs`. It extends the retained410
loopback lab on58540/58541 and Next58863, preserves prior fixtures, and exercises
64 synthetic source rows, pagination, category/search/empty states, a real CSV
download, and a filtered save of all three ready copies with SQL readback.
Existing explicit-choice, response-loss, conflict, named-finish and artwork
journeys run in the same invocation. Never reset/migrate the lab.

Four focused export contracts, TypeScript, lint and all16 HTTP/integration tests
pass. Mobile390 and desktop1440 browser screenshots are retained; the mobile
layout was visually inspected without horizontal overflow. The first HTTP run
found the existing lab relay stopped; it was restored after binding inspection.
The next run exposed test uploads before hydration enabled the file input. The
fixtures now wait for readiness; the complete rerun passed in39 seconds. Failed
attempt evidence remains preserved. HTTP and normal-hook receipts live under
`C:/grookai_vault_operator_artifacts/collectr_review_workspace_20261003`.
Release remains separate from local qualification. No physical iPhone proof is
claimed; the user waived it. Production writes and real collection imports: zero.
