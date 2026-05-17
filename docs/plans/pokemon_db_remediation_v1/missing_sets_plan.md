# Missing Sets Plan

Status: planning only. This file proposes classification and review order only. It authorizes no Supabase writes, migrations, inserts, updates, deletes, or migration repair.

## Purpose

Classify the 18 PkmnCards master sets or collections with no DB match before any target set is created or any missing checklist card is backfilled. Some are true missing physical set candidates. Others are energy collections, special releases, aliases, or external-only buckets that need product policy before they belong in canonical search and vault flows.

## 2026-05-17 Refined Decision Artifacts

- `missing_set_universe_decision_20260517.md`
- `missing_set_universe_decision_matrix_20260517.json`

Live read-only evidence refined two audit items:

- `Shiny Vault` should not be treated as a new set-create candidate. Existing DB row `sma` / `Hidden Fates Shiny Vault` owns 94 card prints.
- `Rumble (RM)` should not be treated as a new set-create candidate unless equivalence fails. Existing DB row `ru1` / `Pokemon Rumble` owns 16 card prints and has a canonical classification row.

## Missing Master Sets From Audit

| Master set | Series | Cards | URL | Initial classification | Notes |
| --- | --- | ---: | --- | --- | --- |
| Black & White Energy (2011 Unnumbered) | Black & White | 8 | `https://pkmncards.com/set/black-white-energy-2011-unnumbered/` | Promo/subset/special collection needing policy decision | Unnumbered energy checklist; decide whether energy-only collections are canonical vault sets. |
| Shiny Vault | Collections | 94 | `https://pkmncards.com/collection/shiny-vault/` | Promo/subset/special collection needing policy decision | Live evidence found existing `sma` Hidden Fates Shiny Vault with 94 card prints. Plan source collection routing; do not create a duplicate set. |
| HS Energy (2010 Unnumbered) | HeartGold & SoulSilver | 8 | `https://pkmncards.com/set/hs-energy-2010-unnumbered/` | Promo/subset/special collection needing policy decision | Unnumbered energy checklist. |
| Mega Evolution Energy (MEE) | Mega Evolution | 8 | `https://pkmncards.com/set/mee/` | Promo/subset/special collection needing policy decision | Energy collection tied to Mega Evolution source universe. |
| Pokemon Trading Card Game Classic - Blastoise (CLB) | Misc. | 34 | `https://pkmncards.com/set/pokemon-trading-card-game-classic-blastoise/` | Canonical physical set needed | Real English product deck/checklist; likely search and vault relevant. |
| Pokemon Trading Card Game Classic - Charizard (CLC) | Misc. | 34 | `https://pkmncards.com/set/pokemon-trading-card-game-classic-charizard/` | Canonical physical set needed | Real English product deck/checklist; likely search and vault relevant. |
| Pokemon Trading Card Game Classic - Venusaur (CLV) | Misc. | 34 | `https://pkmncards.com/set/pokemon-trading-card-game-classic-venusaur/` | Canonical physical set needed | Real English product deck/checklist; likely search and vault relevant. |
| Box Topper | Other | 12 | `https://pkmncards.com/set/box-topper/` | Promo/subset/special collection needing policy decision | Special release bucket; decide canonical route and market support. |
| Miscellaneous | Other | 0 | `https://pkmncards.com/set/miscellaneous/` | External-only/no app support yet | Zero parsed cards in audit; do not create canonical DB set from this alone. |
| Victory Medals | Other | 9 | `https://pkmncards.com/set/victory-medals/` | Promo/subset/special collection needing policy decision | Prize/promo collection; collector demand likely but needs routing policy. |
| World Collection | Other | 9 | `https://pkmncards.com/set/world-collection/` | Promo/subset/special collection needing policy decision | Special product collection; needs language/English policy review. |
| Rumble (RM) | Platinum | 16 | `https://pkmncards.com/set/rumble/` | Needs further evidence | Live evidence found existing `ru1` Pokemon Rumble with 16 card prints. Prove 16/16 equivalence, then plan source alias/mapping only. |
| McDonald's Match Battle 2023 (M23) | Scarlet & Violet | 15 | `https://pkmncards.com/set/mcdonalds-match-battle-2023/` | Canonical physical set needed | Real English physical promo set; likely vault/search relevant. |
| Sun & Moon Energy | Sun & Moon | 9 | `https://pkmncards.com/set/sun-moon-energy/` | Promo/subset/special collection needing policy decision | Energy-only collection. |
| Sun & Moon Energy (Team Up) | Sun & Moon | 9 | `https://pkmncards.com/set/sun-moon-energy-team-up/` | Promo/subset/special collection needing policy decision | Energy-only collection tied to Team Up-era printings. |
| Sword & Shield Energy | Sword & Shield | 9 | `https://pkmncards.com/set/sword-shield-energy/` | Promo/subset/special collection needing policy decision | Energy-only collection. |
| Sword & Shield Energy (Brilliant Stars) | Sword & Shield | 8 | `https://pkmncards.com/set/sword-shield-energy-brilliant-stars/` | Promo/subset/special collection needing policy decision | Energy-only collection tied to Brilliant Stars-era printings. |
| XY Energy (2013 Unnumbered) | XY | 9 | `https://pkmncards.com/set/xy-energy-2013-unnumbered/` | Promo/subset/special collection needing policy decision | Unnumbered energy checklist. |

## Decision Criteria

For each missing master set, answer:

- Is it a real English physical set or collection?
- Does it have collector demand and search/vault value?
- Does it belong in canonical search and vault, or only in a source-specific reference layer?
- Does it need alias, subset, or parent-set routing?
- Does it have a stable abbreviation, release year, printed total, and source corroboration?
- Would adding it create duplicate ownership with an existing DB row?

## Recommended Review Order

1. Non-create mapping review: compare PkmnCards `Shiny Vault` with existing `sma`, and PkmnCards `Rumble (RM)` with existing `ru1`.
2. High-demand missing product sets: TCG Classic Venusaur, Charizard, Blastoise, then McDonald's Match Battle 2023.
3. Shiny Vault collection policy: decide source-routing behavior for the existing `sma` target.
4. Energy-only collections by era: HS, Black & White, XY, Sun & Moon, Sun & Moon Team Up, Sword & Shield, Sword & Shield Brilliant Stars, Mega Evolution Energy.
5. Other special buckets: Box Topper, Victory Medals, World Collection.
6. External-only bucket: Miscellaneous remains unsupported unless future evidence adds real checklist rows.

## No-Write Implementation Queue

| Queue step | Output | Write status |
| --- | --- | --- |
| Build missing-set evidence matrix | One row per missing master set with source URLs, card count, candidate DB aliases, and policy classification | No writes |
| Resolve candidate aliases | Identify whether a DB row already exists under another code, especially `ru1` for Rumble | No writes |
| Approve app support policy | Decide canonical, subset, alias-only, or unsupported status | No writes |
| Produce target-set dry-run | Show proposed canonical code/name/abbrev/parent routing without creating rows | No writes |
| Review stop conditions | Block any set with ambiguous ownership, unsupported language policy, or insufficient evidence | No writes |
