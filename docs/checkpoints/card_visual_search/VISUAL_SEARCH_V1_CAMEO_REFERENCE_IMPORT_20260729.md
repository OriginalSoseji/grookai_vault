# Visual Search V1 Cameo Reference Import

Status: COMPLETE; CURRENT SOURCE FROZEN AND RECONCILED; NO WRITE

Date: 2026-07-29

Branch: `agent/visual-search-lab-runtime-fix`

Artifact producer commit: `0f9c53c4c02ebb4f1e47a4ae50ea9ff837a15713`

## Context

The 10,376-row paid Fact Graph corpus materially under-recorded depicted
subjects and character representations. The source extraction must remain
immutable because rerunning the model would add cost without guaranteeing
complete recovery.

The user supplied RotomAmiti's Cameo Pokemon Card Database as a curated
external source:

`https://docs.google.com/spreadsheets/d/18nIkOgqQrHZTz0TrH_gL1e1nL1RcHiCmPF5finAjToY/htmlview`

Repository inspection found that Grookai already has a governed
`CAMEO_SEARCH_V1` lane and `1,421` previously applied additive cameo
relationships. This gate therefore reconciles current source truth with those
artifacts instead of creating a duplicate system.

## Decision

- Keep paid Fact Graph artifacts unchanged.
- Import the current public workbook as external curated evidence.
- Freeze the original XLSX and per-tab CSV snapshots.
- Decode italic, light-blue, and merged-cell formatting from the XLSX.
- Preserve Pokemon and Trainer cameo identities as separate subject classes.
- Derive display forms only from explicit Notes.
- Reconcile current rows against existing approved cameo artifacts first.
- Reconcile additional rows only through exact set + card + number identity.
- Permit visual-corpus set-code derivation only after at least two distinct
  card name + number pairs agree on one unique set code.
- Leave ambiguous and unmatched records unpromoted.
- Preserve existing approved rows missing from the current sheet until a
  separate removal review.

## Permanent Artifact

`C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_1_20260721\_analysis\card_visual_cameo_reference_import_v1\2026-07-30T05-21-18-311Z_import_0f9c53c4c02e`

Required files:

- `run_plan.json`
- `source_manifest.json`
- `raw/rotomamiti_cameo_database.xlsx`
- ten raw tab CSV files
- `cameo_reference_rows.jsonl`
- `canonical_matches.jsonl`
- `ambiguous_matches.jsonl`
- `unmatched_rows.jsonl`
- `visual_corpus_overlap.jsonl`
- `visual_corpus_set_alias_evidence.json`
- `existing_approved_missing_from_current.json`
- `summary.json`
- `CAMEO_REFERENCE_RECONCILIATION.md`
- `artifact_hashes.json`

## Results

- current source rows: `4,020`
- unique deterministic source record IDs: `4,020`
- existing approved artifact rows: `1,421`
- existing approved rows still present in the current source: `1,420`
- existing approved rows absent from the current source: `1`
- additional exact canonical candidates: `909`
- total reconciled rows: `2,329`
- ambiguous canonical candidates: `114`
- unmatched source rows: `1,577`
- exact rows overlapping the paid visual corpus: `763`
- italic edge-case rows: `1,011`
- light-blue non-English rows: `934`
- same-artwork merged rows: `526`
- reconciliation mismatches: `0`

The one approved row absent from the current workbook is Trainer `Ash` on
Pikachu, SM Promos 227 (`GV-PK-SM-SM227`). It remains preserved; this gate
does not delete it.

## Explicit Display Forms

Display forms are derived only when the Notes cell explicitly supplies the
evidence:

- picture: `76`
- silhouette: `70`
- card: `65`
- costume: `51`
- statue: `40`
- plush: `35`
- food: `20`
- painting: `19`
- sign: `19`
- clothing: `14`
- logo: `11`
- toy: `8`
- accessory: `6`
- mask: `4`
- poster: `3`
- pillow: `1`

The explicit pillow row is Pikachu on Whimsicott, Fates Collide 71. It
reconciles exactly to card print
`44702053-3880-4aaf-8aef-00f57ad00d5c`.

## Slurpuff ASC 094

The current source has three card-level cameo rows for Slurpuff, Ascended
Heroes 94:

- Pikachu, Notes blank
- Snorlax, Notes `sweets`
- Swirlix, Notes `sweets`

All three reconcile to:

- card print ID: `3da1fac3-bd99-49be-aa95-61e3ffe092c7`
- GV-ID: `GV-PK-ASC-094`
- set code: `me02.5`

The founder visually confirmed Pikachu- and Snorlax-shaped cookies and stated
that the held cookie's Pokemon identity cannot be determined. The sheet's
Swirlix row remains external curator evidence requiring image-confirmed review.
No source row is used to assign an identity to the held cookie.

## Verification

- importer syntax check: passed
- focused contract tests: `12/12` passed
- combined visual-search contracts: `119/119` passed
- exact source-bucket reconciliation: `4,020/4,020`
- duplicate source record IDs: `0`
- hashed permanent artifacts: `22`
- artifact hash mismatches: `0`
- release secret packaging guard: passed
- repository-wide pre-commit shipcheck: stopped at the known runtime preflight
  because `SUPABASE_DB_URL` is unavailable; no database connection or
  statement was attempted
- provider calls: `0`
- provider cost: `$0`
- database reads: `0`
- database writes: `0`
- approvals: `0`
- embeddings: `0`
- Fact Graph mutations: `0`
- search activation: `false`

## Invariants

- Existing paid observations remain immutable.
- External curator evidence does not become pixel-level observation evidence.
- Blank Notes never imply a display form or subject kind.
- A source card-level association does not identify which individual object
  depicts the cameo.
- Existing approved cameo relationships are not duplicated.
- Existing approved relationships are not deleted because a mutable external
  workbook changed.
- Ambiguous or unmatched rows remain blocked.
- No search behavior changes before a separate merge and activation gate.

## Current Truth

Grookai does not need to repay for broad cameo recovery. The repository already
contains an additive cameo relationship system, and the current workbook adds
structured external evidence for 4,020 associations. The paid Fact Graph and
curated cameo evidence are complementary sources with different authority.

The current import exposes 909 additional exact canonical candidates, including
high-value representation searches such as Pokemon pillows, plushes, statues,
food forms, posters, and silhouettes. These are not active search facts yet.

## Exact Next Gate

Build a no-write merge proposal for the `909` additional exact canonical
candidates:

1. separate already known source rows from genuinely new or newly matchable
   rows;
2. prioritize explicit representation forms and current paid-corpus omissions;
3. image-confirm a bounded stratified sample, including Slurpuff ASC 094 and
   Pikachu pillow on Whimsicott;
4. produce additive `card_print_cameos` candidates with external provenance;
5. preserve the one current-sheet removal as a review item;
6. stop before database apply or search activation.

After the merge proposal passes, request one bounded additive apply gate. No
OpenAI rerun is required.
