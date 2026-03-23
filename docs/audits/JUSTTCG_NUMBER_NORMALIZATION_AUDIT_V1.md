# JUSTTCG_NUMBER_NORMALIZATION_AUDIT_V1

Status: ACTIVE  
Type: Worker Audit  
Scope: Printed-number normalization behavior for the direct JustTCG structure mapping lane.

---

## Purpose

Determine whether the remaining aligned-set failures in the direct JustTCG structure lane are caused by number-shape mismatches or true upstream misses, then patch the worker only for the proven exact query shape.

This audit is intentionally narrow:

- no fuzzy writes
- no set-alignment changes
- no relaxed identity contract

---

## Audit Method

Evidence sources:

- current direct worker: `backend/pricing/promote_justtcg_direct_structure_mapping_v1.mjs`
- live upstream probes through `backend/pricing/test_justtcg_set_number_probe_v1.mjs`
- bounded failure scan of the current aligned remainder

The audit tested:

1. current worker query shape
2. alternate exact number query variants
3. whether alternate variants actually recover usable JustTCG candidates
4. whether recovered candidates still satisfy the existing exact normalized identity contract

---

## Sample Failing Rows

These are aligned-set rows where the current raw query shape failed before the patch.

| card_print_id | gv_id | set_code | set_name | Grookai raw number | Grookai normalized number | JustTCG queried number | JustTCG returned card numbers |
|---|---|---|---|---|---|---|---|
| `c5a6b6da-6e46-4721-94c6-5f0ad332d0d7` | `GV-PK-PR-BLW-BW04` | `bwp` | `BW Black Star Promos` | `BW04` | `BW4` | `BW04` | none |
| `218465f1-d753-4c1c-b0af-656654092afe` | `GV-PK-PR-BLW-BW05` | `bwp` | `BW Black Star Promos` | `BW05` | `BW5` | `BW05` | none |
| `3087efa0-9ef8-4365-8820-bcc14e26a7e8` | `GV-PK-PR-DPP-DP48` | `dpp` | `DP Black Star Promos` | `DP48` | `DP48` | `DP48` | none |
| `bfb6df11-674d-4b4f-83b8-41755c1b4e31` | `GV-PK-PR-SV-105` | `svp` | `SVP Black Star Promos` | `105` | `105` | `105` | none |
| `a0af13a3-8131-4f33-ab45-5602a3e74f1e` | `GV-PK-PR-NP-5` | `np` | `Nintendo Black Star Promos` | `5` | `5` | `5` | none |

---

## Alternate Query Probe Results

### Proven recoveries

| Row | Current query | Current result | Alternate exact query | Alternate result | Safe recovery? |
|---|---|---|---|---|---|
| `GV-PK-PR-BLW-BW04` | `BW04` | none | `BW004` | `BW004` | Yes |
| `GV-PK-PR-BLW-BW05` | `BW05` | none | `BW005` | `BW005` | Yes |

Live probe proof:

- `GET /cards?game=pokemon&set=black-and-white-promos-pokemon&number=BW04...` -> `count: 0`
- `GET /cards?game=pokemon&set=black-and-white-promos-pokemon&number=BW004...` -> `count: 1`
- `GET /cards?game=pokemon&set=black-and-white-promos-pokemon&number=BW005...` -> `count: 1`

### Retrieval difference that is not safe automatic recovery

| Row | Current query | Current result | Alternate query | Alternate result | Safe recovery? |
|---|---|---|---|---|---|
| `GV-PK-PR-DPP-DP48` | `DP48` | none | `48` | `48/123`, `48/124` | No |

Interpretation:

- JustTCG can sometimes retrieve slash-number rows from a bare numerator query
- that is not strong enough for automatic writes because it broadens candidate scope and changes the printed-number shape
- this remains retrieval-only, not automatic write authority

### True misses in the sample

These remained misses after alternate exact probes:

- `GV-PK-PR-SV-105`
- `GV-PK-PR-NP-5`
- `GV-PK-PR-BLW-BW77`
- `GV-PK-PR-BLW-BW95`
- `GV-PK-PR-DPP-DP54`

These should continue to fail closed.

---

## Pattern Classification

| Pattern | Audit result | Notes |
|---|---|---|
| Left-zero padding mismatch | **Proven** | `BW04 -> BW004`, `BW05 -> BW005` |
| Prefix spacing mismatch | Not proven | No sampled recovery required whitespace changes |
| Slash formatting mismatch | **Observed but retrieval-only** | `DP48 -> 48` retrieves `48/123` and `48/124`, but not safe for automatic writes |
| Promo prefix mismatch | **Proven only as padded promo suffix** | The real issue is prefixed short promo codes needing a 3-digit numeric suffix |
| TG/GG style mismatch | Not observed in sampled failures | No proven recovery in this audit |
| Other proven pattern | None beyond the above | No broader numeric-only mismatch was proven |

---

## What JustTCG Accepts

### Plain numeric queries

JustTCG already accepts unpadded plain numeric queries in many sets.

Positive control:

- `GET /cards?game=pokemon&set=sv-scarlet-violet-promo-cards-pokemon&number=99...`
- returns `Shroodle - 099`

Interpretation:

- plain numeric rows do **not** need a global padding rewrite
- padding every numeric query would broaden this fix beyond what the audit proves

### Prefixed promo-code queries

JustTCG does **not** apply one global rule.

Observed behavior:

- many prefixed queries already work as stored, for example `BW01`, `BW03`, `BW06`
- some short prefixed promo codes only resolve when the numeric suffix is padded to three digits, for example `BW004`, `BW005`

Interpretation:

- JustTCG expects a mix
- the correct worker behavior is a small exact variant set, not one universal normalization string

---

## Recommended Query Rule

### Exact query rule

For direct structure matching:

1. query the raw printed number first
2. if that returns zero candidates and the value matches `PREFIX + 1-2 digit numeric suffix`, retry with:
   - same prefix
   - numeric suffix padded to 3 digits
3. stop there

Examples:

- `BW04` -> try `BW04`, then `BW004`
- `BW05` -> try `BW05`, then `BW005`

### Do not add these fallbacks

- bare numerator fallback for slash families
- generic `number_plain` fallback
- fuzzy numeric equivalence
- global padding of all numeric rows

Reason:

- those patterns were not proven safe for automatic writes

---

## Worker Patch Result

Patched worker:

- `backend/pricing/promote_justtcg_direct_structure_mapping_v1.mjs`

New behavior:

- current raw number remains first priority
- exact prefixed short-code zero-pad retry is attempted only after a zero-result miss
- downstream exact normalized number + exact normalized name logic is unchanged
- ambiguity behavior is unchanged
- conflict behavior is unchanged

Additional logging:

- worker row output now shows `justtcg_query_number`

---

## Dry-Run Proof After Patch

Bounded proof:

- `node backend\pricing\promote_justtcg_direct_structure_mapping_v1.mjs --dry-run --limit=100`

Recovered sample rows:

- `GV-PK-PR-BLW-BW04` now uses `justtcg_query_number: BW004` and becomes `WOULD_UPSERT_EXACT_MATCH`
- `GV-PK-PR-BLW-BW05` now uses `justtcg_query_number: BW005` and becomes `WOULD_UPSERT_EXACT_MATCH`

Unchanged fail-closed behavior in the same dry-run:

- `GV-PK-PR-BLW-BW02` remains `SKIP_AMBIGUOUS`
- `GV-PK-PR-BLW-BW77` remains `SKIP_NO_CANDIDATE_ROWS`
- no conflict behavior changed

Patch outcome on the bounded batch:

- `inspected: 100`
- `exact_match: 2`
- `ambiguous: 90`
- `no_candidate_rows: 8`
- `conflicting_existing: 0`
- `would_upsert: 2`
- `errors: 0`

Previously failing shape-mismatch rows recovered when identity was the same, and unsafe rows remained skipped.

---

## Conclusion

The direct-structure lane did have a real printed-number query mismatch, but it was narrower than a global normalization problem.

What was proven:

- the real automatic-recovery family is prefixed short promo codes that require a 3-digit padded suffix in JustTCG
- plain numeric rows already work without a global rewrite
- slash-family retrieval differences exist, but they are not safe automatic write authority

Final rule:

- keep exact matching fail-closed
- retry only the proven prefixed short-code padded form
- do not broaden into generic numeric or slash fallback matching
