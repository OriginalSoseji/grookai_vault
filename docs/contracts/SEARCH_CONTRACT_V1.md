
# Search Contract V1

## Purpose
Search must be deterministic, canonical, and consistent across Catalog, Picker, and (eventually) Web.

## Search Precedence (ordered)
- set_code/printed_set_abbrev + number
- set-name-resolved + number
- name + number (order-insensitive)
- number-only
- name-only

## Number Normalization Rule (core)
- User input normalization: strip `/total`, normalize digits, strip leading zeros to normNum.
- Query must match both representations: normNum and pad3 (e.g., 43 and 043).
- DB is NOT rewritten.
- Display preserves printed number (cp.number).

## Printed Set Abbrev Resolution
- If token matches printed_set_abbrev (e.g., SVI), resolve to canonical set code (e.g., sv01) before filtering.

## Determinism Rules
- No fuzzy guessing when constraints exist.
- If set name resolution is ambiguous (>1 match), do NOT apply set filter.

## Test Cases (copy/paste)
- "slowbro 43" == "43 slowbro" == "slowbro 043" == "043/198 slowbro"
- "sv01 43" == "sv01 043"
- "SVI 043" resolves to sv01 and returns #043 rows
- number-only "43" returns all prints with number 43 across sets
