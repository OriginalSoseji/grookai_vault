# Special Variant Master Index Completion Checkpoint V1

Date: 2026-06-17

## Purpose

This checkpoint records closure of the source-ready English special-variant Master Index pass.

The pass expanded Grookai's canonical card identity model beyond ordinary set/card/finish truth into recognized special cases:

- WOTC recognized error variants
- Base Set Pikachu cheek, shadowless, ghost stamp, and E3 lanes
- Jungle No Symbol holo variants
- WB Kids stamp and missing-stamp promo lanes
- residual single-card WOTC error and correction variants

## Final Discovery State

Source report:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1/special_variant_discovery_v1/special_variant_discovery_v1.json
```

Final discovery fingerprint:

```text
7c46ef1e19c32bc12783440947482b8ae78c5ce48f681baf71e7db8bc4995e30
```

Final summary:

```text
candidate_rows: 57
source_ready: 48
already_in_db: 48
master_index_ready_missing_from_db: 0
needs_second_source_or_review: 9
```

Meaning:

```text
Every source-ready special-variant lane from this pass is now represented in the DB.
```

## Website Readiness

After the DB pass, web display helpers and route smoke checks were added so the special variants are not just canonical, but usable on the public card detail surface.

Display QA report:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1/special_variant_discovery_v1/special_variant_web_display_qa_v1.md
```

Display QA fingerprint:

```text
6af2e9a35867586539b7c9b1997fac208c14b6965eb4a9af33d1efa7adb3ee6e
```

Display QA summary:

```text
expected_source_ready_rows: 48
live_db_rows_matched: 48
display_ready_rows: 48
needs_follow_up_rows: 0
```

Route smoke report:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1/special_variant_discovery_v1/special_variant_web_route_smoke_v1.md
```

Route smoke fingerprint:

```text
7ff727ed9ffe8f4542c1eee7b4d1b1082943b689aed946ea94aba3324d7b14ad
```

Route smoke summary against `http://localhost:3000`:

```text
attempted_routes: 48
route_ready_rows: 48
needs_follow_up_rows: 0
slowest_duration_ms: 2331
```

Web display label coverage now includes intentional labels for the promoted special variant lanes, including:

- No Symbol Error
- Black Flame Error
- No Damage Error
- WB Kids Stamp
- Inverted WB Kids Stamp
- Missing WB Kids Stamp
- E3 Stamp Red Cheeks
- E3 Stamp Yellow Cheeks
- 1st Edition Red Cheeks
- 1st Edition Yellow Cheeks
- Shadowless Red Cheeks
- Shadowless Yellow Cheeks
- Ghost Stamp Shadowless

## Applied Packages

### SPECIAL-VAR-01-JUNGLE-NO-SYMBOL-PARENT-INSERTS

- Scope: 16 Jungle No Symbol recognized-error parent inserts
- Identity rows: 16
- Child printings: 16 holo
- Fingerprint: `d5a01e1ae21d3ef6f007dae9efe4485a8a6b57c88e9d57da6fd99ae0b70993f6`
- SQL hash: `0d7bed6961ea56fa760bbda32133ebf0bdfc232820143bf586db24d2d2ce306a`
- Dry-run proof: `7f67f088b80af2058324230a7d0b1987fbdf3819e42ff658fdb56cb3852c9970`

### SPECIAL-VAR-02-WB-KIDS-PROMO-STAMP-PARENT-INSERTS

- Scope: 9 WB Kids promo special-case parent inserts
- Identity rows: 9
- Child printings: 9 normal
- Variants: WB Kids stamp, inverted WB Kids stamp, missing WB Kids stamp
- Fingerprint: `d6793a662528ecd9fc7a2bec19244da24da7a06df8a820b4c35c50c1d56102fc`
- SQL hash: `cf6539d044a889f51db702da396cbdb813a9b7c9251c44a06b378b52b725752c`
- Dry-run proof: `3334b32c58f50feb80baf86239009e387d56ee8634c52de235500ba17d3fe20c`

### SPECIAL-VAR-03-WOTC-SINGLE-CARD-ERROR-PARENT-INSERTS

- Scope: 8 WOTC single-card special-case parent inserts
- Identity rows: 8
- Child printings: 8
- Variant families: no damage, stage error, evolution-box error, nonholo error, no-HP error, incorrect artist
- Fingerprint: `e86d05bb30c630306e57cc4bdab5ab53f6b101d050c0e395913a2e99798d6c61`
- SQL hash: `5ca77d000f034f205e014d638bed8a2ad163bf7b499d5dd752721f2245873347`

### SPECIAL-VAR-04-BASE-PIKACHU-VARIANT-PARENT-INSERTS

- Scope: 7 Base Set Pikachu special-case parent inserts
- Identity rows: 7
- Child printings: 7 normal
- Variant families: E3 red/yellow cheeks, first-edition red/yellow cheeks, ghost stamp, shadowless red/yellow cheeks
- Fingerprint: `1707129776982c793e5e507370e1f425acbb9a056f25f8a01dfc165394274dcb`
- SQL hash: `75ae3600600ea5eb0c730e05cf14a1938dc7d06f1527fce5a4b4d0183494e38a`

### SPECIAL-VAR-05-RESIDUAL-SOURCE-READY-PARENT-INSERTS

- Scope: 4 residual source-ready special-case parent inserts
- Identity rows: 4
- Child printings: 4
- Variant families: `d_fending_error`, `sideways_fighting_energy_error`, `missing_holo_evolution_box_error`, `corrected_text_variant`
- Fingerprint: `d8868b21fb25b7834ad967dcd4659a8ff7ff750b4a516825eb2d6a4a0a2d96c2`
- SQL hash: `15922fd72f503afa5ffd0af086680222ae19c5422d07f38297a65d1951c0d32a`

### SPECIAL-VAR-06-FINAL-SOURCE-READY-PARENT-INSERTS

- Scope: 3 final source-ready special-case parent inserts
- Identity rows: 3
- Child printings: 3
- Variants: Black Flame Ninetales, Missing WB Stamp Mewtwo, Missing WB Stamp Dragonite
- Fingerprint: `74ba5eeb13f6418db5ccfe71c53f2bddb92eadaaa87503341b267fce991825d3`
- SQL hash: `b215ed71141a18e174dc36eb1624a669a21b3fac0990d6fc7848173deef33e33`

## Remaining Blocked Rows

These are not safe to promote yet.

| Candidate | Reason |
| --- | --- |
| `base1-58-pikachu-grey-first-edition-stamp` | Needs a second exact source naming Base Set Pikachu #58 grey/gray 1st Edition stamp as a repeatable canonical variant. |
| `base6-75-exeggcute-legendary-collection-reverse-holo-shift-review` | Current evidence is too broad; needs exact repeatable Exeggcute #75 reverse holo shift/misalignment evidence. |
| `basep-2-electabuzz-missing-wb-kids-stamp` | Bulbapedia names the lane, but the second collector source does not confirm Electabuzz specifically. |

Blocked evidence report:

```text
docs/audits/verified_master_set_index_v1/english_master_index_v1/special_variant_discovery_v1/special_variant_blocked_evidence_review_v1.md
```

## Source Families Used

- Bulbapedia Error Cards
- Bulbapedia Jungle
- Bulbapedia Wizards Black Star Promos
- Elite Fourum WOTC corrected-errors guide
- Elite Fourum Base Pikachu variant guide
- Elite Fourum WOTC promo image list
- Elite Fourum Black Flame Ninetales thread
- CGC Black Flame Ninetales article
- PriceCharting exact product pages
- PSA card spec pages
- TCG ONE WOTC errata references
- Big Orbit Base Set edition guide

## Safety Record

```text
global_apply_performed: false
migrations_created: false
unsupported_cleanup_performed: false
quarantine_performed: false
unapproved_rows_promoted: false
blocked_rows_promoted: false
```

Every durable write was package-scoped and required an exact operator approval string before execution.

## Resume Guidance

Next safe actions:

1. Leave the three blocked rows out of canonical truth until exact second-source evidence is found.
2. Add image-truth work for newly inserted special variants.
3. Run broader search-result QA for special variant grouping and ranking.
4. If new special cases are found, add them through the same discovery -> fixture -> guarded dry-run -> explicit apply pattern.

Do not infer a canonical special variant from a single collector mention, listing title, or broad family rule.
