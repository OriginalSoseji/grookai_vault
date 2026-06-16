# Post Reconcile Integrity Audit Checkpoint V1

Date: 2026-06-16

## Purpose

This checkpoint records the regression audit added after the SVP Grey Felt Hat issue exposed a final-state identity failure class:

```text
The same visible English physical card can still exist under multiple parent identities.
```

The original reconciliation packages proved targeted package safety, finish truth, and image truth. They did not globally assert normalized parent uniqueness after all apply/enrichment/image passes.

## Audit Artifacts

- `scripts/audits/post_reconcile_integrity_audit_v1.mjs`
- `docs/audits/post_reconcile_integrity_v1/post_reconcile_integrity_audit_v1.md`
- `docs/audits/post_reconcile_integrity_v1/post_reconcile_integrity_audit_v1.json`
- `scripts/audits/post_reconcile_duplicate_parent_readiness_v1.mjs`
- `docs/audits/post_reconcile_integrity_v1/post_reconcile_duplicate_parent_readiness_v1.md`
- `docs/audits/post_reconcile_integrity_v1/post_reconcile_duplicate_parent_readiness_v1.json`

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false

## Integrity Audit Results

- master_verified_printings_loaded: 41195
- db_parent_rows_scanned: 23077
- db_child_printings_scanned: 38108
- exact_supported_child_printings: 32481
- unsupported_child_printings_exact: 2791
- normalized_supported_child_printings: 2836
- duplicate_parent_identity_groups: 167
- duplicate_active_identity_normalized_groups: 167
- display_image_risk_child_rows: 0

## Duplicate Parent Readiness Results

- source_duplicate_groups: 167
- evaluated_groups: 167
- deterministic_padded_unpadded_groups: 167
- ready_for_guarded_dry_run: 23
- blocked_groups: 144
- duplicate_parent_rows: 167
- duplicate_child_rows: 252
- package_fingerprint: `2d8ae1b8de400f78e85401344f3e441afe6caff8facd97ad72b3441c82364520`

## Set Breakdown

| Set | Groups | Dry-run candidates | Blocked | Duplicate child rows |
| --- | ---: | ---: | ---: | ---: |
| me01 | 83 | 0 | 83 | 167 |
| svp | 72 | 18 | 54 | 77 |
| swsh11 | 12 | 5 | 7 | 8 |

## Required Regression Gates

The following gates should become permanent pre-deploy/preflight checks for English physical catalog truth:

- `duplicate_parent_identity_groups` must be 0.
- `duplicate_active_identity_normalized_groups` must be 0.
- `display_image_risk_child_rows` must be 0.
- `unsupported_child_printings_exact` must not increase without reviewed exemption.
- `normalized_supported_child_printings` must be driven to zero or moved into explicit governed exemptions.

## Next Safe Path

1. Build a rollback-only guarded dry-run package for the 23 ready duplicate groups in `svp` and `swsh11`.
2. Do not real-apply from the readiness report alone.
3. Build a separate dependency-transfer strategy for `me01`, because those duplicate parents carry protected dependencies including embeddings, scanner fingerprints, discovery rows, JustTCG pricing rows, and a small number of vault/pricing/feed references.
4. After each apply, rerun the post-reconcile integrity audit and require the duplicate counts to decrease without increasing image risk or unsupported printings.

