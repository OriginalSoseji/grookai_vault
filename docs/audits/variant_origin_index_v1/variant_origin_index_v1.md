# Variant Origin Index V1

Read-only origin index for parent-level special identity lanes. This deliberately excludes ordinary child finish explanations such as normal, holo, and reverse holo.

```text
db_writes_performed: false
migrations_created: false
cleanup_performed: false
quarantine_performed: false
```

## Summary

- Parent variant rows audited: 1876
- Origin families: 41
- Public-copy-safe families: 39
- Source-gap families: 2
- Public-copy-safe parent rows: 1803
- Source-gap parent rows: 73
- Fingerprint: `96435c0780e77047b8111996ee84986291decdb077db3169985d3987026c1d3a`

## Public-Copy-Safe Families

| Family |Category |Rows |Why It Exists |Why Collectors Care |
| --- |--- |--- |--- |--- |
| Play! Pokémon Prize Pack Stamp |organized_play_distribution_stamp |625 |Play! Pokémon Prize Packs are distributed through Organized Play programs and contain selected cards bearing a Play! Pokémon stamp. |Prize Pack cards retain original set identity but have Organized Play distribution markings, so they are collected separately from ordinary pack-pulled copies. |
| Prerelease / Staff Stamp |event_distribution_stamp |315 |Prerelease cards are selected expansion reprints with a Prerelease or expansion-logo stamp; staff versions were produced for event organizers beginning with the Diamond & Pearl expansion. |Prerelease and Staff stamps identify event-distribution copies, and Staff copies are often more limited because they were distributed to organizers rather than regular participants. |
| Delta Species Identity |mechanic_identity |193 |δ Delta Species are a distinct kind of Pokémon card first introduced in EX Delta Species, often showing Pokémon with unusual types compared with their normal identity. |Collectors track Delta Species separately because the δ mark and altered typing define a recognizable EX-era mechanic and theme, not just a finish. |
| Pokémon League / Placement Stamp |organized_play_placement_stamp |157 |Pokémon League and League Challenge events can award special stamped cards, including placement-stamped variants for top finishers. |Placement stamps encode event achievement or league distribution, making the physical card a different collector object from a normal copy. |
| Shiny Vault Subset |subset_identity |94 |Shiny Vault subsets collect Shiny Pokémon cards under SV-prefixed numbering, including Hidden Fates and Shining Fates. |SV cards are tracked separately because they are Shiny Pokémon subset cards with their own numbering and checklist identity. |
| Trainer Gallery Subset |subset_identity |60 |Trainer Gallery cards are a subset focused on the relationship between Trainer and Pokémon, using TG-prefixed numbering in Sword & Shield expansions. |TG cards are collected as a separate gallery subset because their numbering, artwork concept, and checklist position are distinct from the main set. |
| Radiant Collection Subset |subset_identity |57 |Radiant Collection is a separately numbered subset that appeared in Legendary Treasures and later Generations, using the RC card-number prefix. |Collectors track RC cards as a subset lane because their numbering and set membership differ from the main expansion checklist. |
| Expansion Logo / Set Stamp |event_or_product_distribution_stamp |47 |Expansion-logo and set-name stamps are used on selected promotional reprints, including prerelease/event cards and some product or retail promotions tied to a specific expansion. |The visible set logo or expansion-name stamp changes distribution identity, so collectors track these copies separately from unstamped expansion cards. |
| Pokémon LV.X Identity |mechanic_identity |26 |Pokémon LV.X cards were introduced in Diamond & Pearl as Level-Up Pokémon representing a stronger trained state. |LV.X cards are a distinct era mechanic with unique naming, rules treatment, and checklist identity, so collectors track them apart from ordinary versions of the same Pokémon. |
| Celebrations Classic Collection |subset_identity |25 |Celebrations included a Classic Collection subset of close replicas of popular older cards with special treatment and retained original-style numbering. |Classic Collection cards are tracked separately from both the main Celebrations set and the original historical cards they reference. |
| WOTC Recognized Error / Correction Variant |recognized_error_variant |20 |WOTC-era production or text/artwork mistakes created repeatable physical variants such as no-damage Ninetales, missing Stage text Blastoise, and corrected/error text lanes. |Recognized repeatable errors are collected as distinct objects because they document a specific production state rather than ordinary wear or damage. |
| Jungle No Symbol Error |recognized_error_variant |16 |Some Jungle holo rares were printed without the Jungle expansion symbol. |The missing symbol is a visible, repeatable WOTC-era error that collectors identify separately from normal Jungle holo copies. |
| Trick or Trade Pumpkin Stamp |seasonal_product_stamp |14 |Trick or Trade Halloween mini-set cards are reprints packaged for seasonal Halloween distribution with a Pikachu pumpkin stamp on the card artwork. |The pumpkin stamp ties the card to the Halloween Trick or Trade product instead of the original expansion pack, making it a separate seasonal collector lane. |
| Burger King Stamped Promo |fast_food_distribution_stamp |12 |Burger King Pokémon promotions paired selected Diamond & Pearl-era cards with Kids Meal toy campaigns; the 2009 Platinum campaign used visibly stamped reverse-holo cards. |These cards are tied to a short fast-food promotion and have an identifiable stamp, so collectors track them separately from normal Platinum-era cards. |
| Diamond/Pearl/Platinum SH Shiny Subset |subset_identity |12 |Diamond & Pearl and Platinum-era Shiny cards are commonly tracked as an SH-prefixed shiny subset. |SH cards are sought as shiny variant subset cards and are not ordinary main-set numbering lanes. |
| Build-A-Bear Workshop Stamp |retailer_distribution_stamp |11 |Build-A-Bear Workshop sold Pokémon plush releases with same-character, Build-A-Bear Workshop-branded Pokémon TCG cards. |The stamp ties the card to a specific retail plush promotion, making it physically distinguishable from the standard set card and tracked as a separate promotional lane. |
| Call of Legends SL Shiny Secret Subset |subset_identity |11 |Call of Legends included Shiny Secret prints of Legendary Pokémon, commonly identified by SL-prefixed numbering. |SL cards are collected as a distinct high-interest subset because they are Shiny Secret prints outside the ordinary numbered checklist. |
| Secret / H-Prefix Number Identity |numbering_identity |11 |Some older and special sets use nonstandard prefixes or secret numbering lanes that identify cards outside the ordinary numeric checklist. |The prefix changes checklist identity and helps collectors distinguish secret/subset cards from normal numbered cards. |
| Toys R Us Stamp |retailer_distribution_stamp |11 |Toys R Us released special stamped promotional cards to coincide with Pokémon TCG expansion releases, beginning with the Generations era. |The Toys R Us stamp identifies a retailer-distribution copy that collectors separate from the ordinary expansion card. |
| Winner Stamp |organized_play_winner_stamp |11 |Winner cards are stamped reprints released through Pokémon League or related tournament programs. |The WINNER stamp marks a tournament/league award copy and is physically distinct from the ordinary card. |
| Platinum Arceus AR Subset |subset_identity |9 |Platinum: Arceus includes a distinct AR-numbered Arceus subset, with individual Arceus cards carrying AR-prefixed card numbers. |The AR prefix identifies a themed Arceus subset checklist rather than ordinary set numbering. |
| Holiday Calendar Snowflake / Festive Stamp |seasonal_product_stamp |7 |Pokémon TCG Holiday Calendar products include foil cards with festive stamps; older Countdown/Surprise Calendar products used foil snowflake stamps on included cards. |Snowflake/festive-stamped cards are tied to seasonal calendar products, so collectors track them separately from standard set copies. |
| W Stamp |retail_promotion_stamp |7 |W Promotional cards are reprints with a gold foil W stamp. |The W stamp identifies a separate promotional distribution copy from the normal expansion card. |
| Illustration Rare Identity |rarity_art_identity |6 |Illustration Rare is a Scarlet & Violet-era rarity outside Asia, used for Full Art Secret cards focused on expanded character or environment artwork. |Illustration Rares are collected as a modern art-focused rarity lane with distinct checklist and rarity meaning, not as ordinary set copies. |
| Rising Rivals Rotom RT Subset |subset_identity |6 |Rising Rivals includes Rotom-form cards with RT-prefixed card numbers. |The RT prefix identifies the Rotom-form subset lane and keeps these cards distinct from ordinary numbered Rising Rivals cards. |
| Base Pikachu Cheek / Shadowless Print Run |print_run_variant |5 |Early Base Set Pikachu print runs differ by cheek color, edition, shadowless frame, and in one lane a weak/ghosted First Edition stamp impression. |These visual print-run differences identify early Base Set production states and are collected separately from later Unlimited copies. |
| Battle Academy Deck Mark |product_deck_identity |5 |Battle Academy products are beginner-friendly deck kits with fixed decks and teaching materials; some included cards carry deck/tutorial identity marks. |Deck-marked Battle Academy cards come from a specific teaching product and can be separated from normal set copies. |
| Pokémon Center Stamp |direct_retail_promotion_stamp |5 |Pokémon Center stamped promos are tied to Pokémon Center direct retail or preorder campaigns for specific products. |The stamp identifies a direct-retail promotional copy that is physically distinct from an unstamped set or promo card. |
| Detective Pikachu Movie Stamp |movie_campaign_stamp |4 |Detective Pikachu stamped promos were distributed through movie-era promotional channels, including stamped SM Promo variants tied to the POKEMON Detective Pikachu campaign. |The movie stamp identifies a campaign-distribution copy that collectors separate from the ordinary SM Promo or set card. |
| Prismatic Evolutions Premium Collection Stamp |product_distribution_stamp |4 |Selected Prismatic Evolutions Premium Collection products included stamped promotional reprints such as Lucario and Tyranitar collection cards. |The product stamp identifies a collection-box distribution copy, so collectors separate it from the unstamped Prismatic Evolutions card. |
| WB Kids Stamp |media_promotion_stamp |4 |WB Kids stamped Wizards Black Star Promos were tied to Pokémon movie-era promotional distribution; missing and inverted stamp states are recognized special cases for specific cards. |The stamp state identifies how the promo copy was distributed or mis-stamped, creating a physically distinct lane from the ordinary Black Star Promo. |
| E3 Pikachu Stamp |event_distribution_stamp |3 |Base Set Pikachu has E3-stamped promotional versions; Bulbapedia records red-cheeked copies from Nintendo booth distribution at E3 in May 1999 and yellow-cheeked copies from Nintendo Power. |The stamp and cheek-color combination identifies a narrow early promotional distribution and separates these copies from ordinary Base Set Pikachu. |
| EB Games Stamp |retailer_distribution_stamp |3 |EB Games-stamped cards are retailer-exclusive promotional copies distributed through EB Games channels in markets where EB Games operates. |The EB Games stamp marks a regional retailer-exclusive copy, making it a distinct lane from the unstamped version of the same card. |
| World Championships Stamp |event_distribution_stamp |2 |World Championships stamped cards are tied to specific championship-event distributions or staff/placement programs. |The stamp connects the card to a specific competitive event and can encode staff, placement, or event participation context. |
| Asia Gym Stamp |event_or_regional_distribution_stamp |1 |Asia Gym-stamped cards are regional event/distribution copies of existing cards, with the Gym mark applied to distinguish the promotional copy from the base set printing. |The Gym stamp marks a regional/event-distribution variant that collectors track separately from the ordinary set card and from Play! Pokémon Prize Pack stamped copies. |
| First Edition |edition_print_run |1 |First Edition copies were printed with an edition stamp identifying an earlier edition of the card. |The stamp marks a separate early print identity, usually collected separately from Unlimited copies. |
| GameStop Stamp |retailer_distribution_stamp |1 |GameStop-stamped cards are retailer-exclusive promotional copies distributed through GameStop channels. |The GameStop stamp identifies a retailer-exclusive copy that collectors separate from unstamped promo or set copies. |
| JR East Stamp Rally Promo |event_distribution_stamp |1 |JR East Stamp Rally promotional cards were tied to Japanese railway stamp-rally events and include visibly stamped promo copies. |The JR Stamp Rally mark ties the card to a narrow event-distribution context, making it distinct from the standard promo card. |
| Pokémon Together Stamp |campaign_distribution_stamp |1 |The Pokémon Together stamp was used on Pikachu and Eevee promos distributed through Poké Post pop-up gift-pack campaigns. |The gold campaign stamp identifies the pop-up/gift-pack distribution copy rather than a normal set copy. |

## Family Details

### Play! Pokémon Prize Pack Stamp

- Family key: `prize_pack_series_stamp`
- Category: `organized_play_distribution_stamp`
- Parent rows: 625
- Confidence: `high`

Why it exists: Play! Pokémon Prize Packs are distributed through Organized Play programs and contain selected cards bearing a Play! Pokémon stamp.

Why collectors care: Prize Pack cards retain original set identity but have Organized Play distribution markings, so they are collected separately from ordinary pack-pulled copies.

How to identify: Look for the Play! Pokémon stamp and, where present, the specific Prize Pack series marker.

Grookai rule: Prize Pack stamps are parent identity lanes; explicit series markers may create separate identity lanes under the Prize Pack governance contract.

Sources:
- https://play.pokemon.com/en-us/rewards/gallery/
- https://bulbapedia.bulbagarden.net/wiki/Play%21_Pok%C3%A9mon_Prize_Pack_Series_One_%28TCG%29

### Prerelease / Staff Stamp

- Family key: `prerelease_or_staff_stamp`
- Category: `event_distribution_stamp`
- Parent rows: 315
- Confidence: `high`

Why it exists: Prerelease cards are selected expansion reprints with a Prerelease or expansion-logo stamp; staff versions were produced for event organizers beginning with the Diamond & Pearl expansion.

Why collectors care: Prerelease and Staff stamps identify event-distribution copies, and Staff copies are often more limited because they were distributed to organizers rather than regular participants.

How to identify: Look for a PRERELEASE, expansion-logo, or STAFF stamp on the card face.

Grookai rule: Prerelease and Staff stamps are parent identity modifiers because the stamp changes the distribution identity of the physical card.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Prerelease_cards_%28TCG%29

### Delta Species Identity

- Family key: `delta_species_identity`
- Category: `mechanic_identity`
- Parent rows: 193
- Confidence: `high`

Why it exists: δ Delta Species are a distinct kind of Pokémon card first introduced in EX Delta Species, often showing Pokémon with unusual types compared with their normal identity.

Why collectors care: Collectors track Delta Species separately because the δ mark and altered typing define a recognizable EX-era mechanic and theme, not just a finish.

How to identify: Look for the δ / Delta Species marker and the unusual type assignment on the card.

Grookai rule: Delta Species is a parent identity modifier because it changes the printed card identity and search meaning.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/%CE%94_Delta_Species_%28TCG%29

### Pokémon League / Placement Stamp

- Family key: `pokemon_league_or_placement_stamp`
- Category: `organized_play_placement_stamp`
- Parent rows: 157
- Confidence: `high`

Why it exists: Pokémon League and League Challenge events can award special stamped cards, including placement-stamped variants for top finishers.

Why collectors care: Placement stamps encode event achievement or league distribution, making the physical card a different collector object from a normal copy.

How to identify: Look for a Pokémon League, League Challenge, placement, finalist, or top-cut stamp on the card face.

Grookai rule: Event and placement stamps are modeled as parent identity modifiers when the exact event/card pairing is source-backed.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_League_%28TCG%29
- https://bulbapedia.bulbagarden.net/wiki/League_Challenge_%28TCG%29
- https://bulbapedia.bulbagarden.net/wiki/Miscellaneous_Promotional_cards_%28TCG%29

### Shiny Vault Subset

- Family key: `shiny_vault_subset`
- Category: `subset_identity`
- Parent rows: 94
- Confidence: `high`

Why it exists: Shiny Vault subsets collect Shiny Pokémon cards under SV-prefixed numbering, including Hidden Fates and Shining Fates.

Why collectors care: SV cards are tracked separately because they are Shiny Pokémon subset cards with their own numbering and checklist identity.

How to identify: Look for an SV-prefixed card number and Shiny Pokémon artwork/identity.

Grookai rule: Shiny Vault cards are parent identity lanes because SV numbering is part of the printed checklist identity.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Hidden_Fates_%28TCG%29
- https://bulbapedia.bulbagarden.net/wiki/Shining_Fates_%28TCG%29

### Trainer Gallery Subset

- Family key: `trainer_gallery_subset`
- Category: `subset_identity`
- Parent rows: 60
- Confidence: `high`

Why it exists: Trainer Gallery cards are a subset focused on the relationship between Trainer and Pokémon, using TG-prefixed numbering in Sword & Shield expansions.

Why collectors care: TG cards are collected as a separate gallery subset because their numbering, artwork concept, and checklist position are distinct from the main set.

How to identify: Look for a TG-prefixed card number and Trainer Gallery artwork treatment.

Grookai rule: Trainer Gallery is modeled as parent identity, not a finish, because the card belongs to a separate numbered subset.

Sources:
- https://www.pokemon.com/us/pokemon-news/a-peek-at-the-cards-of-the-pokemon-tcg-sword-shield-brilliant-stars-trainer-gallery

### Radiant Collection Subset

- Family key: `radiant_collection_subset`
- Category: `subset_identity`
- Parent rows: 57
- Confidence: `high`

Why it exists: Radiant Collection is a separately numbered subset that appeared in Legendary Treasures and later Generations, using the RC card-number prefix.

Why collectors care: Collectors track RC cards as a subset lane because their numbering and set membership differ from the main expansion checklist.

How to identify: Look for an RC-prefixed card number such as RC1, RC10, or RC25.

Grookai rule: Subset card-number prefixes are modeled as parent identity lanes when they change checklist membership.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Legendary_Treasures_%28TCG%29
- https://bulbapedia.bulbagarden.net/wiki/Generations_%28TCG%29

### Expansion Logo / Set Stamp

- Family key: `expansion_logo_or_set_stamp`
- Category: `event_or_product_distribution_stamp`
- Parent rows: 47
- Confidence: `medium`

Why it exists: Expansion-logo and set-name stamps are used on selected promotional reprints, including prerelease/event cards and some product or retail promotions tied to a specific expansion.

Why collectors care: The visible set logo or expansion-name stamp changes distribution identity, so collectors track these copies separately from unstamped expansion cards.

How to identify: Look for the expansion logo or set-name stamp on the artwork area, then verify the exact card against the relevant prerelease, product, or card-specific release source.

Grookai rule: Set-logo stamps are parent identity variants. The family-level explanation may be public, but exact campaign/source evidence should remain attached per card where available.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Prerelease_cards_%28TCG%29
- https://bulbapedia.bulbagarden.net/wiki/Pachirisu_%28Diamond_%26_Pearl_35%29
- https://bulbapedia.bulbagarden.net/wiki/Grotle_%28Diamond_%26_Pearl_49%29

### Pokémon LV.X Identity

- Family key: `pokemon_lvx_identity`
- Category: `mechanic_identity`
- Parent rows: 26
- Confidence: `high`

Why it exists: Pokémon LV.X cards were introduced in Diamond & Pearl as Level-Up Pokémon representing a stronger trained state.

Why collectors care: LV.X cards are a distinct era mechanic with unique naming, rules treatment, and checklist identity, so collectors track them apart from ordinary versions of the same Pokémon.

How to identify: Look for LV.X in the card name and Level-Up styling.

Grookai rule: LV.X is modeled as parent identity because it is part of the printed card name/mechanic identity.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_LV.X_%28TCG%29

### Celebrations Classic Collection

- Family key: `classic_collection_subset`
- Category: `subset_identity`
- Parent rows: 25
- Confidence: `high`

Why it exists: Celebrations included a Classic Collection subset of close replicas of popular older cards with special treatment and retained original-style numbering.

Why collectors care: Classic Collection cards are tracked separately from both the main Celebrations set and the original historical cards they reference.

How to identify: Look for the Celebrations Classic Collection treatment and card identity rather than treating it as the original vintage print.

Grookai rule: Classic Collection is a parent identity lane because it is a separate modern subset, not a finish variant of the original card.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Celebrations_%28TCG%29

### WOTC Recognized Error / Correction Variant

- Family key: `wotc_recognized_error`
- Category: `recognized_error_variant`
- Parent rows: 20
- Confidence: `high`

Why it exists: WOTC-era production or text/artwork mistakes created repeatable physical variants such as no-damage Ninetales, missing Stage text Blastoise, and corrected/error text lanes.

Why collectors care: Recognized repeatable errors are collected as distinct objects because they document a specific production state rather than ordinary wear or damage.

How to identify: Compare the affected text, artwork, HP, holo box, set symbol, or other documented error area against the corrected card.

Grookai rule: Grookai only models error lanes when they are externally recognized and repeatable at card identity level.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Error_cards
- https://www.elitefourum.com/t/masters-guide-for-pokemon-wotc-corrected-errors-test-cards/29328
- https://www.cgccards.com/news/article/8861/pokemon-ninetales-variant/

### Jungle No Symbol Error

- Family key: `jungle_no_symbol_error`
- Category: `recognized_error_variant`
- Parent rows: 16
- Confidence: `high`

Why it exists: Some Jungle holo rares were printed without the Jungle expansion symbol.

Why collectors care: The missing symbol is a visible, repeatable WOTC-era error that collectors identify separately from normal Jungle holo copies.

How to identify: Confirm the Jungle holo rare is missing the Jungle set symbol where it should appear.

Grookai rule: Recognized repeatable production errors receive parent identity lanes when card-level evidence supports the exact card.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Jungle_%28TCG%29
- https://bulbapedia.bulbagarden.net/wiki/Error_cards

### Trick or Trade Pumpkin Stamp

- Family key: `trick_or_trade_pumpkin_stamp`
- Category: `seasonal_product_stamp`
- Parent rows: 14
- Confidence: `medium`

Why it exists: Trick or Trade Halloween mini-set cards are reprints packaged for seasonal Halloween distribution with a Pikachu pumpkin stamp on the card artwork.

Why collectors care: The pumpkin stamp ties the card to the Halloween Trick or Trade product instead of the original expansion pack, making it a separate seasonal collector lane.

How to identify: Look for the Pikachu jack-o-lantern / pumpkin stamp on the card art and verify the card against the Trick or Trade checklist.

Grookai rule: Trick or Trade stamped cards are parent identity variants because the visible seasonal stamp changes distribution identity while preserving the base card identity.

Sources:
- https://www.pokebeach.com/forums/threads/all-30-pokemon-%E2%80%9Ctrick-or-trade%E2%80%9D-halloween-cards.153244/

### Burger King Stamped Promo

- Family key: `burger_king_stamped_promo`
- Category: `fast_food_distribution_stamp`
- Parent rows: 12
- Confidence: `high`

Why it exists: Burger King Pokémon promotions paired selected Diamond & Pearl-era cards with Kids Meal toy campaigns; the 2009 Platinum campaign used visibly stamped reverse-holo cards.

Why collectors care: These cards are tied to a short fast-food promotion and have an identifiable stamp, so collectors track them separately from normal Platinum-era cards.

How to identify: Look for the Burger King or Platinum promotional stamp on the card face and verify the card against Burger King promo product/checklist sources.

Grookai rule: Burger King stamped cards are parent identity variants; the stamped row may then carry its own supported child finish.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/2009_Burger_King_promotional_Pok%C3%A9mon_toys
- https://www.tcgplayer.com/product/155611/pokemon-burger-king-promos-lucario-6-130-diamond-and-pearl
- https://www.tcgplayer.com/product/215634/pokemon-burger-king-promos-manaphy-9-130-diamond-and-pearl
- https://www.pricecharting.com/game/pokemon-great-encounters/palkia-stamped-26
- https://pokecardvalues.co.uk/cards/manaphy-9-130-reverse-holo-burger-king-diamond-pearl/dp1-9-3-19/

### Diamond/Pearl/Platinum SH Shiny Subset

- Family key: `dp_platinum_shiny_sh_subset`
- Category: `subset_identity`
- Parent rows: 12
- Confidence: `medium`

Why it exists: Diamond & Pearl and Platinum-era Shiny cards are commonly tracked as an SH-prefixed shiny subset.

Why collectors care: SH cards are sought as shiny variant subset cards and are not ordinary main-set numbering lanes.

How to identify: Look for an SH-prefixed card number such as SH1 through SH12.

Grookai rule: SH-prefixed cards are parent identity lanes because the prefix encodes subset identity.

Sources:
- https://www.psacard.com/psasetregistry/showcase/variations/pokemon-diamon-pearl-platinum-2008-2009-shiny-sh-subset/imagegallery/5378

### Build-A-Bear Workshop Stamp

- Family key: `build_a_bear_workshop_stamp`
- Category: `retailer_distribution_stamp`
- Parent rows: 11
- Confidence: `high`

Why it exists: Build-A-Bear Workshop sold Pokémon plush releases with same-character, Build-A-Bear Workshop-branded Pokémon TCG cards.

Why collectors care: The stamp ties the card to a specific retail plush promotion, making it physically distinguishable from the standard set card and tracked as a separate promotional lane.

How to identify: Look for the Build-A-Bear Workshop stamp on the card face.

Grookai rule: Visible retailer distribution stamps are modeled as parent identity modifiers, not as card finishes.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Build-A-Bear_Workshop_collection

### Call of Legends SL Shiny Secret Subset

- Family key: `call_of_legends_sl_subset`
- Category: `subset_identity`
- Parent rows: 11
- Confidence: `high`

Why it exists: Call of Legends included Shiny Secret prints of Legendary Pokémon, commonly identified by SL-prefixed numbering.

Why collectors care: SL cards are collected as a distinct high-interest subset because they are Shiny Secret prints outside the ordinary numbered checklist.

How to identify: Look for an SL-prefixed card number in Call of Legends.

Grookai rule: SL-prefixed cards are parent identity lanes because the prefix is a printed subset identity.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Call_of_Legends_%28TCG%29

### Secret / H-Prefix Number Identity

- Family key: `secret_or_h_prefix_identity`
- Category: `numbering_identity`
- Parent rows: 11
- Confidence: `medium`

Why it exists: Some older and special sets use nonstandard prefixes or secret numbering lanes that identify cards outside the ordinary numeric checklist.

Why collectors care: The prefix changes checklist identity and helps collectors distinguish secret/subset cards from normal numbered cards.

How to identify: Check the printed card number prefix and compare it to the set checklist.

Grookai rule: Number-prefix identities are parent identity lanes when the prefix changes checklist membership.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Secret_card_%28TCG%29

### Toys R Us Stamp

- Family key: `toys_r_us_stamp`
- Category: `retailer_distribution_stamp`
- Parent rows: 11
- Confidence: `high`

Why it exists: Toys R Us released special stamped promotional cards to coincide with Pokémon TCG expansion releases, beginning with the Generations era.

Why collectors care: The Toys R Us stamp identifies a retailer-distribution copy that collectors separate from the ordinary expansion card.

How to identify: Look for the Toys R Us stamp on the card face.

Grookai rule: Retailer-exclusive visible stamps create parent identity lanes when the exact card/stamp pairing is source-backed.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Toys_%22R%22_Us_Promotional_cards_%28TCG%29
- https://bulbapedia.bulbagarden.net/wiki/Ponyta_%28Flashfire_14%29
- https://www.tcgplayer.com/product/153282/pokemon-miscellaneous-cards-and-products-ponyta-14-83-toys-r-us-promo
- https://www.pricecharting.com/game/pokemon-generations/ponyta-toys-r-us-14

### Winner Stamp

- Family key: `winner_stamp`
- Category: `organized_play_winner_stamp`
- Parent rows: 11
- Confidence: `high`

Why it exists: Winner cards are stamped reprints released through Pokémon League or related tournament programs.

Why collectors care: The WINNER stamp marks a tournament/league award copy and is physically distinct from the ordinary card.

How to identify: Look for the foil WINNER stamp on the card face.

Grookai rule: Winner-stamped cards are parent identity variants because the stamp records distribution and award context.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Winner_cards_%28TCG%29

### Platinum Arceus AR Subset

- Family key: `arceus_ar_subset`
- Category: `subset_identity`
- Parent rows: 9
- Confidence: `high`

Why it exists: Platinum: Arceus includes a distinct AR-numbered Arceus subset, with individual Arceus cards carrying AR-prefixed card numbers.

Why collectors care: The AR prefix identifies a themed Arceus subset checklist rather than ordinary set numbering.

How to identify: Look for an AR-prefixed card number such as AR1 through AR9.

Grookai rule: AR-prefixed cards are parent identity lanes because the prefix changes checklist membership.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Platinum%3A_Arceus_%28TCG%29
- https://bulbapedia.bulbagarden.net/wiki/Arceus_%28Arceus_AR9%29

### Holiday Calendar Snowflake / Festive Stamp

- Family key: `holiday_calendar_snowflake_stamp`
- Category: `seasonal_product_stamp`
- Parent rows: 7
- Confidence: `high`

Why it exists: Pokémon TCG Holiday Calendar products include foil cards with festive stamps; older Countdown/Surprise Calendar products used foil snowflake stamps on included cards.

Why collectors care: Snowflake/festive-stamped cards are tied to seasonal calendar products, so collectors track them separately from standard set copies.

How to identify: Look for the snowflake or festive calendar stamp on the card art and verify the card against the relevant Holiday/Countdown Calendar product list.

Grookai rule: Holiday Calendar stamped cards are parent identity variants because the seasonal product stamp changes distribution identity.

Sources:
- https://www.pokemon.com/us/pokemon-tcg/product-gallery/holiday-calendar
- https://www.pokemon.com/us/pokemon-tcg/product-gallery/holiday-calendar-2025
- https://www.pokemoncenter.com/product/290-85256/pokemon-tcg-holiday-calendar-glaceon-alolan-vulpix
- https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Countdown_Calendar_%28TCG%29

### W Stamp

- Family key: `w_stamp`
- Category: `retail_promotion_stamp`
- Parent rows: 7
- Confidence: `high`

Why it exists: W Promotional cards are reprints with a gold foil W stamp.

Why collectors care: The W stamp identifies a separate promotional distribution copy from the normal expansion card.

How to identify: Look for the gold foil W stamp on the card face.

Grookai rule: W-stamped cards are modeled as parent identity variants.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/W_Promotional_cards_%28TCG%29

### Illustration Rare Identity

- Family key: `illustration_rare_identity`
- Category: `rarity_art_identity`
- Parent rows: 6
- Confidence: `high`

Why it exists: Illustration Rare is a Scarlet & Violet-era rarity outside Asia, used for Full Art Secret cards focused on expanded character or environment artwork.

Why collectors care: Illustration Rares are collected as a modern art-focused rarity lane with distinct checklist and rarity meaning, not as ordinary set copies.

How to identify: Look for the Illustration Rare rarity label/symbol and the full-art scene treatment.

Grookai rule: Illustration Rare is a parent identity label when the printed card is stored as a distinct art/rarity lane.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Illustration_rare_card_%28TCG%29

### Rising Rivals Rotom RT Subset

- Family key: `rotom_rt_subset`
- Category: `subset_identity`
- Parent rows: 6
- Confidence: `medium`

Why it exists: Rising Rivals includes Rotom-form cards with RT-prefixed card numbers.

Why collectors care: The RT prefix identifies the Rotom-form subset lane and keeps these cards distinct from ordinary numbered Rising Rivals cards.

How to identify: Look for an RT-prefixed card number and Rotom form identity.

Grookai rule: RT-prefixed cards are parent identity lanes because the prefix changes printed checklist identity.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Rotom_%28TCG%29
- https://bulbapedia.bulbagarden.net/wiki/Frost_Rotom_%28Rising_Rivals_RT2%29

### Base Pikachu Cheek / Shadowless Print Run

- Family key: `base_pikachu_print_run`
- Category: `print_run_variant`
- Parent rows: 5
- Confidence: `high`

Why it exists: Early Base Set Pikachu print runs differ by cheek color, edition, shadowless frame, and in one lane a weak/ghosted First Edition stamp impression.

Why collectors care: These visual print-run differences identify early Base Set production states and are collected separately from later Unlimited copies.

How to identify: Check cheek color, shadowless frame, edition stamp, and whether the First Edition stamp is absent, normal, or ghosted.

Grookai rule: Visible print-run identity differences are parent identity variants, not finishes.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Pikachu_%28Base_Set_58%29
- https://www.elitefourum.com/t/base-pikachu-artwork-card-variations/15059

### Battle Academy Deck Mark

- Family key: `battle_academy_deck_mark`
- Category: `product_deck_identity`
- Parent rows: 5
- Confidence: `medium`

Why it exists: Battle Academy products are beginner-friendly deck kits with fixed decks and teaching materials; some included cards carry deck/tutorial identity marks.

Why collectors care: Deck-marked Battle Academy cards come from a specific teaching product and can be separated from normal set copies.

How to identify: Look for Battle Academy deck or sequence marks and confirm the source product year.

Grookai rule: Battle Academy deck-mark rows are parent identity variants when the mark is visible and source-backed.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Battle_Academy_2022_%28TCG%29

### Pokémon Center Stamp

- Family key: `pokemon_center_stamp`
- Category: `direct_retail_promotion_stamp`
- Parent rows: 5
- Confidence: `medium`

Why it exists: Pokémon Center stamped promos are tied to Pokémon Center direct retail or preorder campaigns for specific products.

Why collectors care: The stamp identifies a direct-retail promotional copy that is physically distinct from an unstamped set or promo card.

How to identify: Look for the Pokémon Center stamp and verify the card against the exact campaign/product source.

Grookai rule: Pokémon Center stamps are parent identity variants; exact campaign text should be preserved whenever available.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Miscellaneous_Promotional_cards_%28TCG%29

### Detective Pikachu Movie Stamp

- Family key: `detective_pikachu_movie_stamp`
- Category: `movie_campaign_stamp`
- Parent rows: 4
- Confidence: `medium`

Why it exists: Detective Pikachu stamped promos were distributed through movie-era promotional channels, including stamped SM Promo variants tied to the POKEMON Detective Pikachu campaign.

Why collectors care: The movie stamp identifies a campaign-distribution copy that collectors separate from the ordinary SM Promo or set card.

How to identify: Look for the Detective Pikachu movie stamp on the card face and confirm the promo number against card-specific checklist or marketplace references.

Grookai rule: Movie-campaign stamps are parent identity variants when the exact stamped card is source-backed.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Detective_Pikachu_%28SM_Promo_190%29
- https://bulbapedia.bulbagarden.net/wiki/Bulbasaur_%28SM_Promo_198%29
- https://www.tcgplayer.com/product/206823/pokemon-sm-promos-detective-pikachu-sm170-stamped
- https://www.tcgplayer.com/product/196992/pokemon-sm-promos-detective-pikachu-sm190-stamped
- https://www.tcgplayer.com/product/206824/pokemon-sm-promos-bulbasaur-sm198-detective-pikachu-stamped

### Prismatic Evolutions Premium Collection Stamp

- Family key: `prismatic_evolutions_premium_collection_stamp`
- Category: `product_distribution_stamp`
- Parent rows: 4
- Confidence: `medium`

Why it exists: Selected Prismatic Evolutions Premium Collection products included stamped promotional reprints such as Lucario and Tyranitar collection cards.

Why collectors care: The product stamp identifies a collection-box distribution copy, so collectors separate it from the unstamped Prismatic Evolutions card.

How to identify: Look for the Prismatic Evolutions stamp on the card face and verify the exact card against product announcement or catalog sources.

Grookai rule: Product-exclusive stamps are parent identity variants when exact product/card evidence is preserved.

Sources:
- https://www.pokebeach.com/forums/threads/%E2%80%9Cprismatic-evolutions-lucario-ex-tyranitar-ex-premium-collection%E2%80%9D-to-release-at-sam%E2%80%99s-club.156293/
- https://www.pokeguardian.com/2646761_prismatic-evolutions-lucario-ex-tyranitar-ex-premium-collection-revealed
- https://www.pricecharting.com/game/pokemon-prismatic-evolutions/lucario-stamped-51

### WB Kids Stamp

- Family key: `wb_kids_stamp`
- Category: `media_promotion_stamp`
- Parent rows: 4
- Confidence: `high`

Why it exists: WB Kids stamped Wizards Black Star Promos were tied to Pokémon movie-era promotional distribution; missing and inverted stamp states are recognized special cases for specific cards.

Why collectors care: The stamp state identifies how the promo copy was distributed or mis-stamped, creating a physically distinct lane from the ordinary Black Star Promo.

How to identify: Check whether the WB Kids stamp is present, missing, or inverted on the card face.

Grookai rule: Grookai models WB Kids stamp states as parent identity variants when card-specific evidence is strong enough.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Miscellaneous_Promotional_cards_%28TCG%29
- https://www.elitefourum.com/t/masters-guide-for-pokemon-wotc-corrected-errors-test-cards/29328

### E3 Pikachu Stamp

- Family key: `e3_pikachu_stamp`
- Category: `event_distribution_stamp`
- Parent rows: 3
- Confidence: `high`

Why it exists: Base Set Pikachu has E3-stamped promotional versions; Bulbapedia records red-cheeked copies from Nintendo booth distribution at E3 in May 1999 and yellow-cheeked copies from Nintendo Power.

Why collectors care: The stamp and cheek-color combination identifies a narrow early promotional distribution and separates these copies from ordinary Base Set Pikachu.

How to identify: Look for the gold E3 stamp and verify whether the Pikachu artwork has red or yellow cheeks.

Grookai rule: Grookai models the E3 stamp and cheek color together because both are visible identity dimensions.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Pikachu_%28Base_Set_58%29
- https://www.elitefourum.com/t/base-pikachu-artwork-card-variations/15059

### EB Games Stamp

- Family key: `eb_games_stamp`
- Category: `retailer_distribution_stamp`
- Parent rows: 3
- Confidence: `medium`

Why it exists: EB Games-stamped cards are retailer-exclusive promotional copies distributed through EB Games channels in markets where EB Games operates.

Why collectors care: The EB Games stamp marks a regional retailer-exclusive copy, making it a distinct lane from the unstamped version of the same card.

How to identify: Look for the EB Games stamp and verify the exact card against retailer-exclusive product/checklist sources.

Grookai rule: EB Games stamps are parent identity variants when the exact card/stamp pairing is source-backed.

Sources:
- https://www.tcgplayer.com/product/531251/pokemon-miscellaneous-cards-and-products-charmander-004-165-ebgames-exclusive
- https://www.pricecharting.com/game/pokemon-scarlet-%26-violet-151/charmander-eb-games-4
- https://www.tcgplayer.com/product/686505/pokemon-miscellaneous-cards-and-products-gengar-cosmos-holo-eb-games-exclusive

### World Championships Stamp

- Family key: `world_championships_stamp`
- Category: `event_distribution_stamp`
- Parent rows: 2
- Confidence: `medium`

Why it exists: World Championships stamped cards are tied to specific championship-event distributions or staff/placement programs.

Why collectors care: The stamp connects the card to a specific competitive event and can encode staff, placement, or event participation context.

How to identify: Look for the World Championships, Worlds, Staff, or placement stamp on the card face.

Grookai rule: Worlds/event-stamped rows stay parent identity variants; exact event/card provenance should be preserved before adding new lanes.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Miscellaneous_Promotional_cards_%28TCG%29

### Asia Gym Stamp

- Family key: `asia_gym_stamp`
- Category: `event_or_regional_distribution_stamp`
- Parent rows: 1
- Confidence: `medium`

Why it exists: Asia Gym-stamped cards are regional event/distribution copies of existing cards, with the Gym mark applied to distinguish the promotional copy from the base set printing.

Why collectors care: The Gym stamp marks a regional/event-distribution variant that collectors track separately from the ordinary set card and from Play! Pokémon Prize Pack stamped copies.

How to identify: Look for the Gym stamp on the card face and confirm the exact set, card number, and name against stamp-specific catalog references.

Grookai rule: Gym-stamped rows are parent identity variants when the exact card/stamp pairing is source-backed; the stamp is not modeled as a finish.

Sources:
- https://www.pricecharting.com/game/pokemon-astral-radiance/radiant-greninja-gym-stamp-46
- https://www.pkmn.gg/series/sword-shield/astral-radiance/046

### First Edition

- Family key: `first_edition`
- Category: `edition_print_run`
- Parent rows: 1
- Confidence: `high`

Why it exists: First Edition copies were printed with an edition stamp identifying an earlier edition of the card.

Why collectors care: The stamp marks a separate early print identity, usually collected separately from Unlimited copies.

How to identify: Look for the First Edition stamp on the card face.

Grookai rule: First Edition is modeled as a parent identity modifier, not as a finish.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Pikachu_%28Base_Set_58%29
- https://bulbapedia.bulbagarden.net/wiki/Prerelease_cards_%28TCG%29

### GameStop Stamp

- Family key: `gamestop_stamp`
- Category: `retailer_distribution_stamp`
- Parent rows: 1
- Confidence: `medium`

Why it exists: GameStop-stamped cards are retailer-exclusive promotional copies distributed through GameStop channels.

Why collectors care: The GameStop stamp identifies a retailer-exclusive copy that collectors separate from unstamped promo or set copies.

How to identify: Look for the GameStop stamp and verify the exact card against retailer-exclusive product/checklist sources.

Grookai rule: GameStop stamps are parent identity variants when the exact card/stamp pairing is source-backed.

Sources:
- https://www.tcgplayer.com/product/247362/pokemon-miscellaneous-cards-and-products-duraludon-swsh028-gamestop-exclusive
- https://www.pricecharting.com/game/pokemon-promo/duraludon-stamped-swsh028

### JR East Stamp Rally Promo

- Family key: `jr_stamp_rally_promo`
- Category: `event_distribution_stamp`
- Parent rows: 1
- Confidence: `medium`

Why it exists: JR East Stamp Rally promotional cards were tied to Japanese railway stamp-rally events and include visibly stamped promo copies.

Why collectors care: The JR Stamp Rally mark ties the card to a narrow event-distribution context, making it distinct from the standard promo card.

How to identify: Look for the JR East Stamp Rally mark on the card face and verify the card against card-specific references.

Grookai rule: Stamp-rally event cards are parent identity variants when the exact card/stamp pairing is source-backed.

Sources:
- https://bulbapedia.bulbagarden.net/wiki/Eevee_%28Wizards_Promo_11%29
- https://www.tcgplayer.com/product/618732/pokemon-wotc-promo-eevee-jr-east-stamp-rally
- https://www.psacard.com/spec/psa/2082246

### Pokémon Together Stamp

- Family key: `pokemon_together_stamp`
- Category: `campaign_distribution_stamp`
- Parent rows: 1
- Confidence: `high`

Why it exists: The Pokémon Together stamp was used on Pikachu and Eevee promos distributed through Poké Post pop-up gift-pack campaigns.

Why collectors care: The gold campaign stamp identifies the pop-up/gift-pack distribution copy rather than a normal set copy.

How to identify: Look for the Pokémon Together stamp on the card face.

Grookai rule: Campaign stamps are modeled as parent identities so the stamped copy can be owned, searched, and imaged separately.

Sources:
- https://www.pokebeach.com/2023/11/special-pikachu-and-eevee-pokemon-together-stamped-promos-to-release-at-european-pop-ups
