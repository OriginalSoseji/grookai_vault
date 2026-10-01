# VARIANT_COEXISTENCE_RULE_V1

Status: Active

## Purpose

Allows multiple identity-bearing variants to coexist on the same base slot when evidence proves they are distinct canonical identities.

## Allowed Coexistence

Rows may coexist on the same base slot only when all of the following are true:

1. Same effective `set_code`
2. Same base printed name
3. Same printed number / `number_plain`
4. Each row carries a distinct lawful identity signal
5. Each row carries a distinct deterministic `variant_key`
6. Identity evidence is provenance-backed, not guessed

## Canonical Examples

A lawful slot may contain all of the following at once:

- base row (`variant_key = NULL`)
- set-name stamp row (`white_flare_stamp`, `black_bolt_stamp`, `scarlet_and_violet_stamp`)
- generic Play! Pokemon stamp row (`play_pokemon_stamp`)

GameStop bridge candidates may also coexist with one proven base and distinct
prerelease, staff, staff/prerelease, or EB Games stamps. Obsidian Flames, Twilight
Masquerade and Mega Evolution stamps are admitted only in their exact set routes.
This requires a resolved `STAMPED_IDENTITY_RULE_V1` identity, retained raw and
discovery lineage, a source image URL/hash, and underlying-base proof matching
the actual base row. Every occupied row must share the effective set, name and
number. Unknown spellings (including `eb_games_stamped`), duplicated variants,
unrelated occupants and finish-only distinctions remain held.

This rule resolves classification only. It does not approve a candidate, verify
source bytes, create a printing, or bypass the reviewed staging/execution lanes.
Reclassify the original bounded candidate to record fresh events; never replace
its historical metadata or manufacture a replacement candidate to avoid a hold.

## Forbidden Coexistence

Do not allow coexistence when:

- two rows have the same `variant_key`
- the only distinction is distribution context with no identity-bearing signal
- the distinction belongs in the printing layer instead of `card_prints`
- the distinction is inferred without provenance-backed evidence
- the slot also contains unrelated same-number rows that break deterministic routing

## Slot Audit Rule

Slot audit must not classify same-name same-number rows as conflicts when:

- `variant_key` differs
- each variant is allowed by contract
- base proof and provenance exist

Otherwise the slot remains blocked or ambiguous.

## Classification Rule

Allowed coexistence must classify as:

- `VARIANT_IDENTITY`
- `PROMOTE_VARIANT`
- `CREATE_CARD_PRINT`

## Result

Grookai may represent multiple lawful identity-bearing variants on one base slot without collapsing them, mutating the base row, or inventing synthetic numbering.
