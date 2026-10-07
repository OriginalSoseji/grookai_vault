# Collectr printed identity labels — October 7, 2026

Local implementation now includes main `4f0af6c54b7e5c87f7e11a7314c5eb72b6596b0a`,
preserving PR604, PR606 and the earlier card-review documentation. No deployment, native upload,
production save, schema change or canonical data write occurred in this batch.

The shared server/web matcher and mirrored native preview now recognize:

- Pokemon Center Exclusive only against the explicit Pokemon Center stamped
  variant and printed modifier, never the ordinary parent or another stamp.
- Holo Common only against a Common, unmodified parent and one active holo
  child; conflicting Variance stays in review. The rarity label is retained
  until the catalog matcher validates it.
- The reviewed Imakuni's Doduo / Imakuni?'s Doduo punctuation difference only
  at Evolutions/xy12 number112 with no variant or printed modifier.

Original name, set, finish, cost and all other CSV fields remain unchanged.
Unknown and stacked labels, foreign identities, mismatched names/numbers,
grades, missing printing evidence and ambiguous printings stay held.

## Qualification

The unchanged 1,872-row original export was compared with the verified PR603
preview and all 1,322 saved source groups. Seven additional source rows/copies
qualify: four Pokemon Center stamped copies, two Detective Pikachu Holo Common
copies, and one Evolutions Imakuni?'s Doduo. All other preview rows, source
records, choices, quantities and USD costs are exactly unchanged.

Fresh read-only public catalog verification repeated the full card preview and
server target resolution. Its 301 reads produced the same complete preview;
all seven server targets retained exact parents, children, costs and quantities.
Sealed catalog evidence is retained from PR603; sealed behavior is unchanged.

Local checks: 1,004 importer/web/server contracts passed; 448 native importer
tests passed, with one existing opt-in private export test skipped. The original
export was exercised separately by the private full-source qualification above.
Web TypeScript and targeted Dart analysis passed. No physical-device claim is
made; the user waived that requirement for importer work.

Final review added three shared regressions for Holo Common followed by a
repeated-number suffix. That stacked form stays held for Normal, blank and
Holofoil Variance, preventing number normalization from bypassing the finish
gate. All 32 native identity-label cases and 522 focused web/server cases pass;
the full-source requalification still resolves exactly the same seven copies.
Fresh final evidence lives under the private `release-final/` directory.

Normal release checks use the retained, permitted Collectr 428 lab for the
importer build. Production's read-only baseline is429; this no-schema release
does not claim a fresh429 schema replay. The initial Sales Desk lab selection
was rejected by the existing build guard and its failure log is retained.

Private authority:
`C:/grookai_vault_operator_artifacts/collectr_card_labels_20261007/CHECKPOINT.json`.
It indexes the original-export comparison, fresh catalog evidence, target
resolution and test logs. Private collection data stays outside this repository.

## Remaining work

The live collection remains at 1,609 source-accounted copies and 550 review rows.
After a future qualified release and separately verified incremental save,
the projected counts are 1,616 copies and 543 review rows. These are projections,
not a completed import.

Next: normal combined-source release checks, deployment/readback and a fresh
incremental save with independent copy/source-group verification. Preserve
all prior receipts; never reuse PR603's consumed request. The matching predicates
are shared by website/server and native source, but neither source parity nor
local tests establish a new native distribution.

The unresolved graded-item design choice remains pending. The other name/variant
cases still lack sufficient positive evidence; do not use same-number matches,
strip language/stamp qualifiers, or treat Rare Secret alone as proof of an
unsupported combined artwork label.
