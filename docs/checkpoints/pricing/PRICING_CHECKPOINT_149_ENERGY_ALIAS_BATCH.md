# Pricing Checkpoint 149: Energy Name Alias Batch

Date: 2026-10-15

## Admitted scope

This batch admits exactly seven TCGPlayer products covering 12 missing-price
observations across two English sets:

- Ultra Prism: Unit Energy GRW 137 and 170, plus Unit Energy LPM 138 and 171.
- Darkness Ablaze: Heat R Energy 174, Hiding D Energy 175, and Powerful C
  Energy 176.

TCGPlayer abbreviates the energy types in these display names. The canonical
Master Index spells them as GrassFireWater, LightningPsychicMetal, Fire,
Darkness, and Colorless. Every mapping is frozen by exact product ID, source
group, source title, full printed coordinate, target parent UUID, GV-ID, and set
UUID. No general abbreviation or energy-name normalization rule is added.

## Finish evidence

The seven parents have 12 source-listed children: four Holo, four Normal, and
four Reverse. Every selected finish is an active, non-provisional child and is
independently `master_verified` in the checked-in English Master Index with at
least three evidence sources. The bounded truth-review executor inserts one
verified, visible review for each child before mapping authority can be built.

The initial production rollback rehearsal passed with zero durable writes under
maintenance run `018af4f2-02d8-4f5a-8449-c4a510bd031e` and authority fingerprint
`3b4da9d5a5d8e632d8f936506902f858c69a54d16a2516b8908533257c05e937`.
The read-only exact-mapping planner selected seven products and all 12 source
observations with zero findings.

## Release boundary

Production requires the clean-commit sequence: merge the exact registry and
executors, regenerate the seven-row plan from that merged commit, dry-run and
apply the 12 truth reviews, independently read them back, build the two-set
mapping authority, dry-run and apply the seven mappings, and independently read
them back. Prices remain separate and require a later full-source shadow,
publication gate, and price readback.
