# Collector Visual Search Demand Evidence

## Status

RESEARCH COMPLETE; IMPLEMENTATION AND PRODUCTION ACTIVATION NOT AUTHORIZED.

## Date

2026-07-30 America/Denver

## Objective

Find external evidence for how collectors actually try to discover Pokemon
cards by artwork. Separate demonstrated collector demand from internally
invented examples, then translate the demonstrated language into governed
search requirements for Grookai.

## Executive Finding

Collectors demonstrably search for cards by much more than canonical card
metadata. Repeated public requests cover:

- named Pokemon anywhere in an artwork, including hidden cameos and objects;
- multiple named Pokemon together;
- visible subject counts and repeated instances of the same Pokemon;
- actions and states such as sleeping, eating, flying, swimming, working, and
  playing music;
- relationships such as holding an object, looking at a flower, interacting
  with a Trainer, or parent and child together;
- environments such as forests, cities, Pokemon Centers, beaches, homes,
  gardens, night skies, rain, and underwater scenes;
- objects such as food, flowers, plush toys, signs, lamps, and Poke Balls;
- palette, art style, artist, mood, and binder-page compatibility;
- mixed visual and commercial constraints such as cute full arts under a
  budget or English and Japanese cards showing Pokemon at work.

The evidence supports a single compositional collector query interface. It does
not support isolating visual search from ordinary identity, artist, language,
rarity, price, ownership, or printing filters.

## Method

This audit reviewed:

- collector questions and collection posts across several Pokemon TCG
  communities;
- dedicated cameo and visual-art discovery projects;
- visual filter taxonomies exposed by active collector products;
- binder-planning products and themed-page guidance.

Evidence strength is classified as:

- **Repeated demand**: multiple independent collector examples, often with a
  purpose-built tool or taxonomy supporting the same intent.
- **Demonstrated demand**: at least one direct collector request with meaningful
  discussion or a product explicitly built around the need.
- **Emerging/niche**: a concrete collector request, but insufficient evidence
  to infer broad frequency.

Product tag counts are evidence of artwork supply and product investment, not
query-volume measurements. Reddit engagement is evidence that an intent exists,
not a population-level market-share estimate.

## Demand Evidence

### 1. Pokemon Anywhere in the Artwork

**Strength: Repeated demand**

Observed collector language:

- every card a favorite Pokemon appears in;
- hidden Pokemon;
- background cameos;
- Pokemon reflected, silhouetted, or tucked into another card's artwork;
- Pokemon shown as a plush, statue, logo, poster, screen, or balloon.

Evidence:

- [SightDex](https://www.sightdex.app/) is explicitly organized around every
  Pokemon appearance and separates `Featured`, `Cameo`, and `Object`.
- The long-running
  [Cameo Pokemon Database](https://www.reddit.com/r/PokemonTCG/comments/10gzylo/)
  exists because collectors wanted cards where additional Pokemon appear in
  another card's artwork.
- Collectors ask for
  [hidden Pokemon card art](https://www.reddit.com/r/PokemonTCG/comments/1m6aqbl/)
  as a binder theme.
- A collector trying to find plush/stuffed-toy artwork explicitly reported that
  ordinary tools did not support the search in the
  [TCG Curator discussion](https://www.reddit.com/r/PokemonTCG/comments/1ujzlxz/a_website_for_finding_pokemon_cards_by_art_details/).

Required Grookai semantics:

- preserve `scene_subject`, `depicted_subject`, and
  `character_representation`;
- search named identity across all three classes by default;
- allow explicit role restriction;
- retain hidden, background, reflection, silhouette, host object, and host
  surface evidence.

Example queries:

- `every card with Pikachu in the artwork`
- `hidden Raichu cards`
- `Mimikyu as a plush`
- `Pikachu on a poster`
- `Gengar reflected in a window`

### 2. Multiple Pokemon and Counts

**Strength: Repeated demand**

Observed collector language:

- cards with multiple Pokemon;
- cards with a ton of Pokemon;
- herds;
- multiple of the same Pokemon;
- all Pokemon on the card sleeping;
- common cards with multiple Pokemon.

Evidence:

- A collector asked for
  [cards featuring multiple Pokemon](https://www.reddit.com/r/PokemonTCGCollectors/comments/1uhlfaz/favorite_cards_with_multiple_pokemon/)
  for a dedicated binder.
- Another asked for
  [cards with many Pokemon at once](https://www.reddit.com/r/PokemonTCG/comments/1j1x2s5)
  and was directed to a spreadsheet cataloging them.
- The
  [berries and repeated-Pokemon collection](https://www.reddit.com/r/PokemonTCG/comments/1v8om0n/need_help_with_card_collection/)
  explicitly distinguishes multiple instances of the same identity.
- A sleeping-card collector defined the stricter rule that
  [all Pokemon on a multi-Pokemon card must be asleep](https://www.reddit.com/r/pkmntcgcollections/comments/18xv9z7/ideas_for_unique_collections/).

Required Grookai semantics:

- distinct visible Pokemon identity count;
- total visible Pokemon instance count;
- per-identity count;
- `at least`, `more than`, `exactly`, `only`, `all`, and `any`;
- same-artwork subject co-occurrence;
- same-species versus distinct-species distinction.

Example queries:

- `cards with 3 or more Pokemon`
- `cards with exactly 2 Pokemon`
- `multiple Pikachu on one card`
- `herds of the same Pokemon`
- `cards where every Pokemon is sleeping`
- `Mimikyu and Pikachu together`
- `Gengar and either Haunter or Gastly`

### 3. Actions and Visible States

**Strength: Repeated demand**

Observed collector language:

- sleeping, resting, eating, flying, swimming, jumping, working, playing,
  dancing, reading, cooking, carrying, hiding, and watching;
- background subjects performing the action still count;
- collectors distinguish sleeping from merely resting or closing the eyes.

Evidence:

- Multiple independent collectors maintain
  [sleeping Pokemon collections](https://www.reddit.com/r/PokemonTCG/comments/1d61m6d/all_sleeping_pokemon_cards_i_could_find/).
- A 2026 request explicitly includes
  [Pokemon sleeping in the background](https://www.reddit.com/r/PokemonTCG/comments/1tp47fl/i_want_to_start_collecting_sleeping_pok%C3%A9mons/).
- `Pokemon with jobs` has repeated collection demand, including a
  [detailed collector list](https://www.reddit.com/r/PokemonTCG/comments/1ipr8lm/collection_help_trying_to_collect_pokemon_with/).
- Collectors ask for
  [Pokemon playing music for other Pokemon](https://www.reddit.com/r/PokemonTCG/comments/1twejdq/cards_with_pokemon_playing_music_for_other_pokemon/).
- Artchu exposes substantial artwork supply for `Flying`, `Running`,
  `Swimming`, `Jumping`, `Playing`, `Sleeping`, `Working`, `Eating`,
  `Dancing`, and `Reading` in its
  [visual discovery taxonomy](https://artchu.ai/cards/).

Required Grookai semantics:

- action bound to the correct subject observation;
- state evidence separated from inferred personality;
- background/foreground qualifiers;
- all-subject and any-subject quantification;
- action object and recipient when present.

Example queries:

- `sleeping Pokemon`
- `Pokemon sleeping in the background`
- `flying Pokemon over a city`
- `Pokemon swimming underwater`
- `Pokemon doing construction work`
- `Pokemon playing music for other Pokemon`
- `Pokemon reading a book`

### 4. Subject-Object and Subject-Subject Relationships

**Strength: Repeated demand**

Observed collector language:

- Pokemon holding or watching a single flower;
- Pokemon eating berries, sweet treats, or trash;
- Pokemon holding babies;
- Trainer and Pokemon interacting;
- parent and child;
- Pokemon playing music for other Pokemon.

Evidence:

- A detailed micro-collection centers on
  [Pokemon holding or looking at one flower](https://www.reddit.com/r/PokemonTCG/comments/1ihsngf/can_you_recommend_me_some_cards_in_which_a/).
- Collectors maintain
  [sweet-treat eating pages and food binders](https://www.reddit.com/r/PokemonTCG/comments/1ta1guv/sweet_treat_eating_pokemon_cards/).
- The highly specific
  [Pokemon eating trash](https://www.reddit.com/r/PokemonTCG/comments/1thy5jp/are_there_more_cards_of_pok%C3%A9mon_eating_trash/)
  request demonstrates that `eating` must bind to the correct object.
- Multiple threads request
  [mother/parent and child Pokemon](https://www.reddit.com/r/PokemonTCG/comments/1t2f1tq/pokemon_cards_that_are_a_mother_or_parents_and/)
  and
  [Pokemon with their Trainers](https://www.reddit.com/r/pokemoncards/comments/1ks1rqc).

Required Grookai semantics:

- generalized relation grammar, not a holding-only keyword;
- subject, predicate, object, and optional recipient;
- observation-backed relationship edges;
- `looking at` distinct from `holding`, `near`, or `surrounded by`;
- visual relationship distinct from inferred biological or social truth.

Example queries:

- `Pokemon holding a Poke Ball`
- `Pokemon looking at one flower`
- `Pokemon eating berries`
- `Pokemon eating trash`
- `Pokemon playing music for other Pokemon`
- `Pokemon with their trainer`
- `parent and baby Pokemon together`

### 5. Environment, Weather, and Time

**Strength: Repeated demand**

Observed collector language:

- forest, jungle, city, Pokemon Center, botanical/garden, home, beach, pond,
  underwater, night sky, stars, moon, rain, sunset, sunrise, snow, dark forest,
  and industrial environments.

Evidence:

- A collector could not find a normal search path for
  [cards with Pokemon Centers in the background](https://www.reddit.com/r/PokemonTCG/comments/1r2k3bz/trying_to_find_pokemon_cards_with_pokemon_center/).
- A botanical collector requested
  [Pokemon in flower and botanical scenes](https://www.reddit.com/r/PokemonTCG/comments/14zv5k4/recommends_for_cards_with_botanical_scenes/).
- Collectors maintain
  [night-sky binders](https://www.reddit.com/r/PokemonTCG/comments/1tdis9b/i_wanna_see_real_meant_for_fun_personal/)
  and ask for
  [night-sky/aurora cards with matching colors](https://www.reddit.com/r/PokemonTCG/comments/1jk50gm).
- An older collection discussion asks specifically for
  [cards with rain](https://www.reddit.com/r/PokemonTCG/comments/l6c3tq).
- Current themed-binder examples include
  [dark/spooky, winter, forest, water, food, and open spaces](https://www.reddit.com/r/PokemonTCG/comments/1v746w3/how_do_you_guys_arrange_your_binders_look_typemon/).

Required Grookai semantics:

- objective scene elements remain the factual basis;
- supported derived settings such as forest or city;
- specific venue concepts such as Pokemon Center only when visible evidence
  supports them;
- weather and time-of-day claims remain evidence-gated;
- scene-layer qualification such as `in the background`.

Example queries:

- `Pokemon in a forest`
- `cards with a Pokemon Center in the background`
- `night sky cards with a visible moon`
- `Pokemon in the rain`
- `Pokemon at home`
- `underwater cards`
- `cards set in a city at night`

### 6. Food and Pokemon-Shaped Objects

**Strength: Repeated demand**

Observed collector language:

- Pokemon eating food;
- food-based Pokemon;
- Pokemon-shaped sweets;
- plushies and stuffed toys;
- character objects and decorations.

Evidence:

- TCG Curator was created partly because its builder could not search for
  [Trainers or Pokemon cooking or eating food](https://www.reddit.com/r/PokemonTCG/comments/1ujzlxz/a_website_for_finding_pokemon_cards_by_art_details/).
- A separate collector distinguishes
  [Pokemon that are food from Pokemon merely surrounded by food](https://www.reddit.com/r/PokemonTCG/comments/1qucm54/food_based_pok%C3%A9mon_card_suggestions/).
- The same TCG Curator discussion includes a user seeking
  [cards with plushies/stuffed toys](https://www.reddit.com/r/PokemonTCG/comments/1ujzlxz/a_website_for_finding_pokemon_cards_by_art_details/).
- SightDex's public ontology explicitly treats plushes, statues, logos,
  posters, screens, and balloons as Pokemon `Object` appearances.

Required Grookai semantics:

- physical scene subject versus depicted subject versus character
  representation;
- representation form and host object;
- food-shaped identity evidence;
- subject eating food distinct from subject visually based on food;
- named identity only when image-confirmed or observation-backed.

Example queries:

- `Pikachu-shaped cookie`
- `Pokemon as food`
- `Pokemon eating dessert`
- `cards with Pokemon plushies`
- `Eevee statue`
- `Pokemon logos in the artwork`

### 7. Trainers, Humans, Clothing, and Interaction

**Strength: Demonstrated demand**

Observed collector language:

- Pokemon cards with Trainers present;
- Trainers interacting with the featured Pokemon;
- Trainer companions;
- full-art Pokemon cards with a Trainer, excluding Supporter cards.

Evidence:

- Collectors explicitly distinguish
  [Pokemon cards containing Trainers from Trainer cards](https://www.reddit.com/r/pkmntcgcollections/comments/qerdfj).
- Another collector seeks
  [full-art cards where Trainers interact with the featured Pokemon](https://www.reddit.com/r/PokemonTCG/comments/1r3pu9u/on_a_quest_and_i_have_a_question/).
- SightDex now includes Trainer appearances alongside Pokemon sightings.

Current evidence strongly supports subject presence and interaction. The
research sample does not yet prove broad demand for highly granular clothing or
body-region filters, although those facts remain valuable for future search and
recommendation.

Example queries:

- `Pokemon cards with trainers in the artwork`
- `full arts with a trainer interacting with the Pokemon`
- `Pikachu with Red`
- `Pokemon and trainer relaxing together`

### 8. Palette, Style, Artist, and Binder Compatibility

**Strength: Repeated demand**

Observed collector language:

- pages matched by color, contrasting colors, artist, art style, environment,
  or visual theme;
- cherry blossoms;
- night-sky/aurora colors;
- watercolor, crochet, clay, vintage, storybook, dark, pastel;
- cards that complement an existing binder page.

Evidence:

- Collectors explicitly group cards by
  [theme, color, and artist](https://www.reddit.com/r/PokemonTCG/comments/1h4ahtk).
- A binder-page request searches for
  [cherry-blossom full arts](https://www.reddit.com/r/PokemonTCG/comments/1silxw6/binder_page_recommendations/).
- BinderBloom markets
  [dominant-hue grouping and panoramic-art detection](https://binderbloom.app/).
- AuraBinder describes visual pages built from
  [monochrome, gradients, and rainbow spreads](https://aurabinder.com/blog/best-binder-page-themes-pokemon).
- Artchu exposes scene and style filters including watercolor, storybook,
  pastel, clay model, minimalist, and woodcut in its visual archive.

Required Grookai semantics:

- factual palette and dominant-color representation;
- artist and canonical metadata joined with visual facts;
- controlled style vocabulary with preserved raw evidence;
- card-to-card or page-to-card visual similarity as a future retrieval lane;
- binder layout compatibility kept separate from factual image extraction.

Example queries:

- `purple and black night-sky cards`
- `watercolor forest cards`
- `cards by sowsow with a space theme`
- `pink cute full arts`
- `cards that match this binder page`
- `connected panoramic artwork`

### 9. Mood, Vibe, and Informal Collector Language

**Strength: Demonstrated demand**

Observed collector language:

- cute, cozy, peaceful, dark, spooky, gothic, silly, goofy, dumb poses;
- Pokemon that look high.

Evidence:

- Collectors ask for
  [cute/cozy card recommendations](https://www.reddit.com/r/pokemoncardcollectors/comments/1uh0bo3/looking_for_cutecozy_card_recs/)
  and report difficulty naming the desired visual style.
- Another collection focuses on
  [dumb faces or poses](https://www.reddit.com/r/pokemoncards/comments/1uamdzy/finally_got_a_binder_for_my_cards/).
- A themed-collection discussion explicitly mentions
  [Pokemon that look high](https://www.reddit.com/r/pokemoncardcollectors/comments/1s0jrtl/themed_collection_ideas/).
- Current theme lists include gothic, dark forest, cozy, and cute.

Required Grookai semantics:

- informal phrases remain query aliases, not unqualified character facts;
- evidence-backed derived concepts may use visible facial, posture, smoke,
  lighting, palette, and environment cues;
- explanations must state the observable match basis;
- subjective similarity ranking should not overwrite the fact graph.

Example queries:

- `cozy Pokemon cards`
- `dark spooky artwork`
- `Pokemon with goofy faces`
- `happy Pokemon`
- `stoner-looking Pokemon`

### 10. Narrative and Connected Artwork

**Strength: Demonstrated demand**

Observed collector language:

- cards that tell a story;
- evolution lines showing a family over time;
- connecting or panoramic cards;
- binder pages ordered to move through environments.

Evidence:

- Collectors explicitly seek
  [story cards](https://www.reddit.com/r/PokemonTCG/comments/l6c3tq).
- Family collectors discuss the
  [Ralts/Kirlia/Gardevoir story and other evolving family sequences](https://www.reddit.com/r/PokemonTCG/comments/1v10rq3/family_cards/).
- BinderBloom advertises automatic detection of panoramic art.
- A themed-binder collector wants pages that
  [tell a story through Pokemon environments](https://www.reddit.com/r/PokemonTCG/comments/1lho4nx/some_themed_binder_page_designs_for_anyone_whos/).

Required Grookai semantics:

- artwork-to-artwork relationships;
- connected-edge or panorama evidence;
- recurring characters, setting, and chronology;
- narrative grouping as a derived cross-card layer, not a fact asserted from
  one image.

Example queries:

- `cards that tell a story`
- `connected Deerling and Sawsbuck artwork`
- `evolution line showing a family growing up`
- `panoramic cards that connect`

### 11. Mixed Visual and Catalog/Market Constraints

**Strength: Repeated demand**

Observed collector language:

- cute cards that do not break the bank;
- budget-friendly illustration rares;
- common cards with multiple Pokemon;
- English and Japanese cards with a visual theme;
- full arts matching a scene or palette;
- cards by a specific artist with a specific theme.

Evidence:

- Collectors request
  [cute full arts that do not destroy the bank](https://www.reddit.com/r/pokemoncardcollectors/comments/1tgr5u3/what_to_add_to_the_collection/).
- Another discussion asks for
  [budget-friendly cute cards](https://www.reddit.com/r/PokemonTCG/comments/1sqx3qy/what_are_some_of_the_cutest_budget_friendly_cards/).
- The Pokemon-with-jobs collector explicitly includes English and Japanese.
- Multiple-Pokemon collectors qualify requests by common cards or inexpensive
  cards.
- AuraBinder combines page planning with page value.

Required Grookai semantics:

- visual predicates and ordinary canonical filters in one query plan;
- language, set, year, rarity, artist, finish, ownership, and current price;
- parent `From` price behavior must not weaken exact printing identity;
- ranking must expose why both visual and catalog constraints matched.

Example queries:

- `cute illustration rares under $10`
- `Japanese Pokemon working cards`
- `common cards with 3 or more Pokemon`
- `night-sky cards by sowsow`
- `purple forest cards I do not own`

## Independent Product Validation

Several current products are investing in this problem:

- [ArtFinderTCG](https://artfindertcg.com/) accepts natural descriptions such
  as a creature in a storm or relaxing on a beach across more than 20,000
  illustrations.
- [Artchu](https://artchu.ai/cards/) exposes 156 scene filters and 181 style
  filters. Its catalog includes large supplies for trees, forest, flying,
  clouds, multiple Pokemon, swimming, cameos, city, jumping, playing, carrying
  objects, food, sleeping, working, eating, rain, and cooking.
- [SightDex](https://www.sightdex.app/) uses community consensus to catalogue
  featured, cameo, and object appearances.
- [TCG Curator](https://www.reddit.com/r/PokemonTCG/comments/1ujzlxz/a_website_for_finding_pokemon_cards_by_art_details/)
  was built around community tags for themes, objects, locations, food,
  cameos, and artists.
- [BinderBloom](https://binderbloom.app/) focuses on color harmony and
  connected panoramic artwork.
- [AuraBinder](https://www.aurabinder.com/) combines real-card search, themed
  binder layouts, and page value.

This validates the market category. Grookai's defensible difference should be
evidence-bound compositional search over canonical identity and pricing, not a
larger ungoverned tag list.

## Query Grammar Implied by the Evidence

Collector demand requires the following operators:

### Identity and Role

- named Pokemon or Trainer;
- generic `Pokemon`, `Trainer`, `human`, `object`;
- scene subject, background cameo, depicted subject, character
  representation;
- hidden, silhouette, reflection, partially visible.

### Boolean Composition

- `AND`: `Mimikyu and Pikachu`;
- grouped `OR`: `Gengar and either Haunter or Gastly`;
- `NOT`: `sleeping Pokemon without a Trainer`;
- same-artwork binding for all required visual predicates.

### Quantifiers

- exact count;
- minimum and maximum;
- all/any/none;
- distinct identities;
- total instances;
- repeated same identity.

### Relationships

- subject + predicate + object;
- subject + predicate + recipient;
- subject + spatial relation + object;
- support for holding, carrying, eating, watching, looking at, playing for,
  interacting with, standing on, riding, protecting, cuddling, and surrounded
  by.

### Scene and Composition

- foreground, midground, background;
- environment, weather, time, lighting;
- palette and dominant color;
- visual style and artist;
- connected or visually compatible artwork.

### Ordinary Collector Filters

- set, language, year, rarity, artist, finish;
- price/budget;
- owned/not owned;
- exact printing versus shared artwork.

## Current Grookai Coverage

### Existing Corpus Reuse Decision

**Do not rerun OpenAI Vision over the existing corpus.**

The immutable release contains:

- `11,000` selected corpus IDs;
- `10,376` valid Fact Graph rows;
- `624` explicit source gaps;
- `9,377` unique authoritative generated-row artifacts;
- `9,532` eligible artwork groups;
- `28,596` projected search documents;
- approximately `321,937` structured search entries.

An offline scan of the current projection found artwork-level evidence coverage
for:

- canonical visual concepts: `9,498` artworks;
- grounded search terms: `9,496`;
- creature anatomy: `8,530`;
- scene subjects: `8,336`;
- environment: `8,269`;
- color and lighting: `4,531`;
- objects and props: `3,090`;
- counts: `1,960`;
- human appearance: `921`;
- clothing: `816`;
- explicit relationships: `648`.

The corpus already contains usable evidence for the major externally observed
intent families. Current local search returns, for example:

- sleeping Pokemon: `34` artworks;
- jumping Pokemon: `125`;
- flying Pokemon: `551`;
- running Pokemon: `182`;
- Pokemon in a forest: `1,286`;
- flowers: `539`;
- underwater: `271`;
- cards with at least three visible Pokemon: `145`;
- Pokemon carrying an object: `45`;
- Pokemon plush: `14`;
- Pokemon statue: `8`;
- Pokemon poster: `1`.

Some current zeros are parser or vocabulary failures rather than extraction
failures. `Pokemon working`, for example, currently returns
`unrecognized_terms`, even though offline projection evidence contains
work/construction observations. Those cases require query-policy work, not
another provider call.

The evidence is not uniformly exhaustive:

- only `5` valid source rows contain a typed character representation;
- only `37` contain a typed depicted subject;
- the existing representation audit found `92` omission candidates, including
  `59` possible Pokemon representations and `13` possible Pokemon depicted
  subjects;
- explicit relationships cover `648` artworks and use inconsistent predicates;
- exact counts and explicit foreground/background roles are under-recorded;
- style and vibe vocabulary is materially less complete than subjects,
  anatomy, and environments;
- `624` selected rows have no valid source graph.

These gaps do not justify paying to regenerate all existing artwork.

Use this repair order:

1. Rebuild parsers, aliases, controlled vocabulary, and derived concepts from
   existing observations.
2. Reconcile the curated cameo workbook and founder/reviewer image-confirmed
   corrections without rewriting model observations.
3. Audit likely omissions against the original self-hosted images.
4. Add human-confirmed evidence for facts that are plainly visible.
5. Use paid targeted re-extraction only when a high-value artwork remains
   genuinely ambiguous or too dense for reliable human reconciliation.

The default paid-retry scope must be the individual artwork identity, never the
whole corpus or every printing that shares an artwork.

### Implemented in the local governed lab

- canonical, Fact Graph, curated-cameo, and human-confirmed evidence lanes;
- named identity across artwork;
- scene/depicted/representation role distinctions;
- AND subject groups and OR alternatives;
- minimum visible-Pokemon count;
- one governed holding relationship;
- strict zero for unsupported specificity;
- evidence explanations and preserved authority.

### Partially supported

- sleeping and other single visual concepts can match lexical/controlled Fact
  Graph evidence, but not every phrase has compositional policy;
- environment, action, object, palette, anatomy, and clothing facts exist in
  the graph, but the collector parser does not expose all fields explicitly;
- curated cameo data improves identity coverage, but human reconciliation is
  incomplete;
- regular production search handles several canonical facets, but the unified
  visual response is still local-only.

### Missing or not yet governed

- generalized relationship grammar beyond holding;
- exact/max/all/any/same-species count semantics;
- foreground/background and hidden-visibility query operators;
- negative visual constraints;
- mixed price, ownership, language, rarity, finish, and visual planning in one
  production query;
- robust palette and visual-style normalization;
- image/card similarity and binder-page compatibility;
- cross-card story, evolution-sequence, and panorama relationships;
- production persistence, API contract, client integration, and rollout.

## Prioritized Collector Query Backlog

### P0: Required for a credible first collector search

1. Named identity anywhere in artwork.
2. Multiple named identities with AND/OR.
3. Scene/depicted/representation role filters.
4. Minimum, exact, distinct, and repeated-same-identity counts.
5. Subject-bound actions and states.
6. General subject-object relationships.
7. Background/foreground/hidden qualifiers.
8. Core environments, weather, and time-of-day cues.
9. Mixed visual plus artist/language/rarity/price/ownership filters.
10. Evidence explanations and strict-zero behavior.

### P1: High-value discovery and binder planning

1. Dominant color and palette combinations.
2. Controlled art-style vocabulary.
3. Cute, cozy, dark, spooky, goofy, and altered-state alias families backed by
   observable cues.
4. Parent/child, Trainer/Pokemon, group, and social-interaction relationships.
5. Similar-artwork and `fits this binder page` retrieval.
6. Food, jobs, home, city, garden, night-sky, rain, and other saved theme
   facets.

### P2: Cross-artwork intelligence

1. Connected and panoramic art.
2. Story/evolution sequences.
3. Binder-page automatic composition.
4. Personalized theme recommendations through Grookai Signature.

## Recommended Next Gate

Do not add these as an unbounded keyword list.

Create a frozen, sourced `COLLECTOR_VISUAL_QUERY_DEMAND_V1` suite with at least
75 queries:

- 50 demonstrated positive intents;
- 15 compositional boundary queries;
- 10 known or expected strict-zero queries.

For each query record:

- source URL and observed collector wording;
- normalized intent;
- required subjects, roles, counts, relationships, visual concepts, and
  ordinary filters;
- expected result behavior;
- whether current Grookai data can support it;
- whether the gap is parser, ontology, corpus coverage, ranking, or product
  integration.

Run the suite against the existing 9,532-artwork corpus without paid
regeneration. This will show which collector needs are already supported by the
10,000-plus extracted rows and which require targeted human reconciliation or
future extraction.

Only after that audit should implementation expand beyond the current
collector-query contract.

## Invariants

- A popular phrase does not become a fact without visual evidence.
- Query aliases may broaden discovery but must not overwrite the fact graph.
- Same-card co-occurrence does not prove a relationship.
- Product tag taxonomies do not establish ground truth.
- Subject role, relation, count, and scene layer remain evidence-bound.
- Human-confirmed evidence remains distinct from model observations.
- Mixed visual and market search must preserve exact canonical printing
  identity.
- Unsupported specificity returns zero rather than a plausible result.
