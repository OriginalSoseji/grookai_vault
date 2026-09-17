# Master Index Source Independence

Date: 2026-09-17.
Status: Local source-policy repair with offline replay; production data unchanged.

## Finding And Repair

The classifier and strict guard counted distinct URL hostnames as independent
authorities. Sneasel MEP 020 Cosmos had two records, but both were TCGplayer
catalog channels: product 664055 and a TCGplayer Pro storefront for that product.
That does not establish two independent finish confirmations.

TCGplayer, its API/Pro subdomains, TCGCSV and the exact preserved
`prices.pokemontcg.io/tcgplayer/` path now share the authority key
`tcgplayer.com`. Match exact domains and domain suffix boundaries, not arbitrary
substrings or caller-supplied authority fields. Keep both original source URLs,
source keys and snapshot references. A single supported claim remains recorded;
it no longer satisfies the two-authority `master_verified` threshold alone.

This is a bounded known-channel rule, not proof that every other retailer or
aggregator is independent. Do not infer finish completeness from source counts.

Primary references inspected September 17:

- https://help.tcgplayer.com/hc/en-us/articles/201574827-How-do-I-list-individual-products
  describes the catalog and its Marketplace/Pro inventory channels.
- https://tcgcsv.com/ describes its TCGplayer API product-data origin.

## Offline Replay

Inputs are hashed in the immutable operator report:
`C:/grookai_vault_operator_artifacts/tcgdex_mapping_review_20260917/source-authority-offline-replay-v2.json`.
V1 is preserved as the narrower pre-review result, not current coverage.

- 40,656 current English Master Index printing rows inspected; zero without
  evidence references. 23,646 rows change only the authority label; 551 lose a
  duplicate authority vote. Only Sneasel falls below two authorities. Ordinary
  `api.pokemontcg.io` identity evidence remains separate; other price endpoints
  and lookalike hosts/paths are not folded into TCGplayer.
- Sneasel retains its Cosmos evidence, but needs independent corroboration for
  two-authority verification. No source bytes or persisted index rows were edited.
- Reconciled all 33 historical candidates against the active index. Twenty-eight
  remain index candidates, not apply authority. Five historical assertions are
  absent from the current index and must not be inserted from the older snapshot:
  MEP 018-021 generic Holo, and Prismatic Evolutions Lugia ex 082 Normal.
- The active MEP claims are already Cosmos. Lugia's active claims are Holo and
  Stamped; their presence is not authorization to change existing production rows.
- The 25 McDonald's Holo candidates retain their separate frozen executor. The
  remaining Luxray, Tyranitar and Pikachu cases retain identity/dependency review.

No network/provider calls, database access or writes were used by this replay.
The test replays the original MEP fixture: all four Cosmos facts and all eight
evidence records survive; three remain two-authority verified, Sneasel does not.

## Ingestion Practice

1. Preserve source data and exact treatment labels before normalization.
2. Count known shared catalog channels once; raw evidence count is not authority count.
3. Compare against the current index and explicit historical suppressions before
   proposing a missing child. Old publishable shards are not current authority.
4. Retain weaker/conflicting evidence for review; never invent another finish or
   silently upgrade a claim to unblock a writer.
5. Freeze source-bound set review and run the existing bounded mutation contract.
   Missing discovery data is not permission to delete historical facts.

## Prize Pack Scope Containment

Luxray PAL 071 Normal and Tyranitar JTG 095 Normal used Prize Pack source
records without preserving the stamp in their printing identity. The Luxray
fixture explicitly states that all its listed cards are Play! Pokemon stamped.
The official Series Four announcement confirms that context:
https://www.pokemon.com/uk/pokemon-news/receive-play-pokemon-prize-packs-series-four-at-your-local-game-store

- Known Prize Pack source keys/paths may not contribute to unqualified Normal,
  Holo or Cosmos facts. Group them into variant-scope review records preserving
  every evidence record, label, note and snapshot reference, including absences.
- Do not rename those facts to `stamped` or synthesize another child. Existing
  explicit stamp claims retain their current lane. Exact variant-parent binding
  still requires the separate reviewed manifest and cannot be inferred here.
- Independently supported base facts are classified from their own evidence.
  A Prize Pack record cannot be the second vote for an unstamped base finish.
- Historical carry-forward and source-outage candidate copies retain all
  printing coordinates and source fields, but unbound mixed claims become
  `needs_manual_review`. Conflicting status is not upgraded. The data-only
  refresh keeps JSON summaries, Markdown and review staging reconciled.
- No historical fixture or persisted index was changed during the offline proof.

Replay: `prize-pack-scope-replay-v1.json` in the same operator directory.
All 40,656 cached coordinates and evidence survive both fallback paths; 117
known-scope rows across 19 sets require review. This does not mean 117 physical
printings are false. Of 112,463 human fixture records, 148 scoped source records
are retained in 118 grouped review items and zero reach accepted base-finish
claims. This is fixture-only proof, not a full live-source rebuild or DB repair.

Verification includes focused contracts across five files, including real preserved
Luxray/Tyranitar fixtures, independent base sources, grouped evidence retention,
source-outage continuity, and the real refresh CLI in temporary directories.
The CLI proof retains identities/references, reconciles saved summaries and
produces an unchanged second replay. Normal full release gates remain required.
Scoped absence reviews survive source outages even without a corresponding
printing. Fresh matching review evidence replaces the old review record, and
review-only evidence changes participate in refresh fingerprints. The same merge
function drives change detection and saved review content; repeated identical
evidence does not trigger another data update. Unrelated review types retain
their existing policy.

## Prior Gate Receipt

PR #490 merged at `c84e088581577c7b699fb73e63bb4a3364075cce` from tested head
`aa61ef8e24eb6685b935d76d81570f7003a10fa3`. The merged tree matched the expected
tree `6ff32133899274fc362493c67871b97330b55b68`, preserving concurrent founder
snapshot updates. Normal commit and push gates each passed 3,880 Node tests
(three preexisting opt-in skips), web checks/build, Flutter analysis and 728
Flutter tests. No hooks were bypassed. Integration is not backend deployment:
the immutable MEE and TCG runtimes still need separately governed reconciliation.

## Remaining Gate

Run normal release checks and integrate the source-policy repair. The next
scheduled Master Index rebuild must expose the weaker Sneasel status unless
new independent evidence is added; a source-outage baseline fallback is not a
fresh verification. Preserve historical data and frozen approvals. Continue
source adjudication, bounded production reconciliation and deployed caller
verification; this checkpoint does not declare catalog repair complete.
