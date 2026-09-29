# Completed pricing canary health V1

Checkpoint94 closed the August13–16 authenticated100-printing72-hour canary.
Permanent main-run32194979152 artifacts preserve its passed final observation.
The old scheduled workflow explicitly performs no observations after that window.
Its latest schedule timestamp must not be treated as a continuing pricing SLA.

For this exact closed gate only, the control plane verifies the fixed hashes of
the final run plan, evidence, summary and report, their recorded hash manifest,
and the unchanged frozen workflow bytes. A replaced workflow, missing/modified
artifact or observation earlier than the final evidence date fails certification.

Expose lifecycle `completed`, the original August16 historical evidence date,
and retained GitHub workflow status. A completed gate is not a fresh pricing
observation. Current source-sync/publication health, their freshness/coverage
thresholds, alert boundaries and all worker capacity/health guards stay unchanged.
Never rerun a closed no-op merely to renew timestamps, replay production pricing,
or rewrite the historical artifacts to repair this monitoring condition.

Package all pinned files with the immutable control-plane runtime. Preserve the
old runtime and separate MTG, backup, pricing and MEE pointers. Verify the actual
control-plane report, then real read-only MTG execution and backup service runs.
Tests: `node --test tests/contracts/pricing_canary_closeout_v1.test.mjs
tests/contracts/production_live_control_plane_v1.test.mjs`.
