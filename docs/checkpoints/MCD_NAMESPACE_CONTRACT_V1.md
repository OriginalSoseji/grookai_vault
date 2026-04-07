# MCD_NAMESPACE_CONTRACT_V1

## Context

`printed_set_abbrev = MCD` does not identify a single public set. It identifies a family of McDonald's promo sets that recur across multiple years.

Live catalog evidence already shows both sides of the problem:

- legacy unsuffixed rows exist under `GV-PK-MCD-*`
- canonical year-qualified rows already exist under `GV-PK-MCD-YYYY-*`

## Contract

McDonald's promos are treated as:

- family: `MCD`
- required disambiguator: verified year

Canonical `gv_id` format:

- `GV-PK-MCD-<YEAR>-<NUMBER>`

Examples:

- `GV-PK-MCD-2011-1`
- `GV-PK-MCD-2019-12`
- `GV-PK-MCD-2021-25`

## Explicit Set-Code Registry

The builder uses an explicit registry, not heuristics, for live verified MCD set codes:

- alias identity lanes: `2011bw`, `2012bw`, `2014xy`, `2015xy`, `2016xy`, `2017sm`, `2018sm`, `2019sm`, `2021swsh`
- canonical lanes: `mcd11`, `mcd12`, `mcd14`, `mcd15`, `mcd16`, `mcd17`, `mcd18`, `mcd19`, `mcd21`, `mcd22`

Mapped years:

- `2011bw`, `mcd11` -> `2011`
- `2012bw`, `mcd12` -> `2012`
- `2014xy`, `mcd14` -> `2014`
- `2015xy`, `mcd15` -> `2015`
- `2016xy`, `mcd16` -> `2016`
- `2017sm`, `mcd17` -> `2017`
- `2018sm`, `mcd18` -> `2018`
- `2019sm`, `mcd19` -> `2019`
- `2021swsh`, `mcd21` -> `2021`
- `mcd22` -> `2022`

## Enforcement

`buildCardPrintGvIdV1` now:

- detects the MCD family from `printed_set_abbrev` and/or explicit set-code registry
- requires a verified year via explicit input or registry-backed `setCode`
- emits `GV-PK-MCD-YYYY-*` instead of legacy `GV-PK-MCD-*`
- throws `gv_id_mcd_year_missing` if an MCD row lacks a verified year
- throws `gv_id_mcd_year_invalid` if an explicit year token is malformed

Core generation surfaces can also capture the resolved namespace decision for logging/reporting.

## Migration Boundary

This contract does not rewrite existing legacy rows.

Legacy unsuffixed `GV-PK-MCD-*` rows remain migration work for a separate explicit contract. New generation must not extend that legacy namespace.

## Immediate Effect

This prevents new cross-year `GV-PK-MCD-*` collisions and makes future MCD generation deterministic. It also means MCD-related promotion audits must now be re-evaluated against the year-qualified namespace rather than the legacy unsuffixed namespace.
