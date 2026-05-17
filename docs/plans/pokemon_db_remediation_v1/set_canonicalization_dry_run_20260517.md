# Set Canonicalization Dry Run - 2026-05-17

Status: dry-run only. This report performed read-only Supabase queries inside `begin transaction read only` and made no database changes.

## Inputs

- Source plan: `docs/plans/pokemon_db_remediation_v1/set_canonicalization_plan.md`
- Source audit: `docs/audits/pokemon_master_set_audit_v1/summary.json`
- Duplicate groups audited: 29
- Candidate DB set rows audited: 58

## Classification Summary

| Classification | Count | Meaning |
| --- | ---: | --- |
| Alias candidate | 20 | One row owns the card inventory and sibling row is empty. Candidate canonical can be reviewed, but this is not approval to write. |
| Review stop | 5 | Both sibling rows contain duplicate card rows with full overlap. Human review must decide source authority and merge strategy. |
| Hard stop | 4 | Both sibling rows contain card rows with unique identity keys. Do not merge or alias without deeper evidence. |

Important: proposed canonical codes below are dry-run candidates only. They are not implementation approval and must not be applied without a separate write plan.

## Alias Candidate Groups

| Name key | Codes | Dry-run candidate canonical | Ownership signal |
| --- | --- | --- | --- |
| 151 | `sv03.5`, `sv3pt5` | `sv03.5` | `sv03.5` has 210 card rows / 207 unique keys; `sv3pt5` has 0 card rows. |
| black bolt | `sv10.5b`, `zsv10pt5` | `sv10.5b` | `sv10.5b` has 180 card rows / 172 unique keys; `zsv10pt5` has 0 card rows. |
| champions path | `swsh3.5`, `swsh35` | `swsh3.5` | `swsh3.5` has 83 card rows / 80 unique keys; `swsh35` has 0 card rows. |
| crown zenith | `swsh12.5`, `swsh12pt5` | `swsh12.5` | `swsh12.5` has 167 card rows / 160 unique keys; `swsh12pt5` has 0 card rows. |
| dragon majesty | `sm7.5`, `sm75` | `sm75` | `sm75` has 78 card rows / 78 unique keys; `sm7.5` has 0 card rows. |
| heartgold soulsilver promos | `hgssp`, `hsp` | `hsp` | `hsp` has 25 card rows / 25 unique keys; `hgssp` has 0 card rows. |
| journey together | `sv09`, `sv9` | `sv09` | `sv09` has 198 card rows / 190 unique keys; `sv9` has 0 card rows. |
| legendary collection | `base6`, `lc` | `base6` | `base6` has 110 card rows / 110 unique keys; `lc` has 0 card rows. |
| mega evolution | `me01`, `me1` | `me01` | `me01` has 300 card rows / 271 unique keys; `me1` has 0 card rows. |
| obsidian flames | `sv03`, `sv3` | `sv03` | `sv03` has 237 card rows / 230 unique keys; `sv3` has 0 card rows. |
| paradox rift | `sv04`, `sv4` | `sv04` | `sv04` has 292 card rows / 266 unique keys; `sv4` has 0 card rows. |
| phantasmal flames | `me02`, `me2` | `me02` | `me02` has 131 card rows / 130 unique keys; `me2` has 0 card rows. |
| scarlet and violet | `sv01`, `sv1` | `sv01` | `sv01` has 283 card rows / 258 unique keys; `sv1` has 0 card rows. |
| shining fates | `swsh4.5`, `swsh45` | `swsh4.5` | `swsh4.5` has 75 card rows / 75 unique keys; `swsh45` has 0 card rows. |
| shining legends | `sm3.5`, `sm35` | `sm3.5` | `sm3.5` has 78 card rows / 78 unique keys; `sm35` has 0 card rows. |
| stellar crown | `sv07`, `sv7` | `sv07` | `sv07` has 194 card rows / 175 unique keys; `sv7` has 0 card rows. |
| surging sparks | `sv08`, `sv8` | `sv08` | `sv08` has 271 card rows / 252 unique keys; `sv8` has 0 card rows. |
| temporal forces | `sv05`, `sv5` | `sv05` | `sv05` has 246 card rows / 218 unique keys; `sv5` has 0 card rows. |
| twilight masquerade | `sv06`, `sv6` | `sv06` | `sv06` has 255 card rows / 226 unique keys; `sv6` has 0 card rows. |
| white flare | `rsv10pt5`, `sv10.5w` | `sv10.5w` | `sv10.5w` has 177 card rows / 173 unique keys; `rsv10pt5` has 0 card rows. |

## Review Stops

These groups have duplicate card rows in both sibling sets, but the identity keys fully overlap. They need source-authority review before a canonical row can be selected.

| Name key | Codes | Stop reason | Ownership signal |
| --- | --- | --- | --- |
| best of game | `bog`, `bp` | duplicate card rows in both sets | `bog`: 9 cards, 0 unique, 9 overlap; `bp`: 9 cards, 0 unique, 9 overlap. |
| ex trainer kit 2 minun | `tk-ex-m`, `tk2b` | duplicate card rows in both sets | `tk-ex-m`: 12 cards, 0 unique, 12 overlap; `tk2b`: 12 cards, 0 unique, 12 overlap. |
| ex trainer kit 2 plusle | `tk-ex-p`, `tk2a` | duplicate card rows in both sets | `tk-ex-p`: 12 cards, 0 unique, 12 overlap; `tk2a`: 12 cards, 0 unique, 12 overlap. |
| ex trainer kit latias | `tk-ex-latia`, `tk1a` | duplicate card rows in both sets | `tk-ex-latia`: 10 cards, 0 unique, 10 overlap; `tk1a`: 10 cards, 0 unique, 10 overlap. |
| ex trainer kit latios | `tk-ex-latio`, `tk1b` | duplicate card rows in both sets | `tk-ex-latio`: 10 cards, 0 unique, 10 overlap; `tk1b`: 10 cards, 0 unique, 10 overlap. |

## Hard Stops

These groups have real card ownership on both sides with unique identity keys in each sibling. Treat them as blocked until a deeper evidence report proves whether they are true duplicates, source splits, partial imports, or different identity lanes.

| Name key | Codes | Stop reason | Ownership signal |
| --- | --- | --- | --- |
| paldean fates | `sv04.5`, `sv4pt5` | two card-bearing sets with unique identity keys | `sv04.5`: 245 cards, 51 unique, 137 overlap; `sv4pt5`: 248 cards, 108 unique, 137 overlap. |
| pokemon go | `pgo`, `swsh10.5` | two card-bearing sets with unique identity keys | `pgo`: 90 cards, 34 unique, 54 overlap; `swsh10.5`: 88 cards, 16 unique, 54 overlap. |
| prismatic evolutions | `sv08.5`, `sv8pt5` | two card-bearing sets with unique identity keys | `sv08.5`: 180 cards, 145 unique, 0 overlap; `sv8pt5`: 194 cards, 180 unique, 0 overlap. |
| shrouded fable | `sv06.5`, `sv6pt5` | two card-bearing sets with unique identity keys | `sv06.5`: 99 cards, 23 unique, 47 overlap; `sv6pt5`: 112 cards, 52 unique, 47 overlap. |

## Source Mapping Signals

| Group | Candidate/source notes |
| --- | --- |
| 151 | `sv03.5`: JustTCG + TCGdex + TCGPlayer mappings; `sv3pt5`: no card mappings but has release date metadata. |
| Best of Game | `bog`: JustTCG + TCGdex + TCGPlayer mappings; `bp`: PokemonTCG mappings and release date. |
| Black Bolt | `sv10.5b`: JustTCG + TCGdex mappings; `zsv10pt5`: no card mappings. |
| Champion's Path | `swsh3.5`: JustTCG + TCGdex + TCGPlayer mappings; `swsh35`: release metadata only. |
| Crown Zenith | `swsh12.5`: JustTCG + TCGdex + TCGPlayer mappings; `swsh12pt5`: release metadata only. |
| Dragon Majesty | `sm75`: JustTCG + TCGdex + TCGPlayer mappings; `sm7.5`: no card mappings. |
| Trainer Kit duplicate rows | Source authority is split across TCGdex, PokemonTCG, JustTCG, and TCGPlayer depending on pair. Review before canonical choice. |
| Paldean Fates | `sv04.5`: TCGdex mappings; `sv4pt5`: JustTCG + PokemonTCG mappings. Hard stop. |
| Pokemon GO | `pgo`: JustTCG + TCGPlayer mappings; `swsh10.5`: TCGdex mappings. Hard stop. |
| Prismatic Evolutions | `sv08.5`: TCGdex mappings; `sv8pt5`: JustTCG mappings. Hard stop. |
| Shrouded Fable | `sv06.5`: TCGdex mappings; `sv6pt5`: JustTCG mappings. Hard stop. |

## Dry-Run Implementation Queue

No implementation is authorized from this report. A future write plan would need to:

1. Start with the 20 alias candidates where one sibling row has zero card rows.
2. Preserve or merge metadata from empty alias rows, especially release dates on `sv3pt5`, `swsh35`, `swsh12pt5`, `sv9`, `me1`, `sv3`, `sv4`, `me2`, `sv1`, `swsh45`, `sm35`, `sv7`, `sv8`, `sv5`, `sv6`, and `rsv10pt5`.
3. Review `justtcg_set_mappings` before any alias/canonical update because many card-owning rows are referenced there.
4. Resolve the 5 review stops with duplicate overlapping cards before any card backfill.
5. Block the 4 hard stops until a per-card evidence diff explains all unique identity keys.
6. Rerun the master set audit after any future authorized canonicalization implementation.

## Explicit No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No migration repair.
- No `db pull`.
- No production data mutation.
