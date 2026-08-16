# MTG Canonical Catalog Reconciliation V1

- Recorded at: `2026-08-13T21:56:26.861Z`
- Result: **COLLISIONS REQUIRE REVIEW**
- Database writes: `0`
- Scryfall bulk SHA-256: `4d74b3827c1de6cc882dede2f6a75e74f67974f2bc49054693ba7e3413fb6c7c`

## Candidate Catalog

- Bulk card objects: `116703`
- English paper print candidates: `104712`
- Canonical set candidates: `953`
- Planned printing-finish rows: `158262`
- Candidates with source image references: `104550`
- Candidates without a TCGPlayer product ID: `5845`

## Exact TCGPlayer Crosswalk

- Production Magic products: `117267`
- Scryfall exact product IDs: `97918`
- Scryfall exact product/subtype lanes: `148346`
- Exact IDs present in the warehouse: `97917`
- Exact IDs absent from the warehouse: `1`
- Warehouse products not linked by the candidate catalog: `19350`
- Exact supported Normal/Foil price lanes: `144482`
- Exact positive Normal/Foil marketPrice lanes: `142690`
- Missing or unsupported source price lanes: `3864`
- Etched product links preserved but excluded from V1: `1150`
- Product ownership collisions: `26`
- Candidate payload SHA-256: `857fd2246f75965a57922b6fc12ddb99b8d433e156edf4c17052b32b68a32b4c`
- Exact mapping plan SHA-256: `233120f9f3b75b82e59741edd5613c76f2bb99c47b37578848f8b61cb649668c`

## Decision

This output is a deterministic import and crosswalk dry-run. It does not authorize canonical writes, Storage writes, image repoints, exact mapping writes, or pricing publication. Missing and unlinked products remain preserved source evidence.
