# Missing Cards Backfill Plan

Status: planning only. This file proposes future dry-run backfill review only. It authorizes no Supabase writes, migrations, inserts, updates, deletes, or migration repair.

## Why Backfill Comes After Canonicalization And Number Normalization

The audit found 617 missing PkmnCards checklist rows and 30 missing secret-range cards, but those gaps sit on top of duplicate set aliases, unmatched master sets, and number-normalization defects. A missing card cannot be safely assigned until its canonical target set is known. A card number cannot be trusted until direct and source-derived number evidence has been reviewed. Secret-range rows need stronger evidence because they are the easiest place to create false positives.

Hard rules for any future implementation:

- No card insert until canonical target set is resolved.
- No secret-range insert until printed identity and set ownership are proven.
- No variant or finish rows during canonical card backfill unless separately authorized.

## Priority Order From Audit Evidence

| Priority | Group | Missing | Missing secret | DB set codes | Why this priority |
| ---: | --- | ---: | ---: | --- | --- |
| 1 | Shiny Vault | 94 | 0 | none | Largest gap and no matched DB set; requires collection policy first. |
| 2 | Mega Evolution Promos | 39 | 16 | `mep` | High secret-range risk; existing set has partial rows and extra key signal. |
| 3 | TCG Classic Venusaur | 34 | 0 | none | Complete missing physical product deck/checklist. |
| 4 | TCG Classic Charizard | 34 | 0 | none | Complete missing physical product deck/checklist. |
| 5 | TCG Classic Blastoise | 34 | 0 | none | Complete missing physical product deck/checklist. |
| 6 | Guardians Rising | 25 | 1 | `sm2` | Large established-set gap with one secret-range candidate. |
| 7 | Burning Shadows | 23 | 0 | `sm3` | Large established-set gap. |
| 8 | Legendary Treasures | 20 | 0 | `bw11` | Large legacy gap and one extra-key signal. |
| 9 | Forbidden Light | 19 | 0 | `sm6` | Missing rows plus 7 name mismatches. |
| 10 | Ultra Prism | 18 | 0 | `sm5` | Missing rows plus 10 name mismatches. |
| 11 | Celestial Storm | 17 | 0 | `sm7` | Missing rows plus 3 name mismatches. |
| 12 | Rumble | 16 | 0 | none | Likely alias with existing `ru1`; resolve before any row creation. |
| 13 | McDonald's Match Battle 2023 | 15 | 0 | none | Missing physical promo set; set-universe decision needed. |
| 14 | Skyridge | 15 | 0 | `ecard3` | Legacy gap plus name mismatches and extra-key signal. |
| 15 | Arceus | 12 | 0 | `pl4` | Established-set gap plus extra-key signal. |
| 16 | Box Topper | 12 | 0 | none | Special collection policy needed. |
| 17 | Call of Legends | 11 | 0 | `col1` | Established-set gap plus extra-key signal. |
| 18 | Dragon Majesty | 10 | 0 | `sm7.5`, `sm75` | Duplicate set ownership must be resolved first. |
| 19 | Energy and special 8-9 card sets | 8-9 each | varies | mixed/none | Policy decision needed before canonical search/vault support. |
| 20 | Remaining small gaps | 1-8 each | varies | existing sets | Process after high-risk sets and rerun audit. |

## Priority Group Review Matrix

| Group | Expected source of truth | Required preflight checks | Likely source lane | Identity risks | Dry-run acceptance criteria |
| --- | --- | --- | --- | --- | --- |
| Shiny Vault | PkmnCards collection plus TCGdex/PokemonTCG corroboration | Decide canonical set vs subset; prove parent routing; check Hidden Fates overlap | Special collection lane | Collection cards may be printed under parent set labels | One target ownership model for all SV1-SV94 and no duplicate parent-set ownership |
| Mega Evolution Promos | PkmnCards MEP page, PokemonTCG API, TCGdex if available | Verify `mep` canonical row; inspect extra key; prove all 16 secret-range cards | Promo lane | Secret-range ownership and promo prefix semantics | Every missing card has source URL, printed number, name, and canonical set proof |
| TCG Classic Venusaur/Charizard/Blastoise | PkmnCards CLV/CLC/CLB pages plus product checklist evidence | Approve each deck as canonical set; check TCGPlayer support | Physical product deck lane | Product decks may share card names with older printings | 34-card target per deck with unique printed identity and deck code |
| Guardians Rising | PkmnCards GRI page plus PokemonTCG API and TCGdex | Confirm `sm2` canonical; review secret-range candidate | Main expansion lane | One secret-range row and possible source numbering differences | Missing 25 all map to `sm2`; no alias conflict |
| Burning Shadows | PkmnCards BUS page plus PokemonTCG API and TCGdex | Confirm `sm3` canonical; compare source IDs | Main expansion lane | GX/secret naming variations | Missing 23 all have source corroboration |
| Legendary Treasures | PkmnCards LTR page plus legacy source corroboration | Confirm `bw11` canonical; inspect extra key | Main expansion lane | Radiant/RC subset semantics and legacy naming | Missing 20 do not belong to RC or a separate subset row |
| Forbidden Light | PkmnCards FLI page plus PokemonTCG API and TCGdex | Resolve 7 name mismatches before missing rows | Main expansion lane | Name mismatches may mask existing rows | Missing 19 remain after number normalization and mismatch review |
| Ultra Prism | PkmnCards UPR page plus PokemonTCG API and TCGdex | Resolve 10 name mismatches before missing rows | Main expansion lane | Name mismatches may mask existing rows | Missing 18 remain after mismatch review |
| Celestial Storm | PkmnCards CES page plus PokemonTCG API and TCGdex | Confirm `sm7` canonical; resolve 3 name mismatches | Main expansion lane | Shiny Vault source labels may overlap visible set labels | Missing 17 remain after Shiny Vault policy is separated |
| Rumble | PkmnCards RM page plus existing DB `ru1` evidence | Resolve `RM` vs `RU` abbreviation and `ru1` ownership | Alias/special set lane | Existing unmatched DB row may already be the canonical set | Missing 16 become zero after alias match, or a reviewed target is approved |
| McDonald's Match Battle 2023 | PkmnCards M23 page plus product checklist evidence | Confirm no existing McDonald's 2023 row; choose canonical code | Promo product lane | McDonald's annual sets have historical alias/name variation | Missing 15 have a single approved target set |
| Skyridge | PkmnCards SK page plus PokemonTCG API and TCGdex | Confirm `ecard3` canonical; resolve 9 name mismatches and extra key | Legacy main expansion lane | E-card numbering and name variants | Missing 15 remain after mismatch review |
| Arceus | PkmnCards AR page plus PokemonTCG API and TCGdex | Confirm `pl4` canonical; inspect extra key | Main expansion lane | Legacy numbering and extra-key signal | Missing 12 have source-backed printed numbers |
| Box Topper | PkmnCards Box Topper page plus product evidence | Approve special-collection support policy | Special collection lane | May be better modeled as promo/subset routing | Missing 12 have explicit app-support approval |
| Call of Legends | PkmnCards CL page plus PokemonTCG API and TCGdex | Confirm `col1` canonical; inspect extra key | Main expansion lane | SL numbering and shiny subset expectations | Missing 11 have stable number/name evidence |
| Dragon Majesty | PkmnCards DRM page plus PokemonTCG API and TCGdex | Resolve `sm7.5` vs `sm75`; resolve 2 name mismatches | Main expansion special-set lane | Duplicate set ownership | Missing 10 map to one canonical target only |
| Energy and special 8-9 card sets | PkmnCards energy/special pages plus product evidence | Approve whether energy-only/special sets belong in vault/search | Energy or special collection lane | Unnumbered identity and repeated energy names | Candidate rows have source URL, era, and unnumbered policy |
| Remaining small gaps | PkmnCards pages plus source corroboration | Confirm canonical set, number evidence, and no unresolved mismatch | Main expansion or promo lane | Alias, extra-key, or generated-number defects | Dry-run report has no ambiguous target sets |

## No-Write Queue

1. Rerun or refresh the audit after set canonicalization decisions are documented.
2. Produce a dry-run candidate list grouped by canonical target set.
3. Split candidates into normal checklist rows, secret-range rows, unnumbered rows, and policy-blocked rows.
4. For each candidate, collect source URL, printed number, normalized number key, source set label, DB target set, and source corroboration.
5. Review high-risk sets manually: Shiny Vault, Mega Evolution Promos, TCG Classic decks, Dragon Majesty, Rumble, and energy collections.
6. Require a final dry-run acceptance report with zero ambiguous target sets, zero unresolved secret-range ownership, and zero unresolved number conflicts.
