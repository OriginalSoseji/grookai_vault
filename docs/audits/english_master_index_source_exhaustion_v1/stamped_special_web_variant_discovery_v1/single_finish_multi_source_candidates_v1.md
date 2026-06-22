# Single-Finish Multi-Source Stamped/Special Candidates V1

Generated: 2026-06-21

This report is audit-only. It extracts rows from the stamped/special web variant discovery pass where:

- the exact stamped/variant identity appears in two source pages
- only one finish label was detected by the web-discovery parser
- no DB write was performed

These rows are not automatically write-ready. They are the best candidates for a dedicated guarded dry-run only after the finish evidence is checked against the broader source context.

## Safety

- db_writes_performed: false
- migrations_created: false
- apply_performed: false
- cleanup_performed: false

## Candidates

| set | number | card | variant | detected finish | source URLs |
| --- | --- | --- | --- | --- | --- |
| bw1 | 105 | Grass Energy | Play! Pokemon Stamp | normal | PokeScope; Scrydex |
| dv1 | 6 | Bagon | League Stamp | holo | PokeScope; Scrydex |
| dv1 | 7 | Shelgon | League Stamp | holo | PokeScope; Scrydex |
| dv1 | 10 | Latios | Dragon Vault Stamp | holo | PokeScope; Scrydex |
| dv1 | 11 | Rayquaza | Dragon Vault Stamp | holo | PokeScope; Scrydex |
| dv1 | 16 | Haxorus | Dragon Vault Stamp | holo | PokeScope; Scrydex |

## Interpretation

The five Dragon Vault rows already have a rollback-only guarded dry-run artifact:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_dv1_stamp_holo_review_ready_guarded_dry_run_v1.json
```

The BW1 Grass Energy row remains blocked because broader manual evidence shows crosshatch / holofoil / reverse label ambiguity. It must not be promoted from the two web pages alone.

## Machine-Readable Companion

```text
docs/audits/english_master_index_source_exhaustion_v1/stamped_special_web_variant_discovery_v1/single_finish_multi_source_candidates_v1.json
```
