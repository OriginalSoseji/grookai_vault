# GV_ID_ASSIGNMENT_V1

Status: LOCKED

## 1. Purpose
- Assign deterministic public-facing `gv_id` values to canonical `card_prints` rows.
- Keep canonical variant rows route-addressable without collapsing distinct canonical identities.

## 2. Base Pattern
- Base canonical pattern is:
  - `GV-PK-{SET_TOKEN}-{NUMBER_TOKEN}`
- Repo-grounded examples already live in canon:
  - `GV-PK-MEW-025`
  - `GV-PK-CEL-24`
  - `GV-PK-PR-SV-167`

## 3. Set Token Rule
- `SET_TOKEN` comes from `sets.printed_set_abbrev` when available.
- If `printed_set_abbrev` is missing, fall back to normalized `card_prints.set_code`.
- Normalization:
  - uppercase
  - non-alphanumeric separators collapse to `-`

Examples:
- `sv03.5` -> `MEW`
- `svp` -> `PR-SV`
- `cel25` -> `CEL`
- fallback `legacy_orphan` -> `LEGACY-ORPHAN`

## 4. Number Token Rule
- `NUMBER_TOKEN` prefers canonical `card_prints.number`.
- Fall back to `number_plain` only when `number` is absent.
- Normalization:
  - uppercase
  - remove whitespace and non-alphanumeric separators

Examples:
- `025` -> `025`
- `BW04` -> `BW04`
- `SWSH020` -> `SWSH020`
- `H21` -> `H21`

## 5. Variant-Backed Canonical Suffix Rule
- Canonical identity deltas must diverge from the base GV ID deterministically.
- Base rows remain unsuffixed.
- `variant_key` is the primary suffix source.

### 5A. Preserved Compact Legacy Forms
- Existing compact forms stay lawful and are reused for future matching identities:
  - `a` -> append to number token
    - `GV-PK-AQ-103A`
  - `b` -> append to number token
    - `GV-PK-AQ-103B`
  - `cc` -> append to number token
    - `GV-PK-CEL-24CC`
  - `rc` -> prefix number token
    - `GV-PK-GEN-RC26`
  - `sh` -> prefix number token
    - `GV-PK-SV-SH7`
  - family-letter forms like `XYa` -> family prefix + number token + letter suffix
    - `GV-PK-PR-XY-XY67A`

### 5B. Explicit Canonical Variant Suffix Lane
- All other canonical identity deltas use:
  - `GV-PK-{SET_TOKEN}-{NUMBER_TOKEN}-{VARIANT_SUFFIX}`
- `VARIANT_SUFFIX` is derived from `variant_key`:
  - uppercase
  - non-alphanumeric separators collapse to `-`
- This is the standing rule for printed canonical identity deltas that share the same base set + number.

Examples:
- base card:
  - `GV-PK-MEW-025`
- `pokeball`:
  - `GV-PK-MEW-025-POKEBALL`
- `masterball`:
  - `GV-PK-MEW-025-MASTERBALL`
- `cosmo`:
  - `GV-PK-PR-SV-167-COSMO`
- `pokemon_together_stamp`:
  - `GV-PK-MEW-025-POKEMON-TOGETHER-STAMP`
- `staff_stamp`:
  - `GV-PK-PR-SV-105-STAFF-STAMP`
- `prerelease_stamp`:
  - `GV-PK-PR-SW-SWSH242-PRERELEASE-STAMP`

## 6. Hard Rules
- Every canonical `card_prints` row must have exactly one stable `gv_id`.
- `gv_id` must be deterministic and human-readable.
- No random hashes.
- No sequence numbers for canonical variants.
- No runtime-dependent suffixes.
- Variant-backed canonical rows must not reuse the base GV ID.

## 7. Backfill Rule
- Missing `gv_id` values are assigned by the same deterministic builder used for new rows.
- Existing non-null `gv_id` values are preserved.
- Backfill must fail closed on collisions.
- Existing unique index on `card_prints(gv_id)` remains the hard backstop.

## 8. Execution Rule
- New canonical rows must receive `gv_id` at creation time.
- Promotion execution and any backfill worker must call the same builder.
- Public routing continues to treat `gv_id` as the outward-facing canonical identity.
