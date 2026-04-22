# stamped_manual_review_clusters_v1

## 1. Purpose

`stamped_manual_review_clusters_v1.mjs` groups stamped manual-review rows into coherent identity clusters and attaches route-oriented context. It is an inspection and batch-planning utility, not a promotion worker.

## 2. Why it exists

Stamped source rows arrive with different identity signals: family-only Prize Pack, explicit Prize Pack series marker, named event stamp, prerelease marker, and other overlays. Grouping those rows prevents mixed-bag execution and lets later passes choose one coherent rule or evidence question at a time.

## 3. Inputs

- Fixed checkpoint input: `docs/checkpoints/warehouse/stamped_identity_rule_apply_v1.json`.
- Live DB read access for base-row matching.
- Source row fields such as source set id, stamp pattern family, candidate name, printed number, stamp label, and variant key.

## 4. Outputs

- Manual review cluster checkpoint files.
- Cluster summaries and next executable batch suggestions where supported.
- No DB writes.
- No canon writes.

## 5. Safe usage

- Use when planning stamped manual-review work.
- Treat cluster output as an organizer for later bounded passes.
- Use the cluster name to keep a route or evidence pass coherent.
- Re-run only when the stamped input checkpoint changes.

## 6. Unsafe usage

- Treating a cluster as proof that rows are READY.
- Promoting directly from cluster membership.
- Mixing cluster shapes in one evidence or route pass.
- Using lower-confidence base matches as final route proof.

## 7. Governing contracts

- `STAMPED_IDENTITY_RULE_V1`
- `GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1`
- `PRIZE_PACK_SERIES_MARKER_IDENTITY_RULE_V1`
- `EVENT_AND_PRERELEASE_BASE_ROUTE_RULE_V1`

## 8. Related checkpoints

- `docs/checkpoints/warehouse/stamped_manual_review_prize_pack_series_marker_ready_batch_v1.json`
- `docs/checkpoints/warehouse/prize_pack_base_route_repair_v1.json`
- `docs/checkpoints/warehouse/prize_pack_evidence_v1.json`

## 9. Common failure modes

- Row has an unclassified source set or stamp pattern family.
- Cluster contains mixed route questions.
- Base route lookup returns multiple plausible rows.
- Cluster planning is mistaken for evidence enrichment.

## 10. Verification checklist

- Each output cluster has one shared identity shape.
- Any executable batch suggestion is separately validated before bridge or promotion.
- No DB writes occurred.
- Later work cites a target cluster or target slice artifact.
