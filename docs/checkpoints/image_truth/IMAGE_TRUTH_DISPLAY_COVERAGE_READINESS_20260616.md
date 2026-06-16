# Image Truth Display Coverage Readiness

Date: 2026-06-16

This checkpoint records the current Image Truth display-coverage package state after refreshing the image audit against the current reconciled English physical database.

## Current Status

The refreshed audit found new English physical missing-display rows after later canon/enrichment work moved additional rows into the physical lane.

```text
english_physical_child_printings: 38,111
english_physical_missing_display_rows: 229
english_physical_missing_variant_visual_rows: 14,502
english_physical_exact_rows: 23,159
english_physical_representative_rows: 221
```

The next safe priority is display coverage for rows with no image at all. Exact variant image closure remains a separate long-tail task.

## Source Packet

Report:

```text
docs/audits/image_truth_v1/image_truth_missing_display_source_packet_v1.md
docs/audits/image_truth_v1/image_truth_missing_display_source_packet_v1.json
```

Result:

```text
target_count: 229
source_url_preserved_count: 153
source_url_needed_count: 76
dry_run_ready_count: 0
```

The packet preserves source URLs only. It does not stage assets and does not authorize writes.

## Asset Manifest

Report:

```text
docs/audits/image_truth_v1/image_truth_missing_display_asset_manifest_v1.md
docs/audits/image_truth_v1/image_truth_missing_display_asset_manifest_v1.json
```

Result:

```text
source_rows: 196
source_image_url_preserved_count: 17
representative_image_url_preserved_count: 83
blocked_asset_count: 96
dry_run_ready_count: 0
```

The manifest separates exact/source image candidates from representative display candidates.

## Exact Display Package

Package:

```text
IMG-01B-MISSING-DISPLAY-EXACT-CHILD-IMAGE-DRY-RUN
```

Reports:

```text
docs/audits/image_truth_v1/image_truth_img01b_missing_display_dry_run_v1.md
docs/audits/image_truth_v1/image_truth_img01b_missing_display_dry_run_v1.json
docs/audits/image_truth_v1/image_truth_img01c_storage_readiness_v1.md
docs/audits/image_truth_v1/image_truth_img01c_storage_readiness_v1.json
```

Scope:

```text
source_rows: 17
sets: mee, sm4, xy7
blocked_rows: 0
rollback_update_verified_rows: 17
db_rows_with_any_image_field: 0
storage_collision_rows: 0
dry_run_ready_for_real_apply: true
ready_for_upload_then_apply: true
```

Proofs:

```text
dry_run_proof_hash: 09731130e7d5418e748fdd3eb0b7db26db1a28d37c0ba2e982da103a00cd14d3
storage_readiness_proof_hash: 80a55b11f3eb1c8b0f45cad60ed5327fb8d0b4f637029f8a84522f6a6df44b20
```

This package stages exact child image assets only. It must update `card_printings` image fields only if approved later.

## Representative Display Package

Package:

```text
IMG-02A-MISSING-DISPLAY-REPRESENTATIVE-CHILD-IMAGE-DRY-RUN
```

Reports:

```text
docs/audits/image_truth_v1/image_truth_img02a_representative_missing_display_dry_run_v1.md
docs/audits/image_truth_v1/image_truth_img02a_representative_missing_display_dry_run_v1.json
docs/audits/image_truth_v1/image_truth_img02b_representative_storage_readiness_v1.md
docs/audits/image_truth_v1/image_truth_img02b_representative_storage_readiness_v1.json
```

Scope:

```text
source_rows: 83
blocked_rows: 0
rollback_update_verified_rows: 83
db_rows_with_any_image_field: 0
storage_collision_rows: 0
dry_run_ready_for_real_apply: true
ready_for_upload_then_apply: true
```

Proofs:

```text
dry_run_proof_hash: aa2eb46b2b2fcd4ca9e8114282cd10a626c0adf666bcb649e5e0b4cc9f75ad5f
storage_readiness_proof_hash: 24c992461851d06abbf1f5c4ca05917e34a64cc178a252cd7245ff8035e1d15d
```

This package is display coverage only. It must stay labeled as representative and must not claim exact finish, stamp, or parallel imagery.

## Guardrails

- English physical only.
- Target table is `card_printings`.
- Parent image fields must remain untouched.
- No migrations.
- No deletes.
- No merges.
- No cleanup or quarantine.
- Source URL must remain preserved in image notes or provenance.
- Representative rows must use honest confidence/status labeling.
- Real apply requires explicit approval with package fingerprint/proof text.

## Suggested Future Approval Text

Exact package:

```text
Approve real IMG-01D-MISSING-DISPLAY-EXACT-CHILD-IMAGE-UPLOAD-APPLY only. Scope: 17 child card_printing image uploads/updates from IMG-01B exact missing-display dry-run. Dry-run proof: 09731130e7d5418e748fdd3eb0b7db26db1a28d37c0ba2e982da103a00cd14d3. Storage readiness proof: 80a55b11f3eb1c8b0f45cad60ed5327fb8d0b4f637029f8a84522f6a6df44b20. No parent writes. No deletes. No merges. No migrations. No global apply.
```

Representative package:

```text
Approve real IMG-02C-MISSING-DISPLAY-REPRESENTATIVE-CHILD-IMAGE-UPLOAD-APPLY only. Scope: 83 representative child card_printing image uploads/updates from IMG-02A representative missing-display dry-run. Dry-run proof: aa2eb46b2b2fcd4ca9e8114282cd10a626c0adf666bcb649e5e0b4cc9f75ad5f. Storage readiness proof: 24c992461851d06abbf1f5c4ca05917e34a64cc178a252cd7245ff8035e1d15d. No parent writes. No deletes. No merges. No migrations. No global apply.
```

## Verification Run

Commands already run:

```text
node scripts/audits/image_truth_v1_audit.mjs
node scripts/audits/image_truth_v1_exact_variant_readiness.mjs
node scripts/audits/image_truth_v1_source_exhaustion_decision.mjs
node scripts/audits/image_truth_v1_apply_readiness.mjs
node scripts/audits/image_truth_v1_source_packet.mjs
node scripts/audits/image_truth_v1_asset_manifest.mjs
node scripts/audits/image_truth_v1_img01b_missing_display_dry_run.mjs
node scripts/audits/image_truth_v1_img01c_storage_readiness.mjs
node scripts/audits/image_truth_v1_img02a_representative_missing_display_dry_run.mjs
node scripts/audits/image_truth_v1_img02b_representative_storage_readiness.mjs
```

No DB writes were performed in this checkpoint step.
