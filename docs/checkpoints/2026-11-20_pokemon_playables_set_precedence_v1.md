# Pokémon collector phrase and set precedence

Production readback after PR980 showed `sir playables` returning 32 SIRs,
while `special illustration rare playables` returned zero. The catalog parser
treated the partial word `Special` as a set alias, then protected it during
interpretation rebuild and incorrectly reduced the rarity to Illustration Rare.
This was a parser collision, not missing competitive evidence.

Set matching and set removal now skip aliases strictly contained inside a
recognized Pokémon rarity/artwork phrase. A complete catalog title can still
contain those words. If the set word appears separately, its actual occurrence
is selected, protected and removed, retaining the complete rarity constraint.
Other game interpretation and quoted literal protection remain covered.

Focused verification: 13 playable-search tests and 21 catalog-set tests passed.
The route tests now use the real catalog-set parser, including a Special Deck
Set and `special illustration rare playables from Special`. They inspect the
forwarded query and actual discovery matcher. Catalog tests cover complete set
titles, separate/repeated occurrences, Unicode matching, performance screening,
card-name ambiguity and set words resembling years or finishes.

No canonical data, mappings, source collection, competitive qualification,
pricing, ownership, schema, mobile binary or artwork was changed. This continues
the accepted shared resolver consumer and the verification described in
`2026-11-19_pokemon_playables_collector_filters_v1.md`. Complete managed hooks,
hosted checks and production readback apply before release acceptance.

Private pre-fix readback:
`.tmp/pokemon_playables_search_set_collision_20261120.json` in the main workspace.
