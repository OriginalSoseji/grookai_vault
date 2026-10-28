# Grookai Agent Entry Point

## Canonical brand and visual direction

Follow `docs/contracts/APP_VISUAL_SYSTEM_CONTRACT_V1.md` and
`docs/contracts/BRAND_TYPOGRAPHY_CONTRACT_V1.md` across native and web, including
desktop, on every branch. Roboto is bundled globally; user-facing names are
`grookai` and `grookai vault`; standalone text lockups use weight 900 through a
shared component. Preserve the original emblem design and proportions; any
logo color and seasonal theme is allowed. Halloween spiders and Winter
snowflakes may animate inside the profile frame with pause/reduced-motion
support. Never substitute a typed `G` or replacement monogram. The visual
system uses ink/bone/lime, warm market highlights, compact headers, 8px surfaces,
10px artwork corners, and 9px card gaps. Historical screenshots and branch-local
defaults do not override these contracts. Interface interactions remain electric
lime with the accessible deep-green light-mode counterpart. Seasonal logo
artwork may use any colors while preserving the original design and proportions.

## Hosted Ollama candidate queue — October 22

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_168_HOSTED_OLLAMA_CANDIDATE_QUEUE.md`.
The local pricing task must consume the hosted
`ollama_identity_candidate_queue.jsonl`; it must not open a production database
connection. Hosted enrichment is read-only, preserves separate Magic and
Pokemon identity domains, and emits only bounded real catalog candidates. The
loopback Ollama model remains advisory. It cannot write identity, mappings,
prices, publication state, or customer state. Promotion still requires
deterministic validation and the governed release path.

## TCGPlayer residual packaging scope repair — October 21

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_166_TCGPLAYER_RESIDUAL_PACKAGING_SCOPE_REPAIR.md`.
The verified V1.4 queue still contained 253 numberless sealed or packaged
products under narrower TCGPlayer names. V1.5 adds explicit pack, starter,
event, and boxed-edition families while preserving every numbered product and
204 audited numberless card-like products. Preserve V1.1 through V1.4 for
historical replay and keep the broader publication ledger on V1.3. Require an
exact-commit full shadow, guarded production activation, and independent
completion-artifact readback before changing the local Ollama consumer.

## TCGPlayer packaging scope repair — October 21

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_165_TCGPLAYER_PACKAGING_SCOPE_REPAIR.md`.
The first live cross-category queue was hash-valid but included numberless Fat
Packs, Intro Packs, decks, bundles, displays, collections, cases, kits, Boxes,
and whole Secret Lair drops as missing cards. V1.4 excludes only products with
both an explicit package signal and no printed-number evidence. Its exact-commit
shadow, guarded production activation, and completion readback passed. Preserve
V1.3 and V1.4 for historical replay; checkpoint 166 owns the residual naming
families.

## MTG reviewed printing correction — October 20

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_163_MTG_REVIEWED_PRINTING_CORRECTION.md`.
TCGPlayer product 269823 is Treasure Token number 17; its legacy number-13
parent and child mappings caused two products to publish toward one printing and
blocked activation. Only the frozen two-row correction may move it to the
existing `tsnc` number-17 parent/Normal child. Apply candidate V7 first so the
reviewed correction uses exact `mtg_printing_mapping_id` lineage and leaves the
historical assignment ledger unchanged. Require rollback proof, exact merged
SHA, plan-derived acknowledgement, independent readback, a new full shadow, and
normal production activation reconciliation. Never reuse failed production run
39486729222 or its older shadow.

## Japanese catalog secondary-checklist resilience — October 20

Read `docs/ops/UNIVERSAL_CATALOG_JAPANESE_CHECKLIST_FALLBACK_20261020.md`.
Also read
`docs/ops/UNIVERSAL_CATALOG_JAPANESE_OFFICIAL_EXPANSION_FALLBACK_20261021.md`.
Bulbapedia is independent corroboration for the Japanese product lane. Its typed
access denial or outage may be contained behind a complete TCGdex checklist, or
for official expansion products only, behind an exact official product
enumeration plus an exact same-code Limitless numbered checklist when TCGdex
evidence is entirely absent. Metadata-only or other partial TCGdex evidence
remains fatal. The latter
evidence shape remains ineligible for unattended writes. HTTP 401/403 remains
globally strict; missing/partial evidence, parser failures, mixed set codes, and
count disagreements remain fatal. Do not dispatch discovery, write catalog
data, or count a pre-merge/manual run as Ruflo pilot qualification.

## MTG fresh Scryfall finish backfill — October 20

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_160_MTG_FRESH_SCRYFALL_FINISH_BACKFILL.md`.
Fresh Scryfall bulk data may create `tcgplayer_market` printing mappings only
when every observed Normal/Foil lane for a blocked MTG product collapses to one
existing visible, nonprovisional English paper child. Bind the plan to the
source bulk hash and immutable pricing run. Write only missing
`productId:finish` rows; conflicting, ambiguous, partial, etched, unsupported,
and hidden rows remain held. Mapping insertion and price publication are
separate guarded releases.

## MTG exact-finish missing-number bridge — October 20

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_159_MTG_EXACT_FINISH_MISSING_NUMBER_BRIDGE.md`.
Missing printed-number text may be waived only for category 1 Normal/Foil rows
whose active `tcgplayer_market` `productId:finish` mapping points to the same
single canonical printing already selected by the ordinary mapping lane. The
candidate must have one card mapping, one printing mapping, one English paper
identity domain, and an exact child-finish assignment. Publication must switch
to the durable `mtg_printing_mapping_id` lineage; never carry both that lineage
and the generic source/variant assignment IDs. All ambiguous, provisional,
hidden, unsupported, and non-positive-price rows remain held.

## MTG finish-specific market bridge — October 18

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_158_MTG_FINISH_SPECIFIC_MARKET_BRIDGE.md`.
MTG TCGPlayer `productId` is not a canonical parent identity. When the exact
`productId:normal` and `productId:foil` mappings resolve to different Scryfall
parents, publication must carry the active `external_printing_mappings` row as
its durable lineage. Never invent or select a parent-level mapping to force the
two finishes together. The new lane remains category 1, Normal/Foil only,
one-owner, nonprovisional, visible, English paper printing evidence.
Snapshot guards fully validate the incoming row, then link it to the exact
already-validated decision by decision, run, observation, printing, and mapping
IDs; do not re-run the full validator inside that lineage lookup.

## TCGCSV current-sync singleton repair — October 17

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_157_TCGCSV_CURRENT_SYNC_SINGLETON_REPAIR.md`.
Every applying current TCGCSV warehouse sync must hold the shared database
advisory lock for its full lifetime on the same PostgreSQL session that performs
the warehouse writes. A second current sync must stop before ingestion, and a
run must prove it still owns all fetched category, group, and product stamps
before it may mark missing rows. The October 17 zero-candidate shadow is invalid
and must not authorize publication. Repair the active flags with a fresh locked
full sync, then require a nonzero exact-commit shadow before production.

## Pricing assignment-lane race repair — October 17

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_156_ASSIGNMENT_LANE_RACE_REPAIR.md`.
Ordinary market-close rows must carry a concrete variant-assignment ledger ID
before qualification can publish them. This prevents a mapping created after
assignment preparation from passing policy and then failing the snapshot table
constraint. The next run prepares the missing assignment normally; edition
assignment lanes remain separate.

## Ollama bulk TCGPlayer mapping triage — October 17

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_155_OLLAMA_BULK_MAPPING_AGENT.md`.
The local `grookai-card-triage:4b` worker now enriches every blocked product
against the live unmapped canonical parent catalog before inference, processes
up to 5,000 rows sequentially, and reconciles selected targets across the whole
batch. Duplicate target selections, sealed products, uncertain identities, and
missing evidence remain explicit holds. The agent is read-only and advisory: it
cannot write mappings or publish prices. Promote only the collision-free review
queue through the existing exact authority, rollback, apply, shadow, and
publication gates. The local worker polls every five minutes and no-ops on an
unchanged input hash; the hosted production backlog measurement runs every
fifteen minutes.

## MEP catalog-backed pricing repair — October 16

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_154_MEP_CATALOG_BACKFILL.md`.
The first missing-parent batch is exactly MEP 072, 073, 081, and 088: four
parents, four active identities, four Holo children, and four exact TCGPlayer
mappings with accepted mapping methods and two-source Master Index authority.
The guarded production rehearsal passed and rolled all 16 attempted rows back
with identical snapshots. Merge the frozen package,
wait for the active full-market pricing publication and its readback, then use
the clean exact-commit apply gate and independent catalog readback. Catalog
insertion does not publish prices. Keep Zarude 088 Pokemon Center Exclusive,
MEP 092-110 one-source rows, and all variant collisions held.

## Review-lead pricing aliases — October 16

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_153_REVIEW_LEAD_ALIAS_BATCH.md`.
The next bounded batch contains six exact TCGPlayer products, six parents, and
seven printings across `ex15`, `smp`, `sm10`, and `svp`. Five printings need a
new verified-visible truth review; the two Fairy Charm printings must retain
their existing reviews. Keep Pikachu 225 and all documented promo, award,
edition, and duplicate-parent collisions held. Production order is truth-review
dry-run/apply/readback, exact mapping authority and apply/readback, then a later
fresh full-scope pricing shadow and guarded publication.

## Operations agent schedule health — October 16

Read `docs/checkpoints/OPERATIONS_AGENT_SCHEDULE_HEALTH_20261016.md`. Heartbeat
staleness applies only to periodic `cron`, `timer`, and `continuous` agents.
Event and manual agents are healthy while idle, but their latest running or
failed run still surfaces. The forward migration is locally rehearsed and
remains production-blocked by the historical zero-state replay failure in the
already-applied October 12 card-identity alias migration.

## Burger King stamped alias extension — October 15

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_152_BURGER_KING_STAMPED_ALIAS_BATCH.md`.
Ten exact Burger King promo products now extend the pending master-evidence
alias batch. The combined scope is 17 products, 17 parents, and 20 price
observations across seven canonical sets. Burger King rows must bind to their
existing `diamond_pearl_stamp` or `platinum_stamped_burger_king_2009` parent and
the exact Holo or Reverse child established by checked-in catalog adjudication.
Keep the other 14 Burger King rows blocked. Production order is 20 truth
reviews, independent readback, seven-set mapping authority, 17 mappings,
independent readback, then a later full pricing shadow and publication. Do not
add a group-wide stamp, Burger King, Diamond & Pearl, or Platinum alias rule.

## Master-evidence alias batch — October 15

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_151_MASTER_EVIDENCE_ALIAS_BATCH.md`.
Checkpoint 152 extends these seven previously held TCGPlayer products to a
combined 17-product authority across
Dragons Exalted, Dragon Majesty, Celebrations: Classic Collection, and Black
Bolt plus three Diamond & Pearl-era sets. The combined batch covers 20
missing-price observations and 20 existing Holo, Normal, or Reverse children.
The original authority explicitly reconciles the product-specific
`GFPD` and `WLFM` Blend Energy abbreviations, the `sm75`/`sm7.5` set-key
difference, and the Master Index `Umbreon Star`/`Umbreon ★` card/printing names.
Production order is 20 verified-visible truth reviews, independent readback,
seven-set mapping authority, 17 mappings, independent readback, then a later
full pricing shadow and publication. Do not broaden these product-specific
aliases into a global abbreviation, symbol, persona, Full Art, or set-key
normalization rule.

## Residual reviewed alias batch — October 15

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_150_RESIDUAL_ALIAS_BATCH.md`.
The next bounded pricing repair freezes exactly 24 TCGPlayer products across 11
English Pokémon sets, covering 30 missing-price observations. Every source title,
printed coordinate, canonical parent, and source-listed finish is product-specific.
Production order is 30 verified-visible truth reviews, independent readback,
11-set mapping authority, 24 mappings, independent readback, then a later full
pricing shadow and publication. Preserve the explicit Victory Cup, duplicate
parent, multiple-child, missing-child, and incomplete-evidence holds.

## Ruflo Codex integration — October 15

Read `docs/ops/RUFLO_CODEX_INTEGRATION_20261015.md`. Ruflo is configured only
through the trusted-project `.codex/config.toml`, pinned to `3.56.9`, and run as
a child stdio MCP server with a bounded tool allowlist. Do not run the upstream
initializer, replace the version with `latest`, install its user-scoped Codex
plugin, or enable HTTP, WebSocket, Docker, daemon, terminal, GitHub, browser,
federation, or managed-agent surfaces without a new review. Existing Grookai
instructions and authorization boundaries remain authoritative.

The proposed all-agents rollout is documented in
`docs/plans/RUFLO_ALL_AGENTS_INTEGRATION_PLAN_20261016.md`. Its first milestone
is a read-only registry and protected-worktree inventory. It grants no cleanup,
cross-worktree mutation, workflow dispatch, production write, or external-action
authority.

Read `docs/checkpoints/RUFLO_AGENT_REGISTRY_V1_20261016.md` before changing the
agent registry or inventory builder. Phase 1 is R0-only: every discovered
worktree is protected, all agent execution and workflow dispatch are disabled,
and the generated inventory is evidence rather than runtime authority.

## Energy-name exact alias batch — October 15

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_149_ENERGY_ALIAS_BATCH.md`.
The active bounded batch contains exactly seven TCGPlayer products across Ultra
Prism and Darkness Ablaze, covering 12 missing-price observations and exact
Normal, Holo, and Reverse children. Freeze each abbreviated source name to its
exact numbered canonical energy parent. Production order is 12 truth reviews,
independent readback, two-set mapping authority, seven mappings, independent
readback, then a later full pricing shadow and publication. Do not broaden this
into a global energy-name or abbreviation normalization rule.

## Delta-species exact alias batch — October 15

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_148_DELTA_SPECIES_ALIAS_BATCH.md`.
The active bounded batch contains exactly 12 products across EX Holon Phantoms,
EX Dragon Frontiers, and POP Series 4, covering 21 missing-price observations
and 21 exact Normal/Holo/Reverse children. Freeze every product and symbolic
canonical name individually. Production order is 21 truth reviews, independent
readback, three-set mapping authority, 12 mappings, independent readback, then
a later full pricing shadow and publication. Do not broaden this into a global
Delta Species, gender-symbol, forme, or Star normalization rule.

## Nintendo Target promo exact alias batch — October 15

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_147_NINTENDO_TARGET_PROMO_ALIAS_BATCH.md`.
The next bounded pricing batch contains exactly four Nintendo Promos products:
Treecko 16, Torchic 17, Mudkip 18, and Whismur 19. TCGPlayer appends the
display-only qualifier `Target Promo`; each product otherwise has one exact
numbered canonical parent and one verified visible Normal printing. Keep the
registry product-specific and require the frozen mapping package, rollback
rehearsal, apply, independent readback, and a later full pricing shadow.

## Team Rushdown publication evidence repair — October 15

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_146_WCD_PUBLICATION_EVIDENCE_REPAIR.md`.
The first post-mapping full shadow passed globally but excluded all 24 Team
Rushdown rows because the publication query did not enrich those product IDs
with parent and truth-review columns. The active repair extends the existing
one-to-one evidence joins to all reviewed special products. Require a fresh
exact-commit full shadow in which all 24 Team Rushdown rows publish before any
production activation.

## Black and White Promos exact alias batch — October 15

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_145_BWP_ALIAS_MAPPING_BATCH.md`.
The active bounded batch contains exactly two group 1407 products: Druddigon
BW80 and Rayquaza-EX BW47. Each has exact frozen source identity, one unique
standard parent, and a Master Index verified Holo printing. The production
sequence is truth-review insertion, independent readback, exact mapping package,
mapping insertion, independent readback, then full-scope pricing shadow and
coverage verification. Ten Victory Cup products remain held because several
year, season, and placement variants collide on BW29, BW30, and BW31.

## Local Ollama pricing triage — October 15

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_144_LOCAL_OLLAMA_TRIAGE.md`.
The local `grookai-card-triage:4b` model is a 2.5 GB, loopback-only advisory
helper for blocked TCGPlayer identity rows. Calls are sequential, bounded to 100
rows, and unload after each run. Its measured 4K-context allocation is 3.2 GB.
Deterministic code removes coordinate, set,
edition, and already-mapped conflicts before inference. Every model result still
requires exact reviewed authority; it can never write mappings, publish prices,
or touch customer state. Preserve the larger installed model but do not use it
for this worker. The final enriched run preserved 125 exact set-and-number target
rows, made 86 local model calls, and emitted 86 advisory leads with zero errors
and no model left loaded. Black and White Promos is the largest 12-row lead
group; those rows still need independent reviewed authority before any mapping.

## BW11 Radiant Collection truth review and mapping — October 14

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_142_BW11_RADIANT_COLLECTION_TRUTH_REVIEW_AND_MAPPING.md`.
The completed batch contains exactly nine Legendary Treasures: Radiant Collection
Holo products. PR667 merged the bounded authority at
`4764223949c38006f7b34c279dd353c380a31f13`. Truth-review run
`01cc9291-b391-4389-add8-344b55f02c9a` inserted and read back all nine verified,
visible reviews. Mapping run `77362035-d234-436b-ab4d-09288fba3ccf` then inserted
and read back all nine exact mappings. Independent repeatable-read verification
passed for both writes. Full-scope shadow run `38631343122` is queued from the
exact merge commit and supersedes stale run `38624164995`. Inspect the shadow,
keep customer publication behind its existing gate, and continue the next
evidence-safe backlog batch.

## TCGPlayer reviewed alias wave 2 — October 14

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_141_REVIEWED_ALIAS_WAVE_2_MAPPING_BATCH.md`.
Five verified Holofoil aliases are now mapped in production: Pokémon Breeder
Full Art, Poké Kid Full Art, and the three 30th Celebration RGB Mew cards.
Canonical maintenance run `538a75b4-1f92-43cf-ac01-0ac78c37fcbd` inserted and
read back all five, and an independent repeatable-read verified the source,
mapping, parent, and printing identities. Combined full-scope shadow run
`38624164995` is queued from exact merge commit
`1da51a6dba0ab60820848e72e6b9bafb7a21ae74`. Four Nintendo promo products
remain held because multiple TCGPlayer editions compete for the same canonical
parent.

## TCGPlayer Prism Star alias wave — October 14

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_140_PRISM_STAR_ALIAS_MAPPING_BATCH.md`.
The completed bounded batch was exactly 14 Holofoil Prism Star products across
Ultra Prism, Forbidden Light, and Celestial Storm. Each frozen source name ending in
`Prism Star` maps by exact product, group, and printed coordinate to one unique
unmapped canonical parent whose Master Index name ends in `◇`, with one active
verified visible Holo child. Four Team Up and two Dragon Majesty rows remain
held because their public Holo children lack an active verified truth review.
PR662 merged at `ebe54053cecd9ca22f04fac361695febd3bb0864`; maintenance
run `afbd4a0d-e305-434b-b24a-465ca1d4d389` inserted all 14 mappings, and
independent repeatable-read verification passed. Full-scope shadow run
`38619200134` is queued at that exact commit. Mapping and customer price
publication remain separate guarded steps.

## TCGPlayer reviewed alias wave — October 14

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_139_REVIEWED_ALIAS_WAVE_MAPPING_BATCH.md`.
The active bounded batch is exactly 21 reviewed products across TCGPlayer groups
1494, 2328, and 24451: five Phantom Forces display-name aliases, eleven Lost
Thunder Prism Star/Fairy Charm aliases, and five MEP Pokemon Center stamped
promos. Each tuple freezes the raw source title and full printed coordinate to
one unique active standard parent and one selected governed child. The
read-only rehearsal produced 21 candidates covering 28 missing-price
observations and froze three Master Index scopes. PR660 merged at
`ccffdee1afd820072e020ee52a9c59d32110d1c7`; maintenance run
`227e73af-61c7-49c5-8819-12422f4e6c05` inserted all 21 mappings, and independent
repeatable-read verification passed. Its pending shadow was superseded by
combined exact-commit run `38619200134`, which includes this wave and the later
Prism Star mappings. Rows with target collisions, missing canonical cards, or
ambiguous numbers remain blocked.

## TCGPlayer Unseen Forces Unown batch — October 14

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_138_EXU_UNOWN_MAPPING_BATCH.md`.
The active bounded batch is exactly TCGPlayer products 90166 through 90193 from
group 1398: Unown `!`, `?`, and `A` through `Z`. Only the exact reviewed registry
may map them to the 28 canonical `exu` symbol-variant parents. The live read-only
authority rehearsal passed for all products, unique parents, Holo children, and
frozen Master Index evidence; apply packages are bounded to 25 and 3. Regenerate
from a clean merged commit before dry run or apply. Mapping and price publication
remain separate gates.

## TCGPlayer Classic Collection alias batch — October 14

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_137_30C_CLASSIC_ALIAS_MAPPING_BATCH.md`.
The next bounded batch is exactly products 716158 and 716198 from TCGPlayer group
24837. Their `(Team Plasma)` and `(Prime)` labels may map only through the exact
reviewed-product registry to the unique `30c-classic` Genesect EX 11/101 and
Gengar 94/102 parents. PR655 merged at `360f2c672`; maintenance run
`1c0bb37f-a618-4494-9a25-60e43126c7e0` inserted both mappings, and independent
repeatable-read verification passed. Fresh combined shadow run `38605006449`
is queued at the merge commit; keep mapping and price publication separate.

## TCGPlayer Generations Radiant Collection batch — October 14

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_136_G1_RADIANT_COLLECTION_MAPPING_BATCH.md`.
The current bounded batch is all 32 TCGPlayer group 1729 products, mapped only
through the exact checked-in registry to canonical `g1` `rc` parents. The live
read-only rehearsal produced 32 candidates and retained 702 blocked products.
The authority builder verified all source rows, parents, governed child
printings, and English Master Index evidence, then split the scope into
writer-bounded packages of 25 and 7. PR654 merged at `f96af060f`; maintenance
runs `6706995e-20c4-4ff4-bd4f-6328fa7722c6` and
`b0b88cc9-31aa-4726-a13f-82dc1a6f4231` committed all 32 mappings. Independent
repeatable-read verification passed. Pricing shadow and production publication
are still required.

## TCGPlayer SV Promo reviewed-product batch — October 14

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_135_SVP_REVIEWED_PRODUCT_MAPPING_BATCH.md`.
The next bounded batch is exactly 18 TCGPlayer group 22872 products: 17 source
names explicitly labeled Pokemon Center Exclusive plus base Charizard ex 196.
Plan policy V1.3 admits these only through the exact checked-in product registry;
all unlabeled duplicates, prerelease/staff rows, World Championship products,
and other aliases remain held. PR652 merged at `8be8ec9f9`; maintenance run
`6122d6a6-6151-400c-a190-d086c606a4ab` committed exactly 18 insert-only mappings,
and an independent repeatable-read probe verified all source rows, parents, and
printings. Mapping does not itself publish prices. Continue through the queued
pricing shadow, exact production publication, and independent price readback.

## TCGPlayer Classic Collection batch — October 14

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_134_30C_CLASSIC_MAPPING_BATCH.md`.
The first hosted run of `tcgplayer-pricing-completion-v1` succeeded and retained
its production measurement. The next reviewed group is TCGPlayer 24837 mapped to
canonical `30c-classic`. Production mapping applies
`2ddb9afa-8dab-4846-ba73-2bee69c32387` and
`3451e9fc-9005-4dd7-b68f-feffbcb42781` committed and independently verified all
28 exact rows in bounded batches of 25 and 3. Combined pricing shadow GitHub run
`38586974614` is queued behind the earlier McDonald's shadow. Do not normalize
away `(Team Plasma)` or `(Prime)`; Genesect EX and Gengar need explicit alias
adjudication before mapping.

## TCGPlayer pricing completion agent — October 14

Read `docs/checkpoints/pricing/PRICING_CHECKPOINT_133_TCGPLAYER_PRICING_COMPLETION_AGENT.md`.
The dedicated `tcgplayer-pricing-completion-v1` operations agent owns the
production pricing backlog as one continuous outcome. Every hour at minute 47 it
runs a read-only production audit, builds the Pokemon-scoped exact-mapping plan,
heartbeats its measured state into the operations control plane, and preserves
90-day evidence. A nonzero backlog is reported as incomplete work rather than an
agent crash. Only reviewed exact candidates can become the next batch; all
uncertain identities remain explicit holds. The current McDonald's 2021 mapping
batch is already in its governed shadow/publication path and must be verified
before its production result is counted. Continue with the highest-value
evidence-backed Pokemon group after that readback; do not weaken identity,
finish, freshness, or publication guards to make the totals look complete.

## Pokémon TCGPlayer identity repair — October 12

Read `docs/ops/POKEMON_TCGPLAYER_IDENTITY_REPAIR_20261012.md`. PR622 merged the
six outcome lanes and zero-backlog completion rules. Batch 01 now contains five
reviewed existing-parent mappings covering seven missing-price observations;
its first production apply rolled back with zero writes after finding inactive
legacy Duraludon mapping 132914 on the wrong GameStop-stamped parent. Founder
approved the revised four-insert/one-exact-update path, and production run
5e3762f0-be04-4a18-b08e-489b53f6189f committed all five rows from clean commit
c5f5c0fd82bbe0a2045342451223676818ac2050. Independent read-only readback passed.
No price publication occurred. Full post-mapping pricing dry-run over 208,451
observations made Duraludon 214239 publish-ready, while four Gym Challenge prices
remain held for exact First Edition/Unlimited authority and two Mega Evolution
Promo prices remain held for an exact reviewed Normal-to-holo source override.
Batch 02 now freezes those six rows into two plan-only lanes under
`docs/audits/pricing/pokemon_tcgplayer_variant_repair_20261012/batch_02`.
Verified-TLS live readback found only the ordinary Gym parents; the historical
June first-edition rows are no longer live and must not be silently resurrected.
The plan therefore requires four fresh explicit edition identities before runtime
bindings. The MEP lane binds the two existing Holo children and forbids invented
Normal printings. Pricing reconciliation and publication remain separate guarded
work; batch 02 authorizes no database or price write.
PR632 merged the MEP V3 override rehearsal as main `7719e3c09`. The next local
candidate adds a separate Gym Challenge binding, assignment, and FK lane without
widening Jungle, composes it through V4, and has a passing rollback-only four-row
schema rehearsal. The retained full-schema rollback rehearsal and combined
six-row read-only pricing evaluation remain. No Gym catalog, binding, schema, or
price write has occurred in production.
PR635 merged the Gym lane as main `b04752916`. Its production preflight found the
reviewed source-product SHA differs from the warehouse ingestion payload hash.
The V2 correction preserves the reviewed SHA as provenance and validates current
product identity by exact category/group/product/name/number while assignments
continue to roll per current source run. The revised local rollback rehearsal and
read-only production preflight pass. No production write has occurred yet.

## Collectr catalog review — October 9

Read docs/checkpoints/collectr_catalog_review_20261009.md. PR620's review guard is
live. A later source-authority audit adjudicated six duplicate provider set
families and 647 exact parent pairs: PokemonTCG coordinates are canonical while
the matching TCGdex parents and every downstream reference remain as reversible
provider lineage. Production migration 20261012010000 installed the additive
alias table/RPC; PR621 adds the web consumer and explicit authority evidence.
Fresh read-only preview resolves all 62 former catalog-conflict rows/76 copies:
56 rows/68 copies are ready and 6 rows/8 copies remain owner choices. Nothing
was imported. Preserve all 1340 saved groups, consumed receipts, private labs and
legacy references. Canonical finish evidence stays strict. Slab support remains
DEFERRED by the user and is not awaiting another question.

## Collectr exact average costs — October 8

Read docs/checkpoints/collectr_cost_precision_20261008.md. The combined local
candidate qualifies 20 additional copies across 9 rows, projecting 1640 accounted
copies and 532 review rows. Live remains PR609 at 1620/541. Parser and additive
20261008100000 writer preserve four-decimal costs; 971 importer contracts,16
staging contracts and38 DB scenarios pass. The full430 replay, populated429-to430
upgrade, no-op pushes and exact schema parity pass; all3 retained copies and old
receipts survive. Website strict build, TypeScript and lint pass. Normal hooks
and release qualification remain open. No production writes or import occurred.
Cache deletion was policy-blocked; compressing30 generated snapshots recovered
about0.9GB with every hash preserved. Keep all old and new labs; never reset the
populated upgrade lab. Startup/fixture recovery receipts preserve failed attempts.
Private collectr_cost_precision_20261008/CHECKPOINT.json owns actual status.
Keep deferred receipt delivery and the pending graded-item choice separate.

## Collectr sealed gap batch — October 7

PR609 and its four-card save are complete: 1,620 accounted copies, 541 review
rows, 1,331 source groups and 3,227 owner copies. Never replay its receipt.
Read docs/checkpoints/collectr_sealed_gap_review_20261007.md. The next local
candidate reviews 51 sealed rows/101 copies and repairs three exact product
labels/scopes. Four copies qualify; three Mew rows/six copies now correctly
reach cost review. Together with Zapdos, 16 copies require exact fractional-cent
cost support. Do not round, split costs, or bypass the SQL writer guard.
Private collectr_sealed_gap_review_20261007/CHECKPOINT.json owns current status.
No deployment, schema/catalog change or new save occurred in this batch.
The graded-item preference remains pending; preserve all retained labs.

## Collectr catalog scope review — October 7

PR608 recovery is complete; preserve 1,616 accounted copies and 543 held rows.
Read docs/checkpoints/collectr_scope_review_20261007.md. Fresh review covers all
216 set/number gap rows. The retailer candidate qualifies two source rows/four
copies using existing stamped identity and Holo evidence. Nothing is saved by
qualification. Private collectr_scope_review_20261007/CHECKPOINT.json owns actual
release/save status. Japanese candidates have no public printing options; do not
broaden aliases or revive hidden children to bypass that boundary. Keep every
saved group, consumed receipt, retained lab and the pending graded-item choice.

## Collectr mixed receipt confirmation — October 7

PR607 is live; its seven-card save is independently verified: 1,616 accounted
copies, 543 review rows. Never import again to resolve its pending confirmation.
Read docs/checkpoints/collectr_mixed_receipt_20261007.md. The new candidate binds
historical copies to owner/source mappings captured before the writer; fresh
copies remain strict. Private collectr_mixed_receipt_20261007/CHECKPOINT.json owns
actual release/recovery status. Preserve the pending browser request, all 1,329
source groups, all 3,223 owner copies and every retained lab. No schema changes.

## Collectr printed identity labels — October 7

Read docs/checkpoints/collectr_card_labels_20261007.md. Local candidate on
main4f0af6c54 resolves seven additional copies; it is not deployed or saved.
PR603's 1,609 live accounted copies and all 1,322 source groups remain unchanged.
Private collectr_card_labels_20261007/CHECKPOINT.json owns current qualification.
Preserve PR604, all consumed receipts and retained labs. Graded support remains
pending; no schema, catalog, permissions or inventory changes are included.

## Split external payments — October 6

PR604 integration preserves PR603/main ddb7c764b; split SQL/native bytes remain
unchanged. Retain signed unuploaded347 and refresh combined-source gates/hooks.
External CHECKPOINT.json owns simulator and actual deployment status.

The exact release package is428+split=429, excluding deferred receipt delivery;
all430 source migrations remain. Read the new SalesSplitPaymentsReleaseV1 gate
and external Release-* receipts. Fresh3290x/3292x labs and every old lab are
retained. Do not apply receipt429 or reuse consumed intents to close a gap.

Candidate: C:/gv_sales_split_payments_20261006, base main04980f98d. Read
docs/ops/SALES_SPLIT_PAYMENTS_20261006.md and the SALES_SPLIT_PAYMENTS_V1 contract.
Desktop/native split payments, cash change, receipt breakdown and tender reports
use an additive default-off v3 writer. Existing v1/v2 writers remain unchanged.
External sales_split_payments_20261006/CHECKPOINT.json owns proof/release state.
Local430 replay/upgrade includes deferred receipt429; it is not authority to
apply receipt delivery remotely. Preserve production428, prior web/TestFlight346,
receipt sender deferral, catalog work and every retained lab/upload intent.

## Collectr remaining card review — October 6

PR603 and its 19-copy incremental save are complete: 1,609 accounted copies,
550 review rows. Read docs/checkpoints/collectr_card_review_20261006.md and private
collectr_card_review_20261006/CHECKPOINT.json. All remaining rows are classified;
graded-item handling awaits the user's preference. No product/schema change
belongs to this review. Preserve all 1,322 source groups and consumed receipts;
do not infer missing catalog data solely from an unresolved English set label.

## Collectr sealed product labels — October 6

Read docs/checkpoints/collectr_sealed_product_labels_20261006.md. PR601 is live;
its 1,590 accounted copies and 562 remaining rows are verified. Do not replay
its imports. The new main04980f98d-based candidate adds four exact scoped labels,
qualifying 12 rows / 19 copies locally. Private collectr_sealed_labels_20261006/
CHECKPOINT.json owns actual release state. Preserve all previous mappings,
PR602 language-index work and populated labs. No schema or permission changes.

## Collectr preview catalog timeout — October 6

Read docs/checkpoints/collectr_preview_catalog_timeout_20261006.md. The USD import
and receipt recovery are complete; never replay them. New source-only preview
work bounds catalog reads by set, preserves exact choices and avoids redundant
identity reads. Actual measurement/release state belongs to the private
collectr_remaining_review_20261006/CHECKPOINT.json. The added cost-padding repair
qualifies 16 rows / 50 sealed copies without rounding. Their actual save/release
status belongs to private cost-padding receipts, not source-only qualification.
Preserve PR600 Sales Desk work and all prior import mappings. No schema changes.

## Refined Sales Desk — October 5

Active candidate: C:/gv_sales_desk_refined_20261005, based on main b5444e82f
with receipt candidate103c1838 integrated. Read docs/ops/SALES_DESK_REFINED_20261005.md
and docs/contracts/SALES_DESK_REFINED_V1.md. Desktop/native held carts, continuous
stock/catalog/trade entry, customer view and desktop reporting are local candidates.
The external sales_desk_refined_20261005/CHECKPOINT.json records actual checks.
Preserve receipt PR598, signed unuploaded iOS345 and live TestFlight344. Sender
setup remains deferred; no production mutation, actual message or upload is implied.
Do not reset retained labs, replay migration/upload intents or edit repair trees.

## Receipt delivery release preparation — October 5

PR598 has complete local application proof against main62d287019 and schema429.
The new `ReceiptDeliveryReleaseV1` gate permits only the exact receipt migration
20261005150000 over production428. It rereads both retained labs, receipt/copy
fixtures and production schema without resetting or applying anything. PrePush
also requires clean committed source, current-main ancestry and fresh normal hooks.
The fixed CLI inspection package supports preparation and dry-run only. Sending
remains off; sender setup and authorized real delivery proof are still pending.
Read external receipt_delivery_20261005/CHECKPOINT.json for actual outcomes.
Do not replay previous fast-entry, Collectr, migration or native upload intents.

## Receipt delivery combined integration — October 5

PR598 source is being integrated with PR597/main62d287019. The Collectr release
receipt reports production428; verify fresh baseline before receipt schema work.
The combined receipt candidate is429 on fresh full/upgrade3270x/3272x labs.
Earlier428 receipt labs and all Collectr fixtures are retained and must not reset.
Receipt product/SQL bytes stay unchanged; only proof routing and integration change.
External receipt_delivery_20261005/CHECKPOINT.json owns current proof/release state.
Sending remains disabled; no receipt migration or sender activation in production.

## Direct receipt delivery — October 5, 2026

Read docs/ops/RECEIPT_DELIVERY_20261005.md and its contract. PR595 is merged;
TestFlight344 is live to the existing internal group. New candidate is isolated in
C:/gv_receipt_delivery_20261005. Additive428 is local-only, sending switches OFF.
External receipt_delivery_20261005 checkpoint owns proof and release state.
Use only dedicated654xx labs; preserve all populated prior labs/catalog work.
Sender accounts/configuration and actual authorized delivery proof are pending.
Do not replay consumed native344 or merge595 intents.

## Collectr USD import and receipt recovery — October 6 UTC

Read docs/checkpoints/collectr_receipt_recovery_20261006.md. The real import is
saved and independently verified: 165 sealed additions, 1,540 accounted copies,
578 review rows. Preserve the original pending browser request; do not import
again. A pre-existing printing edit prevents the browser's old confirmation
check from accepting its successful receipt. Candidate recovery verifies the
immutable original group and preserves the current card. No schema/data writes.
Actual release/recovery status belongs to private collectr_sealed_save_20261005/
usd-original-import receipts; earlier currency and release blockers are historical.

## Collectr sealed live-release continuation — October 5

Release source now includes PR595/main a186a9bb2 (native Sales desk fast entry)
and PR596 (language index reports). Neither changes the sealed importer or SQL.
All implementation/migration hashes remain bound to WEB_CHECKPOINT_V2.json;
normal full hooks qualify the final combined source. Production baseline is427;
only the sealed migration advances it to428. Preserve the newer sales release.

Private `collectr_sealed_save_20261005/live-release-complete.json` records actual
deployment when it exists; absence means release is not complete. Producer,
schema-readback and live owner UI receipts record intermediate outcomes. Keep
RELEASE_CHECKPOINT.json as the historical preparation receipt. Original-file
save still requires purchase currency and separate added/reused/held readback.


## Collectr sealed combined release — October 5 UTC

Normal-hook commit b8274c9cc passed, then the final fetch found PR594/main499208eab
and its already-LIVE sales trade-in migration427/TestFlight343. The branch is
being integrated with that main; preserve the completed trade release. Sealed SQL
bytes are unchanged. The current candidate is428, with fresh full/upgrade labs
on5872x/5874x and internal10.245.140/141. Old427 proofs/package remain historical.
Use WEB_CHECKPOINT_V2.json and RELEASE_CHECKPOINT.json in the private sealed
artifact directory for actual qualification/commit/dry-run outcomes. The current
strict sealed gate requires the live427 baseline; never reuse the old426 gate.


## Collectr sealed release preparation — October 5 UTC

Current main82dcfa714 matches the tested candidate baseline. Sealed V3 website
implementation remains default-off. The exact426-to427 release gate and readonly
CLI package preparation are now in source; see the migration maintenance contract.
Private `collectr_sealed_save_20261005/RELEASE_CHECKPOINT.json` records actual
normal-hook, source commit, gate and dry-run outcomes when preparation finishes.
Do not infer deployment or a real import from source alone. Preserve every
populated lab and all1375 accounted real copies; never replay consumed intents.


## Collectr sealed website integration — October 5 UTC

Same feature branch/worktree. Website V3 preview/save/recovery is now implemented,
default-off via server GV_COLLECTR_SEALED_IMPORT_V3=1. Existing V2 attempts remain
supported; native stays V2. Read the latest top checkpoint/contract. 555 focused
contracts, 16 staging contracts and 9 real HTTP/browser scenarios pass, including
concurrency, incremental V2→V3 and interrupted mobile reload recovery. Final local
evidence is collectr_sealed_save_20261005/WEB_CHECKPOINT.json. No production writes,
deployment or real import. Next is current-main reconciliation and release gates.
Preserve all source groups, 1,375 accounted real copies and populated 427 labs.

## Collectr sealed atomic backend — October 5 UTC

Continue in C:/gv_collectr_adventure_20261001 on feature/collectr-sealed-planner-20261004.
Read the new top section of docs/checkpoints/collectr_sealed_planner_20261004.md
and the sealed import contract. Candidate V3 metadata/targets/receipt recovery,
atomic mixed writer and sealed readback are implemented; 478 contracts and 22 SQL
checks pass locally. Routes still use V2. No release or real import occurred.
Final migration replay/upgrade authority is private collectr_sealed_save_20261005/
CHECKPOINT.json, not the older first replay. Keep all labs/receipts and 1,375 real
accounted copies intact. Next is website integration and HTTP/concurrency proof.
Purchase-cost currency needs an explicit choice; never silently default to USD.

## Collectr sealed identity planner — October 4

PR592 is live and the Surge Foil import is verified: 1,375 accounted copies,
678 held rows. Read `docs/checkpoints/collectr_sealed_planner_20261004.md` and
`docs/contracts/COLLECTR_SEALED_IMPORT_V1.md`. The current branch implements an
offline exact sealed-identity planner only; it does not save or deploy sealed
imports. Production is426. Preserve all old groups, copies, receipts and labs.
Next is atomic sealed source/group/copy persistence, not per-product Add loops.
Private source-bound qualification is under `collectr_sealed_planner_20261004`.

## Sales desk fast entry — October 5, 2026

Read docs/ops/SALES_FAST_ENTRY_20261005.md and its contract. Prior trade-ins are
LIVE at production427/TestFlight343; their consumed release intents stay closed.
New native-only candidate is C:/gv_sales_fast_entry_20261005 from main499208eab.
External sales_fast_entry_20261005 checkpoint owns proof/release status. No schema
or production mutation in this batch. Preserve all catalog work and retained labs;
native proof uses synthetic fixtures on the dedicated full427/653xx lab without reset.
Direct receipt delivery still needs provider configuration; existing buttons compose drafts.

## Checkout trade-ins — October 3, 2026

Read docs/ops/SALES_TRADE_INS_20261003.md and its contract. Docker recovery was
explicitly authorized and completed October4. Current main82dcfa714 and production426
include the Jungle work; trade-ins are now additive427/default-off in
C:/gv_sales_trade_ins_20261003. New full/upgrade427 V2 labs use653xx. Preserve the
completed historical418/652xx replay and all other retained labs. Sales desk's
last native release is TestFlight342. Database proofs must follow the external
checkpoint; preserve Windows PostgreSQL and retained volumes. Preserve all prior proofs, Mac
archives, catalog and checkout work. External sales_trade_ins_20261003 checkpoint
is authoritative for tests/release; do not replay completed intents.
PR594 is the draft trade candidate. Mac Homebrew Flutter stalls before startup;
the existing official ~/flutter-3.44.9 checkout at the same framework revision
works. Native V2 uses a fresh synthetic fixture and final native sources in
~/grookai_sales_trade_native_v2_20261004. Forward both65301 (Auth/RPC) and65310
(real local web resolver) for the native journey. Keep original failed logs.

## Jungle discovery projection correction — October 4

Read the first Jungle projection section of docs/ops/JUNGLE_EDITION_PRICING_20261001.md.
PR587 is merged and all eight migrations are LIVE at425. Do not replay them.
Strict readback exposed SELECT-star view column-order drift; the additive426
correction is in C:/gv_jungle_edition_20261001 on fix/jungle-discovery-projection-20261004.
New full/retained426 proofs use542xx only; all prior populated labs are retained.
Existing records are verified unchanged. New prices/catalog remain inactive.
The worker recovery checkpoint and projection-v37 artifacts record actual release state.

## Collectr review coverage — October 4

PR589 is live and its real incremental import is verified: 1,361 accounted copies,
692 held rows. Read `docs/checkpoints/collectr_review_coverage_20261004.md`.
Current branch `fix/collectr-review-coverage-20261004` adds catalog-evidenced MTG
Surge Foil matching; it is not deployed. Keep the 417-migration production state,
all previous copy mappings, and retained410 lab intact. Use the explicit
`GV_COLLECTR_SURGE_HTTP_PROOF=1` for local proof. Private receipts are under
`collectr_review_coverage_20261004`; never replay earlier release/import intents.

## Collectr name fidelity — October 3

The original real import is verified in the private `collectr_real_import_20261003`
receipt: 1,342 added copies, one reused, 706 review rows retained. The next isolated
candidate is `fix/collectr-name-fidelity-20261003` in
`C:/gv_collectr_adventure_20261001`; read
`docs/checkpoints/collectr_name_fidelity_20261003.md`. Local formatting repair
resolves 14 more rows / 18 copies without changing prior selections. It is not live.
The explicit name-fidelity HTTP proof flag extends the retained410 lab, never a
production backend. Preserve real import mappings and all prior release receipts.

## Sales desk workflow and dashboard — October 3, 2026

Read docs/ops/SALES_DESK_PRO_20261003.md and its contract. Prior cart release is LIVE
at production416/TestFlight341; its external release checkpoint supersedes the
historical local-only notes below. New work is isolated in
C:/gv_sales_desk_pro_20261003: drag/drop, exact canonical quick-add with durable
request recovery, and in-person receipt reporting. New417 schema has local proof
only until direct release readback. Use task-owned650xx labs, preserve648xx and
all catalog/checkout work. Never replay old migration/activation/upload intents.


## iPad in-person sales cart — October 3, 2026

Read docs/ops/IPAD_SALES_CART_20261003.md and its contract. Current candidate is
C:/gv_ipad_sales_cart_20261003; production remains415. New416 cart schema is
local-only/default-off. Exact-copy cart completion reuses the existing disposition
writer atomically with the account receipt book; quick-add creates receipt lines,
not inventory. Preserve the separate checkout and active catalog repair work.
Only task-owned648xx labs may be used; never reset populated fixtures. External
ipad_sales_cart_20261003 checkpoints distinguish implementation, proof and release.

## Recorded-sale receipt flow — October 3, 2026

Account receipts are LIVE from PR582/main7a53b16a1 with415migrations.
Do not replay its migration or activation; its external release-checkpoint.json
is authoritative. Follow-up source is C:/gv_receipt_sale_flow_20261003.
Read docs/ops/RECEIPT_SALE_FLOW_20261003.md. Web-only sale-to-receipt navigation
and owner-scoped prefill; no schema/inventory/payment changes. Preserve the
separate checkout candidate and active catalog agent. Local proof reuses only
our retained647xx receipt lab without reset. Future status is in the external
receipt_sale_flow_20261003 checkpoint. Historical sections below remain receipts.

## Account receipt cloud — October 2, 2026

The device receipt desk is LIVE from PR580 (8dffbf8a). Its terminal receipt is
C:/grookai_vault_operator_artifacts/vendor_receipts_20261002/release-checkpoint.json.
Continue cloud work only in C:/gv_vendor_receipt_cloud_20261002. Read
docs/ops/VENDOR_RECEIPT_CLOUD_20261002.md and its contract. One account-owned book,
immutable manual receipts, explicit backup import and optimistic revisions.
Cloud candidate is NOT deployed; rollout defaults OFF. Keep checkout and catalog
repair work separate. Dedicated V3 full/upgrade labs use647xx; preserve V1/V2 evidence.
Never use SQLSTATE40001 for application conflicts: actual PostgREST HTTP proof
exposed automatic retry loops. V2 uses PT409 and preserves drafts on conflict.


## Immediate in-person receipts — October 2, 2026

The user prioritized receipts for sales today. Current receipt work is isolated in
C:/gv_vendor_receipts_20261002, feature/vendor-receipts-20261002, from main
7e938b945dbb6f3f0af199005f5cf2570bc57f18 (414 migrations). No schema change.
The standalone Grookai-Receipt-Desk.html is verified and copied to the user's
Windows Desktop. Read docs/ops/VENDOR_RECEIPT_DESK_20261002.md in that worktree.
It provides device-local receipts/customer records, print/download/share, email
and SMS draft launch, and backup/restore. It is NOT cloud CRM, inventory mutation,
provider-confirmed messaging or an online-payment receipt. User sends drafts.
Website route /account/store/receipts is implemented but not deployed. Source-sale
prefill is authenticated and owner-scoped. Production and payments unchanged.

21 unit contracts, desktop/mobile browser workflows, TypeScript, lint and strict
Next build pass. Authenticated website proof also passes against the isolated
local lab: owner-only source prefill, account isolation and unchanged source sale.
Main6363e12 was reconciled; normal commit/push and hosted release remain pending. Browser tool
policy blocked opening local HTML automatically; no workaround attempted. User
can open the Desktop file manually. No messages or actual sales were submitted.

Next receipt work: durable cloud customer/receipt storage, correction/history,
staff permissions, configured email/SMS delivery with tracked attempts, and web
release qualification. Original notification/release work remains in
C:/gv_store_reconcile_414_20261001 with its order-status checkpoint preserved.


## Existing live seller connection — September 28

PR540 review hardening supersedes the original409 proof bytes. Production remains
408. Read the first checkpoint section; use seller-adoption-v2 artifacts and fresh
310xx/314xx labs. Never replay the preparedV1 production package. Expired approvals
now have explicit retained-history replacement; revoked grants cannot reactivate.

Read `docs/ops/VENDOR_SELLER_LINK_20260928.md` and
`docs/contracts/VENDOR_SELLER_ADOPTION_V1.md`. This is the current-main seller-link
candidate; preserve the separate dirty cart/commission tree. The existing real
seller must be adopted through explicit provenance, never fake creation recovery.
Production is408 with no seller binding or live payment configuration. Platform
login and four live Stripe GETs are now verified; the seller controller matches
the candidate and its confirmed email matches the store owner. The restricted
verification key is encrypted outside the repo; it is not a runtime checkout key.
Docker became available without restarting shared services. Dedicated Supabase17
409 replay and408-to409 retained-data upgrade pass, as do real Auth, Next route,
cookie-authenticated page and signed webhook checks. Preserve the populated302xx
and306xx labs and consumed intents. These checks are not release authority;
checkout remains off.

## Store inventory manual sales — September 27

Read `docs/ops/STORE_WEB_SOLD_20260927.md`. The owner store inventory now exposes
the existing exact-copy sale writer inline. No new schema, payment activation,
manager permission or custom-product stock writer belongs to this fix. Manual
receipts remain owner assertions. Preserve other checkouts and release intents.

## Store manager workflows — September 27

The manager release521 is complete/live at404; external STORE_TEAM_CHECKPOINT.md
is authoritative for that completed release. The next isolated branch extends
opt-in intake, sections and custom products. Read
docs/ops/STORE_TEAM_WORKFLOWS_20260927.md. Preserve existing grants and actor
identity; no owner impersonation, automatic staff grants or payment activation.
PR523 review adds406 reserved-name/rollback hardening;405 is immutable. Use the
review-specific406 replay/runtime/HTTP helpers and the two-ID release gate from
the workflow operator note. Prior replay/apply intents must not be reused.

## Store team permissions — September 27

Latest:403 is applied with team OFF. PR521 review requires additive404 manager
upload/audit hardening; read the first checkpoint section and external live state.
Do not replay403 or activate the old source. Dedicated294xx replay is advancing
with a fresh hardening intent while all previous evidence remains preserved.

Read `docs/ops/STORE_TEAM_CHECKPOINT_20260927.md` and
`docs/contracts/VENDOR_STORE_TEAM_V1.md`. The owner requested selectable manager
permissions. Work is isolated on `feature/store-team-permissions-20260927`.
The294xx lab has full404 replay and real role/Auth/Storage proof. Team rollout
is off; production403 is verified and404/release remain pending. No real staff
invitation has been created. Preserve prior production and290xx receipts;
never replay consumed local reset intents or impersonate an owner.

## Store sharing — September 26

PR519 is merged and live. Current follow-up is public sharing on
`fix/storefront-public-share-20260926`; read the first update in
`docs/ops/STOREFRONT_PRODUCTION_20260926.md`. Public links must use the canonical
site origin and omit owner-preview parameters. Preserve publication checks and
the owner's saved listings; no production data/configuration changes are needed.

## Production storefront integration — September 26

PR518 is merged and deployed. Current follow-up is the Add to store listing-action
UX fix on `fix/storefront-listing-action-20260926`. Read the latest checkpoint
section before work; existing production activation intents must not be replayed.

User authorized connecting the storefront to the real database. Read
`docs/ops/STOREFRONT_PRODUCTION_20260926.md` before continuing. This is an isolated
current-main branch. The consolidated production migration is now applied and
verified (402 versions, including invitation trials); existing data is retained.
Browse-only rollout is enabled for explicit grants/invitations; payments remain off.
The 419 development inputs are archived, not active.
Full package replay, integrated intake, shared quota/trial tests and normal shipcheck
pass. The complete private scan cache is verified. V4 fixes excluded API routes;
it is LIVE on grookaivault.com after hosted and browser proof. PR518 carries the
source integration; inspect its current state and the latest checkpoint.
Read the latest continuation update before any further action.
Do not replay consumed apply/reset intents, repoint the pilot, reset shared
services or weaken guards. Payments and native store releases remain separate.
Keep newer main, dirty storefront source and paused catalog repair evidence intact.

## Japanese Source Semantics Prevention - September 19

Read `docs/ops/JAPANESE_SOURCE_SEMANTICS_PREVENTION_RELEASE_20260919.md`.
This isolated branch carries source parsing, printed-coordinate, overlap and
multipart prevention fixes. It contains no production repair payload or apply.
Historical artifacts and approvals must not be replayed with changed semantics.
The active database repair checkpoint is outside the repo at
C:/grookai_vault_operator_artifacts/master_index_executor_review_20260917/CHECKPOINT.md.
V78 remains the latest completed database repair. Keep runtime deployment proof
separate from tests/merge, and preserve the dirty Japanese implementation worktree.

## One Piece Master-First Admission Release - September 19

Read `docs/ops/ONE_PIECE_INCREMENTAL_PRINTING_PREVENTION_20260919.md`.
This isolated release includes source-bound child printings and reviews in the
same transaction as new One Piece parents, with versioned phone outcome counts.
Unresolved evidence remains held. No deployment or fresh catalog apply is proved
by local tests. Preserve historical V1 packages; never run them as a V2 payload.
The included Foil-scope migration is already applied; do not replay it.
Japanese repairs remain in their existing worktree, outside this release.

Production repair queue V75 records 352 completed Prismatic provenance repairs;
English missing provenance is 1,459. Do not replay completed repair writers.

## Prismatic Finish Evidence - September 19

Read `docs/ops/PRISMATIC_MASTER_CORROBORATION_20260919.md`. This branch applies
an additive 162-fact master-evidence refresh to merged main without changing
card identities, finishes or production data. The captured source, parser fix,
and regressions travel together. Five unmatched names remain unresolved.
Keep Japanese and One Piece work in their existing worktree; this is not their
deployment. Production queue V74 and the 1,811 remaining English provenance
gaps are recorded in the operator checkpoint; do not replay completed writers.

## Collector Printing Readback - September 18

Read `docs/ops/COLLECTOR_PRINTING_READBACK_20260918.md`. Anthology membership
counts must not fill missing card denominators; exact GV-IDs must survive
search parsing intact. This is a web-only repair, not permission to replay
completed database repairs. Keep local tests, deployment and live proof distinct.

## Master Index Source Independence - September 17

Read `docs/ops/MASTER_INDEX_SOURCE_INDEPENDENCE_20260917.md`. Catalog mirrors
are not independent finish votes. Preserve raw provenance and do not replay
superseded historical finish candidates. The current index already replaced
four MEP generic Holo claims with Cosmos and removed Lugia ex's old Normal claim.
Source-status corrections are not production mutation authority.
Prize Pack finish evidence also remains variant-scoped review material; it cannot
prove an unstamped Normal/Holo/Cosmos option. Historical/source-outage carry-forward
retains those records without restoring their old verified status.

## Legacy Set SQL Review - September 17

Read `docs/ops/LEGACY_SET_SQL_REVIEW_CHECKPOINT_20260917.md`. The set repair and
TCGdex canonization tools now admit one bounded evidence-only scope, not their
historical SQL apply paths. Even old dry-run checkpoint writes are unreachable.
Retain source payloads and explicit truncation; a successful review is not
printing completeness or production authority. Runtime deployment remains open.

## Legacy Pokemon Admission - September 17

Read `docs/ops/POKEMON_LEGACY_ADMISSION_CHECKPOINT_20260917.md`. Legacy enrichment,
mapping backfill and TCGdex normalization admit bounded review-only runs. The old
PokemonAPI normalizer, remote import chain and new-set apply are retired. This
closes unsafe entry paths in code, not deployed runtime or catalog completeness.
Do not restart historical applies; preserve source bytes for reviewed execution.

## Source-Backed JustTCG Boundary - September 17

Read `docs/ops/SOURCE_BACKED_MAPPING_REVIEW_CHECKPOINT_20260917.md`. The legacy
source-backed writer is review-only; ten historical Prize Pack batch entry
points are retired before mutation. Preserve old approvals as history, not
reusable authority. Fresh stamped mappings need reviewed Master Index evidence
and a separate bounded executor. Local changes do not prove deployed closure.

## Legacy JustTCG Mapping Review - September 17

Read `docs/ops/JUSTTCG_MAPPING_REVIEW_CHECKPOINT_20260917.md`. Three legacy
JustTCG discovery scripts no longer write mappings or auto-align set mappings.
Provider agreement stays review-only; existing matches are not identity proof.
The separate source-backed JustTCG writer and runtime deployment remain open.
Preserve the frozen McDonald's production apply boundary.

## Master Mapping Evidence - September 17

Read `docs/ops/MASTER_MAPPING_AUTHORITY_CHECKPOINT_20260917.md`. The local
candidate requires reviewed Master Index mapping evidence before the bounded
writer connects. Packaging is offline and does not create reviews or execution
authority. Local dry-run, frozen apply/readback and lost-commit-response proof
pass. Preserve the receipts; release checks and remote TLS/runtime verification
remain before deployment. Do not repeat completed local applies as pending work.
Preserve the separate frozen McDonald's executor and existing data identities.

## Legacy TCGdex Mapping Boundary - September 17

Read `docs/ops/TCGDEX_MAPPING_REVIEW_CHECKPOINT_20260917.md`. The legacy bridge
is now a read-only evidence collector; direct apply is retired. Its product-ID
agreement and existing mapping rows do not prove printing identity. Use reviewed
Master Index evidence and the existing bounded mapping executor, not this report,
for future writes. Integration is not deployed runtime enforcement.

## Exact Mapping Identity Preservation - September 17

Read `docs/ops/EXACT_MAPPING_IDENTITY_CHECKPOINT_20260917.md`. The isolated
mapping repair preserves source treatment labels and checks frozen set identity
before writes. Old V1.1 plans require regeneration; do not modify their hashes
or replay old applies. Historical label differences are review leads, not proof
that existing mappings are wrong. No production records were changed here.

## Warehouse Printing Authority - September 17

Read `docs/ops/WAREHOUSE_PRINTING_AUTHORITY_CHECKPOINT_20260917.md`. The source
denial repair is verified live; its read-only workflow is terminal with catalog
publication findings. Isolated admission and full staging/claim/event execution
now pass, including competing workers, lost commit responses and alias/image
rollback checks. Release and production queue checks remain pending.
Do not claim the production bypass closed.
Preserve the separate frozen McDonald's production executor and approval boundary.

## Bounded Master Printing Executor - September 17

Read `docs/ops/MASTER_PRINTING_EXECUTOR_CHECKPOINT_20260917.md` for the first
complete local raw-evidence/printing/review transaction proof. This isolated
executor has not repaired production. PRs #474 and #476 are merged. Preserve
the local rehearsal receipts. Read-only audit `35188899452` verified Pokemon
inclusion and issue reporting but failed source discovery; it is terminal.

## Catalog Source Access Repair - September 17

Read `docs/ops/CATALOG_SOURCE_ACCESS_CHECKPOINT_20260917.md`. This isolated
repair keeps a source HTTP 403 from aborting unrelated discovery while retaining
an explicit access-denied alert. It does not bypass the source or write catalog
data. Preserve the separate Master Index executor branch and its frozen plan.

## Printing Completeness Repair - September 17

Start with `docs/ops/MASTER_INDEX_TOP_DOWN_REPAIR_CHECKPOINT_20260917.md` for
the current Master Index authority contract, source-bound reconciler and first
reviewed McDonald's scope. This is local preparation, not a database-wide repair
or deployed guard. Existing production IDs and ownership must be preserved.

Read `docs/ops/INGESTION_PRINTING_GATE_CHECKPOINT_20260917.md` and
`docs/contracts/INGESTION_PRINTING_COMPLETENESS_V1.md` for the current isolated
ingestion repair. No new production apply is part of this change. Preserve the
completed anniversary Holo repair and all unrelated worktrees.

## Native Anniversary Release - September 16

Read `docs/ops/NATIVE_ANNIVERSARY_RELEASE_20260916.md` first. This branch
integrates the Samsung-verified native cover fix onto current main for the
existing TestFlight audience. Preserve all Mac checkouts and prior archives.
No database/Storage writes or public App Store submission belong to this step.

## Anniversary Sealed Intake - September 16

Read `docs/ops/ANNIVERSARY_SEALED_CHECKPOINT_20260916.md` first on this branch.
Read `docs/contracts/POKEMON_SEALED_ADDITIVE_CATALOG_V1.md` before the new
manifest-bound executor. Preparation is not a deployed catalog expansion.
Preserve the live Pokemon catalog, existing mappings and
all other games. Do not run the original hidden-lane writer or replace the
active catalog with the nine-product candidate release.

## Active Market Health Read Repair

Read `docs/ops/MARKET_HEALTH_READ_REPAIR_20260916.md`. Health-reader repair only;
preserve the completed publication and failed wrapper evidence. No ingestion,
publication, canonical data, migration, or separate MEE runtime changes.

## Verified Catalog Image Delivery

Read `docs/ops/VERIFIED_CATALOG_IMAGE_DELIVERY_20260916.md` first on this branch.
This is an isolated read-path repair for already-published 30th Celebration
images. Do not repeat catalog/Storage applies or import the dirty intake tree.

## Active Market Activation Repair

Read `docs/ops/MARKET_ACTIVATION_GUARD_REPAIR_20260915.md` first in this worktree.
This isolated branch repairs the pricing coverage query only. Production reads
are diagnostic; no deployment or publication has occurred. Keep the catalog
client candidate separate and preserve the failed producer's frozen provenance.

## Current Catalog Latency Follow-up

Numeric pagination is live at main `e986e10eee8b8c917ae646f37a11a20536a259c9`.
Read `docs/ops/CATALOG_PAGE_READ_LATENCY_CHECKPOINT_20260913.md` for the next
bounded read optimization. Preserve the exact-set index and caller visibility;
only independent metadata/printing reads may overlap. Completed release receipts:
`C:/grookai_vault_operator_artifacts/catalog_numeric_pagination_20260913/CHECKPOINT.md`.

## Current Catalog Follow-up

The September 13 presentation release is live at main `494c8626830514c278eedcdb7133575244824627`.
The eight M6 exceptions are complete; M4/M5/M6 have 351/351 hosted images.
Do not repeat completed Storage or pointer operations. Full receipts:
`C:/grookai_vault_operator_artifacts/catalog_presentation_20260913/CHECKPOINT.md`.
The next isolated code repair is natural numeric set pagination; read
`docs/contracts/CATALOG_NUMERIC_PAGINATION_V1.md` and
`docs/ops/CATALOG_NUMERIC_PAGINATION_CHECKPOINT_20260913.md`.

## Catalog Presentation Release - September 13, 2026

Read `docs/ops/CATALOG_PRESENTATION_RELEASE_CHECKPOINT_20260913.md` first.
This clean candidate preserves the original presentation tree and current main.
It contains display/cover repairs only, no image/identity mutation executor.
The completed 343 recent Japanese image pointers must not be repeated. The eight
remaining source exceptions are prepared separately, not included in this release.

## Current Collector Rollout Follow-up

The MTG scheduled refresh is enabled and verified. The collector deployment was
temporarily promoted, then rolled back after its signed-in smoke exposed the
legacy recent-activity timeout also present on the original website. Read
`docs/ops/COLLECTOR_WEB_PRODUCTION_RELEASE_CHECKPOINT_20260912.md` before resuming.
Only a bounded authenticated card-activity read repair is in progress; do not
repeat migrations, pricing publication, or expand production permissions.

## Active Backend Repair

The founder subsequently requested fixing both release blockers. Read
`docs/contracts/COLLECTOR_BACKEND_RELEASE_REPAIR_V1.md` and
`docs/ops/COLLECTOR_BACKEND_REPAIR_CHECKPOINT_20260912.md`. This extends the
website-only scope to these two backend repairs, not to bypassing migration,
producer-freeze or production-apply gates. Preserve the staged approved design.

## Collector Production Release Candidate

Read `docs/contracts/COLLECTOR_WEB_PRODUCTION_RELEASE_V1.md`. This separate release
tree preserves both live and the approved staging source. The founder authorized
production verification and a conditional website switch only after every critical
gate passes. No schema/data migration or operational worker changes. Keep testing
writes isolated; do not route a dev/staging app to production. Record results in
`docs/ops/COLLECTOR_WEB_PRODUCTION_RELEASE_CHECKPOINT_20260912.md`.

Read this file before operating in this repository.

## Required Reading

1. `docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md`
2. `docs/GROOKAI_RULEBOOK.md`
3. The current checkpoint and contract for the domain being changed.

The operator playbook is the durable map for accounts, consoles, worktrees,
devices, releases, database safety, pricing operations, and verification.

## Non-Negotiable Start Rule

Before asking the founder to repeat setup or provide access, inspect what is
already available:

- repository files, status artifacts, and current checkpoints;
- the active git branch, worktree, and remote state;
- existing signed-in browser profiles and open console tabs;
- connected Android devices and emulators;
- the configured Mac/Tailscale route for iOS work;
- existing non-secret environment-variable names and automation scripts.

A failed route, signed-out tab, wrong browser profile, missing device in one
tool, or stale checkpoint is not proof that access or setup does not exist.
Verify through a second authoritative path before asking the founder.

## Safety Boundary

- Never expose or commit secrets, review credentials, personal identifiers, or
  private keys.
- Never create a duplicate store account, app, canonical record, or remote
  resource because an existing one was not found on the first attempt.
- Never mutate production data or schema without following the governing
  migration/apply contract and its approval boundary.
- Never submit a store release, accept legal terms, publish publicly, or change
  account permissions without explicit authorization for that external action.
- Never treat a saved draft, uploaded build, prepared asset, or repository
  configuration as proof that an external console accepted it.

## Completion Rule

Finish work with direct readback, update the current status/checkpoint, run the
relevant tests, and report remaining external gates precisely. Do not make the
founder reconstruct state from chat history.

## Living-Documentation Rule

When work introduces or materially changes a recurring process, account,
console, remote-access route, device workflow, worker, deployment path, release
gate, or source-of-truth artifact, update
`docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md` in the same change. Do not leave new
operational knowledge only in chat, an unindexed audit, or personal memory.
