# Pokémon playable card-name constraints

Production verification of the collector search release found that `SIR playables Bloodmoon Ursaluna ex` returned zero cards while the ordinary playable name returned all five versions. Catalog inference selected `ex` as a set because the name probe still included `SIR`. Full rarity names already worked because the older name helper stripped their spelling.

The name helper now uses the shared collector phrase parser with the actual game scope. Interpretation and complete candidate discovery probe the same card name, keep request-local page reuse, and leave the original rarity/artwork constraints on discovery results. Quoted text, Rare Candy, Sirfetch'd and other-game names remain literal. Explicit complete set names remain constraints.

Focused verification passed 53 tests: 14 playable-search route/matcher tests, 22 catalog-set tests and 17 complete-name tests. The new cases exercise the actual catalog name probe and trusted page reuse; no tests infer artwork classification or broaden playable membership. Complete managed commit/push gates and hosted review remain required before publication.

Environment sanity was confirmed on the shared canonical backend client for project `ycdxbpibncqcchqiihfz`: 173,837 card prints, 3,420 sets and 47,409 traits. This change writes no catalog, mappings, schema, competitive evidence, pricing or ownership data. Local build verification uses local staging placeholders, pinned Flutter, bundled Roboto with a private font cache, and one image worker; existing assertions, timeouts and exclusions remain unchanged.
