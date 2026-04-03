# CONTRACT MISMATCH FINDINGS

- Remote live schema does not match earlier set-shape assumptions. The live `sets` table uses `code`, not `set_code`, and `game` is text, not a `game_id` FK on `sets`.
- Remote live parent identity is not complete. `11790` `card_prints` rows are missing `set_code` or `number`, including `11758` with both null.
- Supported null-parent rows are not isolated junk. They are materially referenced by `10620` mapped parents, `10620` trait-linked parents, `10508` printing-linked parents, and `10620` rows in `v_card_prints_web_v1`.
- Remote identity subsystem rollout is incomplete. `card_print_identity` exists, but live remote row count is `0`; no BA identity rows and no tcg_pocket identity rows exist remotely.
- Remote still retains legacy parent uniqueness. `uq_card_prints_identity` remains present on live `card_prints`, which differs from the intended identity-subsystem end state.
- Current live domain reality does not map cleanly to the approved canonical identity domain list. Observed parent buckets are `null/unknown/unclassified=31051, tcg_pocket=2947`.
- Remote BA state is empty, not promoted. Live remote BA sets present = `false`, BA card_prints = `0`, BA identity rows = `0`.
- Live printed identity truth is not purely numeric-only. Linked raw payload number samples already include alphanumeric or symbolic cases such as `105a, 111a, 24a, 43a, 54a`.
- `tcg_pocket` remains live on parent rows with `2947` `card_prints` and zero identity rows, so the exclusion contract is honored only at the identity layer, not by absence from canon parents.
